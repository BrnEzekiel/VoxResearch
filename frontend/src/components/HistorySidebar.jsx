import { useState } from "react";

function relTime(ts) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function dayGroup(ts) {
  const day = 86400000;
  const today = Math.floor(Date.now() / day);
  const that = Math.floor(ts / day);
  if (that === today) return "Today";
  if (that === today - 1) return "Yesterday";
  return "Older";
}

export default function HistorySidebar({ open, sessions, activeId, filter, onFilter, onSelect, onNew, onClose, onPin, onDelete, onRename, onDuplicate, onDeleteAll, dark, onExport, settings, onSettings, tab, onTab }) {
  const bg = dark ? "bg-gray-900" : "bg-white";
  const item = dark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-orange-50 text-gray-700";
  const inputBg = dark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400";
  const tabBtn = (t) => `text-xs px-3 py-1.5 rounded-lg transition ${tab === t ? (dark ? "bg-gray-700 text-white" : "bg-orange-100 text-orange-600") : (dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600")}`;
  const groupLabel = `px-4 py-1 text-xs font-semibold uppercase tracking-widest ${dark ? "text-gray-600" : "text-gray-400"}`;

  const q = filter.toLowerCase();
  const filtered = sessions.filter(s =>
    (s.title || "").toLowerCase().includes(q) ||
    (s.turns || []).some(t => (t.query || "").toLowerCase().includes(q) || (t.answer || "").toLowerCase().includes(q))
  );
  const pinned = filtered.filter(s => s.pinned);
  const rest = filtered.filter(s => !s.pinned);
  const groups = ["Today", "Yesterday", "Older"].map(g => ({ name: g, items: rest.filter(s => dayGroup(s.ts) === g) })).filter(g => g.items.length > 0);

  const itemProps = { onSelect, onPin, onDelete, onRename, onDuplicate, dark, item };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20" onClick={onClose} />}
      <div className={`fixed top-0 left-0 h-full w-72 shadow-2xl z-30 flex flex-col transition-transform duration-300 ${bg} ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex gap-1">
            <button onClick={() => onTab("history")} className={tabBtn("history")}>History</button>
            <button onClick={() => onTab("settings")} className={tabBtn("settings")}>Settings</button>
          </div>
          <button onClick={onClose} className={dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {tab === "history" ? (
          <>
            <div className="px-3 pt-3">
              <button onClick={onNew}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition font-medium ${dark ? "border-gray-700 text-gray-200 hover:border-orange-500 hover:text-orange-300" : "border-gray-200 text-gray-700 hover:border-orange-400 hover:text-orange-600"}`}>
                + New chat
              </button>
            </div>
            <div className="px-3 py-2 flex gap-2">
              <input className={`flex-1 rounded-lg border px-3 py-1.5 text-xs focus:outline-none ${inputBg}`}
                placeholder="Search chats & messages..." value={filter} onChange={e => onFilter(e.target.value)} />
              {sessions.length > 0 && onExport && (
                <button onClick={() => onExport("md")} className="text-xs text-gray-500 hover:text-orange-400 transition px-1">Export</button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto pb-4">
              {pinned.length > 0 && (
                <>
                  <p className={groupLabel}>Pinned</p>
                  {pinned.map(s => <SessionItem key={s.id} session={s} active={s.id === activeId} pinned {...itemProps} />)}
                </>
              )}
              {groups.map(g => (
                <div key={g.name}>
                  <p className={groupLabel}>{g.name}</p>
                  {g.items.map(s => <SessionItem key={s.id} session={s} active={s.id === activeId} {...itemProps} />)}
                </div>
              ))}
              {filtered.length === 0 && <p className="text-gray-500 text-xs px-4 py-6 text-center">{sessions.length === 0 ? "No chats yet" : "No matches"}</p>}
            </div>
            {sessions.length > 0 && (
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>{sessions.length} chat{sessions.length === 1 ? "" : "s"}</span>
                <button onClick={onDeleteAll} className={`text-xs transition ${dark ? "text-gray-600 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}>
                  Delete all
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {/* Compare mode */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Compare mode</p>
              <button onClick={() => onSettings("compareMode", !settings.compareMode)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition ${settings.compareMode ? "border-orange-400 text-orange-500" : dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
                {settings.compareMode ? "Compare mode ON — tap to disable" : "Enable side-by-side compare"}
              </button>
            </div>
            {/* Templates */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Templates</p>
              <div className="space-y-1">
                {settings.templates.map(t => (
                  <button key={t.label} onClick={() => onSettings("template", t.prompt)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition ${dark ? "border-gray-700 text-gray-300 hover:border-gray-500" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                    {t.label} <span className={`text-xs ${dark ? "text-gray-600" : "text-gray-400"}`}>— {t.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Theme */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Theme</p>
              <button onClick={() => onSettings("dark", !settings.dark)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
                {settings.dark ? "Switch to Light mode" : "Switch to Dark mode"}
              </button>
            </div>
            {/* Accent color */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Accent color</p>
              <div className="flex gap-2">
                {[["orange","#f97316"],["blue","#3b82f6"],["green","#16a34a"],["purple","#a855f7"]].map(([k, hex]) => (
                  <button key={k} onClick={() => onSettings("accent", k)}
                    className={`w-7 h-7 rounded-full transition ${settings.accent === k ? "ring-2 ring-offset-2 ring-gray-400" : ""}`}
                    style={{ background: hex }} />
                ))}
              </div>
            </div>
            {/* Font size */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>Font size</p>
              <div className="flex items-center gap-3">
                <button onClick={() => onSettings("fontSize", Math.max(12, settings.fontSize - 1))}
                  className={`w-8 h-8 rounded-lg border text-sm ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>−</button>
                <span className={`text-sm ${dark ? "text-gray-300" : "text-gray-600"}`}>{settings.fontSize}px</span>
                <button onClick={() => onSettings("fontSize", Math.min(22, settings.fontSize + 1))}
                  className={`w-8 h-8 rounded-lg border text-sm ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>+</button>
              </div>
            </div>
            {/* About */}
            <div>
              <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${dark ? "text-gray-500" : "text-gray-400"}`}>About</p>
              <button onClick={() => onSettings("showTimeline", true)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
                How Kiro built this app
              </button>
              <button onClick={() => onSettings("showShortcuts", true)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition mt-2 ${dark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
                Keyboard shortcuts
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function SessionItem({ session, active, pinned, onSelect, onPin, onDelete, onRename, onDuplicate, dark, item }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title || "");
  const iconBtn = `text-xs px-1 transition ${dark ? "text-gray-600 hover:text-orange-400" : "text-gray-300 hover:text-orange-400"}`;

  function commit() {
    setEditing(false);
    if (draft.trim() && draft !== session.title) onRename(session.id, draft);
    else setDraft(session.title || "");
  }

  return (
    <div className={`flex items-start gap-1 group ${item} ${active ? (dark ? "bg-gray-800" : "bg-orange-50") : ""}`}>
      <button onClick={() => onSelect(session.id)} onDoubleClick={() => { setDraft(session.title || ""); setEditing(true); }} className="flex-1 text-left px-4 py-2.5 min-w-0">
        {editing ? (
          <input value={draft} autoFocus onChange={e => setDraft(e.target.value)}
            onClick={e => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setEditing(false); setDraft(session.title || ""); } }}
            className={`w-full text-xs rounded px-1 py-0.5 focus:outline-none ${dark ? "bg-gray-700 text-white" : "bg-white border border-orange-300 text-gray-800"}`} />
        ) : (
          <div className="text-xs font-medium line-clamp-1">{session.title || "Untitled"}</div>
        )}
        <div className="text-xs text-gray-500 mt-0.5">{relTime(session.ts)} · {(session.turns || []).length} message{(session.turns || []).length === 1 ? "" : "s"}</div>
      </button>
      <div className="flex opacity-0 group-hover:opacity-100 pr-2 pt-3 transition">
        <button onClick={() => { setDraft(session.title || ""); setEditing(true); }} title="Rename" className={iconBtn}>✎</button>
        <button onClick={() => onDuplicate(session.id)} title="Duplicate chat" className={iconBtn}>⧉</button>
        <button onClick={() => onPin(session.id)} title="Pin"
          className={`text-xs px-1 transition ${pinned ? "text-orange-400" : iconBtn}`}>
          {pinned ? "★" : "☆"}
        </button>
        <button onClick={() => onDelete(session.id)} title="Delete chat"
          className={`text-xs px-1 transition ${dark ? "text-gray-600 hover:text-red-400" : "text-gray-300 hover:text-red-500"}`}>
          ✕
        </button>
      </div>
    </div>
  );
}
