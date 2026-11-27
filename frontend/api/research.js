// Vercel serverless function (Node runtime). Same contract as backend/main.py /research:
// POST {query, context, language, length} -> SSE stream of token/citations/related/done.
import { quotaUsed, quotaSet, quotaId, QUOTA_LIMIT } from "./_quota.js";
import { createHash } from "crypto";
import { put, list, del } from "@vercel/blob";

const META_BASE = "https://api.meta.ai/v1";

// Shared answer cache, two layers:
// L1 = in-memory Map (instant, per warm instance).
// L2 = Vercel Blob (persistent, shared by ALL instances and devices).
// A repeat question from any device on earth is served free, forever (7d TTL).
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;
const CACHE_MAX = 200;
const answerCache = new Map();
const inflight = new Set();

function cacheKey(query, language, length) {
  const norm = String(query || "").toLowerCase().trim().replace(/\s+/g, " ");
  return createHash("sha256").update(`${language || "English"}|${length || "Detailed"}|${norm}`).digest("hex");
}

function blobUrl(key) {
  const store = process.env.BLOB_STORE_ID || "";
  if (!store) return null;
  return `https://${store}.public.blob.vercel-storage.com/ac/${key}.json`;
}

function fresh(v) {
  return v && v.text && Date.now() - (v.ts || 0) < CACHE_TTL_MS ? v : null;
}

async function cacheGet(key) {
  const local = answerCache.get(key);
  if (local) {
    if (Date.now() - local.ts > CACHE_TTL_MS) answerCache.delete(key);
    else return local;
  }
  const url = blobUrl(key);
  if (!url) return null;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(url, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const v = fresh(await r.json());
    if (v) {
      answerCache.set(key, v);
      while (answerCache.size > CACHE_MAX) answerCache.delete(answerCache.keys().next().value);
    }
    return v;
  } catch {
    return null;
  }
}

async function cacheSet(key, text, citations) {
  if (!text) return;
  const v = { text, citations: citations || [], ts: Date.now() };
  answerCache.set(key, v);
  while (answerCache.size > CACHE_MAX) answerCache.delete(answerCache.keys().next().value);
  try {
    await put(`ac/${key}.json`, JSON.stringify(v), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  } catch {
    // L2 failure must never break answers; L1 still holds it.
  }
  // Occasional janitor: prune expired blobs (5% of writes).
  if (Math.random() < 0.05) {
    try {
      const { blobs } = await list({ prefix: "ac/" });
      const stale = (blobs || []).filter(
        (b) => b.uploadedAt && Date.now() - new Date(b.uploadedAt).getTime() > CACHE_TTL_MS
      );
      for (const b of stale.slice(0, 20)) await del(b.url).catch(() => {});
    } catch {}
  }
}

export const config = { maxDuration: 60 };

const sse = (data) => `data: ${JSON.stringify(data)}\n\n`;

function extractTextAndCitations(payload) {
  let text = "";
  let citations = [];
  for (const item of payload.output || []) {
    if (item.type !== "message") continue;
    for (const c of item.content || []) {
      if (c.type === "output_text") {
        text = c.text || "";
        if (c.annotations) citations = c.annotations;
      }
    }
  }
  return { text, citations };
}

const ALLOWED_ORIGINS = [
  "https://voxresearch.work.gd",
  "https://www.voxresearch.work.gd",
  "http://localhost:3000",
];

function corsHeaders(req) {
  const origin = req.headers.origin || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Quota-Left",
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json", ...corsHeaders(req) });
    res.end(JSON.stringify({ error: "POST only" }));
    return;
  }
  const key = process.env.META_API_KEY || "";
  const { query = "", context = [], language = "English", length = "Detailed" } = req.body || {};

  // Input cap: oversized prompts never reach the model.
  if (String(query).length > 4000) {
    res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders(req) });
    res.end(JSON.stringify({ error: "Question too long (max 4000 characters)." }));
    return;
  }

  const deviceId = quotaId(req, req.body && req.body.deviceId);

  // Burst guard: one live generation per device (fail fast, clear retry).
  if (inflight.has(deviceId)) {
    res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "5", ...corsHeaders(req) });
    res.end(JSON.stringify({ error: "One answer at a time — try again in a few seconds." }));
    return;
  }
  inflight.add(deviceId);

  // Shared cache FIRST: hits are free even at zero quota.
  const cKey = cacheKey(query, language, length);
  const hit = await cacheGet(cKey);
  let used = 0;
  try { used = await quotaUsed(deviceId); } catch { used = 0; }
  if (hit) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Cache": "HIT",
      "X-Quota-Left": String(Math.max(0, QUOTA_LIMIT - used)),
      ...corsHeaders(req),
    });
    res.write(sse({ type: "token", text: hit.text }));
    if (hit.citations && hit.citations.length > 0) res.write(sse({ type: "citations", data: hit.citations }));
    res.write(sse({ type: "done" }));
    res.end();
    inflight.delete(deviceId);
    return;
  }

  // Wipe-proof quota: the count lives server-side, keyed by device fingerprint.
  if (used >= QUOTA_LIMIT) {
    res.writeHead(429, { "Content-Type": "application/json", ...corsHeaders(req) });
    res.end(JSON.stringify({ error: `👻 Your ${QUOTA_LIMIT} treats are all gone — this device is out of free messages.` }));
    inflight.delete(deviceId);
    return;
  }

  const lengthInstruction = {
    Brief: "Answer in 2-3 sentences only.",
    Detailed: "Give a thorough, detailed answer.",
    "Bullet points": "Answer using bullet points only.",
  }[length] || "";
  const langInstruction = language !== "English"
    ? `You MUST reply entirely in ${language}. Do not use any other language.`
    : "";
  const history = (context || []).slice(-3).map((m) => `Previous Q: ${m.content || ""}`).join("\n");
  const historyBlock = history ? `Conversation so far:\n${history}\n\n` : "";
  const vizHint = "When the answer involves a process, flow, timeline, hierarchy, or sequence, also include a ```mermaid diagram for it.";
  const citeHint = "Use web search for factual questions and attach a source citation to every statistic, ranking, date and factual claim in your answer.";
  const fullInput = `${langInstruction} ${lengthInstruction}\n\n${historyBlock}${vizHint}\n${citeHint}\n\nQuestion: ${query}`.trim();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    "X-Cache": "MISS",
    "X-Quota-Left": String(Math.max(0, QUOTA_LIMIT - used - 1)),
    ...corsHeaders(req),
  });

  // Related questions run in PARALLEL with the answer stream (they only need the query).
  const relatedPromise = (async () => {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 15000);
      const r = await fetch(`${META_BASE}/responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "muse-spark-1.3",
          input: `Given the question '${query}', suggest exactly 3 short follow-up questions. Return only a JSON array of 3 strings.`,
        }),
        signal: ctl.signal,
      });
      clearTimeout(t);
      if (!r.ok) return [];
      const d = await r.json();
      for (const item of d.output || []) {
        if (item.type !== "message") continue;
        for (const c of item.content || []) {
          if (c.type === "output_text") {
            const m = (c.text || "").match(/\[[\s\S]*\]/);
            if (m) {
              try { return JSON.parse(m[0]).slice(0, 3); } catch { /* fall through */ }
            }
          }
        }
      }
    } catch { /* related questions are best-effort */ }
    return [];
  })();

  let citations = [];
  let streamOk = false;
  let fullAnswer = "";
  try {
    const r = await fetch(`${META_BASE}/responses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "muse-spark-1.3",
        input: fullInput,
        tools: [{ type: "web_search" }],
        stream: true,
      }),
    });
    if (r.ok && r.body) {
      streamOk = true;
      const commentaryIds = new Set();
      const harvest = (output) => {
        for (const item of output || []) {
          if (item.type !== "message") continue;
          for (const c of item.content || []) {
            if (c.type === "output_text" && c.annotations) {
              for (const a of c.annotations) {
                if (a.url && !citations.some((x) => x.url === a.url)) citations.push(a);
              }
            }
          }
        }
      };
      const handleLine = (line) => {
        if (!line.startsWith("data:")) return;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") return;
        let chunk;
        try { chunk = JSON.parse(raw); } catch { return; }
        const t = chunk.type || "";
        // Track commentary-phase items so thinking chatter stays hidden.
        if (t === "response.output_item.added" && chunk.item && chunk.item.phase === "commentary" && chunk.item.id) {
          commentaryIds.add(chunk.item.id);
          return;
        }
        // Real text deltas: plain strings on output_text.delta events.
        if (t === "response.output_text.delta") {
          const d = chunk.delta;
          if (typeof d === "string" && d && !commentaryIds.has(chunk.item_id)) {
            fullAnswer += d;
            res.write(sse({ type: "token", text: d }));
          }
          return;
        }
        // Citations ride on the completed event (and legacy output shapes).
        if (chunk.response && Array.isArray(chunk.response.output)) harvest(chunk.response.output);
        else harvest(chunk.output);
      };
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) handleLine(line);
      }
      buffer += decoder.decode();
      if (buffer.trim()) handleLine(buffer.trim());
    }
  } catch { streamOk = false; }

  // Non-streaming fallback if the stream failed.
  if (!streamOk) {
    try {
      const r2 = await fetch(`${META_BASE}/responses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "muse-spark-1.3",
          input: fullInput,
          tools: [{ type: "web_search" }],
        }),
      });
      if (r2.ok) {
        const { text, citations: c2 } = extractTextAndCitations(await r2.json());
        citations = c2;
        fullAnswer = text;
        res.write(sse({ type: "token", text }));
      } else {
        res.write(sse({ type: "error", text: await r2.text() }));
        res.end();
        inflight.delete(deviceId);
        return;
      }
    } catch (e2) {
      res.write(sse({ type: "error", text: String((e2 && e2.message) || e2) }));
      res.end();
      inflight.delete(deviceId);
      return;
    }
  }

  if (citations && citations.length > 0) res.write(sse({ type: "citations", data: citations }));
  const related = await relatedPromise;
  // Bank the answer for every device, then count this delivery.
  await cacheSet(cKey, fullAnswer, citations);
  // Persist the count only for delivered answers (failures stay free).
  await quotaSet(deviceId, used + 1);
  res.write(sse({ type: "related", data: related }));
  res.write(sse({ type: "done" }));
  res.end();
  inflight.delete(deviceId);
}
