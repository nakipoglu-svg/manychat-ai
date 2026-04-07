/**
 * Yudum Jewels — Kommo ↔ chat.js Webhook Adaptörü
 * Dosya yolu: /api/kommo-webhook.js
 *
 * Kommo Salesbot → bu endpoint → chat.js → cevap → Kommo'ya geri
 */

import { processChat } from "./chat.js";

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

// Pipeline Stage Mapping
const STAGE_MAP = {
  "": "yeni_musteri",
  "waiting_product": "urun_secti",
  "waiting_photo": "foto_harf_bekleniyor",
  "waiting_letters": "foto_harf_bekleniyor",
  "waiting_back_text": "arka_yazi_bekleniyor",
  "waiting_payment": "odeme_bekleniyor",
  "waiting_address": "adres_bekleniyor",
  "order_completed": "siparis_tamamlandi",
  "human_support": "destek_iptal",
};

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(200).json({ success: false, message: "Only POST supported." });
  }

  try {
    const kommoData = req.body || {};
    const cf = kommoData.custom_fields || {};

    // Kommo verisini chat.js formatına çevir
    const chatPayload = {
      message: kommoData.message_text || kommoData.message || "",
      last_input_text: kommoData.message_text || kommoData.message || "",
      customer_id: kommoData.contact_id || kommoData.lead_id || "",
      customer_name: kommoData.contact_name || "",
      instagram_username: kommoData.ig_username || "",
      ig_username: kommoData.ig_username || "",
      kommo_lead_id: kommoData.lead_id || "",
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

    // chat.js'e direkt gönder (aynı projede olduğu için import ile çağırıyoruz)
    const result = await processChat(chatPayload);

    // Cevabı Kommo formatında döndür
    return res.status(200).json({
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
      pipeline_stage: STAGE_MAP[result.conversation_stage] || "yeni_musteri",
      needs_human: result.support_mode === "1",
    });
  } catch (error) {
    console.error("[Kommo Webhook] Hata:", error.message);
    return res.status(200).json({
      ai_reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
      fields: {},
      pipeline_stage: "destek_iptal",
      needs_human: true,
      error: error.message,
    });
  }
}
