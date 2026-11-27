import { useState, useEffect, useRef, memo } from "react";
import VoiceButton from "./components/VoiceButton";
import ResultCard from "./components/ResultCard";
import HistorySidebar from "./components/HistorySidebar";
import SearchSkeleton from "./components/SearchSkeleton";

import { Ghost, GhostCaption, Bats } from "./components/GhostGuide";
import KiroTimeline from "./components/KiroTimeline";
import ShortcutOverlay from "./components/ShortcutOverlay";
import DataPanel from "./components/DataPanel";
import StatsPanel from "./components/StatsPanel";
import KiroPanel from "./components/KiroPanel";
import ChangelogModal from "./components/ChangelogModal";
import NeuralBg from "./components/NeuralBg";
import { exportConversationPDF } from "./utils/exportPDF";
import { getDeviceId, getMessagesLeft, getUsedCount, setUsedCount, recordMessage, reconcileQuota, MESSAGE_LIMIT } from "./utils/deviceQuota";
import { blobToWavDataUrl } from "./utils/audioToWav";
import { cacheGet, cacheSet } from "./utils/answerCache";

const SUGGESTIONS = [
  "What is quantum computing?","Latest news in artificial intelligence",
  "How does the human brain work?","What is the James Webb telescope?",
  "Explain blockchain in simple terms","What is climate change?",
  "How does GPT work?","What are black holes?",
];

// Backend lives on the same site in production (/api/*); local dev uses :8000.
// VITE_API_URL overrides both when set (e.g. pointing prod at another backend).
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:8000");

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
  { label: "Debate", prompt: "Stage a short debate with two sides arguing: " },
  { label: "Timeline", prompt: "Lay out the key events on a timeline for: " },
  { label: "Quiz me", prompt: "Quiz me with 5 questions about: " },
  { label: "Key stats", prompt: "Give me the 5 most important statistics about: " },
  { label: "Beginner", prompt: "Teach me the basics of: " },
  { label: "Expert", prompt: "Give me an expert-level deep dive into: " },
  { label: "Myths", prompt: "Bust the common myths about: " },
  { label: "Decide", prompt: "Help me decide: " },
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
  const darkMode = false; // light mode only — dark mode removed
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
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [accentKey, setAccentKey] = useState(() => localStorage.getItem("vox_accent") || "orange");
  const [fontSize, setFontSize] = useState(() => {
    // One-time 15% scale-down for existing installs (fresh installs start at 14).
    if (!localStorage.getItem("vox_font_migrated")) {
      localStorage.setItem("vox_font_migrated", "1");
      return Math.round(parseInt(localStorage.getItem("vox_fontsize") || "16") * 0.85);
    }
    return parseInt(localStorage.getItem("vox_fontsize") || "14");
  });
  const [offline, setOffline] = useState(!navigator.onLine);
  const [batchInput, setBatchInput] = useState("");
  const [showBatch, setShowBatch] = useState(false);
  const [showData, setShowData] = useState(false);
  const [dataFile, setDataFile] = useState("");
  const [dataKey, setDataKey] = useState(0);
  const [previewImg, setPreviewImg] = useState(null);
  const [attachSpin, setAttachSpin] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [quotaLeft, setQuotaLeft] = useState(() => getMessagesLeft());
  const [customTemplates, setCustomTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem("vox_templates") || "[]"); } catch { return []; }
  });
  const [showStats, setShowStats] = useState(false);
  const [showKiro, setShowKiro] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
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
  useEffect(() => { try { localStorage.setItem("vox_templates", JSON.stringify(customTemplates)); } catch {} }, [customTemplates]);
  // Applied to <html> so every rem-based size in the app scales together.
  useEffect(() => { document.documentElement.style.fontSize = `${fontSize}px`; }, [fontSize]);
  useEffect(() => {
    // Never autoscroll the empty state — it slides the ghost and bats
    // up under the sticky top bar on load.
    if (turns.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth" });
  }, [turns, loading]);

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

  useEffect(() => { reconcileQuota().then(setQuotaLeft); }, []);

  // Desktop: content sits right of the rail (48px) or sidebar (288px).
  // Mobile: full width, sidebar overlays. Pure CSS below, no JS measuring.

  function handleQueryChange(val) {
    setQuery(val);
    setSuggestions(val.length > 1 ? SUGGESTIONS.filter(s => s.toLowerCase().includes(val.toLowerCase())) : []);
  }

  async function doSearch(text, isCompare = false, backendOverride = null) {
    const q = (text || query).trim();
    if (!q) return;
    if (getMessagesLeft() <= 0) {
      setError(`👻 Your ${MESSAGE_LIMIT} treats are all gone — this device is out of free messages.`);
      return;
    }
    // Device cache: instant free replay, never touches AI or quota.
    if (!isCompare && !backendOverride && !attachment) {
      const hit = cacheGet(q, language, answerLength);
      if (hit) {
        setSuggestions([]);
        setQuery("");
        setError(null);
        const turnId = Date.now();
        updateTurns(prev => [...prev, {
          id: turnId, query: q, answer: hit.answer, streaming: "",
          citations: hit.citations || [], related: [],
          grounded: (hit.citations || []).length > 0, cached: true,
        }]);
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }
    }
    setSuggestions([]);
    if (!isCompare) setQuery("");
    setLoading(true); setError(null);

    const turnId = Date.now();
    // Text attachments ride along with the question so the AI can actually use them.
    const sentAttachment = (!isCompare && !backendOverride) ? attachment : null;
    const backendQuery = backendOverride || (sentAttachment && sentAttachment.kind === "text" && sentAttachment.text
      ? `${q}\n\n[Attached file "${sentAttachment.name}"]:\n${sentAttachment.text}`
      : q);
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
    // Count the message once real content arrives (failed sends stay free).
    // Server-cached answers are free too.
    let counted = false;
    let serverCached = false;
    let fullText = "";
    let seenCitations = [];
    const countOnce = () => {
      if (!counted && !serverCached) { counted = true; setQuotaLeft(recordMessage()); }
    };
    // Batch token renders (~8fps): re-rendering the full answer on every
    // token melts weak phone CPUs. Control events always flush first.
    let pendingText = "";
    let lastFlush = 0;
    const flushTokens = () => {
      if (!pendingText) return;
      const chunk = pendingText;
      pendingText = "";
      lastFlush = Date.now();
      fullText += chunk;
      setter(t => ({ ...t, streaming: (t.streaming || "") + chunk }));
    };

    abortRef.current = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: backendQuery, context, language, length: answerLength, deviceId: getDeviceId() }),
        signal: abortRef.current.signal,
      });
      if (res.status === 429) {
        let msg = `👻 Your ${MESSAGE_LIMIT} treats are all gone — this device is out of free messages.`;
        try { const j = JSON.parse(await res.text()); if (j.error) msg = j.error; } catch {}
        setQuotaLeft(0);
        throw new Error(msg);
      }
      if (!res.ok) throw new Error(await res.text());
      serverCached = res.headers.get("x-cache") === "HIT";
      // Server count wins: adopt it when higher than local.
      const serverLeft = res.headers.get("x-quota-left");
      if (serverLeft !== null) {
        const serverUsed = MESSAGE_LIMIT - Math.max(0, parseInt(serverLeft) || 0);
        if (serverUsed > getUsedCount()) {
          setUsedCount(serverUsed);
          setQuotaLeft(Math.max(0, MESSAGE_LIMIT - serverUsed));
        }
      }

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
            if (msg.type === "token") {
              countOnce();
              pendingText += msg.text || "";
              if (Date.now() - lastFlush >= 120) flushTokens();
            }
            else if (msg.type === "citations") { flushTokens(); seenCitations = msg.data || []; setter(t => ({ ...t, citations: seenCitations, grounded: true })); }
            else if (msg.type === "related") { countOnce(); flushTokens(); setter(t => ({ ...t, related: msg.data })); }
            else if (msg.type === "done") { countOnce(); flushTokens(); setter(t => ({ ...t, answer: t.streaming, streaming: "", cached: serverCached })); }
            else if (msg.type === "error") throw new Error(msg.text);
          } catch (_) {}
        }
      }
      flushTokens();
      // Bank fresh answers on-device for instant free replays.
      if (!isCompare && !backendOverride && fullText && !abortRef.current?.signal?.aborted) {
        cacheSet(q, language, answerLength, fullText, seenCitations);
      }
    } catch (e) {
      if (e.name === "AbortError") {
        // User hit Stop — keep what streamed so far as the final answer.
        flushTokens();
        setter(t => ({ ...t, answer: t.streaming || t.answer || "(stopped)", streaming: "" }));
      } else {
        const raw = e.message || "Something went wrong.";
        const friendly = /failed to fetch|networkerror|load failed|network request failed/i.test(raw)
          ? "👻 The spirits couldn't be reached — check your connection and try again."
          : raw;
        setError(friendly);
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

  function doVerify(turn) {
    if (!turn || !turn.answer) return;
    doSearch(`🛡 Fact-check: ${turn.query}`, false,
      `Fact-check the following answer. For each factual claim give: verdict (correct / wrong / unverifiable) plus a one-line correction where needed. End with an overall score out of 10. Keep it tight.\n\nOriginal question: ${turn.query}\n\nAnswer to check:\n${turn.answer.slice(0, 5000)}`);
  }

  function doFollowUp(turn, text) {
    if (!turn || !text) return;
    doSearch(text, false,
      `Earlier question: ${turn.query}\nEarlier answer:\n${(turn.answer || turn.streaming || "").slice(0, 4000)}\n\nFollow-up question: ${text}\n(Answer the follow-up using the earlier answer as context.)`);
  }

  function doVizAsk(turn, label, summary) {
    if (!turn) return;
    doSearch(`About this ${String(label || "visual").toLowerCase()}: key insight`, false,
      `The user is looking at a ${label} generated from this answer to "${turn.query}".\nVisualization data (may be truncated):\n${summary}\n\nExplain the single most important insight this visualization shows, in 2-3 sentences.`);
  }

  async function handleVoice(audioBlob) {
    setLoading(true); setError(null); setTranscript("");
    try {
      // Meta only accepts WAV — convert the browser's WebM recording first.
      const dataUrl = await blobToWavDataUrl(audioBlob);
      const res = await fetch(`${API_BASE}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: dataUrl, filename: "recording.wav", mime: "audio/wav", deviceId: getDeviceId() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.transcript || !data.transcript.trim()) {
        throw new Error("👻 I didn't catch that — try speaking a little louder and closer to the mic.");
      }
      setTranscript(data.transcript);
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

  if (showTimeline) return <KiroTimeline dark={darkMode} onClose={() => setShowTimeline(false)} />;

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <NeuralBg />

      {showShortcuts && <ShortcutOverlay dark={darkMode} onClose={() => setShowShortcuts(false)} />}

      {/* Icon rail — desktop only; mobile uses the top-bar buttons. Hidden while sidebar is open. */}
      <div className={`fixed left-0 top-0 h-full w-12 z-40 flex-col items-center justify-between py-3 ${darkMode ? "bg-gray-950" : "bg-white"} ${sidebarOpen ? "hidden" : "hidden md:flex"}`}>
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
        settings={{ dark: darkMode, accent: accentKey, fontSize, compareMode, templates: [...TEMPLATES, ...customTemplates] }}
        onStats={() => { setShowStats(true); setSidebarOpen(false); }}
        onSettings={(key, val) => {
          if (key === "accent") setAccentKey(val);
          if (key === "fontSize") setFontSize(val);
          if (key === "compareMode") setCompareMode(val);
          if (key === "template") { setQuery(val); setSidebarOpen(false); setTimeout(() => inputRef.current?.focus(), 100); }
          if (key === "addTemplate" && val && val.label && val.prompt) {
            setCustomTemplates(prev => [...prev.filter(t => t.label !== val.label), { label: String(val.label).slice(0, 24), prompt: String(val.prompt).slice(0, 200), custom: true }]);
          }
          if (key === "deleteTemplate") setCustomTemplates(prev => prev.filter(t => t.label !== val));
          if (key === "showTimeline") { setShowTimeline(true); setSidebarOpen(false); }
          if (key === "showShortcuts") { setShowShortcuts(true); setSidebarOpen(false); }
          if (key === "showKiro") { setShowKiro(true); setSidebarOpen(false); }
          if (key === "showChangelog") { setShowChangelog(true); setSidebarOpen(false); }
        }}
        tab={sidebarTab} onTab={setSidebarTab}
      />

      {/* Main — shifts right when sidebar opens (desktop only) */}
      <div className={`flex flex-col h-screen overflow-hidden ml-0 transition-all duration-300 ${sidebarOpen ? "md:ml-72" : "md:ml-12"}`}>
        {offline && <div className="w-full bg-red-500 text-white text-xs text-center py-1.5 z-50">👻 You're offline — even ghosts need Wi-Fi</div>}

        {/* Top bar — title left, controls right; neither can ever overlap */}
        <div className={`sticky top-0 z-10 w-full px-4 sm:px-5 py-2.5 flex items-center gap-2 ${topBar} backdrop-blur`}>
          <button onClick={() => toggleSidebar("history")} title="Chats"
            className={`md:hidden p-2 -ml-2 rounded-lg transition ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <span className="flex-1 min-w-0 truncate text-left">
            <span className="relative inline-block px-2 py-0.5">
              <span aria-hidden="true" className="absolute inset-0 border rounded-md heartbeat"
                style={{ borderColor: `${accent.hex}90` }} />
              <span className={`relative text-base sm:text-lg font-bold tracking-tight ${accent.text}`}>
                VoxResearch
              </span>
            </span>
          </span>

          {/* Right: language, length, clear — exact size, never squeezed */}
          <div className="flex-none flex items-center gap-2">
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
        <div className="flex-1 min-h-0 overflow-y-auto relative z-0">
          <div className="w-full px-4 sm:px-10 md:px-16 lg:px-20 py-8">

            {turns.length === 0 && !loading && (
              <div className="text-center py-24 relative">
                <Bats />
                <div className="relative">
                  <div className="relative flex justify-center">
                    <Ghost size={132} />
                  </div>
                </div>
                <h2 className="text-5xl font-bold mb-4 mt-4 bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 bg-clip-text text-transparent">
                  VoxResearch
                </h2>
                <p className={`text-lg mb-2 ${mutedText}`}>Ask anything. Get live cited answers.</p>
                <div className="mb-3"><GhostCaption className={mutedText} /></div>
                <div className="mb-10">
                  <span className="inline-block text-xs font-semibold px-4 py-1.5 rounded-full border border-orange-200 bg-orange-50 text-orange-700">
                    🦇 Happy Kiroween — ask if you dare 👻
                  </span>
                </div>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${mutedText}`}>⚡ Instant tries — one tap, full answer</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                  {SUGGESTIONS.slice(0, 6).map((s, i) => (
                    <button key={i} onClick={() => doSearch(s)}
                      className={`text-sm px-4 py-2 rounded-full border transition ${darkMode ? "border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200" : "border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-700 hover:shadow-[0_0_18px_rgba(249,115,22,0.35)]"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {compareMode ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-6 ${mutedText}`}>Column A</p>
                  {turns.map(t => <TurnBlock key={t.id} turn={t} dark={darkMode} accent={accent} userBubble={userBubble} onRelated={doSearch} onShare={handleShare} shareMsg={shareMsg} onSaveMd={saveMarkdown} ratings={ratings} onRate={(id,v) => setRatings(r=>({...r,[id]:v}))} onReSearch={doSearch} onVerify={doVerify} onFollowUp={doFollowUp} onAskViz={doVizAsk} />)}
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-6 ${mutedText}`}>Column B</p>
                  {compareTurns.map(t => <TurnBlock key={t.id} turn={t} dark={darkMode} accent={accent} userBubble={userBubble} onRelated={doSearch} onShare={handleShare} shareMsg={shareMsg} onSaveMd={saveMarkdown} ratings={ratings} onRate={(id,v) => setRatings(r=>({...r,[id]:v}))} onReSearch={q => doSearch(q,true)} onVerify={doVerify} onFollowUp={doFollowUp} onAskViz={doVizAsk} />)}
                </div>
              </div>
            ) : (
              turns.map(t => <TurnBlock key={t.id} turn={t} dark={darkMode} accent={accent} userBubble={userBubble} onRelated={doSearch} onShare={handleShare} shareMsg={shareMsg} onSaveMd={saveMarkdown} ratings={ratings} onRate={(id,v) => setRatings(r=>({...r,[id]:v}))} onReSearch={doSearch} onVerify={doVerify} onFollowUp={doFollowUp} onAskViz={doVizAsk} />)
            )}

            {loading && <SearchSkeleton dark={darkMode} />}
            {error && <p className="text-red-500 text-sm mt-6">{error}</p>}
            {transcript && <p className={`text-xs mt-3 ${mutedText}`}>Heard: "{transcript}"</p>}
            <div ref={bottomRef} />
          </div>
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

        {/* Stats / Kiro / Changelog modals */}
        {showStats && <StatsPanel sessions={sessions} dark={darkMode} onClose={() => setShowStats(false)} />}
        {showKiro && <KiroPanel dark={darkMode} onClose={() => setShowKiro(false)} />}
        {showChangelog && <ChangelogModal dark={darkMode} onClose={() => setShowChangelog(false)} />}

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
            <div className="flex-1 min-w-0 relative"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}>
              <input
                ref={inputRef}
                className={`w-full max-w-full rounded-2xl border pl-12 pr-5 py-3 text-sm focus:outline-none focus:ring-2 transition ${accent.ring} ${inputBg}`}
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
                className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border text-lg leading-none transition-transform duration-300 ${attachSpin ? "rotate-180" : ""} ${darkMode ? "border-gray-700 text-gray-400 hover:text-gray-200" : "border-gray-200 text-gray-400 hover:text-gray-600"}`}>+</button>
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
                className="flex-shrink-0 bg-red-500 hover:bg-red-400 text-white font-semibold px-5 py-3 rounded-2xl transition text-sm">
                ■ Stop
              </button>
            ) : (
              <button onClick={() => doSearch()} disabled={!query.trim()}
                className={`flex-shrink-0 ${accent.btn} disabled:opacity-40 text-white font-semibold px-5 py-3 rounded-2xl transition text-sm`}>
                Send
              </button>
            )}
            <VoiceButton onRecorded={handleVoice} onError={setError} disabled={loading} dark={darkMode} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={`text-[11px] ${mutedText}`}>{query.length > 0 ? `${query.length} chars` : ""}</span>
            <p className={`text-[11px] ${mutedText}`}>AI can make mistakes. Verify important information.</p>
            <span className={`text-[11px] ${quotaLeft <= 2 ? "text-red-500 font-semibold" : mutedText}`}>{quotaLeft} of {MESSAGE_LIMIT} free left</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const TurnBlock = memo(function TurnBlock({ turn, dark, accent, userBubble, onRelated, onShare, shareMsg, onSaveMd, ratings, onRate, onReSearch, onVerify, onFollowUp, onAskViz }) {
  const wordCount = (turn.answer || turn.streaming || "").split(/\s+/).filter(Boolean).length;
  const mutedText = dark ? "text-gray-600" : "text-gray-300";
  return (
    <div className="mb-12">
      {/* User bubble — right aligned */}
      <div className="flex justify-end mb-5 min-w-0">
        <div className={`min-w-0 max-w-full sm:max-w-xl px-5 py-3 rounded-2xl rounded-tr-sm text-sm font-medium leading-relaxed break-words ${userBubble}`}>
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
          onVerify={() => onVerify(turn)}
          onFollowUp={text => onFollowUp(turn, text)}
          onAskViz={(label, summary) => onAskViz(turn, label, summary)}
          cached={turn.cached}
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
