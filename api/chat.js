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

function readKnowledgeFile(filename) {
  if (fileCache[filename]) return fileCache[filename];
  const filePath = path.join(process.cwd(), "knowledge", filename);
  const content = fs.readFileSync(filePath, "utf8");
  fileCache[filename] = content;
  return content;
}

function safeRead(filename) {
  try {
    return readKnowledgeFile(filename);
  } catch (error) {
    return "";
  }
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
    .replace(/[^\w\s:/?.=&+-]/g, " ")
    .replace(/\boddme\b/g, "odeme")
    .replace(/\bodme\b/g, "odeme")
    .replace(/\bodeeme\b/g, "odeme")
    .replace(/\bfotogragi\b/g, "fotografi")
    .replace(/\bfotograg\b/g, "fotograf")
    .replace(/\bfotografi\b/g, "fotografi")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text, keywords) {
  return keywords.some((k) => text.includes(k));
}

function truthy(value) {
  const v = normalizeText(unwrapManychatValue(value));
  return ["1", "true", "evet", "yes", "var", "alindi", "tamam", "received", "done"].includes(v);
}

function cleanReply(text) {
  const t = String(text || "").trim();
  if (!t) return FALLBACK_TEXT;

  return t
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function hasPhoneNumber(rawMessage = "") {
  const raw = String(rawMessage || "").trim();
  if (!raw) return false;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return false;
  return /(\+?90|0)?5\d{9}/.test(digits) || digits.length >= 10;
}

function looksLikeAddress(messageNorm, rawMessage = "") {
  const raw = String(rawMessage || "").trim();
  if (!raw) return false;
  if (raw.length < 12) return false;

  if (
    hasAny(messageNorm, [
      "adres",
      "acik adres",
      "mahalle",
      "mah",
      "sokak",
      "sk",
      "no",
      "daire",
      "apt",
      "apartman",
      "ilce",
      "kat",
      "site",
      "bulvar",
      "cadde",
      "cd",
      "telefon",
      "tel",
      "ad soyad",
    ])
  ) {
    return true;
  }

  if (
    /\d/.test(raw) &&
    hasAny(messageNorm, ["mah", "sok", "cad", "no", "daire", "kat", "apt", "sk", "site", "mahallesi"])
  ) {
    return true;
  }

  return false;
}

function isBackTextSkipMessage(messageNorm) {
  return hasAny(messageNorm, [
    "yok",
    "istemiyorum",
    "gerek yok",
    "bos kalsin",
    "bos olsun",
    "arka bos kalsin",
    "arka taraf bos kalsin",
    "yazi olmasin",
    "arka yazi yok",
  ]);
}

function normalizeProduct(value) {
  const v = normalizeText(value);
  if (["lazer", "resimli", "resimli lazer kolye"].includes(v)) return "lazer";
  if (["atac", "ataç", "harfli atac kolye", "harfli ataq kolye", "harfli ataç kolye"].includes(v)) return "atac";
  return "";
}

function detectProduct(messageNorm, existingProduct) {
  const existing = normalizeProduct(existingProduct);
  if (existing) return existing;

  if (
    hasAny(messageNorm, [
      "resimli",
      "fotografli",
      "foto",
      "fotolu",
      "lazer",
      "arka yazi",
      "arkasina yazi",
      "arkasina foto",
      "resim kolye",
      "foto kolye",
    ])
  ) {
    return "lazer";
  }

  if (
    hasAny(messageNorm, [
      "atac",
      "ataç",
      "harfli",
      "harf kolye",
      "harfli kolye",
      "3 harf",
      "uc harf",
      "isim harf",
      "harfli atac",
    ])
  ) {
    return "atac";
  }

  return "";
}

function looksLikeLetterInput(rawMessage, detectedProduct) {
  if (detectedProduct !== "atac") return false;

  const raw = String(rawMessage || "").trim();
  if (!raw) return false;
  if (raw.length > 24) return false;
  if (/[?!.:,/]/.test(raw)) return false;
  if (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s&]+$/.test(raw)) return false;

  return true;
}

function detectIntent(messageNorm, rawMessage = "", detectedProduct = "", stage = "") {
  const raw = String(rawMessage || "").trim();

  if (!messageNorm && !raw) return "unknown";

  if (looksLikePhotoUrl(raw) && detectedProduct === "lazer") {
    return "photo";
  }

  if (hasAny(messageNorm, ["iptal", "vazgectim", "istemiyorum", "siparisi iptal"])) {
    return "cancel_order";
  }

  if (stage === "waiting_back_text" && isBackTextSkipMessage(messageNorm)) {
    return "back_text_skip";
  }

  if (hasAny(messageNorm, ["fiyat", "ne kadar", "ucret", "kac tl", "kaç tl"])) {
    return "price";
  }

  if (
    hasAny(messageNorm, [
      "kapida odeme",
      "kapida odeme olur mu",
      "kapida odeme var mi",
      "kapida oderim",
      "kapida odeme olsun",
      "kapida olsun",
      "kapida",
      "odeme",
      "eft",
      "havale",
      "oddme",
    ])
  ) {
    return "payment";
  }

  if (
    hasAny(messageNorm, [
      "kargo",
      "teslimat",
      "ne zaman gelir",
      "kac gunde",
      "kaç günde",
      "takip no",
      "kargom nerede",
      "ne zaman kargolarsiniz",
      "ne zaman kargoya verilir",
    ])
  ) {
    return "shipping";
  }

  if (hasAny(messageNorm, ["guvenilir", "guven", "dolandirici", "orijinal", "saglam"])) {
    return "trust";
  }

  if (
    hasAny(messageNorm, [
      "fotograf gonderiyorum",
      "foto gonderiyorum",
      "fotografi gonderiyorum",
      "fotografi atiyorum",
      "foto atiyorum",
      "fotoyu atiyorum",
      "resmi atiyorum",
      "resim gonderiyorum",
      "fotograf atiyorum",
      "fotografi gondericem",
      "foto yolluyorum",
      "resim yolluyorum",
      "vesikalik olur mu",
      "vesikalik",
      "fotograf uygun mu",
      "foto uygun mu",
      "bu foto olur mu",
      "fotograf atsam",
      "foto atsam",
      "resim atsam",
      "foto atabilir miyim",
      "fotograf atabilir miyim",
      "foto gondereyim mi",
      "fotograf gondereyim mi",
      "buradan atsam olur mu",
      "fotograf atsam olur mu",
      "foto atsam olur mu",
    ])
  ) {
    return "photo";
  }

  if (
    hasAny(messageNorm, [
      "arkasina yazi",
      "arka yazi",
      "arkasina tarih",
      "arkaya yazi",
      "arka tarafa yazi",
      "yazi yaziliyor mu",
      "arkasina bir sey yazilir mi",
    ])
  ) {
    return "back_text";
  }

  if (
    hasAny(messageNorm, [
      "zincir modeli",
      "zincir degisiyor mu",
      "zincir değişiyor mu",
      "zincir kisalir mi",
      "zincir kısalır mı",
      "zincir boyu",
      "zincir uzunlugu",
    ])
  ) {
    return "chain_question";
  }

  if (
    hasAny(messageNorm, [
      "siparis vermek istiyorum",
      "siparis verecegim",
      "siparis olusturalim",
      "almak istiyorum",
      "hazirlayalim",
      "alacagim",
      "alayim",
      "ilgileniyorum",
      "istiyorum",
    ])
  ) {
    return "order_start";
  }

  if (looksLikeAddress(messageNorm, raw)) {
    return "address";
  }

  if (hasPhoneNumber(raw) && !looksLikeAddress(messageNorm, raw)) {
    return "phone";
  }

  if (
    hasAny(messageNorm, [
      "merhaba",
      "selam",
      "slm",
      "iyi aksamlar",
      "iyi akşamlar",
      "gunaydin",
      "günaydın",
      "nasilsiniz",
    ])
  ) {
    return "smalltalk";
  }

  if (
    hasAny(messageNorm, [
      "yeriniz nerede",
      "neredesiniz",
      "konum",
      "magaza",
      "mağaza",
      "eminonu",
      "eminönü",
    ])
  ) {
    return "location";
  }

  if (looksLikeLetterInput(raw, detectedProduct)) {
    return "letters";
  }

  return "general";
}

function shouldLockProduct(product, intent) {
  if (!product) return false;

  return [
    "price",
    "payment",
    "shipping",
    "trust",
    "photo",
    "back_text",
    "back_text_skip",
    "chain_question",
    "order_start",
    "address",
    "phone",
    "letters",
    "general",
    "location",
    "smalltalk",
  ].includes(intent);
}

function normalizeStage(value) {
  const v = normalizeText(value);
  if (!v) return "";
  if (
    [
      "waiting_photo",
      "waiting payment",
      "waiting_payment",
      "waiting address",
      "waiting_address",
      "waiting_letters",
      "waiting_product",
      "waiting_back_text",
      "order_completed",
      "human_support",
    ].includes(v)
  ) {
    return v.replace(/\s+/g, "_");
  }
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
  const detectedProduct = explicitProduct || previousProduct || "";
  const detectedIntent = detectIntent(messageNorm, message, detectedProduct, conversation_stage);

  return {
    raw: body,
    message,
    messageNorm,
    previousProduct,
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
    detectedIntent,
  };
}

function createHardRules(context) {
  const { detectedProduct, detectedIntent, fields, messageNorm } = context;
  const rules = [];

  if (detectedProduct === "lazer") {
    rules.push("User is already in LASER product context. Do NOT ask which product they want.");
    rules.push("For laser necklace, do not mix in ATAC rules like letter count.");
    rules.push("If user newly selects laser product, answer directly with price, then continue order flow.");
    rules.push("After real photo arrives for laser, ask whether they want back text before asking payment.");
  }

  if (detectedProduct === "atac") {
    rules.push("User is already in ATAC product context. Do NOT ask which product they want.");
    rules.push("For ATAC necklace, do not mix in laser photo rules unless user explicitly switches product.");
    rules.push("If user newly selects ATAC product, answer directly with price, then ask for letters.");
  }

  if (shouldLockProduct(detectedProduct, detectedIntent) || truthy(fields.context_lock)) {
    rules.push("Do NOT reset to main menu.");
    rules.push("Do NOT ask 'Hangi model ile ilgileniyorsunuz?' if product context already exists.");
  }

  if (detectedIntent === "chain_question") {
    rules.push("For chain model/change questions, do NOT invent model names.");
    rules.push("If exact chain model/change is seller-dependent, answer briefly and naturally, without using fallback immediately.");
  }

  if (detectedIntent === "letters") {
    rules.push("If the customer sent short text like ABC, Ali, ZK in ATAC context, treat it as letter input.");
  }

  if (hasAny(messageNorm, ["evet", "tamam", "olur", "amin"])) {
    rules.push("Interpret short confirmations in conversation context. Do NOT treat them as a fresh topic.");
  }

  rules.push("Keep replies short, natural, warm, and professional.");
  rules.push("Do not use long lists.");
  rules.push("If the answer is known from context, answer directly.");
  rules.push("If product context exists, do not ask product again.");
  rules.push("If customer already gave payment or address earlier, do not ask the same thing again.");
  rules.push("If customer asks a side question during order flow, answer it briefly and then continue with the next missing order step.");
  rules.push("Never invent extra models, collections, or options that are not in knowledge.");
  rules.push(`If you truly do not know, reply exactly with: ${FALLBACK_TEXT}`);

  return rules.join("\n");
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

function buildMessages(context, knowledgePack) {
  const hardRules = createHardRules(context);

  const systemPrompt = `
You are a sales assistant for Yudum Jewels.

${hardRules}

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
- current_product_field: ${context.fields.ilgilenilen_urun || context.fields.user_product || ""}
- conversation_stage: ${context.fields.conversation_stage || ""}
- photo_received: ${context.fields.photo_received || ""}
- payment_method: ${context.fields.payment_method || ""}
- menu_gosterildi: ${context.fields.menu_gosterildi || ""}
- last_intent: ${context.fields.last_intent || ""}
- order_status: ${context.fields.order_status || ""}
- back_text_status: ${context.fields.back_text_status || ""}
- address_status: ${context.fields.address_status || ""}
- support_mode: ${context.fields.support_mode || ""}
- siparis_alindi: ${context.fields.siparis_alindi || ""}
- cancel_reason: ${context.fields.cancel_reason || ""}
- context_lock: ${context.fields.context_lock || ""}
- letters_received: ${context.fields.letters_received || ""}
- phone_received: ${context.fields.phone_received || ""}

Important:
- If product context exists, do not ask product again.
- If ATAC and user sent short letters like ABC, treat it as letter input.
- If chain question is seller-dependent, respond naturally and briefly.
- Do not go to main menu unless user truly asks to choose product.
- If some order info is already collected, continue from the next missing step.
- For laser product selection, direct price + ask for photo.
- After laser photo, ask for back text before payment.
  `.trim();

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}

async function callModel(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || "deepseek-chat";
  const baseUrl =
    process.env.DEEPSEEK_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://api.deepseek.com/v1";

  if (!apiKey) {
    throw new Error("API key missing. Add DEEPSEEK_API_KEY or OPENAI_API_KEY.");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
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
}

function parsePaymentMethod(messageNorm, existing = "") {
  if (hasAny(messageNorm, ["kapida odeme", "kapida", "odeme olsun"])) {
    return "kapida_odeme";
  }

  if (hasAny(messageNorm, ["eft", "havale"])) {
    return "eft_havale";
  }

  return existing || "";
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

function collectFacts(context, currentState) {
  const { detectedIntent, detectedProduct, messageNorm, message } = context;
  const next = { ...currentState };

  if (detectedProduct) {
    next.context_lock = "1";
    next.order_status = next.order_status || "started";
  }

  if (detectedIntent === "payment") {
    next.payment_method = parsePaymentMethod(messageNorm, next.payment_method);
  }

  if (detectedIntent === "address") {
    if (hasPhoneNumber(message)) {
      next.phone_received = "1";
      next.address_status = "received";
    } else {
      next.address_status = "address_only";
    }
  }

  if (detectedIntent === "phone") {
    next.phone_received = "1";
    if (next.address_status === "address_only") {
      next.address_status = "received";
    }
  }

  if (detectedIntent === "photo" && detectedProduct === "lazer") {
    if (looksLikePhotoUrl(message)) {
      next.photo_received = "1";
    }
  }

  if (detectedIntent === "letters" && detectedProduct === "atac") {
    next.letters_received = "1";
    next.order_status = next.order_status || "started";
  }

  if (detectedIntent === "back_text") {
    next.back_text_status = "received";
  }

  if (detectedIntent === "back_text_skip") {
    next.back_text_status = "skipped";
  }

  if (detectedIntent === "cancel_order") {
    next.cancel_reason = message || "cancel_requested";
    next.support_mode = "1";
    next.order_status = "cancel_requested";
    next.siparis_alindi = "";
  }

  return next;
}

function deriveInternalState(context) {
  const existing = context.fields;
  const product = context.detectedProduct || existing.ilgilenilen_urun || existing.user_product || "";
  const previousProduct = context.previousProduct || "";
  const productChanged = previousProduct && product && previousProduct !== product;

  let state = {
    product,
    conversation_stage: existing.conversation_stage || "",
    photo_received: truthy(existing.photo_received) ? "1" : "",
    payment_method: existing.payment_method || "",
    menu_gosterildi: existing.menu_gosterildi || "",
    order_status: existing.order_status || "",
    back_text_status: existing.back_text_status || "",
    address_status: existing.address_status || "",
    support_mode: existing.support_mode || "",
    cancel_reason: existing.cancel_reason || "",
    context_lock: existing.context_lock || "",
    siparis_alindi: truthy(existing.siparis_alindi) ? "1" : "",
    letters_received: truthy(existing.letters_received) ? "1" : "",
    phone_received: truthy(existing.phone_received) ? "1" : "",
  };

  if (productChanged) {
    state = {
      ...state,
      ...resetForProductSwitch(existing, product),
      product,
    };
  }

  if (product !== "lazer") {
    state.photo_received = "";
    state.back_text_status = "";
  }

  if (product !== "atac") {
    state.letters_received = "";
  }

  state = collectFacts(context, state);

  return state;
}

function getNextStage(state) {
  const product = state.product;

  if (!product) {
    if (state.menu_gosterildi === "evet") return "waiting_product";
    return "";
  }

  if (state.order_status === "cancel_requested") return "human_support";

  if (product === "lazer") {
    if (!truthy(state.photo_received)) return "waiting_photo";
    if (!state.back_text_status) return "waiting_back_text";
    if (!state.payment_method) return "waiting_payment";
    if (state.address_status !== "received") return "waiting_address";
    return "order_completed";
  }

  if (product === "atac") {
    if (!truthy(state.letters_received)) return "waiting_letters";
    if (!state.payment_method) return "waiting_payment";
    if (state.address_status !== "received") return "waiting_address";
    return "order_completed";
  }

  return "";
}

function isMenuIntent(intent) {
  return [
    "smalltalk",
    "general",
    "unknown",
    "price",
    "payment",
    "shipping",
    "trust",
    "location",
    "order_start",
  ].includes(intent);
}

function shouldShowMainMenu(context, state) {
  if (state.product) return false;
  if (truthy(state.context_lock)) return false;
  if (state.order_status === "cancel_requested") return false;
  if (context.detectedIntent === "address") return true;
  return isMenuIntent(context.detectedIntent);
}

function isFreshProductSelection(context, state) {
  return (
    !!context.detectedProduct &&
    !context.previousProduct &&
    !state.photo_received &&
    !state.letters_received &&
    !state.payment_method &&
    !state.address_status &&
    !state.back_text_status &&
    !context.fields.conversation_stage
  );
}

function buildGuidedReply(context, state) {
  const { detectedIntent, detectedProduct, messageNorm } = context;
  const nextStage = getNextStage(state);

  if (shouldShowMainMenu(context, state)) {
    return MAIN_MENU_TEXT;
  }

  if (isFreshProductSelection(context, state) && detectedProduct === "lazer") {
    return LASER_PRICE_TEXT;
  }

  if (isFreshProductSelection(context, state) && detectedProduct === "atac") {
    return ATAC_PRICE_TEXT;
  }

  if (detectedIntent === "order_start" && detectedProduct === "lazer") {
    if (nextStage === "waiting_photo") {
      return LASER_PRICE_TEXT;
    }
  }

  if (detectedIntent === "order_start" && detectedProduct === "atac") {
    if (nextStage === "waiting_letters") {
      return ATAC_PRICE_TEXT;
    }
  }

  if (detectedIntent === "letters" && detectedProduct === "atac") {
    if (nextStage === "waiting_payment") {
      return "Harika efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.";
    }
    if (nextStage === "waiting_address") {
      return "Harika efendim 😊 Şimdi ad soyad, telefon ve açık adres bilgilerinizi tek mesajda paylaşabilir misiniz?";
    }
    if (nextStage === "order_completed") {
      return "Harika efendim 😊 Sipariş için gerekli bilgiler tamamlandı. Ekibimiz işlemi hazırlayacaktır.";
    }
  }

  if (detectedIntent === "photo" && detectedProduct === "lazer") {
    if (truthy(state.photo_received)) {
      if (nextStage === "waiting_back_text") {
        return "Fotoğrafınızı aldım efendim 😊 Arka yüzüne yazı eklemek ister misiniz? İsterseniz yazıyı buradan iletebilirsiniz, istemezseniz 'yok' yazabilirsiniz.";
      }
      if (nextStage === "waiting_payment") {
        return "Fotoğrafınızı aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.";
      }
      if (nextStage === "waiting_address") {
        return "Fotoğrafınızı aldım efendim 😊 Şimdi ad soyad, telefon ve açık adres bilgilerinizi tek mesajda paylaşabilir misiniz?";
      }
      if (nextStage === "order_completed") {
        return "Fotoğrafınızı aldım efendim 😊 Sipariş için gerekli bilgiler tamamlandı.";
      }
    }

    return "Tabi efendim, fotoğrafı buradan gönderebilirsiniz 😊";
  }

  if (detectedIntent === "back_text" && detectedProduct === "lazer") {
    if (nextStage === "waiting_payment") {
      return "Not aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.";
    }
    if (nextStage === "waiting_address") {
      return "Not aldım efendim 😊 Şimdi ad soyad, telefon ve açık adres bilgilerinizi tek mesajda paylaşabilir misiniz?";
    }
  }

  if (detectedIntent === "back_text_skip" && detectedProduct === "lazer") {
    if (nextStage === "waiting_payment") {
      return "Tabi efendim 😊 O halde ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.";
    }
  }

  if (detectedIntent === "payment") {
    if (state.payment_method === "kapida_odeme") {
      if (nextStage === "waiting_product" && !detectedProduct) {
        return MAIN_MENU_TEXT;
      }
      if (nextStage === "waiting_photo" && detectedProduct === "lazer") {
        return "Tabi efendim 😊 Siparişe devam etmek için fotoğrafı buradan gönderebilirsiniz.";
      }
      if (nextStage === "waiting_back_text" && detectedProduct === "lazer") {
        return "Tabi efendim 😊 Önce fotoğrafı aldıktan sonra arka yüz için yazı isteğinizi de soracağım. Şimdilik fotoğrafı buradan gönderebilirsiniz.";
      }
      if (nextStage === "waiting_letters" && detectedProduct === "atac") {
        return "Tabi efendim 😊 Şimdi istediğiniz harfleri yazabilirsiniz.";
      }
      if (nextStage === "waiting_address") {
        return "Tabi efendim 😊 Siparişinizi tamamlamak için ad soyad, telefon ve açık adres bilgilerinizi tek mesajda paylaşabilir misiniz?";
      }
      if (nextStage === "order_completed") {
        return "Kapıda ödeme tercihinizi not aldım efendim 😊 Sipariş için gerekli bilgiler tamamlandı.";
      }
    }

    if (state.payment_method === "eft_havale") {
      if (nextStage === "waiting_product" && !detectedProduct) {
        return MAIN_MENU_TEXT;
      }
      if (nextStage === "waiting_photo" && detectedProduct === "lazer") {
        return `EFT / Havale ile ilerleyebiliriz 😊 Önce fotoğrafı buradan gönderebilirsiniz.\n\n${EFT_INFO_TEXT}`;
      }
      if (nextStage === "waiting_back_text" && detectedProduct === "lazer") {
        return `EFT / Havale ile ilerleyebiliriz 😊 Önce fotoğrafı buradan gönderebilirsiniz.\n\n${EFT_INFO_TEXT}`;
      }
      if (nextStage === "waiting_letters" && detectedProduct === "atac") {
        return `EFT / Havale ile ilerleyebiliriz 😊 Önce istediğiniz harfleri yazabilirsiniz.\n\n${EFT_INFO_TEXT}`;
      }
      if (nextStage === "waiting_address") {
        return `EFT / Havale için ödeme bilgilerimiz şu şekildedir:\n${EFT_INFO_TEXT}\n\nAd soyad, telefon ve açık adres bilgilerinizi de paylaşabilirsiniz 😊`;
      }
      if (nextStage === "order_completed") {
        return `EFT / Havale bilgilerimiz şu şekildedir:\n${EFT_INFO_TEXT}\n\nSipariş için gerekli bilgiler tamamlandı efendim 😊`;
      }
    }
  }

  if (detectedIntent === "address") {
    if (!detectedProduct && nextStage === "waiting_product") {
      return "Adres bilginizi not aldım efendim 😊\nÖnce hangi model ile ilgilendiğinizi yazabilir misiniz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye";
    }

    if (state.address_status === "address_only" && !truthy(state.phone_received)) {
      return "Adres bilginizi aldım efendim 😊 Siparişi tamamlayabilmemiz için cep telefonu numaranızı da paylaşabilir misiniz?";
    }

    if (nextStage === "waiting_photo" && detectedProduct === "lazer") {
      return "Adres bilginizi not aldım efendim 😊 Şimdi fotoğrafı buradan gönderebilirsiniz.";
    }
    if (nextStage === "waiting_back_text" && detectedProduct === "lazer") {
      return "Adres bilginizi not aldım efendim 😊 Şimdi arka yüzüne yazı isteyip istemediğinizi yazabilirsiniz. İstemiyorsanız 'yok' yazabilirsiniz.";
    }
    if (nextStage === "waiting_letters" && detectedProduct === "atac") {
      return "Adres bilginizi not aldım efendim 😊 Şimdi istediğiniz harfleri yazabilirsiniz.";
    }
    if (nextStage === "waiting_payment") {
      return "Adres bilginizi not aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.";
    }
    if (nextStage === "order_completed") {
      return "Adres bilginizi not aldım efendim 😊 Sipariş için gerekli bilgiler tamamlandı.";
    }
  }

  if (detectedIntent === "phone") {
    if (state.address_status === "received") {
      if (nextStage === "waiting_payment") {
        return "Telefon numaranızı da aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.";
      }
      if (nextStage === "order_completed") {
        return "Telefon numaranızı da aldım efendim 😊 Sipariş için gerekli bilgiler tamamlandı.";
      }
    }
  }

  if (detectedIntent === "chain_question" && detectedProduct === "lazer") {
    if (hasAny(messageNorm, ["zincir modeli", "zincir degisiyor mu"])) {
      return "Zincir modeliyle ilgili detay için ekibimize görsel üzerinden net bilgi verelim 😊";
    }
    if (hasAny(messageNorm, ["zincir kisalir mi", "zincir boyu", "zincir uzunlugu"])) {
      if (nextStage === "waiting_photo") {
        return "Standart zincir 60 cm’dir 😊 Siparişe devam etmek için fotoğrafı buradan gönderebilirsiniz.";
      }
      return "Standart zincir 60 cm’dir 😊";
    }
  }

  if (detectedIntent === "location") {
    if (!detectedProduct && nextStage === "waiting_product") {
      return "Eminönü İstanbul’dayız 😊\nHangi model ile ilgileniyorsunuz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye";
    }
    if (nextStage === "waiting_photo" && detectedProduct === "lazer") {
      return "Eminönü İstanbul’dayız 😊 Siparişe devam etmek için fotoğrafı buradan gönderebilirsiniz.";
    }
    if (nextStage === "waiting_letters" && detectedProduct === "atac") {
      return "Eminönü İstanbul’dayız 😊 Siparişe devam etmek için istediğiniz harfleri yazabilirsiniz.";
    }
    return "Eminönü İstanbul’dayız 😊";
  }

  return "";
}

function buildStateUpdate(context, replyText) {
  const existing = context.fields;
  const derived = deriveInternalState(context);
  const nextStage = getNextStage(derived);
  const menuShownNow =
    cleanReply(replyText) === MAIN_MENU_TEXT || cleanReply(replyText).includes("Hangi model ile ilgileniyorsunuz?");

  let support_mode = derived.support_mode || "";
  if (!replyText || replyText === FALLBACK_TEXT) {
    support_mode = "1";
  }

  let order_status = derived.order_status || "";
  let siparis_alindi = derived.siparis_alindi || "";
  let conversation_stage = nextStage || derived.conversation_stage || existing.conversation_stage || "";
  let menu_gosterildi = derived.menu_gosterildi || existing.menu_gosterildi || "";

  if (menuShownNow) {
    menu_gosterildi = "evet";
    if (!derived.product) {
      conversation_stage = "waiting_product";
    }
  }

  if (nextStage === "order_completed") {
    order_status = "completed";
    siparis_alindi = "1";
  } else if (!order_status && derived.product) {
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
    ilgilenilen_urun: derived.product,
    user_product: derived.product,
    last_intent: context.detectedIntent,
    conversation_stage,
    photo_received: derived.photo_received || "",
    payment_method: derived.payment_method || "",
    menu_gosterildi,
    order_status,
    back_text_status: derived.back_text_status || "",
    address_status: derived.address_status || "",
    support_mode,
    siparis_alindi,
    cancel_reason: derived.cancel_reason || "",
    context_lock: derived.context_lock || "",
    letters_received: derived.letters_received || "",
    phone_received: derived.phone_received || "",
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
    const body = req.body || {};
    const context = buildContext(body);

    console.log("RAW BODY:", JSON.stringify(body, null, 2));
    console.log("CLEAN FIELDS:", JSON.stringify(context.fields, null, 2));
    console.log("DETECTED:", {
      product: context.detectedProduct,
      intent: context.detectedIntent,
      previousProduct: context.previousProduct,
    });

    if (!context.message) {
      const emptyState = buildStateUpdate(context, FALLBACK_TEXT);

      return res.status(200).json({
        success: true,
        ...emptyState,
      });
    }

    const derived = deriveInternalState(context);
    const guidedReply = buildGuidedReply(context, derived);

    let finalReply = "";

    if (guidedReply) {
      finalReply = cleanReply(guidedReply);
    } else {
      const knowledgePack = getKnowledgePack(context);
      const messages = buildMessages(context, knowledgePack);
      const modelReply = await callModel(messages);
      finalReply = cleanReply(modelReply);
    }

    const stateUpdate = buildStateUpdate(context, finalReply);

    console.log("STATE UPDATE:", JSON.stringify(stateUpdate, null, 2));

    return res.status(200).json({
      success: true,
      ...stateUpdate,
    });
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
