// Decision policy v2 — stage-aware route classification.
// This module decides what the user's message means inside the current state;
// it does not mutate state or commit slots.

import { INTENT, STAGE, REPLY_CLASS, SUPPORT_REASON, PRODUCT } from "./constants.js";
import { hasAny, normalizeText } from "./normalize.js";

export const POLICY_DECISION = {
  FAQ_QUESTION: "faq_question",
  EXPECTED_SLOT_VALUE: "expected_slot_value",
  SHORT_CONTEXT_REPLY: "short_context_reply",
  OPERATIONAL_HANDOFF: "operational_handoff",
  SERIOUS_COMPLAINT: "serious_complaint",
  EXPECTED_SLOT_REMINDER: "expected_slot_reminder",
  AMBIGUOUS: "ambiguous",
  POST_ORDER_UPDATE_HANDOFF: "post_order_update_handoff",
  RECOVERED_CONTEXT_HANDOFF: "recovered_context_handoff",
  PARTIAL_SLOT_UPDATE: "partial_slot_update",
  PRODUCT_CONTEXT_RECOVERED: "product_context_recovered",
};

export const BEHAVIOR_CATEGORY = {
  SLOT_COMMITTED: "slot_committed",
  FAQ_ANSWERED: "faq_answered",
  CONTEXTUAL_ACK: "contextual_ack",
  EXPECTED_SLOT_REMINDER: "expected_slot_reminder",
  OPERATIONAL_HANDOFF: "operational_handoff",
  SERIOUS_COMPLAINT_HANDOFF: "serious_complaint_handoff",
  POST_ORDER_UPDATE_HANDOFF: "post_order_update_handoff",
  RECOVERED_CONTEXT_HANDOFF: "recovered_context_handoff",
  PARTIAL_SLOT_UPDATE: "partial_slot_update",
  PRODUCT_CONTEXT_RECOVERED: "product_context_recovered",
  AMBIGUOUS_NEEDS_REVIEW: "ambiguous_needs_review",
  WRONG_ROUTE_SUSPECTED: "wrong_route_suspected",
  ENGINE_ERROR: "engine_error",
};

const FAQ_INTENTS = new Set([
  "price",
  "price_confirmation",
  "shipping",
  "shipping_price",
  "trust",
  "material_question",
  "chain_question",
  "chain_structure_request",
  "location",
  "store_pickup",
  "photo_question",
  "photo_suitability_question",
  "photo_acceptance_question",
  "photo_format_question",
  "back_text_info",
  "back_text_question",
  "back_text_fit_question",
  "back_photo_info",
  "back_photo_price",
  "composition_question",
  "product_structure_request",
  "single_pendant_request",
  "payment_info_question",
  "preview_request",
  "completed_photo_share_request",
  "iban_request",
  "example_request",
  "detail_request",
  "general_question",
  "future_order_intent",
  "contact_channel_question",
  // İndirim/çoklu alım soruları FAQ'dır — bot sepet %15 indirimini söyler, insana atmaz.
  "bargain",
  "quantity_order",
  "multi_order",
]);

const OPERATIONAL_INTENTS = new Set([
  "post_sale",
  "cancel_order",
  "completed_change_request",
  "payment_confirmation",
  "order_status_question",
]);

const SLOT_INTENTS = new Set([
  "photo",
  "payment",
  "address",
  "address_provide_full",
  "address_provide_partial",
  "full_contact_bundle",
  "phone",
  "phone_provide",
  "name_only",
  "letters",
  "order_start",
]);

const ORDER_FLOW_STAGES = new Set([
  STAGE.WAITING_PRODUCT,
  STAGE.WAITING_PHOTO,
  STAGE.WAITING_BACK_TEXT,
  STAGE.WAITING_PAYMENT,
  STAGE.WAITING_ADDRESS,
  STAGE.WAITING_LETTERS,
  STAGE.ORDER_COMPLETED,
  STAGE.HUMAN_SUPPORT,
  "",
]);

function stageOf(ctx) {
  return ctx.fields?.conversation_stage || "";
}

function words(raw = "") {
  return String(raw || "").trim().split(/\s+/).filter(Boolean);
}

function isSeriousComplaint(norm) {
  return hasAny(norm, [
    "savciliga", "savcılığa", "savciya", "savcıya", "karakola",
    "avukat", "dava", "mahkeme", "dolandiricilik", "dolandırıcılık",
    "dolandirici", "dolandırıcı", "dolandirmak", "dolandırmak",
    "dolandirdin", "dolandırdın", "dolandirdiniz", "dolandırdınız",
    "dolandirildim", "dolandırıldım",
    "tuketici hakem", "tüketici hakem", "sikayet com", "şikayet com",
    "vergi dairesi",
    "sikayet edecegim", "şikayet edeceğim", "sikayet edicem", "şikayet edicem",
    "parami geri", "paramı geri", "iade istiyorum", "parami iade", "paramı iade",
    "asla onermiyorum", "asla önermiyorum", "rezalet", "berbat",
  ]);
}

function isOperational(ctx) {
  const n = ctx.norm || "";
  const st = stageOf(ctx);
  if (st === STAGE.HUMAN_SUPPORT) return true;
  if (OPERATIONAL_INTENTS.has(ctx.intent)) return true;
  if ([STAGE.WAITING_PAYMENT, STAGE.ORDER_COMPLETED].includes(st) && hasAny(n, [
    "siteden uye olmadan", "siteden üye olmadan", "uye olmadan yaptim", "üye olmadan yaptım",
    "uye olmadan alis", "üye olmadan alış", "uye olmadan alış", "üye olmadan alis",
    "siparis olusturdum", "sipariş oluşturdum", "siteden siparis verdim", "siteden sipariş verdim",
    "siteden alisveris yaptim", "siteden alışveriş yaptım", "siteniz uzerunden", "siteniz üzerinden",
    "alis veris yaptim", "alış veriş yaptım", "alisveris yaptim", "alışveriş yaptım",
    "site siparisi", "site siparişi",
  ])) return true;
  if (st === STAGE.ORDER_COMPLETED && (
    ctx.intent === "full_contact_bundle" ||
    ctx.intent === "address" ||
    ctx.intent === "address_provide_full" ||
    ctx.intent === "address_provide_partial" ||
    ctx.intent === "phone" ||
    ctx.intent === "phone_provide" ||
    ctx.extracted?.hasAddress ||
    ctx.extracted?.phone
  )) return true;
  if (st === STAGE.ORDER_COMPLETED && ["takip", "kargo"].includes(n.trim())) return true;
  return hasAny(n, [
    "kargom", "kargo takip", "takip no", "takip numarasi", "takip numarası",
    "siparis takip", "sipariş takip", "siparis takib", "sipariş takib",
    "takip nerede", "takip nerde", "takip kodu nerede", "takip kodu nerde",
    "gelmedi", "ulasmadi", "ulaşmadı", "kargoya verildi mi", "kargoya verdiniz mi",
    "1 hafta oldu", "bir hafta oldu", "ne yaptiniz", "ne yaptınız",
    "ne zaman donus", "ne zaman dönüş", "donus yapacaktiniz", "dönüş yapacaktınız",
    "donus yapicak", "dönüş yapıcak", "donus yapacak", "dönüş yapacak",
    "geri donus", "geri dönüş", "bilgi alacaktim", "bilgi alacaktım",
    "bilgi vermediniz", "bilgi vermiyorsunuz", "siparisim icin bilgi", "siparişim için bilgi",
    "siparisimle ilgili", "siparişimle ilgili", "verdigim siparis", "verdiğim sipariş",
    "siparisim geliyor", "siparişim geliyor",
    "hazir mi", "hazır mı",
    "hazirlandi mi", "hazırlandı mı", "basladiniz mi", "başladınız mı",
    "urune basladiniz", "ürüne başladınız", "ürüne basladiniz",
    "ne durumda", "kiminle gorus", "kiminle görüş",
    "hazir mesaj", "hazır mesaj", "otomatik cevap", "yardimci olacak misiniz", "yardımcı olacak mısınız",
    "yapay zekayla", "yapay zeka ile", "robotla konus", "robotla konuş",
    "robotla muhattap", "robotla muhatap", "muhattap etmeyin", "muhatap etmeyin",
    "ayni seyi", "aynı şeyi", "ayni mesaj", "aynı mesaj", "aloooo", "yonlendirme olmadi", "yönlendirme olmadı",
    "cvp verm", "cevap verm", "otomatik msj", "otomatik mesaj", "kac saat oldu", "kaç saat oldu",
    "sessiz kal", "ekip donmuyor", "ekip dönmüyor", "neden cevap", "1 haftadir", "1 haftadır",
    "doneceginiz yok", "döneceğiniz yok", "ne zaman gelecek", "donus yapilacak", "dönüş yapılacak",
    "kandirildim", "kandırıldım", "babalar gunune yetisir", "babalar gününe yetişir", "babalar gunune", "babalar gününe",
    "babar gunune", "babar gününe",
    "cumaya elimde", "cuma elimde", "cumaya yetisir", "cumaya yetişir",
    "yetisir mi", "yetişir mi", "yetismez", "yetişmez",
    "tahmini ne zaman", "ne zaman gelmis", "ne zaman gelmiş",
    "ne zaman ulasir", "ne zaman ulaşır", "ne zaman ulasır",
    "ulasir elime", "ulaşır elime", "ulasır elime", "elimize ulasir", "elimize ulaşır",
    "simdi siparis versem", "şimdi sipariş versem", "cumartesi gunune gelir", "cumartesi gününe gelir",
    "pazar gelir mi", "siparis versem elime", "sipariş versem elime",
    "siparis vermistim", "sipariş vermiştim", "siparis verdim", "sipariş verdim",
    "odeme yaptim", "ödeme yaptım", "dekont", "kontrol eder misiniz",
    "iptal", "vazgectim", "vazgeçtim",
    "adres degistir", "adres değiştir", "yanlis adres", "yanlış adres",
    "kirik", "kırık", "cizik", "çizik", "hasarli", "hasarlı", "yanlis geldi", "yanlış geldi",
    "cevap vermiyorsunuz", "donus yapmiyorsunuz", "dönüş yapmıyorsunuz",
    "donus yapmadiniz", "dönüş yapmadınız", "donus yapilmadi", "dönüş yapılmadı",
    "yardimci olmuyorsunuz", "yardımcı olmuyorsunuz", "yardimci olmuyor", "yardımcı olmuyor",
    "haber vermediniz", "ilgilenir misiniz", "ilgilenirmisiniz", "ilgi misiniz", "igi misiniz",
    "yardimci olursaniz", "yardımcı olursanız", "yardimci olur musunuz", "yardımcı olur musunuz",
    "mesajlarimi okur", "mesajlarımı okur", "dalga gectiniz", "dalga geçtiniz",
    "isim yanlis", "isim yanlış", "yanlis olmasin", "yanlış olmasın",
    "cok fazla", "çok fazla",
    "tirnak takiliyor", "tırnak takılıyor", "sorunu net anlars", "urun sorunu", "ürün sorunu",
    "urun anlayacaksiniz", "ürün anlayacaksınız", "kanaat vereceksiniz",
    "bakin siz kendiniz yazdiniz", "bakın siz kendiniz yazdınız",
    "ulasmazsa", "ulaşmazsa", "baska firma", "başka firma",
    "sitenizden aldim", "sitenizden aldım", "web uzerinden ilettim", "web üzerinden ilettim",
    "mesajlara donus alamiyorum", "mesajlara dönüş alamıyorum",
    "bana donus saglayacaktiniz", "bana dönüş sağlayacaktınız",
    "bir sorum olacakti donebilir", "bir sorum olacaktı dönebilir",
    "ne zaman iletisime gececeks", "ne zaman iletişime geçeceks",
    "bi donus yap", "bi dönüş yap",
    "whatsapp donus", "whatsapp dönüş", "whatsp donus", "whatsp dönüş",
    "rica ediyorum biranonce", "rica ediyorum biranönce", "siparis tamamlansin", "sipariş tamamlansın",
    "link den actim", "link den açtım", "olusturamadim", "oluşturamadım",
    "urun subede", "ürün şubede", "subeye gidecegi", "şubeye gideceği",
    "ptt sube", "ptt şube", "tekrar dagitim", "tekrar dağıtım", "subeden", "şubeden",
  ]);
}

function previousBotNorm(ctx) {
  return normalizeText(ctx.fields?.ai_reply || "");
}

function rawMessage(ctx) {
  return String(ctx.message || "").trim();
}

function hasPhoneOrIban(ctx) {
  const raw = rawMessage(ctx);
  return !!ctx.extracted?.phone ||
    /(?:\+?90[\s.-]*)?(?:0[\s.-]*)?5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/.test(raw) ||
    /\bTR\s*\d{2}(?:\s*[A-Z0-9]){20,30}\b/i.test(raw) ||
    /\[PHONE\]|\[IBAN\]/i.test(raw);
}

function hasLooseAddressSignal(ctx) {
  const n = ctx.norm || "";
  const raw = rawMessage(ctx);
  if (!raw || raw.includes("?")) return false;
  if (ctx.extracted?.hasAddress || /\[ADDRESS\]/i.test(raw)) return true;
  const addressWords = [
    "adres", "mahalle", "mahallesi", "mah ", "sokak", "sok ", "cadde", "caddesi", "cad ",
    "bulvar", "apt", "apartman", "daire", "kat ", "no ", "no:", "blok", "ishani",
    "is hani", "is hanı", "ilce", "ilçe",
  ];
  let hits = 0;
  for (const word of addressWords) {
    if (n.includes(word)) hits++;
  }
  return raw.length >= 18 && hits >= 1 && /\d/.test(raw);
}

function looksLikeShortNameOrBackText(ctx) {
  const raw = rawMessage(ctx);
  const n = ctx.norm || "";
  if (!raw || raw.includes("?") || raw.length > 80) return false;
  if (hasAny(n, [
    "nasil", "anlamadim", "ne tabi", "sonuc", "kapali",
    "kolyenin", "resimli", "bekliyoruz", "evt",
    "haber", "siparis", "sipariş", "donus", "dönüş", "kargo", "takip",
  ])) return false;
  if (/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(raw)) return true;
  if (/\b(19|20)\d{2}\b/.test(raw) && /[a-zA-ZçğıöşüÇĞİÖŞÜ]{3,}/.test(raw)) return true;
  if (hasAny(n, [
    "canim", "oglum", "kizim", "annem", "babam", "babacim", "babacım",
    "babamsin", "babamsın", "babos", "baboş",
    "ailem", "sevgilim", "askim", "kalbim", "seni seviyorum",
  ]) && raw.length <= 65) return true;
  if (raw.length <= 50 && /[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}/.test(raw) && /[❤❤️🤍]/u.test(raw)) return true;
  if (raw.length <= 50 && /[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}/.test(raw) && /[♾]/u.test(raw)) return true;
  const parts = raw.split(/\s+/).filter(Boolean);
  return parts.length >= 2 && parts.length <= 3 &&
    parts.every((p) => /^[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}$/.test(p)) &&
    !hasAny(n, ["oldu", "geldi", "gitti", "istiyorum", "yaptim", "yazdim"]);
}

function isEmptyOrContextless(ctx) {
  const st = stageOf(ctx);
  return !st || (!ctx.product && !ctx.fields?.ilgilenilen_urun && !ctx.fields?.user_product);
}

function recoverProduct(ctx) {
  if (ctx.product) return ctx.product;
  if (ctx.fields?.ilgilenilen_urun) return ctx.fields.ilgilenilen_urun;
  if (ctx.fields?.user_product) return ctx.fields.user_product;
  const n = `${ctx.norm || ""} ${previousBotNorm(ctx)}`.trim();
  if (!n) return "";
  if (hasAny(n, ["kisiye ozel fotografli lazer anahtarlik", "kişiye özel fotoğraflı lazer anahtarlık", "anahtarlik", "anahtarlık"])) return PRODUCT.ANAHTARLIK;
  if (hasAny(n, ["resimli bileklik", "fotoğraflı bileklik", "fotografli bileklik", "bileklik modelimiz"])) return PRODUCT.BILEKLIK;
  if (hasAny(n, ["resimli kolye", "resimli lazer", "fotografli kolye", "fotoğraflı kolye", "lazer kolye"])) return PRODUCT.LAZER;
  if (hasAny(n, ["yonca kolye", "isimli yonca", "yonca model"])) return PRODUCT.YONCA;
  if (hasAny(n, ["harfli atac", "harfli ataç", "atac kolye", "ataç kolye"])) return PRODUCT.ATAC;
  if (hasAny(n, ["evcil hayvan mezar", "mezar tasi", "mezar taşı"])) return PRODUCT.MEZAR_TASI;
  return "";
}

function previousBotAskedAddress(ctx) {
  const p = previousBotNorm(ctx);
  return hasAny(p, [
    "ad soyad", "cep telefonu", "telefon numaraniz", "telefon numaranız",
    "acik adres", "açık adres", "adres bilgileriniz", "adresinizi",
  ]);
}

function isColorOrVariantInfo(ctx) {
  const n = ctx.norm || "";
  return hasAny(n, [
    "altin rengi plaka", "altın rengi plaka", "gumus renk plaka", "gümüş renk plaka",
    "gumus plaka", "gümüş plaka", "siyah plaka", "siyah zincir",
    "altin rengi zincir", "altın rengi zincir", "gumus renk zincir", "gümüş renk zincir",
  ]);
}

function classifyEmptyContextRecovery(ctx) {
  if (!isEmptyOrContextless(ctx)) return null;
  const trace = [];
  const n = ctx.norm || "";
  const recoveredProduct = recoverProduct(ctx);

  if (isOperational(ctx)) {
    return {
      decision: POLICY_DECISION.OPERATIONAL_HANDOFF,
      behavior_category: BEHAVIOR_CATEGORY.OPERATIONAL_HANDOFF,
      handoff_reason: SUPPORT_REASON.OPERATIONAL,
      trace: ["matched:empty_context_operational"],
    };
  }
  if (ctx.intent === "iban_request") return null;

  if (previousBotAskedAddress(ctx) && (ctx.extracted?.phone || ctx.extracted?.hasAddress || ["phone", "phone_provide", "address", "address_provide_partial"].includes(ctx.intent))) {
    return {
      decision: POLICY_DECISION.PARTIAL_SLOT_UPDATE,
      behavior_category: BEHAVIOR_CATEGORY.PARTIAL_SLOT_UPDATE,
      slot_prompt_reason: "previous_bot_requested_contact_or_address",
      trace: ["matched:partial_slot_update_from_previous_bot"],
    };
  }

  if (isColorOrVariantInfo(ctx) && recoveredProduct) {
    return {
      decision: POLICY_DECISION.RECOVERED_CONTEXT_HANDOFF,
      behavior_category: BEHAVIOR_CATEGORY.RECOVERED_CONTEXT_HANDOFF,
      recovered_product: recoveredProduct,
      handoff_reason: "recovered_product_variant_info",
      trace: [`matched:recovered_variant:${recoveredProduct}`],
    };
  }

  // ARKA YAZI / ARKA FOTOĞRAF BİLGİ SORUSU — cevabı hazır, insana DEVRETME.
  // "olur mu / yazılıyor mu / ücretli mi" gibi sorular. İçerik ("Anne 2020 yazsın")
  // ayrı intent (back_text) ve slot akışında kalır; buraya düşmez.
  if (["back_text_info", "back_text_question", "back_text_fit_question", "back_photo_info"].includes(ctx.intent)) {
    return {
      decision: POLICY_DECISION.FAQ_QUESTION,
      behavior_category: BEHAVIOR_CATEGORY.FAQ_ANSWERED,
      handoff_reason: "",
      trace: ["matched:back_text_faq"],
    };
  }

  // ÖDEME YÖNTEMİ SORUSU — site/kart/kapıda ödeme sorularını insana DEVRETME, bot cevaplasın.
  // "Ödemeyi yaptım / sipariş oluşturdum / dekont" gibi tamamlanmış-sipariş beyanları
  // isOperational'da zaten yakalanıp insana gider; buraya yalnızca satış ÖNCESİ soru/niyet düşer.
  {
    const isPaymentMethodInquiry = hasAny(n, [
      "siteden", "sitemizden", "site uzerinden", "site üzerinden", "web sitesi", "web site",
      "online", "internetten", "internet uzerinden", "internet üzerinden",
      "kredi karti", "kredi kartı", "kartla", "kart ile", "kartli", "kartlı",
      "kart odeme", "kart ödeme", "kart ile odeme", "kart ile ödeme",
      "kapida", "kapıda", "kapida odeme", "kapıda ödeme", "kapida nakit", "kapıda nakit",
      "nasil odeme", "nasıl ödeme", "odeme nasil", "ödeme nasıl",
      "odeme secenek", "ödeme seçenek", "odeme yontem", "ödeme yöntem",
      "hangi odeme", "hangi ödeme", "odeme seklinde", "ödeme şeklinde",
    ]);
    const looksCompletedOrder = hasAny(n, [
      "yaptim", "yaptım", "odedim", "ödedim", "olusturdum", "oluşturdum",
      "verdim", "aldim", "aldım", "gonderdim", "gönderdim", "dekont",
      "kontrol eder", "kontrol edin", "siparisim", "siparişim", "aldik", "aldık",
      "yatirdim", "yatırdım", "havale ettim", "eft ettim",
    ]);
    if (isPaymentMethodInquiry && !looksCompletedOrder) {
      return {
        decision: POLICY_DECISION.FAQ_QUESTION,
        behavior_category: BEHAVIOR_CATEGORY.FAQ_ANSWERED,
        handoff_reason: "",
        trace: ["matched:payment_method_inquiry_faq"],
      };
    }
  }

  if (ctx.fields?.ad_default_product === "1" && ["gumus", "gümüş", "altin", "altın", "siyah", "gold"].includes(n.trim())) {
    return {
      decision: POLICY_DECISION.FAQ_QUESTION,
      behavior_category: BEHAVIOR_CATEGORY.FAQ_ANSWERED,
      handoff_reason: "",
      trace: ["matched:ad_default_single_color_faq"],
    };
  }

  if (recoveredProduct && (
    ctx.extracted?.photoLink ||
    ctx.extracted?.payment ||
    hasPhoneOrIban(ctx) ||
    hasLooseAddressSignal(ctx) ||
    hasAny(n, [
      "eft", "havale", "iban", "kapida", "kapıda", "kredi karti", "kredi kartı",
      "arkasina", "arkasına", "arka yazi", "arka yazı", "yazi", "yazı", "yazilsin", "yazılsın",
      "babalar gunu", "babalar günü", "babalar gunune", "babalar gününe",
      "canim babam", "canım babam", "resim yuklemiyorum", "resim yüklemiyorum",
      "seklini netlestirmem", "şeklini netleştirmem", "modeli goremedim", "modeli göremedim",
      "gorsel gonderme", "görsel gönderme", "erkek icin kolye", "erkek için kolye",
      "yapmaya calistim", "yapmaya çalıştım", "satin aldim", "satın aldım",
      "gonderimi nerden", "gönderimi nerden", "gonderimi nereden", "gönderimi nereden",
      "boyut", "ebat", "yazalim", "yazalım", "yazsin", "yazsın",
      "web uzerinden", "web üzerinden", "sadece bayan", "resimde", "resimleri ayarlayip",
      "resimleri ayarlayıp", "2adet", "2 adet", "ayri olacak", "ayrı olacak",
      "gumus", "gümüş", "gold", "siyah", "sari renk", "sarı renk",
      "sitenizden aldim", "sitenizden aldım", "sitenizden aldik", "sitenizden aldık",
      "yazmistim", "yazmıştım", "görünmüyor mu", "gorunmuyor mu",
      "gormem mumkun", "görmem mümkün", "siparisim olusturdum", "siparişim oluşturdum",
      "hemen iletiyorum", "bastirmak istiyorum", "bastırmak istiyorum",
      "siparisi olusturabilir", "siparişi oluşturabilir", "siparis olusturabilir", "sipariş oluşturabilir",
      "siparis edicem", "sipariş edicem", "siparis edecegim", "sipariş edeceğim",
      "tum bilgileri", "tüm bilgileri", "eksiksiz gonderdim", "eksiksiz gönderdim",
      "d olsun", "harf olsun", "rengi o yuzden", "rengi o yüzden",
      "bir hafta var", "sanirim yetisir", "sanırım yetişir", "olusturdum aldim", "oluşturdum aldım",
      "ne renk yaptiniz", "ne renk yaptınız", "sormadiniz", "sormadınız",
      "gorme sansim", "görme şansım", "gorme şansım", "görme sansim",
      "hazirlayabilir misiniz", "hazırlayabilir misiniz", "en sondaki model",
      "tek tarafina", "tek tarafına", "gorsele gore", "görsele göre",
      "link den actim", "link den açtım", "sabah buradan atayim", "sabah buradan atayım",
      "hafta iciye denk", "hafta içiye denk", "evde olurum",
      "30x50", "30x45", "3 cm kalinlik", "3 cm kalınlık", "dikdortgen", "dikdörtgen",
      "ne yapmamiz gerekiyor", "ne yapmamız gerekiyor", "guzel bir resim", "güzel bir resim",
      "anahtalik uzerine", "anahtarlık üzerine", "bir adet kolye", "bir adet bileklik",
      "adres istiyorsunuz", "kocami", "kocamı", "sigdiramaz", "sığdıramaz",
    ])
    || looksLikeShortNameOrBackText(ctx)
  )) {
    return {
      decision: POLICY_DECISION.RECOVERED_CONTEXT_HANDOFF,
      behavior_category: BEHAVIOR_CATEGORY.RECOVERED_CONTEXT_HANDOFF,
      recovered_product: recoveredProduct,
      handoff_reason: "recovered_product_order_detail",
      trace: [`matched:recovered_order_detail:${recoveredProduct}`],
    };
  }

  const isProductLink = hasAny(n, ["yudumjewels.com", "kisiye ozel", "kişiye özel"]);
  const isSingleProductName =
    ["resimli bileklik", "resimli kolye", "anahtarlik", "anahtarlık", "yonca kolye"].includes(n.trim()) ||
    (recoveredProduct && (isProductLink || ctx.intent === INTENT.ORDER_START || hasAny(n, ["resimli bileklik", "resimli kolye", "anahtarlik", "anahtarlık", "yonca kolye"])));
  if (recoveredProduct && isSingleProductName) {
    return {
      decision: POLICY_DECISION.PRODUCT_CONTEXT_RECOVERED,
      behavior_category: BEHAVIOR_CATEGORY.PRODUCT_CONTEXT_RECOVERED,
      recovered_product: recoveredProduct,
      trace: [`matched:product_context_recovered:${recoveredProduct}`],
    };
  }

  return null;
}

function classifyWaitingProductRecovery(ctx) {
  const st = stageOf(ctx);
  if (st !== STAGE.WAITING_PRODUCT && st !== STAGE.WAITING_LETTERS) return null;
  const recoveredProduct = recoverProduct(ctx);
  const n = ctx.norm || "";

  if (isOperational(ctx)) {
    return {
      decision: POLICY_DECISION.OPERATIONAL_HANDOFF,
      behavior_category: BEHAVIOR_CATEGORY.OPERATIONAL_HANDOFF,
      handoff_reason: SUPPORT_REASON.OPERATIONAL,
      trace: ["matched:waiting_context_operational"],
    };
  }
  if (ctx.intent === "iban_request") return null;

  if (recoveredProduct && hasAny(n, ["yudumjewels.com", "kisiye ozel", "kişiye özel"])) {
    return {
      decision: POLICY_DECISION.PRODUCT_CONTEXT_RECOVERED,
      behavior_category: BEHAVIOR_CATEGORY.PRODUCT_CONTEXT_RECOVERED,
      recovered_product: recoveredProduct,
      trace: [`matched:waiting_product_context_recovered:${recoveredProduct}`],
    };
  }

  if (ctx.fields?.ad_default_product === "1" && ["gumus", "gümüş", "altin", "altın", "siyah", "gold"].includes(n.trim())) {
    return {
      decision: POLICY_DECISION.FAQ_QUESTION,
      behavior_category: BEHAVIOR_CATEGORY.FAQ_ANSWERED,
      handoff_reason: "",
      trace: ["matched:ad_default_single_color_faq"],
    };
  }

  if (recoveredProduct && (
    ctx.extracted?.photoLink ||
    ctx.extracted?.payment ||
    hasPhoneOrIban(ctx) ||
    hasLooseAddressSignal(ctx) ||
    isColorOrVariantInfo(ctx) ||
    looksLikeShortNameOrBackText(ctx) ||
    hasAny(n, [
      "arka", "arkasi", "yazi", "yazilsin", "net mi", "net degil",
      "foto net", "gorsel", "görsel", "ornek", "örnek",
      "baska sayfadan", "başka sayfadan", "sayfanizda goremedim", "sayfanızda göremedim",
      "goz resmi", "göz resmi", "goruntu kalitesi", "görüntü kalitesi", "kalitesi dustu",
      "kalitesi düştü", "yarin sadece", "yarın sadece", "ozeniyorum", "özeniyorum",
      "satin aldim", "satın aldım", "siparisim verildi", "siparişim verildi",
      "siparis gecmistim", "sipariş geçmiştim", "yazilirsa", "yazılırsa",
      "renk olsun", "gumus renk", "gümüş renk", "gumus olsun", "gümüş olsun",
      "iban alayim", "iban alayım", "model olabilir", "yuvarlak olan",
      "canim babacim", "canım babacım", "seni seviyorum",
      "babalar gunu icin", "babalar günü için", "hediye olarak istiyorum",
      "istedigim gibi durmazsa", "istediğim gibi durmazsa", "yeniden resim",
      "yuzunu kolye", "yüzünü kolye", "daha once gormustum", "daha önce görmüştüm",
      "yolladigim anahtarlik", "yolladığım anahtarlık", "onu kolye",
      "istanbul adres", "adres", "sitenizden", "web uzerinden", "web üzerinden",
      "ilk alisveris", "ilk alışveriş",
      "cuma elimde", "cumaya yetisir", "cumaya yetişir", "babalar gununde verebileyim",
      "babalar gününde verebileyim",
      "cuma gunune gelir", "cuma gününe gelir", "cumartesi gunune gelir", "cumartesi gününe gelir",
      "pazar gelir", "simdi siparis versem", "şimdi sipariş versem",
    ])
  )) {
    return {
      decision: POLICY_DECISION.RECOVERED_CONTEXT_HANDOFF,
      behavior_category: BEHAVIOR_CATEGORY.RECOVERED_CONTEXT_HANDOFF,
      recovered_product: recoveredProduct,
      handoff_reason: "waiting_product_recovered_detail",
      trace: [`matched:waiting_product_recovered_detail:${recoveredProduct}`],
    };
  }

  return null;
}

function isPostOrderUpdate(ctx) {
  const st = stageOf(ctx);
  if (![STAGE.ORDER_COMPLETED, STAGE.WAITING_LETTERS].includes(st)) return false;
  const n = ctx.norm || "";
  const extracted = ctx.extracted || {};

  if (hasPhoneOrIban(ctx) || hasLooseAddressSignal(ctx)) return true;
  if (st === STAGE.ORDER_COMPLETED && /^[A-ZÇĞİÖŞÜa-zçğıöşü\s]+\/[A-ZÇĞİÖŞÜa-zçğıöşü\s]+$/.test(rawMessage(ctx))) return true;
  if (st === STAGE.WAITING_LETTERS && extracted.photoLink) return true;
  if (st === STAGE.ORDER_COMPLETED && looksLikeShortNameOrBackText(ctx)) return true;

  if (
    ctx.intent === "full_contact_bundle" ||
    ctx.intent === "address" ||
    ctx.intent === "address_provide_full" ||
    ctx.intent === "address_provide_partial" ||
    ctx.intent === "phone" ||
    ctx.intent === "phone_provide" ||
    extracted.hasAddress ||
    extracted.phone
  ) return true;

  return hasAny(n, [
    "fotografi gonderdim", "fotoğrafı gönderdim", "fotografi attim", "fotoğrafı attım",
    "fotografi atmistim", "fotoğrafı atmıştım", "foto atmistim", "foto atmıştım",
    "resim atmistim", "resim atmıştım", "fotograf atmistim", "fotoğraf atmıştım",
    "foto gonderdim", "foto gönderdim", "foto attim", "foto attım",
    "resim gonderdim", "resim gönderdim", "resim attim", "resim attım",
    "fotografi buydu", "fotoğrafı buydu", "foto buydu", "resim buydu",
    "odemeyi yaptim", "ödemeyi yaptım", "odeme yaptim", "ödeme yaptım",
    "dekont", "parayi attim", "parayı attım", "parayi gonderdim", "parayı gönderdim",
    "adresim sizde", "adres sizde", "numaram sizde", "telefonum sizde", "ismim sizde",
    "yukarida yazdim", "yukarıda yazdım", "yukarda yazdim", "ustte yazdim", "üstte yazdım",
    "yukarida ilettim", "yukarıda ilettim", "yukarda ilettim", "ustte ilettim", "üstte ilettim",
    "gonderdim", "gönderdim", "ilettim", "yazdim", "yazdım",
    "arkasina", "arkasına", "arka yazi", "arka yazı", "yazilsin", "yazılsın",
    "yazilacak", "yazılacak", "yazmanizi", "yazmanızı", "yazabilirsiniz",
    "yazmama gerek", "yazmaya gerek", "bir sey yazmama", "bir şey yazmama",
    "sonsuzluk isareti", "sonsuzluk işareti",
    "arkaya", "arka kismina", "arka kısmına", "on yuze", "ön yüze", "on yuz", "ön yüz",
    "onde", "önde",
    "ne yazacaksiniz", "ne yazacaksınız", "ne yazacaksiniz", "ne yazacaksınız",
    "ornek atar misin", "örnek atar mısın", "ornek atar mısın", "örnek atar misin",
    "ornek atar", "örnek atar", "ornek atabilir", "örnek atabilir",
    "isim", "tarih", "yanlis", "yanlış", "duzelt", "düzelt",
    "degistir", "değiştir", "guncelle", "güncelle", "not aldiniz", "not aldınız",
    "gumus plaka", "gümüş plaka", "siyah zincir", "siyah plaka", "plaka", "zincir",
    "renk olsun", "gold olsun", "gold olacak", "gumus olsun", "gümüş olsun",
    "gumus olacak", "gümüş olacak", "siyah plaka siyah zincir",
    "kalp koy", "kalp ekle", "kalp olsun", "yanina kalp", "yanına kalp",
    "charm", "boncuk olmasin", "boncuk olmasın", "nazar olmasin", "nazar olmasın",
    "nazar boncugu olsun", "nazar boncuğu olsun", "aksesuar olsun",
    "baska foto", "başka foto", "baska fotoda", "başka fotoda", "foto degistir", "foto değiştir",
    "atac degil anahtarlik", "ataç değil anahtarlık", "atac değil anahtarlik", "ataç degil anahtarlık",
    "mezar tasi", "mezar taşı", "resimli bileklik",
    "harflerin boyu", "harflerin boyunu", "harf boyu", "kucuk yapabiliyor", "küçük yapabiliyor",
    "okul adresi", "ev adresi", "teslimat adresi", "teslimat",
    "bir sey daha", "bir şey daha", "kucuk degisiklik", "küçük değişiklik",
    "adina gonder", "adına gönder", "adına gönderı", "ben alirim", "ben alırım",
    "olmazsam", "teslim alacak", "teslim alsin", "teslim alsın",
    "halleder", "bana atarsiniz", "bana atarsınız", "asla bitmez", "hatirasi", "hatırası",
    "yasinda", "yaşında", "vefat ettiginde", "vefat ettiğinde",
    "son attiginiz olsun", "son attığınız olsun", "yuzu degismis", "yüzü değişmiş",
    "hatira olsun", "hatıra olsun", "hazirlayinca", "hazırlayınca",
    "kalinida var dediniz", "kalınıda var dediniz", "kalini da var", "kalını da var",
    "ayni olursa", "aynı olursa", "kunye", "künye", "ebatinda", "ebatında",
    "yazmayi unut", "yazmayı unut", "beyoglu istanbul", "beyoğlu istanbul",
    "bir yuze", "bir yüze", "bir yone", "bir yöne", "diger tarafa", "diğer tarafa",
    "arka yuze olacak", "arka yüze olacak", "nazar boncuklu", "yanina kucuk nazar",
    "yanına küçük nazar", "bisey daha rica", "bişey daha rica", "takarmisiniz", "takar mısınız",
  ]);
}

function isFaq(ctx) {
  if (FAQ_INTENTS.has(ctx.intent)) return true;
  const n = ctx.norm || "";
  if (hasAny(n, [
    "hazirlandiginda benimle paylas", "hazırlandığında benimle paylaş",
    "hazirlandigin da benimle paylas", "hazırlandığın da benimle paylaş",
    "hazirlaninca paylas", "hazırlanınca paylaş", "bitince paylas", "bitince paylaş",
    "resimleri atsaydiniz", "resimleri atsaydınız", "kolyenin resmi varsa",
    "iade proseduru", "iade prosedürü", "begenmezsem", "beğenmezsem",
    "taslak halini", "gorme sansim", "görme şansım",
    "renkler ne",
  ])) return true;
  const hasQuestionShape =
    /[?]/.test(ctx.message || "") ||
    /\b(mi|mu|miyim|misiniz|mısınız|musunuz|müsünüz|midir|mudur|nedir|ne kadar|kac|kaç|nasil|nasıl|nerede|nerden|nereden|dimi)\b/.test(n) ||
    /(olur\s*mu|var\s*mi|var\s*mı|degil\s*mi|değil\s*mi|yapar misiniz|yapar mısınız|atabilirmisiniz|edebilir miyim)/.test(n);
  if (!hasQuestionShape) return false;
  return hasAny(n, [
    "fiyat", "ucret", "ücret", "toplam tutar", "tutar", "ne kadar",
    "gumus", "gümüş", "altin", "altın", "renk", "celik", "çelik", "malzeme",
    "zincir", "kargo", "teslimat", "odeme", "ödeme", "parayi", "parayı",
    "foto", "fotograf", "fotoğraf", "resim", "gorsel", "görsel", "model", "ornek", "örnek",
    "arka yuz", "arka yüz", "arkasina", "arkasına",
    "tarih", "yazi", "yazı", "yaziliyor", "yazılıyor", "yazmama", "yazmak", "isim",
    "nazar", "boncuk", "kalp", "aksesuar", "prova", "on izleme", "ön izleme", "taslak",
    "iade", "degisim", "değişim", "begenmezsem", "beğenmezsem",
    "magaza", "mağaza", "yeriniz", "trendyol", "web site", "site",
    "whatsapp", "watsapp", "whatsp", "whatsap", "telefon", "numara",
  ]);
}

function isExpectedSlotValue(ctx, missingSlots = []) {
  const st = stageOf(ctx);
  const missing = new Set(missingSlots || []);
  const intent = ctx.intent;
  const extracted = ctx.extracted || {};

  if (st === STAGE.WAITING_PRODUCT || st === "") {
    return !!ctx.product && intent === INTENT.ORDER_START;
  }

  if (st === STAGE.WAITING_PHOTO) {
    return missing.has("photo") && intent === INTENT.PHOTO && !!extracted.photoLink;
  }

  if (st === STAGE.WAITING_LETTERS) {
    return missing.has("letters") && intent === INTENT.LETTERS && !!extracted.letters;
  }

  if (st === STAGE.WAITING_PAYMENT) {
    return missing.has("payment") && intent === INTENT.PAYMENT && !!extracted.payment;
  }

  if (st === STAGE.WAITING_ADDRESS) {
    if (intent === "full_contact_bundle") return true;
    if ((missing.has("address") || missing.has("phone")) && (extracted.hasAddress || extracted.phone)) return true;
    if (missing.has("phone") && ["phone", "phone_provide"].includes(intent) && extracted.phone) return true;
    return false;
  }

  return SLOT_INTENTS.has(intent) && (extracted.photoLink || extracted.payment || extracted.hasAddress || extracted.phone || extracted.letters);
}

function isShortContextReply(ctx) {
  const n = ctx.norm || "";
  if ([
    "ack",
    "smalltalk",
    "system_message",
    "completed_gratitude",
    "completed_neutral_ack",
  ].includes(ctx.intent)) return true;
  if (hasAny(n, [
    "aciklayici oldu", "açıklayıcı oldu", "tesekkur ederim", "teşekkür ederim",
    "donus yapacagim", "dönüş yapacağım", "size donus yapacagim", "size dönüş yapacağım",
    "memnun kalirsam", "memnun kalırsam", "tavsiye edecem", "tavsiye edecegim", "tavsiye edeceğim",
    "size birakiyorum", "size bırakıyorum", "gerisini sizde", "merak ettim",
    "allah isinizi rast getirsin", "allah işinizi rast getirsin",
    "severek takiyorum", "severek takıyorum", "biraz gec dondum", "biraz geç döndüm",
    "cok sayfa var", "çok sayfa var", "bosuna cikmadiniz", "boşuna çıkmadınız",
    "yaptirmak isteyen", "yaptırmak isteyen", "merakla bekliyorum",
  ])) return true;
  const rawWords = words(ctx.message);
  if (rawWords.length > 5) return false;
  if (hasAny(n, [
    "tamam", "tamm", "tam", "tmm", "tm", "olur", "peki", "ok", "okey", "evet", "hayir", "hayır", "yok",
    "biliyorum", "olabilir", "olcak", "olacak", "yaziyorum", "yazıyorum",
    "guzel", "güzel", "bencede", "sizdende", "aynen",
    "ona gore", "ona göre", "gonderiyorum", "gönderiyorum", "gondereyim", "göndereyim",
    "atıyorum", "atiyorum", "atacagim", "atacağım", "gonderecegim", "göndereceğim",
    "bekliyorum", "hemen atiyorum", "hemen atıyorum", "istiyorum",
    "karar verip", "doneyim", "döneyim", "aciklayici oldu", "açıklayıcı oldu",
    "merhaba", "merhabalar", "selam", "selamlar", "mrb", "iyi gunler", "iyi günler",
    "iyi aksamlar", "iyi akşamlar", "iyi geceler", "kolay gelsin",
    "tesekkur", "teşekkür", "tesk", "teşk", "sagol", "sağol", "rica ederim", "allah razi olsun", "allah razı olsun",
    "anladim", "anladım", "insallah", "inşallah", "lütfen", "lutfen", "sevinirim",
    "acaba", "bu", "bisi dicem", "birsey diyecegim", "bir şey diyeceğim",
  ])) return true;
  return /^[👍🙏👌🫶❤❤️\s.]+$/u.test(String(ctx.message || "").trim());
}

function hasExpectedMissingSlot(stage, missingSlots = []) {
  const missing = new Set(missingSlots || []);
  if (stage === STAGE.WAITING_PRODUCT || stage === "") return missing.has("product");
  if (stage === STAGE.WAITING_PHOTO) return missing.has("photo");
  if (stage === STAGE.WAITING_LETTERS) return missing.has("letters");
  if (stage === STAGE.WAITING_PAYMENT) return missing.has("payment");
  if (stage === STAGE.WAITING_ADDRESS) return missing.has("address") || missing.has("phone");
  return false;
}

export function classifyDecision(ctx, missingSlots = []) {
  const stage = stageOf(ctx);
  const trace = [];
  trace.push(`stage=${stage || "(empty)"}`);
  trace.push(`intent=${ctx.intent || ""}`);
  trace.push(`missing=${(missingSlots || []).join("|") || "(none)"}`);

  if (!ORDER_FLOW_STAGES.has(stage)) {
    trace.push("unknown_stage");
  }

  if (isSeriousComplaint(ctx.norm || "")) {
    trace.push("matched:serious_complaint");
    return {
      decision: POLICY_DECISION.SERIOUS_COMPLAINT,
      behavior_category: BEHAVIOR_CATEGORY.SERIOUS_COMPLAINT_HANDOFF,
      handoff_reason: SUPPORT_REASON.OPERATIONAL,
      trace,
    };
  }

  const emptyRecovery = classifyEmptyContextRecovery(ctx);
  if (emptyRecovery) {
    trace.push(...(emptyRecovery.trace || []));
    return {
      ...emptyRecovery,
      trace,
    };
  }

  if (stage === STAGE.WAITING_LETTERS && isPostOrderUpdate(ctx)) {
    trace.push("matched:waiting_letters_post_order_update_handoff");
    return {
      decision: POLICY_DECISION.POST_ORDER_UPDATE_HANDOFF,
      behavior_category: BEHAVIOR_CATEGORY.POST_ORDER_UPDATE_HANDOFF,
      handoff_reason: "post_order_update",
      trace,
    };
  }

  const waitingContextRecovery = classifyWaitingProductRecovery(ctx);
  if (waitingContextRecovery) {
    trace.push(...(waitingContextRecovery.trace || []));
    return {
      ...waitingContextRecovery,
      trace,
    };
  }

  if (isPostOrderUpdate(ctx)) {
    trace.push("matched:post_order_update_handoff");
    return {
      decision: POLICY_DECISION.POST_ORDER_UPDATE_HANDOFF,
      behavior_category: BEHAVIOR_CATEGORY.POST_ORDER_UPDATE_HANDOFF,
      handoff_reason: "post_order_update",
      trace,
    };
  }

  if (isOperational(ctx)) {
    trace.push("matched:operational");
    return {
      decision: POLICY_DECISION.OPERATIONAL_HANDOFF,
      behavior_category: BEHAVIOR_CATEGORY.OPERATIONAL_HANDOFF,
      handoff_reason: SUPPORT_REASON.OPERATIONAL,
      trace,
    };
  }

  if (isExpectedSlotValue(ctx, missingSlots)) {
    trace.push("matched:expected_slot_value");
    return {
      decision: POLICY_DECISION.EXPECTED_SLOT_VALUE,
      behavior_category: BEHAVIOR_CATEGORY.SLOT_COMMITTED,
      trace,
    };
  }

  if (isFaq(ctx)) {
    trace.push("matched:faq_question");
    return {
      decision: POLICY_DECISION.FAQ_QUESTION,
      behavior_category: BEHAVIOR_CATEGORY.FAQ_ANSWERED,
      trace,
    };
  }

  if (isShortContextReply(ctx)) {
    trace.push("matched:short_context_reply");
    return {
      decision: POLICY_DECISION.SHORT_CONTEXT_REPLY,
      behavior_category: BEHAVIOR_CATEGORY.CONTEXTUAL_ACK,
      trace,
    };
  }

  if (!stage && !ctx.product && hasAny(ctx.norm || "", ["gumus", "gümüş", "altin", "altın", "siyah", "gold"])) {
    trace.push("matched:ambiguous_color_without_context");
    return {
      decision: POLICY_DECISION.AMBIGUOUS,
      behavior_category: BEHAVIOR_CATEGORY.AMBIGUOUS_NEEDS_REVIEW,
      trace,
    };
  }

  if (hasExpectedMissingSlot(stage, missingSlots)) {
    trace.push("matched:expected_slot_reminder");
    return {
      decision: POLICY_DECISION.EXPECTED_SLOT_REMINDER,
      behavior_category: BEHAVIOR_CATEGORY.EXPECTED_SLOT_REMINDER,
      slot_prompt_reason: `missing_${missingSlots[0] || "slot"}`,
      trace,
    };
  }

  trace.push("matched:ambiguous");
  return {
    decision: POLICY_DECISION.AMBIGUOUS,
    behavior_category: BEHAVIOR_CATEGORY.AMBIGUOUS_NEEDS_REVIEW,
    trace,
  };
}

export function categorizeCurrentBehavior(result = {}) {
  const source = result?._debug?.source || result?._meta?.replySource || "";
  const replyClass = result?.reply_class || "";
  if (result?.last_intent === "error") return BEHAVIOR_CATEGORY.ENGINE_ERROR;
  if (replyClass === REPLY_CLASS.OPERATIONAL_REQUIRED || result?.support_mode === "1") return BEHAVIOR_CATEGORY.OPERATIONAL_HANDOFF;
  if (source === "fallback" || replyClass === REPLY_CLASS.FALLBACK) return BEHAVIOR_CATEGORY.WRONG_ROUTE_SUSPECTED;
  if (source === "slot_commit" || source === "photo_remembered") return BEHAVIOR_CATEGORY.SLOT_COMMITTED;
  if (source === "deterministic" || source === "deterministic_combined" || source === "completed") return BEHAVIOR_CATEGORY.FAQ_ANSWERED;
  if (source === "tone" || source === "smalltalk") return BEHAVIOR_CATEGORY.CONTEXTUAL_ACK;
  if (source === "product_flow") return BEHAVIOR_CATEGORY.SLOT_COMMITTED;
  return BEHAVIOR_CATEGORY.FAQ_ANSWERED;
}

export function shouldReviewBehavior(category) {
  return [
    BEHAVIOR_CATEGORY.AMBIGUOUS_NEEDS_REVIEW,
    BEHAVIOR_CATEGORY.WRONG_ROUTE_SUSPECTED,
    BEHAVIOR_CATEGORY.ENGINE_ERROR,
  ].includes(category);
}

export function isPolicyV2(value) {
  return String(value || "").toLowerCase() === "v2";
}




