import { useEffect, useRef, useState } from "react";

function loadScript(src, test) {
  if (test()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function MermaidBlock({ code, dark, paused }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (paused) return; // don't thrash the renderer while tokens stream in
    let alive = true;
    (async () => {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js", () => !!window.mermaid);
        window.mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "default" });
        const id = "mmd-" + Math.random().toString(36).slice(2);
        const safe = String(code || "").replace(/&(?!#?\w+;)/g, "&amp;");
        const { svg } = await window.mermaid.render(id, safe);
        if (alive && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, [code, dark, paused]);

  return (
    <div className={`mt-4 p-4 rounded-xl overflow-x-auto ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-semibold uppercase tracking-widest ${dark ? "text-gray-500" : "text-gray-400"}`}>Diagram</p>
        {!paused && !failed && (
          <button onClick={() => setExpanded(true)} title="Expand diagram"
            className={`text-xs px-2 py-0.5 rounded-lg border transition ${dark ? "border-gray-700 text-gray-500 hover:text-gray-200" : "border-gray-200 text-gray-400 hover:text-gray-700"}`}>
            ⤢ Expand
          </button>
        )}
      </div>
      {paused ? (
        <div className={`flex items-center gap-2 text-xs py-6 justify-center ${dark ? "text-gray-600" : "text-gray-400"}`}>
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
          Drawing diagram…
        </div>
      ) : failed
        ? <pre className={`text-xs font-mono whitespace-pre-wrap ${dark ? "text-gray-400" : "text-gray-600"}`}>{code}</pre>
        : <div ref={ref} data-mmd="1" className="flex justify-center [&>svg]:max-w-full" />}
      {expanded && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6" onClick={() => setExpanded(false)}>
          <div className={`max-w-5xl w-full max-h-[90vh] overflow-auto rounded-2xl p-6 ${dark ? "bg-gray-950" : "bg-white"}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setExpanded(false)} className={`text-xs px-2 py-1 rounded-lg ${dark ? "text-gray-500 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}>✕ Close</button>
            </div>
            <MermaidZoom code={code} dark={dark} />
          </div>
        </div>
      )}
    </div>
  );
}

// Rendered only inside the fullscreen modal so the main view never pays twice.
function MermaidZoom({ code, dark }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js", () => !!window.mermaid);
        window.mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "default" });
        const id = "mmdz-" + Math.random().toString(36).slice(2);
        const safe = String(code || "").replace(/&(?!#?\w+;)/g, "&amp;");
        const { svg } = await window.mermaid.render(id, safe);
        if (alive && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, [code, dark]);
  if (failed) return <pre className={`text-xs font-mono whitespace-pre-wrap ${dark ? "text-gray-400" : "text-gray-600"}`}>{code}</pre>;
  return <div ref={ref} className="flex justify-center [&>svg]:max-w-full [&>svg]:h-auto" />;
}
