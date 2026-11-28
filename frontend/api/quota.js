// GET /api/quota?deviceId=... -> { left, limit }.
// Lets the app display the true server-side remaining count on load,
// even right after the user wiped all browser data.
import { quotaUsed, quotaId, QUOTA_LIMIT } from "./_quota.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  const url = new URL(req.url, "http://x");
  const deviceId = quotaId(req, url.searchParams.get("deviceId"));
  let used = 0;
  try {
    used = await quotaUsed(deviceId);
  } catch {}
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ left: Math.max(0, QUOTA_LIMIT - used), limit: QUOTA_LIMIT }));
}
