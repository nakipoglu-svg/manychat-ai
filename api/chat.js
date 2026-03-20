export default async function handler(req, res) {

  // Sadece POST kabul
  if (req.method !== "POST") {
    return res.status(200).json({ reply: "çalışıyor" });
  }

  try {
    const { message, user_product } = req.body || {};

    // 🔥 LOGS
    console.log("BODY:", req.body);

    const userMessage =
      message ||
      req.body?.text ||
      req.body?.last_input ||
      "";

    console.log("MESSAGE:", userMessage);

    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      console.log("API KEY YOK");
      return res.status(200).json({ reply: "API KEY YOK" });
    }

    // =========================
    // 🔥 BURASI KURALLAR BAŞLIYOR
    // =========================

    const systemPrompt = `
Sen Yudum Jewels için çalışan bir Instagram satış asistanısın.

KURALLAR:
- Sadece verilen eğitim içeriğine göre cevap ver.
- Eğitim içeriğinde olmayan hiçbir şeyi söyleme.
- Emin değilsen hiçbir şey yazma.
- Cevapların kısa, net, sıcak ve insan gibi olsun.
- Gereksiz uzun açıklama yapma.
- user_product bilgisi varsa onu öncelikli kabul et.
`;

    const educationPrompt = `
ÜRÜNLER:

[ÜRÜN: lazer_kolye]
- Kişiye özel kolyedir.
- Müşterinin gönderdiği gerçek fotoğraf metal plaka üzerine lazer ile işlenir.
- 2, 3, 4 veya 5 kişi yapılabilir.
- Ayrı fotoğraflardan sadece 2 veya 3 kişi birleştirilebilir.
- 4 veya 5 kişi için birlikte çekilmiş fotoğraf gerekir.
- Kararma yapmaz, suya dayanıklıdır.
- Standart zincir 60 cm'dir.
- EFT/Havale: 599 TL
- Kapıda ödeme: 649 TL
- Kargo dahildir.

[ÜRÜN: atac_kolye]
- Kişiye özel harfli kolyedir.
- Standart 3 harf vardır.
- Ek harf +50 TL'dir.
- Kararma yapmaz.
- Standart zincir 50 cm'dir.
- EFT/Havale: 499 TL
- Kapıda ödeme: 549 TL
- Kargo dahildir.

KARGO:
- PTT Kargo ile gönderilir.
- İstanbul içi 1-2 iş günü
- İstanbul dışı 2-3 iş günü
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 120,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `
user_product: ${user_product || ""}
message: ${userMessage}

Eğitim:
${educationPrompt}
            `
          }
        ]
      })
    });

    const data = await response.json();

    console.log("CLAUDE DATA:", data);

    const reply =
      data?.content?.[0]?.text?.trim() || "";

    console.log("REPLY:", reply);

    return res.status(200).json({ reply });

  } catch (error) {
    console.log("HATA:", error);
    return res.status(200).json({ reply: "Hata oluştu" });
  }
}
