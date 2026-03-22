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
  if (s.includes("back_text")) return "back_text_waiting";
  if (s.includes("letter_wait")) return "letter_waiting";
  if (s.includes("letter_receive")) return "letter_received";
  if (s.includes("address_receive")) return "address_received";
  if (s.includes("address_wait")) return "address_waiting";
  if (s.includes("payment_selected")) return "payment_selected";
  if (s.includes("order_complete")) return "order_complete";
  if (s.includes("menu")) return "menu_gosterildi";
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

  if (stage.includes("photo_wait") || stage.includes("photo_receive") || stage.includes("back_text")) {
    topicFile = "image_rules.txt";
  } else if (stage.includes("letter")) {
    topicFile = "order_flow.txt";
  } else if (stage.includes("payment")) {
    topicFile = "payment.txt";
  } else if (stage.includes("address")) {
    topicFile = "order_flow.txt";
  }

  if (!topicFile) {
    if (includesAny(msg, ["fiyat", "ucret", "ne kadar", "kac tl", "indirim"])) {
      topicFile = "pricing.txt";
    } else if (includesAny(msg, ["kargo", "teslim", "teslimat", "takip"])) {
      topicFile = "shipping.txt";
    } else if (includesAny(msg, ["odeme", "iban", "eft", "havale", "kapida"])) {
      topicFile = "payment.txt";
    } else if (includesAny(msg, ["guven", "garanti", "iade", "kararma", "paslanir"])) {
      topicFile = "trust.txt";
    } else if (includesAny(msg, ["foto", "fotograf", "resim", "kac kisi", "arka"])) {
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

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const message = unwrapManychatValue(body?.message || "");
    const userProduct = unwrapManychatValue(body?.user_product || body?.ilgilenilen_urun || "");
    const conversationStage = normalizeStageName(unwrapManychatValue(body?.conversation_stage || ""));
    const photoReceived = unwrapManychatValue(body?.photo_received || "");
    const paymentMethod = unwrapManychatValue(body?.payment_method || "");
    const menuGosterildi = unwrapManychatValue(body?.menu_gosterildi || "");
    const fullContactData = body?.full_contact_data || null;

    console.log("BODY:", JSON.stringify({
      message, userProduct, conversationStage,
      photoReceived, paymentMethod
    }, null, 2));

    // --- FOTOĞRAF ALGILAMA ---
    const isPhotoMessage =
      body?.message_type === "image" ||
      body?.attachments?.some((a) => a?.type === "image") ||
      fullContactData?.last_input_type === "image";

    if (isPhotoMessage && conversationStage === "photo_waiting") {
      return res.status(200).json({
        reply: "Fotoğrafınız ulaştı 😊 Ekibimiz inceleyip size hemen dönüş sağlayacak.",
        set_conversation_stage: "photo_received",
        set_photo_received: "yes",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    // Mesaj boşsa sessiz kal
    if (!message) {
      return res.status(200).json({
        reply: "",
        set_conversation_stage: "",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    // photo_received → Claude halleder (arka yazı veya adrese geçiş)

    // --- ARKA YAZI BEKLENİYOR ---
    if (conversationStage === "back_text_waiting") {
      const msg = normalizeText(message);

      // Müşteri hayır / istemiyorum derse adrese geç
      if (includesAny(msg, ["hayir", "istemiyorum", "gerek yok", "yok", "bos kalsin"])) {
        return res.status(200).json({
          reply: "Tamamdır efendim 😊 Adresinizi alabilir miyiz? Ad soyad, cep telefonu ve açık adresinizi yazabilirsiniz.",
          set_conversation_stage: "address_waiting",
          set_photo_received: "",
          set_payment_method: "",
          set_menu_gosterildi: ""
        });
      }

      // Müşteri arka yazıyı onayladıysa veya bir şey yazdıysa adrese geç
      return res.status(200).json({
        reply: "Tabi efendim, yazarız 😊 Adresinizi alabilir miyiz? Ad soyad, cep telefonu ve açık adresinizi yazabilirsiniz.",
        set_conversation_stage: "address_waiting",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    // --- ATAÇ KOLYE HARF AŞAMASI ---
    if (conversationStage === "letter_waiting") {
      return res.status(200).json({
        reply: "Tamamdır efendim 😊 Adresinizi alabilir miyiz? Ad soyad, cep telefonu ve açık adresinizi yazabilirsiniz.",
        set_conversation_stage: "address_waiting",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    // --- ADRES AŞAMASI ---
    if (conversationStage === "address_waiting") {
      if (hasPhoneNumber(message)) {
        if (paymentMethod === "eft" || paymentMethod === "kapida_odeme") {
          return res.status(200).json({
            reply: "Adresiniz kaydedildi, teşekkürler 😊",
            set_conversation_stage: "order_complete",
            set_photo_received: "",
            set_payment_method: "",
            set_menu_gosterildi: ""
          });
        }
        return res.status(200).json({
          reply: "Adresiniz kaydedildi, teşekkürler 😊 EFT mi yoksa kapıda ödeme mi tercih edersiniz?",
          set_conversation_stage: "address_received",
          set_photo_received: "",
          set_payment_method: "",
          set_menu_gosterildi: ""
        });
      }

      // Telefon gelmedi - sessiz kal
      return res.status(200).json({
        reply: "",
        set_conversation_stage: "",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    // --- ADRES ALINDI, ÖDEME BEKLENİYOR ---
    if (conversationStage === "address_received") {
      const msg = normalizeText(message);
      let detectedPayment = "";

      if (includesAny(msg, ["eft", "havale", "iban", "transfer", "gondereyim", "atayim"])) {
        detectedPayment = "eft";
      } else if (includesAny(msg, ["kapida", "kapi", "kapıda", "kapı"])) {
        detectedPayment = "kapida_odeme";
      }

      if (detectedPayment) {
        return res.status(200).json({
          reply: detectedPayment === "eft"
            ? "Tamamdır efendim 😊 IBAN bilgimiz:\nTR34 0015 7000 0000 0076 2524 67\nAlıcı: Servet Cihan Nakipoğlu"
            : "Tamamdır efendim 😊 Kapıda ödeme ile siparişiniz hazırlanacaktır.",
          set_conversation_stage: "order_complete",
          set_photo_received: "",
          set_payment_method: detectedPayment,
          set_menu_gosterildi: ""
        });
      }
    }

    // --- ÖDEME SEÇİLDİ AMA ADRES HENÜZ GELMEDİ ---
    if (paymentMethod && conversationStage !== "order_complete" && conversationStage !== "address_waiting") {
      if (hasPhoneNumber(message)) {
        return res.status(200).json({
          reply: "Adresiniz kaydedildi, teşekkürler 😊",
          set_conversation_stage: "order_complete",
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

FOTOĞRAF KURALLARI (ÇOK ÖNEMLİ):
- Fotoğraf hakkında KESİNLİKLE yorum yapma. "Güzel", "kötü", "olur", "olmaz" deme.
- Fotoğraf geldiğinde sadece: "Fotoğrafınız ulaştı 😊 Ekibimiz inceleyip size hemen dönüş sağlayacak."
- Müşteri "bu fotoğraf olur mu" diye sorarsa: "Ekibimiz inceleyip size dönüş sağlayacak efendim 😊"
- photo_received=yes ise tekrar fotoğraf isteme.

ARKA YAZI KURALLARI:
- conversation_stage=photo_received iken müşteri mesaj yazıyorsa bu arka yazı talebi veya sorusudur.
- Müşteri arka yazı sorarsa: "Ne isterseniz yazarız efendim, aklınıza ne gelirse. Çok uzun olursa sizi uyarırız 😊" de ve set_conversation_stage="back_text_waiting" döndür.
- Müşteri arka yazı yazdıysa: "Tabi efendim, yazarız 😊" de ve set_conversation_stage="back_text_waiting" döndür.
- Kendi kafandan öneri yapma, abartılı övgü yapma.

BAĞLAM KURALLARI:
- conversation_stage=photo_received ise kısa mesajları arka yazı talebi olarak yorumla.
- conversation_stage=back_text_waiting ise müşteri arka yazıyı vermiş kabul et, adrese geç.
- conversation_stage=letter_waiting ise kısa metinleri seçilen harfler olarak yorumla.
- conversation_stage=address_received ise adres zaten alınmış, tekrar adres isteme.
- Daha önce alınmış bilgileri tekrar isteme.

STATE GÜNCELLEME KURALLARI:
- Müşteri EFT seçerse: set_payment_method="eft"
- Müşteri kapıda ödeme seçerse: set_payment_method="kapida_odeme"
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
KULLANICI: ${JSON.stringify({
  ig_username: fullContactData?.ig_username || "",
  last_input: fullContactData?.last_input_text || ""
})}
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
    const newStage = normalizeStageName(unwrapManychatValue(parsed?.set_conversation_stage || ""));
    const newPayment = unwrapManychatValue(parsed?.set_payment_method || "");
    const currentPayment = newPayment || paymentMethod;
    const currentStage = newStage || conversationStage;

    // Adres + ödeme ikisi de tamamsa order_complete
    const isOrderComplete =
      currentStage === "address_received" &&
      (currentPayment === "eft" || currentPayment === "kapida_odeme");

    return res.status(200).json({
      reply,
      set_conversation_stage: isOrderComplete ? "order_complete" : newStage,
      set_photo_received: unwrapManychatValue(parsed?.set_photo_received || ""),
      set_payment_method: newPayment,
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
