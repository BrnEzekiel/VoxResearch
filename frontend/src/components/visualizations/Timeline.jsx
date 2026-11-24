export default function TimelineViz({ data, dark }) {
  const line = dark ? "bg-gray-700" : "bg-gray-200";
  const dot = "bg-orange-500";
  const card = dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200 shadow-sm";
  const text = dark ? "text-gray-300" : "text-gray-700";
  const year = dark ? "text-orange-400" : "text-orange-500";

  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900/50" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${dark ? "text-gray-500" : "text-gray-400"}`}>Timeline</p>
      <div className="relative pl-8">
        <div className={`absolute left-3 top-0 bottom-0 w-0.5 ${line}`} />
        <div className="space-y-5">
          {data.map((e, i) => (
            <div key={i} className="relative">
              <div className={`absolute -left-5 top-1.5 w-3 h-3 rounded-full ${dot} ring-4 ${dark ? "ring-gray-950" : "ring-gray-50"}`} />
              <div className={`rounded-xl border p-3 ${card}`}>
                <span className={`text-xs font-bold ${year}`}>{e.year}</span>
                <p className={`text-sm mt-0.5 ${text}`}>{e.event}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
