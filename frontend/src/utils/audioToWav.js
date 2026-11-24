// Convert any recorded/decodable audio blob to mono 16-bit PCM WAV @ 16kHz.
// Meta's /asr/transcribe only accepts WAV (mono s16le, 16 or 24 kHz), while
// browsers record WebM/Opus — so every voice note is converted here first.
// Returns a data URL. Throws with a readable message on failure.
export async function blobToWavDataUrl(blob) {
  const buf = await blob.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error("Audio conversion not supported in this browser");
  const ctx = new AC();
  let decoded;
  try {
    decoded = await ctx.decodeAudioData(buf.slice(0));
  } catch {
    await ctx.close().catch(() => {});
    throw new Error("Could not decode that recording");
  }
  const targetRate = 16000;
  const channel = decoded.getChannelData(0);
  // Resample to 16kHz mono via OfflineAudioContext when rates differ.
  let mono;
  if (decoded.sampleRate === targetRate && decoded.numberOfChannels === 1) {
    mono = channel;
  } else {
    const frames = Math.ceil((channel.length / decoded.sampleRate) * targetRate);
    const off = new OfflineAudioContext(1, frames, targetRate);
    const src = off.createBufferSource();
    src.buffer = decoded;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    mono = rendered.getChannelData(0);
  }
  await ctx.close().catch(() => {});
  return encodeWavDataUrl(mono, targetRate);
}

function encodeWavDataUrl(samples, rate) {
  const n = samples.length;
  const buffer = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buffer);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  writeStr(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let bin = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return "data:audio/wav;base64," + btoa(bin);
}
