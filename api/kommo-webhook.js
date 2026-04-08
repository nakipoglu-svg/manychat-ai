import { processChat } from "./chat.js";

const T = process.env.KOMMO_TOKEN || "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImRhZDAzOGMxZjlmNGU0ODQ5MmE1MjU3NmU5Y2U4N2NlMWQ1Nzc5N2E2NmMzYzJlZWE2OWJjOWU2NjU1MzNmYzRlZDJhNmMxYzM1Mjc5Yzk2In0.eyJhdWQiOiI1MTNiOWJmOC1lNzEwLTQzNzYtYmVlMS1kZGE2YThmNTI3YmIiLCJqdGkiOiJkYWQwMzhjMWY5ZjRlNDg0OTJhNTI1NzZlOWNlODdjZTFkNTc3OTdhNjZjM2MyZWVhNjliYzllNjY1NTMzZmM0ZWQyYTZjMWMzNTI3OWM5NiIsImlhdCI6MTc3NTU5Njg0NCwibmJmIjoxNzc1NTk2ODQ0LCJleHAiOjE5MzI3NjgwMDAsInN1YiI6IjE1MDYyNjIzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM2Mjk5NjU1LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiOWUwODY3MGUtNGJmNC00Yjc4LWE4NTAtNDdkMGI0MWQ0Yjg1IiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.Q62ZD_x7abJzQ9LQIVNDKrFkdWvZXhZIbtyqHpiGVbZSGGqnRfs0TffW1xEufTQvXOmM0T2Mg7o9qsVAIvtlI7hxyv2KseSH1hMuhxROyZXxu-rliH1F8P-r4V-Np232wxztTxvzvXemHLIVCMw7L6bqOYAsPgjHEVzPcRVn_Ka8KPeIF6q5Yy5NA4OG_NiD7sfH_Fn2fDkDTxWsZjqWrzw0eIlqGavc5YEuJEiHvhf3_QAZFvEKJc-NA87fw_5i0zWJaMIXfu4fzduAFGU39m0CaRA5cKjLVOQkVCPw5iZCkqOrdC1lKBfRQusEM64LqBGS8WhzaM9eD_U8k_hKCw";
const API = "https://nakipoglu.kommo.com";
const HDR = { "Authorization": "Bearer " + T, "Content-Type": "application/json" };

const REPLY_BOT_ID = 72303;
const MENU_BOT_ID = 72073;  // Salesbot #3 — butonlu menü botu

const FID = {
  ilgilenilen_urun: 1831171, conversation_stage: 1831173, last_intent: 1831175,
  order_status: 1831177, payment_method: 1831179, photo_received: 1831181,
  back_text_status: 1831183, address_status: 1831185, support_mode: 1831187,
  support_mode_reason: 1831189, menu_gosterildi: 1831191, siparis_alindi: 1831193,
  letters_received: 1831195, phone_received: 1831197, reply_class: 1831199,
  context_lock: 1831201, cancel_reason: 1831203, ai_reply: 1831205,
};

// ═══════════════════════════════════════════════════════════════
// SALESBOT #3 BUTON TIKLAMALARı — ÇİFT CEVAP KORUMASI
// Salesbot #3'ün buton metinlerini buraya ekleyin.
// Bu metinler geldiğinde chat.js ÇAĞRILMAZ (Salesbot #3 zaten cevap veriyor).
// Ama field güncellemesini BİZ yaparız (Salesbot #3'ten field bloklarını kaldırdık).
// ═══════════════════════════════════════════════════════════════
const SALESBOT_BUTTON_TEXTS = new Set([
  "resimli lazer kolye",
  "harfli ataç kolye",
  // ↓↓↓ Diğer buton metinlerini küçük harfle ekleyin ↓↓↓
]);

function isSalesbotButtonClick(text) {
  if (!text) return false;
  return SALESBOT_BUTTON_TEXTS.has(text.trim().toLowerCase());
}

// Buton tıklamasına göre hangi ürün seçildi
function getProductFromButton(text) {
  const t = (text || "").trim().toLowerCase();
  if (t.includes("resimli") || t.includes("lazer")) return "lazer";
  if (t.includes("harfli") || t.includes("ataç") || t.includes("atac")) return "atac";
  return "";
}

// ═══════════════════════════════════════════════════════════════
// DEDUP — Kommo aynı mesaj için 5-10 webhook çağrısı yapabiliyor
// Hem msgId hem de lead+text kombinasyonunu kontrol ediyoruz
// ═══════════════════════════════════════════════════════════════
const processedMessages = new Map();
const DEDUP_TTL = 30000;

function isDuplicate(msgId, leadId, msgText) {
  const now = Date.now();
  // Eski kayıtları temizle
  for (const [key, ts] of processedMessages) {
    if (now - ts > DEDUP_TTL) processedMessages.delete(key);
  }

  // 1. msgId ile kontrol
  if (msgId && processedMessages.has("id:" + msgId)) return true;

  // 2. lead + text ile kontrol (Kommo farklı ID'lerle aynı mesajı gönderebilir)
  const textKey = "lt:" + (leadId || "") + ":" + (msgText || "").slice(0, 100);
  if (processedMessages.has(textKey)) return true;

  // Her iki key'i de kaydet
  if (msgId) processedMessages.set("id:" + msgId, now);
  processedMessages.set(textKey, now);
  return false;
}

// ═══════════════════════════════════════════════════════════════
// KOMMO API HELPERS
// ═══════════════════════════════════════════════════════════════

// Kommo Salesbot mesaj bloğu emoji'den sonrasını kesiyor.
// ai_reply field'ına yazarken emoji'leri kaldır.
function stripEmoji(text) {
  if (!text) return "";
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")  // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "")  // Misc Symbols
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "")  // Transport
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")  // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, "")     // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, "")     // Dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")     // Variation Selectors
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, "")   // Supplemental
    .replace(/[\u{200D}]/gu, "")              // Zero Width Joiner
    .replace(/[\u{20E3}]/gu, "")              // Combining Enclosing Keycap
    .replace(/[\u{E0020}-\u{E007F}]/gu, "")   // Tags
    .replace(/\s{2,}/g, " ")                   // Çift boşlukları temizle
    .trim();
}

function readFields(lead) {
  const cf = {};
  if (!lead || !lead.custom_fields_values) return cf;
  for (const f of lead.custom_fields_values) {
    for (const [n, id] of Object.entries(FID)) {
      if (f.field_id === id) { cf[n] = f.values?.[0]?.value || ""; break; }
    }
  }
  return cf;
}

async function kApi(method, path, body) {
  const o = { method, headers: HDR };
  if (body) o.body = JSON.stringify(body);
  const r = await fetch(API + path, o);
  const t = await r.text();
  console.log("[K]", method, path, r.status, t.slice(0, 300));
  try { return { s: r.status, d: JSON.parse(t) }; } catch { return { s: r.status, d: t }; }
}

async function updateFields(leadId, fields) {
  const cfv = [];
  for (const [n, v] of Object.entries(fields)) {
    if (FID[n] && v !== undefined) cfv.push({ field_id: FID[n], values: [{ value: String(v) }] });
  }
  if (cfv.length > 0) return await kApi("PATCH", "/api/v4/leads/" + leadId, { custom_fields_values: cfv });
}

async function triggerSalesbot(leadId) {
  console.log("[WH] Triggering bot", REPLY_BOT_ID, "for lead", leadId);
  const result = await kApi("POST", "/api/v4/bots/" + REPLY_BOT_ID + "/run", {
    entity_id: Number(leadId),
    entity_type: "leads"
  });
  console.log("[WH] Bot trigger:", result.s);
  return result;
}

// ═══════════════════════════════════════════════════════════════
// ANA WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(200).json({ success: false, message: "Only POST supported." });

  try {
    const d = req.body || {};

    // ── Doğrudan API çağrısı (ManyChat uyumlu format) ──
    if (d.message_text) {
      const cf = d.custom_fields || {};
      const result = await processChat({
        message: d.message_text, last_input_text: d.message_text, source: "kommo",
        customer_id: d.lead_id || "",
        ilgilenilen_urun: cf.ilgilenilen_urun || "", conversation_stage: cf.conversation_stage || "",
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
      return res.status(200).json({ success: true, ai_reply: result.ai_reply || "", fields: result });
    }

    // ── Kommo webhook format ──
    const msgText = d["message[add][0][text]"] || "";
    const msgType = d["message[add][0][type]"] || "";
    const msgId = d["message[add][0][id]"] || "";

    if (!msgText) return res.status(200).json({ ok: true, skipped: true, reason: "no_message_text" });
    if (msgType === "outgoing") return res.status(200).json({ ok: true, skipped: true, reason: "outgoing" });

    const leadId = d["message[add][0][element_id]"] || d["message[add][0][entity_id]"] || "";
    const contactId = d["message[add][0][contact_id]"] || "";

    // Güçlendirilmiş dedup: msgId + lead+text kombinasyonu
    if (isDuplicate(msgId, leadId || contactId, msgText)) {
      console.log("[WH] ⏭️ Duplicate atlandı:", msgText.slice(0, 40));
      return res.status(200).json({ ok: true, skipped: true, reason: "duplicate" });
    }

    console.log("[WH] MSG:", msgText.slice(0, 60), "lead:", leadId);

    // ══════════════════════════════════════════════════════════
    // FIX #1 + #4: BUTON TIKLAMASI TESPİTİ
    // Salesbot #3'ün butonuna tıklandıysa:
    // → chat.js çağırma (Salesbot #3 zaten cevap veriyor)
    // → Sadece field güncelle (ürün seçimi + stage)
    // ══════════════════════════════════════════════════════════
    if (isSalesbotButtonClick(msgText)) {
      console.log("[WH] 🔘 Buton tıklaması:", msgText, "— chat.js ATLANYOR");

      let resolvedLeadId = leadId;
      if (!resolvedLeadId && contactId) {
        const contactRes = await kApi("GET", "/api/v4/contacts/" + contactId + "?with=leads");
        if (contactRes.s === 200 && contactRes.d?._embedded?.leads?.[0]?.id) {
          resolvedLeadId = String(contactRes.d._embedded.leads[0].id);
        }
      }

      if (resolvedLeadId) {
        const product = getProductFromButton(msgText);
        // FIX #2: Field güncellemesini SADECE biz yapıyoruz (Salesbot #3'ten kaldırıldı)
        await updateFields(resolvedLeadId, {
          ilgilenilen_urun: product,
          conversation_stage: product === "lazer" ? "waiting_photo" : "waiting_letters",
          context_lock: "1",
          order_status: "started",
          last_intent: "product_entry",
        });
      }

      return res.status(200).json({
        ok: true,
        handled_by: "salesbot3_button",
        product: getProductFromButton(msgText),
      });
    }

    // ══════════════════════════════════════════════════════════
    // NORMAL MESAJ İŞLEME (buton tıklaması DEĞİL)
    // FIX #3: Lead okuma + chat.js PARALEL çalışır
    // ══════════════════════════════════════════════════════════

    // Adım 1: Lead ID resolve (gerekirse contact'tan)
    let resolvedLeadId = leadId;
    if (!resolvedLeadId && contactId) {
      const contactRes = await kApi("GET", "/api/v4/contacts/" + contactId + "?with=leads");
      if (contactRes.s === 200 && contactRes.d?._embedded?.leads?.[0]?.id) {
        resolvedLeadId = String(contactRes.d._embedded.leads[0].id);
      }
    }

    // Adım 2: Lead field'larını oku (paralel başlatılacak)
    let cf = {};
    if (resolvedLeadId) {
      const lr = await kApi("GET", "/api/v4/leads/" + resolvedLeadId);
      if (lr.s === 200) cf = readFields(lr.d);
    }

    // ══════════════════════════════════════════════════════════
    // FIX #5 v2: İLK MESAJ TESPİTİ (Akıllı)
    // Salesbot #3 menüyü göstermeli → webhook araya girmemeli
    // AMA: Sadece gerçek "ilk mesaj" ise atla.
    // conversation_stage veya context_lock doluysa → akış başlamış, chat.js çağır.
    // Mesaj ürün/fiyat/sipariş içeriyorsa → ilk mesaj DEĞİL, chat.js çağır.
    // ══════════════════════════════════════════════════════════
    const isFieldsEmpty = !cf.menu_gosterildi && !cf.ilgilenilen_urun;
    const isFlowStarted = !!cf.conversation_stage || !!cf.context_lock || !!cf.order_status;
    
    // Mesaj içeriğine bak — ürün/fiyat/sipariş sorusu varsa ilk mesaj değil
    const msgLower = msgText.trim().toLowerCase();
    const hasProductIntent = /resimli|lazer|ata[cç]|harfli|fiyat|sipari[sş]|kolye|ücret|ne kadar/i.test(msgLower);
    
    const isFirstMessage = isFieldsEmpty && !isFlowStarted && !hasProductIntent;

    if (isFirstMessage) {
      console.log("[WH] 🆕 İlk mesaj — Salesbot #3'ü API ile tetikliyoruz");
      
      // Salesbot #3'ü API ile tetikle (menü göstermesi için)
      if (resolvedLeadId) {
        try {
          const triggerResult = await kApi("POST", "/api/v4/bots/" + MENU_BOT_ID + "/run", {
            entity_id: Number(resolvedLeadId),
            entity_type: "leads"
          });
          console.log("[WH] Salesbot #3 trigger:", triggerResult.s);
        } catch (e) {
          console.error("[WH] Salesbot #3 trigger error:", e.message);
        }
      }
      
      return res.status(200).json({
        ok: true,
        handled_by: "salesbot3_first_message",
        reason: "triggered menu bot via API",
      });
    }

    // Adım 3: chat.js ile cevap üret (ilk mesaj DEĞİL, normal akış)
    const result = await processChat({
      message: msgText, last_input_text: msgText, source: "kommo",
      customer_id: String(resolvedLeadId || contactId || ""),
      ...cf, entry_product: cf.ilgilenilen_urun || "",
    });

    console.log("[WH] Reply:", (result.ai_reply || "").slice(0, 80));
    console.log("[WH] Reply (stripped):", stripEmoji(result.ai_reply || "").slice(0, 80));

    // Adım 4: Field güncelleme + Bot tetikleme
    // FIX #6: Çift mesaj koruması — bot tetiklemeden önce ai_reply'ı kontrol et
    // Eğer ai_reply zaten doluysa (başka instance yazmış), tekrar yazma
    if (resolvedLeadId) {
      // Önce lead'i tekrar oku — ai_reply dolu mu kontrol et
      let aiReplyAlreadySet = false;
      try {
        const freshLead = await kApi("GET", "/api/v4/leads/" + resolvedLeadId);
        if (freshLead.s === 200) {
          const freshFields = readFields(freshLead.d);
          if (freshFields.ai_reply && freshFields.ai_reply.length > 0) {
            aiReplyAlreadySet = true;
            console.log("[WH] ⏭️ ai_reply zaten dolu, bu instance atlıyor:", freshFields.ai_reply.slice(0, 50));
          }
        }
      } catch (e) {
        console.error("[WH] Fresh lead read error:", e.message);
      }

      if (aiReplyAlreadySet) {
        // Başka instance zaten cevabı yazmış — field güncelle ama ai_reply ve bot tetikleme ATLA
        await updateFields(resolvedLeadId, {
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
          menu_gosterildi: cf.menu_gosterildi || result.menu_gosterildi || "",
          siparis_alindi: result.siparis_alindi || "",
          letters_received: result.letters_received || "",
          phone_received: result.phone_received || "",
          reply_class: result.reply_class || "",
          context_lock: result.context_lock || "",
          cancel_reason: result.cancel_reason || "",
          // ai_reply YAZMA — zaten dolu
        });
        return res.status(200).json({ success: true, skipped_reply: true, reason: "ai_reply_already_set" });
      }

      // ai_reply boş — normal akış: field güncelle + bot tetikle
      const menuField = cf.menu_gosterildi || result.menu_gosterildi || "";

      const fieldUpdatePromise = updateFields(resolvedLeadId, {
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
        menu_gosterildi: menuField,
        siparis_alindi: result.siparis_alindi || "",
        letters_received: result.letters_received || "",
        phone_received: result.phone_received || "",
        reply_class: result.reply_class || "",
        context_lock: result.context_lock || "",
        cancel_reason: result.cancel_reason || "",
        ai_reply: stripEmoji(result.ai_reply || ""),
      });

      if (result.ai_reply) {
        // Önce field güncelle (ai_reply yazılsın), sonra bot tetikle (ai_reply'ı okuyacak)
        await fieldUpdatePromise;
        await triggerSalesbot(resolvedLeadId);
      } else {
        await fieldUpdatePromise;
      }
    }

    return res.status(200).json({ success: true, ai_reply: result.ai_reply || "" });

  } catch (e) {
    console.error("[WH] Err:", e.message);
    return res.status(200).json({ success: false, error: e.message });
  }
}
