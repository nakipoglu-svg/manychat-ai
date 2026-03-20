export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "" });
    }

    const message = req.body?.message || "";
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ reply: "" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await response.json();
    console.log("CLAUDE DATA:", JSON.stringify(data, null, 2));

    let reply = "";

    if (data?.content && Array.isArray(data.content)) {
      reply = data.content
        .map(item => item?.text || "")
        .join(" ")
        .trim();
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.log("HATA:", err);
    return res.status(200).json({ reply: "" });
  }
}
export default async function handler(req, res) {
  return res.status(200).json({ reply: "test cevap" });
}
