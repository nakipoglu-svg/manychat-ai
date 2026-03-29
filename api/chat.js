import fs from "fs";
import path from "path";
import { logConversationRow } from "../lib/sheetsLogger.js";

const fileCache = {};

const FALLBACK_TEXT = "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";
const MAIN_MENU_TEXT =
  "Merhaba efendim 😊\nHangi model ile ilgileniyorsunuz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye";
const LASER_PRICE_TEXT =
  "Resimli lazer kolye fiyatımız EFT / Havale ile 599,90 TL’dir, kapıda ödeme ile 649,90 TL’dir efendim 😊 Siparişe devam etmek isterseniz fotoğrafı buradan gönderebilirsiniz.";
const ATAC_PRICE_TEXT =
  "Harfli ataç kolye fiyatımız EFT / Havale ile 499,90 TL’dir, kapıda ödeme ile 549,90 TL’dir efendim 😊 Siparişe devam etmek isterseniz istediğiniz harfleri yazabilirsiniz.";
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

const REPLY_CLASS = {
  FIXED_INFO: "fixed_info",
  FLOW_PROGRESS: "flow_progress",
  SELLER_REQUIRED: "seller_required",
  OPERATIONAL_REQUIRED: "operational_required",
  FALLBACK: "fallback",
  MENU: "menu",
  PRODUCT_ENTRY: "product_entry",
  ORDER_COMPLETE: "order_complete",
};

const SUPPORT_MODE_REASON = {
  SELLER_REQUIRED: "seller_required",
  OPERATIONAL_REQUIRED: "operational_required",
  TRUE_FALLBACK: "true_fallback",
  MANUAL_CANCEL: "manual_cancel",
  NONE: "",
};

const SIDE_QUESTION_INTENTS = new Set([
  "price",
  "shipping",
  "shipping_price",
  "trust",
  "material_question",
  "chain_question",
  "location",
  "back_text_info",
  "back_photo_info",
  "back_photo_price",
  "example_request",
  "detail_request",
]);

const SHORT_ACKS = new Set([
  "evet",
  "tamam",
  "tamamdir",
  "tamamdır",
  "tm",
  "tmm",
  "ok",
  "okey",
  "olur",
  "peki",
  "anladim",
  "anladım",
  "devam",
]);

const REFERENCE_MESSAGES = new Set([
  "bu",
  "o",
  "bu olur mu",
  "o olur mu",
  "bu olsun",
  "o olsun",
  "detay",
]);

const TURKEY_CITIES = [
  "adana", "adiyaman", "afyonkarahisar", "agri", "aksaray", "amasya", "ankara", "antalya", "ardahan", "artvin", "aydin",
  "balikesir", "bartin", "batman", "bayburt", "bilecik", "bingol", "bitlis", "bolu", "burdur", "bursa",
  "canakkale", "cankiri", "corum", "denizli", "diyarbakir", "duzce", "edirne", "elazig", "erzincan", "erzurum",
  "eskisehir", "gaziantep", "giresun", "gumushane", "hakkari", "hatay", "igdir", "isparta", "istanbul", "izmir",
  "kahramanmaras", "karabuk", "karaman", "kars", "kastamonu", "kayseri", "kilis", "kirikkale", "kirklareli",
  "kirsehir", "kocaeli", "konya", "kutahya", "malatya", "manisa", "mardin", "mersin", "mugla", "mus",
  "nevsehir", "nigde", "ordu", "osmaniye", "rize", "sakarya", "samsun", "siirt", "sinop", "sivas",
  "sanliurfa", "sirnak", "tekirdag", "tokat", "trabzon", "tunceli", "usak", "van", "yalova", "yozgat", "zonguldak",
];

const DISTRICT_KEYWORDS = [
  "kadikoy", "kadıköy", "beykoz", "uskudar", "üsküdar", "besiktas", "beşiktaş", "sisli", "şişli", "fatih",
  "moda", "kavacik", "kavacık", "eminonu", "eminönü", "nusaybin", "beyazit", "beyazıt", "kizilay", "kızılay",
  "cankaya", "çankaya", "beylikduzu", "beylikdüzü", "bagcilar", "bağcılar", "arnavutkoy", "arnavutköy", "esenyurt",
  "avcilar", "avcılar", "bahcelievler", "bahçelievler", "bakirkoy", "bakırköy", "maltepe", "kartal", "pendik",
  "tuzla", "sultanbeyli", "umraniye", "ümraniye", "atasehir", "ataşehir", "sancaktepe", "cekmekoy", "çekmeköy",
  "sultangazi", "gaziosmanpasa", "gaziosmanpaşa", "eyup", "eyüp", "sariyer", "sarıyer", "kemerburgaz",
  "buyukcekmece", "büyükçekmece", "kucukcekmece", "küçükçekmece", "basaksehir", "başakşehir", "zeytinburnu",
  "gungoren", "güngören",
];

const KEYWORDS = {
  product: {
    lazer: [
      "resimli", "fotografli", "foto", "fotolu", "lazer", "resim kolye", "foto kolye", "fotografli kolye",
      "fotoğraflı kolye", "resimli kolye", "resimli lazer", "resimli madalyon", "resimli olan",
    ],
    atac: ["atac", "ataç", "harfli", "harf kolye", "harfli kolye", "3 harf", "uc harf", "isim harf", "harfli atac"],
  },
  intents: {
    cancel: ["siparisi iptal", "siparişi iptal", "iptal", "vazgectim", "vazgeçtim"],
    smalltalk: [
      "merhaba", "selam", "slm", "mrb", "merhabalar", "iyi aksamlar", "iyi akşamlar", "iyi gunler", "iyi günler",
      "gunaydin", "günaydın", "iyi geceler", "nasilsiniz", "nasılsınız", "tesekkur", "teşekkür", "tesekkurler",
      "teşekkürler", "tsk", "tşk", "sagolun", "sağolun", "saol", "sağol", "allah razi olsun", "allah razı olsun",
      "kolay gelsin", "emeginize saglik", "emeğinize sağlık", "ellerinize saglik", "ellerinize sağlık", "cok begendik",
      "çok beğendik", "cok begendim", "çok beğendim", "cok guzel", "çok güzel", "cok guzel olmus", "çok güzel olmuş",
      "super", "süper", "harika", "liked a message", "reacted",
    ],
    location: ["yeriniz nerede", "neredesiniz", "konum", "magaza", "mağaza", "eminonu", "eminönü"],
    shippingPrice: [
      "kargo ucreti ne kadar", "kargo ücreti ne kadar", "kargo fiyati var mi", "kargo fiyatı var mı", "kargo dahil mi",
      "kargo ücretli mi", "kargo ucretli mi", "kargo ucreti var mi", "kargo ücreti var mı", "kargo ile birlikte mi",
      "kargo ucreti dahil mi", "kargo ücreti dahil mi", "kargo fiyata dahil", "kargo dahil", "kargo ucretsiz mi", "kargo ücretsiz mi",
    ],
    shipping: [
      "kargo", "teslimat", "ne zaman gelir", "kac gunde", "kaç günde", "takip no", "kargom nerede",
      "ne zaman kargolarsiniz", "ne zaman kargoya verilir", "kac gune gelir", "kaç güne gelir",
    ],
    trust: [
      "guvenilir", "guven", "dolandirici", "orijinal", "saglam", "kararma", "kararir mi", "kararma yapar mi",
      "kararma olur mu", "kararır mı", "kararma yapar mı", "kararma olur mu", "solar", "solma", "paslan", "kaplama",
      "kaplamasi atar", "kaplaması atar", "garanti", "celik mi", "çelik mi", "celikmi", "çelikmi", "urun celik mi",
      "ürün çelik mi", "paslanmaz mi", "paslanmaz mı", "malzeme ne", "malzemesi ne", "ne malzeme", "hangi malzeme",
    ],
    payment: [
      "kapida odeme", "kapıda ödeme", "kapida odeme olur mu", "kapıda ödeme olur mu", "kapida odeme var mi", "kapıda ödeme var mı",
      "kapida oderim", "kapıda öderim", "kapida odeme olsun", "kapıda ödeme olsun", "kapida olsun", "kapıda olsun",
      "kapida", "kapıda", "eft", "havale", "odeme", "ödeme", "iban", "dekont", "aciklama", "açıklama",
    ],
    price: ["fiyat", "ne kadar", "ucret", "ücret", "kac tl", "kaç tl", "fıyat"],
    chain: [
      "zincir modeli", "zincir degisiyor mu", "zincir değişiyor mu", "zincir kisalir mi", "zincir kısalır mı", "zincir boyu",
      "zincir uzunlugu", "zincir uzunluğu", "zincir ne kadar", "uzunlugu ne kadar", "uzunluğu ne kadar", "zincir kac cm", "zincir kaç cm",
    ],
    orderStart: [
      "siparis vermek istiyorum", "sipariş vermek istiyorum", "siparis verecegim", "sipariş vereceğim", "almak istiyorum",
      "hazirlayalim", "hazırlayalım", "yaptirmak istiyorum", "yaptırmak istiyorum",
    ],
    photoQuestion: [
      "bu foto olur mu", "fotograf uygun mu", "foto uygun mu", "nasil olsun foto", "nasil foto", "hangi fotoyu atayim",
      "buradan mi atayim", "whatsapptan mi", "nasil aticam", "nasil atacam", "fotoyu nasil atayim", "foto atsam olur mu",
      "fotograf atsam olur mu", "gondersem olur mu", "fotoğraf atsam olur mu", "fotoğrafı nasıl göndereceğim",
      "fotografi nasil gonderecegim", "fotoğrafı nasıl gönderebilirim", "fotografi nasil gonderebilirim", "resim nasıl gönderiyorum",
      "resim nasil gonderiyorum", "resim nasil gonderirim", "resmi nasil gonderiyorum", "resmi nasil gonderirim", "fotografi atsam olur mu",
      "nasil gonderecegim", "nasıl göndereceğim", "buradan gondereyim", "buradan göndereyim", "buradan mi gonderecegim", "buradan mı göndereceğim",
    ],
    backPhotoPrice: [
      "arkasina fotograf ne kadar", "arkasına fotograf ne kadar", "arkasina foto ne kadar", "arkasına foto ne kadar", "ek ucret",
      "ek ücret", "arkasina foto koyarsam fiyat ne olur", "arkasına foto koyarsam fiyat ne olur", "arka foto fiyat", "arka yuz fiyat", "arka yüz fiyat",
    ],
    backTextInfo: [
      "arka tarafina da mi yazabiliyoruz", "arka tarafina da yazabiliyor muyuz", "arkasina yazi oluyor mu", "arkasına yazı oluyor mu",
      "arkasina yazi olur mu", "arkasına yazı olur mu", "arka yuzune yazi oluyor mu", "arka yüzüne yazı oluyor mu", "arkaya yazi yaziliyor mu",
      "arkaya yazı yazılıyor mu", "arka tarafa yazi oluyor mu", "arka tarafa yazi olur mu", "dua yazilir mi", "dua yazılır mı", "isim yazilir mi", "isim yazılır mı",
      "arkasina tarih olur mu", "arkasına tarih olur mu", "arkaya tarih olur mu", "arkaya isim olur mu", "arkasına isim olur mu",
    ],
    backPhotoInfo: [
      "arkali onlu fotograf olur mu", "arkalı önlü fotoğraf olur mu", "arkali onlu foto olur mu", "arkalı önlü foto olur mu",
      "on yuze bir fotograf arka yuze bir fotograf", "arkasina fotograf olur mu", "arkasına fotoğraf olur mu", "arkasina foto olur mu", "arkasına foto olur mu",
      "arka yuzune fotograf olur mu", "arka yüzüne fotoğraf olur mu", "iki yuzune de foto olur mu", "iki yüzüne de foto olur mu", "arka tarafa foto olur mu", "arka tarafa fotograf olur mu",
    ],
    backTextSkip: ["yok", "istemiyorum", "gerek yok", "bos kalsin", "boş kalsın", "bos olsun", "boş olsun", "arka bos kalsin", "arka boş kalsın", "yazi olmasin", "yazı olmasın", "arka yazi yok", "arka yazı yok"],
    backTextDirect: ["arkasina yazi", "arkasına yazı", "arka yazi", "arka yazı", "arkasina tarih", "arkasına tarih", "arkaya yazi", "arkaya yazı", "arka tarafa yazi", "arka tarafa yazı"],
    postSale: [
      "siparis ettigim urun gelmedi", "sipariş ettiğim ürün gelmedi", "urun gelmedi", "ürün gelmedi", "siparis ne oldu", "sipariş ne oldu",
      "kargom gelmedi", "ulasmadi", "ulaşmadı", "kolyem hazir mi", "kolyem hazır mı", "ne zaman hazir", "ne zaman hazır",
      "siparisim ne durumda", "siparişim ne durumda", "kargoya verildi mi", "yola cikti mi", "yola çıktı mı",
    ],
    newOrder: ["daha siparis", "daha sipariş", "bir tane daha", "iki tane daha", "2 tane daha", "3 tane daha", "tekrar siparis", "tekrar sipariş", "yeni siparis", "yeni sipariş", "bir siparis daha", "bir sipariş daha"],
    exampleRequest: ["ornek atabilir misiniz", "örnek atabilir misiniz", "ornek gorebilir miyim", "örnek görebilir miyim", "ornek atar misiniz", "örnek atar mısınız", "ornek gonderir misiniz", "örnek gönderir misiniz", "ornek foto", "örnek foto"],
    detailRequest: ["detay", "detaylar"],
    materialQuestion: ["celik mi", "çelik mi", "celikmi", "çelikmi", "urun celik mi", "ürün çelik mi", "paslanmaz mi", "paslanmaz mı", "malzeme ne", "malzemesi ne"],
  },
};

const LETTER_STOPWORDS = [
  "devam", "tamam", "evet", "olur", "merhaba", "selam", "slm", "fiyat", "ucret", "ücret", "kapida", "kapıda", "eft", "havale", "odeme", "ödeme", "hayir", "hayır", "gonder", "gönder", "yok", "istemiyorum", "gerek", "bos", "boş", "tmm", "tamamdir", "tamamdır", "peki", "ok", "detay", "bilgi", "super", "süper", "harika", "amin", "insallah", "inşallah", "masallah", "maşallah", "eyvallah",
];

const NOT_A_NAME_PHRASES = [
  "resimli", "fotografli", "fotolu", "lazer", "kolye", "atac", "ataç", "harfli", "celik mi", "çelik mi", "celikmi", "çelikmi", "paslanmaz", "madalyon", "nazar", "boncuk", "boncuklu", "begendim", "beğendim", "begendik", "beğendik", "guzel", "güzel", "saglik", "sağlık", "elinize", "ellerinize", "emeginize", "emeğinize", "siparis", "sipariş", "kargo", "teslimat", "hazir mi", "hazır mı", "hazir", "hazır", "goreyim", "görebilir", "gorebilir", "istiyorum", "ilgileniyorum", "alayim", "alayım", "detay", "bilgi", "fiyat", "ucret", "ücret", "olur mu", "olurmu", "var mi", "var mı", "yapilir mi", "yapılır mı", "yapar mi", "yapar mı", "bekliyorum", "gonderdim", "gönderdim", "gonderirim", "gönderirim", "yaziyorum", "yazıyorum", "yaptirmak", "yaptırmak", "gelmedi", "ulasmadi", "ulaşmadı", "tekrar", "daha", "indirim", "kampanya", "kapida", "kapıda", "durun", "dur", "boncuklu", "madalyon", "resimli",
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
    return content || "";
  } catch {
    return "";
  }
}

function buildKnowledgeMap(context) {
  return {
    "CORE_SYSTEM.txt": safeRead("CORE_SYSTEM.txt"),
    "PAYMENT.txt": safeRead("PAYMENT.txt"),
    "PRICING.txt": safeRead("PRICING.txt"),
    "SHIPPING.txt": safeRead("SHIPPING.txt"),
    "ORDER_FLOW.txt": safeRead("ORDER_FLOW.txt"),
    "TRUST.txt": safeRead("TRUST.txt"),
    "SMALLTALK.txt": safeRead("SMALLTALK.txt"),
    "ROUTING_RULES.txt": safeRead("ROUTING_RULES.txt"),
    "EDGE_CASES.txt": safeRead("EDGE_CASES.txt"),
    "IMAGE_RULES.txt": safeRead("IMAGE_RULES.txt"),
    "FEW_SHOT_EXAMPLES.txt": safeRead("FEW_SHOT_EXAMPLES.txt"),
    "SYSTEM_MASTER.txt": safeRead("SYSTEM_MASTER.txt"),
    "PRODUCT_LASER.txt": context.detectedProduct === "lazer" ? safeRead("PRODUCT_LASER.txt") : "",
    "PRODUCT_ATAC.txt": context.detectedProduct === "atac" ? safeRead("PRODUCT_ATAC.txt") : "",
  };
}

function getMissingCriticalKnowledgeFiles(knowledgeMap) {
  return CRITICAL_KNOWLEDGE_FILES.filter((file) => !String(knowledgeMap[file] || "").trim());
}

function buildKnowledgePackFromMap(knowledgeMap) {
  return [
    knowledgeMap["SYSTEM_MASTER.txt"],
    knowledgeMap["CORE_SYSTEM.txt"],
    knowledgeMap["ROUTING_RULES.txt"],
    knowledgeMap["EDGE_CASES.txt"],
    knowledgeMap["FEW_SHOT_EXAMPLES.txt"],
    knowledgeMap["IMAGE_RULES.txt"],
    knowledgeMap["PRODUCT_LASER.txt"],
    knowledgeMap["PRODUCT_ATAC.txt"],
    knowledgeMap["PRICING.txt"],
    knowledgeMap["SHIPPING.txt"],
    knowledgeMap["PAYMENT.txt"],
    knowledgeMap["ORDER_FLOW.txt"],
    knowledgeMap["TRUST.txt"],
    knowledgeMap["SMALLTALK.txt"],
  ].filter(Boolean).join("\n\n");
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

function makeReply(text, replyClass = REPLY_CLASS.FLOW_PROGRESS, supportModeReason = SUPPORT_MODE_REASON.NONE, meta = {}) {
  return { text, reply_class: replyClass, support_mode_reason: supportModeReason, ...meta };
}

function emptyReply() {
  return { text: "", reply_class: "", support_mode_reason: SUPPORT_MODE_REASON.NONE, is_side_question: false };
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
    if (/^905\d{9}$/.test(digits)) return digits.slice(-10);
    if (/^05\d{9}$/.test(digits)) return digits.slice(-10);
    if (/^5\d{9}$/.test(digits)) return digits;
  }
  return "";
}

function looksLikeAddress(messageNorm, rawMessage = "", conversationStage = "") {
  const raw = String(rawMessage || "").trim();
  if (!raw || raw.length < 10) return false;
  if (/[?]/.test(raw)) return false;
  if (/\b(mi|mı|mu|mü|miyim|mıyım|musun|müsün)\b/i.test(raw)) return false;

  const addressKeywords = [
    "mahalle", "mah", "sokak", "sk", "cadde", "cd", "bulvar", "no", "daire", "apt", "apartman", "apart", "ap", "kat",
    "site", "sitesi", "blok", "ilce", "ilçe", "mahallesi", "ic kapi", "iç kapı",
  ];

  let hit = 0;
  for (const k of addressKeywords) if (messageNorm.includes(k)) hit++;

  const hasNumber = /\d/.test(raw);
  const hasCityMatch = TURKEY_CITIES.some((c) => messageNorm.includes(c));
  const hasDistrictMatch = DISTRICT_KEYWORDS.some((d) => messageNorm.includes(d));

  if (conversationStage === "waiting_address") {
    if (hit >= 2) return true;
    if (hit >= 1 && hasNumber && hasCityMatch) return true;
    if (hasCityMatch && hasDistrictMatch && hasNumber) return true;
    if (raw.length >= 20 && hasCityMatch && hasNumber && hit >= 1) return true;
  } else {
    if (hit >= 3) return true;
    if (hit >= 2 && hasNumber && hasCityMatch) return true;
  }
  return false;
}

function looksLikeNameInput(rawMessage = "", messageNorm = "", conversationStage = "") {
  if (conversationStage !== "waiting_address") return false;
  const raw = String(rawMessage || "").trim();
  if (!raw || raw.length < 4 || raw.length > 40) return false;
  if (/\d/.test(raw)) return false;
  if (/[?!.:/]/.test(raw)) return false;
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;
  if (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/.test(raw)) return false;
  const norm = normalizeText(raw);
  for (const phrase of NOT_A_NAME_PHRASES) if (norm.includes(phrase)) return false;
  for (const intentKey of Object.keys(KEYWORDS.intents)) {
    if (hasAny(norm, KEYWORDS.intents[intentKey])) return false;
  }
  if (hasAny(norm, KEYWORDS.product.lazer) || hasAny(norm, KEYWORDS.product.atac)) return false;
  if (looksLikeAddress(norm, raw, conversationStage)) return false;
  return true;
}

function normalizeProduct(value) {
  const v = normalizeText(value);
  if (["lazer", "resimli", "resimli lazer kolye"].includes(v)) return "lazer";
  if (["atac", "ataç", "harfli atac kolye", "harfli ataç kolye"].includes(v)) return "atac";
  return "";
}

function getEntryProduct(body = {}) {
  const candidates = [body.entry_product, body.ad_product, body.flow_product, body.trigger_product, body.product_context, body.source_product];
  for (const candidate of candidates) {
    const normalized = normalizeProduct(unwrapManychatValue(candidate));
    if (normalized) return normalized;
  }
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
  const normalized = v.replace(/\s+/g, "_");
  return allowed.includes(normalized) ? normalized : "";
}

function isExplicitProductSwitch(messageNorm) {
  return hasAny(messageNorm, [
    "yok ben", "onun yerine", "degistirelim", "degistirmek istiyorum", "değiştirelim", "değiştirmek istiyorum",
    "ben atac alayim", "ben ataç alayım", "ben resimli istiyorum", "ben lazer istiyorum", "ataç alayım", "atac alayim",
    "fikrimi degistirdim", "fikrimi değiştirdim",
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
  if (hasAny(messageNorm, ["kapida odeme", "kapıda ödeme", "kapida", "kapıda", "odeme olsun", "ödeme olsun"])) return "kapida_odeme";
  if (hasAny(messageNorm, ["eft", "havale"])) return "eft_havale";
  return existing || "";
}

function isShortAck(messageNorm = "") {
  return SHORT_ACKS.has(messageNorm);
}

function isReferenceLike(messageNorm = "") {
  return REFERENCE_MESSAGES.has(messageNorm);
}

function shouldUseRecentMessages(context, state) {
  const msg = context.messageNorm || "";
  if (isShortAck(msg) || isReferenceLike(msg)) return 3;
  if (["kapida odeme", "kapıda ödeme", "eft", "iban", "gonderdim", "gönderdim", "yok"].includes(msg)) return 3;
  if ((context.message || "").trim().length <= 12) return 3;
  if (state.conversation_stage && ["general", "smalltalk"].includes(context.detectedIntent)) return 5;
  return 0;
}

function isLikelyFreeBackText(context) {
  const raw = String(context.message || "").trim();
  const norm = context.messageNorm || "";
  if (!raw) return false;
  if (raw.length > 80) return false;
  if (looksLikePhotoUrl(raw)) return false;
  if (hasAny(norm, KEYWORDS.intents.smalltalk)) return false;
  if (hasAny(norm, KEYWORDS.intents.payment)) return false;
  if (hasAny(norm, KEYWORDS.intents.shipping)) return false;
  if (hasAny(norm, KEYWORDS.intents.shippingPrice)) return false;
  if (hasAny(norm, KEYWORDS.intents.price)) return false;
  if (hasAny(norm, KEYWORDS.intents.location)) return false;
  if (hasAny(norm, KEYWORDS.intents.chain)) return false;
  if (hasAny(norm, KEYWORDS.intents.trust)) return false;
  if (hasAny(norm, KEYWORDS.intents.backTextInfo)) return false;
  if (hasAny(norm, KEYWORDS.intents.backPhotoInfo)) return false;
  if (hasAny(norm, KEYWORDS.intents.backPhotoPrice)) return false;
  if (hasAny(norm, KEYWORDS.intents.backTextSkip)) return false;
  return true;
}

function extractEntities(baseContext) {
  const { message, messageNorm, detectedProduct, conversationStage } = baseContext;
  const phone = extractPhone(message);
  const hasAddress = looksLikeAddress(messageNorm, message, conversationStage);
  const hasName = looksLikeNameInput(message, messageNorm, conversationStage);
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
        "atac", "ataç", "harfli", "kolye", "istiyorum", "ilgileniyorum", "almak istiyorum",
        "kac tane", "kaç tane", "hangi harf", "hangi harfler", "harf mi", "fiyat", "ne kadar",
        "olur mu", "celik", "çelik", "kararma", "paslanmaz", "malzeme",
      ]);
    if (looksLikeLetters) letters = raw;
  }

  return { phone, hasAddress, hasName, payment, photoLink, letters };
}
function detectIntent(baseContext, extracted) {
  const { messageNorm, message, detectedProduct, conversationStage } = baseContext;
  const raw = String(message || "").trim();

  if (!raw) return "general";

  if (/^(liked a message|reacted)/.test(messageNorm)) return "smalltalk";

  if (hasAny(messageNorm, KEYWORDS.intents.cancel)) return "cancel_order";
  if (hasAny(messageNorm, KEYWORDS.intents.postSale)) return "post_sale";
  if (hasAny(messageNorm, KEYWORDS.intents.newOrder)) return "new_order";

  if (conversationStage === "waiting_back_text") {
    if (hasAny(messageNorm, KEYWORDS.intents.backTextSkip)) return "back_text_skip";
    if (hasAny(messageNorm, KEYWORDS.intents.backTextInfo)) return "back_text_info";
    if (hasAny(messageNorm, KEYWORDS.intents.backPhotoInfo)) return "back_photo_info";
  }

  if (hasAny(messageNorm, KEYWORDS.intents.backPhotoPrice)) return "back_photo_price";

  if (looksLikePhotoUrl(message) && detectedProduct === "lazer") {
    return conversationStage === "waiting_back_text"
      ? "back_photo_upload"
      : "photo";
  }

  if (hasAny(messageNorm, KEYWORDS.intents.shippingPrice)) return "shipping_price";
  if (hasAny(messageNorm, KEYWORDS.intents.shipping)) return "shipping";
  if (hasAny(messageNorm, KEYWORDS.intents.materialQuestion)) return "material_question";
  if (hasAny(messageNorm, KEYWORDS.intents.trust)) return "trust";
  if (hasAny(messageNorm, KEYWORDS.intents.location)) return "location";
  if (hasAny(messageNorm, KEYWORDS.intents.payment)) return "payment";
  if (hasAny(messageNorm, KEYWORDS.intents.chain)) return "chain_question";
  if (hasAny(messageNorm, KEYWORDS.intents.price)) return "price";

  if (
    hasAny(messageNorm, KEYWORDS.intents.backTextInfo) ||
    (messageNorm.includes("arka") && messageNorm.includes("yazi")) ||
    (messageNorm.includes("arka") && messageNorm.includes("yazı")) ||
    messageNorm.includes("arka yuz") ||
    messageNorm.includes("arka yüz")
  ) {
    return "back_text_info";
  }

  if (
    hasAny(messageNorm, KEYWORDS.intents.backPhotoInfo) ||
    (
      (messageNorm.includes("arka") ||
        messageNorm.includes("iki yuz") ||
        messageNorm.includes("iki yüz")) &&
      (
        messageNorm.includes("foto") ||
        messageNorm.includes("fotograf") ||
        messageNorm.includes("fotoğraf") ||
        messageNorm.includes("resim")
      )
    )
  ) {
    return "back_photo_info";
  }

  if (
    hasAny(messageNorm, KEYWORDS.intents.backPhotoPrice) ||
    (
      (messageNorm.includes("arka") ||
        messageNorm.includes("arka yuz") ||
        messageNorm.includes("arka yüz")) &&
      (
        messageNorm.includes("foto") ||
        messageNorm.includes("fotograf") ||
        messageNorm.includes("fotoğraf")
      ) &&
      messageNorm.includes("fiyat")
    )
  ) {
    return "back_photo_price";
  }

  if (
    hasAny(messageNorm, KEYWORDS.intents.photoQuestion) ||
    messageNorm.includes("resim gonder") ||
    messageNorm.includes("resim gönder") ||
    messageNorm.includes("foto gonder") ||
    messageNorm.includes("foto gönder") ||
    messageNorm.includes("fotograf gonder") ||
    messageNorm.includes("fotoğraf gönder")
  ) {
    return "photo_question";
  }

  if (hasAny(messageNorm, KEYWORDS.intents.exampleRequest)) return "example_request";
  if (hasAny(messageNorm, KEYWORDS.intents.detailRequest)) return "detail_request";
  if (hasAny(messageNorm, KEYWORDS.intents.orderStart)) return "order_start";

  if (looksLikePhotoUrl(message)) return "photo";

  if (hasAny(messageNorm, KEYWORDS.intents.smalltalk)) return "smalltalk";

  if (extracted.hasAddress) return "address";
  if (extracted.phone) return "phone";
  if (extracted.hasName) return "name";

  if (detectedProduct === "atac" && extracted.letters) return "letters";

  return "general";
}
function resolveIntentByState({ detectedIntent, context, extracted }) {
  const stage = context.conversationStage || "";
  const product = context.detectedProduct || context.previousProduct || "";
  const norm = context.messageNorm || "";

  if (
    [
      "cancel_order",
      "post_sale",
      "new_order",
      "example_request",
      "location",
      "shipping",
      "shipping_price",
      "trust",
      "material_question",
    ].includes(detectedIntent)
  ) {
    return detectedIntent;
  }

  // LAZER - FOTO BEKLENİYOR
  if (stage === "waiting_photo" && product === "lazer") {
    if (extracted.photoLink) return "photo";
    if (detectedIntent === "photo_question") return "photo_question";
    if (isReferenceLike(norm)) return "photo_question";
    if (isShortAck(norm) || detectedIntent === "smalltalk") {
      return "waiting_photo_idle";
    }
    return detectedIntent;
  }

  // LAZER - ARKA YAZI BEKLENİYOR
  if (stage === "waiting_back_text" && product === "lazer") {
    if (extracted.photoLink) return "back_photo_upload";

    if (
      [
        "back_text_skip",
        "back_text_info",
        "back_photo_info",
        "back_photo_price",
      ].includes(detectedIntent)
    ) {
      return detectedIntent;
    }

    if (norm === "detay") return "back_text_info";
    if (norm === "bu olur mu" || norm === "o olur mu") {
      return "photo_question";
    }

    if (isShortAck(norm) || detectedIntent === "smalltalk") {
      return "waiting_back_text_idle";
    }

    if ((detectedIntent === "general" || detectedIntent === "back_text") && isLikelyFreeBackText(context)) {
      return "back_text";
    }

    return detectedIntent;
  }

  // ATAÇ - HARF BEKLENİYOR
  if (stage === "waiting_letters" && product === "atac") {
    if (extracted.letters) return "letters";

    if (detectedIntent === "payment") {
      return "payment_pending_letters";
    }

    if (isShortAck(norm) || detectedIntent === "smalltalk") {
      return "waiting_letters_idle";
    }

    return detectedIntent;
  }

  // ÖDEME BEKLENİYOR
  if (stage === "waiting_payment" && (product === "lazer" || product === "atac")) {
    if (detectedIntent === "payment") return "payment";

    if (SIDE_QUESTION_INTENTS.has(detectedIntent)) {
      return detectedIntent;
    }

    if (isShortAck(norm) || detectedIntent === "smalltalk") {
      return "waiting_payment_idle";
    }

    return detectedIntent;
  }

  // ADRES BEKLENİYOR
  if (stage === "waiting_address" && (product === "lazer" || product === "atac")) {
    if (extracted.hasAddress || extracted.phone || extracted.hasName) {
      return "address";
    }

    if (SIDE_QUESTION_INTENTS.has(detectedIntent)) {
      return detectedIntent;
    }

    if (isShortAck(norm) || detectedIntent === "smalltalk") {
      return "waiting_address_idle";
    }

    return detectedIntent;
  }

  return detectedIntent;
}
function buildContext(body) {
  const message = unwrapManychatValue(
    body.message || body.last_input_text || body.last_user_message || ""
  );

  const ilgilenilen_urun = unwrapManychatValue(body.ilgilenilen_urun);
  const user_product = unwrapManychatValue(body.user_product);

  const conversation_stage = normalizeStage(
    unwrapManychatValue(body.conversation_stage)
  );

  const photo_received = unwrapManychatValue(body.photo_received);
  const payment_method = normalizePayment(
    unwrapManychatValue(body.payment_method)
  );
  const menu_gosterildi = unwrapManychatValue(
    body.menu_gosterildi || body.menu_shown || body.menuShown
  );
  const ai_reply = unwrapManychatValue(body.ai_reply);
  const last_intent = unwrapManychatValue(body.last_intent);
  const order_status = normalizeOrderStatus(
    unwrapManychatValue(body.order_status)
  );
  const back_text_status = normalizeBackTextStatus(
    unwrapManychatValue(body.back_text_status)
  );
  const address_status = normalizeAddressStatus(
    unwrapManychatValue(body.address_status)
  );
  const support_mode = unwrapManychatValue(body.support_mode);
  const support_mode_reason = unwrapManychatValue(body.support_mode_reason);
  const reply_class = unwrapManychatValue(body.reply_class);
  const siparis_alindi = unwrapManychatValue(body.siparis_alindi);
  const cancel_reason = unwrapManychatValue(body.cancel_reason);
  const context_lock = unwrapManychatValue(body.context_lock);
  const letters_received = unwrapManychatValue(body.letters_received);
  const phone_received = unwrapManychatValue(body.phone_received);

  const existingProduct = ilgilenilen_urun || user_product || "";
  const previousProduct = normalizeProduct(existingProduct) || "";
  const entryProduct = getEntryProduct(body);
  const messageNorm = normalizeText(message);
  const explicitProduct = detectProduct(messageNorm, "");

  let detectedProduct = previousProduct || entryProduct || explicitProduct || "";

  if (previousProduct && explicitProduct && previousProduct !== explicitProduct) {
    const shouldKeepPreviousProduct =
      !isExplicitProductSwitch(messageNorm) &&
      (
        hasAny(messageNorm, KEYWORDS.intents.price) ||
        hasAny(messageNorm, KEYWORDS.intents.shippingPrice) ||
        hasAny(messageNorm, KEYWORDS.intents.shipping) ||
        hasAny(messageNorm, KEYWORDS.intents.trust) ||
        hasAny(messageNorm, KEYWORDS.intents.photoQuestion) ||
        hasAny(messageNorm, KEYWORDS.intents.backTextInfo) ||
        hasAny(messageNorm, KEYWORDS.intents.backPhotoInfo) ||
        hasAny(messageNorm, KEYWORDS.intents.backPhotoPrice) ||
        hasAny(messageNorm, KEYWORDS.intents.chain) ||
        hasAny(messageNorm, KEYWORDS.intents.payment) ||
        hasAny(messageNorm, KEYWORDS.intents.materialQuestion)
      );

    detectedProduct = shouldKeepPreviousProduct
      ? previousProduct
      : explicitProduct;
  }

  if (!previousProduct && entryProduct && explicitProduct && entryProduct !== explicitProduct) {
    detectedProduct = isExplicitProductSwitch(messageNorm)
      ? explicitProduct
      : entryProduct;
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
      entry_product: entryProduct,
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
      support_mode_reason,
      reply_class,
      siparis_alindi,
      cancel_reason,
      context_lock,
      letters_received,
      phone_received,
    },
    detectedProduct,
  };

  const extracted = extractEntities(baseContext);
  const rawIntent = detectIntent(baseContext, extracted);

  const detectedIntent = resolveIntentByState({
    detectedIntent: rawIntent,
    context: baseContext,
    extracted,
  });

  return {
    ...baseContext,
    extracted,
    detectedIntent,
  };
}

function applyFactsToState(state, context) {
  const next = { ...state };
  const { extracted, detectedProduct, detectedIntent, previousProduct } = context;

  // ürün değişimi
  if (previousProduct && detectedProduct && previousProduct !== detectedProduct) {
    next.photo_received = "";
    next.back_text_status = "";
    next.letters_received = "";
    next.payment_method = "";
    next.address_status = "";
    next.phone_received = "";
    next.name_received = "";
  }

  if (detectedProduct) {
    next.ilgilenilen_urun = detectedProduct;
    next.context_lock = "1";
    if (!next.order_status) next.order_status = "started";
  }

if (
    next.ilgilenilen_urun === "atac" &&
    !next.letters_received &&
    detectedIntent === "payment"
  ) {
    next.payment_method = "";
  }
  
  // iptal
  if (detectedIntent === "cancel_order") {
    next.order_status = "cancel_requested";
    next.conversation_stage = "human_support";
    next.siparis_alindi = "";
    return next;
  }

  // foto
  if (extracted.photoLink) {
    next.photo_received = "1";
  }

  // harf
  if (extracted.letters) {
    next.letters_received = "1";
  }

  // ödeme
  if (
    extracted.payment &&
    !(next.ilgilenilen_urun === "atac" && !next.letters_received)
  ) {
    next.payment_method = extracted.payment;
  }

  // arka yazı
  if (detectedIntent === "back_text_skip") {
    next.back_text_status = "skipped";
  }

  if (detectedIntent === "back_text" || detectedIntent === "back_photo_upload") {
    next.back_text_status = "received";
  }

  // telefon
  if (extracted.phone) {
    next.phone_received = "1";
  }

  // isim
  if (extracted.hasName) {
    next.name_received = "1";
  }

  // adres
  if (extracted.hasAddress && extracted.phone) {
    next.address_status = "received";
  } else if (extracted.hasAddress) {
    next.address_status = "address_only";
  } else if (next.address_status === "address_only" && extracted.phone) {
    next.address_status = "received";
  }

  // ürün bazlı temizlik
  if (next.ilgilenilen_urun === "atac") {
    next.photo_received = "";
    next.back_text_status = "";
  }

  if (next.ilgilenilen_urun === "lazer") {
    next.letters_received = "";
  }

  return next;
}

function getNextStage(state) {
  const product = state.ilgilenilen_urun;

  if (!product) return "waiting_product";

  // LAZER
  if (product === "lazer") {
    if (!state.photo_received) return "waiting_photo";
    if (!state.back_text_status) return "waiting_back_text";
    if (!state.payment_method) return "waiting_payment";
    if (state.address_status !== "received") return "waiting_address";
    return "order_completed";
  }

  // ATAÇ
  if (product === "atac") {
    if (!state.letters_received) return "waiting_letters";
    if (!state.payment_method) return "waiting_payment";
    if (state.address_status !== "received") return "waiting_address";
    return "order_completed";
  }

  return "";
}
function generateReply(context, state) {
  const stage = state.conversation_stage;
  const product = state.ilgilenilen_urun;
  const intent = context.detectedIntent;

  // === GLOBAL SIDE QUESTIONS ===
if (intent === "payment_pending_letters") {
    return "İstediğiniz harfleri yazabilirsiniz efendim 😊";
  }

if (
  product === "atac" &&
  (intent === "back_text_info" || intent === "back_photo_info" || intent === "back_photo_price")
) {
  return "Bu özellik resimli lazer kolye için geçerlidir efendim 😊";
}

if (product === "atac" && intent === "photo_question") {
  return "Bu modelde fotoğraf gerekmiyor efendim 😊";
}
  
  if (intent === "price") {
    if (product === "lazer") return LASER_PRICE_TEXT;
    if (product === "atac") return ATAC_PRICE_TEXT;
    return MAIN_MENU_TEXT;
  }

if (intent === "shipping_price") {
  return "Kargo ücreti fiyata dahildir efendim 😊";
}

if (intent === "shipping") {
  if ((context.messageNorm || "").includes("kargom nerede")) {
    return "Kargo durumu için ekibimiz size yardımcı olacaktır efendim 😊";
  }
  return SHIPPING_TIME_FALLBACK_TEXT;
}

if (intent === "payment") {
  return "EFT / Havale veya kapıda ödeme mevcut efendim 😊";
}

if (intent === "location") {
  return "Eminönü İstanbul’dayız efendim 😊";
}

if (intent === "trust") {
  return "Güvenle sipariş verebilirsiniz efendim 😊 Ürünlerimiz paslanmaz çeliktir, kararma yapmaz.";
}

if (intent === "chain_question" && product === "lazer") {
  return "Standart zincir uzunluğu 60 cm'dir efendim 😊";
}

if (intent === "back_photo_price") {
  return "Arka foto için ek ucret yok efendim 😊";
}

  // === FLOW ===

if (intent === "cancel_order") {
  return FALLBACK_TEXT;
}
  
  if (!product) {
    return MAIN_MENU_TEXT;
  }

  // ===== LAZER =====
if (product === "lazer") {
  if (!context.previousProduct && context.detectedProduct === "lazer" && !context.fields.photo_received) {
    return LASER_PRICE_TEXT;
  }

  if (stage === "waiting_photo") {
    return "Fotoğrafı buradan gönderebilirsiniz efendim 😊";
  }
    if (stage === "waiting_back_text") {
      return "Arka yüzüne yazı ister misiniz? İstemiyorsanız 'yok' yazabilirsiniz 😊";
    }

    if (stage === "waiting_payment") {
      return "Ödeme tercihinizi yazabilir misiniz? EFT / Kapıda ödeme 😊";
    }

    if (stage === "waiting_address") {
      return ORDER_DETAILS_TEXT;
    }

    if (stage === "order_completed") {
      return "Siparişiniz alınmıştır efendim 😊";
    }
  }

  // ===== ATAÇ =====
if (product === "atac") {
  if (!context.previousProduct && context.detectedProduct === "atac" && !context.fields.letters_received) {
    return ATAC_PRICE_TEXT;
  }

  if (intent === "photo_question") {
    return "Bu modelde fotoğraf gerekmiyor efendim 😊";
  }

  if (intent === "back_text_info" || intent === "back_photo_info" || intent === "back_photo_price") {
    return "Bu özellik resimli lazer kolye için geçerlidir efendim 😊";
  }

  if (stage === "waiting_letters") {
    return "İstediğiniz harfleri yazabilirsiniz efendim 😊";
  }

    if (stage === "waiting_payment") {
      return "Ödeme tercihinizi yazabilir misiniz? 😊";
    }

    if (stage === "waiting_address") {
      return ORDER_DETAILS_TEXT;
    }

    if (stage === "order_completed") {
      return "Siparişiniz alınmıştır efendim 😊";
    }
  }

  return FALLBACK_TEXT;
}
export async function processChat(body = {}) {
  const context = buildContext(body);

let state = {
  ilgilenilen_urun: unwrapManychatValue(body.ilgilenilen_urun),
  conversation_stage: normalizeStage(unwrapManychatValue(body.conversation_stage)),
  photo_received: unwrapManychatValue(body.photo_received),
  back_text_status: normalizeBackTextStatus(unwrapManychatValue(body.back_text_status)),
  letters_received: unwrapManychatValue(body.letters_received),
  payment_method: normalizePayment(unwrapManychatValue(body.payment_method)),
  address_status: normalizeAddressStatus(unwrapManychatValue(body.address_status)),
  phone_received: unwrapManychatValue(body.phone_received),
  name_received: unwrapManychatValue(body.name_received),
  order_status: normalizeOrderStatus(unwrapManychatValue(body.order_status)),
  siparis_alindi: unwrapManychatValue(body.siparis_alindi),
  context_lock: unwrapManychatValue(body.context_lock),
};
  // contextten gelen bilgileri state'e işle
  state = applyFactsToState(state, context);

// yeni stage hesapla
if (state.conversation_stage !== "human_support") {
  const shouldPreserveStage =
    (
      SIDE_QUESTION_INTENTS.has(context.detectedIntent) ||
      context.detectedIntent === "payment_pending_letters"
    ) &&
    !!body.conversation_stage;

  if (!shouldPreserveStage) {
    state.conversation_stage = getNextStage(state);
  }
}

// cevap üret
let reply = generateReply(context, state);

// güvenlik
if (!reply || typeof reply !== "string") {
  reply = FALLBACK_TEXT;
}

// order status senkron
if (!state.order_status && state.ilgilenilen_urun) {
  state.order_status = "started";
}

if (state.conversation_stage === "order_completed") {
  state.order_status = "completed";
  state.siparis_alindi = "1";
}

  // log
  try {
    await logConversationRow({
      message: body.message || "",
      result_reply: reply,
      result_stage: state.conversation_stage,
      result_product: state.ilgilenilen_urun,
    });
  } catch (err) {
    console.error("logConversationRow error:", err);
  }

return {
  ai_reply: reply,
  ilgilenilen_urun: state.ilgilenilen_urun || "",
  conversation_stage: state.conversation_stage || "",
  photo_received: state.photo_received || "",
  back_text_status: state.back_text_status || "",
  letters_received: state.letters_received || "",
  payment_method: state.payment_method || "",
  address_status: state.address_status || "",
  phone_received: state.phone_received || "",
  name_received: state.name_received || "",
  order_status: state.order_status || "",
  siparis_alindi: state.siparis_alindi || "",
  context_lock: state.context_lock || "",
  success: true,
};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({
      success: false,
      ai_reply: "Only POST supported",
    });
  }

  try {
    const result = await processChat(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error("chat.js error:", error);

    return res.status(200).json({
      ai_reply: FALLBACK_TEXT,
      ilgilenilen_urun: "",
      conversation_stage: "",
      photo_received: "",
      back_text_status: "",
      letters_received: "",
      payment_method: "",
      address_status: "",
      phone_received: "",
      name_received: "",
      success: true,
    });
  }
}
