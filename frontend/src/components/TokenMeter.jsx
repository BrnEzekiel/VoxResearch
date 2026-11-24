export default function TokenMeter({ count, dark }) {
  if (count === 0) return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${dark ? "border-gray-700 text-gray-500" : "border-gray-200 text-gray-400"}`}>
      ~{count.toLocaleString()} tokens
    </span>
  );
}
