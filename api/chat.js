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
  "Resimli lazer kolye fiyatımız EFT / Havale ile 599 TL, kapıda ödeme ile 649 TL'dir efendim 😊 Siparişe devam etmek isterseniz fotoğrafı buradan gönderebilirsiniz.";

const ATAC_PRICE_TEXT =
  "Harfli ataç kolye fiyatımız EFT / Havale ile 499 TL, kapıda ödeme ile 549 TL'dir efendim 😊 Siparişe devam etmek isterseniz istediğiniz harfleri yazabilirsiniz.";

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
      "tesekkur", "teşekkür", "tesekkurler", "teşekkürler", "tsk", "tşk", "tesekurler", "teşekürler",
      "tesekur", "teşekür",
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
      "gecmis olsun", "geçmiş olsun", "cok gecmis olsun", "çok geçmiş olsun",
      "rica ederim", "rica ederiz",
      "liked a message", "reacted",
      "hos bulduk", "hoş bulduk", "hos buldum", "hoş buldum",
      "hayirli geceler", "hayırlı geceler",
      "allah sabir versin", "allah sabır versin",
    ],

    // ──── LOCATION ────
    location: ["yeriniz nerede", "yeriniz neresi", "yeriniz nerde", "neredesiniz", "konum", "magaza", "mağaza", "eminonu", "eminönü", "subeniz", "şubeniz", "subesi", "şubesi"],

    // ──── SHIPPING PRICE: genişletildi ────
    shippingPrice: [
      "kargo ucreti", "kargo ücreti",
      "kargo ucreti ne kadar", "kargo ücreti ne kadar",
      "kargo fiyati var mi", "kargo fiyatı var mı",
      "kargo fiyati", "kargo fiyatı",
      "kargo dahil mi", "kargo ücretli mi", "kargo ucretli mi",
      "kargo ucretlimi", "kargo ücretlimi",
      "kargo ucreti var mi", "kargo ücreti var mı",
      "kargo birlikte mi", "kargo ile birlikte mi",
      "kargo ucreti dahil mi", "kargo ücreti dahil mi",
      "kargo fiyata dahil", "kargo dahil",
      "kargo ucretsiz mi", "kargo ücretsiz mi",
      "kargo parasi", "kargo parasI", "kargo parası",
      "eve teslim", "kargo var mi", "kargo varmı", "kargo varmi",
      "fiyata dahil mi", "fiyata dahil",
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
      "suya dayanikli", "suya dayanıklı", "duşta", "dusta", "denizde", "denizte", "terle",
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
      "boyu ne kadar", "boyutu ne kadar", "boyutu nedir", "kac cm", "kaç cm",
      "kac santim", "kaç santım", "kac santım", "kaç santim",
      "zincir dahil", "zincir dayil",
    ],

    // ──── ORDER START ────
    orderStart: [
      "siparis vermek istiyorum", "sipariş vermek istiyorum",
      "siparis verecegim", "sipariş vereceğim",
      "siparis vercegiz", "sipariş vereceğiz", "siparis verecegiz",
      "nasil siparis", "nasıl sipariş", "nasil sipariş", "nasıl siparis",
      "siparis verebilir miyim", "sipariş verebilir miyim",
      "nasil siparis verebilirim", "nasıl sipariş verebilirim",
      "nasil siparis veriyoruz", "nasıl sipariş veriyoruz",
      "nasil yaptir", "nasıl yaptır",
      "almak istiyorum", "hazirlayalim", "hazırlayalım",
      "yaptirmak istiyorum", "yaptırmak istiyorum",
      "bende yaptirmak istiyorum", "ben de yaptırmak istiyorum",
      "satin alabilir miyim", "satın alabilir miyim",
      "urun satin alabilir miyim", "ürün satın alabilir miyim",
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
      // LOG-BASED: iki resim birleştirme / çift taraf varyantları
      "iki resim olur mu", "iki resim oluyor mu", "2 resim olur mu",
      "iki foto olur mu", "iki foto oluyor mu", "2 foto olur mu",
      "iki resim", "iki foto", "2 resim", "2 foto",
      "birlestir", "birleştir", "birlestirme", "birleştirme",
      "yan yana", "yanyana",
      "ayri ayri fotograf", "ayrı ayrı fotoğraf", "ayri ayri foto",
      "iki kisinin foto", "iki kişinin foto", "iki kisinin resim", "iki kişinin resim",
      "iki cocuk", "iki çocuk", "iki oglum", "iki oğlum",
      // Kaç kişi sığar
      "sigar mi", "sığar mı", "sigarmi", "sığarmı",
      "3 kisi", "3 kişi", "uc kisi", "üç kişi",
      "3 cocuk", "3 çocuk", "uc cocuk", "üç çocuk",
      "3 oglu", "3 oğlu",
      "3 lu fotograf", "3 lü fotoğraf", "uclu foto", "üçlü foto",
      "3 resim", "uc resim", "üç resim",
      // Production log'dan: iki kişi soruları
      "iki kisi oluyor mu", "iki kişi oluyor mu",
      "iki kisinin fotosu", "iki kişinin fotosu",
      "iki kisinin resmi", "iki kişinin resmi",
      "iki kisi olur mu", "iki kişi olur mu",
      "iki resmi birlestir", "iki resmi birleştir",
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
      "siparisim hazir mi", "siparişim hazır mı",
      "kargoya verildi mi",
      "yola cikti mi", "yola çıktı mı",
      // Sipariş değişikliği talepleri
      "fotografi degistirmek", "fotoğrafı değiştirmek",
      "arka yaziyi degistirmek", "arka yazıyı değiştirmek",
      "siparisi degistirmek", "siparişi değiştirmek",
      "degisiklik yapmak", "değişiklik yapmak",
      "degistirebilir miyim", "değiştirebilir miyim",
      // İletişim şikayeti
      "neden cevap vermiyorsunuz", "neden cevap vermiyor",
      "niye cevap vermiyor", "cevap vermiyorsunuz",
      "ulasami", "ulaşamı",
      "bakar misiniz", "bakar mısınız",
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
    detailRequest: ["detay", "detaylar", "bilgi alabilir", "bilgi istiyorum", "bilgi verir misiniz"],

    // ──── MATERIAL QUESTION — çelik mi vs ────
    materialQuestion: [
      "celik mi", "çelik mi", "celikmi", "çelikmi",
      "urun celik mi", "ürün çelik mi",
      "urunler celik", "ürünler çelik",
      "paslanmaz mi", "paslanmaz mı",
      "malzeme ne", "malzemesi ne", "materyali ne", "materyali nedir",
      "gumus mu", "gümüş mü", "gumusmu", "gümüşmü",
      "gumus mudur", "gümüş müdür",
      "kolye gumus", "kolye gümüş",
      "urun gumus", "ürün gümüş",
      "celik kolye", "çelik kolye",
      "celikmi", "çelikmi", "celismi", "çelişmi",
      "altin mi", "altın mı", "altinmi", "altınmı",
      "celik mi gumus mu", "çelik mi gümüş mü",
      "alerji", "alerjim", "alerjik",
      "suya dayanikli", "suya dayanıklı",
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
  // Ürün/model kelimeleri
  "resimli", "fotografli", "fotolu", "lazer", "kolye", "atac", "ataç", "harfli",
  "celik mi", "çelik mi", "celikmi", "çelikmi", "paslanmaz",
  "madalyon", "nazar", "boncuk", "boncuklu",
  // Beğeni/memnuniyet
  "begendim", "beğendim", "begendik", "beğendik", "guzel", "güzel",
  "saglik", "sağlık", "elinize", "ellerinize", "emeginize", "emeğinize",
  "bayildim", "bayıldım", "harika", "super", "süper", "mukemmel", "mükemmel",
  // Sipariş/kargo
  "siparis", "sipariş", "kargo", "teslimat",
  "hazir mi", "hazır mı", "hazir", "hazır",
  // Niyet/talep
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
  // LOG-BASED: Müşteri yönlendirmeleri — isim değil
  "bu olsun", "olsun", "bunu", "bundan",
  "kusura", "pardon", "ozur", "özür",
  "basimdan", "basımdan", "onceden", "önceden",
  "hevesle", "merakla",
  "belirtmistim", "belirtmiştim", "belirttim",
  "ertesi", "yarin", "yarın", "bugun", "bugün",
  "atmalık", "ciglik", "çığlık",
  "bence", "bana", "beni", "bize",
  "gorseli", "görseli", "fotografini", "fotoğrafını",
  "resimleri", "okeyliyelim", "okeyliyelin",
  "sayfaniza", "sayfanıza", "sayfaya",
  "satislar", "satışlar", "dilerim",
  "aglattiniz", "ağlattınız",
  "anlamli", "anlamlı", "degerli", "değerli",
  "okunusu", "okunuşu",
  "kullansak", "yazsak", "yapsak",
  "arkasinda", "arkasında",
  "kalir", "kalır",
  // Sık geçen kısa ifadeler — isim değil
  "tamam", "olur", "peki", "evet", "dogru", "doğru",
  "dikkat", "etmedim", "sorun", "sıkıntı", "sikinti",
  "tesekkur", "teşekkür", "sagol", "sağol", "saol",
  "merhaba", "selam",
  "aldi", "aldı", "aldim", "aldım",
  "nasil", "nasıl", "neden", "nicin", "niçin",
  // Şehir/ilçe isimleri (tek başına geldiğinde isim değil)
  "diyarbakir", "diyarbakır", "silvan", "istanbul",
  "ankara", "izmir", "antalya", "bursa", "adana",
  "trabzon", "samsun", "konya", "kayseri", "mersin",
  "gaziantep", "sanliurfa", "şanlıurfa", "malatya", "elazig", "elazığ",
  "batman", "mardin", "van", "agri", "ağrı", "bolu",
  "mugla", "muğla", "aydin", "aydın", "denizli",
  "eskisehir", "eskişehir", "afyon",
  "merkez", "ilce", "ilçe",
  // Fiil kökleri — "Sizin attığınız" gibi cümleler
  "attigi", "attığı", "attim", "attım", "atti", "attı",
  "yazdim", "yazdım", "yazdi", "yazdı",
  "sorucam", "soracagim", "soracağım",
  "dedim", "dedi", "diyor", "diyorum",
  // Onay/red — isim değil
  "hayir", "hayır", "istemiyorum",
  "tamamdir", "tamamdır", "anladim", "anladım",
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
    "mahalle", "mah", "sokak", "sk", "cadde", "cd", "bulvar", "bulvari", "no", "daire", "apt",
    "apartman", "apart", "ap", "kat", "site", "sitesi", "blok", "ilce", "ilçe",
    "mahallesi", "ic kapi", "iç kapı",
    // 140K log'dan eklenen
    "konutlari", "konutları", "evleri", "toki",
    "caddesi", "sokagi", "sokağı",
    "apartmani", "apartmanı",
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
  if (/\b(yorum|yorsun|yor|yoruz|yorsunuz|yorlar|acagim|acağım|ecegim|eceğim|ayim|ayım|eyim|elim|alim|misiniz|mısınız|musunuz|müsünüz|miyim|mıyım|bilir|abilir|ebilir|sana|bana|size|bize)\b/i.test(raw)) return false;

  // Yaygın Türkçe fiil sonekleri — isim olması çok düşük ihtimal
  if (/\b\S+(mek|mak|dım|dim|tım|tim|dık|dik|tık|tik|sın|sin|sun|sün|lım|lim|nız|niz|lar|ler|dan|den|tan|ten)\b/i.test(norm)) return false;

  // Tek kelime gibi davranan ama 2 kelimelik yaygın ifadeler
  const COMMON_TWO_WORD_NON_NAMES = [
    "bu olsun", "su olsun", "bunu istiyorum", "bunu yap",
    "ne guzel", "cok guzel", "iyi gunler", "iyi aksamlar",
    "kolay gelsin", "hayirli isler", "bol kazanc",
    "tamam olur", "peki tamam", "hadi tamam",
    "cok tesekkur", "rica ederim", "rica ederiz",
  ];
  if (COMMON_TWO_WORD_NON_NAMES.some(p => norm.includes(p))) return false;

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
      // Production log'dan: kısa soru varyantları
      "bu olur mu", "bu olurmu", "boyle olur mu", "böyle olur mu",
      "bu uygun mu", "bu uygunmu",
      "mesela boyle", "mesela böyle",
      "bu fotograf uygun", "bu fotoğraf uygun",
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
  // AMA: Mesajda soru sinyali varsa smalltalk'ı baskıla — soru intent'i öne geçsin
  if (hasAny(messageNorm, KEYWORDS.intents.smalltalk)) {
    // Soru sinyali kontrolü — "Beğendim ama boyutu ne kadar" gibi birleşik mesajlar
    const hasQuestionSignal = /[?]/.test(raw) ||
      // Türkçe soru ekleri — bağımsız kelime olarak (geçmiş, yakışır gibi kelimelerde false positive önle)
      /(?:^|\s)(mi|mı|mu|mü|miyim|mıyım|misiniz|mısınız|musunuz|müsünüz)(?:\s|$|[?.,!])/i.test(raw) ||
      hasAny(messageNorm, [
        "ne kadar", "kac", "kaç", "nasil", "nasıl", "nedir",
        "olur mu", "olurmu", "var mi", "var mı", "varmi", "varmı",
        "yapilir mi", "yapılır mı", "oluyor mu", "oluyormu",
        "dayanikli", "kararma", "celik mi", "gumus mu", "altin mi",
        "kac cm", "kaç cm", "kac gun", "kaç gün", "kac tl", "kaç tl",
      ]);

    // Soru sinyali varsa → smalltalk'a düşürme, aşağıdaki intent'lere bırak
    // Soru sinyali yoksa → sipariş niyeti kontrolü yap
    if (!hasQuestionSignal) {
      const hasOrderIntent = hasAny(messageNorm, [
        ...KEYWORDS.intents.orderStart,
        ...KEYWORDS.intents.newOrder,
        "siparis", "sipariş", "almak istiyorum", "yaptirmak", "yaptırmak",
        "resimli", "lazer", "atac", "ataç", "harfli",
      ]);
      if (!hasOrderIntent) return "smalltalk";
    }
    // Soru sinyali veya sipariş niyeti varsa → aşağıdaki handler'lara düşsün
  }

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

  if (hasAny(messageNorm, ["suya dayanikli", "dusta", "duşta", "deniz", "ter "])) {
    return makeReply("Evet efendim, suya dayanıklıdır 😊 Duş, deniz, ter gibi durumlarda rahatlıkla kullanabilirsiniz.", REPLY_CLASS.FIXED_INFO);
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
  if (context.detectedIntent !== "new_order") {
    // Completed'da order_start intent gelirse → yeni sipariş olarak yönlendir
    const isCompleted = state.order_status === "completed" || truthy(state.siparis_alindi);
    if (!(isCompleted && context.detectedIntent === "order_start")) return emptyReply();
  }
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
  
  // Akışın ilerleyen stage'lerinde detay isteği → flow'u geri götürme
  const stage = state.conversation_stage || "";
  if (stage === "waiting_address") {
    return makeReply("Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊", REPLY_CLASS.FLOW_PROGRESS);
  }
  if (stage === "waiting_payment") {
    return makeReply("Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊", REPLY_CLASS.FLOW_PROGRESS);
  }
  
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
    if (hasAny(messageNorm, ["zincir boyu", "zincir uzunlugu", "zincir uzunluğu", "uzunlugu ne kadar", "uzunluğu ne kadar", "zincir kac cm", "zincir kaç cm", "zincir kisalir", "zincir kısalır", "boyu ne kadar", "kac santim", "kaç santım", "kac santım", "kolye boyu", "kac cm", "kaç cm", "zincir ne kadar", "zincir ne uzunlukta"])) {
      return makeReply("Zincir fiyata dahildir, uzunluğu standart olarak 60 cm'dir efendim 😊", REPLY_CLASS.FIXED_INFO);
    }
    return makeReply(
      "Zincir modeliyle ilgili detay için ekibimize görsel üzerinden net bilgi verelim 😊",
      REPLY_CLASS.SELLER_REQUIRED, SUPPORT_MODE_REASON.SELLER_REQUIRED
    );
  }

  if (detectedProduct === "atac") {
    if (hasAny(messageNorm, ["zincir boyu", "zincir uzunlugu", "zincir uzunluğu", "uzunlugu ne kadar", "uzunluğu ne kadar", "zincir kac cm", "zincir kaç cm", "boyu ne kadar", "zincir ne kadar", "zincir ne uzunlukta"])) {
      return makeReply("Standart zincir 50 cm'dir, fiyata dahildir efendim 😊", REPLY_CLASS.FIXED_INFO);
    }
    return makeReply("Bu üründe tek zincir modeli kullanılıyor efendim 😊", REPLY_CLASS.FIXED_INFO);
  }

  // Ürün seçilmemişse genel bilgi ver
  if (hasAny(messageNorm, ["zincir boyu", "zincir uzunlugu", "zincir uzunluğu", "uzunlugu ne kadar", "uzunluğu ne kadar", "zincir kac cm", "zincir kaç cm", "boyu ne kadar", "boyutu nedir", "kac cm", "kaç cm", "kac santim", "kaç santım"])) {
    return makeReply("Resimli lazer kolyede zincir 60 cm, ataç kolyede 50 cm'dir efendim 😊", REPLY_CLASS.FIXED_INFO);
  }
  if (hasAny(messageNorm, ["zincir ne kadar"])) {
    return makeReply("Zincir fiyata dahildir efendim 😊 Resimli lazer kolyede 60 cm, ataç kolyede 50 cm standart zincir gelir.", REPLY_CLASS.FIXED_INFO);
  }
  return makeReply("Resimli lazer kolyede zincir 60 cm, ataç kolyede 50 cm'dir efendim 😊", REPLY_CLASS.FIXED_INFO);
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

  // Ürün seçilmemişse de lazer varsayarak cevap ver (bu sorular sadece lazer için geçerli)
  if (detectedIntent === "back_photo_price") {
    return makeReply("Ek ücret olmuyor efendim 😊", REPLY_CLASS.FIXED_INFO);
  }
  if (detectedIntent === "back_photo_info") {
    const stage = state.conversation_stage || "";
    let extra = "";
    if (stage === "waiting_payment") extra = " Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?";
    else if (stage === "waiting_address") extra = " Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim?";
    return makeReply("Evet efendim 😊 Ön yüze bir fotoğraf, arka yüze de ikinci bir fotoğraf ekleyebiliyoruz. Ek ücret de olmuyor." + extra, REPLY_CLASS.FIXED_INFO);
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
    // Çoklu alım kontrolü
    const multiMatch = context.messageNorm.match(/(\d+)\s*(tane|adet|tanesini|adedini)/);
    const qty = multiMatch ? parseInt(multiMatch[1]) : 0;
    if (qty >= 2) {
      const prices = {
        2: { eft: 1000, kapida: 1100 },
        3: { eft: 1400, kapida: 1500 },
        4: { eft: 1750, kapida: null },
        5: { eft: 2000, kapida: null },
      };
      const p = prices[qty] || prices[5];
      if (p.kapida) {
        return makeReply(`${qty} adet resimli lazer kolye: EFT / Havale ile ${p.eft} TL, kapıda ödeme ile ${p.kapida} TL'dir efendim 😊`, REPLY_CLASS.FIXED_INFO);
      }
      return makeReply(`${qty} adet resimli lazer kolye: EFT / Havale ile ${p.eft} TL'dir efendim 😊 (${qty}+ adet sadece EFT ile mümkündür)`, REPLY_CLASS.FIXED_INFO);
    }
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
  if (hasAny(messageNorm, ["tesekkur", "teşekkür", "tesekur", "teşekür", "sagolun", "sağolun", "saol", "tsk", "tşk", "rica ederim"])) {
    return makeReply("Rica ederiz efendim 😊", REPLY_CLASS.FIXED_INFO);
  }
  if (hasAny(messageNorm, ["gecmis olsun", "geçmiş olsun"])) {
    return makeReply("Çok teşekkür ederiz efendim 😊", REPLY_CLASS.FIXED_INFO);
  }
  if (hasAny(messageNorm, ["kolay gelsin"])) {
    return makeReply("Teşekkür ederiz efendim 😊", REPLY_CLASS.FIXED_INFO);
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
  const isOrderCompleted = state.order_status === "completed" || truthy(state.siparis_alindi) ||
    context.fields.order_status === "completed" || truthy(context.fields.siparis_alindi);
  const wasCompleted = context.fields.conversation_stage === "order_completed" || 
    state.conversation_stage === "order_completed";
  if (isOrderCompleted && wasCompleted) {

    // 1. Açık yeni sipariş niyeti → new_order handler'a bırak
    if (detectedIntent === "new_order" || detectedIntent === "order_start") {
      // Handler'a düşsün — müşteri yeni sipariş istiyor
    }
    // 1b. Ürün keyword'ü → müşteri yeni ürün istiyor, direkt yönlendir
    else if (hasAny(messageNorm, ["resimli", "lazer", "atac", "ataç", "harfli"])) {
      return makeReply(
        "Tabi efendim 😊 Yeni sipariş için ekibimiz size yardımcı olacaktır.",
        REPLY_CLASS.SELLER_REQUIRED, SUPPORT_MODE_REASON.SELLER_REQUIRED
      );
    }
    // 2. Smalltalk (teşekkür, memnuniyet, selam, dua) → normal handler'a bırak
    //    AMA: "Merhaba" + uzun mesaj (operasyonel talep içerir) → ekibe yönlendir
    else if (detectedIntent === "smalltalk") {
      const rawLen = String(context.message || "").trim().length;
      if (rawLen > 30 && hasAny(messageNorm, ["merhaba", "selam", "mrb"]) &&
          hasAny(messageNorm, ["kolye", "siparis", "sipariş", "kargo", "fotograf", "fotoğraf",
            "yapinca", "yapınca", "hazir", "hazır", "ne zaman", "atabilir", "gonderebilir"])) {
        return makeReply(
          "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
          REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED
        );
      }
      // Pure smalltalk → handler'a düşsün
    }
    // 3. Trust / Material / Price / Location / Chain / Shipping Price → side question, normal handler
    else if (["trust", "material_question", "price", "location", "chain_question", "shipping_price"].includes(detectedIntent)) {
      // Handler'a düşsün
    }
    // 4. POST-SALE KARGO: kişisel takip → ekibe yönlendir, genel bilgi → shipping handler'a bırak
    else if (detectedIntent === "shipping") {
      // Kişisel kargo takibi → post-sale
      if (hasAny(messageNorm, ["kargom", "siparisim", "siparişim", "gelmedi", "ulasmadi", "ulaşmadı",
        "verildi mi", "verdiniz mi", "verdimi", "yola cikti", "yola çıktı",
        "mesaj geldi", "mesaj gelmedi", "msj gelmedi", "msj geldi",
        "teslim olmadi", "teslim edilmedi",
        "kargo mesaji", "kargo mesajı",
        "kargoya verilmis", "kargoya verilmiş", "kargoya verildimi", "kargoya verildi mi",
        "dagitimda", "dağıtımda",
        "urunum", "ürünüm", "urunumu", "ürünümü",
        "benim kargo", "bana mesaj", "bana kargo",
        "herkesin", "hala gelmedi", "halen gelmedi",
        "son gunu", "son günü",
        "kargom hazir", "kargom hazır",
        "cikti mi", "çıktı mı", "cikmis", "çıkmış",
        "nerde kargo", "nerede kargo",
        "takip numara",
        "gondermis", "göndermiş", "gondermissiniz", "göndermişsiniz"])) {
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
      "memnun kalmadim", "memnun kalmadım", "memnun degilim", "memnun değilim",
      "istedigim gibi degil", "istediğim gibi değil",
      "yanlis olmus", "yanlış olmuş", "yanlis", "yanlış",
      "sikayet", "şikayet", "sikayetim", "şikayetim",
      "begenmedi", "beğenmedi", "begenmedim", "beğenmedim",
      "dikkate alinmamis", "dikkate alınmamış",
      "ilginiz sifir", "ilginiz sıfır",
      "alakasi yok", "alakası yok",
      "kotu", "kötü", "berbat",
      "fakat", "siparisimle", "siparişimle",
      // LOG-BASED: Gerçek müşteri şikayet pattern'leri
      "cok kara", "çok kara", "kara olmus", "kara olmuş",
      "net degil", "net değil", "anlasilmiyor", "anlaşılmıyor",
      "kimse begenmedi", "kimse beğenmedi",
      "sinir oldum", "sinir oldm", "sinirliyim",
      "hic hos degil", "hiç hoş değil",
      "iade", "iptal",
      "cevap vermiyorsunuz", "cevap alamiyorum", "cevap alamıyorum",
      "donus yapmiyorsunuz", "dönüş yapmıyorsunuz",
      "magdur", "mağdur",
    ])) {
      return makeReply(
        "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
        REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED
      );
    }
    // 7. Kısa onay / bekleme mesajları → fallback'e düşürme, kısa nötr cevap ver
    else if (messageNorm.length < 20 && (
      hasAny(messageNorm, ["tamam", "olur", "peki", "tamamdir", "anladim", "anladım", "evet", "tm", "tmm", "tmmm", "ok", "tmmdir", "dogru", "doğru"]) ||
      String(context.message || "").trim().length <= 8
    )) {
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

  // ═══ HUMAN_SUPPORT GUARD ═══
  // Satıcıya devredilmiş konuşmalarda: smalltalk hariç her şeyi ekibe yönlendir
  if (state.conversation_stage === "human_support") {
    if (detectedIntent === "smalltalk") {
      // Smalltalk'a düşsün (aşağıda sideReply'da yakalanacak)
    } else {
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

  // ── 3. Ürün seçimi (ilk kez veya ürün değişikliği) ──
  if (isFreshProductSelection(context, state)) {
    if (detectedProduct === "lazer") return makeReply(LASER_PRICE_TEXT, REPLY_CLASS.PRODUCT_ENTRY);
    if (detectedProduct === "atac") return makeReply(ATAC_PRICE_TEXT, REPLY_CLASS.PRODUCT_ENTRY);
  }
  // Ürün switch: önceki ürün vardı, yenisi farklı → yeni ürün girişi göster
  if (context.previousProduct && detectedProduct && context.previousProduct !== detectedProduct) {
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

  // ── 4b. back_text intent ama stage waiting_back_text DEĞİL → bilgi sorusu olarak cevapla ──
  if (detectedIntent === "back_text" && state.conversation_stage !== "waiting_back_text") {
    return makeReply("Evet efendim 😊 Resimli lazer kolyede arka yüzüne yazı veya istenirse ikinci bir fotoğraf eklenebiliyor.", REPLY_CLASS.FIXED_INFO);
  }

  // ── 5. Kısa onay/emoji/bekleme mesajları — model'e düşürmeden stage'e uygun cevap ver ──
  const raw = String(context.message || "").trim();
  const isShortConfirm = raw.length <= 15 && hasAny(messageNorm, ["tamam", "tamamdir", "tm", "tmm", "tmmm", "olur", "peki", "evet", "ok", "tamam dir", "anladim", "anladım"]);
  const isEmoji = raw.length <= 4 && /^[^\w\s]+$/.test(raw);
  const isVeryShort = raw.length <= 6 && !hasAny(messageNorm, ["fiyat", "iban", "eft", "iptal"]);
  
  if (isShortConfirm || isEmoji || isVeryShort) {
    const stage = state.conversation_stage || "";
    if (stage === "waiting_photo") {
      return makeReply("Fotoğrafı buradan gönderebilirsiniz efendim 😊", REPLY_CLASS.FLOW_PROGRESS);
    }
    if (stage === "waiting_back_text") {
      return makeReply("Arka yüze yazı eklemek ister misiniz? İsterseniz yazıyı buradan iletebilirsiniz, istemezseniz \"yok\" yazabilirsiniz 😊", REPLY_CLASS.FLOW_PROGRESS);
    }
    if (stage === "waiting_payment") {
      return makeReply("Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊", REPLY_CLASS.FLOW_PROGRESS);
    }
    if (stage === "waiting_address") {
      return makeReply("Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊", REPLY_CLASS.FLOW_PROGRESS);
    }
    if (stage === "waiting_letters") {
      return makeReply("Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊", REPLY_CLASS.FLOW_PROGRESS);
    }
    return makeReply("Tabi efendim 😊", REPLY_CLASS.FLOW_PROGRESS);
  }

  // ── 6. "Gönderdim" / "yukarıda attım" pattern'i — stage-aware ──
  if (hasAny(messageNorm, ["gonderdim", "gönderdim", "attim", "attım", "yukarida", "yukarıda", "ustte", "üstte", "yazdim", "yazdım", "belirttim", "belirtmistim", "belirtmiştim", "demin", "az once", "az önce", "biraz once", "biraz önce", "daha once", "daha önce", "resim yukarida", "resim yukarıda"])) {
    const stage = state.conversation_stage || "";
    if (stage === "waiting_photo") {
      return makeReply("Fotoğrafınız bize ulaşmamış olabilir efendim, tekrar gönderebilir misiniz? 😊", REPLY_CLASS.FLOW_PROGRESS);
    }
    if (stage === "waiting_address") {
      return makeReply("Bilgileriniz ulaşmamış olabilir efendim, ad soyad, telefon ve açık adresinizi tekrar yazabilir misiniz? 😊", REPLY_CLASS.FLOW_PROGRESS);
    }
    if (stage === "waiting_back_text") {
      return makeReply("Arka yüz için mesajınız ulaşmamış olabilir efendim, tekrar yazabilir misiniz? 😊", REPLY_CLASS.FLOW_PROGRESS);
    }
  }

  // ── 7. STAGE-AWARE CATCH-ALL — model'e düşmeden stage'e uygun son şans yönlendirmesi ──
  // Bu, model timeout'u yüzünden müşterinin cevapsız kalmasını önler
  {
    const stage = state.conversation_stage || "";
    const msgLen = raw.length;

    // waiting_photo'da tanınmayan mesajlar → foto iste
    if (stage === "waiting_photo" && msgLen > 2) {
      // Ama post-sale içerik varsa ekibe yönlendir
      if (hasAny(messageNorm, ["ulasmadi", "ulaştı", "geldi", "gelmedi", "siparis verdim", "sipariş verdim", "memnun degil"])) {
        return makeReply("Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_MODE_REASON.OPERATIONAL_REQUIRED);
      }
      return makeReply("Tabi efendim 😊 Fotoğrafı buradan gönderebilirsiniz.", REPLY_CLASS.FLOW_PROGRESS);
    }

    // waiting_payment'ta tanınmayan mesajlar → ödeme sor
    if (stage === "waiting_payment" && msgLen > 2) {
      return makeReply("Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊", REPLY_CLASS.FLOW_PROGRESS);
    }

    // waiting_address'te tanınmayan mesajlar → adres sor
    if (stage === "waiting_address" && msgLen > 2) {
      return makeReply("Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊", REPLY_CLASS.FLOW_PROGRESS);
    }

    // waiting_letters'ta tanınmayan mesajlar → harf iste
    if (stage === "waiting_letters" && msgLen > 2) {
      return makeReply("Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊", REPLY_CLASS.FLOW_PROGRESS);
    }

    // waiting_back_text'te tanınmayan mesajlar → arka yazı sor
    if (stage === "waiting_back_text" && msgLen > 2) {
      return makeReply("Arka yüze yazı eklemek ister misiniz? İsterseniz yazıyı buradan iletebilirsiniz, istemezseniz \"yok\" yazabilirsiniz 😊", REPLY_CLASS.FLOW_PROGRESS);
    }

    // waiting_product'ta tanınmayan mesajlar (foto URL dahil) → menü göster
    if (stage === "waiting_product" && msgLen > 2) {
      return makeReply("Fotoğrafınız ulaştı efendim 😊 Önce hangi model ile ilgilendiğinizi belirtebilir misiniz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye", REPLY_CLASS.MENU);
    }
  }

  // ── 8. Fallback — model'e düşecek (sadece stage bilinmiyorsa veya waiting_product) ──

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

CRITICAL STAGE RULES — NEVER VIOLATE:
- If back_text_status is "received" or "skipped", NEVER ask about back text again. Move to payment or address.
- If payment_method is set, NEVER ask about payment again. Move to address collection.
- If address_status is "received", NEVER ask for address again.
- If conversation_stage is "waiting_payment", ask ONLY about payment method (EFT or kapıda ödeme). Do NOT ask about back text or photo.
- If conversation_stage is "waiting_address", ask ONLY for ad soyad, telefon, and adres. Do NOT ask about back text, photo, or payment.
- If conversation_stage is "order_completed", do NOT restart any order flow. Answer briefly or say "Ekibimize iletiyorum".
- NEVER go backwards in the flow: photo → back_text → payment → address → completed.

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
  const timeoutMs = Number(process.env.MODEL_TIMEOUT_MS || 5000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({ model, temperature: 0.2, max_tokens: 150, messages }),
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ORDER SYNC SYSTEM v7
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractCustomerId(raw) {
  const candidates = [
    raw.customer_id, raw.psid, raw.user_id, raw.subscriber_id,
    raw.ig_username, raw.instagram_username, raw.username,
    raw.sender_id, raw.id,
  ];
  for (const c of candidates) {
    const val = unwrapManychatValue(c);
    if (val) return val;
  }
  return "";
}

function buildStableOrderId(context, stateUpdate) {
  const customerId = extractCustomerId(context.raw);
  const productType = stateUpdate.ilgilenilen_urun || "";
  if (!customerId) return `noid_${Date.now()}`;
  if (!productType) return `pre_${customerId}`;

  const prevOrderStatus = normalizeText(unwrapManychatValue(context.raw.order_status));
  const prevSiparisAlindi = truthy(unwrapManychatValue(context.raw.siparis_alindi));
  const prevCancelReason = unwrapManychatValue(context.raw.cancel_reason);
  const wasClosed = prevOrderStatus === "completed" || prevOrderStatus === "cancel_requested" || prevSiparisAlindi || !!prevCancelReason;
  const isNewIntent = context.detectedIntent === "new_order" || context.detectedIntent === "order_start";

  if (wasClosed && isNewIntent) return `${customerId}_${productType}_${Date.now()}`;
  return `open_${customerId}_${productType}`;
}

function buildReferenceInfo(context, stateUpdate) {
  const customerId = extractCustomerId(context.raw);
  const productType = stateUpdate.ilgilenilen_urun || "";
  if (!customerId || !productType) return null;

  const prevOrderStatus = normalizeText(unwrapManychatValue(context.raw.order_status));
  const prevSiparisAlindi = truthy(unwrapManychatValue(context.raw.siparis_alindi));
  const wasClosed = prevOrderStatus === "completed" || prevOrderStatus === "cancel_requested" || prevSiparisAlindi;
  const isNewIntent = context.detectedIntent === "new_order" || context.detectedIntent === "order_start";

  if (wasClosed && isNewIntent) {
    return { reference_type: "returning_customer", reference_order_id: `open_${customerId}_${productType}` };
  }
  return null;
}

function detectOrderSheetStatusFromTexts(...texts) {
  const joined = normalizeText(texts.filter(Boolean).join(" || "));
  if (["siparisiniz alindi", "siparisiniz tamamlanmistir", "siparisiniz olusturuldu", "siparisiniz olusturulmustur", "siparisiniz alinmistir"].some(p => joined.includes(p))) return "confirmed";
  if (["siparisiniz iptal edildi", "iptal edilmistir", "siparis iptal"].some(p => joined.includes(p))) return "cancel";
  return "";
}

function detectCustomerCancelIntent(messageNorm) {
  return ["iptal", "vazgectim", "siparisi iptal", "iptal etmek istiyorum", "iptal edebilir misiniz", "almak istemiyorum", "iptal olsun", "iptal edelim", "iptal ettirmek istiyorum"].some(p => messageNorm.includes(p));
}

function calculateConfidenceScore(stateUpdate) {
  let score = 0;
  if (stateUpdate.ilgilenilen_urun) score += 20;
  if (stateUpdate.ilgilenilen_urun === "lazer") {
    if (stateUpdate.photo_received) score += 20;
    if (stateUpdate.back_text_status) score += 10;
  } else if (stateUpdate.ilgilenilen_urun === "atac") {
    if (stateUpdate.letters_received) score += 20;
    score += 10;
  }
  if (stateUpdate.payment_method) score += 20;
  if (stateUpdate.address_status === "received") score += 20;
  if (stateUpdate.phone_received) score += 10;
  return score;
}

function extractPhoneEnhanced(rawMessage) {
  const raw = String(rawMessage || "");
  const standard = extractPhone(raw);
  if (standard) return standard;
  const digitsOnly = raw.replace(/\D/g, "");
  if (/^05\d{9}$/.test(digitsOnly)) return digitsOnly.slice(1);
  if (/^905\d{9}$/.test(digitsOnly)) return digitsOnly.slice(2);
  if (/^5\d{9}$/.test(digitsOnly)) return digitsOnly;
  const cleaned = raw.replace(/[\s\-\(\)\.\/]/g, "");
  if (/^0?5\d{9}$/.test(cleaned)) {
    const d = cleaned.replace(/^0/, "");
    if (/^5\d{9}$/.test(d)) return d;
  }
  return "";
}

function getPhotoCount(context) {
  const existing = parseInt(unwrapManychatValue(context.raw.photo_count) || "0", 10);
  return existing + 1;
}

function buildOrderRawPayload(context, stateUpdate, replyPayload, orderId) {
  const replyText = cleanReply(replyPayload?.text || "");
  const finalStatus = detectOrderSheetStatusFromTexts(replyText);
  const intent = context.detectedIntent || "";
  const message = String(context.message || "").trim();
  const messageNorm = context.messageNorm || "";
  const customerWantsCancel = detectCustomerCancelIntent(messageNorm);
  const isPhotoMessage = looksLikePhotoUrl(message);

  const p = {};
  function add(key, value) {
    if (value !== undefined && value !== null && String(value).trim() !== "") p[key] = value;
  }

  p.order_id = orderId;
  p.updated_at = new Date().toISOString();
  p.last_message = message;

  if (customerWantsCancel) p.order_status = "cancel";
  else if (finalStatus) p.order_status = finalStatus;
  else if (stateUpdate.order_status === "completed") p.order_status = "collecting_info";
  else if (stateUpdate.order_status) p.order_status = stateUpdate.order_status;

  add("customer_id", extractCustomerId(context.raw));
  add("instagram_username", unwrapManychatValue(context.raw.instagram_username) || unwrapManychatValue(context.raw.ig_username) || unwrapManychatValue(context.raw.username));
  add("customer_name", unwrapManychatValue(context.raw.customer_name) || unwrapManychatValue(context.raw.full_name));

  if (intent === "name_only") {
    const stage = context.fields.conversation_stage || context.conversationStage || "";
    if (stage === "waiting_address" && message.length >= 3) add("recipient_name", message);
  }

  const phoneFromMsg = extractPhoneEnhanced(message);
  if (phoneFromMsg) add("phone", phoneFromMsg);

  add("product_type", stateUpdate.ilgilenilen_urun);
  if (stateUpdate.payment_method) add("payment_type", stateUpdate.payment_method);
  if (intent === "address" || intent === "store_pickup") add("full_address", message);

  if (isPhotoMessage && (intent === "photo" || intent === "back_photo_upload")) {
    add("photo_received", "foto");
    add("photo_url", message);
    add("photo_count", getPhotoCount(context));
  }

  if (["back_text", "back_text_skip", "back_photo_upload"].includes(intent)) add("back_text_status", stateUpdate.back_text_status);
  if (intent === "back_text") add("back_text_value", message);
  if (intent === "back_photo_upload" && isPhotoMessage) add("back_text_value", message);
  if (intent === "letters" && stateUpdate.letters_received) add("letters_value", message);

  const confidence = calculateConfidenceScore(stateUpdate);
  if (confidence > 0) add("confidence_score", confidence);

  const ref = buildReferenceInfo(context, stateUpdate);
  if (ref) { add("reference_type", ref.reference_type); add("reference_order_id", ref.reference_order_id); }

  if (customerWantsCancel) { add("cancel_reason", "customer_request"); add("cancelled_at", new Date().toISOString()); }
  if (finalStatus) add("confirmation_source", "bot");
  if (finalStatus === "confirmed") add("confirmed_at", new Date().toISOString());
  if (finalStatus === "cancel") { add("cancel_reason", stateUpdate.cancel_reason || "bot_cancel"); add("cancelled_at", new Date().toISOString()); }

  return p;
}

async function postOrderRaw(orderData) {
  const url = process.env.GOOGLE_ORDER_WEBHOOK_URL;
  if (!url) return;
  try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "order_raw", data: orderData }) }); }
  catch (e) { console.error("Order RAW error:", e.message); }
}

async function postOrderOperation(opData) {
  const url = process.env.GOOGLE_ORDER_WEBHOOK_URL;
  if (!url) return;
  try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "order_operation", data: opData }) }); }
  catch (e) { console.error("Order OPS error:", e.message); }
}

async function safeOrderSync(context, stateUpdate, replyPayload) {
  const hasProduct = stateUpdate.ilgilenilen_urun;
  const hasCustomer = extractCustomerId(context.raw);
  if (!hasProduct && !hasCustomer) return;

  const orderId = buildStableOrderId(context, stateUpdate);
  const replyText = cleanReply(replyPayload?.text || "");
  const finalStatus = detectOrderSheetStatusFromTexts(replyText);
  const messageNorm = context.messageNorm || "";
  const customerWantsCancel = detectCustomerCancelIntent(messageNorm);
  const intent = context.detectedIntent || "";
  const message = String(context.message || "").trim();
  const isPhotoMessage = looksLikePhotoUrl(message);

  const rawPayload = buildOrderRawPayload(context, stateUpdate, replyPayload, orderId);
  await postOrderRaw(rawPayload);

  const isConfirmOrCancel = finalStatus === "confirmed" || finalStatus === "cancel" || customerWantsCancel;
  const isCompleted = stateUpdate.order_status === "completed" || truthy(stateUpdate.siparis_alindi);
  const phoneChanged = !!extractPhoneEnhanced(message);
  const addressChanged = intent === "address" || intent === "store_pickup";
  const photoChanged = isPhotoMessage && (intent === "photo" || intent === "back_photo_upload");
  const backTextChanged = intent === "back_text" || intent === "back_photo_upload";
  const nameChanged = intent === "name_only";

  const shouldWriteOps = isConfirmOrCancel || (isCompleted && (phoneChanged || addressChanged || photoChanged || backTextChanged || nameChanged));

  if (shouldWriteOps) {
    const op = { order_id: orderId };
    function addOp(key, value) { if (value !== undefined && value !== null && String(value).trim() !== "") op[key] = value; }

    if (isConfirmOrCancel) {
      op.final_status = customerWantsCancel ? "cancel" : finalStatus;
      op.finalized_at = new Date().toISOString();
      op.decision_source = customerWantsCancel ? "customer" : "bot";
      op.done = false;
    }

    addOp("instagram_username", unwrapManychatValue(context.raw.instagram_username) || unwrapManychatValue(context.raw.ig_username));
    addOp("customer_name", unwrapManychatValue(context.raw.customer_name) || unwrapManychatValue(context.raw.full_name));
    if (nameChanged && (context.fields.conversation_stage === "waiting_address") && message.length >= 3) addOp("recipient_name", message);
    if (phoneChanged) addOp("phone", extractPhoneEnhanced(message));
    if (addressChanged) addOp("full_address", message);
    addOp("product_type", stateUpdate.ilgilenilen_urun);
    if (stateUpdate.payment_method) addOp("payment_type", stateUpdate.payment_method);
    if (photoChanged || stateUpdate.photo_received) addOp("photo_received", "foto");
    if (isPhotoMessage) addOp("photo_url", message);
    if (intent === "back_text" && stateUpdate.back_text_status === "received") addOp("back_text_value", message);
    if (intent === "back_photo_upload" && isPhotoMessage) addOp("back_text_value", message);
    if (stateUpdate.letters_received) addOp("letters_value", context.message);
    const confidence = calculateConfidenceScore(stateUpdate);
    if (confidence > 0) addOp("confidence_score", confidence);
    if (customerWantsCancel) addOp("internal_note", "Müşteri iptal talep etti");

    await postOrderOperation(op);
  }
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

  // Log + Order Sync: Cevaptan ÖNCE çalıştır (await ile).
  // Deterministik cevap 50ms, log+sync 1-2s, toplam 2-3s — ManyChat 10s limiti içinde.
  // Model fallback'te: 7s model + 2s log = 9s — hala 10s altında.
  try {
    await Promise.allSettled([
      safeOrderSync(context, stateUpdate, replyPayload).catch(e => console.error("OrderSync error:", e.message)),
      logConversationRow({ body, result: finalResult, options }).catch(e => console.error("Log error:", e.message)),
    ]);
  } catch (e) {
    console.error("Background tasks error:", e.message);
  }

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
