// Render an answer card to a branded PNG for sharing (X/LinkedIn/WhatsApp).
// Prefers the native share sheet on mobile, downloads on desktop.
export async function shareAnswerImage(el, query) {
  if (!el) throw new Error("Nothing to capture yet.");
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(el, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });
  // Brand bar: repaint the capture with a VoxResearch header strip.
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height + 120;
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#f97316";
  ctx.fillRect(0, 0, out.width, 120);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText("VoxResearch", 40, 72);
  ctx.font = "28px system-ui, sans-serif";
  ctx.fillStyle = "#ffedd5";
  const q = String(query || "").slice(0, 90);
  ctx.fillText(q, 40, 106);
  ctx.drawImage(canvas, 0, 120);
  const blob = await new Promise((resolve, reject) => {
    try {
      out.toBlob(b => (b ? resolve(b) : reject(new Error("Image render failed."))), "image/png");
    } catch (e) { reject(e); }
  });
  const name = `voxresearch-${String(query || "answer").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) || "answer"}.png`;
  const file = new File([blob], name, { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return "shared";
    }
  } catch { /* fall through to download (user cancelled or no gesture) */ }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "downloaded";
}
