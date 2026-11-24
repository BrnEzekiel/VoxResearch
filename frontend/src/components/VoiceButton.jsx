import { useState, useRef, useEffect } from "react";

export default function VoiceButton({ onRecorded, disabled, dark }) {
  const [recording, setRecording] = useState(false);
  const [bars, setBars] = useState([3, 5, 3, 7, 4, 6, 3]);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!recording) { cancelAnimationFrame(animRef.current); return; }
    function animate() {
      if (analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const slice = Math.floor(data.length / 7);
        setBars(Array.from({ length: 7 }, (_, i) => Math.max(3, Math.round(data[i * slice] / 8))));
      } else {
        setBars(prev => prev.map(() => Math.floor(Math.random() * 18) + 3));
      }
      animRef.current = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [recording]);

  async function toggle() {
    if (recording) { mediaRef.current?.stop(); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
    } catch (_) {}
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = e => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      onRecorded(new Blob(chunksRef.current, { type: "audio/webm" }));
      setRecording(false);
    };
    recorder.start();
    mediaRef.current = recorder;
    setRecording(true);
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      title={recording ? "Stop recording" : "Record voice"}
      className={`relative px-4 py-3 rounded-xl font-semibold transition flex items-center gap-1 ${
        recording
          ? "bg-red-600 hover:bg-red-500"
          : dark ? "bg-gray-700 hover:bg-gray-600" : "bg-orange-100 hover:bg-orange-200"
      } disabled:opacity-50`}
    >
      {recording ? (
        <div className="flex items-end gap-0.5 h-5">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-1 bg-white rounded-full transition-all duration-75"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      ) : (
        <svg className={`w-5 h-5 ${dark ? "text-orange-400" : "text-orange-600"}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm7 11a1 1 0 0 1 1 1 8 8 0 0 1-7 7.93V23h-2v-2.07A8 8 0 0 1 4 13a1 1 0 1 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z"/>
        </svg>
      )}
    </button>
  );
}
