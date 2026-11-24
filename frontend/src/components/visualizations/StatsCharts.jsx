import {
  BarChart as ReBar, Bar, ScatterChart as ReScatter, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart as ReLine, Line, AreaChart as ReArea, Area, Treemap
} from "recharts";

const SERIES = ["#f97316", "#3b82f6", "#16a34a", "#a855f7", "#ef4444", "#eab308", "#06b6d4c", "#ec4899"];

function Shell({ dark, title, children, height = 260 }) {
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function num(v) {
  if (v === null || v === undefined) return NaN;
  const n = parseFloat(String(v).replace(/[$,%\s]/g, "").replace(/,/g, ""));
  return n;
}

// data: { headers, rows, numericCols } — from a markdown table
function toSeries(table) {
  const { headers, rows, numericCols } = table;
  const labelIdx = headers.findIndex((_, i) => !numericCols.includes(i));
  return rows.slice(0, 12).map((r, i) => {
    const o = { name: labelIdx >= 0 ? String(r[labelIdx]).slice(0, 18) : `Row ${i + 1}` };
    numericCols.slice(0, 6).forEach(col => { o[`s${col}`] = num(r[col]) || 0; });
    return o;
  });
}

function numericColCount(table) {
  return (table.numericCols || []).length;
}

export function GroupedBar({ table, dark }) {
  const data = toSeries(table);
  const cols = table.numericCols.slice(0, 6);
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <Shell dark={dark} title="Chart">
      <ReBar data={data} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1f2937" : "#f3f4f6"} />
        <XAxis dataKey="name" tick={{ fill: text, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fill: text, fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        {cols.map((c, i) => <Bar key={c} dataKey={`s${c}`} name={table.headers[c]} fill={SERIES[i % SERIES.length]} radius={[3, 3, 0, 0]} />)}
      </ReBar>
    </Shell>
  );
}

export function StackedBar({ table, dark }) {
  const data = toSeries(table);
  const cols = table.numericCols.slice(0, 6);
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <Shell dark={dark} title="Chart">
      <ReBar data={data} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1f2937" : "#f3f4f6"} />
        <XAxis dataKey="name" tick={{ fill: text, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fill: text, fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        {cols.map((c, i) => <Bar key={c} dataKey={`s${c}`} name={table.headers[c]} stackId="a" fill={SERIES[i % SERIES.length]} />)}
      </ReBar>
    </Shell>
  );
}

export function ScatterPlot({ table, dark }) {
  const cols = table.numericCols.slice(0, 2);
  const labelIdx = table.headers.findIndex((_, i) => !table.numericCols.includes(i));
  const data = table.rows.slice(0, 40).map((r, i) => ({
    x: num(r[cols[0]]) || 0,
    y: num(r[cols[1]]) ?? 0,
    name: labelIdx >= 0 ? String(r[labelIdx]).slice(0, 24) : `Row ${i + 1}`,
  }));
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <Shell dark={dark} title="Chart">
      <ReScatter margin={{ top: 4, right: 16, bottom: 24, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1f2937" : "#f3f4f6"} />
        <XAxis type="number" dataKey="x" name={table.headers[cols[0]]} tick={{ fill: text, fontSize: 11 }} />
        <YAxis type="number" dataKey="y" name={table.headers[cols[1]]} tick={{ fill: text, fontSize: 11 }} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Scatter data={data} fill="#f97316" />
      </ReScatter>
    </Shell>
  );
}

export function BubbleChart({ table, dark }) {
  const cols = table.numericCols.slice(0, 3);
  const labelIdx = table.headers.findIndex((_, i) => !table.numericCols.includes(i));
  const data = table.rows.slice(0, 30).map((r, i) => ({
    x: num(r[cols[0]]) || 0,
    y: num(r[cols[1] ?? cols[0]]) || 0,
    z: Math.abs(num(r[cols[2] ?? cols[1] ?? cols[0]])) || 1,
    name: labelIdx >= 0 ? String(r[labelIdx]).slice(0, 24) : `Row ${i + 1}`,
  }));
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <Shell dark={dark} title="Chart">
      <ReScatter margin={{ top: 4, right: 16, bottom: 24, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1f2937" : "#f3f4f6"} />
        <XAxis type="number" dataKey="x" tick={{ fill: text, fontSize: 11 }} />
        <YAxis type="number" dataKey="y" tick={{ fill: text, fontSize: 11 }} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Scatter data={data}>
          {data.map((d, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
        </Scatter>
      </ReScatter>
    </Shell>
  );
}

export function Heatmap({ table, dark }) {
  const cols = table.numericCols.slice(0, 8);
  const rows = table.rows.slice(0, 12);
  const labelIdx = table.headers.findIndex((_, i) => !table.numericCols.includes(i));
  let max = 0;
  rows.forEach(r => cols.forEach(c => { const v = Math.abs(num(r[c]) || 0); if (v > max) max = v; }));
  max = max || 1;
  return (
    <div className={`mt-4 p-4 rounded-xl overflow-x-auto ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Heatmap</p>
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-1" />
            {cols.map(c => <th key={c} className={`p-1.5 font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>{table.headers[c]}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className={`p-1.5 pr-3 font-medium whitespace-nowrap ${dark ? "text-gray-400" : "text-gray-500"}`}>
                {labelIdx >= 0 ? String(r[labelIdx]).slice(0, 20) : `#${i + 1}`}
              </td>
              {cols.map(c => {
                const v = Math.abs(num(r[c]) || 0);
                const t = v / max;
                return (
                  <td key={c} title={`${r[labelIdx] ?? ""}: ${r[c]}`}
                    className="p-1.5 text-center rounded"
                    style={{ background: `rgba(249,115,22,${(0.08 + t * 0.85).toFixed(2)})`, color: t > 0.5 ? "#fff" : undefined, minWidth: 56 }}>
                    {r[c]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// data: [{ name, value }]
export function Waterfall({ data, dark }) {
  let cum = 0;
  const rows = data.slice(0, 12).map(d => {
    const start = cum; cum += d.value;
    return { name: String(d.name).slice(0, 16), base: Math.min(start, cum), up: Math.max(0, cum - start), down: Math.max(0, start - cum) };
  });
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <Shell dark={dark} title="Waterfall">
      <ReBar data={rows} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1f2937" : "#f3f4f6"} />
        <XAxis dataKey="name" tick={{ fill: text, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fill: text, fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="up" stackId="a" fill="#16a34a" radius={[3, 3, 0, 0]} />
        <Bar dataKey="down" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
      </ReBar>
    </Shell>
  );
}

// data: [{ name, value }]
export function Histogram({ data, dark }) {
  const vals = data.map(d => d.value).filter(v => !isNaN(v));
  const min = Math.min(...vals), max = Math.max(...vals);
  const bins = 10;
  const counts = new Array(bins).fill(0);
  vals.forEach(v => {
    const i = max === min ? 0 : Math.min(bins - 1, Math.floor(((v - min) / (max - min)) * bins));
    counts[i]++;
  });
  const rows = counts.map((c, i) => ({ name: `${(min + ((max - min) * i) / bins).toFixed(1)}`, value: c }));
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <Shell dark={dark} title="Distribution">
      <ReBar data={rows} margin={{ top: 4, right: 8, bottom: 40, left: 8 }} barCategoryGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1f2937" : "#f3f4f6"} />
        <XAxis dataKey="name" tick={{ fill: text, fontSize: 10 }} angle={-30} textAnchor="end" interval={1} />
        <YAxis tick={{ fill: text, fontSize: 11 }} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="value" fill="#f97316" radius={[3, 3, 0, 0]} />
      </ReBar>
    </Shell>
  );
}

// data: [{ name, value }]
export function BoxPlot({ data, dark }) {
  const vals = data.map(d => d.value).filter(v => !isNaN(v)).sort((a, b) => a - b);
  if (vals.length < 4) return null;
  const q = (p) => vals[Math.floor(p * (vals.length - 1))];
  const min = vals[0], q1 = q(0.25), med = q(0.5), q3 = q(0.75), max = vals[vals.length - 1];
  const W = 600, H = 140, pad = 50;
  const x = (v) => pad + ((v - min) / (max - min || 1)) * (W - pad * 2);
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Box plot</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <line x1={x(min)} y1={70} x2={x(max)} y2={70} stroke={text} strokeWidth={2} />
        <line x1={x(min)} y1={55} x2={x(min)} y2={85} stroke={text} strokeWidth={2} />
        <line x1={x(max)} y1={55} x2={x(max)} y2={85} stroke={text} strokeWidth={2} />
        <rect x={x(q1)} y={45} width={Math.max(2, x(q3) - x(q1))} height={50} fill="#f97316" fillOpacity={0.35} stroke="#f97316" strokeWidth={2} rx={4} />
        <line x1={x(med)} y1={45} x2={x(med)} y2={95} stroke="#f97316" strokeWidth={3} />
        {[["min", min], ["Q1", q1], ["median", med], ["Q3", q3], ["max", max]].map(([l, v]) => (
          <text key={l} x={x(v)} y={120} fontSize={10} fill={text} textAnchor="middle">{l}: {Number(v.toFixed(2))}</text>
        ))}
      </svg>
    </div>
  );
}

// data: [{ name, value }] — waffle of the top item's share
export function WaffleChart({ data, dark }) {
  const vals = data.map(d => d.value).filter(v => !isNaN(v) && v > 0);
  const sum = vals.reduce((a, b) => a + b, 0) || 1;
  const top = data.find(d => d.value === Math.max(...vals));
  const pct = Math.round(((top?.value || 0) / sum) * 100);
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>Waffle</p>
      <p className={`text-sm mb-3 ${dark ? "text-gray-300" : "text-gray-700"}`}>{top?.name}: {pct}% of total</p>
      <div className="grid grid-cols-10 gap-1 max-w-xs">
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} className="w-full aspect-square rounded-sm"
            style={{ background: i < pct ? "#f97316" : dark ? "#1f2937" : "#e5e7eb" }} />
        ))}
      </div>
    </div>
  );
}

export function MultiLine({ table, dark }) {
  const data = toSeries(table);
  const cols = table.numericCols.slice(0, 6);
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <Shell dark={dark} title="Multi-line">
      <ReLine data={data} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1f2937" : "#f3f4f6"} />
        <XAxis dataKey="name" tick={{ fill: text, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fill: text, fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        {cols.map((c, i) => <Line key={c} dataKey={`s${c}`} name={table.headers[c]} stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={false} />)}
      </ReLine>
    </Shell>
  );
}

export function StreamGraph({ table, dark }) {
  const data = toSeries(table);
  const cols = table.numericCols.slice(0, 6);
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <Shell dark={dark} title="Stream">
      <ReArea data={data} stackOffset="silhouette" margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1f2937" : "#f3f4f6"} />
        <XAxis dataKey="name" tick={{ fill: text, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis hide />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        {cols.map((c, i) => <Area key={c} dataKey={`s${c}`} name={table.headers[c]} stackId="1" stroke={SERIES[i % SERIES.length]} fill={SERIES[i % SERIES.length]} fillOpacity={0.55} />)}
      </ReArea>
    </Shell>
  );
}

export function SlopeChart({ table, dark }) {
  const cols = table.numericCols.slice(0, 2);
  const labelIdx = table.headers.findIndex((_, i) => !table.numericCols.includes(i));
  const rows = table.rows.slice(0, 12).map((r, i) => ({
    name: labelIdx >= 0 ? String(r[labelIdx]).slice(0, 18) : `#${i + 1}`,
    a: num(r[cols[0]]) || 0,
    b: num(r[cols[1]]) ?? 0,
  }));
  const all = rows.flatMap(r => [r.a, r.b]);
  const min = Math.min(...all), max = Math.max(...all);
  const W = 600, H = Math.max(160, rows.length * 26 + 40);
  const y = (v) => 20 + (1 - (v - min) / (max - min || 1)) * (H - 60);
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Slope</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <text x={90} y={12} fontSize={11} fill={text} textAnchor="middle">{table.headers[cols[0]]}</text>
        <text x={W - 90} y={12} fontSize={11} fill={text} textAnchor="middle">{table.headers[cols[1]]}</text>
        {rows.map((r, i) => (
          <g key={i}>
            <line x1={90} y1={y(r.a)} x2={W - 90} y2={y(r.b)} stroke={SERIES[i % SERIES.length]} strokeWidth={2} opacity={0.85} />
            <circle cx={90} cy={y(r.a)} r={4} fill={SERIES[i % SERIES.length]} />
            <circle cx={W - 90} cy={y(r.b)} r={4} fill={SERIES[i % SERIES.length]} />
            <text x={95} y={y(r.a) - 6} fontSize={10} fill={text}>{r.name}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function BumpChart({ table, dark }) {
  const cols = table.numericCols.slice(0, 8);
  const labelIdx = table.headers.findIndex((_, i) => !table.numericCols.includes(i));
  const rows = table.rows.slice(0, 8);
  const data = cols.map(c => {
    const ranked = rows.map((r, i) => ({ i, v: num(r[c]) || 0 })).sort((a, b) => b.v - a.v);
    const o = { t: String(table.headers[c]).slice(0, 14) };
    ranked.forEach((r, rank) => { o[`e${r.i}`] = rank + 1; });
    return o;
  });
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <Shell dark={dark} title="Bump chart (rank over columns)">
      <ReLine data={data} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1f2937" : "#f3f4f6"} />
        <XAxis dataKey="t" tick={{ fill: text, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
        <YAxis reversed allowDecimals={false} domain={[1, rows.length]} tick={{ fill: text, fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        {rows.map((r, i) => (
          <Line key={i} dataKey={`e${i}`} name={labelIdx >= 0 ? String(r[labelIdx]).slice(0, 18) : `Row ${i + 1}`}
            stroke={SERIES[i % SERIES.length]} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </ReLine>
    </Shell>
  );
}

export function CorrelationMatrix({ table, dark }) {
  const cols = table.numericCols.slice(0, 8);
  const series = cols.map(c => table.rows.map(r => num(r[c])).filter(v => !isNaN(v)));
  const pearson = (a, b) => {
    const n = Math.min(a.length, b.length);
    if (n < 3) return NaN;
    const ma = a.slice(0, n).reduce((x, y) => x + y, 0) / n;
    const mb = b.slice(0, n).reduce((x, y) => x + y, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (a[i] - ma) * (b[i] - mb); sxx += (a[i] - ma) ** 2; syy += (b[i] - mb) ** 2;
    }
    return (sxx && syy) ? sxy / Math.sqrt(sxx * syy) : NaN;
  };
  const m = cols.map((_, i) => cols.map((_, j) => (i === j ? 1 : pearson(series[i], series[j]))));
  const names = cols.map(c => String(table.headers[c]).slice(0, 14));
  return (
    <div className={`mt-4 p-4 rounded-xl overflow-x-auto ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Correlation matrix (Pearson r)</p>
      <table className="border-collapse text-xs">
        <thead>
          <tr><th className="p-1" />{names.map((h, i) => <th key={i} className={`p-1.5 font-medium ${dark ? "text-gray-400" : "text-gray-500"}`}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {m.map((row, i) => (
            <tr key={i}>
              <td className={`p-1.5 pr-3 font-medium whitespace-nowrap ${dark ? "text-gray-400" : "text-gray-500"}`}>{names[i]}</td>
              {row.map((v, j) => {
                const t = isNaN(v) ? 0 : Math.abs(v);
                const neg = v < 0;
                return (
                  <td key={j} className="p-1.5 text-center rounded"
                    style={{ background: isNaN(v) ? "transparent" : neg ? `rgba(239,68,68,${(0.1 + t * 0.8).toFixed(2)})` : `rgba(22,163,74,${(0.1 + t * 0.8).toFixed(2)})`, color: t > 0.4 ? "#fff" : undefined, minWidth: 56 }}>
                    {isNaN(v) ? "–" : v.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ParallelCoords({ table, dark }) {
  const cols = table.numericCols.slice(0, 6);
  const rows = table.rows.slice(0, 20);
  const labelIdx = table.headers.findIndex((_, i) => !table.numericCols.includes(i));
  const W = 620, H = 240, padL = 90, padR = 20, padT = 24, padB = 30;
  const stats = cols.map(c => {
    const vs = rows.map(r => num(r[c])).filter(v => !isNaN(v));
    return { min: Math.min(...vs), max: Math.max(...vs) };
  });
  const x = (i) => padL + (i / Math.max(1, cols.length - 1)) * (W - padL - padR);
  const y = (ci, v) => {
    const { min, max } = stats[ci];
    return padT + (1 - (v - min) / (max - min || 1)) * (H - padT - padB);
  };
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Parallel coordinates</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {cols.map((c, i) => (
          <g key={c}>
            <line x1={x(i)} y1={padT} x2={x(i)} y2={H - padB} stroke={dark ? "#4b5563" : "#d1d5db"} strokeWidth={1} />
            <text x={x(i)} y={14} fontSize={10} fill={text} textAnchor="middle">{String(table.headers[c]).slice(0, 14)}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const pts = cols.map((c, j) => `${x(j)},${y(j, num(r[c]) || 0)}`).join(" ");
          return <polyline key={i} points={pts} fill="none" stroke={SERIES[i % SERIES.length]} strokeWidth={1.5} opacity={0.7} />;
        })}
      </svg>
    </div>
  );
}

export function CalendarHeat({ data, dark }) {
  const entries = (data.entries || []).map(e => ({ d: new Date(e.date + "T12:00:00"), v: e.value }))
    .filter(e => !isNaN(e.d) && !isNaN(e.v)).sort((a, b) => a.d - b.d).slice(-182);
  const max = Math.max(...entries.map(e => e.v), 1);
  const weeks = [];
  let cur = [];
  entries.forEach(e => {
    const dow = (e.d.getDay() + 6) % 7;
    if (dow === 0 && cur.length) { weeks.push(cur); cur = []; }
    cur.push({ ...e, dow });
  });
  if (cur.length) weeks.push(cur);
  const H = 7 * 14 + 6;
  return (
    <div className={`mt-4 p-4 rounded-xl overflow-x-auto ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Calendar heatmap</p>
      <svg height={H} width={Math.max(120, weeks.length * 14 + 6)}>
        {weeks.map((w, wi) => w.map((e, i) => (
          <rect key={`${wi}-${i}`} x={wi * 14 + 3} y={e.dow * 14 + 3} width={11} height={11} rx={2}
            fill={`rgba(249,115,22,${(0.08 + (e.v / max) * 0.85).toFixed(2)})`}>
            <title>{e.d.toDateString()}: {e.v}</title>
          </rect>
        )))}
      </svg>
    </div>
  );
}

export function TreemapView({ data, dark }) {
  const rows = data.slice(0, 20).map(d => ({ name: String(d.name).slice(0, 24), size: Math.max(d.value, 0.001) }));
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Treemap</p>
      <ResponsiveContainer width="100%" height={260}>
        <Treemap data={rows} dataKey="size" nameKey="name" stroke={dark ? "#111827" : "#fff"} fill="#f97316" isAnimationActive={false}>
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

export { numericColCount };
