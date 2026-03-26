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

function safeReadKnowledgeFile(filename) {
  try {
    return readKnowledgeFile(filename);
  } catch {
    return "";
  }
}

function unwrapManychatValue(value) {
  if (value === null || value === undefined) return "";
  let str = String(value).trim();

  str = str.replace(/^\{\{\{?/, "").replace(/\}\}\}?$/, "").trim();

  if (/^\{[^}]+\}$/.test(str)) return "";
  if (!str) return "";

  const lowered = str.toLowerCase();
  if (["undefined", "null", "no field selected"].includes(lowered)) return "";

  return str;
}

function extractJsonText(rawText) {
  if (!rawText) return "";
  let text = String(rawText).trim();
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  text = text.replace(/\s*```$/, "").trim();
  return text;
}

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/i̇/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, keywords) {
  const t = normalizeText(text);
  return keywords.some((keyword) => t.includes(normalizeText(keyword)));
}

function hasPhoneNumber(text) {
  return /(\+?\d[\d\s]{8,}\d)/.test(String(text || ""));
}

function looksLikeAddressMessage(text) {
  const msg = normalizeText(text);

  const addressKeywords = [
    "mahalle",
    "mah",
    "sokak",
    "sk",
    "cadde",
    "cd",
    "no",
    "daire",
    "kat",
    "apartman",
    "apt",
    "site",
    "blok",
    "ilce",
    "ilçe",
    "istanbul",
    "ankara",
    "izmir",
    "beykoz",
    "sisli",
    "şişli",
    "umraniye",
    "ümraniye",
    "kadikoy",
    "kadıköy",
    "turkiye",
    "türkiye"
  ];

  const hitCount = addressKeywords.filter((k) =>
    msg.includes(normalizeText(k))
  ).length;

  const lineCount = String(text || "")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean).length;

  return hasPhoneNumber(text) && (hitCount >= 2 || lineCount >= 3);
}

function detectPaymentMethod(text) {
  const msg = normalizeText(text);
  if (includesAny(msg, ["kapida", "kapida odeme", "kapıda", "kapıda ödeme"])) {
    return "kapida_odeme";
  }
  if (includesAny(msg, ["eft", "havale", "iban", "transfer"])) {
    return "eft";
  }
  return "";
}

function normalizeStageName(stage) {
  const s = normalizeText(stage);
  if (!s) return "";

  if (s.includes("photo_wait")) return "photo_waiting";
  if (s.includes("photo_receive")) return "photo_received";
  if (s.includes("back_text_wait")) return "back_text_waiting";
  if (s.includes("address_receive")) return "address_received";
  if (s.includes("address_wait")) return "address_waiting";
  if (s.includes("payment_selected")) return "payment_selected";
  if (s.includes("payment_wait")) return "payment_waiting";
  if (s.includes("order_completed")) return "order_completed";
  if (s.includes("order_cancelled")) return "order_cancelled";
  if (s.includes("support_shipping")) return "support_shipping";
  if (s.includes("support_general")) return "support_general";

  return s;
}

function getFieldFromFullContact(fullContactData, key) {
  if (!fullContactData || typeof fullContactData !== "object") return "";
  const customFields = fullContactData.custom_fields || {};
  return unwrapManychatValue(customFields[key] || "");
}

function buildCurrentContext(body, fullContactData) {
  const productFromBody =
    unwrapManychatValue(body?.ilgilenilen_urun || "") ||
    unwrapManychatValue(body?.user_product || "");

  return {
    message: unwrapManychatValue(body?.message || ""),
    ilgilenilenUrun:
      productFromBody ||
      getFieldFromFullContact(fullContactData, "ilgilenilen_urun") ||
      getFieldFromFullContact(fullContactData, "user_product"),
    conversationStage: normalizeStageName(
      unwrapManychatValue(body?.conversation_stage || "") ||
        getFieldFromFullContact(fullContactData, "conversation_stage")
    ),
    photoReceived:
      unwrapManychatValue(body?.photo_received || "") ||
      getFieldFromFullContact(fullContactData, "photo_received"),
    paymentMethod:
      unwrapManychatValue(body?.payment_method || "") ||
      getFieldFromFullContact(fullContactData, "payment_method"),
    menuGosterildi:
      unwrapManychatValue(body?.menu_gosterildi || "") ||
      getFieldFromFullContact(fullContactData, "menu_gosterildi"),
    aiReply:
      unwrapManychatValue(body?.ai_reply || "") ||
      getFieldFromFullContact(fullContactData, "ai_reply"),
    lastIntent:
      unwrapManychatValue(body?.last_intent || "") ||
      getFieldFromFullContact(fullContactData, "last_intent"),
    orderStatus:
      unwrapManychatValue(body?.order_status || "") ||
      getFieldFromFullContact(fullContactData, "order_status"),
    backTextStatus:
      unwrapManychatValue(body?.back_text_status || "") ||
      getFieldFromFullContact(fullContactData, "back_text_status"),
    addressStatus:
      unwrapManychatValue(body?.address_status || "") ||
      getFieldFromFullContact(fullContactData, "address_status"),
    supportMode:
      unwrapManychatValue(body?.support_mode || "") ||
      getFieldFromFullContact(fullContactData, "support_mode"),
    siparisAlindi:
      unwrapManychatValue(body?.siparis_alindi || "") ||
      getFieldFromFullContact(fullContactData, "siparis_alindi"),
    cancelReason:
      unwrapManychatValue(body?.cancel_reason || "") ||
      getFieldFromFullContact(fullContactData, "cancel_reason"),
    contextLock:
      unwrapManychatValue(body?.context_lock || "") ||
      getFieldFromFullContact(fullContactData, "context_lock")
  };
}

function detectProduct(userMessage, ctx) {
  const msg = normalizeText(userMessage);
  const existing = normalizeText(ctx.ilgilenilenUrun || "");

  if (existing.includes("lazer") || existing.includes("laser")) return "lazer";
  if (existing.includes("atac") || existing.includes("ataç")) return "atac";

  if (
    includesAny(msg, [
      "resimli",
      "fotografli",
      "fotoğraflı",
      "foto",
      "fotograf",
      "fotoğraf",
      "resimli olan",
      "plaka",
      "lazer"
    ])
  ) {
    return "lazer";
  }

  if (includesAny(msg, ["atac", "ataç", "harfli", "harf"])) {
    return "atac";
  }

  return "unknown";
}

function detectTopic(text) {
  const msg = normalizeText(text);

  if (
    includesAny(msg, [
      "fiyat",
      "ne kadar",
      "nekadar",
      "kac tl",
      "kaç tl",
      "ucret",
      "ücret",
      "kac para",
      "kaç para",
      "indirim",
      "2li",
      "2 li",
      "ikili",
      "coklu alim",
      "çoklu alım"
    ])
  ) {
    return "pricing";
  }

  if (
    includesAny(msg, [
      "kapida odeme",
      "kapıda ödeme",
      "eft",
      "havale",
      "iban",
      "odeme",
      "ödeme",
      "dekont"
    ])
  ) {
    return "payment";
  }

  if (
    includesAny(msg, [
      "kargo",
      "teslim",
      "takip",
      "ptt",
      "aras",
      "gelmedi",
      "gecikti",
      "geçikti"
    ])
  ) {
    return "shipping";
  }

  if (
    includesAny(msg, [
      "fotograf",
      "fotoğraf",
      "foto",
      "resim",
      "arka yuz",
      "arka yüz",
      "on yuz",
      "ön yüz",
      "arkali onlu",
      "arkalı önlü",
      "iki yuz",
      "iki yüz",
      "iki taraf",
      "kalp",
      "nazar",
      "aksesuar"
    ])
  ) {
    return "image";
  }

  if (
    includesAny(msg, [
      "guven",
      "güven",
      "garanti",
      "kalite",
      "kararma",
      "solma",
      "paslanma",
      "iade",
      "degisim",
      "değişim"
    ])
  ) {
    return "trust";
  }

  if (
    includesAny(msg, [
      "siparis",
      "sipariş",
      "adres",
      "ad soyad",
      "cep telefonu",
      "dua yaz",
      "isim yaz"
    ])
  ) {
    return "order";
  }

  if (
    includesAny(msg, [
      "merhaba",
      "selam",
      "tesekkur",
      "teşekkür",
      "tamam",
      "olur",
      "aynen",
      "peki",
      "tmm",
      "tmam"
    ])
  ) {
    return "smalltalk";
  }

  return "general";
}

function hasForbiddenPrice(text) {
  return /\b299\b|\b349\b|\b399\b|\b449\b/.test(String(text || ""));
}

function canChangePayment(ctx) {
  const status = normalizeText(ctx.orderStatus || "active");
  return status !== "completed" && status !== "cancelled";
}

function fallbackResponse() {
  return "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";
}

function pricingResponse(product) {
  if (product === "lazer") {
    return "EFT / havale fiyatımız 599 TL, kapıda ödeme fiyatımız 649 TL'dir efendim 😊";
  }
  if (product === "atac") {
    return "EFT / havale fiyatımız 499 TL, kapıda ödeme fiyatımız 549 TL'dir efendim 😊";
  }
  return "Hangi model ile ilgileniyorsunuz? 😊\n• Resimli lazer kolye\n• Harfli ataç kolye";
}

function directReply(ctx) {
  const msg = normalizeText(ctx.message);
  const product = detectProduct(ctx.message, ctx);
  const topic = detectTopic(ctx.message);

  // 1) iptal
  if (
    includesAny(msg, [
      "iptal",
      "vazgectim",
      "vazgeçtim",
      "istemiyorum",
      "olmasin",
      "olmasın",
      "gerek kalmadi",
      "gerek kalmadı"
    ])
  ) {
    return {
      reply: "Tabi efendim 😊",
      set_conversation_stage: "order_cancelled",
      set_last_intent: "cancel",
      set_ilgilenilen_urun: "",
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: "cancelled",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "hayir",
      set_cancel_reason: "changed_mind",
      set_context_lock: "cancel_locked",
      set_menu_gosterildi: ""
    };
  }

  // 2) adres direkt geldiyse
  if (looksLikeAddressMessage(ctx.message)) {
    return {
      reply:
        "Tamamdır efendim 😊 Adresiniz kaydedildi. Ödemeniz nasıl olacak efendim? EFT / havale veya kapıda ödeme seçeneklerimiz mevcut.",
      set_conversation_stage: "address_received",
      set_last_intent: "address",
      set_ilgilenilen_urun: product === "unknown" ? "" : product,
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "received",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: "order_locked",
      set_menu_gosterildi: ""
    };
  }

  // 3) ürün belli ve kısa cevap geldiyse menüye dönme
  if (
    (ctx.ilgilenilenUrun === "lazer" || ctx.ilgilenilenUrun === "atac") &&
    includesAny(msg, ["tamam", "olur", "aynen", "peki", "tmm", "tmam", "soyle", "şöyle", "boyle", "böyle", "bekliyorum"])
  ) {
    return
