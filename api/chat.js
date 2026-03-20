export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ reply: "çalışıyor" });
  }

  try {
    const message = req.body?.message || "";

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

    const data = await response.json();

    let reply = "Şu an cevap veremiyorum.";

if (data && data.content && data.content.length > 0) {
  if (data.content[0].text) {
    reply = data.content[0].text;
  }
}

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(200).json({ reply: "Hata oluştu." });
  }
}
    console.log("CLAUDE DATA:", JSON.stringify(data));
