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

  if (/^cuf_\d+$/.test(str)) return "";

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
    "mahalle", "mah", "sokak", "sk", "cadde", "cd", "no", "daire",
    "kat", "apartman", "apt", "site", "blok", "ilce", "ilçe",
    "istanbul", "ankara", "izmir", "beykoz", "sisli", "şişli",
    "umraniye", "ümraniye", "kadikoy", "kadıköy", "turkiye", "türkiye"
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

  // Mevcut ürün varsa onu koru
  if (existing.includes("lazer") || existing.includes("laser")) return "lazer";
  if (existing.includes("atac") || existing.includes("ataç")) return "atac";

  if (includesAny(msg, [
    "resimli", "fotografli", "fotoğraflı", "foto", "fotograf",
    "fotoğraf", "resimli olan", "plaka", "lazer"
  ])) {
    return "lazer";
  }

  if (includesAny(msg, ["atac", "ataç", "harfli", "harf"])) {
    return "atac";
  }

  return "unknown";
}

function detectTopic(text) {
  const msg = normalizeText(text);

  if (includesAny(msg, [
    "fiyat", "ne kadar", "nekadar", "kac tl", "kaç tl", "ucret", "ücret",
    "kac para", "kaç para", "indirim", "2li", "2 li", "ikili",
    "coklu alim", "çoklu alım"
  ])) return "pricing";

  if (includesAny(msg, [
    "kapida odeme", "kapıda ödeme", "eft", "havale", "iban",
    "odeme", "ödeme", "dekont"
  ])) return "payment";

  if (includesAny(msg, [
    "kargo", "teslim", "takip", "ptt", "aras", "gelmedi", "gecikti", "geçikti"
  ])) return "shipping";

  if (includesAny(msg, [
    "fotograf", "fotoğraf", "foto", "resim", "arka yuz", "arka yüz",
    "on yuz", "ön yüz", "arkali onlu", "arkalı önlü", "iki yuz", "iki yüz",
    "iki taraf", "kalp", "nazar", "aksesuar", "zincir"
  ])) return "image";

  if (includesAny(msg, [
    "guven", "güven", "garanti", "kalite", "kararma", "solma",
    "paslanma", "iade", "degisim", "değişim"
  ])) return "trust";

  if (includesAny(msg, [
    "siparis", "sipariş", "adres", "ad soyad", "cep telefonu",
    "dua yaz", "isim yaz"
  ])) return "order";

  if (includesAny(msg, [
    "merhaba", "selam", "tesekkur", "teşekkür", "tamam", "olur",
    "aynen", "peki", "tmm", "tmam"
  ])) return "smalltalk";

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

// Tüm cevaplarda kullanılan base state — mevcut ctx'i korur
function baseState(ctx, overrides = {}) {
  return {
    set_conversation_stage: ctx.conversationStage || "",
    set_last_intent: ctx.lastIntent || "",
    set_ilgilenilen_urun: ctx.ilgilenilenUrun || "",
    set_photo_received: ctx.photoReceived || "",
    set_payment_method: ctx.paymentMethod || "",
    set_order_status: ctx.orderStatus || "active",
    set_back_text_status: ctx.backTextStatus || "",
    set_address_status: ctx.addressStatus || "",
    set_support_mode: ctx.supportMode || "",
    set_siparis_alindi: ctx.siparisAlindi || "",
    set_cancel_reason: ctx.cancelReason || "",
    set_context_lock: ctx.contextLock || "",
    set_menu_gosterildi: ctx.menuGosterildi || "",
    ...overrides
  };
}

function directReply(ctx) {
  const msg = normalizeText(ctx.message);
  const product = detectProduct(ctx.message, ctx);
  const topic = detectTopic(ctx.message);

  // ── 1. İPTAL ──────────────────────────────────────────────────────────────
  if (includesAny(msg, [
    "iptal", "vazgectim", "vazgeçtim", "istemiyorum",
    "olmasin", "olmasın", "gerek kalmadi", "gerek kalmadı"
  ])) {
    return {
      reply: "Tabi efendim 😊",
      ...baseState(ctx, {
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
      })
    };
  }

  // ── 2. ADRES GELDİYSE ─────────────────────────────────────────────────────
  if (looksLikeAddressMessage(ctx.message)) {
    return {
      reply: "Tamamdır efendim 😊 Adresiniz kaydedildi. Ödemeniz nasıl olacak efendim? EFT / havale veya kapıda ödeme seçeneklerimiz mevcut.",
      ...baseState(ctx, {
        set_conversation_stage: "address_received",
        set_last_intent: "address",
        set_ilgilenilen_urun: product === "unknown" ? ctx.ilgilenilenUrun : product,
        set_address_status: "received",
        set_context_lock: "order_locked"
      })
    };
  }

  // ── 3. ÜRÜN BELLİ + KISA ONAY ────────────────────────────────────────────
  if (
    (ctx.ilgilenilenUrun === "lazer" || ctx.ilgilenilenUrun === "atac") &&
    includesAny(msg, ["tamam", "olur", "aynen", "peki", "tmm", "tmam",
      "soyle", "şöyle", "boyle", "böyle", "bekliyorum"])
  ) {
    return {
      reply: "Tabi efendim 😊",
      ...baseState(ctx, {
        set_last_intent: "smalltalk",
        set_context_lock: ctx.contextLock || "product_locked"
      })
    };
  }

  // ── 4. ÖDEME SEÇİMİ / DEĞİŞİMİ ───────────────────────────────────────────
  const payment = detectPaymentMethod(ctx.message);
  if (payment && canChangePayment(ctx)) {
    const addressDone =
      ctx.addressStatus === "received" ||
      ctx.conversationStage === "address_received" ||
      ctx.conversationStage === "payment_selected";

    if (payment === "eft") {
      if (addressDone) {
        return {
          reply: "Tamamdır efendim 😊 IBAN bilgimiz:\nTR34 0015 7000 0000 0076 2524 67\nAlıcı: Servet Cihan Nakipoğlu",
          ...baseState(ctx, {
            set_conversation_stage: "payment_selected",
            set_last_intent: "payment",
            set_ilgilenilen_urun: product === "unknown" ? ctx.ilgilenilenUrun : product,
            set_payment_method: "eft",
            set_order_status: "active",
            set_address_status: "received",
            set_siparis_alindi: "evet",
            set_context_lock: "order_locked"
          })
        };
      }
      if (product !== "unknown") {
        return {
          reply: product === "lazer"
            ? "Tabi efendim 😊 EFT / havale fiyatımız 599 TL'dir."
            : "Tabi efendim 😊 EFT / havale fiyatımız 499 TL'dir.",
          ...baseState(ctx, {
            set_last_intent: "payment",
            set_ilgilenilen_urun: product,
            set_payment_method: "eft",
            set_context_lock: "product_locked"
          })
        };
      }
    }

    if (payment === "kapida_odeme") {
      if (addressDone) {
        return {
          reply: "Tamamdır efendim 😊 Kapıda ödeme ile siparişiniz hazırlanacaktır.",
          ...baseState(ctx, {
            set_conversation_stage: "payment_selected",
            set_last_intent: "payment",
            set_ilgilenilen_urun: product === "unknown" ? ctx.ilgilenilenUrun : product,
            set_payment_method: "kapida_odeme",
            set_order_status: "active",
            set_address_status: "received",
            set_siparis_alindi: "evet",
            set_context_lock: "order_locked"
          })
        };
      }
      if (product !== "unknown") {
        return {
          reply: product === "lazer"
            ? "Evet efendim, kapıda ödeme seçeneğimiz mevcut. Kapıda ödeme fiyatımız 649 TL'dir 😊"
            : "Evet efendim, kapıda ödeme seçeneğimiz mevcut. Kapıda ödeme fiyatımız 549 TL'dir 😊",
          ...baseState(ctx, {
            set_last_intent: "payment",
            set_ilgilenilen_urun: product,
            set_payment_method: "kapida_odeme",
            set_context_lock: "product_locked"
          })
        };
      }
    }
  }

  // ── 5. FİYAT ──────────────────────────────────────────────────────────────
  if (topic === "pricing") {
    return {
      reply: pricingResponse(product === "unknown" ? ctx.ilgilenilenUrun : product),
      ...baseState(ctx, {
        set_last_intent: "pricing",
        set_ilgilenilen_urun: product === "unknown" ? "" : product,
        set_context_lock: product === "unknown" ? "" : "product_locked",
        set_menu_gosterildi: product === "unknown" ? "evet" : ""
      })
    };
  }

  // ── 6. FOTOĞRAF NASIL GÖNDERİLİR ─────────────────────────────────────────
  if (includesAny(msg, [
    "nasil gonderiyorum", "nasıl gönderiyorum",
    "nasil gonderebilirim", "nasıl gönderebilirim",
    "nereden gondereyim", "nereden göndereyim",
    "nasil atiyorum", "nasıl atıyorum",
    "buradan mi gonderiyorum", "buradan mı gönderiyorum"
  ])) {
    return {
      reply: "Buradan direkt gönderebilirsiniz efendim 😊",
      ...baseState(ctx, {
        set_conversation_stage: ctx.conversationStage || "photo_waiting",
        set_last_intent: "image",
        set_ilgilenilen_urun: product === "unknown" ? ctx.ilgilenilenUrun : product,
        set_context_lock: ctx.contextLock || "product_locked"
      })
    };
  }

  // ── 7. ZİNCİR MODELİ / DEĞİŞİMİ ─────────────────────────────────────────
  if (includesAny(msg, [
    "zincir model", "zincirden olma", "o zincirden", "bu zincirden",
    "ayni zincir", "aynı zincir", "o zincir gibi", "zincir degisim",
    "zincir değişim", "zincir degistir", "zincir değiştir",
    "zincir seceneg", "zincir seçeneg", "baska zincir", "başka zincir",
    "farkli zincir", "farklı zincir", "hangi zincir", "zincirden mi"
  ])) {
    return {
      reply: "Tabi efendim, size zincir modellerimizi hemen atalım 😊",
      ...baseState(ctx, {
        set_last_intent: "image",
        set_ilgilenilen_urun: product === "unknown" ? ctx.ilgilenilenUrun : product,
        set_context_lock: ctx.contextLock || "product_locked"
      })
    };
  }

  // ── 8. ZİNCİR UZUNLUĞU ────────────────────────────────────────────────────
  if (
    product === "lazer" &&
    includesAny(msg, [
      "zincirin uzunlugu", "zincir uzunlugu", "zincir ne kadar",
      "zincir kac cm", "zincir kaç cm", "zincir boyu", "kac cm zincir"
    ])
  ) {
    const isErkek = includesAny(msg, [
      "erkek", "esime", "eşime", "babam", "erkek icin", "erkek için"
    ]);
    return {
      reply: isErkek
        ? "Tabi efendim, erkek için 50 cm gümüş zincirimiz mevcut 😊"
        : "Zincir uzunluğumuz 60 cm'dir efendim 😊",
      ...baseState(ctx, {
        set_last_intent: "image",
        set_ilgilenilen_urun: "lazer",
        set_context_lock: "product_locked"
      })
    };
  }

  // ── 9. ERKEK İÇİN ZİNCİR ─────────────────────────────────────────────────
  if (
    product === "lazer" &&
    includesAny(msg, ["erkek icin", "erkek için", "erkek kullan", "erkek takacak"]) &&
    includesAny(msg, ["zincir", "uzunluk", "cm", "boy"])
  ) {
    return {
      reply: "Tabi efendim, erkek için 50 cm gümüş zincirimiz mevcut 😊",
      ...baseState(ctx, {
        set_last_intent: "image",
        set_ilgilenilen_urun: "lazer",
        set_context_lock: "product_locked"
      })
    };
  }

  // ── 10. ÇIFT YÜZ / ARKALI ÖNLÜ FOTOĞRAF ──────────────────────────────────
  if (
    product === "lazer" &&
    (
      (includesAny(msg, ["iki yuz", "iki yüz", "iki taraf", "arkali onlu", "arkalı önlü"]) &&
       includesAny(msg, ["foto", "fotograf", "fotoğraf", "resim"])) ||
      (includesAny(msg, ["one birini", "öne birini", "arkaya birini", "one bir", "öne bir"]) &&
       includesAny(msg, ["foto", "fotograf", "fotoğraf", "resim", "yap"]))
    )
  ) {
    return {
      reply: "Tabi efendim, ön yüze bir fotoğraf, arka yüze bir fotoğraf yapabiliyoruz. Fiyat farkı da olmuyor 😊",
      ...baseState(ctx, {
        set_last_intent: "image",
        set_ilgilenilen_urun: "lazer",
        set_context_lock: "product_locked"
      })
    };
  }

  // ── 11. TEK ZİNCİRDE ÇOKLU PLAKA ─────────────────────────────────────────
  if (
    product === "lazer" &&
    includesAny(msg, [
      "3 plaka", "2 plaka", "iki plaka", "uc plaka", "üç plaka",
      "ayni zincirde plaka", "aynı zincirde plaka",
      "bir zincirde plaka", "coklu plaka", "çoklu plaka"
    ])
  ) {
    return {
      reply: "Bu şekilde yapmıyoruz efendim, bir zincirde tek plaka oluyor 😊",
      ...baseState(ctx, {
        set_last_intent: "image",
        set_ilgilenilen_urun: "lazer",
        set_context_lock: "product_locked"
      })
    };
  }

  // ── 12. AKSESUAR ──────────────────────────────────────────────────────────
  if (product === "lazer" && includesAny(msg, ["kalp", "nazar", "aksesuar"])) {
    return {
      reply: "Pembe kalbimiz ve nazar boncuğumuz mevcut efendim 😊",
      ...baseState(ctx, {
        set_last_intent: "image",
        set_ilgilenilen_urun: "lazer",
        set_context_lock: "product_locked"
      })
    };
  }

  // ── 13. KALİTE / GARANTİ / ÇELİK ─────────────────────────────────────────
  if (includesAny(msg, [
    "celik mi", "çelik mi", "kararma", "solma", "paslanma",
    "kalite", "garanti", "saglammi", "sağlam mı", "dayanikli", "dayanıklı"
  ])) {
    return {
      reply: "Ürünlerimiz paslanmaz çeliktir efendim 😊 Kararma, solma veya paslanma yapmaz.",
      ...baseState(ctx, {
        set_last_intent: "trust",
        set_ilgilenilen_urun: product === "unknown" ? ctx.ilgilenilenUrun : product,
        set_context_lock: ctx.contextLock || (product === "unknown" ? "" : "product_locked")
      })
    };
  }

  // ── 14. FOTOĞRAF UYGUNLUĞU / KİŞİ SAYISI ─────────────────────────────────
  if (
    product === "lazer" &&
    includesAny(msg, [
      "olur mu", "iki kisi", "iki kişi", "uc kisi", "üç kişi",
      "3 kisi", "3 kişi", "4 kisi", "4 kişi",
      "aile fotosu", "aile fotoğrafı", "bebek",
      "vesikalik", "vesikalık", "eski foto", "ekran goruntus", "ekran görüntüs"
    ])
  ) {
    return {
      reply: "Gönderin efendim, kontrol edelim 😊",
      ...baseState(ctx, {
        set_conversation_stage: ctx.conversationStage || "photo_waiting",
        set_last_intent: "image",
        set_ilgilenilen_urun: "lazer",
        set_context_lock: "product_locked"
      })
    };
  }

  // ── 15. FOTOĞRAF GÖNDER ───────────────────────────────────────────────────
  if (
    product === "lazer" &&
    includesAny(msg, [
      "gondereyim", "göndereyim", "fotograf gonder", "fotoğraf gönder",
      "buradan gonder", "buradan gönder", "foto atayim", "foto atayım"
    ])
  ) {
    return {
      reply: "Fotoğrafı buradan gönderebilirsiniz efendim 😊",
      ...baseState(ctx, {
        set_conversation_stage: "photo_waiting",
        set_last_intent: "image",
        set_ilgilenilen_urun: "lazer",
        set_context_lock: "product_locked"
      })
    };
  }

  // ── 16. ÜRÜN TANITIMI (lazer) ─────────────────────────────────────────────
  if (
    !ctx.ilgilenilenUrun &&
    includesAny(msg, [
      "resimli", "lazer", "resimli olan", "fotografli",
      "fotoğraflı", "fotolu", "foto kolye"
    ])
  ) {
    return {
      reply: "Resimli lazer kolye 😊\n\nGönderdiğiniz fotoğraf lazer ile çelik plakaya işlenir.\n\nFiyat\nEFT / Havale : 599 TL\nKapıda ödeme : 649 TL\n\nFotoğrafı buradan gönderebilirsiniz.",
      ...baseState(ctx, {
        set_conversation_stage: "product_selected",
        set_last_intent: "product",
        set_ilgilenilen_urun: "lazer",
        set_context_lock: "product_locked",
        set_menu_gosterildi: "evet"
      })
    };
  }

  // ── 17. ÜRÜN BELİRSİZ + GENEL SORU ───────────────────────────────────────
  if (
    product === "unknown" &&
    !ctx.ilgilenilenUrun &&
    includesAny(msg, ["fiyat", "bilgi", "detay", "ne kadar", "nekadar", "urun", "ürün"])
  ) {
    return {
      reply: "Hangi model ile ilgileniyorsunuz? 😊\n• Resimli lazer kolye\n• Harfli ataç kolye",
      ...baseState(ctx, {
        set_conversation_stage: "product_unknown",
        set_last_intent: "product",
        set_ilgilenilen_urun: "",
        set_context_lock: "",
        set_menu_gosterildi: "evet"
      })
    };
  }

  return null;
}

function selectKnowledgeFiles() {
  const files = [
    "SYSTEM_MASTER.txt",
    "CORE_SYSTEM.txt",
    "ROUTING_RULES.txt",
    "PRICING.txt",
    "PAYMENT.txt",
    "SHIPPING.txt",
    "IMAGE_RULES.txt",
    "TRUST.txt",
    "ORDER_FLOW.txt",
    "SMALLTALK.txt",
    "PRODUCT_LASER.txt",
    "PRODUCT_ATAC.txt",
    "EDGE_CASES.txt",
    "FEW_SHOT_EXAMPLES.txt"
  ];
  return files
    .map((file) => safeReadKnowledgeFile(file))
    .filter(Boolean)
    .join("\n\n---\n\n");
}

function applyHardGuards({ answer, ctx, product }) {
  // Yanlış fiyat engeli
  if (hasForbiddenPrice(answer)) {
    return fallbackResponse();
  }

  // Ürün setli iken ana menü açılmasın
  if (
    ctx.ilgilenilenUrun &&
    answer.includes("Hangi model ile ilgileniyorsunuz")
  ) {
    return fallbackResponse();
  }

  // Adres alındıysa tekrar adres istemesin
  if (
    (ctx.addressStatus === "received" || ctx.conversationStage === "address_received") &&
    includesAny(answer, ["adresinizi", "açık adres", "ad soyad", "cep telefonu"])
  ) {
    return fallbackResponse();
  }

  return answer;
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
        ...baseState(ctx)
      });
    }

    console.log("CTX:", JSON.stringify({
      message: ctx.message,
      ilgilenilenUrun: ctx.ilgilenilenUrun,
      conversationStage: ctx.conversationStage,
      photoReceived: ctx.photoReceived,
      paymentMethod: ctx.paymentMethod,
      lastIntent: ctx.lastIntent,
      orderStatus: ctx.orderStatus,
      addressStatus: ctx.addressStatus,
      contextLock: ctx.contextLock
    }, null, 2));

    // Önce deterministic cevap dene
    const direct = directReply(ctx);
    if (direct) {
      console.log("DIRECT REPLY:", direct.reply);
      return res.status(200).json(direct);
    }

    // AI fallback
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        reply: fallbackResponse(),
        ...baseState(ctx)
      });
    }

    const product = detectProduct(ctx.message, ctx);
    const topic = detectTopic(ctx.message);
    const knowledgeText = selectKnowledgeFiles();

    const systemPrompt = `Sen Yudum Jewels için çalışan Instagram satış asistanısın.

KRİTİK KURALLAR:
1. Sadece verilen bilgi dosyalarındaki bilgilere göre cevap ver.
2. Dosyada olmayan HİÇBİR fiyat yazma. 299, 349, 399, 449 ASLA yazılamaz.
3. Doğru fiyatlar: Lazer kolye EFT=599TL, Kapıda=649TL | Ataç kolye EFT=499TL, Kapıda=549TL
4. ilgilenilen_urun doluysa "Hangi model ile ilgileniyorsunuz?" YAZMA.
5. address_status=received ise tekrar adres ISTEME.
6. Gerçekten kapsam dışı olan durumda SADECE şunu yaz: Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊
7. Kısa, net, sıcak yaz. Robot gibi yazma.
8. Ürün bağlamını koru. Lazer kolyedeysen ataç bilgisi verme.

JSON formatında cevap ver:
{
  "reply": "müşteriye cevap",
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
}`;

    const userPrompt = `MÜŞTERİ MESAJI: ${ctx.message}

BAĞLAM:
- İlgilenilen ürün: ${ctx.ilgilenilenUrun || "-"}
- Konuşma aşaması: ${ctx.conversationStage || "-"}
- Fotoğraf geldi mi: ${ctx.photoReceived || "-"}
- Ödeme yöntemi: ${ctx.paymentMethod || "-"}
- Son intent: ${ctx.lastIntent || "-"}
- Sipariş durumu: ${ctx.orderStatus || "-"}
- Adres durumu: ${ctx.addressStatus || "-"}
- Context lock: ${ctx.contextLock || "-"}
- Tespit edilen konu: ${topic}
- Tespit edilen ürün: ${product}`;

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
    console.log("DEEPSEEK:", JSON.stringify(data?.choices?.[0]?.message?.content));

    const rawText = data?.choices?.[0]?.message?.content?.trim() || "";
    const cleanedText = extractJsonText(rawText);

    let parsed = null;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      parsed = null;
    }

    const rawReply = parsed?.reply?.trim() || fallbackResponse();
    const reply = applyHardGuards({ answer: rawReply, ctx, product });

    return res.status(200).json({
      reply,
      set_conversation_stage: normalizeStageName(unwrapManychatValue(parsed?.set_conversation_stage || "")),
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
