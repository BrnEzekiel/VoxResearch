import { stripMd } from "../../utils/parseHelpers";

export default function StepsFlow({ data, dark }) {
  const card = dark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200 shadow-sm";
  const num = dark ? "bg-orange-500 text-white" : "bg-orange-500 text-white";
  const text = dark ? "text-gray-300" : "text-gray-700";
  const arrow = dark ? "text-gray-600" : "text-gray-300";

  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900/50" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-4 ${dark ? "text-gray-500" : "text-gray-400"}`}>Steps</p>
      <div className="flex flex-wrap items-start gap-2">
        {data.map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className={`flex items-start gap-2 rounded-xl border p-3 max-w-48 ${card}`}>
              <span className={`flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${num}`}>{i + 1}</span>
              <span className={`text-xs leading-relaxed ${text}`}>{stripMd(step)}</span>
            </div>
            {i < data.length - 1 && <span className={`text-lg mt-2 ${arrow}`}>→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
