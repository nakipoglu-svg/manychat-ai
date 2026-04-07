export default async function handler(req, res) {
  const data = req.body || {};
  console.log("[WH] METHOD:", req.method);
  console.log("[WH] ALL KEYS:", Object.keys(data).join(" | "));
  console.log("[WH] BODY:", JSON.stringify(data).slice(0, 3000));
  return res.status(200).json({ ok: true });
}
