const COUNTRIES = ["Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Bangladesh","Belgium","Brazil","Canada","Chile","China","Colombia","Kenya","Uganda","Tanzania","Rwanda","Ethiopia","Nigeria","Ghana","South Africa","Egypt","Morocco","Japan","South Korea","India","Indonesia","Malaysia","Thailand","Vietnam","Philippines","Germany","France","Italy","Spain","Netherlands","Sweden","Norway","Poland","Ukraine","Russia","Turkey","Greece","Portugal","Mexico","Peru","Venezuela","United States","USA","United Kingdom","UK","Ireland","New Zealand","Pakistan","Bangladesh","Sri Lanka","Nepal","Israel","Saudi Arabia","UAE","Qatar","Singapore","Taiwan","Hong Kong"];

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

export function findCountries(text) {
  const freq = {};
  for (const c of COUNTRIES) {
    const re = new RegExp("\\b" + c.replace(REGEX_SPECIAL, "\\$&") + "\\b", "gi");
    const m = text.match(re);
    if (m && m.length) freq[c] = (freq[c] || 0) + m.length;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, value]) => ({ name, value }));
}

export function parseNestedList(text) {
  const lines = text.split("\n");
  const root = [];
  const stack = [{ children: root, indent: -1 }];
  let count = 0;
  for (const line of lines) {
    const m = line.match(/^(\s*)[-*+]\s+(.+)/);
    if (!m || count >= 60) continue;
    const indent = Math.floor(m[1].replace(/\t/g, "  ").length / 2);
    const node = { name: stripMd(m[2]).slice(0, 80), children: [] };
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push({ children: node.children, indent });
    count++;
  }
  return root;
}

export function parseTabsSections(text) {
  const lines = text.split("\n");
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^#{2,3}\s+(.+)/);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].trim().slice(0, 40), body: [] };
    } else if (current && line.trim()) {
      current.body.push(line.trim());
    }
  }
  if (current) sections.push(current);
  return sections.map(s => ({ title: s.title, body: s.body.join("\n").replace(/```mermaid[\s\S]+?```/gi, "").slice(0, 2000) }));
}

export function parseCSVText(raw) {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const splitRow = (l) => l.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
  const first = splitRow(lines[0]);
  const hasHeader = first.some(c => isNaN(parseFloat(c)));
  const headers = hasHeader ? first : first.map((_, i) => `Col ${i + 1}`);
  const rows = (hasHeader ? lines.slice(1) : lines).map(splitRow).filter(r => r.length === headers.length);
  if (rows.length === 0) return null;
  const cellNum = (c) => {
    const s = String(c).trim();
    if (!s) return NaN;
    return parseFloat(s.replace(/[$,%\s]/g, "").replace(/,/g, ""));
  };
  const numericCols = headers.map((_, i) => i).filter(i => rows.every(r => !isNaN(cellNum(r[i]))));
  return { headers, rows, numericCols };
}

export function stripMd(s) {
  return String(s ?? "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .trim();
}
