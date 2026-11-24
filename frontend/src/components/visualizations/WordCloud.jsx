export default function WordCloud({ data, dark }) {
  const max = Math.max(...data.map(([, v]) => v));
  const colors = ["#f97316","#fb923c","#3b82f6","#60a5fa","#34d399","#a78bfa","#f43f5e","#facc15"];

  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900/50" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Key Terms</p>
      <div className="flex flex-wrap gap-2 items-center">
        {data.map(([word, count], i) => {
          const size = 11 + Math.round((count / max) * 18);
          return (
            <span key={i} style={{ fontSize: `${size}px`, color: colors[i % colors.length], opacity: 0.7 + (count / max) * 0.3 }}
              className="font-semibold leading-tight">
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
