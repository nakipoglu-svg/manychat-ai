// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS — Tek merkez, sıfır magic string
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── PRODUCTS ───────────────────────────────────────────────
export const PRODUCT = { LAZER: "lazer", ATAC: "atac" };

// ─── STAGES ─────────────────────────────────────────────────
export const STAGE = {
  WAITING_PRODUCT:   "waiting_product",
  WAITING_PHOTO:     "waiting_photo",
  WAITING_BACK_TEXT: "waiting_back_text",
  WAITING_LETTERS:   "waiting_letters",
  WAITING_PAYMENT:   "waiting_payment",
  WAITING_ADDRESS:   "waiting_address",
  ORDER_COMPLETED:   "order_completed",
  HUMAN_SUPPORT:     "human_support",
};

export const VALID_STAGES = new Set(Object.values(STAGE));

// ─── REPLY CLASS ────────────────────────────────────────────
export const REPLY_CLASS = {
  FIXED_INFO:            "fixed_info",
  FLOW_PROGRESS:         "flow_progress",
  SELLER_REQUIRED:       "seller_required",
  OPERATIONAL_REQUIRED:  "operational_required",
  FALLBACK:              "fallback",
  MENU:                  "menu",
  PRODUCT_ENTRY:         "product_entry",
  ORDER_COMPLETE:        "order_complete",
};

// ─── SUPPORT MODE REASON ────────────────────────────────────
export const SUPPORT_REASON = {
  SELLER:      "seller_required",
  OPERATIONAL: "operational_required",
  FALLBACK:    "true_fallback",
  CANCEL:      "manual_cancel",
  NONE:        "",
};

// ─── PAYMENT ────────────────────────────────────────────────
export const PAYMENT = { EFT: "eft_havale", KAPIDA: "kapida_odeme" };

// ─── ADDRESS STATUS ─────────────────────────────────────────
export const ADDR = { RECEIVED: "received", ADDRESS_ONLY: "address_only" };

// ─── BACK TEXT STATUS ───────────────────────────────────────
export const BACK_TEXT = { RECEIVED: "received", SKIPPED: "skipped" };

// ─── ORDER STATUS ───────────────────────────────────────────
export const ORDER = { STARTED: "started", COMPLETED: "completed", CANCEL: "cancel_requested" };

// ─── PRICES ─────────────────────────────────────────────────
export const PRICE = {
  LAZER_EFT: 599, LAZER_KAPIDA: 649,
  ATAC_EFT: 499,  ATAC_KAPIDA: 549,
  ATAC_EXTRA_LETTER: 50,
  MULTI_LAZER: {
    2: { eft: 1000, kapida: 1100 },
    3: { eft: 1400, kapida: 1500 },
    4: { eft: 1750, kapida: null },
    5: { eft: 2000, kapida: null },
  },
};

// ─── FIXED TEXTS ────────────────────────────────────────────
export const TEXT = {
  FALLBACK: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",

  MAIN_MENU: "Merhaba efendim 😊\nHangi model ile ilgileniyorsunuz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye",

  LAZER_PRICE: "Resimli lazer kolye fiyatımız EFT / Havale ile 599 TL, kapıda ödeme ile 649 TL'dir efendim 😊 Siparişe devam etmek isterseniz fotoğrafı buradan gönderebilirsiniz.",

  ATAC_PRICE: "Harfli ataç kolye fiyatımız EFT / Havale ile 499 TL, kapıda ödeme ile 549 TL'dir efendim 😊 Siparişe devam etmek isterseniz istediğiniz harfleri yazabilirsiniz.",

  EFT_INFO: "IBAN: TR34 0015 7000 0000 0076 2524 67\nAlıcı: Servet Cihan Nakipoğlu",

  ORDER_DETAILS: "📌 Sipariş için lütfen şu 3 bilgiyi mümkünse tek mesajda paylaşın:\n\n👤 Ad soyad\n📱 Cep telefonu\n📍 Açık adres",

  SHIPPING_TIME: "Siparişler 1 gün içinde hazırlanıp PTT Kargo'ya verilir efendim 😊 İstanbul içi 1-2 iş günü, İstanbul dışı 2-3 iş günü içinde teslim edilir. Kargoya verildiğinde size otomatik SMS gelecektir 📦",

  WHATSAPP: "WhatsApp iletişim numaramız: 0534 073 60 09 😊",
};

// ─── INTENT NAMES ───────────────────────────────────────────
export const INTENT = {
  // Flow intents
  PHOTO: "photo",
  BACK_PHOTO_UPLOAD: "back_photo_upload",
  BACK_TEXT: "back_text",
  BACK_TEXT_SKIP: "back_text_skip",
  LETTERS: "letters",
  PAYMENT: "payment",
  ADDRESS: "address",
  PHONE: "phone",
  NAME_ONLY: "name_only",
  CANCEL: "cancel_order",
  ORDER_START: "order_start",
  // Info intents
  PRICE: "price",
  SHIPPING: "shipping",
  SHIPPING_PRICE: "shipping_price",
  TRUST: "trust",
  MATERIAL: "material_question",
  CHAIN: "chain_question",
  LOCATION: "location",
  PHOTO_QUESTION: "photo_question",
  BACK_TEXT_INFO: "back_text_info",
  BACK_PHOTO_INFO: "back_photo_info",
  BACK_PHOTO_PRICE: "back_photo_price",
  BACK_TEXT_EXAMPLES: "back_text_examples",
  PHOTO_SUITABILITY: "photo_suitability_question",
  BACK_PHOTO_SENT: "back_photo_already_sent",
  PRODUCT_IMAGE_REF: "product_image_reference",
  PHOTO_SENT_CONFIRM: "photo_sent_confirmation",
  PAYMENT_INFO: "payment_info_question",
  STORE_PICKUP: "store_pickup",
  // Meta intents
  SMALLTALK: "smalltalk",
  POST_SALE: "post_sale",
  NEW_ORDER: "new_order",
  EXAMPLE_REQUEST: "example_request",
  DETAIL_REQUEST: "detail_request",
  GENERAL: "general",
};

// ─── KEYWORDS ───────────────────────────────────────────────
export const KW = {
  product_lazer: [
    "resimli", "fotografli", "foto", "fotolu", "lazer",
    "resim kolye", "foto kolye", "fotografli kolye", "fotoğraflı kolye",
    "resimli kolye", "resimli lazer", "resimli madalyon", "resimli olan",
  ],
  product_atac: [
    "atac", "ataç", "harfli", "harf kolye", "harfli kolye",
    "3 harf", "uc harf", "isim harf", "harfli atac",
  ],

  cancel: ["siparisi iptal", "siparişi iptal", "iptal", "vazgectim", "vazgeçtim"],

  smalltalk: [
    "merhaba", "selam", "slm", "mrb", "merhabalar",
    "iyi aksamlar", "iyi akşamlar", "iyi gunler", "iyi günler",
    "gunaydin", "günaydın", "iyi geceler",
    "nasilsiniz", "nasılsınız",
    "iyi misiniz", "iyimisiniz", "nasilsin", "nasılsın", "naber",
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

  location: ["yeriniz nerede", "yeriniz neresi", "yeriniz nerde", "neredesiniz", "konum", "magaza", "mağaza", "eminonu", "eminönü", "subeniz", "şubeniz", "subesi", "şubesi"],

  shipping_price: [
    "kargo ucreti", "kargo ücreti", "kargo ucreti ne kadar", "kargo ücreti ne kadar",
    "kargo fiyati var mi", "kargo fiyatı var mı", "kargo fiyati", "kargo fiyatı",
    "kargo dahil mi", "kargo ücretli mi", "kargo ucretli mi",
    "kargo ucretlimi", "kargo ücretlimi",
    "kargo ucretli mj", "kargo ücretli mj",
    "kargo ucreti var mi", "kargo ücreti var mı",
    "kargo birlikte mi", "kargo ile birlikte mi",
    "kargo ucreti dahil mi", "kargo ücreti dahil mi",
    "kargo fiyata dahil", "kargo dahil",
    "kargo ucretsiz mi", "kargo ücretsiz mi",
    "kargo parasi", "kargo parasI", "kargo parası",
    "eve teslim", "kargo var mi", "kargo varmı", "kargo varmi",
    "fiyata dahil mi", "fiyata dahil",
  ],

  shipping: [
    "kargo", "teslimat", "ne zaman gelir", "kac gunde", "kaç günde",
    "kac gune", "kaç güne", "kac gun", "kaç gün",
    "takip no", "kargom nerede", "ne zaman kargolarsiniz",
    "ne zaman kargoya verilir", "kac gune gelir", "kaç güne gelir",
    "ne zaman hazir", "ne zaman hazır", "kac gune hazir", "kaç güne hazır",
    "ne zaman teslim", "teslim suresi", "teslim süresi",
    "icinde gelir", "içinde gelir",
    "ne kadar surede", "ne kadar sürede", "ne kadar sure", "ne kadar süre",
    "ne zaman elimde", "ne zaman elime", "elimde olur",
    "elime ulasir", "elime ulaşır",
  ],

  trust: [
    "guvenilir", "guven", "dolandirici", "orijinal", "saglam",
    "kararma", "kararir mi", "kararma yapar mi", "kararma olur mu",
    "kararır mı", "kararma yapar mı",
    "karar ma", "kararma yapiyomu", "kararma yapıyomu",
    "kararma yaparmi", "kararma yapiyormu", "kararma yapıyor mu",
    "kararma oluyormu", "kararma oluyor mu",
    "karariyormu", "kararıyormu", "kararirmi", "kararırmi",
    "karaa", "kararmi", "solma yapiyormu", "solma yapıyormu",
    "renk atma", "renk atar", "renk atması", "renk bozul",
    "rengi gidiyor", "rengi gider", "rengi aciyor", "rengi açıyor",
    "silinme", "resim silin",
    "solar", "solma", "paslan",
    "suya dayanikli", "suya dayanıklı", "duşta", "dusta", "denizde", "denizte", "terle",
    "kaplama", "kaplamasi atar", "kaplaması atar",
    "garanti",
    "celik mi", "çelik mi", "celikmi", "çelikmi",
    "urun celik mi", "ürün çelik mi",
    "paslanmaz mi", "paslanmaz mı", "paslanmaz demi", "paslanmaz demı",
    "malzeme ne", "malzemesi ne",
    "ne malzeme", "hangi malzeme",
  ],

  payment: [
    "kapida odeme", "kapıda ödeme",
    "kapida odeme olur mu", "kapıda ödeme olur mu",
    "kapida odeme var mi", "kapıda ödeme var mı",
    "kapida oderim", "kapıda öderim",
    "kapida odeme olsun", "kapıda ödeme olsun",
    "kapida olsun", "kapıda olsun",
    "kapida", "kapıda",
    "kalida", "nakit",
    "eft", "havale",
    "odeme", "ödeme",
    "iban", "dekont", "aciklama", "açıklama",
    "kredi karti", "kredi kartı", "kartla", "kart ile",
  ],

  price: ["fiyat", "fıyat", "fiat", "fyat", "ne kadar", "nekadar", "ucret", "ücret", "kac tl", "kaç tl", "kac lira", "kaç lira"],

  chain: [
    "zincir model", "zincir degisiyor mu", "zincir değişiyor mu",
    "zincir kisalir mi", "zincir kısalır mı",
    "zincir boyu", "zincir uzunlugu", "zincir uzunluğu",
    "zincirin boyu", "zincirin uzunlugu", "zincirin uzunluğu",
    "zincir ne kadar", "uzunlugu ne kadar", "uzunluğu ne kadar",
    "uzunlugu nekadar", "uzunluğu nekadar",
    "zincir kac cm", "zincir kaç cm",
    "zincirlere bakabilir", "zincir secenekleri", "zincir seçenekleri",
    "boyu ne kadar", "boyutu ne kadar", "boyutu nedir", "kac cm", "kaç cm",
    "kac santim", "kaç santım", "kac santım", "kaç santim",
    "zincir dahil", "zincir dayil",
    "plaka boyut", "plaka olcu", "plaka ölçü", "plakanin olcu", "plakanın ölçü",
    "yuvarlak plaka", "yuvarlak bolum", "yuvarlak bölüm",
    "cerceve boyut", "çerçeve boyut", "madalyon boyut",
    "olcusu nedir", "ölçüsü nedir", "olcusu ne", "ölçüsü ne",
    "zincir kisalt", "zincir kısalt", "kisaltma", "kısaltma", "kisaltilabilir", "kısaltılabilir", "kisaltabilir", "kısaltabilir",
    "zincir uzat", "uzatma", "uzatilabilir", "uzatılabilir", "uzatabilir", "daha uzun zincir",
    "70 cm", "70cm",
  ],

  order_start: [
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
    "siparis olustur", "sipariş oluştur",
    "siparis olusturmak", "sipariş oluşturmak",
    "siparis basla", "sipariş başla",
    "bir urunun fiyatini kontrol edebilir misiniz", "bir ürünün fiyatını kontrol edebilir misiniz",
    "fiyat alabilirmiyim", "fiyat alabilir miyim",
    "fiyat bilgisi alabilir miyim",
    "fiyat ogrenebilir miyim", "fiyat öğrenebilir miyim",
    "fiyatini ogrenebilir miyim", "fiyatını öğrenebilir miyim",
  ],

  photo_question: [
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
    "vesikalik mi", "vesikalık mı", "vesikalik olmali mi", "vesikalık olmalı mı",
    "nasil bir fotograf", "nasıl bir fotoğraf", "ne tur fotograf", "ne tür fotoğraf",
    "hangi fotograf", "ne cesit", "ne çeşit", "selfie mi",
    "fotograf nasil olmali", "fotoğraf nasıl olmalı", "foto nasil olmali", "foto nasıl olmalı",
    "fotograf nasil olsun", "fotoğraf nasıl olsun", "foto nasil olsun", "foto nasıl olsun",
    "fotografi nasil gonderecegiz", "fotoğrafı nasıl göndereceğiz",
    "nasil bir resim", "nasıl bir resim", "fotograf nasil olacak", "fotoğraf nasıl olacak",
    "bu olur mu", "bu olurmu", "bu foto olur mu", "bu fotograf olur mu",
    "resimleri buradan mi atiyorum", "resmi buradan mi gondericez",
    "tekli fotograf mi", "tekli mi olmali",
  ],

  back_photo_price: [
    "arkasina fotograf ne kadar", "arkasına fotograf ne kadar",
    "arkasina foto ne kadar", "arkasına foto ne kadar",
    "arka tarafa fotograf koymak istesek ne kadar olacak",
    "ek ucret", "ek ücret",
    "arkasina foto koyarsam fiyat ne olur", "arkasına foto koyarsam fiyat ne olur",
    "arka foto olursa fiyat", "arka foto fiyat",
    "arka yuz fiyat", "arka yüz fiyat",
  ],

  back_text_info: [
    "arka tarafina da mi yazabiliyoruz",
    "arka tarafina da yazabiliyor muyuz",
    "arkasina yazi oluyor mu", "arkasına yazı oluyor mu",
    "arkasina yazi olur mu", "arkasına yazı olur mu",
    "arkasina yazi yazabilir", "arkasına yazı yazabilir",
    "arkasina yazı yazabiliyor", "arkasına yazı yazabiliyor",
    "arka yuzune yazi oluyor mu", "arka yüzüne yazı oluyor mu",
    "arkaya yazi yaziliyor mu", "arkaya yazı yazılıyor mu",
    "arka tarafa yazi oluyor mu", "arka tarafa yazi olur mu",
    "arka tarafa yazi yazabilir", "arka tarafa yazı yazabilir",
    "dua yazilir mi", "dua yazılır mı",
    "isim yazilir mi", "isim yazılır mı",
    "ne yazabiliriz arkasina", "ne yazabiliriz arkasına",
    "arkasina ne yazabiliriz", "arkasına ne yazabiliriz",
    "arkasina ne yazilir", "arkasına ne yazılır",
    "arkaya ne yazabiliriz", "arkaya ne yazılır",
    "ne yaziliyor genelde", "ne yazılıyor genelde",
    "genelde ne yaziliyor", "genelde ne yazılıyor",
    "arkasina ne yazdirabilir", "arkasına ne yazdırabilir",
    "arkasina ne yazalim", "arkasına ne yazalım",
    "o zaman arkasina", "o zaman arkasına",
    "arka yazi ne olsun", "arka yazı ne olsun",
  ],

  back_photo_info: [
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
    "arka tarafa baska foto", "arka tarafa baska fotograf",
    "arka tarafa foto", "arka tarafa fotograf",
    "iki resim olur mu", "iki resim oluyor mu", "2 resim olur mu",
    "iki foto olur mu", "iki foto oluyor mu", "2 foto olur mu",
    "iki resim", "iki foto", "2 resim", "2 foto",
    "birlestir", "birleştir", "birlestirme", "birleştirme",
    "yan yana", "yanyana",
    "ayri ayri fotograf", "ayrı ayrı fotoğraf", "ayri ayri foto",
    "iki kisinin foto", "iki kişinin foto", "iki kisinin resim", "iki kişinin resim",
    "iki cocuk", "iki çocuk", "iki oglum", "iki oğlum",
    "sigar mi", "sığar mı", "sigarmi", "sığarmı",
    "3 kisi", "3 kişi", "uc kisi", "üç kişi",
    "3 cocuk", "3 çocuk", "uc cocuk", "üç çocuk",
    "3 oglu", "3 oğlu",
    "3 lu fotograf", "3 lü fotoğraf", "uclu foto", "üçlü foto",
    "3 resim", "uc resim", "üç resim",
    "iki kisi oluyor mu", "iki kişi oluyor mu",
    "iki kisinin fotosu", "iki kişinin fotosu",
    "iki kisinin resmi", "iki kişinin resmi",
    "iki kisi olur mu", "iki kişi olur mu",
    "iki resmi birlestir", "iki resmi birleştir",
  ],

  back_text_skip: [
    "yok", "istemiyorum", "gerek yok",
    "bos kalsin", "boş kalsın", "bos olsun", "boş olsun",
    "arka bos kalsin", "arka boş kalsın",
    "yazi olmasin", "yazı olmasın", "arka yazi yok", "arka yazı yok",
  ],

  back_text_direct: [
    "arkasina yazi", "arkasına yazı", "arka yazi", "arka yazı",
    "arkasina tarih", "arkasına tarih", "arkaya yazi", "arkaya yazı",
    "arka tarafa yazi", "arka tarafa yazı",
  ],

  post_sale: [
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
    "fotografi degistirmek", "fotoğrafı değiştirmek",
    "arka yaziyi degistirmek", "arka yazıyı değiştirmek",
    "siparisi degistirmek", "siparişi değiştirmek",
    "degisiklik yapmak", "değişiklik yapmak",
    "degistirebilir miyim", "değiştirebilir miyim",
    "neden cevap vermiyorsunuz", "neden cevap vermiyor",
    "niye cevap vermiyor", "cevap vermiyorsunuz",
    "ulasami", "ulaşamı",
    "bakar misiniz", "bakar mısınız",
  ],

  new_order: [
    "daha siparis", "daha sipariş",
    "bir tane daha", "iki tane daha", "2 tane daha", "3 tane daha",
    "tekrar siparis", "tekrar sipariş",
    "yeni siparis", "yeni sipariş",
    "bir siparis daha", "bir sipariş daha",
  ],

  example_request: [
    "ornek atabilir misiniz", "örnek atabilir misiniz",
    "ornek gorebilir miyim", "örnek görebilir miyim",
    "ornek atar misiniz", "örnek atar mısınız",
    "ornek gonderir misiniz", "örnek gönderir misiniz",
    "ornek foto", "örnek foto",
  ],

  detail_request: ["detay", "detaylar", "bilgi alabilir", "bilgi istiyorum", "bilgi verir misiniz"],

  material_question: [
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
};

// ─── LETTER STOPWORDS (ataç harf girişi false positive koruması) ──
export const LETTER_STOPWORDS = new Set([
  "devam", "tamam", "evet", "olur", "merhaba", "selam", "slm", "fiyat", "ucret", "ücret",
  "kapida", "kapıda", "eft", "havale", "odeme", "ödeme", "hayir", "hayır", "gonder", "gönder",
  "yok", "istemiyorum", "gerek", "bos", "boş", "tmm", "tamamdir", "tamamdır", "peki", "ok",
  "detay", "bilgi", "super", "süper", "harika", "amin", "insallah", "inşallah",
  "masallah", "maşallah", "eyvallah",
]);

// ─── NOT_A_NAME phrases ─────────────────────────────────────
export const NOT_A_NAME = [
  "resimli", "fotografli", "fotolu", "lazer", "kolye", "atac", "ataç", "harfli",
  "celik mi", "çelik mi", "celikmi", "çelikmi", "paslanmaz",
  "madalyon", "nazar", "boncuk", "boncuklu",
  "begendim", "beğendim", "begendik", "beğendik", "guzel", "güzel",
  "saglik", "sağlık", "elinize", "ellerinize", "emeginize", "emeğinize",
  "bayildim", "bayıldım", "harika", "super", "süper", "mukemmel", "mükemmel",
  "siparis", "sipariş", "kargo", "teslimat",
  "hazir mi", "hazır mı", "hazir", "hazır",
  "goreyim", "görebilir", "gorebilir",
  "istiyorum", "ilgileniyorum", "alayim", "alayım",
  "detay", "bilgi", "fiyat", "ucret", "ücret",
  "olur mu", "olurmu", "var mi", "var mı",
  "yapilir mi", "yapılır mı", "yapar mi", "yapar mı",
  "bekliyorum", "gonderdim", "gönderdim", "gonderirim", "gönderirim",
  "yaziyorum", "yazıyorum", "yaptirmak", "yaptırmak",
  "gelmedi", "ulasmadi", "ulaşmadı", "tekrar", "daha",
  "indirim", "kampanya", "kapida", "kapıda", "durun", "dur",
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
  "okunusu", "okunuşu", "kullansak", "yazsak", "yapsak",
  "arkasinda", "arkasında", "kalir", "kalır",
  "tamam", "olur", "peki", "evet", "dogru", "doğru",
  "dikkat", "etmedim", "sorun", "sıkıntı", "sikinti",
  "tesekkur", "teşekkür", "sagol", "sağol", "saol",
  "merhaba", "selam",
  "aldi", "aldı", "aldim", "aldım",
  "nasil", "nasıl", "neden", "nicin", "niçin",
  "diyarbakir", "diyarbakır", "silvan", "istanbul",
  "ankara", "izmir", "antalya", "bursa", "adana",
  "trabzon", "samsun", "konya", "kayseri", "mersin",
  "gaziantep", "sanliurfa", "şanlıurfa", "malatya", "elazig", "elazığ",
  "batman", "mardin", "van", "agri", "ağrı", "bolu",
  "mugla", "muğla", "aydin", "aydın", "denizli",
  "eskisehir", "eskişehir", "afyon",
  "merkez", "ilce", "ilçe",
  "attigi", "attığı", "attim", "attım", "atti", "attı",
  "yazdim", "yazdım", "yazdi", "yazdı",
  "sorucam", "soracagim", "soracağım",
  "dedim", "dedi", "diyor", "diyorum",
  "hayir", "hayır", "istemiyorum",
  "tamamdir", "tamamdır", "anladim", "anladım",
];

// ─── TURKEY CITIES ──────────────────────────────────────────
export const TURKEY_CITIES = [
  "adana","adiyaman","afyonkarahisar","agri","aksaray","amasya","ankara","antalya","ardahan","artvin","aydin",
  "balikesir","bartin","batman","bayburt","bilecik","bingol","bitlis","bolu","burdur","bursa",
  "canakkale","cankiri","corum","denizli","diyarbakir","duzce",
  "edirne","elazig","erzincan","erzurum","eskisehir",
  "gaziantep","giresun","gumushane","hakkari","hatay",
  "igdir","isparta","istanbul","izmir",
  "kahramanmaras","karabuk","karaman","kars","kastamonu","kayseri","kilis","kirikkale","kirklareli","kirsehir","kocaeli","konya","kutahya",
  "malatya","manisa","mardin","mersin","mugla","mus",
  "nevsehir","nigde","ordu","osmaniye","rize",
  "sakarya","samsun","siirt","sinop","sivas","sanliurfa","sirnak",
  "tekirdag","tokat","trabzon","tunceli","usak","van","yalova","yozgat","zonguldak",
];

export const DISTRICT_KEYWORDS = [
  "kadikoy","kadıköy","beykoz","uskudar","üsküdar","besiktas","beşiktaş",
  "sisli","şişli","fatih","moda","kavacik","kavacık","eminonu","eminönü",
  "nusaybin","beyazit","beyazıt","kizilay","kızılay","cankaya","çankaya",
  "beylikduzu","beylikdüzü","bagcilar","bağcılar","arnavutkoy","arnavutköy",
  "esenyurt","avcilar","avcılar","bahcelievler","bahçelievler","bakirköy","bakırköy",
  "maltepe","kartal","pendik","tuzla","sultanbeyli","umraniye","ümraniye",
  "atasehir","ataşehir","sancaktepe","cekmekoy","çekmeköy","sultangazi",
  "gaziosmanpasa","gaziosmanpaşa","eyup","eyüp","sariyer","sarıyer",
  "kemerburgaz","buyukcekmece","büyükçekmece","kucukcekmece","küçükçekmece",
  "basaksehir","başakşehir","zeytinburnu","gungoren","güngören",
];

// ─── ADDRESS KEYWORDS ───────────────────────────────────────
export const ADDRESS_KEYWORDS = [
  "mahalle","mah","sokak","sk","cadde","cd","bulvar","bulvari","no","daire","apt",
  "apartman","apart","ap","kat","site","sitesi","blok","ilce","ilçe",
  "mahallesi","ic kapi","iç kapı",
  "konutlari","konutları","evleri","toki",
  "caddesi","sokagi","sokağı","apartmani","apartmanı",
];

// ─── EXPLICIT PRODUCT SWITCH ────────────────────────────────
export const EXPLICIT_SWITCH_PHRASES = [
  "yok ben", "onun yerine", "degistirelim", "degistirmek istiyorum",
  "değiştirelim", "değiştirmek istiyorum",
  "ben atac alayim", "ben ataç alayım", "ben resimli istiyorum",
  "ben lazer istiyorum", "ataç alayım", "atac alayim",
  "fikrimi degistirdim", "fikrimi değiştirdim",
];

// ─── CRITICAL KNOWLEDGE FILES (AI fallback safety check) ────
export const CRITICAL_KNOWLEDGE = [
  "CORE_SYSTEM.txt", "PAYMENT.txt", "PRICING.txt", "SHIPPING.txt", "ORDER_FLOW.txt",
];
