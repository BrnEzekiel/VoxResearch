import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

export default function RadarChartViz({ data, dark }) {
  const bg = dark ? "#111827" : "#fff";
  const grid = dark ? "#374151" : "#e5e7eb";
  const text = dark ? "#9ca3af" : "#6b7280";

  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Radar</p>
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid stroke={grid} />
          <PolarAngleAxis dataKey="name" tick={{ fill: text, fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fill: text, fontSize: 9 }} />
          <Radar dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
          <Tooltip contentStyle={{ background: bg, border: "none", borderRadius: 8, fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
