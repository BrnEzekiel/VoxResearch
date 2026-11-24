import { useEffect, useRef, useState } from "react";

function loadScript(src, test) {
  if (test()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export function QRBlock({ items, dark }) {
  const refs = useRef([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    loadScript("https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js", () => !!window.QRCode)
      .then(() => { if (alive) setReady(true); })
      .catch(() => { if (alive) setReady(false); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!ready || !window.QRCode) return;
    refs.current.forEach((el, i) => {
      if (el && items[i] && !el.dataset.done) {
        el.dataset.done = "1";
        try {
          new window.QRCode(el, { text: items[i].url, width: 120, height: 120, correctLevel: window.QRCode.CorrectLevel.M });
        } catch { el.dataset.done = ""; }
      }
    });
  }, [ready, items]);
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>QR codes</p>
      <div className="flex flex-wrap gap-4">
        {items.map((it, i) => (
          <div key={i} className="text-center">
            <div ref={el => { refs.current[i] = el; }} className="bg-white p-2 rounded-lg inline-block min-w-[136px] min-h-[136px]" />
            <p className={`text-xs mt-1 max-w-[140px] truncate ${dark ? "text-gray-400" : "text-gray-500"}`}>{it.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KatexBlock({ blocks, dark }) {
  const refs = useRef([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!document.querySelector('link[data-katex]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset.katex = "1";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
      document.head.appendChild(link);
    }
    loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js", () => !!window.katex)
      .then(() => {
        if (!alive || !window.katex) return;
        refs.current.forEach((el, i) => {
          if (el && blocks[i] && !el.dataset.done) {
            try {
              window.katex.render(blocks[i].tex, el, { throwOnError: false, displayMode: blocks[i].display });
              el.dataset.done = "1";
            } catch { /* fallback below */ }
          }
        });
        setReady(true);
      })
      .catch(() => { if (alive) setReady(false); });
    return () => { alive = false; };
  }, []);
  return (
    <div className={`mt-4 p-4 rounded-xl overflow-x-auto ${dark ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Math</p>
      {blocks.map((b, i) => (
        <div key={i} className="py-2">
          <div ref={el => { refs.current[i] = el; }} />
          {!ready && <pre className="text-sm font-mono whitespace-pre-wrap opacity-70">{b.tex}</pre>}
        </div>
      ))}
    </div>
  );
}

function isVideo(url) {
  return /youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|mov)(\?|$)/i.test(url);
}

function videoEmbed(url) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/i);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export function VideoEmbed({ items, dark }) {
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Videos</p>
      <div className="space-y-4">
        {items.map((it, i) => {
          const embed = videoEmbed(it.url);
          return (
            <div key={i}>
              {embed ? (
                <iframe src={embed} title={it.label} className="w-full rounded-lg aspect-video" allowFullScreen loading="lazy" />
              ) : (
                <video src={it.url} controls className="w-full rounded-lg max-h-80" preload="metadata" />
              )}
              <p className={`text-xs mt-1 truncate ${dark ? "text-gray-400" : "text-gray-500"}`}>{it.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AudioClip({ items, dark }) {
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Audio</p>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i}>
            <p className={`text-xs mb-1 truncate ${dark ? "text-gray-400" : "text-gray-500"}`}>{it.label}</p>
            <audio src={it.url} controls preload="none" className="w-full h-9" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ImageGrid({ items, dark }) {
  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>Images</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((it, i) => (
          <figure key={i} className="m-0">
            <img src={it.url} alt={it.label} loading="lazy" className="w-full rounded-lg object-cover aspect-video bg-black/10"
              onError={e => { e.target.style.display = "none"; }} />
            <figcaption className={`text-xs mt-1 truncate ${dark ? "text-gray-400" : "text-gray-500"}`}>{it.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export { isVideo };
