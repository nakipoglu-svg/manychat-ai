import fs from "fs";
import path from "path";

// ─── KNOWLEDGE CACHE ───────────────────────────────────────────────────────
const fileCache = {};
function readKnowledgeFile(filename) {
  if (fileCache[filename]) return fileCache[filename];
  const filePath = path.join(process.cwd(), "knowledge", filename);
  const content = fs.readFileSync(filePath, "utf8");
  fileCache[filename] = content;
  return content;
}

// ─── HELPERS ───────────────────────────────────────────────────────────────
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

  // Ürün dosyası
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

  // Konu dosyası
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

// ─── SABIT CEVAPLAR ────────────────────────────────────────────────────────
function reply(res, text, stage = "", payment = "", photo = "") {
  return res.status(200).json({
    reply: text,
    set_conversation_stage: stage,
    set_payment_method: payment,
    set_photo_received: photo,
    set_menu_gosterildi: "",
  });
}

// ─── HANDLER ───────────────────────────────────────────────────────────────
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

    // ── 1. FOTOĞRAF MESAJI ────────────────────────────────────────────────
    const isPhoto =
      body?.message_type === "image" ||
      body?.attachments?.some((a) => a?.type === "image") ||
      body?.full_contact_data?.last_input_type === "image";

    if (isPhoto && stage === "photo_waiting") {
      return reply(
        res,
        "Fotoğrafınız ulaştı 😊 Ekibimiz inceleyip size hemen dönüş sağlayacak.",
        "photo_received",
        "",
        "yes"
      );
    }

    // ── 2. BOŞ MESAJ ──────────────────────────────────────────────────────
    if (!message) return reply(res, "");

    // ── 3. ARKA YAZI ALINDI → ADRES SOR ──────────────────────────────────
    if (stage === "back_text_waiting") {
      return reply(
        res,
        "Tamamdır efendim 😊 Adresinizi alabilir miyiz? Ad soyad, cep telefonu ve açık adresinizi yazabilirsiniz.",
        "address_waiting"
      );
    }

    // ── 4. HARF ALINDI → ADRES SOR ────────────────────────────────────────
    if (stage === "letter_waiting") {
      return reply(
        res,
        "Tamamdır efendim 😊 Adresinizi alabilir miyiz? Ad soyad, cep telefonu ve açık adresinizi yazabilirsiniz.",
        "address_waiting"
      );
    }

    // ── 5. ADRES BEKLENİYOR ───────────────────────────────────────────────
    if (stage === "address_waiting") {
      if (hasPhone(message)) {
        // Ödeme zaten seçilmişse direkt tamamla
        if (paymentMethod === "eft" || paymentMethod === "kapida_odeme") {
          return reply(res, "Adresiniz kaydedildi, teşekkürler 😊", "order_complete", paymentMethod);
        }
        // Ödeme seçilmemişse sor
        return reply(
          res,
          "Adresiniz kaydedildi, teşekkürler 😊 Ödemeniz nasıl olacak efendim? EFT / havale veya kapıda ödeme seçeneklerimiz mevcut.",
          "address_received"
        );
      }
      // Telefon yok — bilgi alınmaya devam, stage koru, sessiz kal
      return reply(res, "", "address_waiting");
    }

    // ── 6. ADRES ALINDI, ÖDEME BEKLENİYOR ────────────────────────────────
    if (stage === "address_received") {
      const payment = detectPayment(message);
      if (payment) {
        const replyText =
          payment === "eft"
            ? "Tamamdır efendim 😊 IBAN bilgimiz:\nTR34 0015 7000 0000 0076 2524 67\nAlıcı: Servet Cihan Nakipoğlu"
            : "Tamamdır efendim 😊 Kapıda ödeme ile siparişiniz hazırlanacaktır.";
        return reply(res, replyText, "order_complete", payment);
      }
      // Ödeme belli değilse Claude halleder (aşağıya düş)
    }

    // ── 7. SİPARİŞ TAMAMLANDI ─────────────────────────────────────────────
    if (stage === "order_complete") {
      // Claude'a bırak — satış sonrası konuşma
    }

    // ── 8. CLAUDE API ─────────────────────────────────────────────────────
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return reply(res, "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊");
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

STAGE KURALLARI:
- photo_waiting: Fotoğraf bekliyoruz. Fotoğraf gelmeden adres veya ödeme sorma.
- photo_received: Fotoğraf geldi. Arka yüz içeriği KESİNLEŞİRSE (müşteri net yazı/yön belirttiyse) set_conversation_stage="back_text_waiting" dön ve adres sor. Henüz netleşmediyse konuşmaya devam et.
- address_waiting: Adres bekleniyor. Bu aşamayı ASLA tekrar set etme. Sessiz bekle.
- address_received: Ödeme bekleniyor. Adres tekrar isteme. Sadece ödeme yöntemi sor.
- order_complete: Sipariş tamamlandı. Satış sonrası destek modunda kal.

ÖDEME KURALLARI:
- Müşteri sadece fiyat soruyorsa payment_method SET ETME.
- payment_method SADECE müşteri açıkça "EFT olsun", "kapıda olsun" gibi karar verirse set edilir.

FOTOĞRAF KURALLARI:
- Fotoğraf hakkında kesinlikle yorum yapma (güzel, kötü, net, bulanık gibi).
- photo_received=yes ise tekrar fotoğraf isteme.

GENEL:
- Daha önce alınan bilgileri tekrar isteme.
- Bilgi yoksa: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"

ÇIKIŞ FORMATI — SADECE GEÇERLİ JSON, başka hiçbir şey yazma:
{"reply":"cevap metni","set_conversation_stage":"","set_payment_method":"","set_photo_received":"","set_menu_gosterildi":""}`;

    const userPrompt = `Müşteri mesajı: ${message}`;

    const payload = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: [
        { type: "text", text: systemPrompt, cache_control: { type: "ephemeral", ttl: "1h" } },
        { type: "text", text: knowledgeText, cache_control: { type: "ephemeral", ttl: "1h" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
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
    console.log("CLAUDE RESPONSE:", JSON.stringify(data, null, 2));

    const rawText = data?.content?.map((b) => b?.text || "").join(" ").trim() || "";
    const cleaned = extractJson(rawText);

    let parsed = null;
    try { parsed = JSON.parse(cleaned); } catch { parsed = null; }

    const replyText   = parsed?.reply?.trim() || "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";
    const newStage    = normalizeStage(unwrap(parsed?.set_conversation_stage || ""));
    const newPayment  = unwrap(parsed?.set_payment_method || "");
    const newPhoto    = unwrap(parsed?.set_photo_received || "");

    // Güvenlik: Claude address_waiting'i set etmeye çalışıyorsa engelle
    // (adres aşaması zaten akışla yönetiliyor)
    const finalStage = newStage === "address_waiting" && stage === "address_waiting" ? "" : newStage;

    // Güvenlik: address_received'dayken Claude yanlış stage set etmesin
    const safeStage = stage === "address_received" && !["order_complete", ""].includes(finalStage)
      ? ""
      : finalStage;

    return res.status(200).json({
      reply: replyText,
      set_conversation_stage: safeStage,
      set_payment_method: newPayment,
      set_photo_received: newPhoto,
      set_menu_gosterildi: unwrap(parsed?.set_menu_gosterildi || ""),
    });

  } catch (err) {
    console.error("chat.js error:", err);
    return res.status(200).json({
      reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
      set_conversation_stage: "",
      set_payment_method: "",
      set_photo_received: "",
      set_menu_gosterildi: "",
    });
  }
}
