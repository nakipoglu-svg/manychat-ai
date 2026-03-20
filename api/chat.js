export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "GET OK" });
    }

    console.log("BODY:", req.body);

    const message = req.body?.message || "boş mesaj";

    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ reply: "API KEY YOK" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const text = await response.text();

    console.log("RAW RESPONSE:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(200).json({ reply: "JSON parse hatası" });
    }

    let reply = "Cevap alınamadı";

    if (data?.content?.[0]?.text) {
      reply = data.content[0].text;
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.log("ERROR:", err);
    return res.status(200).json({ reply: "GENEL HATA" });
  }
}
