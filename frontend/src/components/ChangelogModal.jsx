import { CHANGELOG } from "../changelog";

export default function ChangelogModal({ dark, onClose }) {
  const card = dark ? "bg-gray-950 border-gray-800" : "bg-white border-gray-100";
  const num = dark ? "text-gray-100" : "text-gray-900";
  const lbl = dark ? "text-gray-500" : "text-gray-400";
  const body = dark ? "text-gray-300" : "text-gray-600";
  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl ${card}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-bold text-lg ${num}`}>✨ What's new</h3>
          <button onClick={onClose} className={`text-xs px-2 py-1 rounded-lg ${dark ? "text-gray-500 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}>✕ Close</button>
        </div>
        <div className="space-y-5">
          {CHANGELOG.map(r => (
            <div key={r.version}>
              <p className={`text-sm font-bold ${num}`}>{r.version} <span className={`font-normal text-xs ${lbl}`}>· {r.date}</span></p>
              <ul className="mt-1.5 space-y-1">
                {r.items.map((it, i) => <li key={i} className={`text-sm ${body}`}>{it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
