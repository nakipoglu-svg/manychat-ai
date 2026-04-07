export default async function handler(req, res) {
  console.log("KOMMO HIT");
  console.log("method:", req.method);
  console.log("FULL BODY:", JSON.stringify(req.body || {}).slice(0, 3000));
  return res.status(200).json({ ok: true });
}
