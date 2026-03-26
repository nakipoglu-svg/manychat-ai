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
    return {
      reply: "Tabi efendim 😊",
      set_conversation_stage: ctx.conversationStage || "product_selected",
      set_last_intent: ctx.lastIntent || "smalltalk",
      set_ilgilenilen_urun: ctx.ilgilenilenUrun,
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: ctx.contextLock || "product_locked",
      set_menu_gosterildi: ""
    };
  }

  // 4) ödeme seçimi/değişimi
  const payment = detectPaymentMethod(ctx.message);
  if (payment && canChangePayment(ctx)) {
    if (payment === "eft") {
      if (ctx.addressStatus === "received" || ctx.conversationStage === "address_received" || ctx.conversationStage === "payment_selected") {
        return {
          reply:
            "Tamamdır efendim 😊 IBAN bilgimiz:\nTR34 0015 7000 0000 0076 2524 67\nAlıcı: Servet Cihan Nakipoğlu",
          set_conversation_stage: "payment_selected",
          set_last_intent: "payment",
          set_ilgilenilen_urun: product === "unknown" ? ctx.ilgilenilenUrun : product,
          set_photo_received: "",
          set_payment_method: "eft",
          set_order_status: "active",
          set_back_text_status: "",
          set_address_status: "received",
          set_support_mode: "",
          set_siparis_alindi: "evet",
          set_cancel_reason: "",
          set_context_lock: "order_locked",
          set_menu_gosterildi: ""
        };
      }

      if (product !== "unknown") {
        return {
          reply:
            product === "lazer"
              ? "Tabi efendim 😊 EFT / havale fiyatımız 599 TL'dir."
              : "Tabi efendim 😊 EFT / havale fiyatımız 499 TL'dir.",
          set_conversation_stage: ctx.conversationStage || "product_selected",
          set_last_intent: "payment",
          set_ilgilenilen_urun: product,
          set_photo_received: "",
          set_payment_method: "eft",
          set_order_status: ctx.orderStatus || "active",
          set_back_text_status: "",
          set_address_status: "",
          set_support_mode: "",
          set_siparis_alindi: "",
          set_cancel_reason: "",
          set_context_lock: "product_locked",
          set_menu_gosterildi: ""
        };
      }
    }

    if (payment === "kapida_odeme") {
      if (ctx.addressStatus === "received" || ctx.conversationStage === "address_received" || ctx.conversationStage === "payment_selected") {
        return {
          reply: "Tamamdır efendim 😊 Kapıda ödeme ile siparişiniz hazırlanacaktır.",
          set_conversation_stage: "payment_selected",
          set_last_intent: "payment",
          set_ilgilenilen_urun: product === "unknown" ? ctx.ilgilenilenUrun : product,
          set_photo_received: "",
          set_payment_method: "kapida_odeme",
          set_order_status: "active",
          set_back_text_status: "",
          set_address_status: "received",
          set_support_mode: "",
          set_siparis_alindi: "evet",
          set_cancel_reason: "",
          set_context_lock: "order_locked",
          set_menu_gosterildi: ""
        };
      }

      if (product !== "unknown") {
        return {
          reply:
            product === "lazer"
              ? "Evet efendim, kapıda ödeme seçeneğimiz mevcut. Kapıda ödeme fiyatımız 649 TL'dir 😊"
              : "Evet efendim, kapıda ödeme seçeneğimiz mevcut. Kapıda ödeme fiyatımız 549 TL'dir 😊",
          set_conversation_stage: ctx.conversationStage || "product_selected",
          set_last_intent: "payment",
          set_ilgilenilen_urun: product,
          set_photo_received: "",
          set_payment_method: "kapida_odeme",
          set_order_status: ctx.orderStatus || "active",
          set_back_text_status: "",
          set_address_status: "",
          set_support_mode: "",
          set_siparis_alindi: "",
          set_cancel_reason: "",
          set_context_lock: "product_locked",
          set_menu_gosterildi: ""
        };
      }
    }
  }

  // 5) fiyat
  if (topic === "pricing") {
    return {
      reply: pricingResponse(product),
      set_conversation_stage:
        product === "unknown" ? ctx.conversationStage || "product_unknown" : ctx.conversationStage || "product_selected",
      set_last_intent: "pricing",
      set_ilgilenilen_urun: product === "unknown" ? "" : product,
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: product === "unknown" ? "" : "product_locked",
      set_menu_gosterildi: product === "unknown" ? "evet" : ""
    };
  }

  // 6) zincir uzunluğu
  if (
    product === "lazer" &&
    includesAny(msg, ["zincirin uzunlugu", "zincir uzunlugu", "zincir ne kadar", "zincir kac cm", "zincir kaç cm"])
  ) {
    if (includesAny(msg, ["erkek", "esime", "eşime", "babam", "erkek icin", "erkek için"])) {
      return {
        reply: "Standart zincir uzunluğumuz 60 cm'dir efendim. Erkek kullanım için 50 cm gümüş zincirimiz de mevcut 😊",
        set_conversation_stage: ctx.conversationStage || "product_selected",
        set_last_intent: "image",
        set_ilgilenilen_urun: "lazer",
        set_photo_received: "",
        set_payment_method: "",
        set_order_status: ctx.orderStatus || "active",
        set_back_text_status: "",
        set_address_status: "",
        set_support_mode: "",
        set_siparis_alindi: "",
        set_cancel_reason: "",
        set_context_lock: "product_locked",
        set_menu_gosterildi: ""
      };
    }

    return {
      reply: "Zincir uzunluğumuz 60 cm'dir efendim 😊",
      set_conversation_stage: ctx.conversationStage || "product_selected",
      set_last_intent: "image",
      set_ilgilenilen_urun: "lazer",
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: "product_locked",
      set_menu_gosterildi: ""
    };
  }

  // 7) çift yüz / arka taraf fotoğraf
  if (
    product === "lazer" &&
    (
      includesAny(msg, ["iki yuz", "iki yüz", "iki taraf", "arkali onlu", "arkalı önlü", "arka yuz", "arka yüz"]) &&
      includesAny(msg, ["foto", "fotograf", "fotoğraf", "resim"])
    )
  ) {
    return {
      reply: "Evet efendim, ön yüze bir fotoğraf arka yüze bir fotoğraf yapabiliyoruz. Fiyat farkı da olmuyor 😊",
      set_conversation_stage: ctx.conversationStage || "product_selected",
      set_last_intent: "image",
      set_ilgilenilen_urun: "lazer",
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: "product_locked",
      set_menu_gosterildi: ""
    };
  }

  // 8) tek zincirde birden fazla plaka
  if (
    product === "lazer" &&
    includesAny(msg, ["3 plaka", "2 plaka", "ayni zincirde", "aynı zincirde", "bir zincirde"])
  ) {
    return {
      reply: "Bu şekilde yapmıyoruz efendim, bir zincirde tek plaka oluyor 😊",
      set_conversation_stage: ctx.conversationStage || "product_selected",
      set_last_intent: "image",
      set_ilgilenilen_urun: "lazer",
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: "product_locked",
      set_menu_gosterildi: ""
    };
  }

  // 9) kalite / çelik
  if (
    includesAny(msg, ["celik mi", "çelik mi", "kararma", "solma", "paslanma", "kalite", "garanti"])
  ) {
    return {
      reply: "Ürünlerimiz paslanmaz çeliktir efendim 😊 Kararma, solma veya paslanma yapmaz.",
      set_conversation_stage: ctx.conversationStage || "product_selected",
      set_last_intent: "trust",
      set_ilgilenilen_urun: product === "unknown" ? ctx.ilgilenilenUrun : product,
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: product === "unknown" ? ctx.contextLock : "product_locked",
      set_menu_gosterildi: ""
    };
  }

  // 10) aksesuar
  if (product === "lazer" && includesAny(msg, ["kalp", "nazar"])) {
    return {
      reply: "Pembe kalbimiz ve nazar boncuğumuz mevcut efendim 😊",
      set_conversation_stage: ctx.conversationStage || "product_selected",
      set_last_intent: "image",
      set_ilgilenilen_urun: "lazer",
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: "product_locked",
      set_menu_gosterildi: ""
    };
  }

  // 11) fotoğraf uygunluğu / kişi sayısı
  if (
    product === "lazer" &&
    includesAny(msg, [
      "olur mu",
      "iki kisi",
      "iki kişi",
      "uc kisi",
      "üç kişi",
      "3 kisi",
      "3 kişi",
      "4 kisi",
      "4 kişi",
      "aile fotosu",
      "bebek"
    ])
  ) {
    return {
      reply: "Gönderin efendim, kontrol edelim 😊",
      set_conversation_stage: ctx.conversationStage || "photo_waiting",
      set_last_intent: "image",
      set_ilgilenilen_urun: "lazer",
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: "product_locked",
      set_menu_gosterildi: ""
    };
  }

  // 12) fotoğraf gönderme
  if (product === "lazer" && includesAny(msg, ["gondereyim", "göndereyim", "fotograf gonder", "fotoğraf gönder", "buradan gonder", "buradan gönder"])) {
    return {
      reply: "Fotoğrafı buradan gönderebilirsiniz efendim 😊",
      set_conversation_stage: "photo_waiting",
      set_last_intent: "image",
      set_ilgilenilen_urun: "lazer",
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: "product_locked",
      set_menu_gosterildi: ""
    };
  }

  // 13) sadece "resimli / lazer / detay" gibi
  if (includesAny(msg, ["resimli", "lazer", "detay", "resimli olan", "fotografli", "fotoğraflı"])) {
    return {
      reply: "Resimli lazer kolye 😊\n\nGönderdiğiniz fotoğraf lazer ile çelik plakaya işlenir.\n\nFiyat\nEFT / Havale : 599 TL\nKapıda ödeme : 649 TL\n\nFotoğrafı buradan gönderebilirsiniz.",
      set_conversation_stage: "product_selected",
      set_last_intent: "product",
      set_ilgilenilen_urun: "lazer",
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: "product_locked",
      set_menu_gosterildi: "evet"
    };
  }

  // 14) ürün belirsiz ama genel fiyat / bilgi
  if (product === "unknown" && includesAny(msg, ["fiyat", "bilgi", "detay", "ne kadar", "nekadar"])) {
    return {
      reply: "Hangi model ile ilgileniyorsunuz? 😊\n• Resimli lazer kolye\n• Harfli ataç kolye",
      set_conversation_stage: "product_unknown",
      set_last_intent: "product",
      set_ilgilenilen_urun: "",
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: ctx.orderStatus || "active",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: "",
      set_menu_gosterildi: "evet"
    };
  }

  return null;
}

function selectKnowledgeFiles(ctx) {
  const files = [
    "CORE_SYSTEM.txt",
    "PRICING.txt",
    "PAYMENT.txt",
    "SHIPPING.txt",
    "IMAGE_RULES.txt",
    "TRUST.txt",
    "ORDER_FLOW.txt",
    "SMALLTALK.txt",
    "PRODUCT_LASER.txt",
    "PRODUCT_ATAC.txt"
  ];

  return files
    .map((file) => safeReadKnowledgeFile(file))
    .filter(Boolean)
    .join("\n\n");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "" });
    }

    let body = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    } catch {
      body = {};
    }

    const fullContactData = body?.full_contact_data || null;
    const ctx = buildCurrentContext(body, fullContactData);

    if (!ctx.message) {
      return res.status(200).json({
        reply: fallbackResponse(),
        set_conversation_stage: "",
        set_last_intent: "",
        set_ilgilenilen_urun: "",
        set_photo_received: "",
        set_payment_method: "",
        set_order_status: "",
        set_back_text_status: "",
        set_address_status: "",
        set_support_mode: "",
        set_siparis_alindi: "",
        set_cancel_reason: "",
        set_context_lock: "",
        set_menu_gosterildi: ""
      });
    }

    console.log("MANYCHAT BODY:", JSON.stringify({
      message: ctx.message,
      ilgilenilenUrun: ctx.ilgilenilenUrun,
      conversationStage: ctx.conversationStage,
      photoReceived: ctx.photoReceived,
      paymentMethod: ctx.paymentMethod,
      lastIntent: ctx.lastIntent,
      orderStatus: ctx.orderStatus,
      backTextStatus: ctx.backTextStatus,
      addressStatus: ctx.addressStatus,
      contextLock: ctx.contextLock
    }, null, 2));

    // Önce deterministic cevap dene
    const direct = directReply(ctx);
    if (direct) {
      return res.status(200).json(direct);
    }

    // AI fallback
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        reply: fallbackResponse(),
        set_conversation_stage: "",
        set_last_intent: "",
        set_ilgilenilen_urun: "",
        set_photo_received: "",
        set_payment_method: "",
        set_order_status: "",
        set_back_text_status: "",
        set_address_status: "",
        set_support_mode: "",
        set_siparis_alindi: "",
        set_cancel_reason: "",
        set_context_lock: "",
        set_menu_gosterildi: ""
      });
    }

    const product = detectProduct(ctx.message, ctx);
    const topic = detectTopic(ctx.message);
    const knowledgeText = selectKnowledgeFiles(ctx);

    const systemPrompt = `
Sen Yudum Jewels için çalışan Instagram satış asistanısın.

KURALLAR:
- Kısa, net, sıcak ve doğal yaz.
- Sadece verilen bilgiye göre cevap ver.
- Dosyada olmayan fiyat yazma.
- 299, 349, 399, 449 gibi yanlış fiyatlar ASLA yazılamaz.
- ilgilenilen_urun doluysa tekrar ürün sormak yasaktır.
- address_status=received veya conversation_stage=address_received ise tekrar adres istemek yasaktır.
- Resimli lazer kolyede ön yüze bir fotoğraf, arka yüze bir fotoğraf yapılabilir ve fiyat farkı yoktur.
- Müşteri ürün görseline cevap veriyorsa ürün bağlamını koru.
- Sadece gerçekten kapsam dışı durumda şu cevabı kullan:
Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊

JSON formatında cevap dön:
{
  "reply": "müşteriye verilecek cevap",
  "set_conversation_stage": "",
  "set_last_intent": "",
  "set_ilgilenilen_urun": "",
  "set_photo_received": "",
  "set_payment_method": "",
  "set_order_status": "",
  "set_back_text_status": "",
  "set_address_status": "",
  "set_support_mode": "",
  "set_siparis_alindi": "",
  "set_cancel_reason": "",
  "set_context_lock": "",
  "set_menu_gosterildi": ""
}
`;

    const userPrompt = `
KULLANICI MESAJI:
${ctx.message}

İLGİLENİLEN ÜRÜN:
${ctx.ilgilenilenUrun || "-"}

KONUŞMA AŞAMASI:
${ctx.conversationStage || "-"}

FOTOĞRAF GELDİ Mİ:
${ctx.photoReceived || "-"}

ÖDEME YÖNTEMİ:
${ctx.paymentMethod || "-"}

LAST INTENT:
${ctx.lastIntent || "-"}

ORDER STATUS:
${ctx.orderStatus || "-"}

BACK TEXT STATUS:
${ctx.backTextStatus || "-"}

ADDRESS STATUS:
${ctx.addressStatus || "-"}

CONTEXT LOCK:
${ctx.contextLock || "-"}

TOPIC:
${topic}

PRODUCT:
${product}
`;

    const payload = {
      model: "deepseek-chat",
      max_tokens: 700,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt + "\n\n" + knowledgeText
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    };

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("DEEPSEEK RESPONSE:", JSON.stringify(data, null, 2));

    const rawText = data?.choices?.[0]?.message?.content?.trim() || "";
    const cleanedText = extractJsonText(rawText);

    let parsed = null;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      parsed = null;
    }

    const reply = applyHardGuards({
      answer: parsed?.reply?.trim() || fallbackResponse(),
      ctx,
      topic,
      product
    });

    return res.status(200).json({
      reply,
      set_conversation_stage: normalizeStageName(
        unwrapManychatValue(parsed?.set_conversation_stage || "")
      ),
      set_last_intent: unwrapManychatValue(parsed?.set_last_intent || ""),
      set_ilgilenilen_urun: unwrapManychatValue(parsed?.set_ilgilenilen_urun || ""),
      set_photo_received: unwrapManychatValue(parsed?.set_photo_received || ""),
      set_payment_method: unwrapManychatValue(parsed?.set_payment_method || ""),
      set_order_status: unwrapManychatValue(parsed?.set_order_status || ""),
      set_back_text_status: unwrapManychatValue(parsed?.set_back_text_status || ""),
      set_address_status: unwrapManychatValue(parsed?.set_address_status || ""),
      set_support_mode: unwrapManychatValue(parsed?.set_support_mode || ""),
      set_siparis_alindi: unwrapManychatValue(parsed?.set_siparis_alindi || ""),
      set_cancel_reason: unwrapManychatValue(parsed?.set_cancel_reason || ""),
      set_context_lock: unwrapManychatValue(parsed?.set_context_lock || ""),
      set_menu_gosterildi: unwrapManychatValue(parsed?.set_menu_gosterildi || "")
    });
  } catch (err) {
    console.error("chat.js error:", err);
    return res.status(200).json({
      reply: fallbackResponse(),
      set_conversation_stage: "",
      set_last_intent: "",
      set_ilgilenilen_urun: "",
      set_photo_received: "",
      set_payment_method: "",
      set_order_status: "",
      set_back_text_status: "",
      set_address_status: "",
      set_support_mode: "",
      set_siparis_alindi: "",
      set_cancel_reason: "",
      set_context_lock: "",
      set_menu_gosterildi: ""
    });
  }
}
