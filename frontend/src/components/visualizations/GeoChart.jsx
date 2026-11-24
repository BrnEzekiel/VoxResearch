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

const ALIASES = {
  usa: "United States of America", us: "United States of America",
  uk: "United Kingdom", england: "United Kingdom",
  "south korea": "South Korea", korea: "South Korea",
  russia: "Russia", czechia: "Czech Republic", czech: "Czech Republic",
  uae: "United Arab Emirates", saudi: "Saudi Arabia",
  vietnam: "Vietnam", iran: "Iran", tanzania: "Tanzania",
  syria: "Syria", laos: "Laos", moldova: "Moldova",
  venezuela: "Venezuela", bolivia: "Bolivia",
};

function normName(n) {
  const s = String(n).trim().toLowerCase();
  return ALIASES[s] || String(n).trim();
}

export default function WorldMap({ data, dark }) {
  const ref = useRef(null);
  const [status, setStatus] = useState("loading");
  const dataKey = JSON.stringify((data || []).slice(0, 60));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/d3@7", () => !!window.d3);
        await loadScript("https://cdn.jsdelivr.net/npm/topojson-client@3", () => !!(window.topojson && window.d3));
        const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
        const world = await res.json();
        if (!alive || !ref.current) return;
        const d3 = window.d3;
        const countries = window.topojson.feature(world, world.objects.countries).features;
        const vals = {};
        (data || []).forEach(d => { vals[normName(d.name).toLowerCase()] = d.value; });
        const nums = Object.values(vals).filter(v => typeof v === "number" && !isNaN(v));
        const max = Math.max(...nums, 1);
        const W = 620, H = 340;
        const svg = d3.select(ref.current);
        svg.selectAll("*").remove();
        svg.attr("viewBox", `0 0 ${W} ${H}`).attr("class", "w-full");
        const proj = d3.geoNaturalEarth1().fitSize([W, H], { type: "Sphere" });
        const path = d3.geoPath(proj);
        svg.append("path").datum({ type: "Sphere" })
          .attr("d", path)
          .attr("fill", dark ? "#111827" : "#f3f4f6");
        svg.selectAll("path.country")
          .data(countries)
          .join("path")
          .attr("class", "country")
          .attr("d", path)
          .attr("stroke", dark ? "#374151" : "#d1d5db")
          .attr("stroke-width", 0.5)
          .attr("fill", f => {
            const v = vals[String(f.properties.name || "").toLowerCase()];
            if (v === undefined || isNaN(v)) return dark ? "#1f2937" : "#e5e7eb";
            return `rgba(249,115,22,${(0.12 + (Math.abs(v) / max) * 0.85).toFixed(2)})`;
          })
          .append("title")
          .text(f => {
            const v = vals[String(f.properties.name || "").toLowerCase()];
            return `${f.properties.name}${v !== undefined ? `: ${v}` : ""}`;
          });
        setStatus("ok");
      } catch {
        if (alive) setStatus("failed");
      }
    })();
    return () => { alive = false; };
  }, [dataKey]);

  return (
    <div className={`mt-4 p-4 rounded-xl ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${dark ? "text-gray-500" : "text-gray-400"}`}>World map</p>
      {status === "failed" ? (
        <p className={`text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>Map libraries failed to load (check connection).</p>
      ) : (
        <>
          {status === "loading" && <div className={`h-40 rounded-xl animate-pulse ${dark ? "bg-gray-800" : "bg-gray-100"}`} />}
          <svg ref={ref} className="w-full" style={{ display: status === "loading" ? "none" : "block" }} />
        </>
      )}
    </div>
  );
}
