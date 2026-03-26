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
  } catch {
    return "";
  }
}

function unwrapManychatValue(value) {
  if (value === null || value === undefined) return "";
  let str = String(value).trim();

  // CUF ID pattern — field set edilmemişse ID gelir, boş döndür
  if (/^cuf_\d+$/.test(str)) return "";

  str = str.replace(/^\{\{\{?/, "").replace(/\}\}\}?$/, "").trim();
  if (/^\{[^}]+\}$/.test(str)) return "";
  if (!str) return "";

  const lowered = str.toLowerCase();
  if (["undefined", "null", "no field selected", "not set"].includes(lowered)) return "";

  return str;
}

function extractJsonText(rawText) {
  if (!rawText) return "";
  let text = String(rawText).trim();
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  text = text.replace(/\s*```$/, "").trim();
  return text;
}

function normalizeStageName(stage) {
  if (!stage) return "";
  const s = String(stage).trim().toLowerCase();
  const validStages = [
    "product_unknown",
    "product_selected_lazer",
    "product_selected_atac",
    "photo_waiting",
    "photo_received",
    "back_text_waiting",
    "payment_waiting",
    "address_waiting",
    "address_received",
    "payment_selected",
    "order_completed",
    "order_cancelled",
    "letters_waiting",
    "letters_received"
  ];
  return validStages.includes(s) ? s : stage;
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
    conversationStage:
      unwrapManychatValue(body?.conversation_stage || "") ||
      getFieldFromFullContact(fullContactData, "conversation_stage"),
    photoReceived:
      unwrapManychatValue(body?.photo_received || "") ||
      getFieldFromFullContact(fullContactData, "photo_received"),
    paymentMethod:
      unwrapManychatValue(body?.payment_method || "") ||
      getFieldFromFullContact(fullContactData, "payment_method"),
    menuGosterildi:
      unwrapManychatValue(body?.menu_gosterildi || "") ||
      getFieldFromFullContact(fullContactData, "menu_gosterildi"),
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

function isPhotoUrl(message) {
  return (
    /https?:\/\/(lookaside\.fbsbx\.com|cdninstagram\.com|scontent\.|instagram\.com)/i.test(message) ||
    /asset_id=/i.test(message)
  );
}

function isOrderComplete(ctx, parsed) {
  const addressDone =
    parsed?.set_address_status === "received" || ctx.addressStatus === "received";
  const paymentDone =
    parsed?.set_payment_method === "eft" ||
    parsed?.set_payment_method === "kapida_odeme" ||
    ctx.paymentMethod === "eft" ||
    ctx.paymentMethod === "kapida_odeme";
  return addressDone && paymentDone;
}

function fallbackResponse() {
  return "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";
}

function hasForbiddenPrice(text) {
  return /\b299\b|\b349\b|\b399\b|\b449\b/.test(String(text || ""));
}

function selectKnowledgeFiles(ctx) {
  const coreFiles = [
    "SYSTEM_MASTER.txt",
    "CORE_SYSTEM.txt",
    "PRICING.txt",
    "PAYMENT.txt",
    "ORDER_FLOW.txt",
    "PRODUCT_LASER.txt",
    "PRODUCT_ATAC.txt",
    "EDGE_CASES.txt",
    "FEW_SHOT_EXAMPLES.txt"
  ];

  const extraFiles = [];
  const stage = ctx.conversationStage || "";

  // Fotoğraf aşamasında veya ürün yeni seçildiyse
  if (
    !stage ||
    stage === "product_unknown" ||
    stage === "product_selected_lazer" ||
    stage.includes("photo")
  ) {
    extraFiles.push("IMAGE_RULES.txt");
    extraFiles.push("SMALLTALK.txt");
    extraFiles.push("ROUTING_RULES.txt");
  }

  // Kargo
  if (ctx.lastIntent === "shipping") {
    extraFiles.push("SHIPPING.txt");
  }

  // Güven
  if (ctx.lastIntent === "trust") {
    extraFiles.push("TRUST.txt");
  }

  const allFiles = [...new Set([...coreFiles, ...extraFiles])];

  return allFiles
    .map((file) => {
      const content = safeReadKnowledgeFile(file);
      if (!content) return "";
      return `=== ${file} ===\n${content}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function buildSystemPrompt(ctx) {
  const stage = ctx.conversationStage || "product_unknown";
  const product = ctx.ilgilenilenUrun || "";

  return `Sen Yudum Jewels için çalışan Instagram satış asistanısın.

MEVCUT MÜŞTERİ DURUMU:
- Ürün: ${product || "henüz seçilmedi"}
- Konuşma aşaması: ${stage}
- Fotoğraf geldi mi: ${ctx.photoReceived || "hayır"}
- Ödeme yöntemi: ${ctx.paymentMethod || "seçilmedi"}
- Adres durumu: ${ctx.addressStatus || "bekleniyor"}
- Son intent: ${ctx.lastIntent || "-"}

STAGE TANIMLARI:
- product_unknown → ürün seçilmedi, ürünü netleştir
- product_selected_lazer → lazer kolye seçildi, fotoğraf iste
- product_selected_atac → ataç kolye seçildi, harf iste
- photo_waiting → fotoğraf bekleniyor
- photo_received → fotoğraf geldi
- back_text_waiting → arka yazı bekleniyor
- letters_waiting → harfler bekleniyor (ataç)
- letters_received → harfler geldi
- address_waiting → adres bekleniyor
- address_received → adres geldi
- payment_waiting → ödeme bekleniyor
- payment_selected → ödeme seçildi
- order_completed → sipariş tamamlandı
- order_cancelled → iptal edildi

KRİTİK KURALLAR:
1. ASLA dosyada olmayan fiyat yazma. 299, 349, 399, 449 KESİNLİKLE YASAK.
2. Lazer kolye: EFT=599TL Kapıda=649TL | Ataç kolye: EFT=499TL Kapıda=549TL
3. ilgilenilen_urun doluysa "Hangi model ile ilgileniyorsunuz?" YAZMA.
4. address_status=received ise tekrar adres ISTEME.
5. photo_received=evet ise tekrar fotoğraf ISTEME.
6. Müşteri fotoğraf URL'i gönderdiyse (https://lookaside.fbsbx.com vb.) bunu fotoğraf olarak algıla, set_photo_received="evet" yap, set_conversation_stage="photo_received" yap.
7. Adres VE ödeme ikisi de geldiyse set_order_status="completed" ve set_siparis_alindi="evet" yap.
8. Kısa, net, sıcak yaz. Robot gibi yazma.
9. Sadece gerçekten kapsam dışı durumda: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"

SADECE JSON döndür, başka hiçbir şey yazma:
{
  "reply": "müşteriye cevap",
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
}`;
}

function buildUserPrompt(ctx) {
  return `MÜŞTERİ MESAJI: ${ctx.message}

BAĞLAM:
- İlgilenilen ürün: ${ctx.ilgilenilenUrun || "-"}
- Konuşma aşaması: ${ctx.conversationStage || "-"}
- Fotoğraf geldi mi: ${ctx.photoReceived || "-"}
- Ödeme yöntemi: ${ctx.paymentMethod || "-"}
- Adres durumu: ${ctx.addressStatus || "-"}
- Sipariş durumu: ${ctx.orderStatus || "-"}
- Son intent: ${ctx.lastIntent || "-"}
- Context lock: ${ctx.contextLock || "-"}
- Arka yazı durumu: ${ctx.backTextStatus || "-"}`;
}

function applyHardGuards(reply, ctx) {
  if (!reply) return fallbackResponse();

  if (hasForbiddenPrice(reply)) {
    console.log("GUARD: forbidden price blocked");
    return fallbackResponse();
  }

  if (ctx.ilgilenilenUrun && reply.includes("Hangi model ile ilgileniyorsunuz")) {
    console.log("GUARD: product set but menu triggered");
    return fallbackResponse();
  }

  if (ctx.addressStatus === "received" && /ad soyad|açık adres|cep telefon|adresinizi/i.test(reply)) {
    console.log("GUARD: address already received");
    return fallbackResponse();
  }

  if (ctx.photoReceived === "evet" && /fotoğrafı buradan|fotoğraf gönder|resim gönder/i.test(reply)) {
    console.log("GUARD: photo already received");
    return fallbackResponse();
  }

  return reply;
}

export default async function handler(req, res) {
  const emptyResponse = {
    reply: fallbackResponse(),
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
  };

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

    if (!ctx.message) {
      return res.status(200).json(emptyResponse);
    }

    console.log("CTX:", JSON.stringify({
      message: ctx.message,
      ilgilenilenUrun: ctx.ilgilenilenUrun,
      conversationStage: ctx.conversationStage,
      photoReceived: ctx.photoReceived,
      paymentMethod: ctx.paymentMethod,
      lastIntent: ctx.lastIntent,
      orderStatus: ctx.orderStatus,
      addressStatus: ctx.addressStatus,
      contextLock: ctx.contextLock
    }, null, 2));

    // Fotoğraf URL'i geldi mi? Direkt yakala
    if (isPhotoUrl(ctx.message)) {
      console.log("PHOTO URL DETECTED");
      const reply = ctx.photoReceived === "evet"
        ? "İnceleyip size döneceğiz efendim 😊"
        : "Fotoğrafınız ulaştı 😊 İnceleyip size döneceğiz.";
      return res.status(200).json({
        reply,
        set_conversation_stage: "photo_received",
        set_last_intent: "image",
        set_ilgilenilen_urun: ctx.ilgilenilenUrun || "lazer",
        set_photo_received: "evet",
        set_payment_method: ctx.paymentMethod || "",
        set_order_status: ctx.orderStatus || "",
        set_back_text_status: ctx.backTextStatus || "",
        set_address_status: ctx.addressStatus || "",
        set_support_mode: "",
        set_siparis_alindi: ctx.siparisAlindi || "",
        set_cancel_reason: "",
        set_context_lock: "product_locked",
        set_menu_gosterildi: ""
      });
    }

    // DeepSeek API
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.log("NO API KEY");
      return res.status(200).json(emptyResponse);
    }

    const knowledgeText = selectKnowledgeFiles(ctx);
    const systemPrompt = buildSystemPrompt(ctx);
    const userPrompt = buildUserPrompt(ctx);

    const payload = {
      model: "deepseek-chat",
      max_tokens: 800,
      temperature: 0,
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
        Authorization: "Bearer " + apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content?.trim() || "";
    console.log("DEEPSEEK RAW:", rawText);

    const cleanedText = extractJsonText(rawText);

    let parsed = null;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      console.log("JSON PARSE ERROR");
      return res.status(200).json(emptyResponse);
    }

    if (!parsed || !parsed.reply) {
      return res.status(200).json(emptyResponse);
    }

    const reply = applyHardGuards(parsed.reply.trim(), ctx);

    // Sipariş tamamlanma kontrolü
    let finalOrderStatus = unwrapManychatValue(parsed.set_order_status || "");
    let finalSiparisAlindi = unwrapManychatValue(parsed.set_siparis_alindi || "");
    let finalStage = normalizeStageName(unwrapManychatValue(parsed.set_conversation_stage || ""));

    if (isOrderComplete(ctx, parsed)) {
      finalOrderStatus = "completed";
      finalSiparisAlindi = "evet";
      finalStage = "order_completed";
    }

    return res.status(200).json({
      reply,
      set_conversation_stage: finalStage,
      set_last_intent: unwrapManychatValue(parsed.set_last_intent || ""),
      set_ilgilenilen_urun: unwrapManychatValue(parsed.set_ilgilenilen_urun || ""),
      set_photo_received: unwrapManychatValue(parsed.set_photo_received || ""),
      set_payment_method: unwrapManychatValue(parsed.set_payment_method || ""),
      set_order_status: finalOrderStatus,
      set_back_text_status: unwrapManychatValue(parsed.set_back_text_status || ""),
      set_address_status: unwrapManychatValue(parsed.set_address_status || ""),
      set_support_mode: unwrapManychatValue(parsed.set_support_mode || ""),
      set_siparis_alindi: finalSiparisAlindi,
      set_cancel_reason: unwrapManychatValue(parsed.set_cancel_reason || ""),
      set_context_lock: unwrapManychatValue(parsed.set_context_lock || ""),
      set_menu_gosterildi: unwrapManychatValue(parsed.set_menu_gosterildi || "")
    });

  } catch (err) {
    console.error("chat.js error:", err);
    return res.status(200).json({
      reply: fallbackResponse(),
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
