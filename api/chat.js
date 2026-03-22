import fs from "fs";
import path from "path";

// --- YARDIMCI FONKSİYONLAR ---

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
  str = str.replace(/^\{\{\{?/, "").replace(/\}\}\}?$/, "").trim();
  if (/^\{[^}]+\}$/.test(str)) return "";
  if (!str || ["no field selected", "undefined", "null"].includes(str.toLowerCase())) return "";
  return str;
}

function extractJsonText(rawText) {
  if (!rawText) return "";
  let text = String(rawText).trim();
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
  return text;
}

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .trim();
}

function normalizeStageName(stage) {
  const s = normalizeText(stage);
  if (!s) return "";
  if (s.includes("photo_wait")) return "photo_waiting";
  if (s.includes("photo_receive")) return "photo_received";
  if (s.includes("letter_wait")) return "letter_waiting";
  if (s.includes("address_receive")) return "address_received";
  if (s.includes("address_wait")) return "address_waiting";
  if (s.includes("payment_selected")) return "payment_selected";
  if (s.includes("payment_wait")) return "payment_waiting";
  return s;
}

function includesAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function hasPhoneNumber(text) {
  const cleaned = String(text || "").replace(/\s+/g, "");
  return /(\+?[\d]{10,})/.test(cleaned);
}

// --- ÜRÜNE GÖRE DOSYA SEÇİMİ ---

function pickKnowledgeFiles(message, userProduct, conversationStage) {
  const msg = normalizeText(message);
  const product = normalizeText(userProduct);
  const stage = normalizeText(conversationStage);

  const files = ["core_system.txt"];
  let productFile = null;
  let topicFile = null;

  // Ürün tespiti
  if (product.includes("lazer")) {
    productFile = "product_laser.txt";
  } else if (product.includes("atac") || product.includes("harf")) {
    productFile = "product_atac.txt";
  } else {
    if (includesAny(msg, ["lazer", "resimli", "fotografli", "fotograf", "foto"])) {
      productFile = "product_laser.txt";
    } else if (includesAny(msg, ["atac", "ataç", "harf", "harfli", "isim kolye"])) {
      productFile = "product_atac.txt";
    }
  }

  // Stage'e göre konu dosyası
  if (stage.includes("photo_wait") || stage.includes("photo_receive")) {
    topicFile = "image_rules.txt";
  } else if (stage.includes("letter_wait")) {
    topicFile = "order_flow.txt";
  } else if (stage.includes("payment")) {
    topicFile = "payment.txt";
  } else if (stage.includes("address")) {
    topicFile = "order_flow.txt";
  }

  // Mesaja göre konu dosyası (stage yoksa)
  if (!topicFile) {
    if (includesAny(msg, ["fiyat", "ucret", "ne kadar", "kac tl", "indirim"])) {
      topicFile = "pricing.txt";
    } else if (includesAny(msg, ["kargo", "teslim", "teslimat", "takip"])) {
      topicFile = "shipping.txt";
    } else if (includesAny(msg, ["odeme", "iban", "eft", "havale", "kapida"])) {
      topicFile = "payment.txt";
    } else if (includesAny(msg, ["guven", "garanti", "iade", "kararma", "paslanir"])) {
      topicFile = "trust.txt";
    } else if (includesAny(msg, ["foto", "fotograf", "resim", "kac kisi", "arka plan"])) {
      topicFile = "image_rules.txt";
    } else if (includesAny(msg, ["siparis", "adres", "telefon", "satin al"])) {
      topicFile = "order_flow.txt";
    } else if (includesAny(msg, ["tesekkur", "sagol", "memnun"])) {
      topicFile = "smalltalk.txt";
    }
  }

  if (productFile) files.push(productFile);
  if (topicFile) files.push(topicFile);

  return [...new Set(files)];
}

// --- ANA HANDLER ---

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "" });
    }

    // Body parse
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const message = unwrapManychatValue(body?.message || "");
    const userProduct = unwrapManychatValue(body?.user_product || body?.ilgilenilen_urun || "");
    const conversationStage = normalizeStageName(unwrapManychatValue(body?.conversation_stage || ""));
    const photoReceived = unwrapManychatValue(body?.photo_received || "");
    const paymentMethod = unwrapManychatValue(body?.payment_method || "");
    const menuGosterildi = unwrapManychatValue(body?.menu_gosterildi || "");
    const aiReply = unwrapManychatValue(body?.ai_reply || "");
    const fullContactData = body?.full_contact_data || null;

    console.log("BODY:", JSON.stringify({ message, userProduct, conversationStage, photoReceived, paymentMethod }, null, 2));

    if (!message) {
      return res.status(200).json({
        reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
        set_conversation_stage: "",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    // --- ADRES AŞAMASI MANTIĞI ---
    // address_waiting'deyken:
    // - Telefon numarası geldiyse → adres tamamdır
    // - Başka bir şey geldiyse → sessiz kal (boş reply döndür, ManyChat devam eder)

    if (conversationStage === "address_waiting") {
      if (hasPhoneNumber(message)) {
        return res.status(200).json({
          reply: "Adresiniz kaydedildi, teşekkürler 😊 Siparişiniz en kısa sürede hazırlanacaktır.",
          set_conversation_stage: "address_received",
          set_photo_received: "",
          set_payment_method: "",
          set_menu_gosterildi: ""
        });
      } else {
        // Telefon gelmedi, sessiz bekle
        return res.status(200).json({
          reply: "",
          set_conversation_stage: "",
          set_photo_received: "",
          set_payment_method: "",
          set_menu_gosterildi: ""
        });
      }
    }

    // --- CLAUDE API ---

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
        set_conversation_stage: "",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    const selectedFiles = pickKnowledgeFiles(message, userProduct, conversationStage);
    const knowledgeText = selectedFiles
      .map((file) => {
        try {
          return `### ${file}\n${readKnowledgeFile(file)}`;
        } catch {
          return "";
        }
      })
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = `
Sen Yudum Jewels için çalışan bir Instagram satış asistanısın.

GÖREVİN:
- Kısa, net, doğal ve satış odaklı cevap vermek.
- Sadece verilen bilgi dosyalarına göre cevap vermek.
- Bilmediğin konuda asla uydurmamak.

GENEL KURALLAR:
- Bilgi yoksa: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"
- user_product doluysa bunu öncelikli ürün bilgisi kabul et.
- Ürün belirtilmemişse ve cevap ürüne göre değişiyorsa hangi model olduğunu sor.
- Müşteri sormadıkça ek ücretli veya opsiyonel bilgileri söyleme.
- Sadece sorulan şeyi cevapla, gereksiz ek bilgi verme.
- Ürünleri birbirine karıştırma.
- Müşteri daha önce hangi aşamadaysa tekrar başa dönme.
- Kısa cevapları bağlama göre yorumla.

BAĞLAM KURALLARI:
- conversation_stage çok önemlidir.
- photo_received=yes ise tekrar fotoğraf isteme.
- conversation_stage=photo_received ise kısa mesajları sipariş detayı olarak yorumla.
- conversation_stage=letter_waiting ise kısa metinleri seçilen harfler olarak yorumla.
- conversation_stage=address_received ise adres zaten alınmış, tekrar adres isteme.
- conversation_stage=payment_selected ise tekrar adres veya ödeme sorma.
- Daha önce alınmış bilgileri tekrar isteme.

STATE GÜNCELLEME KURALLARI:
- Müşteri ödeme yöntemini seçtiğinde set_payment_method doldur.
- EFT seçildiyse set_payment_method="eft", kapıda ödeme seçildiyse set_payment_method="kapida_odeme"
- Ödeme tercihi netleşince set_conversation_stage="payment_selected" yap.
- Emin değilsen alanları boş bırak.

ÇIKIŞ FORMATI - YALNIZCA GEÇERLİ JSON:
{
  "reply": "müşteriye verilecek cevap",
  "set_conversation_stage": "",
  "set_photo_received": "",
  "set_payment_method": "",
  "set_menu_gosterildi": ""
}
`;

    const userPrompt = `
KULLANICI MESAJI: ${message}
ÜRÜN: ${userProduct || "-"}
KONUŞMA AŞAMASI: ${conversationStage || "-"}
FOTOĞRAF GELDİ Mİ: ${photoReceived || "-"}
ÖDEME YÖNTEMİ: ${paymentMethod || "-"}
MENÜ GÖSTERİLDİ Mİ: ${menuGosterildi || "-"}
ÖNCEKİ AI CEVABI: ${aiReply || "-"}
KULLANICI: ${JSON.stringify({ ig_username: fullContactData?.ig_username || "", last_input: fullContactData?.last_input_text || "" })}
`;

    const payload = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
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
          content: [{ type: "text", text: userPrompt }]
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
    console.log("CLAUDE:", JSON.stringify(data, null, 2));

    const rawText = data?.content?.map((b) => b?.text || "").join(" ").trim() || "";
    const cleanedText = extractJsonText(rawText);

    let parsed = null;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      parsed = null;
    }

    const reply = parsed?.reply?.trim() || "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";

    return res.status(200).json({
      reply,
      set_conversation_stage: normalizeStageName(unwrapManychatValue(parsed?.set_conversation_stage || "")),
      set_photo_received: unwrapManychatValue(parsed?.set_photo_received || ""),
      set_payment_method: unwrapManychatValue(parsed?.set_payment_method || ""),
      set_menu_gosterildi: unwrapManychatValue(parsed?.set_menu_gosterildi || "")
    });

  } catch (err) {
    console.error("chat.js error:", err);
    return res.status(200).json({
      reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
      set_conversation_stage: "",
      set_photo_received: "",
      set_payment_method: "",
      set_menu_gosterildi: ""
    });
  }
}
