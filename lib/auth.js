// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH — Dahili/cron endpoint'leri için basit secret doğrulaması
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Beklenen secret: CRON_SECRET env değişkeni.
// Kabul edilen gönderim biçimleri:
//   - Authorization: Bearer <secret>   (Vercel Cron otomatik bunu gönderir)
//   - x-auth-secret: <secret>          (manuel/header ile tetikleme)
//   - ?secret=<secret>                 (tarayıcıdan/manuel query ile tetikleme)
//
// Kullanım:
//   if (!isAuthorized(req)) return res.status(401).json({ error: "unauthorized" });
export function isAuthorized(req) {
  const expected = process.env.CRON_SECRET || "";
  // Secret tanımlı değilse endpoint kilitlidir (fail-closed).
  if (!expected) return false;

  const auth = req.headers?.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const headerSecret = req.headers?.["x-auth-secret"] || "";
  const querySecret = req.query?.secret || "";

  return bearer === expected || headerSecret === expected || querySecret === expected;
}
