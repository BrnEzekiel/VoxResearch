import { useState, useEffect, useRef, memo } from "react";
import VoiceButton from "./components/VoiceButton";
import ResultCard from "./components/ResultCard";
import HistorySidebar from "./components/HistorySidebar";
import SearchSkeleton from "./components/SearchSkeleton";

import SplashScreen from "./components/SplashScreen";
import KiroTimeline from "./components/KiroTimeline";
import ShortcutOverlay from "./components/ShortcutOverlay";
import DataPanel from "./components/DataPanel";
import { exportConversationPDF } from "./utils/exportPDF";

const SUGGESTIONS = [
  "What is quantum computing?","Latest news in artificial intelligence",
  "How does the human brain work?","What is the James Webb telescope?",
  "Explain blockchain in simple terms","What is climate change?",
  "How does GPT work?","What are black holes?",
];

// Production backend URL comes from Vercel env; local dev falls back to localhost.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ACCENT_COLORS = {
  orange: { btn: "bg-orange-500 hover:bg-orange-400", text: "text-orange-500", ring: "focus:ring-orange-400", hex: "#f97316" },
  blue:   { btn: "bg-blue-500 hover:bg-blue-400",    text: "text-blue-500",   ring: "focus:ring-blue-400",   hex: "#3b82f6" },
  green:  { btn: "bg-green-600 hover:bg-green-500",  text: "text-green-600",  ring: "focus:ring-green-400",  hex: "#16a34a" },
  purple: { btn: "bg-purple-500 hover:bg-purple-400",text: "text-purple-500", ring: "focus:ring-purple-400", hex: "#a855f7" },
};

const TEMPLATES = [
  { label: "ELI5", prompt: "Explain like I'm 5: " },
  { label: "Pros & Cons", prompt: "Give me the pros and cons of: " },
  { label: "Table", prompt: "Summarize in a comparison table: " },
  { label: "Steps", prompt: "Give me step-by-step instructions for: " },
];

// Image bytes live here (memory only) so big screenshots never blow up localStorage.
// Turns store just the id + filename; the thumbnail resolves from this map.
const imageStore = new Map();

function loadSessions() {
  try {
    const saved = JSON.parse(localStorage.getItem("vox_sessions") || "null");
    if (saved && saved.length) return saved;
  } catch {}
  try {
    const legacy = JSON.parse(localStorage.getItem("vox_history") || "[]");
    if (legacy.length) {
      return [{
        id: Date.now(),
        title: ((legacy[legacy.length - 1] && legacy[legacy.length - 1].query) || "Imported chat").slice(0, 42),
        ts: Date.now(),
        pinned: false,
        turns: legacy.map((e, i) => ({
          id: (e.ts || Date.now()) + i,
          query: e.query,
          answer: e.answer || "",
          streaming: "",
          citations: e.citations || [],
          related: [],
          grounded: (e.citations || []).length > 0,
        })),
      }];
    }
  } catch {}
  return [{ id: Date.now(), title: "New chat", turns: [], ts: Date.now(), pinned: false }];
}

export default function App() {
  const [query, setQuery] = useState("");
  const [sessions, setSessions] = useState(loadSessions);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ratings, setRatings] = useState(() => JSON.parse(localStorage.getItem("vox_ratings") || "{}"));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("history");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("vox_theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [transcript, setTranscript] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [shareMsg, setShareMsg] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");
  const [language, setLanguage] = useState("English");
  const [answerLength, setAnswerLength] = useState("Detailed");
  const [showTimeline, setShowTimeline] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareQuery, setCompareQuery] = useState("");
  const [compareTurns, setCompareTurns] = useState([]);
  const [splashDone, setSplashDone] = useState(() => !!localStorage.getItem("vox_splash_seen"));
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [accentKey, setAccentKey] = useState(() => localStorage.getItem("vox_accent") || "orange");
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem("vox_fontsize") || "16"));
  const [offline, setOffline] = useState(!navigator.onLine);
  const [batchInput, setBatchInput] = useState("");
  const [showBatch, setShowBatch] = useState(false);
  const [showData, setShowData] = useState(false);
  const [dataFile, setDataFile] = useState("");
  const [dataKey, setDataKey] = useState(0);
  const [previewImg, setPreviewImg] = useState(null);
  const [attachSpin, setAttachSpin] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showTop, setShowTop] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const mainRef = useRef(null);
  const abortRef = useRef(null);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const persistTimer = useRef(null);
  const accent = ACCENT_COLORS[accentKey] || ACCENT_COLORS.orange;

  const active = sessions.find(s => s.id === activeId) || sessions[0];
  const turns = active ? active.turns : [];

  const updateTurns = (fn) => {
    const id = active ? active.id : null;
    if (!id) return;
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s;
      const next = typeof fn === "function" ? fn(s.turns) : fn;
      let title = s.title;
      if ((title === "New chat" || !title) && next.length > 0) title = (next[0].query || "Untitled").slice(0, 42);
      return { ...s, turns: next, ts: Date.now(), title };
    }));
  };

  // Debounced persist: writing the whole session log to disk on every
  // streamed token was the main source of hangs in long sessions.
  useEffect(() => {
    clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      try { localStorage.setItem("vox_sessions", JSON.stringify(sessionsRef.current)); } catch {}
    }, 600);
    return () => clearTimeout(persistTimer.current);
  }, [sessions]);
  useEffect(() => {
    const flush = () => { try { localStorage.setItem("vox_sessions", JSON.stringify(sessionsRef.current)); } catch {} };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);
  useEffect(() => { localStorage.setItem("vox_ratings", JSON.stringify(ratings)); }, [ratings]);
  useEffect(() => { localStorage.setItem("vox_accent", accentKey); }, [accentKey]);
  useEffect(() => { localStorage.setItem("vox_fontsize", fontSize); }, [fontSize]);
  useEffect(() => { localStorage.setItem("vox_theme", darkMode ? "dark" : "light"); }, [darkMode]);
  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth" });
  }, [turns, loading, autoScroll]);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "?" && document.activeElement !== inputRef.current) { e.preventDefault(); setShowShortcuts(s => !s); }
      if (e.key === "/" && document.activeElement !== inputRef.current) { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === "Escape") { setQuery(""); setSuggestions([]); setShowShortcuts(false); }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setSidebarOpen(o => !o); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) doSearch(q);
  }, []);

  // Rail (48px) shows only when sidebar is closed; sidebar slides in from the very edge
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.style.marginLeft = sidebarOpen ? "288px" : "48px";
      mainRef.current.style.transition = "margin-left 0.3s ease";
    }
  }, [sidebarOpen]);

  function handleQueryChange(val) {
    setQuery(val);
    setSuggestions(val.length > 1 ? SUGGESTIONS.filter(s => s.toLowerCase().includes(val.toLowerCase())) : []);
  }

  async function doSearch(text, isCompare = false) {
    const q = (text || query).trim();
    if (!q) return;
    setSuggestions([]);
    if (!isCompare) setQuery("");
    setLoading(true); setError(null);

    const turnId = Date.now();
    // Text attachments ride along with the question so the AI can actually use them.
    const sentAttachment = !isCompare ? attachment : null;
    const backendQuery = sentAttachment && sentAttachment.kind === "text" && sentAttachment.text
      ? `${q}\n\n[Attached file "${sentAttachment.name}"]:\n${sentAttachment.text}`
      : q;
    if (sentAttachment) setAttachment(null);
    const newTurn = {
      id: turnId, query: q, answer: null, streaming: "", citations: [], related: [], grounded: false,
      attachment: sentAttachment ? { id: sentAttachment.id, name: sentAttachment.name, kind: sentAttachment.kind } : null,
    };
    const context = turns.slice(-3).map(t => ({ role: "user", content: t.query }));

    if (!isCompare) updateTurns(prev => [...prev, newTurn]);
    else setCompareTurns(prev => [...prev, newTurn]);

    const setter = isCompare
      ? fn => setCompareTurns(prev => prev.map(t => t.id === turnId ? fn(t) : t))
      : fn => updateTurns(prev => prev.map(t => t.id === turnId ? fn(t) : t));

    abortRef.current = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: backendQuery, context, language, length: answerLength }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim(); if (!raw) continue;
          try {
            const msg = JSON.parse(raw);
            if (msg.type === "token") setter(t => ({ ...t, streaming: (t.streaming || "") + msg.text }));
            else if (msg.type === "citations") setter(t => ({ ...t, citations: msg.data, grounded: true }));
            else if (msg.type === "related") setter(t => ({ ...t, related: msg.data }));
            else if (msg.type === "done") setter(t => ({ ...t, answer: t.streaming, streaming: "" }));
            else if (msg.type === "error") throw new Error(msg.text);
          } catch (_) {}
        }
      }
    } catch (e) {
      if (e.name === "AbortError") {
        // User hit Stop — keep what streamed so far as the final answer.
        setter(t => ({ ...t, answer: t.streaming || t.answer || "(stopped)", streaming: "" }));
      } else {
        setError(e.message);
        if (!isCompare) updateTurns(prev => prev.filter(t => t.id !== turnId));
        else setCompareTurns(prev => prev.filter(t => t.id !== turnId));
      }
    }
    abortRef.current = null;
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function stopSearch() {
    abortRef.current?.abort();
  }

  async function doBatch() {
    const qs = batchInput.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 5);
    setShowBatch(false); setBatchInput("");
    for (const q of qs) await doSearch(q);
  }

  async function handleVoice(audioBlob) {
    setLoading(true); setError(null); setTranscript("");
    try {
      const form = new FormData(); form.append("audio", audioBlob, "recording.webm");
      const res = await fetch(`${API_BASE}/transcribe`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json(); setTranscript(data.transcript);
      await doSearch(data.transcript);
    } catch (e) { setError(e.message); setLoading(false); }
  }

  function handleShare(q) {
    navigator.clipboard.writeText(`${window.location.origin}?q=${encodeURIComponent(q)}`);
    setShareMsg("Copied!"); setTimeout(() => setShareMsg(""), 2000);
  }

  async function exportFullConversation(format) {
    if (format === "pdf") {
      await exportConversationPDF(turns);
      return;
    }
    const md = turns.map(t => `## ${t.query}\n\n${t.answer || ""}`).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "voxresearch.md"; a.click();
  }

  function saveMarkdown(query, answer, citations) {
    const md = `# ${query}\n\n${answer}\n\n## Sources\n${citations.map(c=>`- [${c.title||c.url}](${c.url})`).join("\n")}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "voxresearch.md"; a.click();
  }

  function newChat() {
    const id = Date.now();
    setSessions(prev => [{ id, title: "New chat", turns: [], ts: id, pinned: false }, ...prev]);
    setActiveId(id);
    setSidebarOpen(false);
  }

  function selectSession(id) { setActiveId(id); setSidebarOpen(false); }

  function pinSession(id) {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, pinned: !s.pinned } : s));
  }

  function deleteSession(id) {
    const s = sessions.find(x => x.id === id);
    if (!window.confirm(`Delete "${(s && s.title) || "this chat"}"? This cannot be undone.`)) return;
    const next = sessions.filter(s => s.id !== id);
    if (next.length === 0) {
      const fresh = { id: Date.now(), title: "New chat", turns: [], ts: Date.now(), pinned: false };
      setSessions([fresh]);
      setActiveId(fresh.id);
    } else {
      setSessions(next);
      if (activeId === id || (active && active.id === id)) setActiveId(next[0].id);
    }
  }

  function deleteAllSessions() {
    if (!window.confirm(`Delete all ${sessions.length} chats? This cannot be undone.`)) return;
    const fresh = { id: Date.now(), title: "New chat", turns: [], ts: Date.now(), pinned: false };
    setSessions([fresh]);
    setActiveId(fresh.id);
  }

  function renameSession(id, title) {
    const t = (title || "").trim().slice(0, 60);
    if (!t) return;
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: t } : s));
  }

  function duplicateSession(id) {
    const src = sessions.find(s => s.id === id);
    if (!src) return;
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id: Date.now(),
      title: `${src.title || "Untitled"} (copy)`.slice(0, 60),
      ts: Date.now(),
      pinned: false,
    };
    setSessions(prev => [copy, ...prev]);
    setActiveId(copy.id);
    setSidebarOpen(false);
  }

  function handleFile(f) {
    if (!f) return;
    const id = Date.now();
    const name = (f.name || "").toLowerCase();
    if (/\.(png|jpe?g|gif|webp|svg|bmp|ico)$/.test(name) || (f.type || "").startsWith("image/")) {
      const r = new FileReader();
      r.onload = () => {
        imageStore.set(id, String(r.result));
        setAttachment({ id, name: f.name, kind: "image" });
      };
      r.readAsDataURL(f);
    } else {
      const r = new FileReader();
      r.onload = () => setAttachment({ id, name: f.name, kind: "text", text: String(r.result || "").slice(0, 12000) });
      r.readAsText(f);
    }
  }

  function openAttachmentLab() {
    if (!attachment || !attachment.text) return;
    setDataFile(attachment.text);
    setDataKey(k => k + 1);
    setShowData(true);
  }

  function viewAttachmentImage() {
    if (!attachment) return;
    const url = imageStore.get(attachment.id);
    if (url) setPreviewImg({ name: attachment.name, url });
  }

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleSidebar(tab) {
    if (sidebarOpen && sidebarTab === tab) setSidebarOpen(false);
    else { setSidebarTab(tab); setSidebarOpen(true); }
  }

  const bg = darkMode ? "bg-gray-950 text-gray-100" : "bg-white text-gray-900";
  const topBar = darkMode ? "bg-gray-950/90" : "bg-white/90";
  const bottomBar = darkMode ? "bg-gray-950/95" : "bg-white/95";
  const inputBg = darkMode ? "bg-transparent border-gray-700 text-white placeholder-gray-500" : "bg-transparent border-gray-200 text-gray-900 placeholder-gray-400";
  const userBubble = `${accent.btn} text-white`;
  const mutedText = darkMode ? "text-gray-500" : "text-gray-400";
  const railBtn = (on) => `p-2 rounded-lg transition ${on ? accent.text : darkMode ? "text-gray-500 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`;

  if (!splashDone) return <SplashScreen onDone={() => { setSplashDone(true); localStorage.setItem("vox_splash_seen","1"); }} />;
  if (showTimeline) return <KiroTimeline dark={darkMode} onClose={() => setShowTimeline(false)} />;

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`} style={{ fontSize: `${fontSize}px` }}>

      {showShortcuts && <ShortcutOverlay dark={darkMode} onClose={() => setShowShortcuts(false)} />}

      {/* Icon rail — hamburger top opens history, gear bottom opens settings. Hidden while sidebar is open. */}
      <div className={`fixed left-0 top-0 h-full w-12 z-40 flex-col items-center justify-between py-3 ${darkMode ? "bg-gray-950" : "bg-white"} ${sidebarOpen ? "hidden" : "flex"}`}>
        <button onClick={() => toggleSidebar("history")} title="Chats" className={railBtn(sidebarOpen && sidebarTab === "history")}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <button onClick={() => toggleSidebar("settings")} title="Settings" className={`${railBtn(sidebarOpen && sidebarTab === "settings")} text-xl leading-none pb-1`}>
          ⚙
        </button>
      </div>

      {/* Sidebar — sits outside main flow, main shifts right */}
      <HistorySidebar
        open={sidebarOpen}
        sessions={sessions}
        activeId={active ? active.id : null}
        filter={historyFilter} onFilter={setHistoryFilter}
        onSelect={selectSession}
        onNew={newChat}
        onClose={() => setSidebarOpen(false)}
        onPin={pinSession}
        onDelete={deleteSession}
        onRename={renameSession}
        onDuplicate={duplicateSession}
        onDeleteAll={deleteAllSessions}
        dark={darkMode}
        onExport={exportFullConversation}
        settings={{ dark: darkMode, accent: accentKey, fontSize, compareMode, templates: TEMPLATES }}
        onSettings={(key, val) => {
          if (key === "dark") setDarkMode(val);
          if (key === "accent") setAccentKey(val);
          if (key === "fontSize") setFontSize(val);
          if (key === "compareMode") setCompareMode(val);
          if (key === "template") { setQuery(val); setSidebarOpen(false); setTimeout(() => inputRef.current?.focus(), 100); }
          if (key === "showTimeline") { setShowTimeline(true); setSidebarOpen(false); }
          if (key === "showShortcuts") { setShowShortcuts(true); setSidebarOpen(false); }
        }}
        tab={sidebarTab} onTab={setSidebarTab}
      />

      {/* Main — shifts right when sidebar opens */}
      <div ref={mainRef} className="flex flex-col min-h-screen">
        {offline && <div className="w-full bg-red-500 text-white text-xs text-center py-1.5 z-50">You are offline</div>}

        {/* Top bar — centered title, language + length only */}
        <div className={`sticky top-0 z-10 w-full px-5 py-2.5 flex items-center ${topBar} backdrop-blur`}>
          <div className="w-1/4" />

          {/* Center: title — truly centered */}
          <div className="flex-1 flex justify-center">
            <span className={`text-lg font-bold tracking-tight ${accent.text}`}
              style={{ textShadow: `0 0 20px ${accent.hex}40` }}>
              VoxResearch
            </span>
          </div>

          {/* Right: language, length, clear */}
          <div className="w-1/4 flex items-center justify-end gap-2">
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className={`text-xs rounded-lg border px-2 py-1 bg-transparent ${darkMode ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
              {["English","Swahili","French","Spanish","German","Arabic","Hindi"].map(l => <option key={l}>{l}</option>)}
            </select>
            <select value={answerLength} onChange={e => setAnswerLength(e.target.value)}
              className={`text-xs rounded-lg border px-2 py-1 bg-transparent ${darkMode ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"}`}>
              {["Brief","Detailed","Bullets"].map(l => <option key={l}>{l}</option>)}
            </select>
            {turns.length > 0 && (
              <button onClick={() => updateTurns([])}
                className={`text-xs px-2 py-1 rounded-lg border transition ${darkMode ? "border-gray-700 text-gray-500 hover:text-red-400" : "border-gray-200 text-gray-400 hover:text-red-500"}`}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Chat — full width, responsive padding */}
        <div className="flex-1 overflow-y-auto relative z-0">
          <div className="w-full px-4 sm:px-10 md:px-16 lg:px-20 py-8">

            {turns.length === 0 && !loading && (
              <div className="text-center py-24">
                <h2 className={`text-5xl font-bold ${accent.text} mb-4`}
                  style={{ textShadow: `0 0 40px ${accent.hex}30` }}>
                  VoxResearch
                </h2>
                <p className={`text-lg mb-10 ${mutedText}`}>Ask anything. Get live cited answers.</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                  {SUGGESTIONS.slice(0, 6).map((s, i) => (
                    <button key={i} onClick={() => doSearch(s)}
                      className={`text-sm px-4 py-2 rounded-full border transition ${darkMode ? "border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200" : "border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {compareMode ? (
              <div className="grid grid-cols-2 gap-10">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-6 ${mutedText}`}>Column A</p>
                  {turns.map(t => <TurnBlock key={t.id} turn={t} dark={darkMode} accent={accent} userBubble={userBubble} onRelated={doSearch} onShare={handleShare} shareMsg={shareMsg} onSaveMd={saveMarkdown} ratings={ratings} onRate={(id,v) => setRatings(r=>({...r,[id]:v}))} onReSearch={doSearch} />)}
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-6 ${mutedText}`}>Column B</p>
                  {compareTurns.map(t => <TurnBlock key={t.id} turn={t} dark={darkMode} accent={accent} userBubble={userBubble} onRelated={doSearch} onShare={handleShare} shareMsg={shareMsg} onSaveMd={saveMarkdown} ratings={ratings} onRate={(id,v) => setRatings(r=>({...r,[id]:v}))} onReSearch={q => doSearch(q,true)} />)}
                </div>
              </div>
            ) : (
              turns.map(t => <TurnBlock key={t.id} turn={t} dark={darkMode} accent={accent} userBubble={userBubble} onRelated={doSearch} onShare={handleShare} shareMsg={shareMsg} onSaveMd={saveMarkdown} ratings={ratings} onRate={(id,v) => setRatings(r=>({...r,[id]:v}))} onReSearch={doSearch} />)
            )}

            {loading && <SearchSkeleton dark={darkMode} />}
            {error && <p className="text-red-500 text-sm mt-6">{error}</p>}
            {transcript && <p className={`text-xs mt-3 ${mutedText}`}>Heard: "{transcript}"</p>}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Floating scroll controls */}
        <div className="fixed bottom-28 right-6 z-20 flex flex-col gap-2">
          <button onClick={() => setAutoScroll(v => !v)} title={autoScroll ? "Pause auto-scroll" : "Resume auto-scroll"}
            className={`w-9 h-9 rounded-full border shadow-lg text-sm transition ${autoScroll ? accent.btn + " text-white border-transparent" : darkMode ? "bg-gray-900 border-gray-700 text-gray-400" : "bg-white border-gray-200 text-gray-400"}`}>
            {autoScroll ? "▼" : "⏸"}
          </button>
          {showTop && (
            <button onClick={scrollToTop} title="Back to top"
              className={`w-9 h-9 rounded-full border shadow-lg text-sm transition ${darkMode ? "bg-gray-900 border-gray-700 text-gray-300 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:text-gray-800"}`}>
              ▲
            </button>
          )}
        </div>

        {/* Batch modal */}
        {showBatch && (
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
            <div className={`w-full max-w-md rounded-2xl p-6 ${darkMode ? "bg-gray-900" : "bg-white"}`}>
              <h3 className={`font-semibold mb-3 ${darkMode ? "text-gray-100" : "text-gray-800"}`}>Batch search — one question per line</h3>
              <textarea
                className={`w-full rounded-xl border px-4 py-3 text-sm h-36 resize-none focus:outline-none focus:ring-2 ${accent.ring} ${darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                placeholder={"What is AI?\nWhat is ML?\nWhat is DL?"}
                value={batchInput} onChange={e => setBatchInput(e.target.value)}
              />
              <div className="flex gap-2 mt-3">
                <button onClick={doBatch} className={`flex-1 py-2 rounded-xl text-sm font-semibold text-white ${accent.btn}`}>Search all</button>
                <button onClick={() => setShowBatch(false)} className={`px-4 py-2 rounded-xl text-sm ${darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"}`}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Data lab modal */}
        {showData && (
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => setShowData(false)}>
            <div className={`w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl ${darkMode ? "bg-gray-950" : "bg-white"}`} onClick={e => e.stopPropagation()}>
              <DataPanel key={dataKey} dark={darkMode} onClose={() => setShowData(false)} initialText={dataFile} />
            </div>
          </div>
        )}
        {previewImg && (
          <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
            <div className={`max-w-3xl max-h-[85vh] overflow-auto rounded-2xl p-4 ${darkMode ? "bg-gray-950" : "bg-white"}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{previewImg.name}</p>
                <button onClick={() => setPreviewImg(null)} className={`text-xs px-2 py-1 rounded-lg ${darkMode ? "text-gray-500 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}>✕ Close</button>
              </div>
              <img src={previewImg.url} alt={previewImg.name} className="max-w-full rounded-lg" />
            </div>
          </div>
        )}

        {/* Bottom input */}
        <div className={`sticky bottom-0 z-10 w-full px-4 sm:px-10 md:px-16 lg:px-20 py-3 ${bottomBar} backdrop-blur`}>
          {compareMode && (
            <input
              className={`w-full rounded-xl border px-4 py-2 text-sm mb-2 focus:outline-none focus:ring-2 ${accent.ring} ${inputBg}`}
              placeholder="Column B question..."
              value={compareQuery} onChange={e => setCompareQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch(compareQuery, true)}
            />
          )}
          {attachment && (
            <div className={`flex items-center gap-2 mb-2 px-3 py-1.5 rounded-xl border text-xs w-fit max-w-full ${darkMode ? "border-gray-700 bg-gray-900 text-gray-300" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
              <span className="truncate">📎 {attachment.name}</span>
              <span className={`${darkMode ? "text-gray-600" : "text-gray-400"} flex-shrink-0`}>
                {attachment.kind === "text" ? "· will send with message" : "· image"}
              </span>
              {attachment.kind === "text" ? (
                <button onClick={openAttachmentLab} title="Open in data lab" className={`${accent.text} flex-shrink-0`}>Data lab</button>
              ) : (
                <button onClick={viewAttachmentImage} title="View image" className={`${accent.text} flex-shrink-0`}>View</button>
              )}
              <button onClick={() => setAttachment(null)} title="Remove"
                className={`flex-shrink-0 ${darkMode ? "text-gray-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}>✕</button>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1 relative"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}>
              <input
                ref={inputRef}
                className={`w-full rounded-2xl border pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-2 transition ${accent.ring} ${inputBg}`}
                placeholder="Ask anything... (drop files or paste screenshots)"
                value={query} onChange={e => handleQueryChange(e.target.value)}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") doSearch();
                  else if (e.key === "Enter" && !e.shiftKey) doSearch();
                }}
                onPaste={e => {
                  const f = e.clipboardData?.files?.[0];
                  if (f) { e.preventDefault(); handleFile(f); }
                }}
                autoComplete="off" disabled={loading}
              />
              <button
                onClick={() => { setAttachSpin(true); setTimeout(() => { document.getElementById("file-attach-input").click(); setAttachSpin(false); }, 350); }}
                title="Attach any file"
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border text-lg leading-none transition-transform duration-300 ${attachSpin ? "rotate-180" : ""} ${darkMode ? "border-gray-700 text-gray-400 hover:text-gray-200" : "border-gray-200 text-gray-400 hover:text-gray-600"}`}>+</button>
              <input id="file-attach-input" type="file" className="hidden" onChange={e => {
                const f = e.target.files?.[0];
                e.target.value = "";
                handleFile(f);
              }} />
              {suggestions.length > 0 && (
                <ul className={`absolute bottom-full left-0 right-0 mb-1 rounded-2xl border shadow-xl z-20 overflow-hidden ${darkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
                  {suggestions.map((s, i) => (
                    <li key={i} className={`px-5 py-2.5 cursor-pointer text-sm ${darkMode ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-50 text-gray-600"}`}
                      onClick={() => { setQuery(s); setSuggestions([]); doSearch(s); }}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
            {loading ? (
              <button onClick={stopSearch} title="Stop generating"
                className="bg-red-500 hover:bg-red-400 text-white font-semibold px-5 py-3 rounded-2xl transition text-sm">
                ■ Stop
              </button>
            ) : (
              <button onClick={() => doSearch()} disabled={!query.trim()}
                className={`${accent.btn} disabled:opacity-40 text-white font-semibold px-5 py-3 rounded-2xl transition text-sm`}>
                Send
              </button>
            )}
            <VoiceButton onRecorded={handleVoice} disabled={loading} dark={darkMode} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-[11px] ${mutedText}`}>{query.length > 0 ? `${query.length} chars` : ""}</span>
            <p className={`text-[11px] ${mutedText}`}>AI can make mistakes. Verify important information.</p>
            <span className={`text-[11px] ${mutedText}`}>{turns.length > 0 ? `${turns.length} message${turns.length === 1 ? "" : "s"}` : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const TurnBlock = memo(function TurnBlock({ turn, dark, accent, userBubble, onRelated, onShare, shareMsg, onSaveMd, ratings, onRate, onReSearch }) {
  const wordCount = (turn.answer || turn.streaming || "").split(/\s+/).filter(Boolean).length;
  const mutedText = dark ? "text-gray-600" : "text-gray-300";
  return (
    <div className="mb-12">
      {/* User bubble — right aligned */}
      <div className="flex justify-end mb-5">
        <div className={`max-w-xl px-5 py-3 rounded-2xl rounded-tr-sm text-sm font-medium leading-relaxed ${userBubble}`}>
          {turn.attachment && (
            <span className="flex items-center gap-2 mb-2 pb-2 border-b border-white/25 text-xs font-normal">
              {turn.attachment.kind === "image" && imageStore.get(turn.attachment.id)
                ? <img src={imageStore.get(turn.attachment.id)} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                : <span>📎</span>}
              <span className="truncate">{turn.attachment.name}</span>
            </span>
          )}
          {turn.query}
        </div>
      </div>

      {/* Answer — no bubble, flows naturally */}
      {(turn.answer || turn.streaming) && (
        <ResultCard
          answer={turn.streaming || turn.answer}
          citations={turn.citations}
          relatedQuestions={turn.related}
          grounded={turn.grounded}
          onRelated={onRelated}
          onShare={() => onShare(turn.query)}
          shareMsg={shareMsg}
          dark={dark}
          query={turn.query}
          onSaveMd={() => onSaveMd(turn.query, turn.answer || turn.streaming, turn.citations)}
          wordCount={wordCount}
          isStreaming={!!turn.streaming}
          rating={ratings[turn.id]}
          onRate={v => onRate(turn.id, v)}
          onReSearch={() => onReSearch(turn.query)}
        />
      )}

      {/* Divider between turns */}
      <div className={`mt-10 border-b ${dark ? "border-gray-900" : "border-gray-100"}`} />
    </div>
  );
}, (p, n) =>
  p.turn === n.turn
  && p.dark === n.dark
  && p.shareMsg === n.shareMsg
  && p.accent === n.accent
  && p.userBubble === n.userBubble
  && p.ratings[p.turn.id] === n.ratings[n.turn.id]
);
