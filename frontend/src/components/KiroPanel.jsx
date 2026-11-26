import { useState, useEffect } from "react";

const REPO = "https://github.com/BrnEzekiel/VoxResearch";
const RAW = "https://raw.githubusercontent.com/BrnEzekiel/VoxResearch/main/.kiro";

// Shown instantly; replaced by the live file when GitHub answers.
const FALLBACK = {
  spec: `# VoxResearch Spec (excerpt)

## Goal — Frankenstein research assistant:
voice input, live cited answers, 90+ visualizations,
styled PDF export, sessions, wipe-proof quota.

## Functional requirements include specs for
/transcribe (WAV-only) and /research (streamed),
plus sessions, attach-anything, and quota rules.

Non-functional: Vercel serverless prod, FastAPI
local dev, React 18 + Vite + Tailwind, env-var keys,
batched renders, mobile-first.`,
  steering: `# Steering — stack.md (excerpt)

- Vercel serverless (Node) in prod, FastAPI locally.
  No other frameworks. No Next.js.
- All Meta API calls via frontend/api/*.js + httpx.
- META_API_KEY always from environment.
- Quota in Edge Config, keyed by fingerprint.
- Light theme, orange accents. Small components.
- Visualizations on demand only. Batch all streams.`,
  hook: `// hooks/pre-commit.json (excerpt)
{
  "hook": "pre-commit",
  "steps": [{
    "name": "Check META_API_KEY not hardcoded",
    "run": "grep -rE '(META_API_KEY|LLM_|sk_|...)'
      backend/ frontend/ | grep -v 'process.env'
      ... && echo 'WARNING' || echo 'OK'
  }]
}`,
};

const TABS = [
  { id: "spec", label: "📋 Spec", path: "specs/voxresearch.md" },
  { id: "steering", label: "🧭 Steering", path: "steering/stack.md" },
  { id: "hook", label: "🪝 Hook", path: "hooks/pre-commit.json" },
];

export default function KiroPanel({ dark, onClose }) {
  const [tab, setTab] = useState("spec");
  const [texts, setTexts] = useState(FALLBACK);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const out = {};
        for (const t of TABS) {
          const r = await fetch(`${RAW}/${t.path}`);
          if (!r.ok) throw new Error("fetch failed");
          out[t.id] = (await r.text()).slice(0, 4000);
        }
        if (!cancelled) { setTexts(out); setLive(true); }
      } catch { /* fallback excerpts stay */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const card = dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-100";
  const num = dark ? "text-gray-100" : "text-gray-900";
  const lbl = dark ? "text-gray-500" : "text-gray-400";
  const code = dark ? "bg-gray-900 text-gray-300" : "bg-gray-50 text-gray-700";

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl ${card}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`font-bold text-lg ${num}`}>🧡 Built with Kiro</h3>
          <button onClick={onClose} className={`text-xs px-2 py-1 rounded-lg ${dark ? "text-gray-500 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}>✕ Close</button>
        </div>
        <p className={`text-xs mb-4 ${lbl}`}>
          Spec-driven in Kiro Crew — live from the repo's <span className="font-mono">.kiro</span> folder{live ? "" : " (offline preview)"}.
        </p>
        <div className="flex gap-1.5 mb-3">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`text-xs px-3 py-1.5 rounded-lg transition ${tab === t.id ? "bg-orange-100 text-orange-600" : dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <pre className={`text-xs font-mono p-4 rounded-xl overflow-x-auto whitespace-pre-wrap max-h-72 overflow-y-auto ${code}`}>
          {texts[tab]}
        </pre>
        <a href={`${REPO}/tree/main/.kiro`} target="_blank" rel="noreferrer"
          className="inline-block mt-3 text-xs text-orange-500 hover:text-orange-400 underline underline-offset-2">
          View the full .kiro folder on GitHub →
        </a>
      </div>
    </div>
  );
}
