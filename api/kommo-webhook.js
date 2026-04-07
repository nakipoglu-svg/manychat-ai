/**
 * Yudum Jewels — Kommo ↔ chat.js Webhook v4 (FINAL)
 * 
 * 1. Kommo'dan webhook gelir (mesaj + lead bilgisi)
 * 2. chat.js cevap üretir
 * 3. Kommo API ile müşteriye cevap gönderir
 * 4. Kommo API ile field'ları günceller
 */

import { processChat } from "./chat.js";

const KOMMO_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImMxNWFkZTM4NTAzMWJjMDJlMjc0NTFhODgyZGFlZmEwM2U0ZjNiMjJmZmM4NWJiMTZkZDZmNzBmY2NiY2M1MTVhNGI4ZTBmNTdhMzE4MjAwIn0.eyJhdWQiOiI1MTNiOWJmOC1lNzEwLTQzNzYtYmVlMS1kZGE2YThmNTI3YmIiLCJqdGkiOiJjMTVhZGUzODUwMzFiYzAyZTI3NDUxYTg4MmRhZWZhMDNlNGYzYjIyZmZjODViYjE2ZGQ2ZjcwZmNjYmNjNTE1YTRiOGUwZjU3YTMxODIwMCIsImlhdCI6MTc3NTU5NTQ3MSwibmJmIjoxNzc1NTk1NDcxLCJleHAiOjE3Nzc0MjA4MDAsInN1YiI6IjE1MDYyNjIzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM2Mjk5NjU1LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiZjU4NDYzMjAtN2QyZi00NmRmLTg3MjgtOGQ2MWFkMzEzYTYwIiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.RE5mRpGc_wyR0ixUDS5MEMwnqO3IIyg4XTaQd775gCabNlnc11V61w2Ol5unLr3HySbsRgFFlqjD3kS6JVKibMrUpCnaHyxAHhv1mzOnqC0N3dK_Jc1VLIy6iwj-hSO3JbgVNdTLxqJB2WjUI2-RDtzGIb_E4LfkQx_-auj-Fvr2lqwZZhG4ChtP1MmgWpZKlocXpvSxeEvjEzHuAyEQlKyF5hbXwRLlYGRIbV_9R_tGa-EjsoYyXkGYxCCXhMVnBF0c6t84iDHwpW4EviOANaBsV9fKXSrhqHsm8PeFpCrv5n96WamOuBg7potKLX5fH0u1JNcqBcNI9fvdf8_ATw";

const KOMMO_API = "https://api-c.kommo.com";

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

// ─── KOMMO API HELPER ───────────────────────────────────
async function kommoFetch(method, path, body = null) {
  const opts = {
    method,
    headers: {
      "Authorization": `Bearer ${KOMMO_TOKEN}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  
  const r = await fetch(`${KOMMO_API}${path}`, opts);
  const text = await r.text();
  console.log(`[KOMMO] ${method} ${path} → ${r.status}`);
  if (!r.ok) console.log(`[KOMMO] Error: ${text.slice(0, 200)}`);
  try { return { status: r.status, data: JSON.parse(text) }; } 
  catch { return { status: r.status, data: text }; }
}

// ─── LEAD'DEN FIELD'LARI OKU ────────────────────────────
function readFieldsFromLead(lead) {
  const cf = {};
  if (!lead || !lead.custom_fields_values) return cf;
  for (const f of lead.custom_fields_values) {
    for (const [name, id] of Object.entries(FIELD_IDS)) {
      if (f.field_id === id) { cf[name] = f.values?.[0]?.value || ""; break; }
    }
  }
  return cf;
}

// ─── FIELD'LARI GÜNCELLE ────────────────────────────────
async function updateFields(leadId, fields) {
  const cfv = [];
  for (const [name, val] of Object.entries(fields)) {
    const fid = FIELD_IDS[name];
    if (fid && val !== undefined) cfv.push({ field_id: fid, values: [{ value: String(val) }] });
  }
  if (cfv.length === 0) return;
  return kommoFetch("PATCH", `/api/v4/leads/${leadId}`, { custom_fields_values: cfv });
}

// ─── MESAJ GÖNDER ───────────────────────────────────────
async function sendReply(chatId, text) {
  if (!chatId || !text) return;
  // Kommo Chat API — talk_id ile mesaj gönder
  return kommoFetch("POST", `/api/v4/chats/${chatId}/messages`, [
    { type: "text", text: text }
  ]);
}

// ─── HANDLER ────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(200).json({ success: false, message: "Only POST supported." });

  try {
    const data = req.body || {};
    console.log("[WH] Incoming:", JSON.stringify(data).slice(0, 500));

    // ── Direkt test modu (custom_fields body'de) ──
    if (data.custom_fields || data.message_text) {
      const cf = data.custom_fields || {};
      const msg = data.message_text || data.message || "";
      if (!msg) return res.status(200).json({ success: false, error: "no message" });

      const result = await processChat({
        message: msg, last_input_text: msg,
        customer_id: data.lead_id || "", source: "kommo",
        ilgilenilen_urun: cf.ilgilenilen_urun || data.ilgilenilen_urun || "",
        conversation_stage: cf.conversation_stage || data.conversation_stage || "",
        last_intent: cf.last_intent || "", order_status: cf.order_status || "",
        payment_method: cf.payment_method || "", photo_received: cf.photo_received || "",
        back_text_status: cf.back_text_status || "", address_status: cf.address_status || "",
        support_mode: cf.support_mode || "", support_mode_reason: cf.support_mode_reason || "",
        menu_gosterildi: cf.menu_gosterildi || "", siparis_alindi: cf.siparis_alindi || "",
        letters_received: cf.letters_received || "", phone_received: cf.phone_received || "",
        reply_class: cf.reply_class || "", context_lock: cf.context_lock || "",
        cancel_reason: cf.cancel_reason || "", ai_reply: cf.ai_reply || "",
        entry_product: cf.ilgilenilen_urun || "",
      });

      // Eğer lead_id varsa, Kommo'ya field güncelle + mesaj gönder
      if (data.lead_id && String(data.lead_id).match(/^\d+$/)) {
        await updateFields(data.lead_id, {
          ilgilenilen_urun: result.ilgilenilen_urun || result.user_product || "",
          conversation_stage: result.conversation_stage || "",
          last_intent: result.last_intent || "", order_status: result.order_status || "",
          payment_method: result.payment_method || "", photo_received: result.photo_received || "",
          back_text_status: result.back_text_status || "", address_status: result.address_status || "",
          support_mode: result.support_mode || "", support_mode_reason: result.support_mode_reason || "",
          menu_gosterildi: result.menu_gosterildi || "", siparis_alindi: result.siparis_alindi || "",
          letters_received: result.letters_received || "", phone_received: result.phone_received || "",
          reply_class: result.reply_class || "", context_lock: result.context_lock || "",
          cancel_reason: result.cancel_reason || "", ai_reply: result.ai_reply || "",
        });
        if (data.chat_id) await sendReply(data.chat_id, result.ai_reply);
      }

      return res.status(200).json({ success: true, ai_reply: result.ai_reply || "", fields: result });
    }

    // ── Kommo Webhook modu (otomatik tetikleme) ──
    // Kommo webhook gelen mesaj formatı
    let leadId, messageText, chatId;

    // Kommo unsorted/message webhook formatları
    if (data.message) {
      // data.message.add[0] formatı
      if (data.message.add && Array.isArray(data.message.add)) {
        const msg = data.message.add[0];
        chatId = msg?.chat_id;
        messageText = msg?.text || "";
        // Lead ID'yi bulmak için chat bilgisinden
      }
    }
    
    // Salesbot web kancası formatı
    if (!messageText) {
      leadId = data.lead_id || data.leads?.[status]?.[0]?.id;
      messageText = data.text || data.message_text || "";
      chatId = data.chat_id;
    }

    // Eğer lead ID varsa ama mesaj yoksa, lead'den son mesajı al
    if (leadId && !messageText) {
      const leadRes = await kommoFetch("GET", `/api/v4/leads/${leadId}?with=contacts`);
      if (leadRes.status === 200 && leadRes.data) {
        const cf = readFieldsFromLead(leadRes.data);
        // Lead'den field bilgileri alındı ama mesaj yok — skip
        console.log("[WH] Lead found but no message");
      }
    }

    if (!messageText) {
      console.log("[WH] No message found in webhook payload");
      return res.status(200).json({ success: false, error: "no message in webhook" });
    }

    // Lead bilgilerini al
    let cf = {};
    if (leadId) {
      const leadRes = await kommoFetch("GET", `/api/v4/leads/${leadId}?with=contacts`);
      if (leadRes.status === 200 && leadRes.data) {
        cf = readFieldsFromLead(leadRes.data);
      }
    }

    // chat.js çağır
    const result = await processChat({
      message: messageText, last_input_text: messageText,
      customer_id: String(leadId || ""), source: "kommo",
      ...cf, entry_product: cf.ilgilenilen_urun || "",
    });

    console.log("[WH] Reply:", (result.ai_reply || "").slice(0, 100));

    // Field güncelle
    if (leadId) {
      await updateFields(leadId, {
        ilgilenilen_urun: result.ilgilenilen_urun || result.user_product || "",
        conversation_stage: result.conversation_stage || "",
        last_intent: result.last_intent || "", order_status: result.order_status || "",
        payment_method: result.payment_method || "", photo_received: result.photo_received || "",
        back_text_status: result.back_text_status || "", address_status: result.address_status || "",
        support_mode: result.support_mode || "", support_mode_reason: result.support_mode_reason || "",
        menu_gosterildi: result.menu_gosterildi || "", siparis_alindi: result.siparis_alindi || "",
        letters_received: result.letters_received || "", phone_received: result.phone_received || "",
        reply_class: result.reply_class || "", context_lock: result.context_lock || "",
        cancel_reason: result.cancel_reason || "", ai_reply: result.ai_reply || "",
      });
    }

    // Mesaj gönder
    if (chatId && result.ai_reply) {
      await sendReply(chatId, result.ai_reply);
    }

    return res.status(200).json({ success: true, ai_reply: result.ai_reply || "" });

  } catch (error) {
    console.error("[WH] Error:", error.message, error.stack?.slice(0, 300));
    return res.status(200).json({ success: false, error: error.message });
  }
}
