/**
 * Yudum Jewels — Kommo ↔ chat.js Webhook Adaptörü v2
 * Dosya yolu: /api/kommo-webhook.js
 *
 * AKIŞ:
 * 1. Kommo webhook → bu endpoint (lead bilgisi gelir)
 * 2. Kommo API ile müşterinin son mesajını ve field'ları alır
 * 3. chat.js'e gönderir
 * 4. Dönen cevabı Kommo API ile müşteriye mesaj olarak gönderir
 * 5. Field'ları Kommo API ile günceller
 */

const KOMMO_DOMAIN = "https://api-c.kommo.com";
const KOMMO_TOKEN = process.env.KOMMO_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjM2YTAyNGU4MjkzMDI3YWM3NDgxNDRiM2JlZGEzZGY3NWRkODI2MGJjODJjNTU5ZTQzMDliZDRmN2FmOTQxOWRmMGQ0MDQwMmE5ZWMzYTkwIn0.eyJhdWQiOiI1MTNiOWJmOC1lNzEwLTQzNzYtYmVlMS1kZGE2YThmNTI3YmIiLCJqdGkiOiIzNmEwMjRlODI5MzAyN2FjNzQ4MTQ0YjNiZWRhM2RmNzVkZDgyNjBiYzgyYzU1OWU0MzA5YmQ0ZjdhZjk0MTlkZjBkNDA0MDJhOWVjM2E5MCIsImlhdCI6MTc3NTU4MjQ4NywibmJmIjoxNzc1NTgyNDg3LCJleHAiOjE3Nzc1MDcyMDAsInN1YiI6IjE1MDYyNjIzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM2Mjk5NjU1LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiYmNlYTZkM2ItMmZkMC00YjI2LWEwMmUtZjUzZmM0N2U1ZWJjIiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.NvHomqkguoAWd-jjA6fiem2eSk2-40hPy-kYy8THeUMH5VQEY93nYJzwm4SZ5un5C9Bzmzg92rVwzm-rCELv__blAZz2nP842vCaPjh7DgMM9naYzr7A1Ep7dmZ850AUTmXQDbl03wplRYbU-v2Dn0L2uK756odeLyE0Qsgd88sUQLvdWGcKZYUpjRBf7VJpeBUANkEnzNjgzOSo616PbgMQonnNiOHNwJtkwDCnNHDCJ0M4u1eJiqut0_BUV9p2dM2aJK13sYtUNQ2kTKv9noI3cgEi9XYxE1-tyH8azJuYeC3XV7hWLfnTV5JsW8xPQN9YZEtdkaAQNQhkBMvpJA";

// Kommo Custom Field ID'leri
const FIELD_IDS = {
  ilgilenilen_urun: 1831171,
  conversation_stage: 1831173,
  last_intent: 1831175,
  order_status: 1831177,
  payment_method: 1831179,
  photo_received: 1831181,
  back_text_status: 1831183,
  address_status: 1831185,
  support_mode: 1831187,
  support_mode_reason: 1831189,
  menu_gosterildi: 1831191,
  siparis_alindi: 1831193,
  letters_received: 1831195,
  phone_received: 1831197,
  reply_class: 1831199,
  context_lock: 1831201,
  cancel_reason: 1831203,
  ai_reply: 1831205,
};

// ─── KOMMO API HELPER ───────────────────────────────────────
async function kommoAPI(method, path, body = null) {
  const opts = {
    method,
    headers: {
      "Authorization": `Bearer ${KOMMO_TOKEN}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${KOMMO_DOMAIN}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    console.error(`[Kommo API] ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
    return null;
  }
  try { return await res.json(); } catch { return null; }
}

// ─── LEAD'DEN FIELD DEĞERLERİNİ OKU ────────────────────────
function extractFieldsFromLead(lead) {
  const cf = {};
  if (!lead || !lead.custom_fields_values) return cf;

  for (const field of lead.custom_fields_values) {
    // Field ID → field name eşleştir
    for (const [name, id] of Object.entries(FIELD_IDS)) {
      if (field.field_id === id) {
        cf[name] = field.values?.[0]?.value || "";
        break;
      }
    }
  }
  return cf;
}

// ─── FIELD'LARI GÜNCELLE ────────────────────────────────────
async function updateLeadFields(leadId, fields) {
  const customFields = [];

  for (const [name, value] of Object.entries(fields)) {
    const fieldId = FIELD_IDS[name];
    if (fieldId && value !== undefined) {
      customFields.push({
        field_id: fieldId,
        values: [{ value: String(value) }],
      });
    }
  }

  if (customFields.length === 0) return;

  await kommoAPI("PATCH", `/api/v4/leads/${leadId}`, {
    custom_fields_values: customFields,
  });
}

// ─── MESAJ GÖNDER (Talk API) ────────────────────────────────
async function sendMessage(chatId, text) {
  if (!chatId || !text) return;

  // Kommo Talk API ile mesaj gönder
  await kommoAPI("POST", `/api/v4/chats/${chatId}/messages`, {
    text: text,
  });
}

// ─── ANA HANDLER ────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(200).json({ success: false, message: "Only POST supported." });
  }

  try {
    const webhookData = req.body || {};
    console.log("[Kommo WH] Gelen:", JSON.stringify(webhookData).slice(0, 500));

    // Webhook'tan lead ID ve mesaj bilgisini al
    // Kommo webhook formatı: message[add][0][...] veya direkt body
    let leadId, messageText, chatId, contactName;

    // Format 1: Kommo standart webhook (message event)
    if (webhookData.message && webhookData.message.add) {
      const msg = webhookData.message.add[0] || {};
      leadId = msg.lead_id || msg.element_id;
      messageText = msg.text || "";
      chatId = msg.chat_id;
    }
    // Format 2: Salesbot web kancası
    else if (webhookData.lead_id || webhookData.leads) {
      leadId = webhookData.lead_id || (webhookData.leads && webhookData.leads[0]);
      messageText = webhookData.message_text || webhookData.text || "";
      chatId = webhookData.chat_id;
    }
    // Format 3: Direkt test
    else if (webhookData.message_text) {
      leadId = webhookData.lead_id;
      messageText = webhookData.message_text;
      chatId = webhookData.chat_id;
    }

    if (!leadId) {
      console.log("[Kommo WH] Lead ID yok, skip");
      return res.status(200).json({ success: false, error: "no lead_id" });
    }

    // 1. Lead bilgilerini Kommo API'den al (field'lar dahil)
    const lead = await kommoAPI("GET", `/api/v4/leads/${leadId}?with=contacts`);
    if (!lead) {
      console.error("[Kommo WH] Lead alınamadı:", leadId);
      return res.status(200).json({ success: false, error: "lead not found" });
    }

    // Field'ları oku
    const cf = extractFieldsFromLead(lead);
    console.log("[Kommo WH] Fields:", JSON.stringify(cf).slice(0, 300));

    // Eğer mesaj webhook'tan gelmediyse, son mesajı chat'ten al
    if (!messageText && chatId) {
      // Chat mesajlarını al
      const messages = await kommoAPI("GET", `/api/v4/chats/${chatId}/messages?limit=1&order=desc`);
      if (messages && messages._embedded && messages._embedded.messages) {
        const lastMsg = messages._embedded.messages[0];
        if (lastMsg && lastMsg.author && lastMsg.author.type === "contact") {
          messageText = lastMsg.text || "";
        }
      }
    }

    if (!messageText) {
      console.log("[Kommo WH] Mesaj yok, skip");
      return res.status(200).json({ success: false, error: "no message" });
    }

    console.log("[Kommo WH] Mesaj:", messageText.slice(0, 100));

    // 2. chat.js payload oluştur
    const chatPayload = {
      message: messageText,
      last_input_text: messageText,
      customer_id: String(leadId),
      customer_name: contactName || "",
      kommo_lead_id: String(leadId),
      ilgilenilen_urun: cf.ilgilenilen_urun || "",
      conversation_stage: cf.conversation_stage || "",
      last_intent: cf.last_intent || "",
      order_status: cf.order_status || "",
      payment_method: cf.payment_method || "",
      photo_received: cf.photo_received || "",
      back_text_status: cf.back_text_status || "",
      address_status: cf.address_status || "",
      support_mode: cf.support_mode || "",
      support_mode_reason: cf.support_mode_reason || "",
      menu_gosterildi: cf.menu_gosterildi || "",
      siparis_alindi: cf.siparis_alindi || "",
      letters_received: cf.letters_received || "",
      phone_received: cf.phone_received || "",
      reply_class: cf.reply_class || "",
      context_lock: cf.context_lock || "",
      cancel_reason: cf.cancel_reason || "",
      ai_reply: cf.ai_reply || "",
      entry_product: cf.ilgilenilen_urun || "",
      source: "kommo",
    };

    // 3. chat.js'i çağır (aynı projede — direkt import)
    const { processChat } = await import("./chat.js");
    const result = await processChat(chatPayload);

    console.log("[Kommo WH] chat.js cevap:", result.ai_reply?.slice(0, 100));

    // 4. Kommo'da field'ları güncelle
    await updateLeadFields(leadId, {
      ilgilenilen_urun: result.ilgilenilen_urun || result.user_product || "",
      conversation_stage: result.conversation_stage || "",
      last_intent: result.last_intent || "",
      order_status: result.order_status || "",
      payment_method: result.payment_method || "",
      photo_received: result.photo_received || "",
      back_text_status: result.back_text_status || "",
      address_status: result.address_status || "",
      support_mode: result.support_mode || "",
      support_mode_reason: result.support_mode_reason || "",
      menu_gosterildi: result.menu_gosterildi || "",
      siparis_alindi: result.siparis_alindi || "",
      letters_received: result.letters_received || "",
      phone_received: result.phone_received || "",
      reply_class: result.reply_class || "",
      context_lock: result.context_lock || "",
      cancel_reason: result.cancel_reason || "",
      ai_reply: result.ai_reply || "",
    });

    // 5. Müşteriye mesaj gönder
    if (result.ai_reply && chatId) {
      await sendMessage(chatId, result.ai_reply);
    }

    return res.status(200).json({
      success: true,
      ai_reply: result.ai_reply || "",
      conversation_stage: result.conversation_stage || "",
    });

  } catch (error) {
    console.error("[Kommo WH] Hata:", error.message, error.stack);
    return res.status(200).json({
      success: false,
      error: error.message,
    });
  }
}
