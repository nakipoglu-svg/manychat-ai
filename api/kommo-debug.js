export default async function handler(req, res) {
  console.log("KOMMO HIT");
  console.log("method:", req.method);
  console.log("body:", JSON.stringify(req.body));
  return res.status(200).json({ ok: true, got: req.body || null });
}
