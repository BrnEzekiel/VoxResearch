// Device message quota: 10 free messages per device.
// The device id is a browser fingerprint (no storage needed to identify),
// and the used-count is mirrored across localStorage, IndexedDB and a cookie.
// doSearch checks the localStorage copy synchronously; on load we reconcile
// the highest count seen anywhere back into localStorage, so wiping only one
// store doesn't reset the quota. A determined user who wipes ALL site data
// gets a fresh count — a bulletproof limit needs a server-side counter.
export const MESSAGE_LIMIT = 10;
const LS_KEY = "vox_quota_used";
const COOKIE_KEY = "vox_quota_used";

function hash53(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

let cachedId = null;
export function getDeviceId() {
  if (cachedId) return cachedId;
  try {
    const parts = [
      navigator.userAgent || "",
      navigator.platform || "",
      navigator.language || "",
      (navigator.languages || []).join(","),
      `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
      new Date().getTimezoneOffset(),
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      navigator.hardwareConcurrency || "",
      navigator.deviceMemory || "",
      navigator.maxTouchPoints || "",
    ];
    try {
      const c = document.createElement("canvas");
      c.width = 220; c.height = 40;
      const g = c.getContext("2d");
      g.fillStyle = "#f60"; g.fillRect(0, 0, 110, 40);
      g.fillStyle = "#069"; g.font = "18px Arial";
      g.fillText("voxresearch", 4, 26);
      parts.push(c.toDataURL().slice(-80));
    } catch {}
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      const dbg = gl && gl.getExtension("WEBGL_debug_renderer_info");
      parts.push(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "nogl");
    } catch { parts.push("nogl"); }
    cachedId = "d" + hash53(parts.join("|"));
  } catch {
    cachedId = "d-unknown";
  }
  return cachedId;
}

function lsGet() {
  try { return Math.max(0, parseInt(localStorage.getItem(LS_KEY) || "0") || 0); }
  catch { return 0; }
}
function lsSet(n) {
  try { localStorage.setItem(LS_KEY, String(n)); } catch {}
}
function cookieGet() {
  try {
    const m = document.cookie.match(new RegExp(`${COOKIE_KEY}=(\\d+)`));
    return m ? parseInt(m[1]) : 0;
  } catch { return 0; }
}
function cookieSet(n) {
  try { document.cookie = `${COOKIE_KEY}=${n}; max-age=31536000; path=/; SameSite=Lax`; } catch {}
}

function idb(open = true) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("vox", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function idbGet() {
  const db = await idb();
  if (!db) return 0;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction("kv", "readonly");
      const req = tx.objectStore("kv").get(LS_KEY);
      req.onsuccess = () => resolve(Math.max(0, parseInt(req.result) || 0));
      req.onerror = () => resolve(0);
    } catch { resolve(0); }
  });
}
async function idbSet(n) {
  const db = await idb();
  if (!db) return;
  try {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(String(n), LS_KEY);
  } catch {}
}

export function getUsedCount() { return lsGet(); }
export function getMessagesLeft() { return Math.max(0, MESSAGE_LIMIT - lsGet()); }

// Highest count wins everywhere.
export async function reconcileQuota() {
  const [a, b] = await Promise.all([idbGet(), Promise.resolve(cookieGet())]);
  const top = Math.max(lsGet(), a, b);
  lsSet(top);
  cookieSet(top);
  idbSet(top);
  return Math.max(0, MESSAGE_LIMIT - top);
}

export function recordMessage() {
  const n = lsGet() + 1;
  lsSet(n);
  cookieSet(n);
  idbSet(n);
  return Math.max(0, MESSAGE_LIMIT - n);
}
