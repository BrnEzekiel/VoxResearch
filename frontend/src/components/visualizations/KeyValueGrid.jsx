import { stripMd } from "../../utils/parseHelpers";

export default function KeyValueGrid({ data, dark }) {
  const card = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm";
  const key = dark ? "text-orange-400" : "text-orange-600";
  const val = dark ? "text-gray-200" : "text-gray-800";

  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900/50" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Key Facts</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {data.map((item, i) => (
          <div key={i} className={`rounded-xl border p-3 ${card}`}>
            <p className={`text-xs font-semibold mb-1 ${key}`}>{stripMd(item.key)}</p>
            <p className={`text-sm ${val}`}>{stripMd(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
