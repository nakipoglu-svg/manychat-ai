import fs from "fs";
import path from "path";
import { logConversationRow } from "../lib/sheetsLogger.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 1: CONSTANTS & CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ──────────────────────────────────────
const fileCache = {};

const FALLBACK_TEXT = "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";

const MAIN_MENU_TEXT =
  "Merhaba efendim 😊\nHangi model ile ilgileniyorsunuz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye";

const LASER_PRICE_TEXT =
  "Resimli lazer kolye fiyatımız EFT / Havale ile 599,90 TL, kapıda ödeme ile 649,90 TL'dir efendim 😊 Siparişe devam etmek isterseniz fotoğrafı buradan gönderebilirsiniz.";

const ATAC_PRICE_TEXT =
  "Harfli ataç kolye fiyatımız EFT / Havale ile 499,90 TL, kapıda ödeme ile 549,90 TL'dir efendim 😊 Siparişe devam etmek isterseniz istediğiniz harfleri yazabilirsiniz.";

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

// ─── TURKEY CITIES & DISTRICT KEYWORDS ──────────────────────
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
  "zonguldak",
];

const DISTRICT_KEYWORDS = [
  "kadikoy", "kadıköy", "beykoz", "uskudar", "üsküdar", "besiktas", "beşiktaş",
  "sisli", "şişli", "fatih", "moda", "kavacik", "kavacık", "eminonu", "eminönü",
  "nusaybin", "beyazit", "beyazıt", "kizilay", "kızılay", "cankaya", "çankaya",
  "beylikduzu", "beylikdüzü", "bagcilar", "bağcılar", "arnavutkoy", "arnavutköy",
  "esenyurt", "avcilar", "avcılar", "bahcelievler", "bahçelievler", "bakirköy", "bakırköy",
  "maltepe", "kartal", "pendik", "tuzla", "sultanbeyli", "umraniye", "ümraniye",
  "atasehir", "ataşehir", "sancaktepe", "cekmekoy", "çekmeköy", "sultangazi",
  "gaziosmanpasa", "gaziosmanpaşa", "eyup", "eyüp", "sariyer", "sarıyer",
  "kemerburgaz", "buyukcekmece", "büyükçekmece", "kucukcekmece", "küçükçekmece",
  "basaksehir", "başakşehir", "zeytinburnu", "gungoren", "güngören",
];

// ─── KEYWORDS ───────────────────────────────────────────────
const KEYWORDS = {
  product: {
    lazer: [
      "resimli", "fotografli", "foto", "fotolu", "lazer",
      "resim kolye", "foto kolye", "fotografli kolye", "fotoğraflı kolye",
      "resimli kolye", "resimli lazer", "resimli madalyon", "resimli olan",
    ],
    atac: [
      "atac", "ataç", "harfli", "harf kolye", "harfli kolye",
      "3 harf", "uc harf", "isim harf", "harfli atac",
    ],
  },
  intents: {
    cancel: ["siparisi iptal", "siparişi iptal", "iptal", "vazgectim", "vazgeçtim"],

    // ──── SMALLTALK: genişletildi ────
    smalltalk: [
      "merhaba", "selam", "slm", "mrb", "merhabalar",
      "iyi aksamlar", "iyi akşamlar", "iyi gunler", "iyi günler",
      "gunaydin", "günaydın", "iyi geceler",
      "nasilsiniz", "nasılsınız",
      "tesekkur", "teşekkür", "tesekkurler", "teşekkürler", "tsk", "tşk",
      "sagolun", "sağolun", "saol", "sağol",
      "allah razi olsun", "allah razı olsun",
      "kolay gelsin",
      "emeginize saglik", "emeğinize sağlık", "ellerinize saglik", "ellerinize sağlık",
      "cok begendik", "çok beğendik", "cok begendim", "çok beğendim",
      "begendim", "beğendim", "bayildim", "bayıldım",
      "tatli olmus", "tatlı olmuş", "guzel olmus", "güzel olmuş",
      "elinize saglik", "elinize sağlık",
      "cok guzel", "çok güzel", "cok guzel olmus", "çok güzel olmuş",
      "super", "süper", "harika",
      "cok iyi", "çok iyi", "mukemmel", "mükemmel",
      // Müşteri SANA taziye/teşekkür diyor — bot da müşteriye taziye dememeli
      "basiniz sagolsun", "başınız sağolsun", "basiniz sag olsun", "başınız sağ olsun",
      "allah yardimciniz olsun", "allah yardımcınız olsun",
      "hakkinizi helal edin", "hakkınızı helal edin",
      "bol kazanclar", "bol kazançlar",
      "hayirli isler", "hayırlı işler",
      "insallah", "inşallah", "amin", "masallah", "maşallah", "eyvallah",
      "bekliyorum", "haber bekliyorum", "bilginiz olsun",
      "liked a message", "reacted",
    ],

    // ──── LOCATION ────
    location: ["yeriniz nerede", "yeriniz neresi", "neredesiniz", "konum", "magaza", "mağaza", "eminonu", "eminönü"],

    // ──── SHIPPING PRICE: genişletildi ────
    shippingPrice: [
      "kargo ucreti", "kargo ücreti",
      "kargo ucreti ne kadar", "kargo ücreti ne kadar",
      "kargo fiyati var mi", "kargo fiyatı var mı",
      "kargo dahil mi", "kargo ücretli mi", "kargo ucretli mi",
      "kargo ucreti var mi", "kargo ücreti var mı",
      "kargo birlikte mi", "kargo ile birlikte mi",
      "kargo ucreti dahil mi", "kargo ücreti dahil mi",
      "kargo fiyata dahil", "kargo dahil",
      "kargo ucretsiz mi", "kargo ücretsiz mi",
      "kargo parasi", "kargo parasI", "kargo parası",
      "eve teslim", "kargo var mi", "kargo varmı", "kargo varmi",
    ],

    // ──── SHIPPING ────
    shipping: [
      "kargo", "teslimat", "ne zaman gelir", "kac gunde", "kaç günde",
      "kac gune", "kaç güne", "kac gun", "kaç gün",
      "takip no", "kargom nerede", "ne zaman kargolarsiniz",
      "ne zaman kargoya verilir", "kac gune gelir", "kaç güne gelir",
      "ne zaman hazir", "ne zaman hazır", "kac gune hazir", "kaç güne hazır",
      "ne zaman teslim", "teslim suresi", "teslim süresi",
      "icinde gelir", "içinde gelir",
    ],

    // ──── TRUST: genişletildi (çelik/malzeme soruları dahil) ────
    trust: [
      "guvenilir", "guven", "dolandirici", "orijinal", "saglam",
      "kararma", "kararir mi", "kararma yapar mi", "kararma olur mu",
      "kararır mı", "kararma yapar mı",
      "karar ma", "kararma yapiyomu", "kararma yapıyomu",
      "kararma yaparmi", "kararma yapiyormu", "kararma yapıyor mu",
      "kararma oluyormu", "kararma oluyor mu",
      "solar", "solma", "paslan",
      "kaplama", "kaplamasi atar", "kaplaması atar",
      "garanti",
      // malzeme soruları da güven kategorisi
      "celik mi", "çelik mi", "celikmi", "çelikmi",
      "urun celik mi", "ürün çelik mi",
      "paslanmaz mi", "paslanmaz mı",
      "malzeme ne", "malzemesi ne",
      "ne malzeme", "hangi malzeme",
    ],

    // ──── PAYMENT ────
    payment: [
      "kapida odeme", "kapıda ödeme",
      "kapida odeme olur mu", "kapıda ödeme olur mu",
      "kapida odeme var mi", "kapıda ödeme var mı",
      "kapida oderim", "kapıda öderim",
      "kapida odeme olsun", "kapıda ödeme olsun",
      "kapida olsun", "kapıda olsun",
      "kapida", "kapıda",
      "eft", "havale",
      "odeme", "ödeme",
      "iban", "dekont", "aciklama", "açıklama",
      "kredi karti", "kredi kartı", "kartla", "kart ile",
    ],

    // ──── PRICE ────
    price: ["fiyat", "fıyat", "fiat", "fyat", "ne kadar", "nekadar", "ucret", "ücret", "kac tl", "kaç tl", "kac lira", "kaç lira"],

    // ──── CHAIN ────
    chain: [
      "zincir model", "zincir degisiyor mu", "zincir değişiyor mu",
      "zincir kisalir mi", "zincir kısalır mı",
      "zincir boyu", "zincir uzunlugu", "zincir uzunluğu",
      "zincir ne kadar", "uzunlugu ne kadar", "uzunluğu ne kadar",
      "zincir kac cm", "zincir kaç cm",
      "zincirlere bakabilir", "zincir secenekleri", "zincir seçenekleri",
      "boyu ne kadar", "boyutu ne kadar", "kac cm", "kaç cm",
      "kac santim", "kaç santım", "kac santım", "kaç santim",
      "zincir dahil", "zincir dayil",
    ],

    // ──── ORDER START ────
    orderStart: [
      "siparis vermek istiyorum", "sipariş vermek istiyorum",
      "siparis verecegim", "sipariş vereceğim",
      "almak istiyorum", "hazirlayalim", "hazırlayalım",
      "yaptirmak istiyorum", "yaptırmak istiyorum",
    ],

    // ──── PHOTO QUESTION ────
    photoQuestion: [
      "bu foto olur mu", "fotograf uygun mu", "foto uygun mu",
      "nasil olsun foto", "nasil foto",
      "hangi fotoyu atayim", "buradan mi atayim",
      "whatsapptan mi", "nasil aticam", "nasil atacam",
      "fotoyu nasil atayim", "foto atsam olur mu",
      "fotograf atsam olur mu", "gondersem olur mu",
      "fotoğraf atsam olur mu",
      "fotoğrafı nasıl göndereceğim", "fotografi nasil gonderecegim",
      "fotoğrafı nasıl gönderebilirim", "fotografi nasil gonderebilirim",
      "resim nasıl gönderiyorum", "resim nasil gonderiyorum",
      "resim nasil gonderirim", "resmi nasil gonderiyorum",
      "resmi nasil gonderirim", "fotografi atsam olur mu",
      "nasil gonderecegim", "nasıl göndereceğim",
      "buradan gondereyim", "buradan göndereyim",
      "buradan mi gonderecegim", "buradan mı göndereceğim",
    ],

    // ──── BACK PHOTO PRICE ────
    backPhotoPrice: [
      "arkasina fotograf ne kadar", "arkasına fotograf ne kadar",
      "arkasina foto ne kadar", "arkasına foto ne kadar",
      "arka tarafa fotograf koymak istesek ne kadar olacak",
      "ek ucret", "ek ücret",
      "arkasina foto koyarsam fiyat ne olur", "arkasına foto koyarsam fiyat ne olur",
      "arka foto olursa fiyat", "arka foto fiyat",
      "arka yuz fiyat", "arka yüz fiyat",
    ],

    // ──── BACK TEXT INFO ────
    backTextInfo: [
      "arka tarafina da mi yazabiliyoruz",
      "arka tarafina da yazabiliyor muyuz",
      "arkasina yazi oluyor mu", "arkasına yazı oluyor mu",
      "arkasina yazi olur mu", "arkasına yazı olur mu",
      "arka yuzune yazi oluyor mu", "arka yüzüne yazı oluyor mu",
      "arkaya yazi yaziliyor mu", "arkaya yazı yazılıyor mu",
      "arka tarafa yazi oluyor mu", "arka tarafa yazi olur mu",
      "dua yazilir mi", "dua yazılır mı",
      "isim yazilir mi", "isim yazılır mı",
    ],

    // ──── BACK PHOTO INFO ────
    backPhotoInfo: [
      "arkali onlu fotograf olur mu", "arkalı önlü fotoğraf olur mu",
      "arkali onlu foto olur mu", "arkalı önlü foto olur mu",
      "arkali onlu", "arkalı önlü",
      "onlu arkali", "önlü arkalı",
      "cift tarafli", "çift taraflı", "iki tarafli", "iki taraflı",
      "iki tarafa resim", "iki tarafa da resim",
      "iki yuzune resim", "iki yüzüne resim",
      "on yuze bir fotograf arka yuze bir fotograf",
      "arkasina fotograf olur mu", "arkasına fotoğraf olur mu",
      "arkasina foto olur mu", "arkasına foto olur mu",
      "arka yuzune fotograf olur mu", "arka yüzüne fotoğraf olur mu",
      "arka yuzune fotograf koyabiliyor", "arka yüzüne fotoğraf koyabiliyor",
      "kolyenin iki yuzune de resim yapabilir misiniz",
      "iki yuzune de foto olur mu", "iki yüzüne de foto olur mu",
      "arka tarafa foto olur mu", "arka tarafa fotograf olur mu",
      "arka tarafa foto", "arka tarafa fotograf",
    ],

    // ──── BACK TEXT SKIP ────
    backTextSkip: [
      "yok", "istemiyorum", "gerek yok",
      "bos kalsin", "boş kalsın", "bos olsun", "boş olsun",
      "arka bos kalsin", "arka boş kalsın",
      "yazi olmasin", "yazı olmasın", "arka yazi yok", "arka yazı yok",
    ],

    // ──── BACK TEXT DIRECT ────
    backTextDirect: [
      "arkasina yazi", "arkasına yazı", "arka yazi", "arka yazı",
      "arkasina tarih", "arkasına tarih", "arkaya yazi", "arkaya yazı",
      "arka tarafa yazi", "arka tarafa yazı",
    ],

    // ──── POST-SALE (YENİ) ────
    postSale: [
      "siparis ettigim urun gelmedi", "sipariş ettiğim ürün gelmedi",
      "urun gelmedi", "ürün gelmedi",
      "siparis ne oldu", "sipariş ne oldu",
      "kargom gelmedi", "gelmedi", "ulasmadi", "ulaşmadı",
      "kolyem hazir mi", "kolyem hazır mı",
      "ne zaman hazir", "ne zaman hazır",
      "siparisim ne durumda", "siparişim ne durumda",
      "kargoya verildi mi",
      "yola cikti mi", "yola çıktı mı",
      // Sipariş değişikliği talepleri (ürün üretime girmiş olabilir)
      "fotografi degistirmek", "fotoğrafı değiştirmek",
      "arka yaziyi degistirmek", "arka yazıyı değiştirmek",
      "siparisi degistirmek", "siparişi değiştirmek",
      "degisiklik yapmak", "değişiklik yapmak",
      "degistirebilir miyim", "değiştirebilir miyim",
    ],

    // ──── NEW ORDER (YENİ) ────
    newOrder: [
      "daha siparis", "daha sipariş",
      "bir tane daha", "iki tane daha", "2 tane daha", "3 tane daha",
      "tekrar siparis", "tekrar sipariş",
      "yeni siparis", "yeni sipariş",
      "bir siparis daha", "bir sipariş daha",
    ],

    // ──── EXAMPLE REQUEST (YENİ) ────
    exampleRequest: [
      "ornek atabilir misiniz", "örnek atabilir misiniz",
      "ornek gorebilir miyim", "örnek görebilir miyim",
      "ornek atar misiniz", "örnek atar mısınız",
      "ornek gonderir misiniz", "örnek gönderir misiniz",
      "ornek foto", "örnek foto",
    ],

    // ──── DETAIL REQUEST (YENİ — 1605 kez gelmiş!) ────
    detailRequest: ["detay", "detaylar"],

    // ──── MATERIAL QUESTION — çelik mi vs ────
    materialQuestion: [
      "celik mi", "çelik mi", "celikmi", "çelikmi",
      "urun celik mi", "ürün çelik mi",
      "paslanmaz mi", "paslanmaz mı",
      "malzeme ne", "malzemesi ne",
      "alerji", "alerjim", "alerjik",
    ],
  },
};

const LETTER_STOPWORDS = [
  "devam", "tamam", "evet", "olur", "merhaba", "selam", "slm", "fiyat", "ucret", "ücret",
  "kapida", "kapıda", "eft", "havale", "odeme", "ödeme", "hayir", "hayır", "gonder", "gönder",
  "yok", "istemiyorum", "gerek", "bos", "boş", "tmm", "tamamdir", "tamamdır", "peki", "ok",
  "detay", "bilgi", "super", "süper", "harika", "amin", "insallah", "inşallah",
  "masallah", "maşallah", "eyvallah",
];

// ──── Mesajlar intent olarak yanlış yorumlanmaması gereken ifadeler ────
const NOT_A_NAME_PHRASES = [
  "resimli", "fotografli", "fotolu", "lazer", "kolye", "atac", "ataç", "harfli",
  "celik mi", "çelik mi", "celikmi", "çelikmi", "paslanmaz",
  "madalyon", "nazar", "boncuk", "boncuklu",
  "begendim", "beğendim", "begendik", "beğendik", "guzel", "güzel",
  "saglik", "sağlık", "elinize", "ellerinize", "emeginize", "emeğinize",
  "siparis", "sipariş", "kargo", "teslimat",
  "hazir mi", "hazır mı", "hazir", "hazır",
  "goreyim", "görebilir", "gorebilir",
  "istiyorum", "ilgileniyorum", "alayim", "alayım",
  "detay", "bilgi", "fiyat", "ucret", "ücret",
  "olur mu", "olurmu", "var mi", "var mı",
  "yapilir mi", "yapılır mı", "yapar mi", "yapar mı",
  "bekliyorum", "gonderdim", "gönderdim", "gonderirim", "gönderirim",
  "yaziyorum", "yazıyorum",
  "yaptirmak", "yaptırmak",
  "gelmedi", "ulasmadi", "ulaşmadı",
  "tekrar", "daha",
  "indirim", "kampanya",
  "kapida", "kapıda",
  "durun", "dur",
  "boncuklu", "madalyon", "resimli",
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 2: UTILITIES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ──────────────────────────────────────

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
  return CRITICAL_KNOWLEDGE_FILES.filter((file) => {
    const content = knowledgeMap[file];
    return !content || !String(content).trim();
  });
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
  ]
    .filter(Boolean)
    .join("\n\n");
}

function hasAny(text, keywords) {
  return keywords.some((k) => {
    if (!text.includes(k)) return false;
    // Tek harfli keyword'ler için word boundary zorunlu (false positive çok yüksek)
    if (k.length === 1) {
      return new RegExp(`\\b${k}\\b`).test(text);
    }
    return true;
  });
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
    .replace(/İ/g, "i")  // Türkçe büyük İ → i (combining dot issue fix)
    .toLowerCase()
    .replace(/i̇/g, "i")  // combining dot above cleanup
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/\u0307/g, "")  // remaining combining dot above
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

function makeReply(text, replyClass = REPLY_CLASS.FLOW_PROGRESS, supportModeReason = SUPPORT_MODE_REASON.NONE) {
  return { text, reply_class: replyClass, support_mode_reason: supportModeReason };
}

function emptyReply() {
  return { text: "", reply_class: "", support_mode_reason: SUPPORT_MODE_REASON.NONE };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 3: PARSERS (Entity Detection)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ (YENİDEN YAZILDI) ─────────────────────

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

/**
 * *** YENİDEN YAZILDI ***
 * Adres tespiti artık stage-aware. waiting_address dışında çok daha katı.
 */
function looksLikeAddress(messageNorm, rawMessage = "", conversationStage = "") {
  const raw = String(rawMessage || "").trim();
  if (!raw || raw.length < 10) return false;

  // Soru cümlelerini adres olarak algılama
  if (/[?]/.test(raw)) return false;
  if (/\b(mi|mı|mu|mü|miyim|mıyım|musun|müsün)\b/i.test(raw)) return false;

  const addressKeywords = [
    "mahalle", "mah", "sokak", "sk", "cadde", "cd", "bulvar", "no", "daire", "apt",
    "apartman", "apart", "ap", "kat", "site", "sitesi", "blok", "ilce", "ilçe",
    "mahallesi", "ic kapi", "iç kapı",
  ];

  let hit = 0;
  for (const k of addressKeywords) {
    if (messageNorm.includes(k)) hit++;
  }

  const hasNumber = /\d/.test(raw);
  const hasCityMatch = TURKEY_CITIES.filter((c) => messageNorm.includes(c)).length;
  const hasDistrictMatch = DISTRICT_KEYWORDS.filter((d) => messageNorm.includes(d)).length;

  // waiting_address stage'inde daha toleranslı
  if (conversationStage === "waiting_address") {
    if (hit >= 2) return true;
    if (hit >= 1 && hasNumber) return true;
    if (hasCityMatch >= 1 && hasDistrictMatch >= 1) return true;
    if (hasCityMatch >= 1 && hit >= 1) return true;
    // Uzun mesaj + şehir + numara
    if (raw.length >= 20 && hasCityMatch >= 1 && hasNumber) return true;
  } else {
    // Diğer stage'lerde çok daha katı
    if (hit >= 3) return true;
    if (hit >= 2 && hasNumber && hasCityMatch >= 1) return true;
    // En az 2 adres keyword + bir şehir lazım
    if (hit >= 2 && hasCityMatch >= 1) return true;
  }

  return false;
}

/**
 * *** YENİDEN YAZILDI ***
 * İsim tespiti artık çok daha katı. Yalnızca gerçek isimler eşleşecek.
 */
function looksLikeNameInput(rawMessage = "", messageNorm = "", conversationStage = "") {
  // İsim tespiti SADECE waiting_address stage'inde aktif
  if (conversationStage !== "waiting_address") return false;

  const raw = String(rawMessage || "").trim();
  if (!raw) return false;
  if (raw.length < 4 || raw.length > 40) return false;
  if (/\d/.test(raw)) return false;
  if (/[?!.:/]/.test(raw)) return false;

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;
  if (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/.test(raw)) return false;

  // NOT_A_NAME_PHRASES kontrolü — herhangi biri varsa isim değil
  const norm = normalizeText(raw);
  for (const phrase of NOT_A_NAME_PHRASES) {
    if (norm.includes(phrase)) return false;
  }

  // Fiil/niyet kalıpları isim değil — "Adresi yazıyorum", "Foto atacağım"
  if (/\b(yorum|yorsun|yor|yoruz|yorsunuz|yorlar|acagim|acağım|ecegim|eceğim|ayim|ayım|eyim|elim|alim)\b/i.test(raw)) return false;

  // Bilinen intent keyword'lerini kontrol et
  for (const intentKey of Object.keys(KEYWORDS.intents)) {
    if (hasAny(norm, KEYWORDS.intents[intentKey])) return false;
  }

  // Ürün keyword'lerini kontrol et
  if (hasAny(norm, KEYWORDS.product.lazer) || hasAny(norm, KEYWORDS.product.atac)) return false;

  // Adres gibi görünüyorsa isim değil
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
  const candidates = [
    body.entry_product, body.ad_product, body.flow_product,
    body.trigger_product, body.product_context, body.source_product,
  ];
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
    "waiting_photo", "waiting_payment", "waiting_address",
    "waiting_letters", "waiting_product", "waiting_back_text",
    "order_completed", "human_support",
  ];
  const normalized = v.replace(/\s+/g, "_");
  return allowed.includes(normalized) ? normalized : "";
}

function isExplicitProductSwitch(messageNorm) {
  return hasAny(messageNorm, [
    "yok ben", "onun yerine", "degistirelim", "degistirmek istiyorum",
    "değiştirelim", "değiştirmek istiyorum",
    "ben atac alayim", "ben ataç alayım", "ben resimli istiyorum",
    "ben lazer istiyorum", "ataç alayım", "atac alayim",
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
  // FIX 2: Kredi kartı mesajlarında ödeme kaydedilmez — stage değişmez
  if (hasAny(messageNorm, ["kredi karti", "kredi kartı", "kartla", "kart ile"])) {
    return existing || "";
  }

  if (hasAny(messageNorm, ["kapida odeme", "kapıda ödeme", "kapida", "kapıda", "odeme olsun", "ödeme olsun"])) {
    return "kapida_odeme";
  }
  if (hasAny(messageNorm, ["eft", "havale"])) {
    return "eft_havale";
  }
  return existing || "";
}

// ─── EXTRACT ENTITIES (stage-aware) ─────────────────────────

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
      raw && raw.length <= 24 &&
      !/[?!.:,/]/.test(raw) &&
      /^[a-zA-ZçğıöşüÇĞİÖŞÜ\s&]+$/.test(raw) &&
      parts.length <= 3 &&
      !LETTER_STOPWORDS.includes(norm) &&
      !hasAny(norm, [
        "atac", "ataç", "harfli", "kolye", "istiyorum", "ilgileniyorum",
        "almak istiyorum", "kac tane", "kaç tane", "hangi harf", "hangi harfler",
        "harf mi", "fiyat", "ne kadar", "olur mu", "celik", "çelik",
        "kararma", "paslanmaz", "malzeme",
      ]);
    if (looksLikeLetters) letters = raw;
  }

  return { phone, hasAddress, hasName, payment, photoLink, letters };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 4: DETECTORS (Intent & Product Detection)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ (TAMAMEN YENİDEN YAZILDI) ─────────────
/**
 * 3 katmanlı intent algılama:
 * 1. Kesin keyword intent'ler (en yüksek öncelik)
 * 2. Flow-aware intent'ler (stage'e göre)
 * 3. Entity-based intent'ler (en düşük öncelik, sadece ilgili stage'de)
 */
function detectIntent(baseContext, extracted) {
  const { messageNorm, message, detectedProduct, conversationStage } = baseContext;
  const raw = String(message || "").trim();

  // ═══ KATMAN 0: Boş/çok kısa mesajlar ═══
  if (!raw || raw.length <= 1) return "general";

  // Emoji-only veya reaction mesajları
  if (/^(liked a message|reacted)/.test(messageNorm)) return "smalltalk";

  // ═══ KATMAN 1: KEYİN KEYWORD INTENT'LER ═══

  // İptal — her zaman en yüksek öncelik
  if (hasAny(messageNorm, KEYWORDS.intents.cancel)) return "cancel_order";

  // Post-sale (sipariş sonrası şikayet/soru) — aktif sipariş akışında false positive riski düşürülür
  if (hasAny(messageNorm, KEYWORDS.intents.postSale)) {
    // "gelmedi" tek kelime + aktif sipariş akışında → general olarak değerlendir
    // (müşteri "fotoğraf gelmedi mi" vs "ürün gelmedi" ayrımı)
    const isShortPostSale = messageNorm === "gelmedi" || messageNorm === "ulasmadi";
    if (isShortPostSale && conversationStage && conversationStage !== "order_completed") {
      // Aktif akışta kısa post-sale keyword'leri → general'e düşsün
    } else {
      return "post_sale";
    }
  }

  // Yeni sipariş talebi
  if (hasAny(messageNorm, KEYWORDS.intents.newOrder)) return "new_order";

  // ──── Back text stage-specific intents ────
  if (conversationStage === "waiting_back_text") {
    if (hasAny(messageNorm, [
      "olur mu bu fotograf", "olur mu bu foto", "sizce bu fotograf olur mu",
      "bu fotograf olur mu", "bu foto olur mu", "fotograf uygun mu", "foto uygun mu",
      "uygun mudur",
    ])) return "photo_suitability_question";

    if (hasAny(messageNorm, [
      "gonderdim ya zaten", "gönderdim ya zaten",
      "ikinci fotoyu da gonderdim", "ikinci fotoyu da gönderdim",
      "arka fotografi da gonderdim", "arka fotoyu da gonderdim",
    ])) return "back_photo_already_sent";

    if (hasAny(messageNorm, [
      "genelde ne yaziliyor", "genelde ne yazılıyor",
      "ne yaziliyor genelde", "ne yazılıyor genelde",
      "yazi ne yazalim", "yazı ne yazalım",
      "arkaya ne yaziliyor", "arkaya ne yazılıyor",
    ])) return "back_text_examples";

    if (hasAny(messageNorm, KEYWORDS.intents.backTextSkip)) return "back_text_skip";
    if (hasAny(messageNorm, KEYWORDS.intents.backTextInfo)) return "back_text_info";
    if (hasAny(messageNorm, KEYWORDS.intents.backPhotoInfo)) return "back_photo_info";
  }

  // ──── Kesin keyword intents ────
  if (hasAny(messageNorm, KEYWORDS.intents.backPhotoPrice)) return "back_photo_price";

  // Fotoğraf URL geldi
  if (looksLikePhotoUrl(message)) {
    // Ürün bağlamı yoksa → genel fotoğraf, photo sayılmaz
    if (!detectedProduct) return "photo";

    // Lazer: waiting_photo → müşteri fotoğrafı
    if (detectedProduct === "lazer") {
      // Mesajda ürün referansı varsa → bu kolye/ürün fotoğrafı, müşteri fotoğrafı DEĞİL
      if (hasAny(messageNorm, [
        "bu", "bunu", "bundan", "ayni", "aynı", "istiyorum",
        "bu model", "bu kolye", "bu urun", "bu ürün",
        "bunun aynisi", "bunun aynısı", "bu sekilde", "bu şekilde",
        "bu tarz", "bu tip",
      ])) {
        return "product_image_reference";
      }

      if (conversationStage === "waiting_back_text") return "back_photo_upload";
      return "photo";
    }

    // Ataç: fotoğraf kullanılmaz
    if (detectedProduct === "atac") return "photo";
  }

  // Kargo ücreti soruları (shipping_price, shipping'den ÖNCE kontrol edilmeli)
  if (hasAny(messageNorm, KEYWORDS.intents.shippingPrice)) return "shipping_price";

  // Kargo
  if (hasAny(messageNorm, KEYWORDS.intents.shipping)) return "shipping";

  // Malzeme soruları (çelik mi vs) — trust'tan önce kontrol
  if (hasAny(messageNorm, KEYWORDS.intents.materialQuestion)) return "material_question";

  // Güven
  if (hasAny(messageNorm, KEYWORDS.intents.trust)) return "trust";

  // Lokasyon
  if (hasAny(messageNorm, KEYWORDS.intents.location)) return "location";

  // Ödeme — ama "ödeme ne kadar" veya "ödeme fiyatı" gibi fiyat soruları price'a düşmeli
  if (hasAny(messageNorm, KEYWORDS.intents.payment)) {
    // Fiyat sorgusu mu yoksa gerçek ödeme talebi mi?
    if (hasAny(messageNorm, ["ne kadar", "kac tl", "kac lira", "fiyat", "ucret"])) {
      // "kapıda ödeme ne kadar" → price intent
      if (!hasAny(messageNorm, ["yapacagim", "yapacağım", "olsun", "istiyorum", "yapicam", "yapıcam", "seciyorum", "seçiyorum"])) {
        return "price";
      }
    }
    return "payment";
  }

  // Zincir
  if (hasAny(messageNorm, KEYWORDS.intents.chain)) return "chain_question";

  // Fiyat — ama "kargo" + fiyat kelimesi birlikte geliyorsa → shipping_price
  if (hasAny(messageNorm, KEYWORDS.intents.price)) {
    if (messageNorm.includes("kargo")) return "shipping_price";
    return "price";
  }

  // Fotoğraf sorusu
  if (hasAny(messageNorm, KEYWORDS.intents.photoQuestion)) return "photo_question";

  // Arka yazı/foto sorusu (stage dışında) — INFO soruları DIRECT'ten önce kontrol edilmeli
  if (hasAny(messageNorm, KEYWORDS.intents.backTextInfo)) return "back_text_info";
  if (hasAny(messageNorm, KEYWORDS.intents.backPhotoInfo)) return "back_photo_info";
  if (hasAny(messageNorm, KEYWORDS.intents.backTextDirect)) return "back_text";

  // Örnek isteği
  if (hasAny(messageNorm, KEYWORDS.intents.exampleRequest)) return "example_request";

  // Detay isteği
  if (hasAny(messageNorm, KEYWORDS.intents.detailRequest)) return "detail_request";

  // Sipariş başlatma
  // Sipariş başlatma — ama "ama şuan değil", "henüz değil" gibi erteleme varsa tetikleme
  if (hasAny(messageNorm, KEYWORDS.intents.orderStart)) {
    if (hasAny(messageNorm, ["ama suan degil", "ama henuz degil", "ama simdi degil", "ama su an", "ama henuz", "sonra donus", "daha sonra", "dusunuyorum", "düşünüyorum"])) {
      return "general";
    }
    return "order_start";
  }

  // ═══ KATMAN 2: FLOW-AWARE INTENT'LER ═══

  // waiting_back_text stage'inde: kısa mesajlar arka yazı olarak yorumlanır
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
      ...KEYWORDS.intents.materialQuestion,
    ]);

    // Soru cümleleri arka yazı değil — "bu foto olur mu", "nasıl olur" vs.
    const isQuestion = /[?]/.test(raw) ||
      // Türkçe soru ekleri
      /\b(mi|mı|mu|mü|miyim|mıyım|musun|müsün|misiniz|mısınız|musunuz|müsünüz)\b/i.test(raw) ||
      hasAny(messageNorm, [
        "olur mu", "olurmu", "oluyor mu", "oluyormu",
        "yapilir mi", "yapılır mı", "yapar mi", "yapar mı",
        "nasil", "nasıl", "acaba", "nedir", "ne kadar",
        "bu foto", "bu fotograf", "bu fotoğraf",
        "uygun mu", "uygunmu",
        "alabilirim", "yapabilir",
        "gondereyim mi", "göndereyim mi", "atayim mi", "atayım mı",
        // FIX 4: Rica/niyet cümleleri → back_text değil
        "yaparsaniz", "yaparsanız", "sevinirim", "memnun olurum",
        "rica etsem", "rica ediyorum",
        // FIX 11: "Ne gibi yazı yazılır" → soru
        "ne gibi", "ne yazilir", "ne yazılır", "ne tarz", "ornek",
        // FIX 12: "Bu yapılır mı" / "bulamadim" → soru/bilgilendirme
        "bulamadim", "bulamadım", "tapilir", "yapilir",
        // FIX 15: arkalı önlü olur mu → soru  
        "arkali onlu", "arkalı önlü", "onlu arkali", "önlü arkalı",
        "iki taraf", "iki yuz", "iki yüz",
      ]);

    // Mesajda fiil/niyet kalıbı varsa back_text değil
    const hasIntentVerb = hasAny(messageNorm, [
      "istiyorum", "isterim", "olsun", "yapalim", "yapın", "yaparsaniz",
    ]) && raw.length > 15;

    if (raw && !blocked && !isQuestion && !hasIntentVerb && !looksLikePhotoUrl(message) && raw.length <= 80) {
      return "back_text";
    }
  }

  // Fotoğraf URL (ürün bağlamı olmadan da)
  if (looksLikePhotoUrl(message)) return "photo";

  // Smalltalk (keyword intent'lerden SONRA kontrol)
  if (hasAny(messageNorm, KEYWORDS.intents.smalltalk)) return "smalltalk";

  // ═══ KATMAN 3: ENTITY-BASED INTENT'LER (en düşük öncelik) ═══

  // FIX 10: "Şubeden alacağım" → adres yerine mağazadan teslim
  if (hasAny(messageNorm, ["subeden alacagim", "şubeden alacağım", "subeden alma", "şubeden alma", "subeden teslim", "şubeden teslim", "magazadan alacagim", "mağazadan alacağım"])) {
    return "store_pickup";
  }

  // Adres — sadece ilgili stage'lerde
  if (extracted.hasAddress && ["waiting_address", ""].includes(conversationStage)) return "address";

  // Telefon
  if (extracted.phone && ["waiting_address", ""].includes(conversationStage)) return "phone";

  // İsim — sadece waiting_address stage'inde
  if (extracted.hasName && conversationStage === "waiting_address") return "name_only";

  // Harfler — ataç ürünü
  if (detectedProduct === "atac" && extracted.letters) return "letters";

  return "general";
}

// ─── BUILD CONTEXT ──────────────────────────────────────────

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

  if (!previousProduct && entryProduct) detectedProduct = entryProduct;
  if (!previousProduct && !entryProduct && explicitProduct) detectedProduct = explicitProduct;

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
    detectedProduct = shouldKeepPreviousProduct ? previousProduct : explicitProduct;
  }

  if (!previousProduct && entryProduct && explicitProduct && entryProduct !== explicitProduct) {
    detectedProduct = isExplicitProductSwitch(messageNorm) ? explicitProduct : entryProduct;
  }

  const baseContext = {
    raw: body,
    message,
    messageNorm,
    previousProduct,
    conversationStage: conversation_stage,
    fields: {
      ilgilenilen_urun, user_product, entry_product: entryProduct,
      conversation_stage, photo_received, payment_method, menu_gosterildi,
      ai_reply, last_intent, order_status, back_text_status, address_status,
      support_mode, support_mode_reason, reply_class, siparis_alindi,
      cancel_reason, context_lock, letters_received, phone_received,
    },
    detectedProduct,
  };

  const extracted = extractEntities(baseContext);
  const detectedIntent = detectIntent(baseContext, extracted);

  return { ...baseContext, extracted, detectedIntent };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 5: STATE ENGINE (State Management & Step Resolver)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ───────────────────────────────────────

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
    support_mode_reason: f.support_mode_reason || "",
    reply_class: f.reply_class || "",
    cancel_reason: f.cancel_reason || "",
    context_lock: f.context_lock || "",
    siparis_alindi: truthy(f.siparis_alindi) ? "1" : "",
    letters_received: truthy(f.letters_received) ? "1" : "",
    phone_received: truthy(f.phone_received) ? "1" : "",
  };
}

function resetForProductSwitch(existing, newProduct) {
  return {
    conversation_stage: "", photo_received: "", payment_method: "",
    menu_gosterildi: existing.menu_gosterildi || "",
    order_status: "started", back_text_status: "", address_status: "",
    support_mode: "", support_mode_reason: "", reply_class: "",
    cancel_reason: "", context_lock: newProduct ? "1" : existing.context_lock || "",
    siparis_alindi: "", letters_received: "", phone_received: "",
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
    state.phone_received = "1";
  } else if (extracted.hasAddress && !state.address_status) {
    state.address_status = "address_only";
  } else if (extracted.hasAddress && state.address_status === "address_only") {
    // Yeni adres geldi ama hâlâ telefon yok — address_only kalır
    state.address_status = "address_only";
  } else if (state.address_status === "address_only" && extracted.phone) {
    state.address_status = "received";
    state.phone_received = "1";
  }

  // FIX 5: Şubeden alacağım → adres alınmış sayılır (mağazadan teslim)
  if (detectedIntent === "store_pickup") {
    state.address_status = "received";
  }

  if (detectedIntent === "cancel_order") {
    state.cancel_reason = context.message || "cancel_requested";
    state.support_mode = "1";
    state.support_mode_reason = SUPPORT_MODE_REASON.MANUAL_CANCEL;
    state.reply_class = REPLY_CLASS.FALLBACK;
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

// ─── REPLY HELPERS ──────────────────────────────────────────

function shouldShowMainMenu(context, state) {
  if (state.product) return false;
  if (truthy(state.context_lock)) return false;
  if (state.order_status === "cancel_requested") return false;
  return ["general", "unknown", "price", "payment", "order_start", "address", "detail_request"].includes(context.detectedIntent);
}

function isFreshProductSelection(context, state) {
  const stage = context.fields.conversation_stage || "";
  return (
    !!context.detectedProduct && !context.previousProduct &&
    !state.photo_received && !state.letters_received &&
    !state.payment_method && !state.address_status && !state.back_text_status &&
    (!stage || stage === "waiting_product")
  );
}

function getActiveProduct(context, state) {
  return (
    state?.product || context?.fields?.ilgilenilen_urun || context?.fields?.user_product ||
    context?.fields?.entry_product || context?.previousProduct || context?.detectedProduct || ""
  );
}

function firstReply(...replies) {
  for (const r of replies) {
    if (r && r.text) return r;
  }
  return emptyReply();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 6A: SIDE QUESTION HANDLERS (Yan Soru Cevapları)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ────────────────────────────────────────

function handleLocationIntent(context) {
  if (context.detectedIntent !== "location") return emptyReply();
  return makeReply("Eminönü İstanbul'dayız 😊", REPLY_CLASS.FIXED_INFO);
}

function handleShippingIntent(context) {
  const { detectedIntent, messageNorm } = context;

  if (detectedIntent === "shipping_price") {
    return makeReply("Kargo ücreti fiyata dahildir efendim 😊 Ekstra bir ücret ödemezsiniz.", REPLY_CLASS.FIXED_INFO);
  }

  if (detectedIntent === "shipping") {
    // Kargo takip, şikayet, sipariş durumu → fallback (satıcıya ait)
    if (hasAny(messageNorm, [
      "kargom nerede", "takip no", "takip numarasi", "takip numarası",
      "kargoya verildi mi",
      "yola cikti mi", "yola çıktı mı",
      "kargom gelmedi", "urun gelmedi", "ürün gelmedi",
      "kargo numarasi", "kargo numarası",
    ])) {
      return makeReply(
        FALLBACK_TEXT,
        REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED
      );
    }

    // FIX 7: Hangi kargo → PTT
    if (hasAny(messageNorm, ["hangi kargo", "kargo firmasi", "kargo şirketi"])) {
      return makeReply("PTT Kargo ile gönderim yapıyoruz efendim 😊", REPLY_CLASS.FIXED_INFO);
    }

    // FIX 14: Kargo parası/ücreti var mı → dahil
    if (hasAny(messageNorm, ["kargo parasi", "kargo parasI", "kargo var mi"])) {
      return makeReply("Kargo ücreti fiyata dahildir efendim 😊 Ekstra bir ücret ödemezsiniz.", REPLY_CLASS.FIXED_INFO);
    }
    return makeReply(SHIPPING_TIME_FALLBACK_TEXT, REPLY_CLASS.FIXED_INFO);
  }

  return emptyReply();
}

function handleTrustIntent(context) {
  const { detectedIntent, messageNorm } = context;
  if (detectedIntent !== "trust") return emptyReply();

  if (hasAny(messageNorm, ["kaplama", "kaplamasi atar", "kaplaması atar"])) {
    return makeReply("Kaplama atmaz efendim 😊 Günlük kullanımda rahatlıkla kullanabilirsiniz.", REPLY_CLASS.FIXED_INFO);
  }

  if (hasAny(messageNorm, ["kararma", "kararir", "solar", "solma", "paslan", "karar ma", "soluyor", "renk bozul"])) {
    return makeReply("Kararma, solma veya paslanma yapmaz efendim 😊 Günlük kullanımda rahatlıkla kullanabilirsiniz.", REPLY_CLASS.FIXED_INFO);
  }

  if (messageNorm.includes("garanti")) {
    return makeReply("Kararma, solma veya kaplama kaynaklı bir durumda destek sağlıyoruz efendim 😊", REPLY_CLASS.FIXED_INFO);
  }

  return makeReply("Güvenle sipariş verebilirsiniz efendim 😊", REPLY_CLASS.FIXED_INFO);
}

/**
 * YENİ: Malzeme sorusu handler'ı
 */
function handleMaterialQuestion(context) {
  if (context.detectedIntent !== "material_question") return emptyReply();
  const { messageNorm } = context;

  // FIX 4: Alerji sorusu — tam cevap
  if (hasAny(messageNorm, ["alerji", "alerjim", "alerjik"])) {
    return makeReply("Paslanmaz çelikten üretilmektedir efendim 😊 Kararma, solma yapmaz. Alerji konusunda da risk oluşturacak bir malzeme kullanmıyoruz.", REPLY_CLASS.FIXED_INFO);
  }

  return makeReply("Evet efendim, paslanmaz çelikten üretiliyor 😊 Kararma, solma veya paslanma yapmaz.", REPLY_CLASS.FIXED_INFO);
}

/**
 * YENİ: Post-sale handler
 */
function handlePostSaleIntent(context) {
  if (context.detectedIntent !== "post_sale") return emptyReply();
  return makeReply(
    "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊",
    REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED
  );
}

/**
 * YENİ: Yeni sipariş talebi handler
 */
function handleNewOrderIntent(context, state) {
  if (context.detectedIntent !== "new_order") return emptyReply();
  // Satıcıya yönlendir — yeni sipariş akışı mevcut state'te karışıklık yaratır
  return makeReply(
    "Tabi efendim 😊 Yeni sipariş için ekibimiz size yardımcı olacaktır.",
    REPLY_CLASS.SELLER_REQUIRED, SUPPORT_MODE_REASON.SELLER_REQUIRED
  );
}

/**
 * YENİ: Örnek isteği handler
 */
function handleExampleRequest(context) {
  if (context.detectedIntent !== "example_request") return emptyReply();
  return makeReply(
    "Tabi efendim, hemen atalım size örnekleri 😊",
    REPLY_CLASS.SELLER_REQUIRED, SUPPORT_MODE_REASON.SELLER_REQUIRED
  );
}

/**
 * YENİ: Detay isteği handler
 */
function handleDetailRequest(context, state) {
  if (context.detectedIntent !== "detail_request") return emptyReply();
  if (!state.product) {
    return makeReply(MAIN_MENU_TEXT, REPLY_CLASS.MENU);
  }
  if (state.product === "lazer") {
    return makeReply(LASER_PRICE_TEXT, REPLY_CLASS.PRODUCT_ENTRY);
  }
  if (state.product === "atac") {
    return makeReply(ATAC_PRICE_TEXT, REPLY_CLASS.PRODUCT_ENTRY);
  }
  return emptyReply();
}

function handleChainIntent(context) {
  const { detectedIntent, detectedProduct, messageNorm } = context;
  if (detectedIntent !== "chain_question") return emptyReply();

  // Plaka boyutu sorusu — "boyutu ne kadar", "kac cm" (zincir kelimesi olmadan)
  if (hasAny(messageNorm, ["boyutu ne kadar", "plaka boyut", "plaka kac cm"])) {
    return makeReply("Ürün plaka boyutu 3 cm'dir efendim 😊", REPLY_CLASS.FIXED_INFO);
  }

  // Zincir dahil mi
  if (hasAny(messageNorm, ["zincir dahil", "zincir dayil"])) {
    return makeReply("Evet efendim, zincir dahildir 😊", REPLY_CLASS.FIXED_INFO);
  }

  if (detectedProduct === "lazer") {
    if (hasAny(messageNorm, ["zincir boyu", "zincir uzunlugu", "zincir uzunluğu", "uzunlugu ne kadar", "uzunluğu ne kadar", "zincir kac cm", "zincir kaç cm", "zincir kisalir", "zincir kısalır", "boyu ne kadar", "kac santim", "kaç santım", "kac santım"])) {
      return makeReply("Zincir uzunluğu standart olarak 60 cm'dir efendim 😊", REPLY_CLASS.FIXED_INFO);
    }
    return makeReply(
      "Zincir modeliyle ilgili detay için ekibimize görsel üzerinden net bilgi verelim 😊",
      REPLY_CLASS.SELLER_REQUIRED, SUPPORT_MODE_REASON.SELLER_REQUIRED
    );
  }

  if (detectedProduct === "atac") {
    if (hasAny(messageNorm, ["zincir boyu", "zincir uzunlugu", "zincir uzunluğu", "uzunlugu ne kadar", "uzunluğu ne kadar", "zincir kac cm", "zincir kaç cm", "boyu ne kadar"])) {
      return makeReply("Standart zincir 50 cm'dir efendim 😊", REPLY_CLASS.FIXED_INFO);
    }
    return makeReply("Bu üründe tek zincir modeli kullanılıyor efendim 😊", REPLY_CLASS.FIXED_INFO);
  }

  return makeReply(FALLBACK_TEXT, REPLY_CLASS.FALLBACK, SUPPORT_MODE_REASON.TRUE_FALLBACK);
}

function handlePhotoQuestionIntent(context, state) {
  if (context.detectedIntent !== "photo_question") return emptyReply();
  const activeProduct = getActiveProduct(context, state);

  if (activeProduct === "atac") {
    return makeReply("Ataç kolyede fotoğraf gerekmiyor efendim 😊 İsterseniz harfleri yazabilirsiniz.", REPLY_CLASS.FIXED_INFO);
  }
  if (activeProduct === "lazer") {
    return makeReply("Buradan direkt gönderebilirsiniz efendim 😊 Siz gönderin, biz hemen kontrol edelim.", REPLY_CLASS.FIXED_INFO);
  }
  return emptyReply();
}

function handleBackSideInfoIntent(context, state) {
  const activeProduct = getActiveProduct(context, state);
  const { detectedIntent } = context;

  if (!["back_text_info", "back_photo_info", "back_photo_price"].includes(detectedIntent)) return emptyReply();

  if (activeProduct === "atac") {
    return makeReply("Bu özellik resimli lazer kolye için geçerlidir efendim 😊", REPLY_CLASS.FIXED_INFO);
  }
  if (activeProduct !== "lazer") return emptyReply();

  if (detectedIntent === "back_photo_price") {
    return makeReply("Ek ücret olmuyor efendim 😊", REPLY_CLASS.FIXED_INFO);
  }
  if (detectedIntent === "back_photo_info") {
    return makeReply("Evet efendim 😊 Ön yüze bir fotoğraf, arka yüze de ikinci bir fotoğraf ekleyebiliyoruz. Ek ücret de olmuyor.", REPLY_CLASS.FIXED_INFO);
  }
  if (detectedIntent === "back_text_info") {
    return makeReply("Evet efendim 😊 Resimli lazer kolyede arka yüzüne yazı veya istenirse ikinci bir fotoğraf eklenebiliyor.", REPLY_CLASS.FIXED_INFO);
  }
  return emptyReply();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 6B: FLOW HANDLERS (Sipariş Akış Yöneticileri)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ──────────────────────────────────────────

function handleLaserFlow(context, state, nextStage) {
  const { detectedProduct, detectedIntent } = context;
  if (detectedProduct !== "lazer") return emptyReply();

  if (detectedIntent === "photo_suitability_question") {
    return makeReply("Gönderdiğiniz fotoğrafı kontrol edip size bilgi verelim efendim 😊", REPLY_CLASS.FLOW_PROGRESS);
  }
  if (detectedIntent === "back_photo_already_sent") {
    return makeReply("Tabi efendim, fotoğraflarınız ulaştı 😊", REPLY_CLASS.FLOW_PROGRESS);
  }
  if (detectedIntent === "back_text_examples") {
    return makeReply("Genelde isim, tarih, kısa bir not veya dua yazılıyor efendim 😊", REPLY_CLASS.FIXED_INFO);
  }

  // FIX 1: Ürün/kolye fotoğrafı referansı — müşteri fotoğrafı DEĞİL, photo_received set edilmez
  if (detectedIntent === "product_image_reference") {
    return makeReply(
      "Tabi efendim, bu modeli not aldım 😊 Şimdi kolyeye basılacak kendi fotoğrafınızı buradan gönderebilirsiniz.",
      REPLY_CLASS.FLOW_PROGRESS
    );
  }

  if (detectedIntent === "photo") {
    if (state.order_status === "completed" || nextStage === "order_completed") {
      return makeReply(
        "Sipariş bilgileri tamamlandığı için fotoğraf değişikliği talebinizi ekibimize yönlendirelim efendim 😊",
        REPLY_CLASS.SELLER_REQUIRED, SUPPORT_MODE_REASON.SELLER_REQUIRED
      );
    }

    // Arka yazı/foto zaten alındıysa veya skip edildiyse tekrar sorma
    if (state.back_text_status === "received" || state.back_text_status === "skipped") {
      // Bu ikinci bir foto (arka foto veya değişiklik) — onay ver, ödeme aşamasına devam et
      if (!state.payment_method) {
        return makeReply(
          "Fotoğrafınızı aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.",
          REPLY_CLASS.FLOW_PROGRESS
        );
      }
      if (state.address_status !== "received") {
        return makeReply(
          `Fotoğrafınızı aldım efendim 😊\n\n${ORDER_DETAILS_TEXT}`,
          REPLY_CLASS.FLOW_PROGRESS
        );
      }
      return makeReply("Fotoğrafınızı aldım efendim 😊", REPLY_CLASS.FLOW_PROGRESS);
    }

    return makeReply(
      "Fotoğrafınız alındı efendim, uygun görülmezse ekibimiz size dönüş yapacaktır 😊 Arka yüzüne yazı eklemek ister misiniz? İsterseniz yazıyı buradan iletebilirsiniz, istemezseniz 'yok' yazabilirsiniz.",
      REPLY_CLASS.FLOW_PROGRESS
    );
  }

  if (detectedIntent === "back_text_skip" && nextStage === "waiting_payment") {
    if (state.payment_method === "eft_havale") {
      return makeReply(`Tamam efendim 😊 Arka yüz boş kalacak.\n\n${EFT_INFO_TEXT}\n\n${ORDER_DETAILS_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
    }
    if (state.payment_method === "kapida_odeme") {
      return makeReply(`Tamam efendim 😊 Arka yüz boş kalacak.\n\n${ORDER_DETAILS_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
    }
    return makeReply("Tamam efendim 😊 Arka yüz boş kalacak. Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.", REPLY_CLASS.FLOW_PROGRESS);
  }

  if (detectedIntent === "back_text" && nextStage === "waiting_payment") {
    if (state.payment_method === "eft_havale") {
      return makeReply(`Not aldım efendim 😊 EFT / Havale ile ilerleyebiliriz.\n\n${EFT_INFO_TEXT}\n\n${ORDER_DETAILS_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
    }
    if (state.payment_method === "kapida_odeme") {
      return makeReply(`Not aldım efendim 😊 Kapıda ödeme ile ilerleyebiliriz.\n\n${ORDER_DETAILS_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
    }
    return makeReply("Not aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.", REPLY_CLASS.FLOW_PROGRESS);
  }

  return emptyReply();
}

function handleAtacFlow(context, state, nextStage) {
  const { detectedProduct, detectedIntent } = context;
  if (detectedProduct !== "atac") return emptyReply();

  if (detectedIntent === "letters" && nextStage === "waiting_payment") {
    if (state.payment_method === "eft_havale") {
      return makeReply(`Harflerinizi aldım efendim 😊 EFT / Havale ile ilerleyebiliriz.\n\n${EFT_INFO_TEXT}\n\n${ORDER_DETAILS_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
    }
    if (state.payment_method === "kapida_odeme") {
      return makeReply(`Harflerinizi aldım efendim 😊 Kapıda ödeme ile ilerleyebiliriz.\n\n${ORDER_DETAILS_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
    }
    return makeReply("Harflerinizi aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.", REPLY_CLASS.FLOW_PROGRESS);
  }

  return emptyReply();
}

function handlePaymentFlow(context, state, nextStage) {
  const { detectedIntent, detectedProduct, messageNorm } = context;
  if (detectedIntent !== "payment") return emptyReply();

  // FIX 2: Kapıda kredi kartı yok — sadece nakit
  if (hasAny(messageNorm, ["kartla", "kart ile", "kredi karti", "kredi kartı", "banka karti", "banka kartı"])) {
    return makeReply("Kapıda ödeme sadece nakit olarak alınmaktadır efendim 😊 EFT / Havale veya kapıda nakit ödeme ile ilerleyebiliriz.", REPLY_CLASS.FIXED_INFO);
  }

  if (messageNorm.includes("dekont") || messageNorm.includes("aciklama") || messageNorm.includes("açıklama")) {
    if (messageNorm.includes("dekont")) {
      return makeReply("Tabi efendim, iletebilirsiniz 😊", REPLY_CLASS.FIXED_INFO);
    }
    return makeReply("Açıklama yazmanıza gerek yok efendim 😊", REPLY_CLASS.FIXED_INFO);
  }

  // IBAN isteği
  if (messageNorm.includes("iban")) {
    return makeReply(`Tabi efendim 😊\n\n${EFT_INFO_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
  }

  if (hasAny(messageNorm, ["eft attim", "havale yaptim", "odeme yaptim", "ödeme yaptım"])) {
    return makeReply(
      "Teşekkür ederiz efendim, ekibimiz kontrol edip size dönüş sağlayacaktır 😊",
      REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED
    );
  }

  if (!detectedProduct && nextStage === "waiting_product") {
    return makeReply(
      "Ödeme yöntemimiz EFT / Havale veya kapıda ödeme şeklindedir efendim 😊 Önce hangi model ile ilgilendiğinizi yazabilir misiniz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye",
      REPLY_CLASS.MENU
    );
  }

  // ERKEN ÖDEME: Fotoğraf henüz gelmemişken ödeme gelirse → kaydet, foto istemeye devam et
  if (detectedProduct === "lazer" && nextStage === "waiting_photo") {
    if (state.payment_method === "eft_havale") {
      return makeReply(`EFT / Havale ile ilerleyebiliriz efendim 😊 Önce fotoğrafınızı buradan gönderebilirsiniz.\n\n${EFT_INFO_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
    }
    if (state.payment_method === "kapida_odeme") {
      return makeReply("Kapıda ödeme ile ilerleyebiliriz efendim 😊 Önce fotoğrafınızı buradan gönderebilirsiniz.", REPLY_CLASS.FLOW_PROGRESS);
    }
  }

  if (detectedProduct === "lazer" && nextStage === "waiting_back_text") {
    return makeReply("Ödeme aşamasına geçmeden önce arka yüz için yazı isteyip istemediğinizi iletebilir misiniz? İstemiyorsanız 'yok' yazabilirsiniz 😊", REPLY_CLASS.FLOW_PROGRESS);
  }

  if (detectedProduct === "atac" && !truthy(state.letters_received)) {
    if (state.payment_method === "eft_havale") {
      return makeReply(`EFT / Havale ile ilerleyebiliriz 😊 Önce istediğiniz harfleri yazabilirsiniz.\n\n${EFT_INFO_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
    }
    if (state.payment_method === "kapida_odeme") {
      return makeReply("Kapıda ödeme ile ilerleyebiliriz efendim 😊 Önce istediğiniz harfleri yazabilirsiniz.", REPLY_CLASS.FLOW_PROGRESS);
    }
  }

  if (state.address_status !== "received") {
    if (state.payment_method === "eft_havale") {
      return makeReply(`EFT / Havale için ödeme bilgilerimiz şu şekildedir 😊\n\n${EFT_INFO_TEXT}\n\n${ORDER_DETAILS_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
    }
    if (state.payment_method === "kapida_odeme") {
      return makeReply(`Kapıda ödeme ile ilerleyebiliriz efendim 😊\n\n${ORDER_DETAILS_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
    }
  }

  // Adres zaten alınmışsa tekrar adres isteme — sadece ödeme onayla
  if (state.address_status === "received") {
    if (state.payment_method === "eft_havale") {
      return makeReply(`EFT / Havale ile ilerleyebiliriz efendim 😊\n\n${EFT_INFO_TEXT}`, REPLY_CLASS.FLOW_PROGRESS);
    }
    if (state.payment_method === "kapida_odeme") {
      return makeReply("Kapıda ödeme ile ilerleyebiliriz efendim 😊", REPLY_CLASS.FLOW_PROGRESS);
    }
  }

  return emptyReply();
}

function handleAddressFlow(context, state, nextStage) {
  const { detectedIntent } = context;

  // FIX 10: Şubeden alacağım → adres alındı, isim+tel iste
  if (detectedIntent === "store_pickup") {
    if (!truthy(state.phone_received)) {
      return makeReply("Tabi efendim, şubemizden teslim alabilirsiniz 😊 Ad soyad ve cep telefonu numaranızı paylaşabilir misiniz?", REPLY_CLASS.FLOW_PROGRESS);
    }
    return makeReply("Tabi efendim, şubemizden teslim alabilirsiniz 😊", REPLY_CLASS.FLOW_PROGRESS);
  }

  // FIX 6: Sipariş tamamlandıysa adres/isim soruları flow_progress dönmemeli
  if (state.order_status === "completed" || truthy(state.siparis_alindi)) {
    return emptyReply();
  }

  if (detectedIntent === "name_only") {
    if (nextStage === "waiting_address") {
      if (!truthy(state.phone_received)) {
        return makeReply("Ad soyad bilginizi aldım efendim 😊\n\n📌 Şimdi kalan bilgileri paylaşabilir misiniz?\n\n📱 Cep telefonu\n📍 Açık adres", REPLY_CLASS.FLOW_PROGRESS);
      }
      return makeReply("Ad soyad bilginizi aldım efendim 😊\n\n📍 Şimdi açık adresinizi paylaşabilir misiniz?", REPLY_CLASS.FLOW_PROGRESS);
    }
  }

  if (detectedIntent === "phone") {
    if (nextStage === "order_completed") {


      return makeReply("Telefon numaranızı da aldım efendim 😊 Siparişiniz tamamlanmıştır, ekibimiz en kısa sürede ürününüzü üretmeye başlayacaktır 😊", REPLY_CLASS.ORDER_COMPLETE);
    }
    if (!state.payment_method) {
      return makeReply("Telefon numaranızı da aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.", REPLY_CLASS.FLOW_PROGRESS);
    }
    return makeReply("Telefon numaranızı da aldım efendim 😊\n\n📍 Şimdi açık adresinizi yazabilirsiniz. (İl, ilçe, mahalle, sokak)", REPLY_CLASS.FLOW_PROGRESS);
  }

  if (detectedIntent === "address") {
    if (state.address_status === "address_only" && !truthy(state.phone_received)) {
      return makeReply("Adres bilginizi aldım efendim 😊\n\n📌 Siparişi tamamlayabilmemiz için cep telefonu numaranızı da paylaşabilir misiniz? 📱", REPLY_CLASS.FLOW_PROGRESS);
    }
    if (nextStage === "order_completed") {
      return makeReply("Adres bilginizi de aldım efendim 😊 Siparişiniz tamamlanmıştır, ekibimiz en kısa sürede ürününüzü üretmeye başlayacaktır 😊", REPLY_CLASS.ORDER_COMPLETE);
    }
  }

  return emptyReply();
}

function handleOrderStart(context, state, nextStage) {
  if (context.detectedIntent !== "order_start") return emptyReply();

  if (!context.detectedProduct) {
    return makeReply(MAIN_MENU_TEXT, REPLY_CLASS.MENU);
  }
  if (context.detectedProduct === "lazer") {
    if (nextStage === "waiting_photo" || !truthy(state.photo_received)) {
      return makeReply(LASER_PRICE_TEXT, REPLY_CLASS.PRODUCT_ENTRY);
    }
  }
  if (context.detectedProduct === "atac") {
    if (nextStage === "waiting_letters" || !truthy(state.letters_received)) {
      return makeReply(ATAC_PRICE_TEXT, REPLY_CLASS.PRODUCT_ENTRY);
    }
  }
  return emptyReply();
}

/**
 * *** YENİDEN YAZILDI ***
 * Sipariş tamamlandıktan sonra gelen yan sorulara cevap veriyor.
 * Artık her şeye "sipariş tamamlandı" demek yerine, müşterinin sorusuna uygun cevap verilir.
 */
function handleCompletionFlow(context, state, nextStage) {
  if (nextStage !== "order_completed") return emptyReply();

  const { detectedIntent } = context;

  // Sipariş zaten tamamlandıysa (state'te completed) ve yeni bir mesaj geliyorsa
  // → "sipariş tamamlandı" mesajını TEKRAR basma
  if (state.order_status === "completed" || truthy(state.siparis_alindi)) {
    // Bu noktada sipariş zaten tamamlanmış. Müşterinin yeni mesajına
    // deterministik handler'lar cevap veremedi, model'e gönder.
    return emptyReply();
  }

  // İlk kez order_completed'a geçiş — sipariş bilgileri YENİ tamamlandı
  return makeReply(
    "Siparişiniz tamamlanmıştır, ekibimiz en kısa sürede ürününüzü üretmeye başlayacaktır 😊",
    REPLY_CLASS.ORDER_COMPLETE
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BÖLÜM 7: ORCHESTRATOR (Deterministic Reply Builder & Main Processor)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ REPLY BUILDER ───────────────────────

/**
 * Fiyat sorusu handler — ürün bağlamına göre fiyat verir.
 * Ataçta harf sayısı biliniyorsa dinamik fiyat hesaplar.
 */
function handlePriceIntent(context, state) {
  if (context.detectedIntent !== "price") return emptyReply();

  // Ürün seçilmemişse → menü
  if (!state.product) {
    return makeReply(
      "Hemen yardımcı olayım efendim 😊\nHangi ürün için fiyat istersiniz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye",
      REPLY_CLASS.MENU
    );
  }

  if (state.product === "lazer") {
    return makeReply("EFT / havale fiyatımız 599 TL, kapıda ödeme fiyatımız 649 TL'dir efendim 😊", REPLY_CLASS.FIXED_INFO);
  }

  if (state.product === "atac") {
    if (truthy(state.letters_received) && context.extracted?.letters) {
      const letterCount = context.extracted.letters.replace(/\s+/g, "").length;
      if (letterCount > 3) {
        const extra = (letterCount - 3) * 50;
        return makeReply(`${letterCount} harf için EFT / havale fiyatımız ${499 + extra} TL, kapıda ödeme fiyatımız ${549 + extra} TL'dir efendim 😊`, REPLY_CLASS.FIXED_INFO);
      }
    }
    return makeReply("EFT / havale fiyatımız 499 TL, kapıda ödeme fiyatımız 549 TL'dir efendim 😊 3 harfe kadar standarttır, her ek harf +50 TL'dir.", REPLY_CLASS.FIXED_INFO);
  }

  return emptyReply();
}

/**
 * Sipariş tamamlandıktan sonra gelen ödeme soruları (dekont, IBAN, ödeme yaptım).
 */
function handlePostCompletionPayment(context, state) {
  const { detectedIntent, messageNorm } = context;
  if (detectedIntent !== "payment") return emptyReply();
  if (state.order_status !== "completed" && getNextStage(state) !== "order_completed") return emptyReply();

  if (messageNorm.includes("dekont")) return makeReply("Tabi efendim, iletebilirsiniz 😊", REPLY_CLASS.FIXED_INFO);
  if (messageNorm.includes("aciklama") || messageNorm.includes("açıklama")) return makeReply("Açıklama yazmanıza gerek yok efendim 😊", REPLY_CLASS.FIXED_INFO);
  if (messageNorm.includes("iban")) return makeReply(`Tabi efendim 😊\n\n${EFT_INFO_TEXT}`, REPLY_CLASS.FIXED_INFO);

  if (hasAny(messageNorm, ["eft attim", "havale yaptim", "odeme yaptim", "ödeme yaptım", "odemeyi yaptim", "ödemeyi yaptım", "ucretini yollarim", "ücretini yollarım"])) {
    return makeReply("Teşekkür ederiz efendim, ekibimiz kontrol edip size dönüş sağlayacaktır 😊", REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED);
  }

  return makeReply("Ödeme ile ilgili ekibimiz size yardımcı olacaktır efendim 😊", REPLY_CLASS.SELLER_REQUIRED, SUPPORT_MODE_REASON.SELLER_REQUIRED);
}

/**
 * Smalltalk handler — selamlama, teşekkür, dua, beğeni cevapları.
 */
function handleSmalltalkIntent(context) {
  if (context.detectedIntent !== "smalltalk") return emptyReply();
  const { messageNorm } = context;

  // Müşteri SANA taziye/dua diyor
  if (hasAny(messageNorm, ["basiniz sagolsun", "basiniz sag olsun", "hakkinizi helal", "allah yardimciniz"])) {
    return makeReply("Çok teşekkür ederiz efendim 😊", REPLY_CLASS.FIXED_INFO);
  }
  if (hasAny(messageNorm, ["insallah", "inşallah", "allah razi olsun", "hayirli isler", "bol kazanclar", "amin", "masallah", "eyvallah"])) {
    return makeReply("Amin, çok teşekkür ederiz efendim 😊", REPLY_CLASS.FIXED_INFO);
  }
  if (hasAny(messageNorm, ["tesekkur", "teşekkür", "sagolun", "sağolun", "saol", "tsk", "tşk"])) {
    return makeReply("Rica ederiz efendim 😊", REPLY_CLASS.FIXED_INFO);
  }
  if (hasAny(messageNorm, ["begendim", "beğendim", "begendik", "beğendik", "guzel", "güzel", "super", "süper", "harika", "saglik", "sağlık"])) {
    return makeReply("Çok teşekkür ederiz efendim 😊", REPLY_CLASS.FIXED_INFO);
  }
  if (hasAny(messageNorm, ["merhaba", "selam", "slm", "mrb", "merhabalar"])) {
    return makeReply("Merhaba, hoş geldiniz 😊", REPLY_CLASS.FIXED_INFO);
  }
  return makeReply("Tabi efendim 😊", REPLY_CLASS.FIXED_INFO);
}

/**
 * Deterministik cevap üretici — orchestrator.
 * Sırayla: menü → yan soru handler'lar → fiyat → ödeme sonrası → smalltalk → ürün seçimi → akış handler'lar → completion
 */
function buildDeterministicReply(context, state) {
  const { detectedProduct, detectedIntent, messageNorm } = context;
  const nextStage = getNextStage(state);

  // ═══ ORDER COMPLETED GUARD (YENİ KNOWLEDGE KURALLARINA GÖRE) ═══
  // Sipariş tamamlandıysa, mesajları post-sale olarak değerlendir
  // SADECE: smalltalk, trust, material, price, location, shipping_price, new_order, post_sale geçebilir
  // GERİSİ: post-sale guard'a takılır
  const isOrderCompleted = state.order_status === "completed" || truthy(state.siparis_alindi);
  if (isOrderCompleted && state.conversation_stage === "order_completed") {

    // 1. Açık yeni sipariş niyeti → new_order handler'a bırak
    if (detectedIntent === "new_order") {
      // Handler'a düşsün
    }
    // 2. Smalltalk (teşekkür, memnuniyet, selam, dua) → normal handler'a bırak
    else if (detectedIntent === "smalltalk") {
      // Handler'a düşsün
    }
    // 3. Trust / Material / Price / Location / Chain / Shipping Price → side question, normal handler
    else if (["trust", "material_question", "price", "location", "chain_question", "shipping_price"].includes(detectedIntent)) {
      // Handler'a düşsün
    }
    // 4. POST-SALE KARGO: kişisel takip → ekibe yönlendir, genel bilgi → shipping handler'a bırak
    else if (detectedIntent === "shipping") {
      // Kişisel kargo takibi → post-sale
      if (hasAny(messageNorm, ["kargom", "siparisim", "siparişim", "gelmedi", "ulasmadi", "ulaşmadı",
        "verildi mi", "yola cikti", "mesaj gelmedi", "msj gelmedi", "teslim olmadi",
        "kargo mesaji", "kargoya verilmis", "kargoya verilmiş", "dagitimda", "dağıtımda"])) {
        return makeReply(
          "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊",
          REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED
        );
      }
      // Genel kargo bilgisi sorusu (kaç günde gelir vb.) → normal shipping handler'a bırak
    }
    else if (detectedIntent === "post_sale") {
      return makeReply(
        "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊",
        REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED
      );
    }
    // 5. Payment (completed sonrası) → normal handler'a bırak (IBAN verme vb.)
    else if (detectedIntent === "payment") {
      // handlePostCompletionPayment'a düşsün
    }
    // 6. Şikayet / memnuniyetsizlik keyword'leri
    else if (hasAny(messageNorm, [
      "memnun kalmadim", "memnun kalmadım",
      "istedigim gibi degil", "istediğim gibi değil",
      "yanlis olmus", "yanlış olmuş", "yanlis", "yanlış",
      "sikayet", "şikayet", "sikayetim", "şikayetim",
      "begenmedi", "beğenmedi", "begenmedim", "beğenmedim",
      "dikkate alinmamis", "dikkate alınmamış",
      "ilginiz sifir", "ilginiz sıfır",
      "alakasi yok", "alakası yok",
      "kotu", "kötü", "berbat",
      "fakat", "siparisimle", "siparişimle",
    ])) {
      return makeReply(
        "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
        REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED
      );
    }
    // 7. Kısa onay / bekleme mesajları → fallback'e düşürme, kısa nötr cevap ver
    else if (hasAny(messageNorm, ["tamam", "olur", "peki", "tamamdir", "anladim", "anladım"]) && messageNorm.length < 20) {
      return makeReply("Tabi efendim 😊", REPLY_CLASS.FIXED_INFO);
    }
    // 8. "Bekliyorum" variants
    else if (hasAny(messageNorm, ["bekliyorum", "haber bekliyorum", "donus bekliyorum", "dönüş bekliyorum", "cvp bekliyorum"])) {
      return makeReply("Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊", REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED);
    }
    // 9. Diğer tüm mesajlar → ekibe yönlendir (post-sale default)
    else {
      return makeReply(
        "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
        REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED
      );
    }
  }

  // ── 1. Menü gösterme kararı ──
  if (shouldShowMainMenu(context, state)) {
    return makeReply(MAIN_MENU_TEXT, REPLY_CLASS.MENU);
  }

  // ── 2. Her stage'de çalışan yan soru handler'ları ──
  const sideReply = firstReply(
    handleLocationIntent(context),
    handleShippingIntent(context),
    handleMaterialQuestion(context),
    handleTrustIntent(context),
    handleBackSideInfoIntent(context, state),
    handlePhotoQuestionIntent(context, state),
    handleChainIntent(context),
    handlePostSaleIntent(context),
    handleNewOrderIntent(context, state),
    handleExampleRequest(context),
    handleDetailRequest(context, state),
    handlePriceIntent(context, state),
    handlePostCompletionPayment(context, state),
    handleSmalltalkIntent(context),
  );
  if (sideReply.text) return sideReply;

  // ── 3. Ürün seçimi ──
  if (isFreshProductSelection(context, state)) {
    if (detectedProduct === "lazer") return makeReply(LASER_PRICE_TEXT, REPLY_CLASS.PRODUCT_ENTRY);
    if (detectedProduct === "atac") return makeReply(ATAC_PRICE_TEXT, REPLY_CLASS.PRODUCT_ENTRY);
  }

  // ── 4. Akış handler'ları ──
  const flowReply = firstReply(
    handleLaserFlow(context, state, nextStage),
    handleAtacFlow(context, state, nextStage),
    handlePaymentFlow(context, state, nextStage),
    handleAddressFlow(context, state, nextStage),
    handleOrderStart(context, state, nextStage),
    handleCompletionFlow(context, state, nextStage),
  );
  if (flowReply.text) return flowReply;

  // ── 5. Kısa onay mesajları — model'e düşürmeden stage'e uygun cevap ver ──
  const raw = String(context.message || "").trim();
  if (raw.length <= 12 && hasAny(messageNorm, ["tamam", "tamamdir", "tm", "tmm", "tmmm", "olur", "peki", "evet", "ok", "tamam dir"])) {
    const stage = state.conversation_stage || "";
    if (stage === "waiting_photo") {
      return makeReply("Fotoğrafı buradan gönderebilirsiniz efendim 😊", REPLY_CLASS.FALLBACK);
    }
    if (stage === "waiting_back_text") {
      return makeReply("Arka yüze yazı eklemek ister misiniz? İsterseniz yazıyı buradan iletebilirsiniz, istemezseniz \"yok\" yazabilirsiniz 😊", REPLY_CLASS.FALLBACK);
    }
    if (stage === "waiting_payment") {
      return makeReply("Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊", REPLY_CLASS.FALLBACK);
    }
    if (stage === "waiting_address") {
      return makeReply("Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊", REPLY_CLASS.FALLBACK);
    }
    return makeReply("Tabi efendim 😊", REPLY_CLASS.FALLBACK);
  }

  return emptyReply();
}

// ─── MODEL CALL ─────────────────────────────────────────────

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
- After laser photo, ask for back text preference before payment.
- ATAC order must always collect letters before payment.
  `.trim();

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

async function callModel(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || "deepseek-chat";
  const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1";

  if (!apiKey) throw new Error("API key missing.");

  const controller = new AbortController();
  const timeoutMs = Number(process.env.MODEL_TIMEOUT_MS || 9000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({ model, temperature: 0.2, max_tokens: 220, messages }),
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

// ─── STATE UPDATE ───────────────────────────────────────────

function buildStateUpdate(context, replyPayload, state) {
  const nextStage = getNextStage(state);
  const replyText = cleanReply(replyPayload.text || "");
  const menuShownNow = replyText === MAIN_MENU_TEXT || replyText.includes("Hangi model ile ilgileniyorsunuz?");

  let order_status = state.order_status || "";
  let siparis_alindi = state.siparis_alindi || "";
  let conversation_stage = nextStage || state.conversation_stage || context.fields.conversation_stage || "";
  let menu_gosterildi = state.menu_gosterildi || context.fields.menu_gosterildi || "";
  let support_mode = state.support_mode || "";
  let support_mode_reason = state.support_mode_reason || "";
  let reply_class = replyPayload.reply_class || state.reply_class || "";

  if (!replyText || replyText === FALLBACK_TEXT) {
    support_mode = "1";
    support_mode_reason = replyPayload.support_mode_reason || SUPPORT_MODE_REASON.TRUE_FALLBACK;
    reply_class = reply_class || REPLY_CLASS.FALLBACK;
  }

  if (replyPayload.support_mode_reason) {
    support_mode_reason = replyPayload.support_mode_reason;
    support_mode = "1";
  }

  if (menuShownNow) {
    menu_gosterildi = "evet";
    if (!state.product) conversation_stage = "waiting_product";
  }

  if (nextStage === "order_completed") {
    order_status = "completed";
    siparis_alindi = "1";
    reply_class = reply_class || REPLY_CLASS.ORDER_COMPLETE;
  } else if (!order_status && state.product) {
    order_status = "started";
  }

  if (nextStage === "human_support" || order_status === "cancel_requested") {
    conversation_stage = "human_support";
    order_status = "cancel_requested";
    support_mode = "1";
    support_mode_reason = support_mode_reason || SUPPORT_MODE_REASON.MANUAL_CANCEL;
    siparis_alindi = "";
    reply_class = reply_class || REPLY_CLASS.FALLBACK;
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
    support_mode_reason,
    reply_class,
    siparis_alindi,
    cancel_reason: state.cancel_reason || "",
    context_lock: state.context_lock || "",
    letters_received: state.letters_received || "",
    phone_received: state.phone_received || "",
  };
}

// ─── MAIN PROCESSOR ─────────────────────────────────────────

export async function processChat(body = {}, options = {}) {
  const context = buildContext(body);
  const state = applyFacts(context, getInitialState(context));

  let replyPayload = buildDeterministicReply(context, state);

  if (!replyPayload?.text) {
    const knowledgeMap = buildKnowledgeMap(context);
    const missingCriticalFiles = getMissingCriticalKnowledgeFiles(knowledgeMap);

    if (missingCriticalFiles.length > 0) {
      console.error("Knowledge safety guard triggered. Missing:", missingCriticalFiles);
      replyPayload = makeReply(FALLBACK_TEXT, REPLY_CLASS.FALLBACK, SUPPORT_MODE_REASON.TRUE_FALLBACK);
    } else {
      const knowledgePack = buildKnowledgePackFromMap(knowledgeMap);
      const messages = buildMessages(context, knowledgePack);

      try {
        replyPayload = makeReply(
          cleanReply(await callModel(messages)),
          REPLY_CLASS.FALLBACK, SUPPORT_MODE_REASON.NONE
        );
      } catch (error) {
        console.error("Model fallback error:", error.message);
        replyPayload = makeReply(FALLBACK_TEXT, REPLY_CLASS.FALLBACK, SUPPORT_MODE_REASON.TRUE_FALLBACK);
      }
    }
  }

  const stateUpdate = buildStateUpdate(context, replyPayload, state);
  const finalResult = { success: true, ...stateUpdate };

  await logConversationRow({ body, result: finalResult, options });
  return finalResult;
}

// ─── API HANDLER ────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ success: false, message: "Only POST supported." });
  }

  try {
    const result = await processChat(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    console.error("chat.js error:", error);
    return res.status(200).json({
      success: true,
      ai_reply: FALLBACK_TEXT,
      ilgilenilen_urun: "", user_product: "",
      last_intent: "error", conversation_stage: "",
      photo_received: "", payment_method: "",
      menu_gosterildi: "", order_status: "",
      back_text_status: "", address_status: "",
      support_mode: "1", support_mode_reason: SUPPORT_MODE_REASON.TRUE_FALLBACK,
      reply_class: REPLY_CLASS.FALLBACK,
      siparis_alindi: "", cancel_reason: "",
      context_lock: "", letters_received: "",
      phone_received: "",
      error: String(error.message || error),
    });
  }
}
