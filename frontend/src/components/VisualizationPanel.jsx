import { useState, useMemo, lazy, Suspense, Component } from "react";
import { detectFormats } from "../utils/detectFormat";
import { stripMd } from "../utils/parseHelpers";
import { HorizontalBar, AreaView, StepView, Lollipop, DotPlot, Sparkline, DonutChart, UnitChart, ParliamentChart, StemLeaf, ForecastChart } from "./visualizations/MoreCharts";
import { GroupedBar, StackedBar, ScatterPlot, BubbleChart, Heatmap, MultiLine, StreamGraph, SlopeChart, BumpChart, CorrelationMatrix, ParallelCoords, CalendarHeat, TreemapView } from "./visualizations/StatsCharts";
import { Checklist, ProsCons, FaqAccordion, TabsView, VennChart } from "./visualizations/TextFormats";
import { TreeView, IcicleView } from "./visualizations/TreeViews";
import { QRBlock, KatexBlock, VideoEmbed, AudioClip, ImageGrid } from "./visualizations/MediaBlocks";
import { GanttChart, JsonTree } from "./visualizations/Advanced";
import WorldMap from "./visualizations/GeoChart";

const BarChart    = lazy(() => import("./visualizations/BarChart"));
const LineChart   = lazy(() => import("./visualizations/LineChart"));
const PieChart    = lazy(() => import("./visualizations/PieChart"));
const Timeline    = lazy(() => import("./visualizations/Timeline"));
const Comparison  = lazy(() => import("./visualizations/ComparisonTable"));
const StepsFlow   = lazy(() => import("./visualizations/StepsFlow"));
const KVGrid      = lazy(() => import("./visualizations/KeyValueGrid"));
const WordCloud   = lazy(() => import("./visualizations/WordCloud"));
const RadarChart  = lazy(() => import("./visualizations/RadarChart"));
const ProgressBars = lazy(() => import("./visualizations/ProgressBars"));
const MermaidBlock = lazy(() => import("./visualizations/MermaidBlock"));

function DataTable({ data, dark }) {
  const [sortCol, setSortCol] = useState(-1);
  const [asc, setAsc] = useState(true);
  if (!data || !data.headers || !data.rows || data.rows.length === 0) return null;
  const rows = [...data.rows];
  if (sortCol >= 0) {
    rows.sort((a, b) => {
      const x = a[sortCol] ?? "", y = b[sortCol] ?? "";
      const nx = parseFloat(String(x).replace(/[^0-9.\-]/g, ""));
      const ny = parseFloat(String(y).replace(/[^0-9.\-]/g, ""));
      const cmp = (!isNaN(nx) && !isNaN(ny)) ? nx - ny : String(x).localeCompare(String(y));
      return asc ? cmp : -cmp;
    });
  }
  const click = (i) => {
    if (sortCol === i) setAsc(a => !a);
    else { setSortCol(i); setAsc(true); }
  };
  return (
    <div className={`mt-4 p-4 rounded-xl overflow-x-auto ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Data table (click headers to sort)</p>
      <table className={`min-w-full text-sm border-collapse ${dark ? "text-gray-300" : "text-gray-700"}`}>
        <thead>
          <tr>
            {data.headers.map((h, i) => (
              <th key={i} onClick={() => click(i)}
                className={`px-3 py-2 text-left font-semibold border-b cursor-pointer select-none ${dark ? "border-gray-700 text-gray-200 hover:text-orange-300" : "border-gray-200 text-gray-800 hover:text-orange-600"}`}>
                {stripMd(h)}{sortCol === i ? (asc ? " ▲" : " ▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 border-b ${dark ? "border-gray-800" : "border-gray-100"}`}>{stripMd(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

class VizErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const FORMAT_LABELS = {
  bar: "Bar chart",
  line: "Line chart",
  pie: "Pie chart",
  radar: "Radar",
  table: "Data table",
  timeline: "Timeline",
  comparison: "Comparison",
  steps: "Steps",
  keyvalue: "Key facts",
  wordcloud: "Word cloud",
  progress: "Progress bars",
  checklist: "Checklist",
  proscons: "Pros & cons",
  faq: "FAQ",
  mermaid: "Diagram",
  tree: "Tree",
  icicle: "Icicle",
  tabs: "Tabs",
  qr: "QR codes",
  katex: "Math",
  video: "Videos",
  audio: "Audio",
  images: "Images",
  json: "JSON",
  map: "Map",
  venn: "Venn",
};

const CHART_TYPES = ["bar", "line", "pie", "radar", "progress", "horizontal", "area", "step", "lollipop", "dot", "sparkline", "waterfall", "histogram", "box", "waffle", "donut", "unit", "parliament", "stem", "forecast", "treemap"];
const TABLE_VIEWS = ["data", "grouped", "stacked", "scatter", "bubble", "heatmap", "multi", "stream", "slope", "bump", "correlation", "parallel", "calendar"];

function renderChart(type, d, dark) {
  switch (type) {
    case "bar":      return <BarChart data={d} dark={dark} />;
    case "line":     return <LineChart data={d} dark={dark} />;
    case "pie":      return <PieChart data={d} dark={dark} />;
    case "radar":    return <RadarChart data={d.map(i => ({ name: i.name, value: i.value }))} dark={dark} />;
    case "progress": return <ProgressBars data={d} dark={dark} />;
    case "horizontal": return <HorizontalBar data={d} dark={dark} />;
    case "area":     return <AreaView data={d} dark={dark} />;
    case "step":     return <StepView data={d} dark={dark} />;
    case "lollipop": return <Lollipop data={d} dark={dark} />;
    case "dot":      return <DotPlot data={d} dark={dark} />;
    case "sparkline": return <Sparkline data={d} dark={dark} />;
    case "waterfall": return <Waterfall data={d} dark={dark} />;
    case "histogram": return <Histogram data={d} dark={dark} />;
    case "box":      return <BoxPlot data={d} dark={dark} />;
    case "waffle":   return <WaffleChart data={d} dark={dark} />;
    case "donut":    return <DonutChart data={d} dark={dark} />;
    case "unit":     return <UnitChart data={d} dark={dark} />;
    case "parliament": return <ParliamentChart data={d} dark={dark} />;
    case "stem":     return <StemLeaf data={d} dark={dark} />;
    case "forecast": return <ForecastChart data={d} dark={dark} />;
    case "treemap":  return <TreemapView data={d} dark={dark} />;
    default:         return null;
  }
}

function calendarEntries(table) {
  const labelIdx = table.headers.findIndex((_, i) => !table.numericCols.includes(i));
  const valCol = table.numericCols[0];
  if (labelIdx < 0 || valCol === undefined) return [];
  return table.rows
    .map(r => ({ date: String(r[labelIdx]).trim(), value: parseFloat(String(r[valCol]).replace(/[^0-9.\-]/g, "")) || 0 }))
    .filter(e => !isNaN(Date.parse(e.date)));
}

function renderTableView(view, table, dark) {
  switch (view) {
    case "grouped":  return <GroupedBar table={table} dark={dark} />;
    case "stacked":  return <StackedBar table={table} dark={dark} />;
    case "scatter":  return <ScatterPlot table={table} dark={dark} />;
    case "bubble":   return <BubbleChart table={table} dark={dark} />;
    case "heatmap":  return <Heatmap table={table} dark={dark} />;
    case "multi":    return <MultiLine table={table} dark={dark} />;
    case "stream":   return <StreamGraph table={table} dark={dark} />;
    case "slope":    return <SlopeChart table={table} dark={dark} />;
    case "bump":     return <BumpChart table={table} dark={dark} />;
    case "correlation": return <CorrelationMatrix table={table} dark={dark} />;
    case "parallel": return <ParallelCoords table={table} dark={dark} />;
    case "calendar": return <CalendarHeat data={{ entries: calendarEntries(table) }} dark={dark} />;
    default:         return <DataTable data={table} dark={dark} />;
  }
}

export default function VisualizationPanel({ answer, dark, paused, onAsk }) {
  const formats = useMemo(() => detectFormats(answer || ""), [answer]);
  const [activeType, setActiveType] = useState(null);
  const [chartType, setChartType] = useState("bar");
  const [tableView, setTableView] = useState("data");

  if (formats.length === 0) return null;

  // Merge numeric data formats into one switchable chart section
  const numericFormat = formats.find(f => f.type === "bar");
  const tableFormat = formats.find(f => f.type === "table");
  const multiSeries = (tableFormat?.data?.numericCols?.length || 0) >= 2
    && (tableFormat?.data?.rows?.length || 0) >= 2;
  const calEntries = tableFormat ? calendarEntries(tableFormat.data) : [];
  const tableViews = ["data", ...(multiSeries ? TABLE_VIEWS.filter(t => t !== "data" && t !== "calendar") : []), ...(calEntries.length >= 5 ? ["calendar"] : [])];
  const allTypes = [
    ...(numericFormat ? [{ type: "chart", data: numericFormat.data }] : []),
    ...formats.filter(f => f.type !== "bar"),
  ];

  const divider = dark ? "border-gray-800" : "border-gray-100";
  const chip = (active) => `text-xs px-3 py-1.5 rounded-full border transition ${
    active
      ? "bg-orange-500 text-white border-orange-500"
      : dark ? "border-gray-700 text-gray-400 hover:border-orange-500 hover:text-orange-300" : "border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-600"
  }`;
  const subChip = (active) => `text-xs px-2.5 py-1 rounded-lg border transition ${
    active
      ? "bg-orange-500 text-white border-orange-500"
      : dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"
  }`;

  return (
    <div className={`mt-5 pt-4 border-t ${divider}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Visualize</p>

      {/* Format picker */}
      <div className="flex flex-wrap gap-2 mb-3">
        {allTypes.map((f, i) => {
          const label = f.type === "chart" ? "Chart" : FORMAT_LABELS[f.type] || f.type;
          const isActive = activeType === f.type;
          return (
            <button key={`${f.type}-${i}`} onClick={() => setActiveType(isActive ? null : f.type)} className={chip(isActive)}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Chart sub-type picker */}
      {activeType === "chart" && (
        <div className="flex flex-wrap gap-2 mb-2">
          {CHART_TYPES.map(t => (
            <button key={t} onClick={() => setChartType(t)} className={subChip(chartType === t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Table view picker */}
      {activeType === "table" && tableViews.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tableViews.map(t => (
            <button key={t} onClick={() => setTableView(t)} className={subChip(tableView === t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Ask about the active visualization */}
      {activeType && onAsk && (() => {
        const label = activeType === "chart" ? `Chart (${chartType})` : activeType === "table" ? `Table (${tableViews.includes(tableView) ? tableView : "data"})` : (FORMAT_LABELS[activeType] || activeType);
        return (
          <button
            onClick={() => {
              const fmt = allTypes.find(f => f.type === activeType);
              let summary = "";
              try { summary = JSON.stringify(fmt && fmt.data !== undefined ? fmt.data : answer).slice(0, 800); }
              catch { summary = String(answer || "").slice(0, 800); }
              onAsk(label, summary);
            }}
            className={`text-xs mb-3 px-3 py-1.5 rounded-full border transition ${dark ? "border-gray-700 text-gray-400 hover:border-orange-500 hover:text-orange-300" : "border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-600"}`}>
            💬 Ask about this {label.toLowerCase()}
          </button>
        );
      })()}

      {/* Render */}
      <VizErrorBoundary>
      <Suspense fallback={<div className={`h-32 rounded-xl animate-pulse ${dark ? "bg-gray-800" : "bg-gray-100"}`} />}>
        {activeType === "chart" && (() => {
          const d = allTypes.find(f => f.type === "chart")?.data || [];
          return renderChart(chartType, d, dark);
        })()}
        {activeType === "table" && (() => {
          const t = allTypes.find(f => f.type === "table")?.data;
          if (!t) return null;
          return renderTableView(tableViews.includes(tableView) ? tableView : "data", t, dark);
        })()}
        {activeType === "timeline"   && <Timeline data={allTypes.find(f=>f.type==="timeline")?.data||[]} dark={dark} />}
        {activeType === "comparison" && <Comparison data={allTypes.find(f=>f.type==="comparison")?.data||{}} dark={dark} />}
        {activeType === "steps"      && <StepsFlow data={allTypes.find(f=>f.type==="steps")?.data||[]} dark={dark} />}
        {activeType === "keyvalue"   && <KVGrid data={allTypes.find(f=>f.type==="keyvalue")?.data||[]} dark={dark} />}
        {activeType === "checklist"  && <Checklist data={allTypes.find(f=>f.type==="checklist")?.data||[]} dark={dark} />}
        {activeType === "proscons"   && <ProsCons data={allTypes.find(f=>f.type==="proscons")?.data||{pros:[],cons:[]}} dark={dark} />}
        {activeType === "venn"       && <VennChart data={allTypes.find(f=>f.type==="venn")?.data||{a:[],b:[],shared:[]}} dark={dark} />}
        {activeType === "faq"        && <FaqAccordion data={allTypes.find(f=>f.type==="faq")?.data||[]} dark={dark} />}
        {activeType === "mermaid"    && (allTypes.find(f=>f.type==="mermaid")?.data||[]).map((b, i) => <MermaidBlock key={i} code={b.code} dark={dark} paused={paused} />)}
        {activeType === "tree"      && <TreeView data={allTypes.find(f=>f.type==="tree")?.data||[]} dark={dark} />}
        {activeType === "icicle"    && <IcicleView data={allTypes.find(f=>f.type==="icicle")?.data||[]} dark={dark} />}
        {activeType === "tabs"      && <TabsView data={allTypes.find(f=>f.type==="tabs")?.data||[]} dark={dark} />}
        {activeType === "qr"        && <QRBlock items={allTypes.find(f=>f.type==="qr")?.data||[]} dark={dark} />}
        {activeType === "katex"     && <KatexBlock blocks={allTypes.find(f=>f.type==="katex")?.data||[]} dark={dark} />}
        {activeType === "video"     && <VideoEmbed items={allTypes.find(f=>f.type==="video")?.data||[]} dark={dark} />}
        {activeType === "audio"     && <AudioClip items={allTypes.find(f=>f.type==="audio")?.data||[]} dark={dark} />}
        {activeType === "images"    && <ImageGrid items={allTypes.find(f=>f.type==="images")?.data||[]} dark={dark} />}
        {activeType === "json"      && (allTypes.find(f=>f.type==="json")?.data||[]).map((d, i) => <JsonTree key={i} data={d} dark={dark} />)}
        {activeType === "map"       && <WorldMap data={allTypes.find(f=>f.type==="map")?.data||[]} dark={dark} />}
        {activeType === "wordcloud"  && <WordCloud data={allTypes.find(f=>f.type==="wordcloud")?.data||[]} dark={dark} />}
      </Suspense>
      </VizErrorBoundary>
    </div>
  );
}
