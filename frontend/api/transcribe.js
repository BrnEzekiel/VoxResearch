// Vercel serverless function (Node runtime). Same contract as backend/main.py /transcribe,
// but the audio arrives as JSON {audio: dataURL|base64, filename, mime} to avoid
// multipart parsing. Forwards to Meta ASR as multipart.
const META_BASE = "https://api.meta.ai/v1";

export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: "10mb" } } };

const send = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    send(res, 405, { error: "POST only" });
    return;
  }
  const key = process.env.META_API_KEY || "";
  try {
    const { audio = "", filename = "recording.webm", mime = "audio/webm" } = req.body || {};
    const b64 = String(audio).includes(",") ? String(audio).split(",").pop() : String(audio);
    const bytes = Buffer.from(b64, "base64");
    if (bytes.length === 0) {
      send(res, 400, { error: "empty audio" });
      return;
    }
    const ml = String(mime || "").toLowerCase();
    const audioEncoding = ml.includes("wav") ? "WAV"
      : ml.includes("mp3") || ml.includes("mpeg") ? "MP3"
      : ml.includes("ogg") || ml.includes("opus") ? "OGG"
      : ml.includes("mp4") || ml.includes("m4a") || ml.includes("aac") ? "MP4"
      : "WEBM";
    const form = new FormData();
    form.append("request", new Blob([JSON.stringify({ model: "muse-voice-transcribe-1.0", audioEncoding })], { type: "application/json" }));
    form.append("audio", new Blob([bytes], { type: mime }), filename);
    const r = await fetch(`${META_BASE}/asr/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!r.ok) {
      send(res, r.status, { error: await r.text() });
      return;
    }
    const result = await r.json();
    const transcript = (result.turns || []).map((t) => t.text || "").join(" ");
    send(res, 200, { transcript });
  } catch (e) {
    send(res, 500, { error: String((e && e.message) || e) });
  }
}
