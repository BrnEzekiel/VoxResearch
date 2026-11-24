import {
  BarChart as ReBar, Bar, LineChart as ReLine, Line,
  AreaChart as ReArea, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Scatter,
  PieChart as RePie, Pie, Cell
} from "recharts";

function Shell({ dark, title, children, height = 260 }) {
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>{title}</p>
      <ResponsiveContainer width="100%" height={height}>
        {children(text)}
      </ResponsiveContainer>
    </div>
  );
}

const gridColor = (dark) => (dark ? "#1f2937" : "#f3f4f6");
const SLICE = ["#f97316", "#3b82f6", "#16a34a", "#a855f7", "#ef4444", "#eab308"];

export function HorizontalBar({ data, dark }) {
  return (
    <Shell dark={dark} title="Chart" height={Math.min(320, 60 + data.length * 28)}>
      {(text) => (
        <ReBar data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} horizontal={false} />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={110} tick={{ fill: text, fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
        </ReBar>
      )}
    </Shell>
  );
}

export function AreaView({ data, dark }) {
  return (
    <Shell dark={dark} title="Chart">
      {(text) => (
        <ReArea data={data} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} />
          <XAxis dataKey="name" tick={{ fill: text, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fill: text, fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <Area dataKey="value" fill="#f97316" fillOpacity={0.25} stroke="#f97316" strokeWidth={2} />
        </ReArea>
      )}
    </Shell>
  );
}

export function StepView({ data, dark }) {
  return (
    <Shell dark={dark} title="Chart">
      {(text) => (
        <ReLine data={data} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor(dark)} />
          <XAxis dataKey="name" tick={{ fill: text, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fill: text, fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <Line dataKey="value" type="stepAfter" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} />
        </ReLine>
      )}
    </Shell>
  );
}

export function Lollipop({ data, dark }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 600, rowH = 30, H = Math.max(120, data.length * rowH + 20);
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Chart</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {data.slice(0, 15).map((d, i) => {
          const y = 15 + i * rowH;
          const w = Math.max(8, (d.value / max) * (W - 220));
          return (
            <g key={i}>
              <text x={0} y={y + 4} fontSize={11} fill={dark ? "#9ca3af" : "#6b7280"}>{String(d.name).slice(0, 22)}</text>
              <line x1={200} y1={y} x2={200 + w} y2={y} stroke={dark ? "#4b5563" : "#d1d5db"} strokeWidth={2} />
              <circle cx={200 + w} cy={y} r={5} fill="#f97316" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DotPlot({ data, dark }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 600, rowH = 26, H = Math.max(100, data.length * rowH + 20);
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Chart</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={200 + f * (W - 220)} y1={10} x2={200 + f * (W - 220)} y2={H - 10} stroke={dark ? "#1f2937" : "#f3f4f6"} strokeWidth={1} />
        ))}
        {data.slice(0, 15).map((d, i) => (
          <g key={i}>
            <text x={0} y={15 + i * rowH + 4} fontSize={11} fill={dark ? "#9ca3af" : "#6b7280"}>{String(d.name).slice(0, 22)}</text>
            <circle cx={200 + (d.value / max) * (W - 220)} cy={15 + i * rowH} r={6} fill="#f97316" opacity={0.85} />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function Sparkline({ data, dark }) {
  return (
    <Shell dark={dark} title="Trend" height={64}>
      {() => (
        <ReLine data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Line dataKey="value" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} />
          <XAxis dataKey="name" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        </ReLine>
      )}
    </Shell>
  );
}

export function DonutChart({ data, dark }) {
  const rows = data.slice(0, 12);
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Chart</p>
      <ResponsiveContainer width="100%" height={260}>
        <RePie>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
            {rows.map((_, i) => <Cell key={i} fill={SLICE[i % SLICE.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        </RePie>
      </ResponsiveContainer>
    </div>
  );
}

export function UnitChart({ data, dark }) {
  const rows = data.slice(0, 12);
  const max = Math.max(...rows.map(d => d.value), 1);
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Unit chart</p>
      <div className="space-y-2">
        {rows.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className={`text-xs w-32 truncate flex-shrink-0 ${dark ? "text-gray-400" : "text-gray-500"}`}>{d.name}</span>
            <span className="text-sm tracking-tight" style={{ color: SLICE[i % SLICE.length] }}>
              {"■".repeat(Math.max(1, Math.round((d.value / max) * 24)))}
            </span>
            <span className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ParliamentChart({ data, dark }) {
  const rows = data.slice(0, 8);
  const sum = rows.reduce((a, d) => a + d.value, 0) || 1;
  const dots = [];
  rows.forEach((d, i) => {
    const n = Math.max(1, Math.round((d.value / sum) * 120));
    for (let k = 0; k < n; k++) dots.push(SLICE[i % SLICE.length]);
  });
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Parliament chart</p>
      <div className="flex flex-wrap gap-1 max-w-md">
        {dots.slice(0, 160).map((c, i) => (
          <span key={i} className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {rows.map((d, i) => (
          <span key={i} className={`text-xs ${dark ? "text-gray-400" : "text-gray-500"}`}>
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: SLICE[i % SLICE.length] }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StemLeaf({ data, dark }) {
  const vals = data.map(d => Math.round(d.value)).filter(v => !isNaN(v));
  const groups = {};
  vals.forEach(v => {
    const s = Math.floor(Math.abs(v) / 10);
    const l = Math.abs(v) % 10;
    (groups[s] = groups[s] || []).push(l);
  });
  const stems = Object.keys(groups).map(Number).sort((a, b) => a - b);
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Stem-and-leaf</p>
      <div className={`font-mono text-sm space-y-1 ${dark ? "text-gray-300" : "text-gray-700"}`}>
        {stems.map(s => (
          <div key={s} className="flex gap-3">
            <span className="w-12 text-right font-bold text-orange-500">{s} |</span>
            <span className="tracking-widest">{groups[s].sort((a, b) => a - b).join(" ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ForecastChart({ data, dark }) {
  const vals = data.map(d => d.value).filter(v => !isNaN(v));
  const n = vals.length;
  const sx = (n * (n - 1)) / 2, sxx = ((n - 1) * n * (2 * n - 1)) / 6;
  const sy = vals.reduce((a, b) => a + b, 0);
  const sxy = vals.reduce((a, v, i) => a + i * v, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1);
  const intercept = (sy - slope * sx) / n;
  const k = Math.max(2, Math.floor(n / 2));
  const rows = vals.map((v, i) => ({ name: data[i]?.name ?? `#${i + 1}`, hist: v, proj: null }));
  for (let i = 1; i <= k; i++) {
    rows.push({ name: `+${i}`, hist: null, proj: intercept + slope * (n - 1 + i) });
  }
  rows[n - 1] = { ...rows[n - 1], proj: vals[n - 1] };
  const text = dark ? "#9ca3af" : "#6b7280";
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Forecast (linear trend)</p>
      <ResponsiveContainer width="100%" height={260}>
        <ReLine data={rows} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#1f2937" : "#f3f4f6"} />
          <XAxis dataKey="name" tick={{ fill: text, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fill: text, fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <Line dataKey="hist" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} connectNulls={false} />
          <Line dataKey="proj" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: "#3b82f6" }} connectNulls />
        </ReLine>
      </ResponsiveContainer>
    </div>
  );
}
