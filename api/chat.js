export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "OK" });
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
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await response.json();

    const reply = data?.content?.[0]?.text || "";

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(200).json({ reply: "" });
  }
}
