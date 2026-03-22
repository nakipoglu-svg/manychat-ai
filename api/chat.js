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

function unwrapManychatValue(value) {
  if (value === null || value === undefined) return "";

  let str = String(value).trim();

  // "{{deger}}" veya "{{{deger}}}" kalıplarını temizle
  str = str.replace(/^\{\{\{?/, "").replace(/\}\}\}?$/, "").trim();

  if (
    !str ||
    str.toLowerCase() === "no field selected" ||
    str.toLowerCase() === "undefined" ||
    str.toLowerCase() === "null"
  ) {
    return "";
  }

  return str;
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

function pickKnowledgeFiles(message, userProduct, conversationStage = "") {
  const msg = normalizeText(message);
  const product = normalizeText(userProduct);
  const stage = normalizeText(conversationStage);

  const files = ["core_system.txt"];
  let productFile = null;
  let topicFile = null;

  if (product.includes("lazer")) {
    productFile = "product_laser.txt";
  } else if (product.includes("atac") || product.includes("harf")) {
    productFile = "product_atac.txt";
  } else {
    const laserKeywords = [
      "lazer",
      "lazer kolye",
      "lazerli",
      "resimli",
      "resimli kolye",
      "foto kolye",
      "fotolu",
      "fotograf kolye",
      "fotoğraf kolye"
    ];

    const atacKeywords = [
      "atac",
      "ataç",
      "harf",
      "harfli",
      "harf kolye",
      "isim kolye",
      "isimli kolye"
    ];

    if (includesAny(msg, laserKeywords)) {
      productFile = "product_laser.txt";
    } else if (includesAny(msg, atacKeywords)) {
      productFile = "product_atac.txt";
    }
  }

  if (stage.includes("photo_waiting") || stage.includes("photo_received")) {
    topicFile = "image_rules.txt";
  } else if (stage.includes("letter_waiting") || stage.includes("letter_received")) {
    topicFile = "order_flow.txt";
  } else if (stage.includes("payment")) {
    topicFile = "payment.txt";
  } else if (stage.includes("address")) {
    topicFile = "order_flow.txt";
  }

  if (!topicFile) {
    if (
      includesAny(msg, [
        "fiyat",
        "ucret",
        "ücret",
        "indirim",
        "ne kadar",
        "kaç tl",
        "kac tl",
        "son fiyat"
      ])
    ) {
      topicFile = "pricing.txt";
    } else if (
      includesAny(msg, [
        "kargo",
        "teslim",
        "teslimat",
        "kaç günde",
        "kac gunde",
        "takip"
      ])
    ) {
      topicFile = "shipping.txt";
    } else if (
      includesAny(msg, [
        "odeme",
        "ödeme",
        "iban",
        "eft",
        "havale",
        "kapida odeme",
        "kapıda ödeme"
      ])
    ) {
      topicFile = "payment.txt";
    } else if (
      includesAny(msg, [
        "kararma",
        "kararir",
        "kararır",
        "paslanir",
        "paslanır",
        "guven",
        "güven",
        "iade",
        "degisim",
        "değişim",
        "garanti"
      ])
    ) {
      topicFile = "trust.txt";
    } else if (
      includesAny(msg, [
        "foto",
        "fotograf",
        "fotoğraf",
        "resim",
        "kaç kişi",
        "kac kisi",
        "iki kisi",
        "iki kişi",
        "arka plan",
        "netlestirme",
        "netleştirme"
      ])
    ) {
      topicFile = "image_rules.txt";
    } else if (
      includesAny(msg, [
        "siparis",
        "sipariş",
        "adres",
        "telefon",
        "numara",
        "satin al",
        "satın al"
      ])
    ) {
      topicFile = "order_flow.txt";
    } else if (
      includesAny(msg, [
        "tesekkur",
        "teşekkür",
        "sağol",
        "sagol",
        "memnun"
      ])
    ) {
      topicFile = "smalltalk.txt";
    }
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
    let conversationStage = "";
    let photoReceived = "";
    let paymentMethod = "";
    let menuGosterildi = "";
    let aiReply = "";

    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      message = unwrapManychatValue(body?.message || "");
      userProduct = unwrapManychatValue(body?.user_product || body?.ilgilenilen_urun || "");
      conversationStage = unwrapManychatValue(body?.conversation_stage || "");
      photoReceived = unwrapManychatValue(body?.photo_received || "");
      paymentMethod = unwrapManychatValue(body?.payment_method || "");
      menuGosterildi = unwrapManychatValue(body?.menu_gosterildi || "");
      aiReply = unwrapManychatValue(body?.ai_reply || "");

      console.log(
        "MANYCHAT BODY:",
        JSON.stringify(
          {
            message,
            userProduct,
            conversationStage,
            photoReceived,
            paymentMethod,
            menuGosterildi,
            aiReply
          },
          null,
          2
        )
      );
    } catch {
      message = "";
      userProduct = "";
      conversationStage = "";
      photoReceived = "";
      paymentMethod = "";
      menuGosterildi = "";
      aiReply = "";
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

    const selectedFiles = pickKnowledgeFiles(message, userProduct, conversationStage);

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

BAĞLAM KURALLARI:
- conversation_stage çok önemlidir. Müşterinin konuşmadaki mevcut aşamasını gösterir.
- Eğer conversation_stage doluysa, konuşmayı o aşamaya göre yorumla.
- photo_received=yes ise müşteriye tekrar fotoğraf gönderin deme.
- conversation_stage=photo_waiting ise müşteri yeni mesaj gönderdiğinde bunun büyük ihtimalle fotoğraf veya fotoğrafla ilgili sipariş içeriği olduğunu dikkate al.
- conversation_stage=photo_received ise müşterinin sonraki kısa mesajlarını (isim, tarih, yazı, renk, kısa onay vb.) sipariş detayı olarak yorumla.
- conversation_stage=letter_waiting ise gelen kısa mesajları seçilen harfler olarak yorumla.
- conversation_stage=address_received ise artık ürün tanıtımı veya başa dönüş yapma.
- "evet", "tamam", "olur", "amin", "bulut", tarih, isim gibi kısa mesajları son aktif bağlama göre yorumla.
- Müşteri daha önce hangi aşamadaysa, tekrar merhaba diyerek başa dönme.
`;

    const userPrompt = `
KULLANICI MESAJI:
${message}

KULLANICI ÜRÜN BİLGİSİ:
${userProduct || "-"}

KONUŞMA AŞAMASI:
${conversationStage || "-"}

FOTOĞRAF GELDİ Mİ:
${photoReceived || "-"}

ÖDEME YÖNTEMİ:
${paymentMethod || "-"}

MENÜ GÖSTERİLDİ Mİ:
${menuGosterildi || "-"}

ÖNCEKİ AI CEVABI:
${aiReply || "-"}
`;

    const payload = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral", ttl: "1h" }
        },
        {
          type: "text",
          text: knowledgeText,
          cache_control: { type: "ephemeral", ttl: "1h" }
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
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log("CLAUDE RESPONSE:", JSON.stringify(data, null, 2));

    const reply =
      data?.content?.map((block) => block?.text || "").join(" ").trim() ||
      "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("chat.js error:", err);
    return res.status(200).json({
      reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"
    });
  }
}
