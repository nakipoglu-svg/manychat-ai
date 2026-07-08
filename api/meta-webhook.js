// api/meta-webhook.js — Meta Instagram webhook endpoint

export default async function handler(req, res) {

  // META DOĞRULAMA (GET)
  if (req.method === "GET") {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
      console.log("META WEBHOOK: Doğrulama başarılı");
      return res.status(200).send(challenge);
    }

    console.warn("META WEBHOOK: Doğrulama başarısız", { mode, token });
    return res.status(403).send("Verification failed");
  }

  // MESAJ GELDI (POST)
  if (req.method === "POST") {
    try {
      const body = req.body;
      console.log("META WEBHOOK EVENT:", JSON.stringify(body));

      // Şimdilik sadece al ve 200 dön
      // Bir sonraki adımda buraya mesaj işleme gelecek
      return res.status(200).send("EVENT_RECEIVED");

    } catch (error) {
      console.error("META WEBHOOK ERROR:", error);
      return res.status(500).send("Server error");
    }
  }

  return res.status(405).send("Method Not Allowed");
}
