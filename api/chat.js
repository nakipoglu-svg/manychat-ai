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

function countMatches(text, phrases = []) {
  const t = normalizeText(text);
  let score = 0;
  for (const phrase of phrases) {
    if (t.includes(normalizeText(phrase))) score++;
  }
  return score;
}

function hasPhoneNumber(text) {
  return /(\+?\d[\d\s]{8,}\d)/.test(String(text || ""));
}

function looksLikeAddressMessage(text) {
  const msg = normalizeText(text);
  const addressKeywords = [
    "mahalle", "mah", "sokak", "sk", "cadde", "cd", "no", "daire", "kat",
    "apartman", "apt", "site", "blok", "ilce", "ilce", "ilçe", "semt",
    "istanbul", "ankara", "izmir", "beykoz", "sisli", "şişli", "umraniye", "ümraniye",
    "kadikoy", "kadıköy", "turkiye", "türkiye"
  ];

  const hitCount = addressKeywords.filter((k) => msg.includes(normalizeText(k))).length;
  const lineCount = String(text || "")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean).length;

  return hasPhoneNumber(text) && (hitCount >= 2 || lineCount >= 3);
}

function looksLikeAddressRequest(text) {
  const msg = normalizeText(text);
  return (
    msg.includes("ad soyad") ||
    msg.includes("acik adres") ||
    msg.includes("açık adres") ||
    msg.includes("cep telefonu") ||
    msg.includes("telefon") ||
    msg.includes("adres bilgilerinizi") ||
    msg.includes("adresinizi")
  );
}

function detectPaymentMethod(text) {
  const msg = normalizeText(text);
  if (includesAny(msg, ["kapida", "kapida odeme", "kapıda", "kapıda ödeme"])) return "kapida_odeme";
  if (includesAny(msg, ["eft", "havale", "iban", "transfer"])) return "eft";
  return "";
}

function hasPhotoHint(text) {
  return includesAny(text, [
    "fotograf", "fotoğraf", "foto", "resim", "gorsel", "görsel",
    "ekran goruntusu", "ekran görüntüsü", "vesikalik", "vesikalık"
  ]);
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

function detectTopic(userMessage, historyText = "") {
  const text = normalizeText(`${historyText} ${userMessage}`);
  const last = normalizeText(userMessage);

  const priceWords = [
    "fiyat", "ne kadar", "nekadar", "kac tl", "kaç tl", "ucret", "ücret",
    "kac para", "kaç para", "indirim", "2li", "2 li", "ikili", "coklu alim",
    "çoklu alım", "toplu alim", "toplu alım", "adet fiyati", "adet fiyatı",
    "fiyat farki", "fiyat farkı", "tekli fiyat", "iki tane", "iki adet", "2 tane"
  ];

  const paymentWords = [
    "kapida odeme", "kapıda ödeme", "eft", "havale", "iban", "odeme", "ödeme",
    "dekont", "aciklama", "açıklama", "odeme yaptim", "ödeme yaptım",
    "kapida odeme var mi", "kapıda ödeme var mı"
  ];

  const shippingWords = [
    "kargo", "kargom", "kargoya", "teslim", "takip", "ptt", "aras",
    "yola cikti", "yola çıktı", "gelmedi", "gecikti", "geçikti",
    "hangi kargo", "sms gelmedi", "acil lazim", "acil lazım"
  ];

  const imageWords = [
    "fotograf", "fotoğraf", "foto", "resim", "arka yuz", "arka yüz",
    "on yuz", "ön yüz", "arkali onlu", "arkalı önlü", "birlestirme",
    "birleştirme", "iki yuz", "iki yüz", "iki taraf", "olur mu",
    "tasarim", "tasarım", "kalp", "nazar", "aksesuar"
  ];

  const trustWords = [
    "guven", "güven", "garanti", "kalite", "kararma", "solma", "paslanma",
    "iade", "degisim", "değişim", "dolandir", "dolandır"
  ];

  const orderWords = [
    "siparis", "sipariş", "adres", "ad soyad", "cep telefonu", "mahalle",
    "sokak", "ilce", "ilçe", "dua yaz", "isim yaz", "erkek icin", "erkek için"
  ];

  const scores = {
    pricing: countMatches(text, priceWords),
    payment: countMatches(text, paymentWords),
    shipping: countMatches(text, shippingWords),
    image: countMatches(text, imageWords),
    trust: countMatches(text, trustWords),
    order: countMatches(text, orderWords),
    smalltalk: countMatches(text, ["tesekkur", "teşekkür", "tamam", "olur", "merhaba", "selam"])
  };

  const shortPriceAsks = ["fiyat", "ne kadar", "nekadar", "kac tl", "kaç tl", "ucret", "ücret", "kac para", "kaç para"];
  if (shortPriceAsks.includes(last)) return "pricing";

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestTopic, bestScore] = sorted[0];
  if (bestScore <= 0) return "general";
  return bestTopic;
}

function detectProduct(userMessage, historyText = "", existingProduct = "") {
  const text = normalizeText(`${historyText} ${userMessage}`);
  const existing = normalizeText(existingProduct);

  if (existing.includes("lazer") || existing.includes("laser")) return "laser";
  if (existing.includes("atac") || existing.includes("ataç") || existing.includes("harf")) return "atac";

  const laserScore = countMatches(text, [
    "resimli", "fotografli", "fotoğraflı", "foto", "fotograf", "fotoğraf",
    "resimli olan", "fotografli kolye", "fotoğraflı kolye",
    "arka yazi", "arka yazı", "arka yuz", "arka yüz",
    "on yuz", "ön yüz", "lazer", "plaka"
  ]);

  const atacScore = countMatches(text, [
    "atac", "ataç", "harfli", "harf", "harfler", "ataç kolye", "harfli kolye"
  ]);

  if (laserScore > atacScore && laserScore > 0) return "laser";
  if (atacScore > laserScore && atacScore > 0) return "atac";

  return "unknown";
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

function canChangePayment(ctx) {
  const orderStatus = normalizeText(ctx.orderStatus || "active");
  return orderStatus !== "completed" && orderStatus !== "cancelled";
}

function hasForbiddenPrice(text) {
  return /\b299\b|\b349\b|\b399\b|\b449\b/.test(String(text || ""));
}

function applyHardGuards({ answer, ctx, topic, product }) {
  let text = String(answer || "").trim();

  if (!text) {
    return "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";
  }

  // Ürün belliyse tekrar ürün sordurma
  if (
    (ctx.ilgilenilenUrun === "lazer" || ctx.ilgilenilenUrun === "atac") &&
    normalizeText(text).includes("hangi model ile ilgileniyorsunuz")
  ) {
    return "Tabi efendim 😊";
  }

  // Yanlış fiyatları öldür
  if (hasForbiddenPrice(text)) {
    if (product === "laser" || ctx.ilgilenilenUrun === "lazer") {
      return "EFT / havale fiyatımız 599 TL, kapıda ödeme fiyatımız 649 TL'dir efendim 😊";
    }
    if (product === "atac" || ctx.ilgilenilenUrun === "atac") {
      return "EFT / havale fiyatımız 499 TL, kapıda ödeme fiyatımız 549 TL'dir efendim 😊";
    }
  }

  // Adres alınmışsa tekrar adres isteme
  if (
    (ctx.conversationStage === "address_received" || ctx.addressStatus === "received") &&
    looksLikeAddressRequest(text)
  ) {
    return "Tamamdır efendim 😊 Adresiniz bizde mevcut. Ödemeniz nasıl olacak efendim? EFT / havale veya kapıda ödeme seçeneklerimiz mevcut.";
  }

  return text;
}

function pickKnowledgeFiles(message, product, conversationStage = "", historyText = "") {
  const topic = detectTopic(message, historyText);
  const detectedProduct = detectProduct(message, historyText, product);
  const stage = normalizeText(conversationStage);

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
    "PRODUCT_ATAC.txt",
    "FEW_SHOT_EXAMPLES.txt",
    "EDGE_CASES.txt",
    "ROUTING_RULES.txt"
  ];

  if (detectedProduct === "laser") files.push("PRODUCT_LASER.txt");
  if (detectedProduct === "atac") files.push("PRODUCT_ATAC.txt");

  if (topic === "pricing") files.push("PRICING.txt");
  if (topic === "payment") files.push("PAYMENT.txt", "PRICING.txt");
  if (topic === "shipping") files.push("SHIPPING.txt");
  if (topic === "image") files.push("IMAGE_RULES.txt", "PRODUCT_LASER.txt");
  if (topic === "trust") files.push("TRUST.txt");
  if (topic === "order") files.push("ORDER_FLOW.txt");
  if (topic === "smalltalk") files.push("SMALLTALK.txt");

  if (stage.includes("photo") || stage.includes("back_text")) {
    files.push("IMAGE_RULES.txt", "ORDER_FLOW.txt");
  }
  if (stage.includes("address") || stage.includes("payment")) {
    files.push("ORDER_FLOW.txt", "PAYMENT.txt");
  }

  return [...new Set(files)];
}

function finalizeOutput(parsed, ctx, topic, product) {
  const reply = applyHardGuards({
    answer: parsed?.reply?.trim() || "",
    ctx,
    topic,
    product
  });

  const setConversationStage = normalizeStageName(
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

  let finalContextLock = setContextLock;
  let finalConversationStage = setConversationStage;
  let finalLastIntent = setLastIntent;

  if (setIlgilenilenUrun === "lazer" || setIlgilenilenUrun === "atac") {
    if (!finalContextLock) finalContextLock = "product_locked";
    if (!finalConversationStage) finalConversationStage = "product_selected";
    if (!finalLastIntent) finalLastIntent = "product";
  }

  if ((ctx.ilgilenilenUrun === "lazer" || ctx.ilgilenilenUrun === "atac") && !finalContextLock) {
    finalContextLock = "product_locked";
  }

  if (ctx.conversationStage === "address_received" && finalConversationStage === "address_waiting") {
    finalConversationStage = "address_received";
  }

  if (ctx.conversationStage === "payment_selected" && finalConversationStage === "address_waiting") {
    finalConversationStage = "payment_selected";
  }

  return {
    reply,
    set_conversation_stage: finalConversationStage,
    set_last_intent: finalLastIntent,
    set_ilgilenilen_urun: setIlgilenilenUrun,
    set_photo_received: setPhotoReceived,
    set_payment_method: setPaymentMethod,
    set_order_status: setOrderStatus,
    set_back_text_status: setBackTextStatus,
    set_address_status: setAddressStatus,
    set_support_mode: setSupportMode,
    set_siparis_alindi: setSiparisAlindi,
    set_cancel_reason: setCancelReason,
    set_context_lock: finalContextLock,
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
      lastIntent: ctx.lastIntent,
      orderStatus: ctx.orderStatus,
      backTextStatus: ctx.backTextStatus,
      addressStatus: ctx.addressStatus,
      contextLock: ctx.contextLock
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

    const msg = normalizeText(ctx.message);

    // İptal
    if (includesAny(msg, ["iptal", "vazgectim", "vazgeçtim", "istemiyorum", "olmasin", "olmasın", "gerek kalmadi", "gerek kalmadı"])) {
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

    // Adres mesajı geldiyse direkt yakala
    if (looksLikeAddressMessage(ctx.message)) {
      return res.status(200).json({
        reply: "Tamamdır efendim 😊 Adresiniz kaydedildi. Ödemeniz nasıl olacak efendim? EFT / havale veya kapıda ödeme seçeneklerimiz mevcut.",
        set_conversation_stage: "address_received",
        set_last_intent: "address",
        set_ilgilenilen_urun: "",
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
      });
    }

    // Ödeme değiştirme / seçme
    const payment = detectPaymentMethod(ctx.message);
    if (payment && canChangePayment(ctx)) {
      if (ctx.conversationStage === "address_received" || ctx.conversationStage === "payment_selected") {
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
            set_address_status: "received",
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
          set_address_status: "received",
          set_support_mode: "",
          set_siparis_alindi: "evet",
          set_cancel_reason: "",
          set_context_lock: "order_locked",
          set_menu_gosterildi: ""
        });
      }
    }

    // Çift yüz fotoğraf sorusu
    if (
      (ctx.ilgilenilenUrun === "lazer" || ctx.ilgilenilenUrun === "laser") &&
      (
        msg.includes("iki yuz") ||
        msg.includes("iki yüz") ||
        msg.includes("iki taraf") ||
        msg.includes("arkali onlu") ||
        msg.includes("arkalı önlü") ||
        msg.includes("arka yuz") ||
        msg.includes("arka yüz")
      ) &&
      (
        msg.includes("foto") ||
        msg.includes("fotograf") ||
        msg.includes("fotoğraf") ||
        msg.includes("resim")
      )
    ) {
      return res.status(200).json({
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

GENEL KURALLAR:
- Kısa, net, sıcak ve doğal yaz.
- Sadece bilgi dosyalarına göre cevap ver.
- Bilmediğin konuda uydurma.
- Dosyada olmayan fiyat üretme.
- 299 TL, 349 TL, 399 TL, 449 TL gibi yanlış fiyatlar asla yazılamaz.
- ilgilenilen_urun doluysa tekrar ürün sormak yasaktır.
- context_lock=product_locked ise kısa cevaplar mevcut ürüne göre yorumlanır.
- address_status=received veya conversation_stage=address_received ise tekrar adres istemek yasaktır.
- Resimli lazer kolyede ön yüze bir fotoğraf, arka yüze bir fotoğraf yapılabilir ve fiyat farkı yoktur.
- Ürün görseline cevap veriliyorsa ürün bağlamını koru.
- Sadece gerçekten kapsam dışı veya satıcı gerektiren durumda şu cevabı ver:
Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊

BAĞLAM KURALLARI:
- conversation_stage çok önemlidir.
- photo_received=yes ise tekrar fotoğraf isteme.
- Müşteri kısa cevap veriyorsa aktif bağlama göre yorumla.
- "şöyle", "böyle", "o", "bu", "aynen", "tamam", "olur" gibi mesajlarda başa dönme.
- Sipariş aktifken ödeme tercihi değişebilir. Son net tercih geçerlidir.

ÇIKIŞ:
Sadece geçerli JSON dön.
Format:

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

    let parsed = null;
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