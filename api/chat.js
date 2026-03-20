export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "GET OK" });
    }
 
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
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Kullanıcı mesajı: ${message}. Kısa ve net cevap ver.`
          }
        ]
      })
    });

    const data = await response.json();

    return res.status(200).json({
      reply: data?.content?.[0]?.text || "",
      debug_status: response.status,
      debug_data: data
    });

  } catch (err) {
    return res.status(200).json({
      reply: "",
      debug_error: String(err)
    });
  }
}
export default async function handler(req, res) {
  try {
    const apiKey = process.env.CLAUDE_API_KEY;

    return res.status(200).json({
      starts_with: apiKey ? apiKey.slice(0, 7) : "YOK",
      length: apiKey ? apiKey.length : 0
    });
  } catch (err) {
    return res.status(200).json({ error: String(err) });
  }
}
