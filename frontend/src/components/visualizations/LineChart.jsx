import { LineChart as ReLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function LineChartViz({ data, dark }) {
  const grid = dark ? "#1f2937" : "#f3f4f6";
  const text = dark ? "#9ca3af" : "#6b7280";
  const bg = dark ? "#111827" : "#fff";
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Trend</p>
      <ResponsiveContainer width="100%" height={240}>
        <ReLine data={data} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="name" tick={{ fill: text, fontSize: 11 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fill: text, fontSize: 11 }} />
          <Tooltip contentStyle={{ background: bg, border: "none", borderRadius: 8, fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", r: 3 }} />
        </ReLine>
      </ResponsiveContainer>
    </div>
  );
}
