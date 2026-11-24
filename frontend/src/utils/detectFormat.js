/**
 * Detects what structured format(s) an answer can be rendered as,
 * and extracts the structured data for rendering.
 */

import { findCountries, parseNestedList, parseTabsSections, parseCSVText, stripMd } from "./parseHelpers";

export function detectFormats(answer) {
  const formats = [];
  const text = answer || "";

  // Timeline: lines with years or dates
  const timelineLines = text.match(/^[-*]?\s*(\d{4}|\w+ \d{4})[:\s–-].+/gm);
  if (timelineLines && timelineLines.length >= 3) {
    formats.push({ type: "timeline", data: parseTimeline(text) });
  }

  // Table: markdown table rows (also detects numeric columns for charts)
  if (/\|.+\|.+\|/.test(text) && text.match(/\|/g)?.length >= 6) {
    const table = parseMarkdownTable(text);
    if (table && table.rows.length > 0) {
      formats.push({ type: "table", data: table });
    }
  }

  // Bar/Line chart: numbered list with numbers that look like data
  const numericList = text.match(/^\d+\.\s+(.+?)[:：]\s*(\d[\d,.]*)(%|k|m|b|bn|million|billion)?/gmi);
  if (numericList && numericList.length >= 3) {
    formats.push({ type: "bar", data: parseNumericList(text) });
  }

  // Comparison: "X vs Y" or pros/cons
  if (/\bvs\.?\b|\bversus\b/i.test(text) || /pros.*cons|advantages.*disadvantages/i.test(text)) {
    formats.push({ type: "comparison", data: parseComparison(text) });
  }

  // Steps / process flow
  const steps = text.match(/^(step\s+)?\d+[.:]\s+.+/gmi);
  if (steps && steps.length >= 3) {
    formats.push({ type: "steps", data: steps.map(s => s.replace(/^(step\s+)?\d+[.:]\s*/i, "").trim()) });
  }

  // Key-value / stats
  const kvLines = text.match(/^[-*]\s+\*\*(.+?)\*\*[:：]\s*(.+)/gm);
  if (kvLines && kvLines.length >= 3) {
    formats.push({ type: "keyvalue", data: parseKV(kvLines) });
  }

  // Checklist: - [ ] / - [x]
  const checkLines = text.match(/^\s*[-*+]\s+\[[ xX]\]\s+.+/gm);
  if (checkLines && checkLines.length >= 2) {
    formats.push({ type: "checklist", data: parseChecklist(checkLines) });
  }

  // Pros & cons sections
  const pc = parseProsCons(text);
  if ((pc.pros.length >= 2 && pc.cons.length >= 1) || (pc.pros.length >= 1 && pc.cons.length >= 2)) {
    formats.push({ type: "proscons", data: pc });
    if (pc.shared.length > 0) formats.push({ type: "venn", data: { a: pc.pros, b: pc.cons, shared: pc.shared } });
  }

  // FAQ: Q: ... A: ... pairs
  const faq = parseFaq(text);
  if (faq.length >= 2) {
    formats.push({ type: "faq", data: faq });
  }

  // Mermaid diagram fences: tagged ones, plus untagged blocks that START with
  // a diagram keyword (start-of-block only — never matches prose mid-text).
  const mermaidCodes = [...text.matchAll(/```mermaid\s*\n([\s\S]+?)```/gi)].map(m => m[1].trim());
  const codeLangs = new Set(["js", "javascript", "ts", "typescript", "python", "py", "java", "c", "cpp", "go", "rust", "ruby", "php", "html", "css", "xml", "json", "yaml", "yml", "sql", "bash", "sh"]);
  for (const m of text.matchAll(/```(\w*)\s*\n([\s\S]+?)```/g)) {
    const tag = (m[1] || "").toLowerCase();
    if (tag === "mermaid" || codeLangs.has(tag)) continue;
    const body = m[2].trim();
    if (/^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|timeline|journey|sankey|gitGraph|C4Context|requirementDiagram|zenuml|block-beta|xychart-beta|packet-beta|kanban|architecture-beta)\b/.test(body)) {
      mermaidCodes.push(body);
    }
  }
  if (mermaidCodes.length > 0) {
    formats.push({ type: "mermaid", data: mermaidCodes.slice(0, 3).map(code => ({ code })) });
  }

  // Nested list → tree / icicle
  const nestedLines = text.match(/^\s{2,}[-*+]\s+.+/gm);
  if (nestedLines && nestedLines.length >= 3) {
    const tree = parseNestedList(text);
    if (tree.length > 0) {
      formats.push({ type: "tree", data: tree });
      formats.push({ type: "icicle", data: tree });
    }
  }

  // Sections → tabs
  const tabSections = parseTabsSections(text);
  if (tabSections.length >= 4) {
    formats.push({ type: "tabs", data: tabSections });
  }

  // Links → QR / video / audio / images
  const urls = [...new Set([...text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)].map(m => m[0].replace(/[.,;!?]+$/, "")))].slice(0, 8);
  if (urls.length > 0) {
    const label = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u.slice(0, 30); } };
    formats.push({ type: "qr", data: urls.slice(0, 4).map(u => ({ label: label(u), url: u })) });
    const vids = urls.filter(u => /youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|mov)(\?|$)/i.test(u));
    if (vids.length) formats.push({ type: "video", data: vids.slice(0, 3).map(u => ({ label: label(u), url: u })) });
    const auds = urls.filter(u => /\.(mp3|wav|ogg|m4a|flac)(\?|$)/i.test(u));
    if (auds.length) formats.push({ type: "audio", data: auds.slice(0, 4).map(u => ({ label: label(u), url: u })) });
    const imgs = urls.filter(u => /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u));
    if (imgs.length) formats.push({ type: "images", data: imgs.slice(0, 6).map(u => ({ label: label(u), url: u })) });
  }

  // Math: $...$ / $$...$$
  const texBlocks = [...text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)];
  if (texBlocks.length > 0) {
    formats.push({ type: "katex", data: texBlocks.slice(0, 6).map(m => ({ tex: (m[1] ?? m[2]).trim(), display: !!m[1] })) });
  }

  // JSON fences
  const jsonBlocks = [...text.matchAll(/```json\s*\n([\s\S]+?)```/gi)];
  const parsedJson = [];
  for (const m of jsonBlocks.slice(0, 2)) {
    try { parsedJson.push(JSON.parse(m[1])); } catch { /* skip invalid */ }
  }
  if (parsedJson.length > 0) formats.push({ type: "json", data: parsedJson });

  // CSV fences → same shape as markdown tables
  const csvBlocks = [...text.matchAll(/```csv\s*\n([\s\S]+?)```/gi)];
  if (csvBlocks.length > 0) {
    const t = parseCSVText(csvBlocks[0][1]);
    if (t && t.rows.length > 0) formats.push({ type: "table", data: t });
  }

  // Countries → map
  const countries = findCountries(text);
  if (countries.length >= 3) formats.push({ type: "map", data: countries });

  // Word cloud keywords (many capitalized proper nouns / tech terms)
  const words = text.match(/\b[A-Z][a-zA-Z]{3,}\b/g) || [];
  if (words.length >= 15) {
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const topWords = Object.entries(freq).filter(([,v]) => v >= 2).sort((a,b) => b[1]-a[1]).slice(0, 30);
    if (topWords.length >= 8) formats.push({ type: "wordcloud", data: topWords });
  }

  return formats;
}

function parseTimeline(answer) {
  const lines = answer.split("\n");
  const events = [];
  for (const line of lines) {
    const m = line.match(/(\d{4})[:\s–-]+(.+)/);
    if (m) events.push({ year: m[1], event: stripMd(m[2]) });
  }
  return events.slice(0, 20);
}

function cellNumber(cell) {
  if (cell === undefined || cell === null) return NaN;
  const s = String(cell).trim();
  if (!s) return NaN;
  return parseFloat(s.replace(/[$,%\s]/g, "").replace(/,/g, ""));
}

function parseMarkdownTable(answer) {
  const lines = answer.split("\n").filter(l => l.includes("|"));
  if (lines.length < 2) return null;
  const headers = lines[0].split("|").map(h => h.trim()).filter(Boolean);
  const rows = lines.slice(2).map(l => l.split("|").map(c => c.trim()).filter(Boolean)).filter(r => r.length === headers.length);
  if (rows.length === 0) return null;
  const numericCols = headers
    .map((_, i) => i)
    .filter(i => rows.every(r => !isNaN(cellNumber(r[i]))));
  return { headers, rows, numericCols };
}

function parseNumericList(answer) {
  const lines = answer.match(/^\d+\.\s+(.+?)[:：]\s*(\d[\d,.]*)/gmi) || [];
  return lines.slice(0, 15).map(l => {
    const m = l.match(/^\d+\.\s+(.+?)[:：]\s*([\d,.]+)/i);
    if (!m) return null;
    return { name: m[1].trim().slice(0, 30), value: parseFloat(m[2].replace(/,/g, "")) };
  }).filter(Boolean);
}

function parseComparison(answer) {
  const sections = answer.split(/\n#{1,3} /);
  const result = {};
  sections.forEach(s => {
    const [title, ...rest] = s.split("\n");
    if (!title) return;
    const clean = rest
      .map(l => l.trim())
      .filter(l => l && !/^\|/.test(l) && !/^```/.test(l) && !/^#{1,6}\s/.test(l) && !/^\|?[\s\-|:]+\|?$/.test(l));
    if (clean.length) result[title.trim().replace(/^#+\s*/, "")] = clean.slice(0, 8);
  });
  return result;
}

function parseKV(lines) {
  return lines.map(l => {
    const m = l.match(/\*\*(.+?)\*\*[:：]\s*(.+)/);
    return m ? { key: m[1], value: m[2] } : null;
  }).filter(Boolean);
}

function parseChecklist(lines) {
  return lines.slice(0, 20).map(l => {
    const m = l.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.+)/);
    return m ? { text: m[2].trim().replace(/\*\*/g, ""), done: m[1].toLowerCase() === "x" } : null;
  }).filter(Boolean);
}

function parseProsCons(answer) {
  const lines = answer.split("\n");
  const pros = [];
  const cons = [];
  let side = null;
  for (const line of lines) {
    if (/^#{0,3}\s*(pros|advantages|benefits|strengths)\b/i.test(line)) { side = "pros"; continue; }
    if (/^#{0,3}\s*(cons|disadvantages|drawbacks|weaknesses)\b/i.test(line)) { side = "cons"; continue; }
    const m = line.match(/^\s*[-*+\d.)]+\s+(.+)/);
    if (m && side) {
      const clean = m[1].trim().replace(/\*\*/g, "");
      if (side === "pros" && pros.length < 8) pros.push(clean);
      if (side === "cons" && cons.length < 8) cons.push(clean);
    }
  }
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const conSet = new Set(cons.map(norm));
  const shared = pros.filter(p => p && conSet.has(norm(p)));
  return { pros, cons, shared };
}

function parseFaq(answer) {
  const lines = answer.split("\n");
  const pairs = [];
  let current = null;
  const flush = () => {
    if (current && current.q && current.a.length) {
      pairs.push({ q: current.q, a: current.a.join(" ").trim().slice(0, 400) });
    }
  };
  for (const line of lines) {
    const qm = line.match(/^(?:Q|Question)\s*[:.]\s*(.+)/i);
    if (qm) {
      flush();
      current = { q: qm[1].trim().replace(/\*\*/g, ""), a: [] };
      continue;
    }
    if (current && line.trim() && !line.startsWith("#")) {
      current.a.push(line.replace(/^(?:A|Answer)\s*[:.]\s*/i, "").trim());
    }
  }
  flush();
  return pairs.slice(0, 8);
}
