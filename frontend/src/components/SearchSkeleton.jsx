export default function SearchSkeleton({ dark }) {
  const base = dark ? "bg-gray-800" : "bg-gray-100";

  return (
    <div className="w-full py-4 animate-pulse">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-3 h-3 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-3 h-3 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-3 h-3 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <div className="space-y-3">
        <div className={`h-4 w-full rounded-full ${base}`} />
        <div className={`h-4 w-5/6 rounded-full ${base}`} />
        <div className={`h-4 w-4/6 rounded-full ${base}`} />
        <div className={`h-4 w-5/6 rounded-full ${base}`} />
        <div className={`h-4 w-2/6 rounded-full ${base}`} />
      </div>
    </div>
  );
}
