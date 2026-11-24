const SHORTCUTS = [
  ["/", "Focus search input"],
  ["Enter", "Send search"],
  ["Escape", "Clear input / close"],
  ["Ctrl+K", "Open history sidebar"],
  ["?", "Toggle this overlay"],
];

export default function ShortcutOverlay({ dark, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`rounded-2xl p-6 w-80 ${dark ? "bg-gray-900" : "bg-white"}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold ${dark ? "text-gray-100" : "text-gray-800"}`}>Keyboard shortcuts</h3>
          <button onClick={onClose} className={dark ? "text-gray-500" : "text-gray-400"}>✕</button>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <span className={`text-sm ${dark ? "text-gray-400" : "text-gray-600"}`}>{desc}</span>
              <kbd className={`text-xs px-2 py-1 rounded border font-mono ${dark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-200 text-gray-700"}`}>{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
