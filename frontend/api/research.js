// Vercel serverless function (Node runtime). Same contract as backend/main.py /research:
// POST {query, context, language, length} -> SSE stream of token/citations/related/done.
const META_BASE = "https://api.meta.ai/v1";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const key = process.env.META_API_KEY || "";
  const { query = "", context = [], language = "English", length = "Detailed" } = req.body || {};

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
  const fullInput = `${langInstruction} ${lengthInstruction}\n\n${historyBlock}${vizHint}\n\nQuestion: ${query}`.trim();

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
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
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          let chunk;
          try { chunk = JSON.parse(raw); } catch { continue; }
          let delta = "";
          for (const item of chunk.output || []) {
            if (item.type !== "message") continue;
            for (const c of item.content || []) {
              if (c.type === "output_text") {
                delta = c.text || "";
                if (c.annotations) citations = c.annotations;
              }
            }
          }
          delta = delta || (chunk.delta && chunk.delta.text) || "";
          if (delta) res.write(sse({ type: "token", text: delta }));
        }
      }
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
        res.write(sse({ type: "token", text }));
      } else {
        res.write(sse({ type: "error", text: await r2.text() }));
        res.end();
        return;
      }
    } catch (e2) {
      res.write(sse({ type: "error", text: String((e2 && e2.message) || e2) }));
      res.end();
      return;
    }
  }

  if (citations && citations.length > 0) res.write(sse({ type: "citations", data: citations }));
  const related = await relatedPromise;
  res.write(sse({ type: "related", data: related }));
  res.write(sse({ type: "done" }));
  res.end();
}
