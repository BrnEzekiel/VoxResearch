// Vercel serverless function (Node runtime). Same contract as backend/main.py /transcribe,
// but the audio arrives as JSON {audio: dataURL|base64, filename, mime} to avoid
// multipart parsing. Forwards to Meta ASR as multipart.
const META_BASE = "https://api.meta.ai/v1";

export const config = { maxDuration: 60, api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const key = process.env.META_API_KEY || "";
  try {
    const { audio = "", filename = "recording.webm", mime = "audio/webm" } = req.body || {};
    const b64 = String(audio).includes(",") ? String(audio).split(",").pop() : String(audio);
    const bytes = Buffer.from(b64, "base64");
    if (bytes.length === 0) {
      res.status(400).json({ error: "empty audio" });
      return;
    }
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mime }), filename);
    form.append("model", "muse-voice-transcribe-1.0");
    const r = await fetch(`${META_BASE}/asr/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!r.ok) {
      res.status(r.status).json({ error: await r.text() });
      return;
    }
    const result = await r.json();
    const transcript = (result.turns || []).map((t) => t.text || "").join(" ");
    res.status(200).json({ transcript });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
