import { useState } from "react";
import { parseCSVText, stripMd } from "../utils/parseHelpers";
import { GroupedBar, StackedBar, ScatterPlot, BubbleChart, Heatmap, MultiLine, StreamGraph, SlopeChart, BumpChart, CorrelationMatrix, ParallelCoords, CalendarHeat, TreemapView } from "./visualizations/StatsCharts";
import { GanttChart, JsonTree, SankeyChart, NetworkGraph, AgePyramid, CandlestickChart } from "./visualizations/Advanced";
import WorldMap from "./visualizations/GeoChart";

const SAMPLES = {
  sales: "Product,Q1,Q2,Q3\nWidgets,120,150,180\nGadgets,80,95,140\nDoohickeys,45,60,52\nThingamajigs,200,210,198",
  countries: "Country,Users\nKenya,1200\nUganda,800\nTanzania,650\nRwanda,300\nNigeria,1500\nGhana,700",
  links: "Home -> Search: 120\nSearch -> Results: 100\nResults -> Checkout: 35\nHome -> Checkout: 12\nCheckout -> Done: 30",
  tasks: "Task,Start,End\nDesign,2026-01-05,2026-01-20\nBuild,2026-01-21,2026-02-15\nTest,2026-02-16,2026-02-28\nLaunch,2026-03-01,2026-03-05",
  json: '{"store":{"name":"JaHome","cities":["Nairobi","Mombasa"],"stats":{"skus":1240,"staff":4}}}',
};

function parseEdges(text) {
  const links = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(.+?)\s*->\s*(.+?)(?::\s*([\d.]+))?\s*$/);
    if (m && !m[1].includes(",") && !m[2].includes(",")) {
      links.push({ source: m[1].trim().slice(0, 24), target: m[2].trim().slice(0, 24), value: m[3] ? parseFloat(m[3]) : 1 });
    }
  }
  return links;
}

function sniffTable(table) {
  const H = table.headers.map(h => String(h).toLowerCase());
  const has = (...words) => H.findIndex(h => words.some(w => h.includes(w)));
  return {
    multi: table.numericCols.length >= 2,
    dateCol: (() => {
      const li = table.headers.findIndex((_, i) => !table.numericCols.includes(i));
      if (li < 0) return -1;
      return table.rows.every(r => !isNaN(Date.parse(String(r[li]).trim()))) ? li : -1;
    })(),
    task: has("task", "activity", "phase", "name") >= 0 ? {
      name: has("task", "activity", "phase", "name"),
      start: has("start", "begin", "from"),
      end: has("end", "finish", "deadline", "to"),
    } : null,
    age: (H.some(h => /age|group|bracket/.test(h)) || (H.some(h => /male|^m$/.test(h)) && H.some(h => /female|^f$/.test(h)))) && table.numericCols.length >= 2,
    candle: table.numericCols.length >= 4,
  };
}

function SimpleTable({ table, dark }) {
  return (
    <div className={`mt-4 p-4 rounded-xl overflow-x-auto ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <table className={`min-w-full text-sm border-collapse ${dark ? "text-gray-300" : "text-gray-700"}`}>
        <thead><tr>{table.headers.map((h, i) => (
          <th key={i} className={`px-3 py-2 text-left font-semibold border-b ${dark ? "border-gray-700" : "border-gray-200"}`}>{stripMd(h)}</th>
        ))}</tr></thead>
        <tbody>{table.rows.slice(0, 50).map((r, i) => (
          <tr key={i}>{r.map((c, j) => (
            <td key={j} className={`px-3 py-2 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>{stripMd(c)}</td>
          ))}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export default function DataPanel({ dark, onClose, initialText }) {
  const [raw, setRaw] = useState(initialText || "");
  const [view, setView] = useState("table");
  const [fileName, setFileName] = useState("");

  let parsed = null, kind = null, error = "";
  const text = raw.trim();
  if (text) {
    try {
      const obj = JSON.parse(text);
      parsed = { data: obj };
      kind = "json";
    } catch { /* not json */ }
  }
  if (!kind && text) {
    const links = parseEdges(text);
    if (links.length >= 2) { parsed = { links }; kind = "links"; }
  }
  if (!kind && text) {
    const t = parseCSVText(text);
    if (t && t.rows.length > 0) { parsed = { table: t }; kind = "csv"; }
    else if (text.length > 0) error = "Couldn't parse this â€” try JSON, CSV, or lines like A -> B: 5.";
  }

  const sn = kind === "csv" ? sniffTable(parsed.table) : null;
  const dateEntries = (kind === "csv" && sn.dateCol >= 0)
    ? parsed.table.rows.map(r => ({ date: String(r[sn.dateCol]).trim(), value: parseFloat(String(r[parsed.table.numericCols[0]]).replace(/[^0-9.\-]/g, "")) || 0 }))
    : [];
  const ganttTasks = (kind === "csv" && sn.task && sn.task.start >= 0 && sn.task.end >= 0)
    ? parsed.table.rows.map(r => ({ name: String(r[sn.task.name]), start: String(r[sn.task.start]).trim().slice(0, 10), end: String(r[sn.task.end]).trim().slice(0, 10) }))
    : [];
  const mapRows = kind === "csv"
    ? parsed.table.rows.map(r => {
        const li = parsed.table.headers.findIndex((_, i) => !parsed.table.numericCols.includes(i));
        return { name: li >= 0 ? String(r[li]) : "", value: parseFloat(String(r[parsed.table.numericCols[0]]).replace(/[^0-9.\-]/g, "")) || 0 };
      })
    : [];

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => { setRaw(String(reader.result || "").slice(0, 200000)); setView("table"); };
    reader.readAsText(f);
  };

  const chip = (active) => `text-xs px-3 py-1.5 rounded-full border transition ${
    active ? "bg-orange-500 text-white border-orange-500"
      : dark ? "border-gray-700 text-gray-400 hover:border-orange-500" : "border-gray-200 text-gray-500 hover:border-orange-400"
  }`;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className={`font-semibold ${dark ? "text-gray-100" : "text-gray-800"}`}>Data lab â€” paste data, pick a visual</h3>
        <button onClick={onClose} className={`text-xs px-2 py-1 rounded-lg ${dark ? "text-gray-500 hover:text-gray-200" : "text-gray-400 hover:text-gray-700"}`}>âœ• Close</button>
      </div>
      <p className={`text-xs mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Paste CSV, JSON, or link lines (A -&gt; B: 5) â€” or load a file. Try a sample:</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.keys(SAMPLES).map(k => (
          <button key={k} onClick={() => { setRaw(SAMPLES[k]); setFileName(""); setView("table"); }} className={chip(false)}>{k}</button>
        ))}
        <label className={`${chip(false)} cursor-pointer`}>
          Load fileâ€¦
          <input type="file" accept=".csv,.json,.txt" className="hidden" onChange={onFile} />
        </label>
        {fileName && <span className={`text-xs self-center ${dark ? "text-gray-500" : "text-gray-400"}`}>{fileName}</span>}
      </div>
      <textarea
        className={`w-full rounded-xl border px-4 py-3 text-xs font-mono h-32 resize-y focus:outline-none focus:ring-2 focus:ring-orange-400 ${dark ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-gray-50 border-gray-200 text-gray-800"}`}
        placeholder={'Product,Sales\nWidgets,120\nGadgets,80'}
        value={raw} onChange={e => { setRaw(e.target.value.slice(0, 200000)); setView("table"); }}
      />
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

      {kind === "json" && <JsonTreeWrap data={parsed.data} dark={dark} />}
      {kind === "links" && (
        <>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setView("sankey")} className={chip(view === "sankey" || view === "table")}>Sankey</button>
            <button onClick={() => setView("network")} className={chip(view === "network")}>Network</button>
          </div>
          {(view === "table" || view === "sankey") && <SankeyView links={parsed.links} dark={dark} />}
          {view === "network" && <NetworkView links={parsed.links} dark={dark} />}
        </>
      )}
      {kind === "csv" && <CsvViews table={parsed.table} sn={sn} dateEntries={dateEntries} ganttTasks={ganttTasks} mapRows={mapRows} dark={dark} view={view} setView={setView} chip={chip} />}
    </div>
  );
}

function JsonTreeWrap({ data, dark }) {
  return <JsonTree data={data} dark={dark} />;
}

function SankeyView({ links, dark }) {
  return <SankeyChart links={links} dark={dark} />;
}

function NetworkView({ links, dark }) {
  return <NetworkGraph links={links} dark={dark} />;
}

function CsvViews({ table, sn, dateEntries, ganttTasks, mapRows, dark, view, setView, chip }) {
  const views = ["table", "grouped", "stacked", "treemap"];
  if (table.numericCols.length >= 2) views.push("multi", "stream", "slope", "bump", "scatter", "bubble", "heatmap", "correlation", "parallel");
  if (dateEntries.length >= 5) views.push("calendar");
  if (ganttTasks.length >= 2) views.push("gantt");
  if (table.numericCols.length >= 4) views.push("candle");
  const H = table.headers.map(h => String(h).toLowerCase());
  if ((H.some(h => /age|group|bracket/.test(h)) || (H.some(h => /male|^m$/.test(h)) && H.some(h => /female|^f$/.test(h)))) && table.numericCols.length >= 2) views.push("age");
  views.push("map");
  const labels = { table: "Table", grouped: "Grouped", stacked: "Stacked", treemap: "Treemap", multi: "Multi-line", stream: "Stream", slope: "Slope", bump: "Bump", scatter: "Scatter", bubble: "Bubble", heatmap: "Heatmap", correlation: "Correlation", parallel: "Parallel", calendar: "Calendar", gantt: "Gantt", candle: "Candles", age: "Pyramid", map: "Map" };
  const numericData = (() => {
    const li = table.headers.findIndex((_, i) => !table.numericCols.includes(i));
    const col = table.numericCols[0];
    return table.rows.slice(0, 15).map((r, i) => ({ name: li >= 0 ? String(r[li]).slice(0, 24) : `#${i + 1}`, value: parseFloat(String(r[col]).replace(/[^0-9.\-]/g, "")) || 0 }));
  })();
  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3">
        {views.map(v => (
          <button key={v} onClick={() => setView(v)} className={chip(view === v)}>{labels[v] || v}</button>
        ))}
      </div>
      {view === "table" && <SimpleTable table={table} dark={dark} />}
      {view === "grouped" && <GroupedBar table={table} dark={dark} />}
      {view === "stacked" && <StackedBar table={table} dark={dark} />}
      {view === "treemap" && <TreemapView data={numericData} dark={dark} />}
      {view === "multi" && <MultiLine table={table} dark={dark} />}
      {view === "stream" && <StreamGraph table={table} dark={dark} />}
      {view === "slope" && <SlopeChart table={table} dark={dark} />}
      {view === "bump" && <BumpChart table={table} dark={dark} />}
      {view === "scatter" && <ScatterPlot table={table} dark={dark} />}
      {view === "bubble" && <BubbleChart table={table} dark={dark} />}
      {view === "heatmap" && <Heatmap table={table} dark={dark} />}
      {view === "correlation" && <CorrelationMatrix table={table} dark={dark} />}
      {view === "parallel" && <ParallelCoords table={table} dark={dark} />}
      {view === "calendar" && <CalendarHeat data={{ entries: dateEntries }} dark={dark} />}
      {view === "gantt" && <GanttChart tasks={ganttTasks} dark={dark} />}
      {view === "candle" && <CandlestickChart table={table} dark={dark} />}
      {view === "age" && <AgePyramid table={table} dark={dark} />}
      {view === "map" && <WorldMap data={mapRows} dark={dark} />}
    </>
  );
}

