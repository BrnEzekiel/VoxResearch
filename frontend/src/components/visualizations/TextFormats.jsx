import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { stripMd } from "../../utils/parseHelpers";

export function Checklist({ data, dark }) {
  const [done, setDone] = useState(() => data.map(d => d.done));
  const toggle = (i) => setDone(prev => prev.map((v, j) => (j === i ? !v : v)));
  const pct = done.length ? Math.round((done.filter(Boolean).length / done.length) * 100) : 0;
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-semibold uppercase tracking-widest ${dark ? "text-gray-500" : "text-gray-400"}`}>Checklist</p>
        <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{pct}% done</p>
      </div>
      <div className={`h-1.5 rounded-full mb-3 ${dark ? "bg-gray-800" : "bg-gray-200"}`}>
        <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-1.5">
        {data.map((d, i) => (
          <li key={i}>
            <button onClick={() => toggle(i)} className="flex items-start gap-2.5 text-left w-full group">
              <span className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] transition ${
                done[i] ? "bg-orange-500 border-orange-500 text-white" : dark ? "border-gray-600 text-transparent group-hover:border-orange-500" : "border-gray-300 text-transparent group-hover:border-orange-400"
              }`}>✓</span>
              <span className={`text-sm ${done[i] ? "line-through opacity-50" : ""} ${dark ? "text-gray-300" : "text-gray-700"}`}>{stripMd(d.text)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProsCons({ data, dark }) {
  const cols = [
    { title: "Pros", items: data.pros || [], good: true },
    { title: "Cons", items: data.cons || [], good: false },
  ];
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Pros &amp; cons</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cols.map(c => (
          <div key={c.title} className={`rounded-lg p-3 border ${c.good
            ? dark ? "border-green-900 bg-green-950/40" : "border-green-200 bg-green-50"
            : dark ? "border-red-900 bg-red-950/40" : "border-red-200 bg-red-50"}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${c.good ? "text-green-500" : "text-red-400"}`}>{c.title}</p>
            <ul className="space-y-1.5">
              {c.items.map((it, i) => (
                <li key={i} className={`text-sm flex gap-2 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                  <span className={c.good ? "text-green-500" : "text-red-400"}>{c.good ? "+" : "−"}</span>{stripMd(it)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FaqAccordion({ data, dark }) {
  const [open, setOpen] = useState(0);
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>FAQ</p>
      <div className={`rounded-lg border divide-y overflow-hidden ${dark ? "border-gray-800 divide-gray-800" : "border-gray-200 divide-gray-100"}`}>
        {data.map((f, i) => (
          <div key={i}>
            <button onClick={() => setOpen(open === i ? -1 : i)}
              className={`w-full text-left px-4 py-3 text-sm font-medium flex justify-between items-center gap-2 ${dark ? "text-gray-200 hover:bg-gray-800" : "text-gray-800 hover:bg-gray-100"}`}>
              <span>{stripMd(f.q)}</span>
              <span className={`transition-transform ${open === i ? "rotate-180" : ""}`}>▾</span>
            </button>
            {open === i && (
              <div className={`px-4 pb-3 text-sm prose prose-sm max-w-none ${dark ? "prose-invert text-gray-400" : "text-gray-600"}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{f.a}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TabsView({ data, dark }) {
  const [active, setActive] = useState(0);
  if (!data || data.length === 0) return null;
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Sections</p>
      <div className={`flex flex-wrap gap-1 border-b mb-3 ${dark ? "border-gray-800" : "border-gray-200"}`}>
        {data.map((s, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`text-xs px-3 py-2 -mb-px border-b-2 transition ${active === i
              ? "border-orange-500 font-semibold " + (dark ? "text-gray-100" : "text-gray-900")
              : "border-transparent " + (dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600")}`}>
            {stripMd(s.title)}
          </button>
        ))}
      </div>
      <div className={`text-sm prose prose-sm max-w-none leading-7 ${dark ? "prose-invert text-gray-300" : "text-gray-700"}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{data[active]?.body || ""}</ReactMarkdown>
      </div>
    </div>
  );
}

export function VennChart({ data, dark }) {
  const a = data.a?.length || 0;
  const b = data.b?.length || 0;
  const shared = data.shared || [];
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Venn overlap</p>
      <svg viewBox="0 0 400 180" className="w-full max-w-sm" style={{ height: 180 }}>
        <circle cx={150} cy={90} r={70} fill="#3b82f6" fillOpacity={0.45} stroke="#3b82f6" strokeWidth={2} />
        <circle cx={250} cy={90} r={70} fill="#f97316" fillOpacity={0.45} stroke="#f97316" strokeWidth={2} />
        <text x={110} y={95} fontSize={20} fontWeight="bold" fill={dark ? "#fff" : "#111"} textAnchor="middle">{a - shared.length}</text>
        <text x={290} y={95} fontSize={20} fontWeight="bold" fill={dark ? "#fff" : "#111"} textAnchor="middle">{b - shared.length}</text>
        <text x={200} y={95} fontSize={20} fontWeight="bold" fill={dark ? "#fff" : "#111"} textAnchor="middle">{shared.length}</text>
        <text x={110} y={170} fontSize={11} fill={dark ? "#9ca3af" : "#6b7280"} textAnchor="middle">A only</text>
        <text x={290} y={170} fontSize={11} fill={dark ? "#9ca3af" : "#6b7280"} textAnchor="middle">B only</text>
      </svg>
      {shared.length > 0 && (
        <div className="mt-2">
          <p className={`text-xs font-semibold mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`}>Shared ({shared.length}):</p>
          <ul className={`text-sm space-y-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>
            {shared.slice(0, 6).map((s, i) => <li key={i}>• {stripMd(s)}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
