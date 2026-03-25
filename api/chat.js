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
  } catch (err) {
    console.warn(`Knowledge file missing: ${filename}`);
    return "";
  }
}

function unwrapManychatValue(value) {
  if (value === null || value === undefined) return "";

  let str = String(value).trim();

  str = str.replace(/^\{\{\{?/, "").replace(/\}\}\}?$/, "").trim();

  if (/^\{[^}]+\}$/.test(str)) {
    return "";
  }

  if (
    !str ||
    str.toLowerCase() === "no field selected" ||
    str.toLowerCase() === "undefined" ||
    str.toLowerCase() === "null"
  ) {
    return "";
  }

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

function normalizeStageName(stage) {
  const s = normalizeText(stage);
  if (!s) return "";

  if (s.includes("photo_wait")) return "photo_waiting";
  if (s.includes("photo_receive")) return "photo_received";
  if (s.includes("letter_wait")) return "letter_waiting";
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

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function countMatches(text, phrases = []) {
  let score = 0;
  for (const phrase of phrases) {
    if (text.includes(normalizeText(phrase))) score++;
  }
  return score;
}

function hasPhoneNumber(text) {
  const cleaned = String(text || "").replace(/\s+/g, " ");
  return /(\+?\d[\d\s]{8,}\d)/.test(cleaned);
}

function looksLikeAddressMessage(text) {
  const msg = normalizeText(text);

  const addressKeywords = [
    "mahalle", "mah", "sokak", "sk", "cadde", "cd", "no", "daire", "kat",
    "apartman", "apt", "site", "blok", "ilce", "ilçe", "semt",
    "istanbul", "ankara", "izmir", "turkiye", "türkiye",
    "sisli", "şişli", "umraniye", "ümraniye", "beykoz", "kadikoy", "kadıköy"
  ];

  const hitCount = addressKeywords.filter((k) => msg.includes(normalizeText(k))).length;
  const lineCount = String(text || "")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean).length;

  return hasPhoneNumber(text) && (hitCount >= 2 || lineCount >= 3);
}

function detectPaymentMethod(text) {
  const msg = normalizeText(text);
  if (includesAny(msg, ["kapida", "kapi", "kapıda", "kapı"])) return "kapida_odeme";
  if (includesAny(msg, ["eft", "havale", "iban", "transfer"])) return "eft";
  return "";
}

function hasPhotoHint(text) {
  const msg = normalizeText(text);
  return includesAny(msg, [
    "fotograf", "fotoğraf", "foto", "resim", "gorsel", "görsel",
    "ekran goruntusu", "ekran görüntüsü", "vesikalik", "vesikalık"
  ]);
}

function detectTopic(userMessage, historyText = "") {
  const text = normalizeText(`${historyText} ${userMessage}`);
  const last = normalizeText(userMessage);

  const priceWords = [
    "fiyat", "fiyati", "fiyat nedir", "fiyati nedir",
    "ne kadar", "kac tl", "kaç tl", "ucret", "ücret",
    "kac para", "kaç para", "ne tutar", "toplam ne kadar",
    "indirim", "indirim var mi", "indirim olur mu",
    "kampanya", "kampanya var mi",
    "2li", "2 li", "ikili", "iki li",
    "coklu alim", "çoklu alım", "toplu alim", "toplu alım",
    "adet fiyati", "adet fiyatı",
    "2 tane", "iki tane", "3 tane", "uc tane", "üç tane",
    "eft fiyati", "eft fiyatı",
    "havale fiyati", "havale fiyatı",
    "kapida odeme fiyati", "kapıda ödeme fiyatı",
    "fiyat farki", "fiyat farkı",
    "ayni fiyattan", "aynı fiyattan"
  ];

  const paymentWords = [
    "kapida odeme", "kapıda ödeme",
    "eft", "havale", "iban", "odeme", "ödeme",
    "odeme nasil", "ödeme nasıl",
    "nasil odeyecegim", "nasıl ödeyeceğim",
    "dekont", "ekran goruntusu", "ekran görüntüsü",
    "aciklama ne yazayim", "açıklama ne yazayım",
    "odeme yaptim", "ödeme yaptım",
    "eft attim", "eft attım",
    "havale yaptim", "havale yaptım",
    "kapida odeme var mi", "kapıda ödeme var mı",
    "kapida odeme olur mu", "kapıda ödeme olur mu",
    "once urun gelsin", "önce ürün gelsin",
    "guvenemiyorum", "güvenemiyorum",
    "odeme atsam", "ödeme atsam"
  ];

  const shippingWords = [
    "kargo", "kargom", "kargoya", "kargoya verildi", "kargoya verildi mi",
    "teslim", "teslimat", "takip", "takip no", "takip numarasi", "takip numarası",
    "ptt", "aras", "yola cikti", "yola çıktı",
    "gelmedi", "urun gelmedi", "ürün gelmedi",
    "gecikti", "geçikti", "kargo gelmedi",
    "ptt yavas", "ptt yavaş",
    "sms gelmedi", "kargo sms",
    "hangi kargo", "hangi kargo ile", "kargo firmasi", "kargo firması",
    "adresi yanlis verdim", "adresi yanlış verdim",
    "adres degisecek", "adres değişecek",
    "hizli kargo", "hızlı kargo",
    "acil lazim", "acil lazım",
    "bugun cikar mi", "bugün çıkar mı",
    "ne zaman gelir", "ne zaman gelir acaba"
  ];

  const imageWords = [
    "fotograf", "fotoğraf", "foto", "resim", "gorsel", "görsel",
    "fotograf olur mu", "fotoğraf olur mu", "resim olur mu",
    "uygun olur mu", "uygun mu",
    "net mi", "bulanık", "karanlik", "karanlık",
    "vesikalik", "vesikalık",
    "eski foto", "uzaktan cekim", "uzaktan çekim",
    "iki kisi", "iki kişi", "uc kisi", "üç kişi", "3 kisi", "3 kişi",
    "4 kisi", "4 kişi", "aile fotosu", "bebek fotosu",
    "birlestirme", "birleştirme",
    "iki fotograf", "iki fotoğraf",
    "uc fotograf", "üç fotoğraf", "3 fotograf", "3 fotoğraf",
    "3 resim", "2 foto",
    "arka yuz", "arka yüz", "on yuz", "ön yüz",
    "onune", "önüne", "arkaya",
    "arkali onlu", "arkalı önlü",
    "cift fotograf", "çift fotoğraf",
    "tek zincir iki fotograf", "tek zincir iki fotoğraf",
    "tasarim", "tasarım",
    "lazer sonrasi", "lazer sonrası",
    "son hali", "son hâli",
    "kalp", "nazar boncugu", "nazar boncuğu", "aksesuar"
  ];

  const trustWords = [
    "guven", "güven", "guvenilir", "güvenilir",
    "garanti", "kalite", "kaliteli mi", "kaliteli olur mu",
    "kararma", "solma", "paslanma", "kaplama atma",
    "dolandir", "dolandır",
    "emin olabilir miyim",
    "saglam mi", "sağlam mı",
    "iade", "degisim", "değişim", "iade var mi", "iade var mı"
  ];

  const orderWords = [
    "siparis", "sipariş",
    "siparis vermek istiyorum", "sipariş vermek istiyorum",
    "almak istiyorum",
    "yaptirmak istiyorum", "yaptırmak istiyorum",
    "hazirlayalim", "hazırlayalım",
    "adres", "acik adres", "açık adres",
    "telefon", "cep telefonu", "ad soyad",
    "ilce", "ilçe", "mahalle", "sokak", "apartman", "daire",
    "isim soyisim", "numara",
    "gonderiyorum", "gönderiyorum",
    "arkasina yaz", "arkasına yaz",
    "dua yaz", "isim yaz",
    "sari olsun", "sarı olsun",
    "gumus olsun", "gümüş olsun",
    "erkek icin", "erkek için",
    "not olsun", "not ekleyelim"
  ];

  const smalltalkWords = [
    "tesekkur", "teşekkür", "tesekkur ederim", "teşekkür ederim",
    "saol", "sagol", "sağol", "sağ ol",
    "merhaba", "selam", "selamun aleykum", "selamün aleyküm",
    "tamam", "olur", "peki", "anladim", "anladım",
    "super", "süper", "iyi gunler", "iyi günler",
    "iyi aksamlar", "iyi akşamlar", "gorusuruz", "görüşürüz",
    "tamamdir", "tamamdır", "aynen", "ok", "okey",
    "rica ederim", "ne demek"
  ];

  const scores = {
    pricing: countMatches(text, priceWords),
    payment: countMatches(text, paymentWords),
    shipping: countMatches(text, shippingWords),
    image: countMatches(text, imageWords),
    trust: countMatches(text, trustWords),
    order: countMatches(text, orderWords),
    smalltalk: countMatches(text, smalltalkWords)
  };

  const shortPriceAsks = ["fiyat", "ne kadar", "kac tl", "kaç tl", "ucret", "ücret", "kac para", "kaç para"];
  if (shortPriceAsks.includes(last)) return "pricing";

  if (includesAny(last, ["kapida odeme", "kapıda ödeme", "eft", "havale", "iban", "odeme", "ödeme", "dekont"])) {
    scores.payment += 3;
  }

  if (includesAny(last, ["kargo", "ptt", "aras", "takip", "teslim", "gelmedi", "gecikti", "geçikti"])) {
    scores.shipping += 3;
  }

  if (includesAny(last, ["fotograf", "fotoğraf", "foto", "resim", "arka yuz", "arka yüz", "on yuz", "ön yüz", "arkaya", "onune", "önüne", "birlestirme", "birleştirme"])) {
    scores.image += 3;
  }

  if (includesAny(last, ["siparis", "sipariş", "adres", "ad soyad", "cep telefonu", "mahalle", "sokak", "ilce", "ilçe"])) {
    scores.order += 3;
  }

  if (includesAny(last, ["guven", "güven", "garanti", "kalite", "kararma", "solma", "paslanma"])) {
    scores.trust += 3;
  }

  if (["tamam", "olur", "peki", "aynen", "super", "süper", "tesekkur", "teşekkür", "saol", "sağol", "anladim", "anladım"].includes(last)) {
    return "smalltalk";
  }

  if (scores.pricing > 0 && includesAny(text, ["fiyat", "ne kadar", "kac tl", "kaç tl"])) {
    scores.pricing += 2;
  }

  if (includesAny(last, ["kapida odeme var mi", "kapıda ödeme var mı"])) {
    scores.payment += 4;
  }

  if (includesAny(last, ["indirim", "2li", "2 li", "coklu alim", "çoklu alım"])) {
    scores.pricing += 4;
  }

  if (includesAny(last, ["olur mu"]) && includesAny(last, ["fotograf", "fotoğraf", "resim", "kisi", "kişi", "arka", "ön"])) {
    scores.image += 2;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestTopic, bestScore] = sorted[0];

  if (bestScore <= 0) return "general";
  return bestTopic;
}

function detectProduct(userMessage, historyText = "", existingProduct = "") {
  const text = normalizeText(`${historyText} ${userMessage}`);
  const last = normalizeText(userMessage);
  const existing = normalizeText(existingProduct);

  if (existing.includes("lazer") || existing.includes("laser")) return "laser";
  if (existing.includes("atac") || existing.includes("ataç") || existing.includes("harf")) return "atac";

  const laserHints = [
    "resimli", "fotografli", "fotoğraflı", "foto", "fotograf", "fotoğraf",
    "cocuk resimli", "çocuk resimli",
    "arka yazi", "arka yazı",
    "arka yuz", "arka yüz", "on yuz", "ön yüz",
    "plaka", "lazer", "resimli olan",
    "fotografli kolye", "fotoğraflı kolye",
    "iki fotograf", "iki fotoğraf",
    "3 fotograf", "3 fotoğraf",
    "arkali onlu", "arkalı önlü",
    "dua yazisi", "dua yazısı"
  ];

  const atacHints = [
    "atac", "ataç", "harfli", "harf", "harfler",
    "isim kolye", "3 harf", "4 harf", "5 harf", "6 harf",
    "bileklik hediye", "ataç kolye", "harfli kolye"
  ];

  let laserScore = countMatches(text, laserHints);
  let atacScore = countMatches(text, atacHints);

  if (includesAny(last, ["resimli", "fotografli", "fotoğraflı", "resimli olan"])) laserScore += 3;
  if (includesAny(last, ["atac", "ataç", "harfli", "harf"])) atacScore += 3;

  if (laserScore > atacScore && laserScore > 0) return "laser";
  if (atacScore > laserScore && atacScore > 0) return "atac";

  return "unknown";
}

function pickKnowledgeFiles(message, product, conversationStage = "", historyText = "") {
  const topic = detectTopic(message, historyText);
  const detectedProduct = detectProduct(message, historyText, product);
  const stage = normalizeText(conversationStage);

  const commonFiles = [
    "SYSTEM_MASTER.txt",
    "ROUTING_RULES.txt",
    "EDGE_CASES.txt",
    "FEW_SHOT_EXAMPLES.txt",
    "CORE_SYSTEM.txt"
  ];

  const files = [...commonFiles];

  const topicFiles = {
    pricing: ["PRICING.txt"],
    payment: ["PAYMENT.txt", "PRICING.txt"],
    shipping: ["SHIPPING.txt"],
    image: ["IMAGE_RULES.txt"],
    trust: ["TRUST.txt"],
    order: ["ORDER_FLOW.txt"],
    smalltalk: ["SMALLTALK.txt"],
    general: []
  };

  const productFiles = {
    laser: ["PRODUCT_LASER.txt"],
    atac: ["PRODUCT_ATAC.txt"],
    unknown: []
  };

  if (stage.includes("photo_wait") || stage.includes("photo_receive") || stage.includes("back_text_wait")) {
    files.push("IMAGE_RULES.txt", "ORDER_FLOW.txt");
  } else if (stage.includes("letter_wait")) {
    files.push("ORDER_FLOW.txt");
  } else if (stage.includes("payment")) {
    files.push("PAYMENT.txt", "PRICING.txt");
  } else if (stage.includes("address")) {
    files.push("ORDER_FLOW.txt", "PAYMENT.txt");
  }

  files.push(...(topicFiles[topic] || []));
  files.push(...(productFiles[detectedProduct] || []));

  return [...new Set(files)];
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

function buildHistoryText(ctx) {
  return [
    ctx.ilgilenilenUrun ? `urun: ${ctx.ilgilenilenUrun}` : "",
    ctx.conversationStage ? `stage: ${ctx.conversationStage}` : "",
    ctx.photoReceived ? `photo_received: ${ctx.photoReceived}` : "",
    ctx.paymentMethod ? `payment_method: ${ctx.paymentMethod}` : "",
    ctx.lastIntent ? `last_intent: ${ctx.lastIntent}` : "",
    ctx.orderStatus ? `order_status: ${ctx.orderStatus}` : "",
    ctx.backTextStatus ? `back_text_status: ${ctx.backTextStatus}` : "",
    ctx.addressStatus ? `address_status: ${ctx.addressStatus}` : "",
    ctx.supportMode ? `support_mode: ${ctx.supportMode}` : "",
    ctx.siparisAlindi ? `siparis_alindi: ${ctx.siparisAlindi}` : "",
    ctx.cancelReason ? `cancel_reason: ${ctx.cancelReason}` : "",
    ctx.contextLock ? `context_lock: ${ctx.contextLock}` : "",
    ctx.aiReply ? `onceki_ai: ${ctx.aiReply}` : ""
  ].filter(Boolean).join("\n");
}

function hasForbiddenPrice(text) {
  return /\b349\b|\b399\b|\b449\b/.test(String(text || ""));
}

function mentionsSinglePriceOnly(text) {
  const normalized = normalizeText(text);
  const has599 = normalized.includes("599");
  const has649 = normalized.includes("649");
  const has499 = normalized.includes("499");
  const has549 = normalized.includes("549");

  return (
    (has599 && !has649) ||
    (!has599 && has649) ||
    (has499 && !has549) ||
    (!has499 && has549)
  );
}

function looksLikeAddressRequest(text) {
  const normalized = normalizeText(text);
  return (
    normalized.includes("ad soyad") ||
    normalized.includes("acik adres") ||
    normalized.includes("cep telefonu") ||
    normalized.includes("telefon numaraniz") ||
    normalized.includes("adres bilgilerinizi") ||
    normalized.includes("adresinizi yazar misiniz")
  );
}

function canChangePayment(ctx) {
  const orderStatus = normalizeText(ctx.orderStatus || "active");
  return orderStatus !== "completed" && orderStatus !== "cancelled";
}

function applyHardGuards({ answer, ctx, topic, product }) {
  let text = String(answer || "").trim();
  const normalizedUser = normalizeText(ctx.message);

  if (!text) {
    return "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";
  }

  if (hasForbiddenPrice(text)) {
    if (product === "laser") {
      return "EFT / havale fiyatımız 599 TL, kapıda ödeme fiyatımız 649 TL'dir efendim 😊";
    }
    if (product === "atac") {
      return "EFT / havale fiyatımız 499 TL, kapıda ödeme fiyatımız 549 TL'dir efendim 😊";
    }
  }

  const shortPriceAsks = ["fiyat", "ne kadar", "kac tl", "kaç tl", "ucret", "ücret", "kac para", "kaç para"];
  if (shortPriceAsks.includes(normalizedUser) && mentionsSinglePriceOnly(text)) {
    if (product === "laser") {
      return "EFT / havale fiyatımız 599 TL, kapıda ödeme fiyatımız 649 TL'dir efendim 😊";
    }
    if (product === "atac") {
      return "EFT / havale fiyatımız 499 TL, kapıda ödeme fiyatımız 549 TL'dir efendim 😊";
    }
  }

  if (
    includesAny(normalizedUser, ["kapida odeme var mi", "kapıda ödeme var mı", "kapida odeme", "kapıda ödeme"]) &&
    topic === "payment"
  ) {
    if (product === "laser" && !normalizeText(text).includes("649")) {
      return "Evet efendim, kapıda ödeme seçeneğimiz mevcut. Kapıda ödeme fiyatımız 649 TL'dir 😊";
    }
    if (product === "atac" && !normalizeText(text).includes("549")) {
      return "Evet efendim, kapıda ödeme seçeneğimiz mevcut. Kapıda ödeme fiyatımız 549 TL'dir 😊";
    }
  }

  if (
    product === "laser" &&
    ctx.photoReceived !== "yes" &&
    !hasPhotoHint(ctx.message) &&
    looksLikeAddressRequest(text)
  ) {
    return "Fotoğrafı buradan gönderebilirsiniz efendim 😊";
  }

  if (
    includesAny(normalizedUser, [
      "3 plaka", "2 plaka", "bir zincirde 3", "bir zincirde 2",
      "ayni zincirde 3", "aynı zincirde 3", "ayni zincirde 2", "aynı zincirde 2"
    ])
  ) {
    return "Bu şekilde yapmıyoruz efendim, bir zincirde tek plaka oluyor 😊";
  }

  if (includesAny(normalizedUser, ["kalp", "nazar boncugu", "nazar boncuğu", "aksesuar"])) {
    const n = normalizeText(text);
    if (
      n.includes("siyah kalp") ||
      n.includes("kucuk nazar") ||
      n.includes("buyuk nazar") ||
      n.includes("küçük nazar") ||
      n.includes("büyük nazar")
    ) {
      return "Pembe kalbimiz ve nazar boncuğumuz mevcut efendim 😊";
    }
  }

  if (includesAny(normalizedUser, ["3 kisi", "3 kişi", "3 fotograf", "3 fotoğraf", "3 resim"])) {
    const n = normalizeText(text);
    if (n.includes("2 kisi") || n.includes("2 kişi") || n.includes("2 fotograf") || n.includes("2 fotoğraf")) {
      return "Tabi efendim, 3 fotoğraf da uygulanabiliyor 😊";
    }
  }

  if (
    includesAny(normalizedUser, ["onune", "önüne", "arkaya", "arka yuz", "arka yüz", "on yuz", "ön yüz", "arkali onlu", "arkalı önlü"]) &&
    includesAny(normalizedUser, ["abla", "kardes", "kardeş", "anne", "baba", "foto", "fotograf", "fotoğraf"])
  ) {
    const n = normalizeText(text);
    if (!n.includes("fiyat farki") && !n.includes("fiyat farkı")) {
      return "Tabi efendim, ön yüze bir fotoğraf, arka yüze bir fotoğraf yapabiliyoruz. Fiyat farkı da olmuyor 😊";
    }
  }

  return text;
}

function finalizeOutput(parsed, ctx, topic, product) {
  const reply = applyHardGuards({
    answer: parsed?.reply?.trim() || "",
    ctx,
    topic,
    product
  });

  let setConversationStage = normalizeStageName(
    unwrapManychatValue(parsed?.set_conversation_stage || "")
  );
  const setPhotoReceived = unwrapManychatValue(parsed?.set_photo_received || "");
  const setPaymentMethod = unwrapManychatValue(parsed?.set_payment_method || "");
  const setMenuGosterildi = unwrapManychatValue(parsed?.set_menu_gosterildi || "");
  const setLastIntent = unwrapManychatValue(parsed?.set_last_intent || "");
  const setIlgilenilenUrun = unwrapManychatValue(parsed?.set_ilgilenilen_urun || "");
  const setOrderStatus = unwrapManychatValue(parsed?.set_order_status || "");
  const setBackTextStatus = unwrapManychatValue(parsed?.set_back_text_status || "");
  const setAddressStatus = unwrapManychatValue(parsed?.set_address_status || "");
  const setSupportMode = unwrapManychatValue(parsed?.set_support_mode || "");
  const setSiparisAlindi = unwrapManychatValue(parsed?.set_siparis_alindi || "");
  const setCancelReason = unwrapManychatValue(parsed?.set_cancel_reason || "");
  const setContextLock = unwrapManychatValue(parsed?.set_context_lock || "");

  if (ctx.conversationStage === "address_received" && setConversationStage === "address_waiting") {
    setConversationStage = "address_received";
  }

  if (ctx.conversationStage === "payment_selected" && setConversationStage === "address_waiting") {
    setConversationStage = "payment_selected";
  }

  if (ctx.photoReceived !== "yes" && setPhotoReceived === "yes" && !hasPhotoHint(ctx.message)) {
    return {
      reply,
      set_conversation_stage: setConversationStage,
      set_last_intent: setLastIntent,
      set_ilgilenilen_urun: setIlgilenilenUrun,
      set_photo_received: "",
      set_payment_method: setPaymentMethod,
      set_order_status: setOrderStatus,
      set_back_text_status: setBackTextStatus,
      set_address_status: setAddressStatus,
      set_support_mode: setSupportMode,
      set_siparis_alindi: setSiparisAlindi,
      set_cancel_reason: setCancelReason,
      set_context_lock: setContextLock,
      set_menu_gosterildi: setMenuGosterildi
    };
  }

  return {
    reply,
    set_conversation_stage: setConversationStage,
    set_last_intent: setLastIntent,
    set_ilgilenilen_urun: setIlgilenilenUrun,
    set_photo_received: setPhotoReceived,
    set_payment_method: setPaymentMethod,
    set_order_status: setOrderStatus,
    set_back_text_status: setBackTextStatus,
    set_address_status: setAddressStatus,
    set_support_mode: setSupportMode,
    set_siparis_alindi: setSiparisAlindi,
    set_cancel_reason: setCancelReason,
    set_context_lock: setContextLock,
    set_menu_gosterildi: setMenuGosterildi
  };
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

    console.log("MANYCHAT BODY:", JSON.stringify({
      message: ctx.message,
      ilgilenilenUrun: ctx.ilgilenilenUrun,
      conversationStage: ctx.conversationStage,
      photoReceived: ctx.photoReceived,
      paymentMethod: ctx.paymentMethod,
      menuGosterildi: ctx.menuGosterildi,
      aiReply: ctx.aiReply,
      lastIntent: ctx.lastIntent,
      orderStatus: ctx.orderStatus,
      backTextStatus: ctx.backTextStatus,
      addressStatus: ctx.addressStatus,
      supportMode: ctx.supportMode,
      siparisAlindi: ctx.siparisAlindi,
      cancelReason: ctx.cancelReason,
      contextLock: ctx.contextLock,
      fullContactDataId: fullContactData?.id || "",
      fullContactDataIgId: fullContactData?.ig_id || ""
    }, null, 2));

    if (!ctx.message) {
      return res.status(200).json({
        reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
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

    // Sipariş iptal akışı
    if (includesAny(normalizeText(ctx.message), [
      "iptal", "vazgectim", "vazgectim", "istemiyorum", "olmasin", "gerek kalmadi", "gerek kalmadı"
    ])) {
      return res.status(200).json({
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
      });
    }

    // ADDRESS_WAITING → telefon gelince adres kaydedildi + ödeme sor
    if (ctx.conversationStage === "address_waiting") {
      if (looksLikeAddressMessage(ctx.message)) {
        return res.status(200).json({
          reply: "Tabi efendim 😊 Adresiniz kaydedildi, teşekkürler. Ödemeniz nasıl olacak efendim? EFT / havale veya kapıda ödeme seçeneklerimiz mevcut.",
          set_conversation_stage: "address_received",
          set_last_intent: "address",
          set_ilgilenilen_urun: "",
          set_photo_received: "",
          set_payment_method: "",
          set_order_status: "active",
          set_back_text_status: "",
          set_address_status: "received",
          set_support_mode: "",
          set_siparis_alindi: "",
          set_cancel_reason: "",
          set_context_lock: "order_locked",
          set_menu_gosterildi: ""
        });
      }

      return res.status(200).json({
        reply: "__SKIP__",
        set_conversation_stage: "address_waiting",
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

    // PHOTO_RECEIVED → arka yazı / arka taraf netleştiyse adres sor
    if (ctx.conversationStage === "photo_received") {
      const msg = normalizeText(ctx.message);

      const backProvidedKeywords = [
        "arkaya", "arkasina", "arka tarafa", "arka yuze", "arka yüze",
        "yazalim", "yazsin", "yazin", "dua", "isim", "bos kalsin", "boş kalsın",
        "arkaya fotograf", "arkaya fotoğraf", "arkaya foto", "arkaya resim"
      ];

      const backProvided = backProvidedKeywords.some((k) => msg.includes(normalizeText(k)));

      if (backProvided) {
        return res.status(200).json({
          reply: "Tabi efendim 😊 Sipariş için şu bilgileri alabilir miyiz?\n\n- İsim Soyisim\n- Açık Adres\n- Cep Telefonu",
          set_conversation_stage: "address_waiting",
          set_last_intent: "order_detail",
          set_ilgilenilen_urun: "",
          set_photo_received: "yes",
          set_payment_method: "",
          set_order_status: "active",
          set_back_text_status: "provided",
          set_address_status: "waiting",
          set_support_mode: "",
          set_siparis_alindi: "",
          set_cancel_reason: "",
          set_context_lock: "order_locked",
          set_menu_gosterildi: ""
        });
      }
    }

    // Ödeme değişebilir: sipariş tamamlanmadıysa son tercih geçerli
    if (canChangePayment(ctx)) {
      const payment = detectPaymentMethod(ctx.message);
      if (payment && (ctx.conversationStage === "address_received" || ctx.conversationStage === "payment_selected")) {
        if (payment === "eft") {
          return res.status(200).json({
            reply: "Tamamdır efendim 😊 IBAN bilgimiz:\nTR34 0015 7000 0000 0076 2524 67\nAlıcı: Servet Cihan Nakipoğlu",
            set_conversation_stage: "payment_selected",
            set_last_intent: "payment",
            set_ilgilenilen_urun: "",
            set_photo_received: "",
            set_payment_method: "eft",
            set_order_status: "active",
            set_back_text_status: "",
            set_address_status: "",
            set_support_mode: "",
            set_siparis_alindi: "evet",
            set_cancel_reason: "",
            set_context_lock: "order_locked",
            set_menu_gosterildi: ""
          });
        }

        return res.status(200).json({
          reply: "Tamamdır efendim 😊 Kapıda ödeme ile siparişiniz hazırlanacaktır.",
          set_conversation_stage: "payment_selected",
          set_last_intent: "payment",
          set_ilgilenilen_urun: "",
          set_photo_received: "",
          set_payment_method: "kapida_odeme",
          set_order_status: "active",
          set_back_text_status: "",
          set_address_status: "",
          set_support_mode: "",
          set_siparis_alindi: "evet",
          set_cancel_reason: "",
          set_context_lock: "order_locked",
          set_menu_gosterildi: ""
        });
      }
    }

    // İlk ödeme seçimi: ürün bilgisi varsa fiyatla birlikte
    if (!ctx.conversationStage || ctx.conversationStage === "photo_received" || ctx.conversationStage === "address_received") {
      const payment = detectPaymentMethod(ctx.message);
      if (payment && canChangePayment(ctx) && ctx.conversationStage !== "payment_selected") {
        const product = detectProduct(ctx.message, buildHistoryText(ctx), ctx.ilgilenilenUrun);
        const isAtac = product === "atac";
        const fiyat = payment === "eft"
          ? (isAtac ? "499 TL" : "599 TL")
          : (isAtac ? "549 TL" : "649 TL");
        const odeme = payment === "eft" ? "EFT / havale" : "Kapıda ödeme";

        const msg = `Tabi efendim 😊 ${odeme} fiyatımız ${fiyat}'dir. Sipariş için şu bilgileri alabilir miyiz?\n\n- İsim Soyisim\n- Açık Adres\n- Cep Telefonu`;

        return res.status(200).json({
          reply: msg,
          set_conversation_stage: "address_waiting",
          set_last_intent: "payment",
          set_ilgilenilen_urun: product === "laser" ? "lazer" : product === "atac" ? "atac" : "",
          set_photo_received: "",
          set_payment_method: payment,
          set_order_status: "active",
          set_back_text_status: "",
          set_address_status: "waiting",
          set_support_mode: "",
          set_siparis_alindi: "",
          set_cancel_reason: "",
          set_context_lock: "order_locked",
          set_menu_gosterildi: ""
        });
      }
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
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

    const historyText = buildHistoryText(ctx);
    const topic = detectTopic(ctx.message, historyText);
    const product = detectProduct(ctx.message, historyText, ctx.ilgilenilenUrun);

    const selectedFiles = pickKnowledgeFiles(
      ctx.message,
      ctx.ilgilenilenUrun,
      ctx.conversationStage,
      historyText
    );

    const knowledgeText = selectedFiles
      .map((file) => {
        const content = safeReadKnowledgeFile(file);
        return content ? `### ${file}\n${content}` : "";
      })
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = `
Sen Yudum Jewels için çalışan bir Instagram satış asistanısın.

GÖREVİN:
- Kısa, net, doğal ve satış odaklı cevap vermek.
- Gerekirse state/field değişikliği önermek.
- Sadece verilen bilgi dosyalarına göre cevap vermek.
- Bilmediğin konuda asla uydurmamak.
- Dosyalarda olmayan fiyat, kampanya, ürün özelliği veya süre üretmemek.

GENEL KURALLAR:
- Bilgi yoksa şu cevabı ver:
Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊
- Eğer ilgilenilen_urun doluysa bunu öncelikli ürün bilgisi kabul et.
- Ürün belirtilmemişse ve ilgilenilen_urun da boşsa, cevap ürüne göre değişiyorsa hangi model ile ilgilendiğini sor.
- Müşteri sormadıkça ek ücretli veya opsiyonel bilgileri söyleme.
- Cevap verirken yalnızca sorulan şeyi cevapla.
- Ek açıklama, öneri veya alternatif sunma.
- Ürünleri birbirine karıştırma.
- Belirsiz ifadelerde tahmin yapma; gerekirse kısa netleştirme sorusu sor.
- Müşteri daha önce hangi aşamadaysa, tekrar merhaba diyerek başa dönme.
- Kısa cevapları bağlama göre yorumla.
- Fiyat sorularında yalnızca PRICING dosyasındaki fiyatları kullan.
- 349 TL, 399 TL, 449 TL gibi dosyada olmayan fiyatlar ASLA yazılamaz.
- Siyah kalp, küçük nazar boncuğu, büyük nazar boncuğu gibi seçenekler açma.
- Sadece pembe kalp ve nazar boncuğu bilgisi ver.
- Resimli lazer kolyede fotoğraf gelmeden adres isteme.
- Müşteri görsele cevap veriyorsa ve ürün belli ise yeniden ürün sorma.

BAĞLAM KURALLARI:
- conversation_stage çok önemlidir.
- photo_received=yes ise tekrar fotoğraf isteyemezsin.
- conversation_stage=photo_waiting ise müşteri fotoğraf, fotoğraf düzeni, kişi sayısı, ön/arka yüz düzeni gibi sipariş detaylarını yazıyor olabilir.
- conversation_stage=photo_received ise müşterinin kısa mesajlarını sipariş detayı olarak yorumla.
- conversation_stage=photo_received iken müşteri arka yüze yazı, fotoğraf veya boş bırakma tercihini net söylerse set_back_text_status="provided" dön.
- conversation_stage=photo_received iken müşteri arka taraf için karar verdiyse set_conversation_stage="address_waiting" dön.
- conversation_stage=address_received ise müşteri adresini zaten vermiş kabul et.
- conversation_stage=address_received veya conversation_stage=payment_selected ise tekrar adres isteme.
- Müşteri tek mesajda ad soyad, telefon numarası ve açık adres benzeri bilgiler yazdıysa bunu adres bilgisi olarak kabul et ve set_address_status="received" dön.
- Sipariş aktifken müşteri ödeme yöntemini değiştirebilir. Son net ödeme tercihi geçerlidir.
- order_status=completed veya cancelled ise ödeme yöntemini otomatik değiştirme.

FIELD KURALLARI:
- set_ilgilenilen_urun: lazer / atac
- set_payment_method: eft / kapida_odeme
- set_photo_received: yes / no
- set_order_status: active / completed / cancelled
- set_back_text_status: none / waiting / provided
- set_address_status: none / waiting / received
- set_support_mode: none / shipping / general
- set_siparis_alindi: evet / hayir
- set_cancel_reason: price / trust / changed_mind / delay / other
- set_context_lock: none / product_locked / photo_locked / order_locked / support_locked / cancel_locked
- set_last_intent: product / pricing / payment / image / order_detail / address / shipping / trust / smalltalk / cancel / support

ÇIKIŞ FORMATI:
YALNIZCA geçerli JSON döndür.
Asla açıklama yazma.
Asla markdown kullanma.
Format tam olarak şöyle olsun:

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

MENÜ GÖSTERİLDİ Mİ:
${ctx.menuGosterildi || "-"}

ÖNCEKİ AI CEVABI:
${ctx.aiReply || "-"}

LAST INTENT:
${ctx.lastIntent || "-"}

ORDER STATUS:
${ctx.orderStatus || "-"}

BACK TEXT STATUS:
${ctx.backTextStatus || "-"}

ADDRESS STATUS:
${ctx.addressStatus || "-"}

SUPPORT MODE:
${ctx.supportMode || "-"}

SIPARIS ALINDI:
${ctx.siparisAlindi || "-"}

CANCEL REASON:
${ctx.cancelReason || "-"}

CONTEXT LOCK:
${ctx.contextLock || "-"}

TOPIC:
${topic}

PRODUCT:
${product}

EK TEMAS VERİSİ:
${JSON.stringify({
  ig_username: fullContactData?.ig_username || ""
}, null, 2)}
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
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("DEEPSEEK RESPONSE:", JSON.stringify(data, null, 2));

    const rawText = data?.choices?.[0]?.message?.content?.trim() || "";
    const cleanedText = extractJsonText(rawText);

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      parsed = null;
    }

    const finalData = finalizeOutput(parsed, ctx, topic, product);
    return res.status(200).json(finalData);
  } catch (err) {
    console.error("chat.js error:", err);
    return res.status(200).json({
      reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
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
