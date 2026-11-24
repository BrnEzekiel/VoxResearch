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

function Shell({ dark, title, children }) {
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>{title}</p>
      {children}
    </div>
  );
}

const PALETTE = ["#f97316", "#3b82f6", "#16a34a", "#a855f7", "#ef4444", "#eab308", "#06b6d4c", "#ec4899"];

// tasks: [{ name, start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }]
export function GanttChart({ tasks, dark }) {
  const rows = (tasks || []).map(t => ({
    ...t,
    s: new Date(t.start + "T12:00:00"),
    e: new Date(t.end + "T12:00:00"),
  })).filter(t => !isNaN(t.s) && !isNaN(t.e)).slice(0, 20);
  if (rows.length === 0) return null;
  const min = Math.min(...rows.map(t => t.s));
  const max = Math.max(...rows.map(t => t.e));
  const span = max - min || 1;
  return (
    <Shell dark={dark} title="Gantt chart">
      <div className="space-y-2 overflow-x-auto">
        {rows.map((t, i) => (
          <div key={i} className="flex items-center gap-2 min-w-[560px]">
            <span className={`text-xs w-32 truncate flex-shrink-0 ${dark ? "text-gray-400" : "text-gray-500"}`}>{t.name}</span>
            <div className="relative flex-1 h-6">
              <div className={`absolute inset-0 rounded ${dark ? "bg-gray-800" : "bg-gray-100"}`} />
              <div className="absolute top-0 h-6 rounded"
                style={{ left: `${((t.s - min) / span) * 100}%`, width: `${Math.max(2, ((t.e - t.s) / span) * 100)}%`, background: PALETTE[i % PALETTE.length] }}
                title={`${t.start} → ${t.end}`} />
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function JsonNode({ name, value, dark, depth }) {
  const isObj = value !== null && typeof value === "object";
  const [open, setOpen] = useState(depth < 2);
  const kids = isObj ? (Array.isArray(value) ? value.length : Object.keys(value).length) : 0;
  if (!isObj) {
    return (
      <div className="flex gap-2 font-mono text-xs py-0.5">
        {name !== null && <span className="text-sky-400">{name}:</span>}
        <span className={dark ? "text-gray-300" : "text-gray-700"}>{JSON.stringify(value)}</span>
      </div>
    );
  }
  const entries = Array.isArray(value) ? value.map((v, i) => [i, v]) : Object.entries(value);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="font-mono text-xs py-0.5 flex gap-2 items-center">
        <span className={dark ? "text-gray-500" : "text-gray-400"}>{open ? "▾" : "▸"}</span>
        {name !== null && <span className="text-sky-400">{name}</span>}
        <span className={dark ? "text-gray-500" : "text-gray-400"}>{Array.isArray(value) ? `[${kids}]` : `{${kids}}`}</span>
      </button>
      {open && (
        <div className={`ml-3 pl-3 border-l ${dark ? "border-gray-800" : "border-gray-200"}`}>
          {entries.slice(0, 100).map(([k, v], i) => <JsonNode key={i} name={Array.isArray(value) ? null : k} value={v} dark={dark} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export function JsonTree({ data, dark }) {
  return (
    <Shell dark={dark} title="JSON tree">
      <JsonNode name={null} value={data} dark={dark} depth={0} />
    </Shell>
  );
}

// links: [{ source, target, value }]
export function SankeyChart({ links, dark }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify((links || []).slice(0, 60));
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/d3@7", () => !!window.d3);
        await loadScript("https://cdn.jsdelivr.net/npm/d3-sankey@0.12.3/dist/d3-sankey.min.js", () => !!(window.d3 && window.d3.sankey));
        if (!alive || !ref.current) return;
        const d3 = window.d3;
        const W = 620, H = 300;
        const names = [...new Set(links.flatMap(l => [l.source, l.target]))].slice(0, 20);
        const idx = Object.fromEntries(names.map((n, i) => [n, i]));
        const graph = {
          nodes: names.map(n => ({ name: n })),
          links: links.filter(l => idx[l.source] !== undefined && idx[l.target] !== undefined).slice(0, 60)
            .map(l => ({ source: idx[l.source], target: idx[l.target], value: Math.max(l.value || 1, 0.5) })),
        };
        if (graph.links.length === 0) { setFailed(true); return; }
        const sankey = d3.sankey().nodeWidth(14).nodePadding(10).extent([[8, 8], [W - 8, H - 8]]);
        sankey(graph);
        const svg = d3.select(ref.current);
        svg.selectAll("*").remove();
        svg.attr("viewBox", `0 0 ${W} ${H}`).attr("class", "w-full");
        const color = d3.scaleOrdinal(PALETTE);
        svg.append("g").selectAll("path").data(graph.links).join("path")
          .attr("d", d3.sankeyLinkHorizontal())
          .attr("fill", "none")
          .attr("stroke", d => color(d.source.name))
          .attr("stroke-opacity", 0.45)
          .attr("stroke-width", d => Math.max(1, d.width))
          .append("title").text(d => `${d.source.name} → ${d.target.name}: ${d.value}`);
        svg.append("g").selectAll("g").data(graph.nodes).join("g")
          .call(g => {
            g.append("rect")
              .attr("x", d => d.x0).attr("y", d => d.y0)
              .attr("width", d => d.x1 - d.x0).attr("height", d => Math.max(1, d.y1 - d.y0))
              .attr("fill", d => color(d.name)).attr("rx", 2);
            g.append("text")
              .attr("x", d => d.x0 < W / 2 ? d.x1 + 5 : d.x0 - 5)
              .attr("y", d => (d.y0 + d.y1) / 2 + 4)
              .attr("text-anchor", d => (d.x0 < W / 2 ? "start" : "end"))
              .attr("font-size", 11).attr("fill", dark ? "#9ca3af" : "#6b7280")
              .text(d => String(d.name).slice(0, 22));
          });
      } catch { if (alive) setFailed(true); }
    })();
    return () => { alive = false; };
  }, [key]);
  return (
    <Shell dark={dark} title="Sankey diagram">
      {failed
        ? <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Couldn't render (needs links like "A -&gt; B: 5").</p>
        : <svg ref={ref} className="w-full" style={{ minHeight: 200 }} />}
    </Shell>
  );
}

// links: [{ source, target }]
export function NetworkGraph({ links, dark }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify((links || []).slice(0, 120));
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/d3@7", () => !!window.d3);
        if (!alive || !ref.current) return;
        const d3 = window.d3;
        const W = 620, H = 320;
        const names = [...new Set(links.flatMap(l => [l.source, l.target]))].slice(0, 40);
        const nodes = names.map(n => ({ id: n }));
        const edges = links.filter(l => names.includes(l.source) && names.includes(l.target)).slice(0, 120);
        if (nodes.length < 2 || edges.length === 0) { setFailed(true); return; }
        const sim = d3.forceSimulation(nodes)
          .force("link", d3.forceLink(edges).id(d => d.id).distance(90))
          .force("charge", d3.forceManyBody().strength(-220))
          .force("center", d3.forceCenter(W / 2, H / 2))
          .stop();
        for (let i = 0; i < 220; i++) sim.tick();
        const svg = d3.select(ref.current);
        svg.selectAll("*").remove();
        svg.attr("viewBox", `0 0 ${W} ${H}`).attr("class", "w-full");
        const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
        const endX = (e, which) => byId[e[which].id ?? e[which]]?.x ?? 0;
        const endY = (e, which) => byId[e[which].id ?? e[which]]?.y ?? 0;
        svg.append("g").selectAll("line").data(edges).join("line")
          .attr("x1", d => endX(d, "source")).attr("y1", d => endY(d, "source"))
          .attr("x2", d => endX(d, "target")).attr("y2", d => endY(d, "target"))
          .attr("stroke", dark ? "#4b5563" : "#d1d5db").attr("stroke-width", 1.2);
        svg.append("g").selectAll("g").data(nodes).join("g")
          .call(g => {
            g.append("circle").attr("cx", d => d.x).attr("cy", d => d.y).attr("r", 7)
              .attr("fill", (_, i) => PALETTE[i % PALETTE.length]);
            g.append("text").attr("x", d => d.x + 10).attr("y", d => d.y + 4)
              .attr("font-size", 11).attr("fill", dark ? "#9ca3af" : "#6b7280")
              .text(d => String(d.id).slice(0, 20));
          });
      } catch { if (alive) setFailed(true); }
    })();
    return () => { alive = false; };
  }, [key]);
  return (
    <Shell dark={dark} title="Network graph">
      {failed
        ? <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Couldn't render (needs links like "A -&gt; B").</p>
        : <svg ref={ref} className="w-full" style={{ minHeight: 240 }} />}
    </Shell>
  );
}

// table with age-group labels + 2 numeric cols
export function AgePyramid({ table, dark }) {
  const cols = table.numericCols.slice(0, 2);
  const labelIdx = table.headers.findIndex((_, i) => !table.numericCols.includes(i));
  const rows = table.rows.slice(0, 14);
  const clean = (v) => Math.abs(Number(String(v).replace(/[^0-9.\-]/g, "")) || 0);
  const max = Math.max(...rows.flatMap(r => cols.map(c => clean(r[c]))), 1);
  return (
    <Shell dark={dark} title="Population pyramid">
      <div className="space-y-1">
        <div className="flex text-xs font-semibold">
          <span className={`flex-1 text-right pr-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>{table.headers[cols[0]]}</span>
          <span className="w-20" />
          <span className={`flex-1 pl-2 ${dark ? "text-gray-400" : "text-gray-500"}`}>{table.headers[cols[1]]}</span>
        </div>
        {rows.map((r, i) => {
          const a = clean(r[cols[0]]);
          const b = clean(r[cols[1]]);
          return (
            <div key={i} className="flex items-center text-xs">
              <div className="flex-1 flex justify-end pr-2">
                <div className="h-4 rounded-l" style={{ width: `${(a / max) * 100}%`, background: "#3b82f6" }} />
              </div>
              <span className={`w-20 text-center truncate ${dark ? "text-gray-400" : "text-gray-500"}`}>{labelIdx >= 0 ? r[labelIdx] : `#${i + 1}`}</span>
              <div className="flex-1 pl-2">
                <div className="h-4 rounded-r" style={{ width: `${(b / max) * 100}%`, background: "#f97316" }} />
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

// table with 4+ numeric cols treated as O,H,L,C
export function CandlestickChart({ table, dark }) {
  const cols = table.numericCols.slice(0, 4);
  const rows = table.rows.slice(0, 30);
  const W = 620, H = 260, padL = 44, padB = 30, padT = 10;
  const clean = (v) => Number(String(v).replace(/[^0-9.\-]/g, "")) || 0;
  const all = rows.flatMap(r => cols.map(c => clean(r[c])));
  const min = Math.min(...all), max = Math.max(...all);
  const y = (v) => padT + (1 - (v - min) / (max - min || 1)) * (H - padT - padB);
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <Shell dark={dark} title="Candlestick (O/H/L/C)">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {rows.map((r, i) => {
          const o = clean(r[cols[0]]);
          const h = clean(r[cols[1]]);
          const l = clean(r[cols[2]]);
          const c = clean(r[cols[3]]);
          const x = padL + 10 + i * ((W - padL - 20) / rows.length);
          const bw = Math.max(3, Math.min(18, ((W - padL - 20) / rows.length) - 4));
          const up = c >= o;
          const col = up ? "#16a34a" : "#ef4444";
          return (
            <g key={i}>
              <line x1={x + bw / 2} y1={y(h)} x2={x + bw / 2} y2={y(l)} stroke={col} strokeWidth={1.5} />
              <rect x={x} y={y(Math.max(o, c))} width={bw} height={Math.max(2, Math.abs(y(o) - y(c)))} fill={col} />
            </g>
          );
        })}
        <text x={4} y={padT + 8} fontSize={10} fill={text}>{max.toFixed(1)}</text>
        <text x={4} y={H - padB} fontSize={10} fill={text}>{min.toFixed(1)}</text>
      </svg>
    </Shell>
  );
}
