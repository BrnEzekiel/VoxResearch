export default function ProgressBars({ data, dark }) {
  const max = Math.max(...data.map(d => d.value));
  const label = dark ? "text-gray-300" : "text-gray-700";
  const val = dark ? "text-gray-500" : "text-gray-400";
  const track = dark ? "bg-gray-800" : "bg-gray-100";

  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900/50" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${dark ? "text-gray-500" : "text-gray-400"}`}>Comparison</p>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between mb-1">
              <span className={`text-sm ${label}`}>{item.name}</span>
              <span className={`text-xs ${val}`}>{item.value.toLocaleString()}</span>
            </div>
            <div className={`h-2 rounded-full ${track} overflow-hidden`}>
              <div
                className="h-full rounded-full bg-orange-500 transition-all duration-700"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
