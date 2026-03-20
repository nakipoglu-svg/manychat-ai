import fs from "fs";
import path from "path";

function readKnowledgeFile(filename) {
  const filePath = path.join(process.cwd(), "knowledge", filename);
  return fs.readFileSync(filePath, "utf8");
}

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .trim();
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function pickKnowledgeFiles(message) {
  const msg = normalizeText(message);
  const files = ["core_system.txt"];

  // 1) product_laser.txt
  const laserKeywords = [
    "lazer",
    "resimli",
    "foto",
    "fotograf",
    "resim"
  ];
  if (includesAny(msg, laserKeywords)) {
    files.push("product_laser.txt");
  }

  // 2) product_atac.txt
  const atacKeywords = [
    "atac",
    "ataç",
    "harf",
    "harfli",
    "isim"
  ];
  if (includesAny(msg, atacKeywords)) {
    files.push("product_atac.txt");
  }

  // 3) pricing.txt
  const pricingKeywords = [
    "fiyat",
    "ucret",
    "ne kadar",
    "kac tl",
    "indirim"
  ];
  if (includesAny(msg, pricingKeywords)) {
    files.push("pricing.txt");
  }

  // 4) shipping.txt
  const shippingKeywords = [
    "kargo",
    "gonderim",
    "ptt",
    "aras",
    "ucretsiz"
  ];
  if (includesAny(msg, shippingKeywords)) {
    files.push("shipping.txt");
  }

  // 5) payment.txt
  const paymentKeywords = [
    "odeme",
    "iban",
    "eft",
    "havale",
    "kapida odeme"
  ];
  if (includesAny(msg, paymentKeywords)) {
    files.push("payment.txt");
  }

  // 6) order_flow.txt
  const orderFlowKeywords = [
    "siparis",
    "adres",
    "telefon",
    "almak istiyorum",
    "satın al"
  ];
  if (includesAny(msg, orderFlowKeywords)) {
    files.push("order_flow.txt");
  }

  // 7) image_rules.txt
  const imageRulesKeywords = [
    "arka plan",
    "birlestirme",
    "birlestir",
    "arka yuze",
    "tek kare"
  ];
  if (includesAny(msg, imageRulesKeywords)) {
    files.push("image_rules.txt");
  }

  // 8) smalltalk.txt
  const smalltalkKeywords = [
    "tesekkur",
    "merhaba",
    "iyi aksamlar",
    "basiniz sag olsun",
    "dogumum var"
  ];
  if (includesAny(msg, smalltalkKeywords)) {
    files.push("smalltalk.txt");
  }

  // 9) trust.txt
  const trustKeywords = [
    "guven",
    "guvenilir",
    "dolandirici",
    "kararma",
    "iade"
  ];
  if (includesAny(msg, trustKeywords)) {
    files.push("trust.txt");
  }

  // 10) delivery_time.txt
  const deliveryTimeKeywords = [
    "kac gunde",
    "teslim",
    "teslimat",
    "sure",
    "takip"
  ];
  if (includesAny(msg, deliveryTimeKeywords)) {
    files.push("delivery_time.txt");
  }

  return [...new Set(files)];
}

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
    if (!apiKey) {
      return res.status(200).json({ reply: "" });
    }

    const selectedFiles = pickKnowledgeFiles(message);

    const knowledgeText = selectedFiles
      .map((file) => {
        const content = readKnowledgeFile(file);
        return `### ${file}\n${content}`;
      })
      .join("\n\n");

    const systemPrompt = `
Sen Yudum Jewels için çalışan bir Instagram satış asistanısın.

KURALLAR:
- Sadece verilen bilgi dosyalarına göre cevap ver.
- Bilmediğin konuda asla uydurma.
- Bilgi yoksa şu cevabı ver:
  "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"
- Kısa, net, doğal ve satış odaklı yaz.
- Müşteri sormadan gizli tutulması gereken ek ücretli veya opsiyonel bilgileri kendin söyleme.
- Ürün belirtilmemişse ve cevap ürüne göre değişiyorsa, önce müşterinin hangi model ile ilgilendiğini sor.
- Gereksiz uzun açıklama yapma.
`;

    const userPrompt = `
KULLANICI MESAJI:
${message}

KULLANILACAK EĞİTİM DOSYALARI:
${knowledgeText}
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 250,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    const reply =
      data?.content?.map((block) => block?.text || "").join(" ").trim() || "";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(200).json({ reply: "" });
  }
}
