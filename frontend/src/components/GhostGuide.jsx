import { useState, useEffect } from "react";

// Friendly floating ghost — the Kiroween mischief. Pure SVG, no assets.
export function Ghost({ size = 96 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className="mx-auto"
      role="img"
      aria-label="Friendly ghost guide"
    >
      <defs>
        <radialGradient id="ghostGlow" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fdba74" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fdba74" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ghostBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffedd5" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="55" r="52" fill="url(#ghostGlow)" />
      <ellipse className="ghost-shadow" cx="60" cy="108" rx="26" ry="5" fill="#9a3412" />
      <g className="ghost-float">
        <path
          d="M60 8 C36 8 24 28 24 52 L24 88 L33 82 L41 90 L50 82 L58 90 L66 82 L74 90 L82 82 L91 90 L96 84 L96 52 C96 28 84 8 60 8 Z"
          fill="url(#ghostBody)"
          stroke="#fed7aa"
          strokeWidth="2.5"
        />
        {/* left arm */}
        <path d="M26 62 Q14 66 12 76" fill="none" stroke="#fed7aa" strokeWidth="6" strokeLinecap="round" />
        {/* waving right arm */}
        <g className="ghost-wave">
          <path d="M94 62 Q106 56 110 44" fill="none" stroke="#fed7aa" strokeWidth="6" strokeLinecap="round" />
          <circle cx="110" cy="40" r="5" fill="#fff7ed" stroke="#fed7aa" strokeWidth="2" />
        </g>
        {/* eyes */}
        <ellipse cx="47" cy="50" rx="6" ry="8.5" fill="#1f2937" />
        <ellipse cx="73" cy="50" rx="6" ry="8.5" fill="#1f2937" />
        <circle cx="49" cy="47" r="2.2" fill="#ffffff" />
        <circle cx="75" cy="47" r="2.2" fill="#ffffff" />
        {/* happy open smile */}
        <path d="M50 66 Q60 78 70 66 Q60 71 50 66 Z" fill="#7c2d12" />
        <path d="M52 67 Q60 74 68 67" fill="none" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
        {/* blush */}
        <ellipse cx="36" cy="60" rx="5.5" ry="3.5" fill="#fb923c" opacity="0.55" />
        <ellipse cx="84" cy="60" rx="5.5" ry="3.5" fill="#fb923c" opacity="0.55" />
      </g>
    </svg>
  );
}

const CAPTIONS = [
  "Boo! Ask me anything — I answer with proof.",
  "Psst… I cite my sources. Spooky honest.",
  "Try the mic — I hear live voices, I promise.",
  "Every answer can sprout charts, tables and maps.",
];

export function Pumpkin({ size = 84 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Jack-o-lantern">
      <ellipse cx="50" cy="92" rx="30" ry="4.5" fill="#9a3412" opacity="0.18" />
      <ellipse cx="50" cy="58" rx="36" ry="30" fill="#f97316" />
      <ellipse cx="50" cy="58" rx="36" ry="30" fill="none" stroke="#ea580c" strokeWidth="2.5" />
      <path d="M50 28 C42 40 42 76 50 88" fill="none" stroke="#ea580c" strokeWidth="2" opacity="0.7" />
      <path d="M32 32 C26 46 26 70 34 82" fill="none" stroke="#ea580c" strokeWidth="2" opacity="0.5" />
      <path d="M68 32 C74 46 74 70 66 82" fill="none" stroke="#ea580c" strokeWidth="2" opacity="0.5" />
      <ellipse cx="38" cy="46" rx="10" ry="12" fill="#fdba74" opacity="0.5" />
      <rect x="46" y="18" width="8" height="14" rx="3" fill="#65a30d" transform="rotate(8 50 25)" />
      <path d="M54 22 Q66 14 74 22 Q64 22 58 28 Z" fill="#16a34a" />
      <path d="M36 52 L42 44 L48 52 Z" fill="#7c2d12" />
      <path d="M52 52 L58 44 L64 52 Z" fill="#7c2d12" />
      <path d="M36 64 L42 64 L45 70 L50 62 L55 70 L58 64 L64 64 L60 76 L40 76 Z" fill="#7c2d12" />
    </svg>
  );
}

function Bat({ width = 46 }) {
  return (
    <svg width={width} viewBox="0 0 100 44" role="img" aria-label="Bat">
      <g className="bat-wing-l">
        <path d="M48 26 C36 8 22 6 8 14 C18 16 20 22 18 28 C28 26 38 30 46 34 Z" fill="#1f2937" />
      </g>
      <g className="bat-wing-r">
        <path d="M52 26 C64 8 78 6 92 14 C82 16 80 22 82 28 C72 26 62 30 54 34 Z" fill="#1f2937" />
      </g>
      <ellipse cx="50" cy="26" rx="7" ry="10" fill="#1f2937" />
      <path d="M45 18 L47 12 L49 18 Z" fill="#1f2937" />
      <path d="M51 18 L53 12 L55 18 Z" fill="#1f2937" />
      <circle cx="47.5" cy="25" r="1.4" fill="#fbbf24" />
      <circle cx="52.5" cy="25" r="1.4" fill="#fbbf24" />
    </svg>
  );
}

export function Bats() {
  const flock = [
    { top: "6%", size: 52, dur: "16s", delay: "0s" },
    { top: "12%", size: 34, dur: "22s", delay: "-8s" },
    { top: "3%", size: 26, dur: "28s", delay: "-16s" },
  ];
  return (
    <div className="absolute top-0 left-0 w-full h-48 overflow-hidden pointer-events-none" aria-hidden="true">
      {flock.map((b, i) => (
        <div key={i} className="bat-drift absolute left-0" style={{ top: b.top, animationDuration: b.dur, animationDelay: b.delay }}>
          <Bat width={b.size} />
        </div>
      ))}
    </div>
  );
}

export function GhostCaption({ className = "" }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % CAPTIONS.length), 4000);
    return () => clearInterval(t);
  }, []);
  return <p className={`text-sm ${className}`}>{CAPTIONS[i]}</p>;
}
