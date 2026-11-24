import { useEffect, useState } from "react";

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0); // 0=show, 1=fade

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1800);
    const t2 = setTimeout(() => onDone(), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className={`fixed inset-0 bg-gray-950 flex flex-col items-center justify-center z-50 transition-opacity duration-600 ${phase === 1 ? "opacity-0" : "opacity-100"}`}>
      {/* Animated web */}
      <svg className="w-24 h-24 mb-6 opacity-30" viewBox="0 0 100 100" fill="none" stroke="#f97316" strokeWidth="1.5">
        <circle cx="50" cy="50" r="45" />
        <circle cx="50" cy="50" r="30" />
        <circle cx="50" cy="50" r="15" />
        <line x1="50" y1="5" x2="50" y2="95" />
        <line x1="5" y1="50" x2="95" y2="50" />
        <line x1="18" y1="18" x2="82" y2="82" />
        <line x1="82" y1="18" x2="18" y2="82" />
      </svg>
      <h1 className="text-4xl font-bold text-orange-400 tracking-tight animate-pulse">VoxResearch</h1>
      <p className="mt-2 text-gray-500 text-sm">Live cited answers, by voice or text</p>
    </div>
  );
}
