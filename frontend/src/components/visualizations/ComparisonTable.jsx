import { stripMd } from "../../utils/parseHelpers";

export default function ComparisonTable({ data, dark }) {
  const keys = Object.keys(data).slice(0, 4);
  if (keys.length < 2) return null;
  const th = dark ? "bg-gray-800 text-gray-300 border-gray-700" : "bg-orange-50 text-gray-700 border-gray-200";
  const td = dark ? "text-gray-400 border-gray-800" : "text-gray-600 border-gray-100";

  return (
    <div className={`mt-4 overflow-x-auto rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"} p-4`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Comparison</p>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {keys.map(k => (
              <th key={k} className={`px-4 py-2 text-left font-semibold border-b ${th}`}>{stripMd(k)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.max(...keys.map(k => data[k].length)) }).map((_, i) => (
            <tr key={i}>
              {keys.map(k => (
                <td key={k} className={`px-4 py-2 border-b text-xs align-top ${td}`}>
                  {stripMd((data[k][i] || "").replace(/^[-*]\s*/, ""))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
