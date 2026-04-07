/**
 * Yudum Jewels — Kommo ↔ chat.js Webhook v3
 * Body'de field'lar gelirse direkt chat.js'e gönderir.
 * Kommo API'ye bağlanmaz — basit ve hızlı.
 */

import { processChat } from "./chat.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(200).json({ success: false, message: "Only POST supported." });
  }

  try {
    const data = req.body || {};
    const cf = data.custom_fields || {};

    const messageText = data.message_text || data.message || data.text || "";
    if (!messageText) {
      return res.status(200).json({ success: false, error: "no message" });
    }

    console.log("[KommoWH] Mesaj:", messageText.slice(0, 100));

    // chat.js payload — body'den veya custom_fields'dan al
    const chatPayload = {
      message: messageText,
      last_input_text: messageText,
      customer_id: data.contact_id || data.lead_id || "",
      customer_name: data.contact_name || "",
      instagram_username: data.ig_username || "",
      ig_username: data.ig_username || "",
      kommo_lead_id: data.lead_id || "",
      ilgilenilen_urun: cf.ilgilenilen_urun || data.ilgilenilen_urun || "",
      conversation_stage: cf.conversation_stage || data.conversation_stage || "",
      last_intent: cf.last_intent || data.last_intent || "",
      order_status: cf.order_status || data.order_status || "",
      payment_method: cf.payment_method || data.payment_method || "",
      photo_received: cf.photo_received || data.photo_received || "",
      back_text_status: cf.back_text_status || data.back_text_status || "",
      address_status: cf.address_status || data.address_status || "",
      support_mode: cf.support_mode || data.support_mode || "",
      support_mode_reason: cf.support_mode_reason || data.support_mode_reason || "",
      menu_gosterildi: cf.menu_gosterildi || data.menu_gosterildi || "",
      siparis_alindi: cf.siparis_alindi || data.siparis_alindi || "",
      letters_received: cf.letters_received || data.letters_received || "",
      phone_received: cf.phone_received || data.phone_received || "",
      reply_class: cf.reply_class || data.reply_class || "",
      context_lock: cf.context_lock || data.context_lock || "",
      cancel_reason: cf.cancel_reason || data.cancel_reason || "",
      ai_reply: cf.ai_reply || data.ai_reply || "",
      entry_product: cf.ilgilenilen_urun || data.ilgilenilen_urun || "",
      source: "kommo",
    };

    // chat.js çağır
    const result = await processChat(chatPayload);

    console.log("[KommoWH] Cevap:", (result.ai_reply || "").slice(0, 100));

    return res.status(200).json({
      success: true,
      ai_reply: result.ai_reply || "",
      fields: {
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
      },
    });
  } catch (error) {
    console.error("[KommoWH] Hata:", error.message);
    return res.status(200).json({
      success: false,
      ai_reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
      error: error.message,
    });
  }
}
