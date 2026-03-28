import fs from "fs";
import path from "path";

const fileCache = {};

const FALLBACK_TEXT = "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";

const MAIN_MENU_TEXT =
  "Merhaba efendim 😊\nHangi model ile ilgileniyorsunuz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye";

const LASER_PRICE_TEXT =
  "Resimli lazer kolye fiyatımız EFT / Havale ile 599,90 TL, kapıda ödeme ile 649,90 TL’dir efendim 😊 Siparişe devam etmek isterseniz fotoğrafı buradan gönderebilirsiniz.";

const ATAC_PRICE_TEXT =
  "Harfli ataç kolye fiyatımız EFT / Havale ile 499,90 TL, kapıda ödeme ile 549,90 TL’dir efendim 😊 Siparişe devam etmek isterseniz istediğiniz harfleri yazabilirsiniz.";

const EFT_INFO_TEXT =
  "IBAN: TR34 0015 7000 0000 0076 2524 67\nAlıcı: Servet Cihan Nakipoğlu";

const ORDER_DETAILS_TEXT =
  "📌 Sipariş için lütfen şu 3 bilgiyi mümkünse tek mesajda paylaşın:\n\n👤 Ad soyad\n📱 Cep telefonu\n📍 Açık adres";

const SHIPPING_TIME_FALLBACK_TEXT =
  "Kargo süremiz İstanbul için genelde 1-2 iş günü, diğer iller için 2-3 iş günü civarındadır efendim 😊";

const CRITICAL_KNOWLEDGE_FILES = [
  "CORE_SYSTEM.txt",
  "PAYMENT.txt",
  "PRICING.txt",
  "SHIPPING.txt",
  "ORDER_FLOW.txt",
];

const TURKEY_CITIES = [
  "adana", "adiyaman", "afyonkarahisar", "agri", "aksaray", "amasya", "ankara", "antalya", "ardahan", "artvin", "aydin",
  "balikesir", "bartin", "batman", "bayburt", "bilecik", "bingol", "bitlis", "bolu", "burdur", "bursa",
  "canakkale", "cankiri", "corum",
  "denizli", "diyarbakir", "duzce",
  "edirne", "elazig", "erzincan", "erzurum", "eskisehir",
  "gaziantep", "giresun", "gumushane",
  "hakkari", "hatay",
  "igdir", "isparta", "istanbul", "izmir",
  "kahramanmaras", "karabuk", "karaman", "kars", "kastamonu", "kayseri", "kilis", "kirikkale", "kirklareli", "kirsehir", "kocaeli", "konya", "kutahya",
  "malatya", "manisa", "mardin", "mersin", "mugla", "mus",
  "nevsehir", "nigde",
  "ordu", "osmaniye",
  "rize",
  "sakarya", "samsun", "siirt", "sinop", "sivas", "sanliurfa", "sirnak",
  "tekirdag", "tokat", "trabzon", "tunceli",
  "usak",
  "van",
  "yalova", "yozgat",
  "zonguldak"
];

const DISTRICT_KEYWORDS = [
  "kadikoy", "kadıköy", "beykoz", "uskudar", "üsküdar", "besiktas", "beşiktaş",
  "sisli", "şişli", "fatih", "moda", "kavacik", "kavacık", "eminonu", "eminönü",
  "nusaybin", "beyazit", "beyazıt", "kizilay", "kızılay", "cankaya", "çankaya"
];

const KEYWORDS = {
  product: {
    lazer: [
      "resimli",
      "fotografli",
      "foto",
      "fotolu",
      "lazer",
      "resim kolye",
      "foto kolye",
      "fotografli kolye",
      "fotoğraflı kolye"
    ],
    atac: [
      "atac",
      "ataç",
      "harfli",
      "harf kolye",
      "harfli kolye",
      "3 harf",
      "uc harf",
      "isim harf",
      "harfli atac",
    ],
  },

  intents: {
    cancel: ["siparisi iptal", "siparişi iptal", "iptal", "vazgectim", "vazgeçtim"],
    smalltalk: ["merhaba", "selam", "slm", "iyi aksamlar", "iyi akşamlar", "gunaydin", "günaydın", "nasilsiniz"],
    location: ["yeriniz nerede", "neredesiniz", "konum", "magaza", "mağaza", "eminonu", "eminönü"],
    shippingPrice: [
      "kargo ucreti ne kadar",
      "kargo ücreti ne kadar",
      "kargo ucreti oduyor muyuz",
      "kargo ücreti ödüyor muyuz",
      "kargo fiyati var mi",
      "kargo fiyatı var mı",
      "kargo dahil mi",
      "kargo ücretli mi",
      "kargo ucretli mi",
      "kargo ucreti var mi",
      "kargo ücreti var mı",
    ],
    shipping: [
      "kargo",
      "teslimat",
      "ne zaman gelir",
      "kac gunde",
      "kaç günde",
      "takip no",
      "kargom nerede",
      "ne zaman kargolarsiniz",
      "ne zaman kargoya verilir",
    ],
    trust: [
      "guvenilir",
      "guven",
      "dolandirici",
      "orijinal",
      "saglam",
      "kararma",
      "kararir mi",
      "kararma yapar mi",
      "kararma olur mu",
      "kararır mı",
      "kararma yapar mı",
      "kararma olur mu",
      "solar",
      "solma",
      "paslan",
      "kaplama",
      "kaplamasi atar",
      "kaplaması atar",
    ],
    payment: [
      "kapida odeme",
      "kapıda ödeme",
      "kapida odeme olur mu",
      "kapıda ödeme olur mu",
      "kapida odeme var mi",
      "kapıda ödeme var mı",
      "kapida oderim",
      "kapıda öderim",
      "kapida odeme olsun",
      "kapıda ödeme olsun",
      "kapida olsun",
      "kapıda olsun",
      "kapida",
      "kapıda",
      "eft",
      "havale",
      "odeme",
      "ödeme",
    ],
    price: ["fiyat", "ne kadar", "ucret", "ücret", "kac tl", "kaç tl"],
    chain: [
      "zincir modeli",
      "zincir degisiyor mu",
      "zincir değişiyor mu",
      "zincir kisalir mi",
      "zincir kısalır mı",
      "zincir boyu",
      "zincir uzunlugu",
      "zincir uzunluğu",
      "zincir ne kadar",
      "uzunlugu ne kadar",
      "uzunluğu ne kadar",
      "zincir kac cm",
      "zincir kaç cm",
    ],
    orderStart: ["siparis vermek istiyorum", "sipariş vermek istiyorum", "siparis verecegim", "sipariş vereceğim", "almak istiyorum", "hazirlayalim", "hazırlayalım", "istiyorum", "ilgileniyorum"],
    photoQuestion: [
      "bu foto olur mu",
      "fotograf uygun mu",
      "foto uygun mu",
      "nasil olsun foto",
      "nasil foto",
      "hangi fotoyu atayim",
      "buradan mi atayim",
      "whatsapptan mi",
      "nasil aticam",
      "nasil atacam",
      "fotoyu nasil atayim",
      "foto atsam olur mu",
      "fotograf atsam olur mu",
      "gondersem olur mu",
      "fotoğraf atsam olur mu",
      "fotoğrafı nasıl göndereceğiz",
      "resim nasıl gönderiyorum",
      "resim nasil gonderiyorum",
      "resim nasil gonderirim",
      "resmi nasil gonderiyorum",
      "resmi nasil gonderirim",
      "fotografi atsam olur mu",
      "resim nasil gonderiyorum",
    ],
    backPhotoPrice: [
      "arkasina fotograf ne kadar",
      "arkasına fotograf ne kadar",
      "arkasina foto ne kadar",
      "arkasına foto ne kadar",
      "arka tarafa fotograf koymak istesek ne kadar olacak",
      "arka tarafa foto koymak istesek ne kadar olacak",
      "ek ucret",
      "ek ücret",
      "arkasina foto koyarsam fiyat ne olur",
      "arkasına foto koyarsam fiyat ne olur",
      "arkasina fotograf koyarsam fiyat ne olur",
      "arkasına fotoğraf koyarsam fiyat ne olur",
    ],
    backTextInfo: [
      "arka tarafina da mi yazabiliyoruz",
      "arka tarafina da yazabiliyor muyuz",
      "arkasina yazi oluyor mu",
      "arkasına yazı oluyor mu",
      "arkasina yazi olur mu",
      "arkasına yazı olur mu",
      "arka yuzune yazi oluyor mu",
      "arka yüzüne yazı oluyor mu",
      "arka yuzune yazi olur mu",
      "arka yüzüne yazı olur mu",
      "arkaya yazi yaziliyor mu",
      "arkaya yazı yazılıyor mu",
      "arka tarafa yazi oluyor mu",
    ],
    backPhotoInfo: [
      "arkali onlu fotograf olur mu",
      "arkalı önlü fotoğraf olur mu",
      "arkali onlu foto olur mu",
      "arkalı önlü foto olur mu",
      "on yuze bir fotograf arka yuze bir fotograf",
      "ön yüze bir fotoğraf arka yüze bir fotoğraf",
      "arkasina fotograf olur mu",
      "arkasına fotoğraf olur mu",
      "arkasina foto olur mu",
      "arkasına foto olur mu",
      "arka yuzune fotograf olur mu",
      "arka yüzüne fotoğraf olur mu",
      "arka yuzune foto olur mu",
      "arka yüzüne foto olur mu",
      "arka tarafina fotograf koymak istesek",
      "arka tarafina foto koymak istesek",
      "kolyenin iki yuzune de resim yapabilir misiniz",
      "kolyenin iki yüzüne de resim yapabilir misiniz",
      "iki yuzune de foto olur mu",
      "iki yüzüne de foto olur mu",
    ],
    backTextSkip: [
      "yok",
      "istemiyorum",
      "gerek yok",
      "bos kalsin",
      "boş kalsın",
      "bos olsun",
      "boş olsun",
      "arka bos kalsin",
      "arka boş kalsın",
      "yazi olmasin",
      "yazı olmasın",
      "arka yazi yok",
      "arka yazı yok",
    ],
    backTextDirect: [
      "arkasina yazi",
      "arkasına yazı",
      "arka yazi",
      "arka yazı",
      "arkasina tarih",
      "arkasına tarih",
      "arkaya yazi",
      "arkaya yazı",
      "arka tarafa yazi",
      "arka tarafa yazı",
    ],
  },
};

const LETTER_STOPWORDS = [
  "devam", "tamam", "evet", "olur", "merhaba", "selam", "slm", "fiyat", "ucret", "ücret",
  "kapida", "kapıda", "eft", "havale", "odeme", "ödeme", "hayir", "hayır", "gonder", "gönder"
];

function readKnowledgeFile(filename) {
  if (fileCache[filename]) return fileCache[filename];
  const filePath = path.join(process.cwd(), "knowledge", filename);
  const content = fs.readFileSync(filePath, "utf8");
  fileCache[filename] = content;
  return content;
}

function safeRead(filename) {
  try {
    const content = readKnowledgeFile(filename);
    if (!content || !String(content).trim()) {
      console.warn(`Knowledge file empty: ${filename}`);
    }
    return content;
  } catch (error) {
    console.warn(`Knowledge file missing/unreadable: ${filename} - ${error.message}`);
    return "";
  }
}

function checkCriticalKnowledgeFiles() {
  for (const filename of CRITICAL_KNOWLEDGE_FILES) {
    try {
      const content = readKnowledgeFile(filename);
      if (!content || !String(content).trim()) {
        console.warn(`CRITICAL knowledge empty: ${filename}`);
      }
    } catch (error) {
      console.warn(`CRITICAL knowledge missing: ${filename} - ${error.message}`);
    }
  }
}

function hasAny(text, keywords) {
  return keywords.some((k) => text.includes(k));
}

function unwrapManychatValue(value) {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (!str) return "";
  if (/^\{\{\{?.+?\}\}\}?$/.test(str)) return "";
  if (/^\{[^}]+\}$/.test(str)) return "";
  if (/^cuf_\d+$/i.test(str)) return "";
  if (/^(undefined|null|none|nan)$/i.test(str)) return "";
  return str;
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/[^\w\s:/?.=&+\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truthy(value) {
  const v = normalizeText(unwrapManychatValue(value));
  return ["1", "true", "evet", "yes", "var", "alindi", "tamam", "received", "done"].includes(v);
}

function cleanReply(text) {
  const t = String(text || "").trim();
  if (!t) return FALLBACK_TEXT;
  return t.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function looksLikePhotoUrl(rawMessage = "") {
  const raw = String(rawMessage || "").trim().toLowerCase();
  if (!raw) return false;
  const isUrl = raw.startsWith("http://") || raw.startsWith("https://");
  if (!isUrl) return false;
  return (
    raw.includes("lookaside.fbsbx.com") ||
    raw.includes("ig_messaging_cdn") ||
    raw.includes("cdninstagram") ||
    raw.includes("cdn.instagram") ||
    raw.includes(".jpg") ||
    raw.includes(".jpeg") ||
    raw.includes(".png") ||
    raw.includes(".webp")
  );
}

function extractPhone(rawMessage = "") {
  const raw = String(rawMessage || "");
  const matches = raw.match(/(?:\+?90[\s().-]*)?(?:0?5\d(?:[\s().-]*\d){8})/g) || [];

  for (const match of matches) {
    const digits = match.replace(/\D/g, "");

    if (/^905\d{9}$/.test(digits)) {
      return digits.slice(-10);
    }

    if (/^05\d{9}$/.test(digits)) {
      return digits.slice(-10);
    }

    if (/^5\d{9}$/.test(digits)) {
      return digits;
    }
  }

  return "";
}

function looksLikeAddress(messageNorm, rawMessage = "") {
  const raw = String(rawMessage || "").trim();
  if (!raw || raw.length < 8) return false;

  const addressKeywords = [
    "mahalle", "mah", "sokak", "sk", "cadde", "cd", "bulvar", "no", "daire", "apt",
    "apartman", "apart", "ap", "kat", "site", "sitesi", "blok", "ilce", "ilçe",
    "mahallesi", "ic kapi", "iç kapı", ...DISTRICT_KEYWORDS, ...TURKEY_CITIES
  ];

  let hit = 0;
  for (const k of addressKeywords) {
    if (messageNorm.includes(k)) hit++;
  }

  const hasNumber = /\d/.test(raw);

  if (hit >= 2) return true;
  if (hit >= 1 && hasNumber) return true;

  const cityCount = TURKEY_CITIES.filter((c) => messageNorm.includes(c)).length;
  const districtCount = DISTRICT_KEYWORDS.filter((d) => messageNorm.includes(d)).length;

  if (cityCount >= 1 && districtCount >= 1) return true;

  return false;
}

function looksLikeNameInput(rawMessage = "", messageNorm = "") {
  const raw = String(rawMessage || "").trim();
  if (!raw) return false;
  if (raw.length < 4 || raw.length > 40) return false;
  if (/\d/.test(raw)) return false;
  if (/[?!.:/]/.test(raw)) return false;

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;
  if (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/.test(raw)) return false;
  if (looksLikeAddress(messageNorm, raw)) return false;

  return true;
}

function normalizeProduct(value) {
  const v = normalizeText(value);
  if (["lazer", "resimli", "resimli lazer kolye"].includes(v)) return "lazer";
  if (["atac", "ataç", "harfli atac kolye", "harfli ataç kolye"].includes(v)) return "atac";
  return "";
}

function normalizePayment(value) {
  const v = normalizeText(value);
  if (!v) return "";
  if (v.includes("kapida")) return "kapida_odeme";
  if (v.includes("eft") || v.includes("havale")) return "eft_havale";
  return "";
}

function normalizeOrderStatus(value) {
  const v = normalizeText(value);
  if (!v) return "";
  if (["started", "collecting", "address_pending"].includes(v)) return "started";
  if (["completed", "done", "tamam"].includes(v)) return "completed";
  if (["cancel_requested"].includes(v)) return "cancel_requested";
  return "";
}

function normalizeAddressStatus(value) {
  const v = normalizeText(value);
  if (!v) return "";
  if (["received", "alindi", "done", "tamam"].includes(v)) return "received";
  if (["address_only", "eksik", "partial"].includes(v)) return "address_only";
  return "";
}

function normalizeBackTextStatus(value) {
  const v = normalizeText(value);
  if (!v) return "";
  if (["received", "alindi", "done", "tamam"].includes(v)) return "received";
  if (["skipped", "atlandi", "istemiyor", "yok"].includes(v)) return "skipped";
  return "";
}

function normalizeStage(value) {
  const v = normalizeText(value);
  if (!v) return "";
  const allowed = [
    "waiting_photo",
    "waiting_payment",
    "waiting_address",
    "waiting_letters",
    "waiting_product",
    "waiting_back_text",
    "order_completed",
    "human_support",
  ];
  return allowed.includes(v.replace(/\s+/g, "_")) ? v.replace(/\s+/g, "_") : "";
}

function isExplicitProductSwitch(messageNorm) {
  return hasAny(messageNorm, [
    "yok ben",
    "onun yerine",
    "degistirelim",
    "degistirmek istiyorum",
    "değiştirelim",
    "değiştirmek istiyorum",
    "ben atac alayim",
    "ben ataç alayım",
    "ben resimli istiyorum",
    "ben lazer istiyorum",
    "ataç alayım",
    "atac alayim",
    "fikrimi degistirdim",
    "fikrimi değiştirdim",
  ]);
}

function detectProduct(messageNorm, existingProduct = "") {
  const existing = normalizeProduct(existingProduct);
  if (existing) return existing;
  if (hasAny(messageNorm, KEYWORDS.product.lazer)) return "lazer";
  if (hasAny(messageNorm, KEYWORDS.product.atac)) return "atac";
  return "";
}

function parsePaymentMethod(messageNorm, existing = "") {
  if (hasAny(messageNorm, ["kapida odeme", "kapıda ödeme", "kapida", "kapıda", "odeme olsun", "ödeme olsun"])) {
    return "kapida_odeme";
  }
  if (hasAny(messageNorm, ["eft", "havale"])) {
    return "eft_havale";
  }
  return existing || "";
}

function extractEntities(baseContext) {
  const { message, messageNorm, detectedProduct, conversationStage } = baseContext;

  const phone = extractPhone(message);
  const hasAddress = looksLikeAddress(messageNorm, message);
  const hasName = looksLikeNameInput(message, messageNorm);
  const payment = parsePaymentMethod(messageNorm, "");
  const photoLink = looksLikePhotoUrl(message);

  let letters = "";
  if (detectedProduct === "atac" && ["", "waiting_letters", "waiting_product"].includes(conversationStage)) {
    const raw = String(message || "").trim();
    const norm = normalizeText(raw);
    const parts = norm.split(/\s+/).filter(Boolean);
    const looksLikeLetters =
      raw &&
      raw.length <= 24 &&
      !/[?!.:,/]/.test(raw) &&
      /^[a-zA-ZçğıöşüÇĞİÖŞÜ\s&]+$/.test(raw) &&
      parts.length <= 3 &&
      !LETTER_STOPWORDS.includes(norm) &&
      !hasAny(norm, [
        "atac", "ataç", "harfli", "kolye", "istiyorum", "ilgileniyorum",
        "almak istiyorum", "kac tane", "kaç tane", "hangi harf", "hangi harfler",
        "harf mi", "fiyat", "ne kadar", "olur mu"
      ]);

    if (looksLikeLetters) letters = raw;
  }

  return {
    phone,
    hasAddress,
    hasName,
    payment,
    photoLink,
    letters,
  };
}

function detectIntent(baseContext, extracted) {
  const { messageNorm, message, detectedProduct, conversationStage } = baseContext;

  if (conversationStage === "waiting_back_text" && hasAny(messageNorm, KEYWORDS.intents.backTextSkip)) {
    return "back_text_skip";
  }

  if (hasAny(messageNorm, KEYWORDS.intents.cancel)) {
    return "cancel_order";
  }

  if (
    conversationStage === "waiting_back_text" &&
    hasAny(messageNorm, [
      "olur mu bu fotograf",
      "olur mu bu foto",
      "sizce bu fotograf olur mu",
      "sizce bu foto olur mu",
      "bu fotograf olur mu",
      "bu foto olur mu",
      "fotograf uygun mu",
      "foto uygun mu",
      "uygun mudur",
    ])
  ) {
    return "photo_suitability_question";
  }

  if (conversationStage === "waiting_back_text" && hasAny(messageNorm, KEYWORDS.intents.backTextInfo)) {
    return "back_text_info";
  }

  if (conversationStage === "waiting_back_text" && hasAny(messageNorm, KEYWORDS.intents.backPhotoInfo)) {
    return "back_photo_info";
  }

  if (hasAny(messageNorm, KEYWORDS.intents.backPhotoPrice)) {
    return "back_photo_price";
  }

  if (looksLikePhotoUrl(message) && detectedProduct === "lazer") {
    return conversationStage === "waiting_back_text" ? "back_photo_upload" : "photo";
  }

  if (hasAny(messageNorm, KEYWORDS.intents.shippingPrice)) return "shipping_price";
  if (hasAny(messageNorm, KEYWORDS.intents.shipping)) return "shipping";
  if (hasAny(messageNorm, KEYWORDS.intents.trust)) return "trust";
  if (hasAny(messageNorm, KEYWORDS.intents.location)) return "location";
  if (hasAny(messageNorm, KEYWORDS.intents.payment)) return "payment";
  if (hasAny(messageNorm, KEYWORDS.intents.chain)) return "chain_question";
  if (hasAny(messageNorm, KEYWORDS.intents.price)) return "price";
  if (hasAny(messageNorm, KEYWORDS.intents.photoQuestion)) return "photo_question";

  if (hasAny(messageNorm, KEYWORDS.intents.backTextDirect)) return "back_text";

  if (conversationStage === "waiting_back_text") {
    const blocked = hasAny(messageNorm, [
      ...KEYWORDS.intents.smalltalk,
      ...KEYWORDS.intents.cancel,
      ...KEYWORDS.intents.payment,
      ...KEYWORDS.intents.shipping,
      ...KEYWORDS.intents.shippingPrice,
      ...KEYWORDS.intents.trust,
      ...KEYWORDS.intents.location,
      ...KEYWORDS.intents.price,
      ...KEYWORDS.intents.chain,
      ...KEYWORDS.intents.photoQuestion,
      ...KEYWORDS.intents.backTextInfo,
      ...KEYWORDS.intents.backPhotoInfo,
      ...KEYWORDS.intents.backPhotoPrice,
      ...KEYWORDS.intents.backTextSkip,
    ]);

    const raw = String(message || "").trim();

    if (
      raw &&
      !blocked &&
      !looksLikePhotoUrl(message) &&
      raw.length <= 80
    ) {
      return "back_text";
    }
  }

  if (looksLikeAddress(messageNorm, message)) return "address";
  if (extracted.phone) return "phone";
  if (extracted.hasName) return "name_only";

  if (detectedProduct === "atac" && extracted.letters) {
    return "letters";
  }

  if (hasAny(messageNorm, KEYWORDS.intents.smalltalk)) return "smalltalk";
  if (hasAny(messageNorm, KEYWORDS.intents.orderStart)) return "order_start";

  return "general";
}

function buildContext(body) {
  const message = unwrapManychatValue(body.message || body.last_input_text || body.last_user_message || "");
  const ilgilenilen_urun = unwrapManychatValue(body.ilgilenilen_urun);
  const user_product = unwrapManychatValue(body.user_product);
  const conversation_stage = normalizeStage(unwrapManychatValue(body.conversation_stage));
  const photo_received = unwrapManychatValue(body.photo_received);
  const payment_method = normalizePayment(unwrapManychatValue(body.payment_method));
  const menu_gosterildi = unwrapManychatValue(body.menu_gosterildi || body.menu_shown || body.menuShown);
  const ai_reply = unwrapManychatValue(body.ai_reply);
  const last_intent = unwrapManychatValue(body.last_intent);
  const order_status = normalizeOrderStatus(unwrapManychatValue(body.order_status));
  const back_text_status = normalizeBackTextStatus(unwrapManychatValue(body.back_text_status));
  const address_status = normalizeAddressStatus(unwrapManychatValue(body.address_status));
  const support_mode = unwrapManychatValue(body.support_mode);
  const siparis_alindi = unwrapManychatValue(body.siparis_alindi);
  const cancel_reason = unwrapManychatValue(body.cancel_reason);
  const context_lock = unwrapManychatValue(body.context_lock);
  const letters_received = unwrapManychatValue(body.letters_received);
  const phone_received = unwrapManychatValue(body.phone_received);

  const existingProduct = ilgilenilen_urun || user_product || "";
  const previousProduct = normalizeProduct(existingProduct) || "";
  const messageNorm = normalizeText(message);
  const explicitProduct = detectProduct(messageNorm, "");
  let detectedProduct = explicitProduct || previousProduct || "";

  if (previousProduct && explicitProduct && previousProduct !== explicitProduct) {
    const isInfoQuestionAboutOtherProduct =
      hasAny(messageNorm, KEYWORDS.intents.price) ||
      hasAny(messageNorm, KEYWORDS.intents.shippingPrice) ||
      hasAny(messageNorm, KEYWORDS.intents.shipping) ||
      hasAny(messageNorm, KEYWORDS.intents.trust);

    if (!isExplicitProductSwitch(messageNorm) && isInfoQuestionAboutOtherProduct) {
      detectedProduct = previousProduct;
    } else {
      detectedProduct = explicitProduct;
    }
  }

  const baseContext = {
    raw: body,
    message,
    messageNorm,
    previousProduct,
    conversationStage: conversation_stage,
    fields: {
      ilgilenilen_urun,
      user_product,
      conversation_stage,
      photo_received,
      payment_method,
      menu_gosterildi,
      ai_reply,
      last_intent,
      order_status,
      back_text_status,
      address_status,
      support_mode,
      siparis_alindi,
      cancel_reason,
      context_lock,
      letters_received,
      phone_received,
    },
    detectedProduct,
  };

  const extracted = extractEntities(baseContext);
  const detectedIntent = detectIntent(baseContext, extracted);

  return {
    ...baseContext,
    extracted,
    detectedIntent,
  };
}

function getInitialState(context) {
  const f = context.fields;
  return {
    product: context.detectedProduct || f.ilgilenilen_urun || f.user_product || "",
    conversation_stage: f.conversation_stage || "",
    photo_received: truthy(f.photo_received) ? "1" : "",
    payment_method: f.payment_method || "",
    menu_gosterildi: f.menu_gosterildi || "",
    order_status: f.order_status || "",
    back_text_status: f.back_text_status || "",
    address_status: f.address_status || "",
    support_mode: f.support_mode || "",
    cancel_reason: f.cancel_reason || "",
    context_lock: f.context_lock || "",
    siparis_alindi: truthy(f.siparis_alindi) ? "1" : "",
    letters_received: truthy(f.letters_received) ? "1" : "",
    phone_received: truthy(f.phone_received) ? "1" : "",
  };
}

function resetForProductSwitch(existing, newProduct) {
  return {
    conversation_stage: "",
    photo_received: "",
    payment_method: "",
    menu_gosterildi: existing.menu_gosterildi || "",
    order_status: "started",
    back_text_status: "",
    address_status: "",
    support_mode: "",
    cancel_reason: "",
    context_lock: newProduct ? "1" : existing.context_lock || "",
    siparis_alindi: "",
    letters_received: "",
    phone_received: "",
  };
}

function applyFacts(context, currentState) {
  const state = { ...currentState };
  const { detectedIntent, detectedProduct, extracted, previousProduct } = context;

  if (previousProduct && detectedProduct && previousProduct !== detectedProduct) {
    Object.assign(state, resetForProductSwitch(context.fields, detectedProduct));
    state.product = detectedProduct;
  }

  if (detectedProduct) {
    state.product = detectedProduct;
    state.context_lock = "1";
    state.order_status = state.order_status || "started";
  }

  if (extracted.payment) state.payment_method = extracted.payment;
  if (extracted.photoLink && detectedIntent === "photo") state.photo_received = "1";
  if (detectedIntent === "letters" && extracted.letters) state.letters_received = "1";
  if (detectedIntent === "back_text") state.back_text_status = "received";
  if (detectedIntent === "back_text_skip") state.back_text_status = "skipped";
  if (detectedIntent === "back_photo_upload") state.back_text_status = "received";
  if (extracted.phone) state.phone_received = "1";

  if (extracted.hasAddress && extracted.phone) {
    state.address_status = "received";
  } else if (extracted.hasAddress) {
    state.address_status = "address_only";
  } else if (state.address_status === "address_only" && extracted.phone) {
    state.address_status = "received";
  }

  if (detectedIntent === "cancel_order") {
    state.cancel_reason = context.message || "cancel_requested";
    state.support_mode = "1";
    state.order_status = "cancel_requested";
    state.siparis_alindi = "";
  }

  if (state.product !== "lazer") {
    state.photo_received = "";
    state.back_text_status = "";
  }

  if (state.product !== "atac") {
    state.letters_received = "";
  }

  return state;
}

function getNextStage(state) {
  if (!state.product) {
    if (state.menu_gosterildi === "evet") return "waiting_product";
    return "";
  }

  if (state.order_status === "cancel_requested") return "human_support";

  if (state.product === "lazer") {
    if (!truthy(state.photo_received)) return "waiting_photo";
    if (!state.back_text_status) return "waiting_back_text";
    if (!state.payment_method) return "waiting_payment";
    if (state.address_status !== "received") return "waiting_address";
    return "order_completed";
  }

  if (state.product === "atac") {
    if (!truthy(state.letters_received)) return "waiting_letters";
    if (!state.payment_method) return "waiting_payment";
    if (state.address_status !== "received") return "waiting_address";
    return "order_completed";
  }

  return "";
}

function shouldShowMainMenu(context, state) {
  if (state.product) return false;
  if (truthy(state.context_lock)) return false;
  if (state.order_status === "cancel_requested") return false;

  return [
    "smalltalk",
    "general",
    "unknown",
    "price",
    "payment",
    "order_start",
    "address",
  ].includes(context.detectedIntent);
}

function isFreshProductSelection(context, state) {
  const stage = context.fields.conversation_stage || "";
  return (
    !!context.detectedProduct &&
    !context.previousProduct &&
    !state.photo_received &&
    !state.letters_received &&
    !state.payment_method &&
    !state.address_status &&
    !state.back_text_status &&
    (!stage || stage === "waiting_product")
  );
}

function handleLocationIntent(context) {
  const { detectedIntent } = context;
  if (detectedIntent !== "location") return "";
  return "Eminönü İstanbul’dayız 😊";
}

function handleShippingIntent(context) {
  const { detectedIntent, messageNorm } = context;

  if (detectedIntent === "shipping_price") {
    return "Kargo ücreti fiyata dahildir efendim 😊 Ekstra bir ücret ödemezsiniz.";
  }

  if (detectedIntent === "shipping") {
    if (hasAny(messageNorm, ["kargom nerede", "takip no"])) {
      return "Kargo takip ve durum bilgisi için ekibimiz size destek olacaktır efendim 😊";
    }
    return SHIPPING_TIME_FALLBACK_TEXT;
  }

  return "";
}

function handleTrustIntent(context) {
  const { detectedIntent, messageNorm } = context;
  if (detectedIntent !== "trust") return "";

  if (hasAny(messageNorm, ["kaplama", "kaplamasi atar", "kaplaması atar"])) {
    return "Kaplama atmaz efendim 😊 Günlük kullanımda rahatlıkla kullanabilirsiniz.";
  }

  if (
    hasAny(messageNorm, [
      "kararma",
      "kararir mi",
      "kararma yapar mi",
      "kararma olur mu",
      "kararır mı",
      "kararma yapar mı",
      "kararma olur mu",
      "solar",
      "solma",
      "paslan",
    ])
  ) {
    return "Kararma, solma veya paslanma yapmaz efendim 😊 Günlük kullanımda rahatlıkla kullanabilirsiniz.";
  }

  return "Güvenle sipariş verebilirsiniz efendim 😊";
}

function handleChainIntent(context) {
  const { detectedIntent, detectedProduct, messageNorm } = context;

  if (detectedIntent !== "chain_question") return "";
  if (detectedProduct !== "lazer") return "";

  if (
    hasAny(messageNorm, [
      "zincir boyu",
      "zincir uzunlugu",
      "zincir uzunluğu",
      "zincir ne kadar",
      "uzunlugu ne kadar",
      "uzunluğu ne kadar",
      "zincir kac cm",
      "zincir kaç cm",
      "zincir kisalir mi",
      "zincir kısalır mı",
    ])
  ) {
    return "Standart zincir 60 cm’dir efendim 😊";
  }

  return "Zincir modeliyle ilgili detay için ekibimize görsel üzerinden net bilgi verelim 😊";
}

function handlePhotoQuestionIntent(context) {
  const { detectedIntent, detectedProduct } = context;

  if (detectedProduct !== "lazer") return "";

  if (detectedIntent === "photo_question") {
    return "Buradan direkt gönderebilirsiniz efendim 😊 Siz gönderin, biz hemen kontrol edelim.";
  }

  if (detectedIntent === "photo_suitability_question") {
    return "Olur efendim 😊 Uygunlukla ilgili bir sorun olursa ekibimiz size geri dönüş sağlayacaktır. Arka yüz için yazı ya da fotoğraf isterseniz onu da iletebilirsiniz.";
  }

  return "";
}

function handleBackSideInfoIntent(context) {
  const { detectedIntent, detectedProduct } = context;

  if (detectedProduct !== "lazer") return "";

  if (detectedIntent === "back_text_info") {
    return "Evet efendim 😊 Arka yüzüne yazı ekleyebiliyoruz. İsterseniz yazıyı buradan iletebilirsiniz. Arka yüze fotoğraf da yapılabiliyor.";
  }

  if (detectedIntent === "back_photo_info") {
    return "Tabi efendim 😊 Ön yüze bir fotoğraf, arka yüze bir fotoğraf yapabiliyoruz. Ek ücret de alınmıyor. İsterseniz arka yüz için fotoğrafı da gönderebilirsiniz.";
  }

  if (detectedIntent === "back_photo_price") {
    return "Arka yüze fotoğraf da ekleyebiliriz efendim 😊 Ek ücret alınmıyor.";
  }

  return "";
}

function buildDeterministicReply(context, state) {
  const { detectedIntent, detectedProduct, messageNorm } = context;
  const nextStage = getNextStage(state);

  if (shouldShowMainMenu(context, state)) {
    return MAIN_MENU_TEXT;
  }

  const fixedInfoReply =
    handleLocationIntent(context) ||
    handleShippingIntent(context) ||
    handleTrustIntent(context) ||
    handleChainIntent(context) ||
    handlePhotoQuestionIntent(context) ||
    handleBackSideInfoIntent(context);

  if (fixedInfoReply) {
    return fixedInfoReply;
  }

  if (isFreshProductSelection(context, state) && detectedProduct === "lazer") {
    return LASER_PRICE_TEXT;
  }

  if (isFreshProductSelection(context, state) && detectedProduct === "atac") {
    return ATAC_PRICE_TEXT;
  }

  if (detectedIntent === "photo" && detectedProduct === "lazer") {
    if (state.order_status === "completed" || nextStage === "order_completed") {
      return "Sipariş bilgileri tamamlandığı için fotoğraf değişikliği talebinizi ekibimize yönlendirelim efendim 😊";
    }
    return "Fotoğrafınızı aldım efendim 😊 Arka yüzüne yazı eklemek ister misiniz? İsterseniz yazıyı buradan iletebilirsiniz, istemezseniz 'yok' yazabilirsiniz.";
  }

  if (detectedIntent === "back_text_skip" && detectedProduct === "lazer") {
    if (nextStage === "waiting_payment") {
      if (state.payment_method === "eft_havale") {
        return `Tamam efendim 😊 Arka yüz boş kalacak.\n\n${EFT_INFO_TEXT}\n\n${ORDER_DETAILS_TEXT}`;
      }
      if (state.payment_method === "kapida_odeme") {
        return `Tamam efendim 😊 Arka yüz boş kalacak.\n\n${ORDER_DETAILS_TEXT}`;
      }
      return "Tamam efendim 😊 Arka yüz boş kalacak. Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.";
    }
  }

  if (detectedIntent === "back_text" && detectedProduct === "lazer") {
    if (nextStage === "waiting_payment") {
      if (state.payment_method === "eft_havale") {
        return `Not aldım efendim 😊 EFT / Havale ile ilerleyebiliriz.\n\n${EFT_INFO_TEXT}\n\n${ORDER_DETAILS_TEXT}`;
      }
      if (state.payment_method === "kapida_odeme") {
        return `Not aldım efendim 😊 Kapıda ödeme ile ilerleyebiliriz.\n\n${ORDER_DETAILS_TEXT}`;
      }
      return "Not aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.";
    }
  }

  if (detectedIntent === "letters" && detectedProduct === "atac") {
    if (nextStage === "waiting_payment") {
      if (state.payment_method === "eft_havale") {
        return `Harflerinizi aldım efendim 😊 EFT / Havale ile ilerleyebiliriz.\n\n${EFT_INFO_TEXT}\n\n${ORDER_DETAILS_TEXT}`;
      }
      if (state.payment_method === "kapida_odeme") {
        return `Harflerinizi aldım efendim 😊 Kapıda ödeme ile ilerleyebiliriz.\n\n${ORDER_DETAILS_TEXT}`;
      }
      return "Harflerinizi aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.";
    }
  }

  if (detectedIntent === "payment") {
    if (!detectedProduct && nextStage === "waiting_product") {
      return "Ödeme yöntemimiz EFT / Havale veya kapıda ödeme şeklindedir efendim 😊 Önce hangi model ile ilgilendiğinizi yazabilir misiniz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye";
    }

    if (detectedProduct === "lazer" && nextStage === "waiting_back_text") {
      return "Ödeme aşamasına geçmeden önce arka yüz için yazı isteyip istemediğinizi iletebilir misiniz? İstemiyorsanız 'yok' yazabilirsiniz 😊";
    }

    if (detectedProduct === "atac" && !truthy(state.letters_received)) {
      if (state.payment_method === "eft_havale") {
        return `EFT / Havale ile ilerleyebiliriz 😊 Önce istediğiniz harfleri yazabilirsiniz.\n\n${EFT_INFO_TEXT}`;
      }
      if (state.payment_method === "kapida_odeme") {
        return "Kapıda ödeme ile ilerleyebiliriz efendim 😊 Önce istediğiniz harfleri yazabilirsiniz.";
      }
    }

    if (state.address_status !== "received") {
      if (state.payment_method === "eft_havale") {
        return `EFT / Havale için ödeme bilgilerimiz şu şekildedir 😊\n\n${EFT_INFO_TEXT}\n\n${ORDER_DETAILS_TEXT}`;
      }
      if (state.payment_method === "kapida_odeme") {
        return `Kapıda ödeme ile ilerleyebiliriz efendim 😊\n\n${ORDER_DETAILS_TEXT}`;
      }
    }
  }

  if (detectedIntent === "name_only") {
    if (nextStage === "waiting_address") {
      if (!truthy(state.phone_received)) {
        return "Ad soyad bilginizi aldım efendim 😊\n\n📌 Şimdi kalan bilgileri paylaşabilir misiniz?\n\n📱 Cep telefonu\n📍 Açık adres";
      }
      return "Ad soyad bilginizi aldım efendim 😊\n\n📍 Şimdi açık adresinizi paylaşabilir misiniz?";
    }
  }

  if (detectedIntent === "phone") {
    if (nextStage === "order_completed") {
      return "Telefon numaranızı da aldım efendim 😊 Sipariş için gerekli bilgiler tamamlandı. Ekibimiz işlemi hazırlayacaktır.";
    }
    if (!state.payment_method) {
      return "Telefon numaranızı da aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.";
    }
    return "Telefon numaranızı da aldım efendim 😊\n\n📍 Şimdi açık adresinizi yazabilirsiniz. (İl, ilçe, mahalle, sokak)";
  }

  if (detectedIntent === "address") {
    if (state.address_status === "address_only" && !truthy(state.phone_received)) {
      return "Adres bilginizi aldım efendim 😊\n\n📌 Siparişi tamamlayabilmemiz için cep telefonu numaranızı da paylaşabilir misiniz? 📱";
    }
    if (nextStage === "order_completed") {
      return "Adres bilginizi de aldım efendim 😊 Sipariş için gerekli bilgiler tamamlandı. Ekibimiz işlemi hazırlayacaktır.";
    }
  }

  if (detectedIntent === "order_start") {
    if (!detectedProduct) {
      return MAIN_MENU_TEXT;
    }
    if (detectedProduct === "lazer") {
      return LASER_PRICE_TEXT;
    }
    if (detectedProduct === "atac") {
      return ATAC_PRICE_TEXT;
    }
  }

  if (nextStage === "order_completed") {
    return "Sipariş için gerekli bilgiler tamamlandı efendim 😊 Ekibimiz işlemi hazırlayacaktır.";
  }

  return "";
}

function buildMessages(context, knowledgePack) {
  const systemPrompt = `
You are a sales assistant for Yudum Jewels.

Rules:
- Keep replies short, natural, warm, and professional.
- If product context exists, do not ask product again.
- If customer already gave payment or address earlier, do not ask the same thing again.
- If customer asks a side question during order flow, answer it briefly and then continue with the next missing step.
- If you truly do not know, reply exactly with: ${FALLBACK_TEXT}

KNOWLEDGE:
${knowledgePack}
  `.trim();

  const userPrompt = `
Customer message:
${context.message}

Context:
- detected_product: ${context.detectedProduct || ""}
- detected_intent: ${context.detectedIntent || "unknown"}
- previous_product: ${context.previousProduct || ""}
- conversation_stage: ${context.fields.conversation_stage || ""}
- photo_received: ${context.fields.photo_received || ""}
- payment_method: ${context.fields.payment_method || ""}
- order_status: ${context.fields.order_status || ""}
- back_text_status: ${context.fields.back_text_status || ""}
- address_status: ${context.fields.address_status || ""}
- letters_received: ${context.fields.letters_received || ""}
- phone_received: ${context.fields.phone_received || ""}

Important:
- If product context exists, do not ask product again.
- After laser photo, ask for back text/back photo preference before payment.
- ATAC order must always collect letters before payment.
  `.trim();

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

function getKnowledgePack(context) {
  const core = safeRead("CORE_SYSTEM.txt");
  const pricing = safeRead("PRICING.txt");
  const shipping = safeRead("SHIPPING.txt");
  const payment = safeRead("PAYMENT.txt");
  const orderFlow = safeRead("ORDER_FLOW.txt");
  const trust = safeRead("TRUST.txt");
  const smalltalk = safeRead("SMALLTALK.txt");
  const routingRules = safeRead("ROUTING_RULES.txt");
  const edgeCases = safeRead("EDGE_CASES.txt");
  const imageRules = safeRead("IMAGE_RULES.txt");
  const fewShot = safeRead("FEW_SHOT_EXAMPLES.txt");
  const systemMaster = safeRead("SYSTEM_MASTER.txt");

  const laser = context.detectedProduct === "lazer" ? safeRead("PRODUCT_LASER.txt") : "";
  const atac = context.detectedProduct === "atac" ? safeRead("PRODUCT_ATAC.txt") : "";

  return [
    systemMaster,
    core,
    routingRules,
    edgeCases,
    fewShot,
    imageRules,
    laser,
    atac,
    pricing,
    shipping,
    payment,
    orderFlow,
    trust,
    smalltalk,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function callModel(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || "deepseek-chat";
  const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1";

  if (!apiKey) {
    throw new Error("API key missing. Add DEEPSEEK_API_KEY or OPENAI_API_KEY.");
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.MODEL_TIMEOUT_MS || 9000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 220,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Model API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "";
  } finally {
    clearTimeout(timeout);
  }
}

function buildStateUpdate(context, replyText, state) {
  const nextStage = getNextStage(state);
  const menuShownNow =
    cleanReply(replyText) === MAIN_MENU_TEXT ||
    cleanReply(replyText).includes("Hangi model ile ilgileniyorsunuz?");

  let order_status = state.order_status || "";
  let siparis_alindi = state.siparis_alindi || "";
  let conversation_stage = nextStage || state.conversation_stage || context.fields.conversation_stage || "";
  let menu_gosterildi = state.menu_gosterildi || context.fields.menu_gosterildi || "";
  let support_mode = state.support_mode || "";

  if (!replyText || replyText === FALLBACK_TEXT) {
    support_mode = "1";
  }

  if (menuShownNow) {
    menu_gosterildi = "evet";
    if (!state.product) conversation_stage = "waiting_product";
  }

  if (nextStage === "order_completed") {
    order_status = "completed";
    siparis_alindi = "1";
  } else if (!order_status && state.product) {
    order_status = "started";
  }

  if (nextStage === "human_support" || order_status === "cancel_requested") {
    conversation_stage = "human_support";
    order_status = "cancel_requested";
    support_mode = "1";
    siparis_alindi = "";
  }

  return {
    ai_reply: replyText,
    ilgilenilen_urun: state.product,
    user_product: state.product,
    last_intent: context.detectedIntent,
    conversation_stage,
    photo_received: state.photo_received || "",
    payment_method: state.payment_method || "",
    menu_gosterildi,
    order_status,
    back_text_status: state.back_text_status || "",
    address_status: state.address_status || "",
    support_mode,
    siparis_alindi,
    cancel_reason: state.cancel_reason || "",
    context_lock: state.context_lock || "",
    letters_received: state.letters_received || "",
    phone_received: state.phone_received || "",
  };
}

export async function processChat(body = {}, options = {}) {
  if (!options.skipKnowledgeCheck) {
    checkCriticalKnowledgeFiles();
  }

  const context = buildContext(body);
  const state = applyFacts(context, getInitialState(context));

  let reply = buildDeterministicReply(context, state);

  if (!reply) {
    const knowledgePack = getKnowledgePack(context);
    const messages = buildMessages(context, knowledgePack);

    try {
      reply = cleanReply(await callModel(messages));
    } catch (error) {
      console.error("Model fallback error:", error.message);
      reply = FALLBACK_TEXT;
    }
  }

  const finalReply = cleanReply(reply);
  const stateUpdate = buildStateUpdate(context, finalReply, state);

  return {
    success: true,
    ...stateUpdate,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      success: false,
      message: "Only POST supported.",
    });
  }

  try {
    const result = await processChat(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error("chat.js error:", error);

    return res.status(200).json({
      success: true,
      ai_reply: FALLBACK_TEXT,
      ilgilenilen_urun: "",
      user_product: "",
      last_intent: "error",
      conversation_stage: "",
      photo_received: "",
      payment_method: "",
      menu_gosterildi: "",
      order_status: "",
      back_text_status: "",
      address_status: "",
      support_mode: "1",
      siparis_alindi: "",
      cancel_reason: "",
      context_lock: "",
      letters_received: "",
      phone_received: "",
      error: String(error.message || error),
    });
  }
}
