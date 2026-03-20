const fs = require("fs");
const path = require("path");

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "OK" });
    }

    let message = "";
    let topic = "";
    try {
      if (typeof req.body === "string") {
        const parsed = JSON.parse(req.body);
        message = parsed.message || "";
        topic = parsed.topic || "";
      } else {
        message = req.body?.message || "";
        topic = req.body?.topic || "";
      }
    } catch (e) {
      message = "";
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ reply: "" });
    }

    // Knowledge dosyalarını oku
    const knowledgeDir = path.join(process.cwd(), "knowledge");
    
    const readFile = (filename) => {
      try {
        return fs.readFileSync(path.join(knowledgeDir, filename), "utf8");
      } catch {
        return "";
      }
    };

    const coreSystem = readFile("core_system.txt");
    const smalltalk = readFile("smalltalk.txt");
    const trust = readFile("trust.txt");
    const pricing = readFile("pricing.txt");
    const shipping = readFile("shipping.txt");
    const payment = readFile("payment.txt");
    const orderFlow = readFile("order_flow.txt");
    const imageRules = readFile("image_rules.txt");

    // Topic'e göre ürün bilgisi yükle
    let productInfo = "";
    if (topic === "laser") {
      productInfo = readFile("product_laser.txt");
    } else if (topic === "atac") {
      productInfo = readFile("product_atac.txt");
    } else {
      productInfo = readFile("product_laser.txt") + "\n" + readFile("product_atac.txt");
    }

    const systemPrompt = `${coreSystem}

ÜRÜN BİLGİLERİ:
${productInfo}

FİYAT BİLGİLERİ:
${pricing}

KARGO BİLGİLERİ:
${shipping}

ÖDEME BİLGİLERİ:
${payment}

SİPARİŞ SÜRECİ:
${orderFlow}

FOTOĞRAF KURALLARI:
${imageRules}

SMALLTALK:
${smalltalk}

GÜVEN SORULARI:
${trust}

ÖNEMLİ KURALLAR:
- Sadece yukarıdaki bilgilere göre cevap ver.
- Bilmediğin veya burada yazmayan konularda şunu yaz: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"
- Sadece sorulanı cevapla, fazlasını söyleme.
- Kısa ve doğal yaz, robot gibi değil.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: message || "Merhaba"
          }
        ]
      })
    });

    const data = await response.json();
    const reply = data?.content?.[0]?.text?.trim() || "";
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(200).json({ reply: "" });
  }
}
