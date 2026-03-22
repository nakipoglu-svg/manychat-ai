import fs from "fs";
import path from "path";

// ─── KNOWLEDGE CACHE ──────────────────────────────────────────────────────
const fileCache = {};
function readKnowledgeFile(filename) {
  if (fileCache[filename]) return fileCache[filename];
  const filePath = path.join(process.cwd(), "knowledge", filename);
  const content = fs.readFileSync(filePath, "utf8");
  fileCache[filename] = content;
  return content;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function unwrap(value) {
  if (value === null || value === undefined) return "";
  let str = String(value).trim();
  str = str.replace(/^\{\{\{?/, "").replace(/\}\}\}?$/, "").trim();
  if (/^\{[^}]+\}$/.test(str)) return "";
  if (!str || ["no field selected", "undefined", "null"].includes(str.toLowerCase())) return "";
  return str;
}

function extractJson(raw) {
  if (!raw) return "";
  return String(raw).trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/ı/g, "i").replace(/ö/g, "o")
    .replace(/ş/g, "s").replace(/ü/g, "u")
    .trim();
}

function normalizeStage(stage) {
  const s = normalize(stage);
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

function hasPhone(text) {
  const cleaned = String(text || "").replace(/\s+/g, "");
  return /(\+?[\d]{10,})/.test(cleaned);
}

function detectPayment(text) {
  const msg = normalize(text);
  if (msg.includes("kapida") || msg.includes("kapi")) return "kapida_odeme";
  if (msg.includes("eft") || msg.includes("havale") || msg.includes("iban") || msg.includes("transfer")) return "eft";
  return "";
}

function includesAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function pickKnowledge(message, userProduct, stage) {
  const msg = normalize(message);
  const product = normalize(userProduct);
  const s = normalize(stage);
  const files = ["core_system.txt"];

  if (product.includes("lazer") || product.includes("resim") || product.includes("foto")) {
    files.push("product_laser.txt");
  } else if (product.includes("atac") || product.includes("harf")) {
    files.push("product_atac.txt");
  } else {
    if (includesAny(msg, ["lazer", "resimli", "fotografli", "fotograf", "foto"])) {
      files.push("product_laser.txt");
    } else if (includesAny(msg, ["atac", "harf", "harfli", "isim kolye"])) {
      files.push("product_atac.txt");
    }
  }

  if (s.includes("photo") || s.includes("back_text") || includesAny(msg, ["foto", "fotograf", "resim", "arka"])) {
    files.push("image_rules.txt");
  }
  if (s.includes("letter") || s.includes("address") || includesAny(msg, ["siparis", "adres", "telefon"])) {
    files.push("order_flow.txt");
  }
  if (includesAny(msg, ["fiyat", "ucret", "ne kadar", "kac tl", "indirim", "para"])) {
    files.push("pricing.txt");
  }
  if (includesAny(msg, ["kargo", "teslim", "teslimat", "takip", "ptt", "aras"])) {
    files.push("shipping.txt");
  }
  if (includesAny(msg, ["odeme", "iban", "eft", "havale", "kapida", "banka"])) {
    files.push("payment.txt");
  }
  if (includesAny(msg, ["guven", "garanti", "iade", "kararma", "paslanir", "indirim"])) {
    files.push("trust.txt");
  }
  if (includesAny(msg, ["tesekkur", "sagol", "memnun", "merhaba", "selam"])) {
    files.push("smalltalk.txt");
  }

  return [...new Set(files)];
}

// ─── RESPONSE HELPER ─────────────────────────────────────────────────────
// stage HER ZAMAN dolu gönderilir — ManyChat boş string gelince eski değeri koruyor!
function respond(res, replyText, stage, payment, photo) {
  const out = {
    reply: replyText,
    set_conversation_stage: stage,
    set_payment_method: payment || "",
    set_photo_received: photo || "",
    set_menu_gosterildi: "",
  };
  console.log("RESPONSE:", JSON.stringify(out, null, 2));
  return res.status(200).json(out);
}

// ─── HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(200).json({ reply: "" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const message       = unwrap(body?.message || "");
    const userProduct   = unwrap(body?.user_product || body?.ilgilenilen_urun || "");
    const stage         = normalizeStage(unwrap(body?.conversation_stage || ""));
    const photoReceived = unwrap(body?.photo_received || "");
    const paymentMethod = unwrap(body?.payment_method || "");

    console.log("INPUT:", JSON.stringify({ message, userProduct, stage, photoReceived, paymentMethod }, null, 2));

    // ── 1. FOTOĞRAF MESAJI ───────────────────────────────────────────────
    const isPhoto =
      body?.message_type === "image" ||
      body?.attachments?.some((a) => a?.type === "image") ||
      body?.full_contact_data?.last_input_type === "image";

    if (isPhoto && stage === "photo_waiting") {
      return respond(res,
        "Fotoğrafınız ulaştı 😊 İnceleyip size döneceğiz.",
        "photo_received", paymentMethod, "yes"
      );
    }

    // ── 2. BOŞ MESAJ ─────────────────────────────────────────────────────
    if (!message) {
      return respond(res, "", stage, paymentMethod, photoReceived);
    }

    // ── 3. ARKA YAZI ALINDI → ADRES SOR ─────────────────────────────────
    // Bu aşamada müşteri ne yazarsa yazsın adres soruyoruz
    if (stage === "back_text_waiting") {
      return respond(res,
        "Tamamdır efendim 😊 Adresinizi alabilir miyiz? Ad soyad, cep telefonu ve açık adresinizi yazabilirsiniz.",
        "address_waiting", paymentMethod, photoReceived
      );
    }

    // ── 4. HARF ALINDI → ADRES SOR ───────────────────────────────────────
    if (stage === "letter_waiting") {
      return respond(res,
        "Tamamdır efendim 😊 Adresinizi alabilir miyiz? Ad soyad, cep telefonu ve açık adresinizi yazabilirsiniz.",
        "address_waiting", paymentMethod, photoReceived
      );
    }

    // ── 5. ADRES BEKLENİYOR ──────────────────────────────────────────────
    if (stage === "address_waiting") {
      if (hasPhone(message)) {
        if (paymentMethod === "eft" || paymentMethod === "kapida_odeme") {
          return respond(res,
            "Adresiniz kaydedildi, teşekkürler 😊",
            "order_complete", paymentMethod, photoReceived
          );
        }
        return respond(res,
          "Adresiniz kaydedildi, teşekkürler 😊 Ödemeniz nasıl olacak efendim? EFT / havale veya kapıda ödeme seçeneklerimiz mevcut.",
          "address_received", "", photoReceived
        );
      }
      // Telefon henüz gelmedi — stage'i koru, sessiz bekle
      return respond(res, "", "address_waiting", paymentMethod, photoReceived);
    }

    // ── 6. ADRES ALINDI, ÖDEME BEKLENİYOR ───────────────────────────────
    if (stage === "address_received") {
      const payment = detectPayment(message);
      if (payment) {
        const replyText = payment === "eft"
          ? "Tamamdır efendim 😊 IBAN bilgimiz:\nTR34 0015 7000 0000 0076 2524 67\nAlıcı: Servet Cihan Nakipoğlu"
          : "Tamamdır efendim 😊 Kapıda ödeme ile siparişiniz hazırlanacaktır.";
        return respond(res, replyText, "order_complete", payment, photoReceived);
      }
      // Ödeme net değilse Claude halleder — stage korunacak (aşağıda güvenlik var)
    }

    // ── 7. CLAUDE API ────────────────────────────────────────────────────
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return respond(res,
        "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
        stage, paymentMethod, photoReceived
      );
    }

    const selectedFiles = pickKnowledge(message, userProduct, stage);
    const knowledgeText = selectedFiles
      .map((f) => { try { return `### ${f}\n${readKnowledgeFile(f)}`; } catch { return ""; } })
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = `Sen Yudum Jewels için çalışan bir Instagram satış asistanısın.
Kısa, net, doğal cevaplar ver. Sadece verilen bilgi dosyalarına göre cevap ver.

MEVCUT DURUM:
- conversation_stage: ${stage || "belirsiz"}
- user_product: ${userProduct || "belirsiz"}
- photo_received: ${photoReceived || "hayır"}
- payment_method: ${paymentMethod || "belirsiz"}

STAGE KURALLARI — ÇOK ÖNEMLİ:
set_conversation_stage değeri HER ZAMAN dolu olmalı. ASLA boş string gönderme.
Değişmiyorsa mevcut stage'i aynen yaz: "${stage || "belirsiz"}"

Geçiş kuralları:
- photo_received aşamasında → arka yüz konusunu kısa sor: "Arka yüze yazı ister misiniz? İsim, tarih, 'Canım Oğlum' gibi yazılar yazabiliyoruz 😊"
  * Müşteri yazı verirse: set_conversation_stage="back_text_waiting"
  * Müşteri istemiyorsa: set_conversation_stage="address_waiting" + adres sor
- order_complete aşamasında: satış sonrası destek, set_conversation_stage="order_complete" koru

WHATSAPP KURALI:
Fotoğraf sorusunda WhatsApp linki VERME.
Sadece müşteri "WhatsApp'tan gönderebilir miyim" diye sorarsa: wa.me/905054713545

FOTOĞRAF KURALLARI:
- Fotoğraf hakkında yorum yapma (güzel, kötü, net, bulanık vs).
- photo_received=yes ise tekrar fotoğraf isteme, "Gönderin efendim" YAZMA.

GENEL:
- Daha önce alınan bilgileri tekrar isteme.
- Bilgi yoksa: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"

ÇIKIŞ — SADECE GEÇERLİ JSON:
{"reply":"cevap","set_conversation_stage":"DOLU_OLMALI","set_payment_method":"","set_photo_received":"","set_menu_gosterildi":""}`;

    const payload = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: [
        { type: "text", text: systemPrompt, cache_control: { type: "ephemeral", ttl: "1h" } },
        { type: "text", text: knowledgeText, cache_control: { type: "ephemeral", ttl: "1h" } },
      ],
      messages: [{ role: "user", content: `Müşteri mesajı: ${message}` }],
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("CLAUDE:", JSON.stringify(data, null, 2));

    const rawText = data?.content?.map((b) => b?.text || "").join(" ").trim() || "";
    const cleaned = extractJson(rawText);

    let parsed = null;
    try { parsed = JSON.parse(cleaned); } catch { parsed = null; }

    const replyText  = parsed?.reply?.trim() || "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";
    let newStage     = normalizeStage(unwrap(parsed?.set_conversation_stage || ""));
    const newPayment = unwrap(parsed?.set_payment_method || "");
    const newPhoto   = unwrap(parsed?.set_photo_received || "");

    // GÜVENLİK 1: Claude boş stage döndürdüyse mevcut stage'i koru
    if (!newStage) newStage = stage;

    // GÜVENLİK 2: address_waiting'deyken Claude başka yere atmasın
    if (stage === "address_waiting") newStage = "address_waiting";

    // GÜVENLİK 3: address_received'dayken sadece order_complete'e geçebilir
    if (stage === "address_received" && newStage !== "order_complete") {
      newStage = "address_received";
    }

    return respond(res,
      replyText,
      newStage,
      newPayment || paymentMethod,
      newPhoto || photoReceived
    );

  } catch (err) {
    console.error("chat.js error:", err);
    return res.status(200).json({
      reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
      set_conversation_stage: "photo_waiting",
      set_payment_method: "",
      set_photo_received: "",
      set_menu_gosterildi: "",
    });
  }
}
