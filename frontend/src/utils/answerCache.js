// Device-local answer cache: repeat questions never touch the AI (or quota).
// LRU, 50 entries, 7-day TTL. Key covers language + length + normalized query.

const PREFIX = "vox_ac_";
const MAX_ENTRIES = 50;
export const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;

export function normalizeQuery(q) {
  return String(q || "").toLowerCase().trim().replace(/\s+/g, " ");
}

// cyrb53 — tiny stable hash for short storage keys.
function hashStr(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function cacheKey(query, language, length) {
  return PREFIX + hashStr(`${language || "English"}|${length || "Detailed"}|${normalizeQuery(query)}`);
}

function readAll() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) {
        try {
          const v = JSON.parse(localStorage.getItem(k));
          if (v) out.push([k, v]);
        } catch {}
      }
    }
  } catch {}
  return out;
}

export function cacheGet(query, language, length) {
  try {
    const raw = localStorage.getItem(cacheKey(query, language, length));
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || !v.answer || Date.now() - (v.ts || 0) > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(query, language, length));
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

export function cacheSet(query, language, length, answer, citations) {
  if (!answer) return;
  try {
    localStorage.setItem(
      cacheKey(query, language, length),
      JSON.stringify({ answer, citations: citations || [], ts: Date.now() })
    );
    // LRU eviction.
    const all = readAll();
    if (all.length > MAX_ENTRIES) {
      all.sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0));
      for (let i = 0; i < all.length - MAX_ENTRIES; i++) {
        localStorage.removeItem(all[i][0]);
      }
    }
  } catch {}
}
