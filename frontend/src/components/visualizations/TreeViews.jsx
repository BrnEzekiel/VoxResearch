function Shell({ dark, title, children }) {
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>{title}</p>
      {children}
    </div>
  );
}

function TreeNode({ node, dark, depth }) {
  const hasKids = node.children && node.children.length > 0;
  if (!hasKids) {
    return <li className={`text-sm py-0.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>{node.name}</li>;
  }
  return (
    <li>
      <details open={depth < 2}>
        <summary className={`text-sm font-medium cursor-pointer py-0.5 ${dark ? "text-gray-200" : "text-gray-800"}`}>{node.name}</summary>
        <ul className={`ml-4 pl-3 mt-1 space-y-0.5 border-l ${dark ? "border-gray-700" : "border-gray-200"}`}>
          {node.children.map((c, i) => <TreeNode key={i} node={c} dark={dark} depth={depth + 1} />)}
        </ul>
      </details>
    </li>
  );
}

export function TreeView({ data, dark }) {
  if (!data || data.length === 0) return null;
  return (
    <Shell dark={dark} title="Tree">
      <ul className="space-y-0.5">
        {data.map((n, i) => <TreeNode key={i} node={n} dark={dark} depth={0} />)}
      </ul>
    </Shell>
  );
}

function leafCount(node) {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((a, c) => a + leafCount(c), 0);
}

const ICICLE = ["#f97316", "#3b82f6", "#16a34a", "#a855f7", "#ef4444", "#eab308", "#06b6d4c", "#ec4899"];

function IcicleNode({ node, dark, depth, colorIdx }) {
  const hasKids = node.children && node.children.length > 0;
  const total = leafCount(node);
  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ flexGrow: total }}>
      <div className="px-2 py-1.5 rounded text-xs truncate border"
        style={{
          background: `${ICICLE[(colorIdx + depth) % ICICLE.length]}${depth === 0 ? "33" : "22"}`,
          borderColor: `${ICICLE[(colorIdx + depth) % ICICLE.length]}66`,
          color: dark ? "#e5e7eb" : "#1f2937",
        }}
        title={node.name}>
        {node.name}
      </div>
      {hasKids && (
        <div className="flex gap-1 mt-1">
          {node.children.map((c, i) => <IcicleNode key={i} node={c} dark={dark} depth={depth + 1} colorIdx={colorIdx + i + 1} />)}
        </div>
      )}
    </div>
  );
}

export function IcicleView({ data, dark }) {
  if (!data || data.length === 0) return null;
  return (
    <Shell dark={dark} title="Icicle">
      <div className="flex gap-1 overflow-x-auto">
        {data.map((n, i) => <IcicleNode key={i} node={n} dark={dark} depth={0} colorIdx={i} />)}
      </div>
    </Shell>
  );
}
