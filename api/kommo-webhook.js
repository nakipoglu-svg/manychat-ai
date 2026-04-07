import { processChat } from "./chat.js";

const T = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImRhZDAzOGMxZjlmNGU0ODQ5MmE1MjU3NmU5Y2U4N2NlMWQ1Nzc5N2E2NmMzYzJlZWE2OWJjOWU2NjU1MzNmYzRlZDJhNmMxYzM1Mjc5Yzk2In0.eyJhdWQiOiI1MTNiOWJmOC1lNzEwLTQzNzYtYmVlMS1kZGE2YThmNTI3YmIiLCJqdGkiOiJkYWQwMzhjMWY5ZjRlNDg0OTJhNTI1NzZlOWNlODdjZTFkNTc3OTdhNjZjM2MyZWVhNjliYzllNjY1NTMzZmM0ZWQyYTZjMWMzNTI3OWM5NiIsImlhdCI6MTc3NTU5Njg0NCwibmJmIjoxNzc1NTk2ODQ0LCJleHAiOjE5MzI3NjgwMDAsInN1YiI6IjE1MDYyNjIzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM2Mjk5NjU1LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiOWUwODY3MGUtNGJmNC00Yjc4LWE4NTAtNDdkMGI0MWQ0Yjg1IiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.Q62ZD_x7abJzQ9LQIVNDKrFkdWvZXhZIbtyqHpiGVbZSGGqnRfs0TffW1xEufTQvXOmM0T2Mg7o9qsVAIvtlI7hxyv2KseSH1hMuhxROyZXxu-rliH1F8P-r4V-Np232wxztTxvzvXemHLIVCMw7L6bqOYAsPgjHEVzPcRVn_Ka8KPeIF6q5Yy5NA4OG_NiD7sfH_Fn2fDkDTxWsZjqWrzw0eIlqGavc5YEuJEiHvhf3_QAZFvEKJc-NA87fw_5i0zWJaMIXfu4fzduAFGU39m0CaRA5cKjLVOQkVCPw5iZCkqOrdC1lKBfRQusEM64LqBGS8WhzaM9eD_U8k_hKCw";
const API = "https://nakipoglu.kommo.com";
const H = {"Authorization":"Bearer "+T,"Content-Type":"application/json"};

const FID = {
  ilgilenilen_urun:1831171, conversation_stage:1831173, last_intent:1831175,
  order_status:1831177, payment_method:1831179, photo_received:1831181,
  back_text_status:1831183, address_status:1831185, support_mode:1831187,
  support_mode_reason:1831189, menu_gosterildi:1831191, siparis_alindi:1831193,
  letters_received:1831195, phone_received:1831197, reply_class:1831199,
  context_lock:1831201, cancel_reason:1831203, ai_reply:1831205,
};

// Kommo form-encoded body'den veri çıkar
function g(data, key) { return data[key] || ""; }

// Lead'den custom field değerlerini oku (API'den)
function readFields(lead) {
  const cf = {};
  if (!lead?.custom_fields_values) return cf;
  for (const f of lead.custom_fields_values) {
    for (const [n, id] of Object.entries(FID)) {
      if (f.field_id === id) { cf[n] = f.values?.[0]?.value || ""; break; }
    }
  }
  return cf;
}

async function kFetch(method, path, body) {
  const o = { method, headers: H };
  if (body) o.body = JSON.stringify(body);
  const r = await fetch(API + path, o);
  const txt = await r.text();
  console.log("[K]", method, path, r.status);
  try { return { s: r.status, d: JSON.parse(txt) }; } catch { return { s: r.status, d: txt }; }
}

async function updateFields(leadId, fields) {
  const cfv = [];
  for (const [n, v] of Object.entries(fields)) {
    if (FID[n] && v !== undefined) cfv.push({ field_id: FID[n], values: [{ value: String(v) }] });
  }
  if (cfv.length > 0) await kFetch("PATCH", "/api/v4/leads/" + leadId, { custom_fields_values: cfv });
}

async function sendMessage(chatId, text) {
  if (!chatId || !text) return;
  // Kommo amoCRM chat API
  const scope_id = chatId;
  const payload = {
    conversation_id: chatId,
    text: text,
  };
  // Try the Kommo messaging endpoint
  const r = await kFetch("POST", "/api/v2/chats/messages", {
    conversation_id: chatId,
    text: text,
  });
  if (r.s !== 200) {
    // Fallback: try talk API
    console.log("[K] Trying talk API...");
    await kFetch("POST", "/api/v4/talks/" + chatId + "/messages", { text: text });
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(200).json({ success: false, message: "Only POST supported." });

  try {
    const data = req.body || {};
    console.log("[WH] Keys:", Object.keys(data).slice(0, 20).join(", "));

    // ── MODE 1: Direkt JSON test (console'dan) ──
    if (data.message_text) {
      const cf = data.custom_fields || {};
      const msg = data.message_text;
      const result = await processChat({
        message: msg, last_input_text: msg, source: "kommo",
        customer_id: data.lead_id || "",
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
        entry_product: cf.ilgilenilen_urun || data.ilgilenilen_urun || "",
      });
      return res.status(200).json({ success: true, ai_reply: result.ai_reply || "", fields: result });
    }

    // ── MODE 2: Kommo webhook (form-encoded keys) ──

    // Mesaj metni: unsorted webhook'tan
    let msgText = g(data, "unsorted[update][0][source_data][data][0][text]")
               || g(data, "unsorted[add][0][source_data][data][0][text]");

    // Lead ID
    let leadId = g(data, "leads[update][0][id]")
              || g(data, "leads[add][0][id]")
              || g(data, "unsorted[update][0][data][leads][id]")
              || g(data, "unsorted[add][0][data][leads][id]");

    // Chat ID (talk)
    let chatId = g(data, "talk[update][0][chat_id]")
              || g(data, "talk[add][0][chat_id]")
              || g(data, "unsorted[update][0][source_data][origin][chat_id]")
              || g(data, "unsorted[add][0][source_data][origin][chat_id]");

    // Contact ID
    let contactId = g(data, "talk[update][0][contact_id]")
                 || g(data, "contacts[update][0][id]")
                 || g(data, "contacts[add][0][id]");

    console.log("[WH] Parsed — lead:", leadId, "chat:", chatId, "msg:", (msgText || "").slice(0, 50));

    // Mesaj yoksa — bu sadece lead update veya talk update olabilir, skip
    if (!msgText) {
      // Talk update geldi — son mesajı API'den alalım
      if (chatId && leadId) {
        console.log("[WH] No msg in webhook, fetching last message from API...");
        // Lead'den field'ları al
        const leadRes = await kFetch("GET", "/api/v4/leads/" + leadId);
        if (leadRes.s !== 200) {
          console.log("[WH] Lead fetch failed");
          return res.status(200).json({ success: false, error: "lead fetch failed" });
        }
        const cf = readFields(leadRes.d);

        // Son mesajı Kommo chat API'den al
        // Not: Kommo chat messages API farklı çalışabilir
        // Şimdilik skip — sadece unsorted webhook'taki mesajları işle
        console.log("[WH] Skipping — no message text in webhook");
        return res.status(200).json({ success: false, error: "no message text" });
      }
      console.log("[WH] No message, no chat — skip");
      return res.status(200).json({ success: false, error: "no data" });
    }

    // Lead ID yoksa ama mesaj varsa — unsorted'dan lead bulmaya çalış
    if (!leadId) {
      console.log("[WH] No lead_id, searching...");
      // Contact ID ile lead bul
      if (contactId) {
        const lr = await kFetch("GET", "/api/v4/leads?filter[contact_id]=" + contactId);
        if (lr.s === 200 && lr.d?._embedded?.leads?.[0]) {
          leadId = lr.d._embedded.leads[0].id;
          console.log("[WH] Found lead via contact:", leadId);
        }
      }
    }

    if (!leadId) {
      console.log("[WH] Still no lead_id — processing without");
    }

    // Lead field'larını al
    let cf = {};
    if (leadId) {
      const leadRes = await kFetch("GET", "/api/v4/leads/" + leadId);
      if (leadRes.s === 200) cf = readFields(leadRes.d);
    }

    console.log("[WH] Fields:", JSON.stringify(cf).slice(0, 200));
    console.log("[WH] Processing msg:", msgText.slice(0, 80));

    // chat.js çağır
    const result = await processChat({
      message: msgText, last_input_text: msgText, source: "kommo",
      customer_id: String(leadId || contactId || ""),
      ...cf, entry_product: cf.ilgilenilen_urun || "",
    });

    console.log("[WH] Reply:", (result.ai_reply || "").slice(0, 80));

    // Field'ları güncelle
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
      await sendMessage(chatId, result.ai_reply);
    }

    return res.status(200).json({ success: true, ai_reply: result.ai_reply || "" });

  } catch (e) {
    console.error("[WH] Err:", e.message);
    return res.status(200).json({ success: false, error: e.message });
  }
}
