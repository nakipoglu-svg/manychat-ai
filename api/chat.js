import fs from "fs";
import path from "path";

const fileCache = {};

const FALLBACK_TEXT = "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";

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
  if (/^(undefined|null|none|nan|false)$/i.test(str)) return "";

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
    .replace(/[^\w\s]/g, " ")
    .replace(/\boddme\b/g, "odeme")
    .replace(/\bodme\b/g, "odeme")
    .replace(/\bodeeme\b/g, "odeme")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text, keywords) {
  return keywords.some((k) => text.includes(k));
}

function truthy(value) {
  const v = normalizeText(unwrapManychatValue(value));
  return ["1", "true", "evet", "yes", "var", "alindi", "tamam"].includes(v);
}

function cleanReply(text) {
  const t = String(text || "").trim();
  if (!t) return FALLBACK_TEXT;

  return t
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectProduct(messageNorm, existingProduct) {
  const existing = normalizeText(existingProduct);

  if (["lazer", "resimli", "resimli lazer kolye"].includes(existing)) {
    return "lazer";
  }

  if (["atac", "ataç", "harfli atac kolye", "harfli ataq kolye"].includes(existing)) {
    return "atac";
  }

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
  if (raw.length > 20) return false;
  if (/[?!.:,]/.test(raw)) return false;
  if (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s&]+$/.test(raw)) return false;

  return true;
}

function detectIntent(messageNorm, rawMessage = "", detectedProduct = "") {
  if (!messageNorm) return "unknown";

  if (hasAny(messageNorm, ["iptal", "vazgectim", "istemiyorum", "siparisi iptal"])) {
    return "cancel_order";
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
      "fotoyu atayim",
      "resmi atayim",
      "resim gondersem",
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
      "istiyorum",
      "hazirlayalim",
      "alacagim",
      "alayim",
    ])
  ) {
    return "order_start";
  }

  if (
    hasAny(messageNorm, [
      "adres",
      "ad soyad",
      "mahalle",
      "ilce",
      "ilçe",
      "sokak",
      "apartman",
      "daire",
      "telefon numaram",
      "acik adres",
      "açık adres",
    ])
  ) {
    return "address";
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

  if (looksLikeLetterInput(rawMessage, detectedProduct)) {
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
    "chain_question",
    "order_start",
    "address",
    "letters",
    "general",
  ].includes(intent);
}

function buildContext(body) {
  const message = unwrapManychatValue(body.message || body.last_input_text || "");
  const ilgilenilen_urun = unwrapManychatValue(body.ilgilenilen_urun);
  const user_product = unwrapManychatValue(body.user_product);
  const conversation_stage = unwrapManychatValue(body.conversation_stage);
  const photo_received = unwrapManychatValue(body.photo_received);
  const payment_method = unwrapManychatValue(body.payment_method);
  const menu_gosterildi = unwrapManychatValue(body.menu_gosterildi);
  const ai_reply = unwrapManychatValue(body.ai_reply);
  const last_intent = unwrapManychatValue(body.last_intent);
  const order_status = unwrapManychatValue(body.order_status);
  const back_text_status = unwrapManychatValue(body.back_text_status);
  const address_status = unwrapManychatValue(body.address_status);
  const support_mode = unwrapManychatValue(body.support_mode);
  const siparis_alindi = unwrapManychatValue(body.siparis_alindi);
  const cancel_reason = unwrapManychatValue(body.cancel_reason);
  const context_lock = unwrapManychatValue(body.context_lock);

  const existingProduct = ilgilenilen_urun || user_product || "";
  const messageNorm = normalizeText(message);

  const explicitProduct = detectProduct(messageNorm, "");
  const detectedProduct = explicitProduct || normalizeText(existingProduct) || "";
  const detectedIntent = detectIntent(messageNorm, message, detectedProduct);

  return {
    raw: body,
    message,
    messageNorm,
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
  }

  if (detectedProduct === "atac") {
    rules.push("User is already in ATAC product context. Do NOT ask which product they want.");
    rules.push("For ATAC necklace, do not mix in laser photo rules unless user explicitly switches product.");
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
    rules.push("After receiving letters for ATAC, ask payment method next.");
  }

  if (hasAny(messageNorm, ["evet", "tamam", "olur", "amin"])) {
    rules.push("Interpret short confirmations in conversation context. Do NOT treat them as a fresh topic.");
  }

  rules.push("Keep replies short, natural, warm, and professional.");
  rules.push("Do not use long lists.");
  rules.push("If the answer is known from context, answer directly.");
  rules.push("If product context exists, do not ask product again.");
  rules.push("Never invent extra models, collections, or options that are not in knowledge.");
  rules.push(`If you truly do not know, reply exactly with: ${FALLBACK_TEXT}`);

  return rules.join("\n");
}

function getKnowledgePack(context) {
  const core = safeRead("core_system.txt");
  const pricing = safeRead("pricing.txt");
  const shipping = safeRead("shipping.txt");
  const payment = safeRead("payment.txt");
  const orderFlow = safeRead("order_flow.txt");
  const trust = safeRead("trust.txt");
  const smalltalk = safeRead("smalltalk.txt");

  const laser = context.detectedProduct === "lazer" ? safeRead("product_laser.txt") : "";
  const atac = context.detectedProduct === "atac" ? safeRead("product_atac.txt") : "";

  return [core, laser, atac, pricing, shipping, payment, orderFlow, trust, smalltalk]
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

Important:
- If product context exists, do not ask product again.
- If ATAC and user sent short letters like ABC, treat it as letter input.
- If chain question is seller-dependent, respond naturally and briefly.
- Do not go to main menu unless user truly asks to choose product.
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

function buildStateUpdate(context, replyText) {
  const existing = context.fields;
  const product = context.detectedProduct || existing.ilgilenilen_urun || existing.user_product || "";
  const intent = context.detectedIntent;

  let conversation_stage = existing.conversation_stage || "";
  let photo_received = existing.photo_received || "";
  let payment_method = existing.payment_method || "";
  let menu_gosterildi = existing.menu_gosterildi || "";
  let order_status = existing.order_status || "";
  let back_text_status = existing.back_text_status || "";
  let address_status = existing.address_status || "";
  let support_mode = existing.support_mode || "";
  let cancel_reason = existing.cancel_reason || "";
  let context_lock = existing.context_lock || "";

  if (product !== "lazer") {
    photo_received = "";
    back_text_status = "";
  }

  if (product) context_lock = "1";

  if (intent === "photo") {
    conversation_stage = "photo_step";
    if (product === "lazer") {
      order_status = order_status || "started";
    }
  }

  if (intent === "back_text") {
    back_text_status = "talking";
    conversation_stage = "back_text_step";
  }

  if (intent === "payment") {
    conversation_stage = "payment_step";
    if (product) {
      order_status = order_status || "started";
    }
  }

  if (intent === "letters") {
    conversation_stage = "payment_step";
    order_status = order_status || "started";
  }

  if (intent === "address") {
    address_status = "talking";
    conversation_stage = "address_step";
    order_status = order_status || "address_pending";
  }

  if (intent === "order_start") {
    order_status = "started";
    conversation_stage = "order_started";

    if (product === "lazer") {
      photo_received = "";
      back_text_status = "";
    }

    if (product === "atac") {
      photo_received = "";
      back_text_status = "";
    }
  }

  if (intent === "cancel_order") {
    cancel_reason = context.message || "cancel_requested";
    support_mode = "1";
    order_status = "cancel_requested";
  }

  if (intent === "chain_question") {
    support_mode = support_mode || "0";
  }

  if (intent === "smalltalk" && !product) {
    menu_gosterildi = menu_gosterildi || "0";
  }

  if (!replyText || replyText === FALLBACK_TEXT) {
    support_mode = "1";
  }

  return {
    ai_reply: replyText,
    ilgilenilen_urun: product,
    user_product: product,
    last_intent: intent,
    conversation_stage,
    photo_received,
    payment_method,
    menu_gosterildi,
    order_status,
    back_text_status,
    address_status,
    support_mode,
    cancel_reason,
    context_lock,
  };
}

function quickLocalReply(context) {
  const { detectedIntent, detectedProduct, messageNorm } = context;

  if (detectedIntent === "order_start" && detectedProduct === "lazer") {
    return "Tabi efendim, fotoğrafı buradan gönderebilirsiniz 😊";
  }

  if (detectedIntent === "order_start" && detectedProduct === "atac") {
    return "Tabi efendim 😊 İstediğiniz harfleri yazabilirsiniz. Standart olarak 3 harf dahildir.";
  }

  if (detectedIntent === "letters" && detectedProduct === "atac") {
    return "Harika efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT/Havale veya kapıda ödeme şeklinde ilerleyebiliriz.";
  }

  if (detectedIntent === "photo" && detectedProduct === "lazer") {
    return "Tabi efendim, fotoğrafı buradan gönderebilirsiniz 😊";
  }

  if (detectedIntent === "payment" && detectedProduct === "lazer") {
    if (hasAny(messageNorm, ["kapida", "odeme", "eft", "havale"])) {
      return "Evet efendim, kapıda ödeme seçeneğimiz mevcut. Kapıda ödeme fiyatımız 649 TL'dir 😊";
    }
  }

  if (detectedIntent === "chain_question" && detectedProduct === "lazer") {
    if (hasAny(messageNorm, ["zincir modeli", "zincir degisiyor mu"])) {
      return "Zincir modeliyle ilgili detay için ekibimize görsel üzerinden net bilgi verelim 😊";
    }
    if (hasAny(messageNorm, ["zincir kisalir mi", "zincir boyu", "zincir uzunlugu"])) {
      return "Standart zincir 60 cm’dir 😊";
    }
  }

  if (detectedIntent === "location") {
    return "Eminönü İstanbul’dayız 😊";
  }

  return "";
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
    });

    if (!context.message) {
      const emptyState = buildStateUpdate(context, FALLBACK_TEXT);

      return res.status(200).json({
        success: true,
        ...emptyState,
      });
    }

    const localReply = quickLocalReply(context);

    let finalReply = "";

    if (localReply) {
      finalReply = cleanReply(localReply);
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
      cancel_reason: "",
      context_lock: "",
      error: String(error.message || error),
    });
  }
}
