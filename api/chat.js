import fs from "fs";
import path from "path";

const fileCache = {};

function readKnowledgeFile(filename) {
  if (fileCache[filename]) return fileCache[filename];
  const filePath = path.join(process.cwd(), "knowledge", filename);
  const content = fs.readFileSync(filePath, "utf8");
  fileCache[filename] = content;
  return content;
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

function pickKnowledgeFiles(message, userProduct) {
  const msg = normalizeText(message);
  const product = normalizeText(userProduct);

  const files = ["core_system.txt"];
  let productFile = null;
  let topicFile = null;

  // 1) Önce user_product'tan ürün seç
  if (product.includes("lazer")) {
    productFile = "product_laser.txt";
  } else if (product.includes("atac") || product.includes("harf")) {
    productFile = "product_atac.txt";
  } else {
    // 2) user_product boşsa mesajdan ürün tahmini
    const laserKeywords = [
      "lazer", "lazer kolye", "lazerli", "resimli", "resimli kolye",
      "foto kolye", "fotolu", "fotograf kolye", "fotoğraf kolye"
    ];
    const atacKeywords = [
      "atac", "ataç", "harf", "harfli", "harf kolye",
      "isim kolye", "isimli kolye"
    ];

    if (includesAny(msg, laserKeywords)) {
      productFile = "product_laser.txt";
    } else if (includesAny(msg, atacKeywords)) {
      productFile = "product_atac.txt";
    }
  }

  // 3) Tek konu dosyası seç
  if (includesAny(msg, [
    "fiyat", "ucret", "ücret", "indirim", "ne kadar", "kaç tl", "kac tl", "son fiyat"
  ])) {
    topicFile = "pricing.txt";
  } else if (includesAny(msg, [
    "kargo", "teslim", "teslimat", "kaç günde", "kac gunde", "takip"
  ])) {
    topicFile = "shipping.txt";
  } else if (includesAny(msg, [
    "odeme", "ödeme", "iban", "eft", "havale", "kapida odeme", "kapıda ödeme"
  ])) {
    topicFile = "payment.txt";
  } else if (includesAny(msg, [
    "kararma", "kararir", "kararır", "paslanir", "paslanır",
    "guven", "güven", "iade", "degisim", "değişim"
  ])) {
    topicFile = "trust.txt";
  } else if (includesAny(msg, [
    "foto", "fotograf", "fotoğraf", "resim", "kaç kişi", "kac kisi",
    "iki kisi", "iki kişi", "arka plan", "netlestirme", "netleştirme"
  ])) {
    topicFile = "image_rules.txt";
  } else if (includesAny(msg, [
    "siparis", "sipariş", "adres", "telefon", "numara", "satin al", "satın al"
  ])) {
    topicFile = "order_flow.txt";
  }

  if (productFile) files.push(productFile);
  if (topicFile) files.push(topicFile);

  return [...new Set(files)];
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "" });
    }

    let message = "";
    let userProduct = "";

    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      message = body?.message || "";
      userProduct = body?.user_product || "";
    } catch {
      message = "";
      userProduct = "";
    }

    if (!message) {
      return res.status(200).json({
        reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"
      });
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"
      });
    }

    const selectedFiles = pickKnowledgeFiles(message, userProduct);

    const knowledgeText = selectedFiles
      .map((file) => {
        try {
          const content = readKnowledgeFile(file);
          return `### ${file}\n${content}`;
        } catch {
          return "";
        }
      })
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = `
Sen Yudum Jewels için çalışan bir Instagram satış asistanısın.

KURALLAR:
- Sadece verilen bilgi dosyalarına göre cevap ver.
- Bilmediğin konuda asla uydurma.
- Bilgi yoksa şu cevabı ver:
Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊
- Kısa, net, doğal ve satış odaklı yaz.
- Eğer user_product doluysa bunu öncelikli ürün bilgisi kabul et.
- Ürün belirtilmemişse ve user_product da boşsa, cevap ürüne göre değişiyorsa hangi model ile ilgilendiğini sor.
- Müşteri sormadıkça ek ücretli veya opsiyonel bilgileri söyleme.
- Cevap verirken yalnızca sorulan şeyi cevapla.
- Ek açıklama, öneri veya alternatif sunma.
- Ürünleri birbirine karıştırma.
- Belirsiz ifadelerde tahmin yapma; gerekirse kısa netleştirme sorusu sor.
`;

    const userPrompt = `
KULLANICI MESAJI:
${message}

KULLANICI ÜRÜN BİLGİSİ:
${userProduct}
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 250,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" }
          },
          {
            type: "text",
            text: knowledgeText,
            cache_control: { type: "ephemeral" }
          }
        ],
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
      data?.content?.map((block) => block?.text || "").join(" ").trim() ||
      "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";

    return res.status(200).json({ reply });
  } catch {
    return res.status(200).json({
      reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"
    });
  }
}
