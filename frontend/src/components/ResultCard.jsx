import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useEffect, useRef, memo } from "react";
import { exportAnswerPDF } from "../utils/exportPDF";
import VisualizationPanel from "./VisualizationPanel";

function ResultCard({
  answer, citations, relatedQuestions, grounded, onRelated,
  onShare, shareMsg, dark, query, onSaveMd, wordCount,
  isStreaming, rating, onRate, onReSearch, forceCollapsed,
}) {
  const [copied, setCopied] = useState(false);
  const [turnCopied, setTurnCopied] = useState(false);
  const [citeCopied, setCiteCopied] = useState(-1);
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredCite, setHoveredCite] = useState(null);
  const [citeVisible, setCiteVisible] = useState([]);
  const [showAllCites, setShowAllCites] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (typeof forceCollapsed === "boolean") setCollapsed(forceCollapsed);
  }, [forceCollapsed]);

  useEffect(() => {
    if (!isStreaming && citations.length > 0) {
      citations.forEach((_, i) => setTimeout(() => setCiteVisible(v => [...v, i]), i * 120));
    }
  }, [isStreaming, citations.length]);

  function copyAnswer() {
    navigator.clipboard.writeText(answer);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  function copyTurn() {
    navigator.clipboard.writeText(`Q: ${query}\n\n${answer}`);
    setTurnCopied(true); setTimeout(() => setTurnCopied(false), 2000);
  }

  function copyCite(i, url) {
    navigator.clipboard.writeText(url);
    setCiteCopied(i); setTimeout(() => setCiteCopied(-1), 1500);
  }

  function openAllSources() {
    citations.slice(0, 10).forEach(c => { if (c.url) window.open(c.url, "_blank", "noopener"); });
  }

  const readMins = Math.max(1, Math.round(wordCount / 200));

  const headings = [...(answer || "").matchAll(/^#{1,3} (.+)$/mg)].map(m => m[1]);
  const visibleCites = showAllCites ? citations : citations.slice(0, 6);
  const textColor = dark ? "text-gray-100" : "text-gray-800";
  const mutedColor = dark ? "text-gray-500" : "text-gray-400";
  const badgeBg = grounded
    ? dark ? "bg-green-900/50 text-green-400 border-green-800" : "bg-green-50 text-green-700 border-green-200"
    : dark ? "bg-gray-800 text-gray-500 border-gray-700" : "bg-gray-100 text-gray-400 border-gray-200";
  const actionBtn = dark ? "text-gray-500 hover:text-gray-200 transition" : "text-gray-400 hover:text-gray-700 transition";
  const divider = dark ? "border-gray-800" : "border-gray-100";

  return (
    <div className="w-full" ref={rootRef}>
      {isStreaming && (
        <div className={`h-0.5 w-full mb-4 rounded-full overflow-hidden ${dark ? "bg-gray-800" : "bg-gray-100"}`}>
          <div className="h-full bg-orange-400 animate-pulse" style={{ width: "60%" }} />
        </div>
      )}

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeBg}`}>
            {grounded ? "Web grounded" : "From memory"}
          </span>
          {citations.length > 0 && <span className={`text-xs ${mutedColor}`}>{citations.length} source{citations.length !== 1 ? "s" : ""}</span>}
          {wordCount > 0 && <span className={`text-xs ${mutedColor}`}>{wordCount} words · {readMins} min read</span>}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => onRate(1)} className={`text-sm transition ${rating === 1 ? "text-green-500" : actionBtn}`}>+</button>
            <button onClick={() => onRate(-1)} className={`text-sm transition ${rating === -1 ? "text-red-400" : actionBtn}`}>−</button>
          </div>
          <button onClick={onReSearch} className={`text-xs ${actionBtn}`} title="Re-search">↻</button>
          <button onClick={() => setCollapsed(c => !c)} className={`text-xs ${actionBtn}`}>{collapsed ? "Expand" : "Collapse"}</button>
          <button onClick={copyAnswer} className={`text-xs ${actionBtn}`}>{copied ? "Copied" : "Copy"}</button>
          <button onClick={copyTurn} className={`text-xs ${actionBtn}`} title="Copy question + answer">{turnCopied ? "Copied!" : "Copy Q+A"}</button>
          <button onClick={onSaveMd} className={`text-xs ${actionBtn}`}>.md</button>
          <button onClick={() => exportAnswerPDF(query, answer, citations, rootRef.current)} className={`text-xs ${actionBtn}`}>PDF</button>
          <button onClick={onShare} className={`text-xs ${actionBtn}`}>{shareMsg || "Copy link"}</button>
        </div>
      </div>

      {!collapsed && (
        <>
          {headings.length > 2 && (
            <div className={`mb-4 pb-3 border-b ${divider}`}>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {headings.map((h, i) => <span key={i} className={`text-xs ${mutedColor}`}>{i + 1}. {h}</span>)}
              </div>
            </div>
          )}

          <div className={`prose prose-base max-w-none leading-relaxed overflow-x-hidden ${dark ? "prose-invert" : ""} ${textColor}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className={`text-2xl font-bold mt-6 mb-2 ${dark ? "text-gray-100" : "text-gray-900"}`}>{children}</h1>,
                h2: ({ children }) => <h2 className={`text-xl font-semibold mt-5 mb-2 ${dark ? "text-gray-200" : "text-gray-800"}`}>{children}</h2>,
                h3: ({ children }) => <h3 className={`text-lg font-semibold mt-4 mb-1 ${dark ? "text-gray-200" : "text-gray-800"}`}>{children}</h3>,
                p: ({ children }) => <p className={`mb-3 leading-7 ${dark ? "text-gray-300" : "text-gray-700"}`}>{children}</p>,
                li: ({ children }) => <li className={`mb-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>{children}</li>,
                strong: ({ children }) => <strong className={dark ? "text-gray-100 font-semibold" : "text-gray-900 font-semibold"}>{children}</strong>,
                blockquote: ({ children }) => <blockquote className={`border-l-4 border-orange-400 pl-4 my-3 italic ${dark ? "text-gray-400" : "text-gray-500"}`}>{children}</blockquote>,
                table: ({ children }) => <div className="overflow-x-auto my-4"><table className={`min-w-full text-sm border-collapse ${dark ? "text-gray-300" : "text-gray-700"}`}>{children}</table></div>,
                th: ({ children }) => <th className={`px-3 py-2 text-left font-semibold border-b ${dark ? "border-gray-700 text-gray-200" : "border-gray-200 text-gray-800"}`}>{children}</th>,
                td: ({ children }) => <td className={`px-3 py-2 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>{children}</td>,
                pre({ children }) {
                  // Drop diagram <pre> wrappers entirely so no empty gap remains.
                  const child = Array.isArray(children) ? children[0] : children;
                  const cls = (child && child.props && child.props.className) || "";
                  const lang = /language-(\w+)/.exec(cls)?.[1];
                  const raw = String((child && child.props && child.props.children) ?? "").trim();
                  if (isDiagramBlock(lang, raw)) return null;
                  return <pre>{children}</pre>;
                },
                code({ node, inline, className, children }) {
                  const lang = /language-(\w+)/.exec(className || "")?.[1];
                  const raw = String(children).trim();
                  // Diagrams never appear inline — not even a hint box. They
                  // render only when the user picks Diagram in Visualize.
                  if (!inline && isDiagramBlock(lang, raw)) return null;
                  if (!inline && lang) {
                    return (
                      <div className={`rounded-xl overflow-hidden my-4 ${dark ? "bg-gray-900 border border-gray-800" : "bg-gray-900 border border-gray-700"}`}>
                        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                          <span className="text-xs text-gray-400">{lang}</span>
                          <button className="text-xs text-gray-400 hover:text-white" onClick={() => navigator.clipboard.writeText(String(children))}>Copy</button>
                        </div>
                        <pre className="p-4 overflow-x-auto text-sm text-green-300 font-mono"><code>{children}</code></pre>
                      </div>
                    );
                  }
                  return <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${dark ? "bg-gray-800 text-orange-300" : "bg-orange-50 text-orange-700"}`}>{children}</code>;
                }
              }}
            >
              {answer}
            </ReactMarkdown>
          </div>

          <VisualizationPanel answer={answer} dark={dark} paused={isStreaming} />

          {citations.length > 0 && (
            <div className={`mt-6 pt-4 border-t ${divider}`}>
              <div className="flex items-center justify-between mb-3">
                <p className={`text-xs font-semibold uppercase tracking-widest ${mutedColor}`}>Sources</p>
                <button onClick={openAllSources} className={`text-xs ${actionBtn}`}>Open all ({Math.min(citations.length, 10)})</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {visibleCites.map((c, i) => (
                  <div key={i} className={`transition-all duration-300 ${citeVisible.includes(i) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ transitionDelay: `${i * 80}ms` }}>
                    <div className="relative" onMouseEnter={() => setHoveredCite(i)} onMouseLeave={() => setHoveredCite(null)}>
                      <div className="flex items-center gap-1 group">
                        <a href={c.url} target="_blank" rel="noreferrer" className="flex flex-1 items-center gap-2 py-1.5 min-w-0">
                          <img src={`https://www.google.com/s2/favicons?domain=${c.url}&sz=32`} className="w-3.5 h-3.5 flex-shrink-0 rounded opacity-70 group-hover:opacity-100" alt="" onError={e => e.target.style.display = "none"} />
                          <span className={`text-xs underline underline-offset-2 decoration-dotted line-clamp-1 ${dark ? "text-gray-400 hover:text-orange-300" : "text-gray-500 hover:text-orange-600"}`}>{c.title || c.url}</span>
                        </a>
                        <button onClick={() => copyCite(i, c.url)} title="Copy link"
                          className={`text-xs px-1 opacity-0 group-hover:opacity-100 transition ${dark ? "text-gray-600 hover:text-gray-200" : "text-gray-300 hover:text-gray-600"}`}>
                          {citeCopied === i ? "✓" : "⧉"}
                        </button>
                      </div>
                      {hoveredCite === i && c.snippet && (
                        <div className={`absolute z-20 left-0 top-full mt-1 w-72 p-3 rounded-xl shadow-xl text-xs border ${dark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-600"}`}>{c.snippet}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {citations.length > 6 && (
                <button onClick={() => setShowAllCites(s => !s)} className={`mt-2 text-xs ${dark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"} transition`}>
                  {showAllCites ? "Show less" : `Show ${citations.length - 6} more`}
                </button>
              )}
            </div>
          )}

          {relatedQuestions.length > 0 && (
            <div className={`mt-4 pt-4 border-t ${divider}`}>
              <div className="flex flex-wrap gap-2">
                {relatedQuestions.map((q, i) => (
                  <button key={i} onClick={() => onRelated(q)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${dark ? "border-gray-700 text-gray-400 hover:border-orange-500 hover:text-orange-300" : "border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-600"}`}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const DIAGRAM_START = /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|timeline|journey|sankey|gitGraph|C4Context|requirementDiagram|zenuml|block-beta|xychart-beta|packet-beta|kanban|architecture-beta)\b/;
const CODE_LANGS = new Set(["js", "javascript", "ts", "typescript", "python", "py", "java", "c", "cpp", "go", "rust", "ruby", "php", "html", "css", "xml", "json", "yaml", "yml", "sql", "bash", "sh"]);

function isDiagramBlock(lang, raw) {
  if (lang === "mermaid") return true;
  if (lang && CODE_LANGS.has(String(lang).toLowerCase())) return false;
  return DIAGRAM_START.test(raw);
}

// Only re-render when visible data changes — callbacks are behavior-stable.
// This keeps long sessions smooth: streaming tokens re-render one card only.
function cardEqual(p, n) {
  return p.answer === n.answer
    && p.citations === n.citations
    && p.relatedQuestions === n.relatedQuestions
    && p.grounded === n.grounded
    && p.shareMsg === n.shareMsg
    && p.dark === n.dark
    && p.query === n.query
    && p.wordCount === n.wordCount
    && p.isStreaming === n.isStreaming
    && p.rating === n.rating
    && p.forceCollapsed === n.forceCollapsed;
}

export default memo(ResultCard, cardEqual);
