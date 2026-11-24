// Server-side device quota backed by Vercel Edge Config (plain REST, no SDK).
// Keys are device fingerprints, values are used-message counts.
// All failures are fail-open (return 0 / false) so a quota outage never
// takes the app down — abuse during an outage beats a dead app.
export const QUOTA_LIMIT = 10;

function conn() {
  try {
    const u = new URL(process.env.EDGE_CONFIG || "");
    const id = u.pathname.replace(/^\//, "");
    const token = u.searchParams.get("token");
    if (id && token) return { id, token };
  } catch {}
  return null;
}

export async function quotaUsed(deviceId) {
  const c = conn();
  if (!c || !deviceId) return 0;
  try {
    const r = await fetch(
      `https://edge-config.vercel.com/${c.id}/item/${encodeURIComponent(deviceId)}?token=${c.token}`
    );
    if (!r.ok) return 0;
    const v = await r.json();
    const n = v && typeof v === "object" && v.value !== undefined ? v.value : v;
    return Math.max(0, parseInt(n) || 0);
  } catch {
    return 0;
  }
}

export async function quotaSet(deviceId, n) {
  const c = conn();
  const admin = process.env.QUOTA_API_TOKEN || "";
  if (!c || !admin || !deviceId) return false;
  try {
    const r = await fetch(`https://api.vercel.com/v1/edge-config/${c.id}/items`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${admin}`, "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ operation: "upsert", key: deviceId, value: n }] }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Trust the client's fingerprint when well-formed, else fall back to IP+UA hash.
export function quotaId(req, bodyDeviceId) {
  if (bodyDeviceId && /^[A-Za-z0-9_.-]{1,64}$/.test(bodyDeviceId)) return bodyDeviceId;
  const fwd = ((req.headers && req.headers["x-forwarded-for"]) || "").split(",")[0].trim();
  const ua = (req.headers && req.headers["user-agent"]) || "";
  let h = 0x811c9dc5;
  const s = fwd + "|" + ua;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return "ip" + (h >>> 0).toString(16);
}
