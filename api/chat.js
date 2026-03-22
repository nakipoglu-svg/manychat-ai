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
    .replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/ı/g, "i").replace(/ö/g, "o")
    .replace(/ş/g, "s").replace(/ü/g, "u")
    .trim();
}

function normalizeStageName(stage) {
  const s = normalizeText(stage);
  if (!s) return "";
  if (s.includes("photo_wait")) return "photo_waiting";
  if (s.includes("photo_receive")) return "photo_received";
  if (s.includes("back_text")) return "back_text_waiting";
  if (s.includes("letter_wait")) return "letter_waiting";
  if (s.includes("address_receive")) return "address_received";
  if (s.includes("address_wait")) return "address_waiting";
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

function isDefinitePaymentDecision(text) {
  const msg = normalizeText(text);
  return includesAny(msg, [
    "eft yapacagim", "eft yapayim", "eft olsun", "eft ile",
    "havale yapacagim", "havale yapayim", "havale olsun",
    "kapida odeme olsun", "kapida odeme istiyorum", "kapida odeme yapacagim",
    "kapida olsun", "kapida yapacagim", "kapida istiyorum",
    "eft istiyorum", "eft seciyorum"
  ]);
}

function detectPaymentMethod(text) {
  const msg = normalizeText(text);
  if (includesAny(msg, ["kapida", "kapi"])) return "kapida_odeme";
  if (includesAny(msg, ["eft", "havale", "iban", "transfer"])) return "eft";
  return "";
}

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
    } else if (includesAny(msg, ["atac", "harf", "harfli", "isim kolye"])) {
      productFile = "product_atac.txt";
    }
  }

  if (stage.includes("photo") || stage.includes("back_text")) {
    topicFile = "image_rules.txt";
  } else if (stage.includes("letter")) {
    topicFile = "order_flow.txt";
  } else if (stage.includes("address")) {
    topicFile = "order_flow.txt";
  } else if (includesAny(msg, ["fiyat", "ucret", "ne kadar", "kac tl", "indirim"])) {
    topicFile = "pricing.txt";
  } else if (includesAny(msg, ["kargo", "teslim", "teslimat", "takip"])) {
    topicFile = "shipping.txt";
  } else if (includesAny(msg, ["odeme", "iban", "eft", "havale", "kapida"])) {
    topicFile = "payment.txt";
  } else if (includesAny(msg, ["guven", "garanti", "iade", "kararma", "paslanir"])) {
    topicFile = "trust.txt";
  } else if (includesAny(msg, ["foto", "fotograf", "resim", "arka"])) {
    topicFile = "image_rules.txt";
  } else if (includesAny(msg, ["siparis", "adres", "telefon"])) {
    topicFile = "order_flow.txt";
  } else if (includesAny(msg, ["tesekkur", "sagol", "memnun"])) {
    topicFile = "smalltalk.txt";
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

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const message = unwrapManychatValue(body?.message || "");
    const userProduct = unwrapManychatValue(body?.user_product || body?.ilgilenilen_urun || "");
    const conversationStage = normalizeStageName(unwrapManychatValue(body?.conversation_stage || ""));
    const photoReceived = unwrapManychatValue(body?.photo_received || "");
    const paymentMethod = unwrapManychatValue(body?.payment_method || "");
    const fullContactData = body?.full_contact_data || null;

    console.log("BODY:", JSON.stringify({ message, userProduct, conversationStage, photoReceived, paymentMethod }, null, 2));

    // --- FOTOGRAF ALGILAMA ---
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

    // Mesaj bossa sessiz kal
    if (!message) {
      return res.status(200).json({
        reply: "",
        set_conversation_stage: "",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    // --- ARKA YAZI ALINDI → ADRES SOR ---
    if (conversationStage === "back_text_waiting") {
      return res.status(200).json({
        reply: "Tamamdır efendim 😊 Adresinizi alabilir miyiz? Ad soyad, cep telefonu ve açık adresinizi yazabilirsiniz.",
        set_conversation_stage: "address_waiting",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    // --- ATAC KOLYE HARFLERI → ADRES SOR ---
    if (conversationStage === "letter_waiting") {
      return res.status(200).json({
        reply: "Tamamdır efendim 😊 Adresinizi alabilir miyiz? Ad soyad, cep telefonu ve açık adresinizi yazabilirsiniz.",
        set_conversation_stage: "address_waiting",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    // --- ADRES ASAMASI ---
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
          reply: "Adresiniz kaydedildi, teşekkürler 😊 Ödemeniz nasıl olacak efendim? EFT / havale veya kapıda ödeme seçeneklerimiz mevcut.",
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

    // --- ADRES ALINDI, ODEME BEKLENIYOR ---
    if (conversationStage === "address_received") {
      if (isDefinitePaymentDecision(message)) {
        const payment = detectPaymentMethod(message);
        if (payment) {
          return res.status(200).json({
            reply: payment === "eft"
              ? "Tamamdır efendim 😊 IBAN bilgimiz:\nTR34 0015 7000 0000 0076 2524 67\nAlıcı: Servet Cihan Nakipoğlu"
              : "Tamamdır efendim 😊 Kapıda ödeme ile siparişiniz hazırlanacaktır.",
            set_conversation_stage: "order_complete",
            set_photo_received: "",
            set_payment_method: payment,
            set_menu_gosterildi: ""
          });
        }
      }
      // Sadece soru soruyorsa Claude halleder - asagida devam eder
    }

    // --- ODEME SECILDI AMA ADRES HENUZ GELMEDİ ---
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
      .map((file) => { try { return `### ${file}\n${readKnowledgeFile(file)}`; } catch { return ""; } })
      .filter(Boolean).join("\n\n");

    const systemPrompt = `Sen Yudum Jewels icin calisan bir Instagram satis asistanisin.
Kisa, net, dogal cevaplar ver. Sadece verilen bilgi dosyalarina gore cevap ver.

GENEL KURALLAR:
- Bilgi yoksa: "Ekibimize iletiyorum, en kisa surede donus yapilacaktir"
- user_product doluysa bunu oncelikli urun bilgisi kabul et.
- Urun belirtilmemisse hangi model oldugunu sor.
- Sadece sorulan seyi cevapla. Urunleri karistirma.

FOTOGRAF KURALLARI:
- Fotograf hakkinda KESINLIKLE yorum yapma.
- "bu fotograf olur mu" sorusuna: "Ekibimiz inceleyip size donus saglayacak efendim"
- photo_received=yes ise tekrar fotograf isteme.

ARKA YAZI / ARKA RESIM KURALLARI (COK ONEMLI):
- conversation_stage=photo_received iken musteri arka yuze bir sey yapilmasini istiyorsa:
  1. Onay ver: "Tabi efendim, yazariz" veya "Tabi efendim, yapariz"
  2. Hemen ardindan adres sor: "Adresinizi alabilir miyiz? Ad soyad, cep telefonu ve acik adresinizi yazabilirsiniz."
  3. set_conversation_stage="back_text_waiting" dondur
- Musteri arka yuz istemiyorsa: "Tamamdir efendim" de, set_conversation_stage="address_waiting" dondur.
- Musteri ne yazilir diye sorarsa once ornekler ver (isim, tarih, anlamli cumle), sonra back_text_waiting set et.

ODEME KURALLARI (COK ONEMLI):
- Musteri sadece FIYAT SORUYORSA payment SET ETME. Sadece fiyat soyle.
- Payment SADECE su durumlarda set edilir:
  * Musteri "EFT yapacagim / olsun / istiyorum" derse → set_payment_method="eft"
  * Musteri "kapida odeme olsun / istiyorum / yapacagim" derse → set_payment_method="kapida_odeme"
  * Sen odeme sorduktan sonra sadece "EFT" veya "kapida" yazarsa → set et
- Karar vermeden set etme!

BAGLA M KURALLARI:
- conversation_stage=photo_received → arka yuz konusu → back_text_waiting set et + adres sor
- conversation_stage=address_received → odeme bekleniyor, adres tekrar isteme
- Daha once alinmis bilgileri tekrar isteme.

CIKIS FORMATI - SADECE GECERLI JSON:
{"reply":"cevap","set_conversation_stage":"","set_photo_received":"","set_payment_method":"","set_menu_gosterildi":""}`;

    const userPrompt = `MESAJ: ${message}
URUN: ${userProduct || "-"}
STAGE: ${conversationStage || "-"}
FOTOGRAF: ${photoReceived || "-"}
ODEME: ${paymentMethod || "-"}`;

    const payload = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 350,
      system: [
        { type: "text", text: systemPrompt, cache_control: { type: "ephemeral", ttl: "1h" } },
        { type: "text", text: knowledgeText, cache_control: { type: "ephemeral", ttl: "1h" } }
      ],
      messages: [{ role: "user", content: [{ type: "text", text: userPrompt }] }]
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
    try { parsed = JSON.parse(cleanedText); } catch { parsed = null; }

    const reply = parsed?.reply?.trim() || "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";
    const newStage = normalizeStageName(unwrapManychatValue(parsed?.set_conversation_stage || ""));
    const newPayment = unwrapManychatValue(parsed?.set_payment_method || "");
    const currentPayment = newPayment || paymentMethod;
    const currentStage = newStage || conversationStage;

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
