// Vercel serverless function (Node runtime). Same contract as backend/main.py /transcribe,
// but the audio arrives as JSON {audio: dataURL|base64, filename, mime} to avoid
// multipart parsing. Forwards to Meta ASR as multipart.
import { quotaUsed, quotaId, QUOTA_LIMIT } from "./_quota.js";

const META_BASE = "https://api.meta.ai/v1";

export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: "10mb" } } };

const ALLOWED_ORIGINS = [
  "https://voxresearch.work.gd",
  "https://www.voxresearch.work.gd",
  "http://localhost:3000",
];

const send = (res, req, code, obj) => {
  const origin = (req && req.headers && req.headers.origin) || "";
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(obj));
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    send(res, req, 204, {});
    return;
  }
  if (req.method !== "POST") {
    send(res, req, 405, { error: "POST only" });
    return;
  }
  const key = process.env.META_API_KEY || "";
  try {
    // Gate only (the follow-up research call does the counting).
    const deviceId = quotaId(req, req.body && req.body.deviceId);
    let used = 0;
    try { used = await quotaUsed(deviceId); } catch { used = 0; }
    if (used >= QUOTA_LIMIT) {
      send(res, req, 429, { error: `You've used your ${QUOTA_LIMIT} free messages on this device.` });
      return;
    }
    const { audio = "", filename = "recording.webm", mime = "audio/webm" } = req.body || {};
    const b64 = String(audio).includes(",") ? String(audio).split(",").pop() : String(audio);
    const bytes = Buffer.from(b64, "base64");
    if (bytes.length === 0) {
      send(res, req, 400, { error: "empty audio" });
      return;
    }
    // Meta's file endpoint only accepts WAV — the frontend converts first.
    const audioEncoding = "WAV";
    const form = new FormData();
    form.append("request", new Blob([JSON.stringify({ model: "muse-voice-transcribe-1.0", audioEncoding })], { type: "application/json" }));
    form.append("audio", new Blob([bytes], { type: mime }), filename);
    const r = await fetch(`${META_BASE}/asr/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!r.ok) {
      send(res, req, r.status, { error: await r.text() });
      return;
    }
    const result = await r.json();
    const transcript = (result.turns || []).map((t) => t.text || "").join(" ");
    send(res, req, 200, { transcript });
  } catch (e) {
    send(res, req, 500, { error: String((e && e.message) || e) });
  }
}
