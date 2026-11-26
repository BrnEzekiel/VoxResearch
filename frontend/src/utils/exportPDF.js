/**
 * Styled PDF export using jsPDF + jspdf-autotable.
 * Renders a branded document: real tables, rendered diagrams,
 * embedded images, headings, lists, code blocks, quotes, sources.
 */

export function slugify(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "answer";
}

function stripInline(s) {
  return String(s ?? "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isTableSep(line) {
  return /^\s*\|?[\s\-|:]+\|?\s*$/.test(line) && line.includes("-");
}

function splitRow(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map(c => stripInline(c.trim()));
}

async function ensureMermaid() {
  if (window.mermaid) return true;
  const cdns = [
    "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js",
    "https://unpkg.com/mermaid@11/dist/mermaid.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.4.1/mermaid.min.js",
  ];
  for (const src of cdns) {
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      if (window.mermaid) return true;
    } catch { /* try next CDN */ }
  }
  return !!window.mermaid;
}

// Rasterize an SVG string to a PNG data URL. Returns { dataUrl, w, h } or null.
async function svgStringToPng(svg) {
  try {
    // Sanitize: bare & in labels produces invalid XML which silently
    // fails to decode as an image. Escape only chars not already entities.
    let clean = svg.replace(/&(?!#?\w+;)/g, "&amp;");
    const wMatch = clean.match(/width="([\d.]+)(px)?"/);
    const hMatch = clean.match(/height="([\d.]+)(px)?"/);
    const vbMatch = clean.match(/viewBox="([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)"/);
    let w = wMatch ? parseFloat(wMatch[1]) : 0;
    let h = hMatch ? parseFloat(hMatch[1]) : 0;
    if ((!w || !h) && vbMatch) { w = parseFloat(vbMatch[3]); h = parseFloat(vbMatch[4]); }
    if (!w || !h) { w = 800; h = 600; }
    // Force explicit pixel size so the rasterizer doesn't default to 300x150.
    // Strip any existing width/height first — duplicate attributes = invalid XML.
    clean = clean.replace(/<svg([^>]*)>/, (m, attrs) => {
      const stripped = String(attrs).replace(/\s+(width|height)="[^"]*"/g, "");
      const withNs = /xmlns=/.test(stripped) ? stripped : `${stripped} xmlns="http://www.w3.org/2000/svg"`;
      return `<svg${withNs} width="${w}" height="${h}">`;
    });
    const scale = Math.min(1.5, 1600 / Math.max(w, 1));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const svg64 = btoa(unescape(encodeURIComponent(clean)));
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = "data:image/svg+xml;base64," + svg64;
    });
    const canvas = document.createElement("canvas");
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    return { dataUrl: canvas.toDataURL("image/png"), w: cw, h: ch };
  } catch { return null; }
}

// Bare & in diagram labels breaks the mermaid parser AND the SVG rasterizer.
// Escape it — mermaid renders &amp; back as & in the finished diagram.
function sanitizeMermaid(code) {
  return String(code || "").replace(/&(?!#?\w+;)/g, "&amp;");
}

function looksLikeMermaid(code) {
  return /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|timeline|journey|sankey|gitGraph|C4Context|requirementDiagram|zenuml|block-beta|xychart-beta|packet-beta|kanban|architecture-beta)\b/m.test(code);
}

// Render mermaid source to a PNG data URL. Returns { dataUrl, w, h } or null.
async function mermaidToPng(code) {
  try {
    window.mermaid.initialize({ startOnLoad: false, theme: "neutral" });
    const id = "pdfmmd" + Math.random().toString(36).slice(2);
    const { svg } = await window.mermaid.render(id, sanitizeMermaid(code));
    return await svgStringToPng(svg);
  } catch (e) { console.warn("[pdf] mermaid render failed:", e?.message || e); return null; }
}

// Diagrams already rendered in the chat, in page order. What you see is
// exactly what goes into the PDF — no CDN re-render needed.
function collectRenderedDiagrams(scopeEl) {
  try {
    const root = scopeEl || document;
    const marked = [...root.querySelectorAll('[data-mmd] svg')].map(el => el.outerHTML);
    if (marked.length > 0) return marked;
    // Fallback: any SVG in scope (custom chart components carry no marker).
    return [...root.querySelectorAll('svg')].map(el => el.outerHTML);
  } catch { return []; }
}

function fetchWithTimeout(url, ms = 8000) {
  return Promise.race([
    fetch(url).then(r => { if (!r.ok) throw new Error("bad status"); return r.blob(); }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function imageDims(dataUrl) {
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = dataUrl;
    });
    return { w: img.naturalWidth || 800, h: img.naturalHeight || 600 };
  } catch { return { w: 800, h: 600 }; }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function ensureSpace(doc, y, need = 30) {
  if (y > 278 - need) { doc.addPage(); y = 20; }
  return y;
}

// Renders parsed markdown answer starting at y. Returns end y.
// diagrams: queue of pre-rendered SVG strings consumed in order.
async function renderAnswerBlocks(doc, answer, y, MARGIN, CONTENT_W, diagrams) {
  const lines = String(answer || "").split("\n");
  let i = 0;
  let inFence = false;
  let fenceLang = "";
  let fenceBuf = [];

  const renderImage = async (dataUrl, pxW, pxH) => {
    const mmW = pxW * 0.2646, mmH = pxH * 0.2646;
    const scale = Math.min(1, CONTENT_W / mmW, 190 / mmH);
    const w = mmW * scale, h = mmH * scale;
    y = ensureSpace(doc, y, h + 14);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(MARGIN, y - 4, CONTENT_W, h + 8, 2, 2, "F");
    try {
      doc.addImage(dataUrl, "PNG", MARGIN + (CONTENT_W - w) / 2, y, w, h);
    } catch { /* skip unloadable image */ }
    y += h + 10;
  };

  const flushFence = async () => {
    if (fenceBuf.length === 0) { fenceLang = ""; return; }
    const code = fenceBuf.join("\n");
    fenceBuf = [];
    // Mermaid → rendered diagram image
    // Mermaid by tag, or by content sniffing when the backend forgets the tag.
    if (fenceLang === "mermaid" || (fenceLang !== "js" && fenceLang !== "javascript" && fenceLang !== "python" && fenceLang !== "java" && fenceLang !== "html" && fenceLang !== "css" && fenceLang !== "json" && fenceLang !== "sql" && fenceLang !== "bash" && fenceLang !== "sh" && looksLikeMermaid(code))) {
      // 1) Use the diagram already rendered in the chat (exact match).
      if (diagrams && diagrams.length > 0) {
        const png = await svgStringToPng(diagrams.shift());
        if (png) { await renderImage(png.dataUrl, png.w, png.h); fenceLang = ""; return; }
        console.warn("[pdf] DOM diagram rasterize failed, trying CDN re-render");
      } else {
        console.warn("[pdf] no DOM diagram found for mermaid block, trying CDN re-render");
      }
      // 2) Fallback: re-render via CDN.
      const ok = await ensureMermaid();
      if (ok) {
        const png = await mermaidToPng(code);
        if (png) { await renderImage(png.dataUrl, png.w, png.h); fenceLang = ""; return; }
      } else {
        console.warn("[pdf] mermaid CDN unavailable");
      }
    }
    // Generic code block
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const wrapped = [];
    for (const rawLine of code.split("\n")) {
      const parts = doc.splitTextToSize(rawLine || " ", CONTENT_W - 12);
      wrapped.push(...parts);
    }
    const boxH = wrapped.length * 4.5 + 8;
    y = ensureSpace(doc, y, Math.min(boxH, 60));
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(MARGIN, y - 4, CONTENT_W, boxH, 2, 2, "F");
    doc.text(wrapped, MARGIN + 6, y);
    y += boxH + 4;
    fenceLang = "";
  };

  const flushTable = (rows) => {
    if (rows.length < 2) return;
    const headers = rows[0];
    const body = rows.slice(1);
    // autotable plugin missing (version skew) → plain-text fallback, never crash.
    if (typeof doc.autoTable !== "function") {
      y = ensureSpace(doc, y, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      const hw = doc.splitTextToSize(headers.join("  |  "), CONTENT_W);
      doc.text(hw, MARGIN, y);
      y += hw.length * 5 + 2;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      for (const r of body) {
        const lw = doc.splitTextToSize(r.join("  |  "), CONTENT_W);
        y = ensureSpace(doc, y, 10);
        doc.text(lw, MARGIN, y);
        y += lw.length * 5 + 1;
      }
      y += 3;
      return;
    }
    y = ensureSpace(doc, y, 40);
    doc.autoTable({
      startY: y,
      head: [headers],
      body,
      margin: { left: MARGIN, right: MARGIN, bottom: 18 },
      styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [60, 60, 60], lineColor: [230, 230, 230] },
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
    });
    y = doc.lastAutoTable.finalY + 6;
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // Code fence toggle (capture language)
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      if (inFence) await flushFence();
      else fenceLang = (fenceMatch[1] || "").toLowerCase();
      inFence = !inFence;
      i++;
      continue;
    }
    if (inFence) { fenceBuf.push(raw.replace(/\t/g, "  ")); i++; continue; }
    if (!line) { y += 3; i++; continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      y = ensureSpace(doc, y, 10);
      doc.setDrawColor(230, 230, 230);
      doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
      y += 5; i++;
      continue;
    }

    // Table run
    if (isTableRow(line)) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        if (!isTableSep(lines[i].trim())) rows.push(splitRow(lines[i].trim()));
        i++;
      }
      if (rows.length >= 2) flushTable(rows);
      else if (rows.length === 1) {
        y = ensureSpace(doc, y, 10);
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(rows[0].join("  |  "), CONTENT_W);
        doc.text(wrapped, MARGIN, y);
        y += wrapped.length * 5.5 + 2;
      }
      continue;
    }

    // Heading
    if (/^#{1,3} /.test(line)) {
      const text = stripInline(line.replace(/^#{1,3} /, ""));
      y = ensureSpace(doc, y, 16);
      y += 2;
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const wrapped = doc.splitTextToSize(text, CONTENT_W);
      doc.text(wrapped, MARGIN, y);
      y += wrapped.length * 6 + 2;
      doc.setDrawColor(240, 240, 240);
      doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
      y += 4;
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const text = stripInline(line.replace(/^>\s?/, ""));
      y = ensureSpace(doc, y, 12);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(110, 110, 110);
      const wrapped = doc.splitTextToSize(text, CONTENT_W - 10);
      doc.setDrawColor(249, 115, 22);
      doc.setLineWidth(0.8);
      doc.line(MARGIN, y - 3, MARGIN, y + wrapped.length * 5.5 - 2);
      doc.text(wrapped, MARGIN + 5, y);
      y += wrapped.length * 5.5 + 3;
      i++;
      continue;
    }

    // Bullet
    if (/^[-*•] /.test(line)) {
      const text = stripInline(line.replace(/^[-*•] /, ""));
      y = ensureSpace(doc, y, 12);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(249, 115, 22);
      doc.text("•", MARGIN, y);
      doc.setTextColor(60, 60, 60);
      const wrapped = doc.splitTextToSize(text, CONTENT_W - 6);
      doc.text(wrapped, MARGIN + 6, y);
      y += wrapped.length * 5.5 + 1;
      i++;
      continue;
    }

    // Numbered list
    if (/^\d+[.)] /.test(line)) {
      const num = line.match(/^(\d+)[.)] /)[1];
      const text = stripInline(line.replace(/^\d+[.)] /, ""));
      y = ensureSpace(doc, y, 12);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(249, 115, 22);
      doc.text(`${num}.`, MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      const wrapped = doc.splitTextToSize(text, CONTENT_W - 8);
      doc.text(wrapped, MARGIN + 8, y);
      y += wrapped.length * 5.5 + 1;
      i++;
      continue;
    }

    // Normal paragraph (embed any markdown images found inline)
    const imgMatches = [...line.matchAll(/!\[([^\]]*)\]\((https?:[^)]+)\)/gi)];
    const textOnly = stripInline(line);
    if (textOnly) {
      y = ensureSpace(doc, y, 12);
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(textOnly, CONTENT_W);
      doc.text(wrapped, MARGIN, y);
      y += wrapped.length * 5.5 + 2;
    }
    for (const m of imgMatches.slice(0, 3)) {
      try {
        const blob = await fetchWithTimeout(m[2]);
        if (!blob.type.startsWith("image/")) continue;
        const dataUrl = await blobToDataUrl(blob);
        const dims = await imageDims(dataUrl);
        await renderImage(dataUrl, dims.w, dims.h);
      } catch { /* skip unloadable image */ }
    }
    i++;
  }

  if (inFence) await flushFence();
  return y;
}

function drawHeader(doc, W, MARGIN, title) {
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, MARGIN, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), W - MARGIN, 14, { align: "right" });
}

function drawFooters(doc, W, MARGIN) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 285, W, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by VoxResearch", MARGIN, 292);
    doc.text(`Page ${i} of ${pageCount}`, W - MARGIN, 292, { align: "right" });
  }
}

function isMobileDevice() {
  try {
    return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || "") ||
      (navigator.maxTouchPoints > 1 && !/windows|macintosh/i.test(navigator.userAgent || ""));
  } catch { return false; }
}

// Deliver a built jsPDF doc: anchor download on desktop, share sheet on
// mobile (programmatic downloads silently fail there), new-tab fallback.
// Returns "shared" | "downloaded" | "opened". Never fails silently.
async function deliverPdf(doc, filename) {
  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });
  // Mobile share sheet first (must stay in the tap gesture chain — the
  // caller awaits generation, so this can throw NotAllowedError; fall through).
  if (isMobileDevice()) {
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return "shared";
      }
    } catch { /* fall through to download/tab */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch { /* fall through to tab */ }
  // iOS Safari ignores the download attribute — opening the blob works.
  if (isMobileDevice()) {
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return "opened";
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "downloaded";
}

export async function exportAnswerPDF(query, answer, citations, scopeEl) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210; const MARGIN = 18; const CONTENT_W = W - MARGIN * 2;

  drawHeader(doc, W, MARGIN, "VoxResearch");

  let y = 32;
  doc.setTextColor(249, 115, 22);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("QUESTION", MARGIN, y);
  y += 5;

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const qLines = doc.splitTextToSize(query, CONTENT_W);
  doc.text(qLines, MARGIN, y);
  y += qLines.length * 7 + 4;

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 8;

  doc.setTextColor(249, 115, 22);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("ANSWER", MARGIN, y);
  y += 5;

  y = await renderAnswerBlocks(doc, answer, y, MARGIN, CONTENT_W, collectRenderedDiagrams(scopeEl));

  const cites = citations || [];
  if (cites.length > 0) {
    y = ensureSpace(doc, y, 40);
    y += 6;
    doc.setDrawColor(230, 230, 230);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 8;

    doc.setTextColor(249, 115, 22);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("SOURCES", MARGIN, y);
    y += 6;

    cites.forEach((c, i) => {
      y = ensureSpace(doc, y, 16);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      const title = c.title || c.url || "";
      const titleLines = doc.splitTextToSize(`${i + 1}. ${title}`, CONTENT_W - 4);
      doc.text(titleLines, MARGIN, y);
      y += titleLines.length * 5;

      if (c.url) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 220);
        const urlLines = doc.splitTextToSize(c.url, CONTENT_W - 4);
        doc.text(urlLines, MARGIN + 4, y);
        y += urlLines.length * 4.5 + 3;
      }
    });
  }

  drawFooters(doc, W, MARGIN);
  return deliverPdf(doc, `voxresearch-${slugify(query)}.pdf`);
}

export async function exportConversationPDF(turns) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210; const MARGIN = 18; const CONTENT_W = W - MARGIN * 2;

  drawHeader(doc, W, MARGIN, "VoxResearch — Conversation Export");

  let y = 32;
  const diagrams = collectRenderedDiagrams();

  for (const turn of turns) {
    y = ensureSpace(doc, y, 40);

    doc.setFillColor(249, 115, 22);
    const qLines = doc.splitTextToSize(turn.query, CONTENT_W - 10);
    const qH = qLines.length * 6 + 8;
    doc.roundedRect(MARGIN, y - 4, CONTENT_W, qH, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(qLines, MARGIN + 5, y + 2);
    y += qH + 6;

    y = await renderAnswerBlocks(doc, turn.answer || "", y, MARGIN, CONTENT_W, diagrams);

    y += 4;
    doc.setDrawColor(230, 230, 230);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 8;
  }

  drawFooters(doc, W, MARGIN);
  return deliverPdf(doc, `voxresearch-conversation-${slugify((turns[0] && turns[0].query) || "export")}.pdf`);
}
