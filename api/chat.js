export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "" });
    }

    let message = "";
    try {
      if (typeof req.body === "string") {
        const parsed = JSON.parse(req.body);
        message = parsed.message || "";
      } else {
        message = req.body?.message || "";
      }
    } catch (e) {
      message = "";
    }

    const apiKey = process.env.CLAUDE_API_KEY;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: message || "Merhaba"
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    return res.status(200).json({
      reply: data?.content?.[0]?.text || JSON.stringify(data)
    });
  } catch (err) {
    return res.status(200).json({ reply: String(err) });
  }
}
