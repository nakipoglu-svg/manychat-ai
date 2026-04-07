import { processChat } from "./chat.js";

const T = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImMxNWFkZTM4NTAzMWJjMDJlMjc0NTFhODgyZGFlZmEwM2U0ZjNiMjJmZmM4NWJiMTZkZDZmNzBmY2NiY2M1MTVhNGI4ZTBmNTdhMzE4MjAwIn0.eyJhdWQiOiI1MTNiOWJmOC1lNzEwLTQzNzYtYmVlMS1kZGE2YThmNTI3YmIiLCJqdGkiOiJjMTVhZGUzODUwMzFiYzAyZTI3NDUxYTg4MmRhZWZhMDNlNGYzYjIyZmZjODViYjE2ZGQ2ZjcwZmNjYmNjNTE1YTRiOGUwZjU3YTMxODIwMCIsImlhdCI6MTc3NTU5NTQ3MSwibmJmIjoxNzc1NTk1NDcxLCJleHAiOjE3Nzc0MjA4MDAsInN1YiI6IjE1MDYyNjIzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM2Mjk5NjU1LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiZjU4NDYzMjAtN2QyZi00NmRmLTg3MjgtOGQ2MWFkMzEzYTYwIiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.RE5mRpGc_wyR0ixUDS5MEMwnqO3IIyg4XTaQd775gCabNlnc11V61w2Ol5unLr3HySbsRgFFlqjD3kS6JVKibMrUpCnaHyxAHhv1mzOnqC0N3dK_Jc1VLIy6iwj-hSO3JbgVNdTLxqJB2WjUI2-RDtzGIb_E4LfkQx_-auj-Fvr2lqwZZhG4ChtP1MmgWpZKlocXpvSxeEvjEzHuAyEQlKyF5hbXwRLlYGRIbV_9R_tGa-EjsoYyXkGYxCCXhMVnBF0c6t84iDHwpW4EviOANaBsV9fKXSrhqHsm8PeFpCrv5n96WamOuBg7potKLX5fH0u1JNcqBcNI9fvdf8_ATw";
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

function readFields(lead) {
  const cf = {};
  if (!lead?.custom_fields_values) return cf;
  for (const f of lead.custom_fields_values) {
    for (const [n,id] of Object.entries(FID)) {
      if (f.field_id===id) { cf[n]=f.values?.[0]?.value||""; break; }
    }
  }
  return cf;
}

async function kFetch(method, path, body) {
  const o = {method, headers:H};
  if (body) o.body = JSON.stringify(body);
  const r = await fetch(API+path, o);
  const txt = await r.text();
  console.log("[K]",method,path,r.status);
  try { return {s:r.status,d:JSON.parse(txt)}; } catch { return {s:r.status,d:txt}; }
}

async function updateFields(leadId, fields) {
  const cfv = [];
  for (const [n,v] of Object.entries(fields)) {
    if (FID[n] && v!==undefined) cfv.push({field_id:FID[n],values:[{value:String(v)}]});
  }
  if (cfv.length>0) await kFetch("PATCH","/api/v4/leads/"+leadId,{custom_fields_values:cfv});
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if (req.method==="OPTIONS") return res.status(200).end();
  if (req.method!=="POST") return res.status(200).json({success:false,message:"Only POST supported."});

  try {
    const data = req.body || {};
    console.log("[WH] In:", JSON.stringify(data).slice(0,300));

    // ── MODE 1: Direkt test (body'de message_text var) ──
    if (data.message_text || data.custom_fields) {
      const cf = data.custom_fields || {};
      const msg = data.message_text || data.message || "";
      if (!msg) return res.status(200).json({success:false,error:"no message"});

      const payload = {
        message:msg, last_input_text:msg, source:"kommo",
        customer_id:data.lead_id||"", 
        ilgilenilen_urun:cf.ilgilenilen_urun||data.ilgilenilen_urun||"",
        conversation_stage:cf.conversation_stage||data.conversation_stage||"",
        last_intent:cf.last_intent||"", order_status:cf.order_status||"",
        payment_method:cf.payment_method||"", photo_received:cf.photo_received||"",
        back_text_status:cf.back_text_status||"", address_status:cf.address_status||"",
        support_mode:cf.support_mode||"", support_mode_reason:cf.support_mode_reason||"",
        menu_gosterildi:cf.menu_gosterildi||"", siparis_alindi:cf.siparis_alindi||"",
        letters_received:cf.letters_received||"", phone_received:cf.phone_received||"",
        reply_class:cf.reply_class||"", context_lock:cf.context_lock||"",
        cancel_reason:cf.cancel_reason||"", ai_reply:cf.ai_reply||"",
        entry_product:cf.ilgilenilen_urun||data.ilgilenilen_urun||"",
      };

      const result = await processChat(payload);

      // Lead varsa field güncelle + mesaj gönder
      if (data.lead_id && /^\d+$/.test(String(data.lead_id))) {
        await updateFields(data.lead_id, result);
        if (data.chat_id && result.ai_reply) {
          // Kommo chat mesaj gönder
          await kFetch("POST",`/api/v4/chats/${data.chat_id}/messages`,[{type:"text",text:result.ai_reply}]);
        }
      }
      return res.status(200).json({success:true, ai_reply:result.ai_reply||"", fields:result});
    }

    // ── MODE 2: Kommo webhook (otomatik tetikleme) ──
    // Kommo farklı webhook formatları gönderebilir
    let leadId, chatId, msgText;

    // Format: message[add][0]
    if (data.message?.add) {
      const m = Array.isArray(data.message.add) ? data.message.add[0] : data.message.add;
      chatId = m.chat_id;
      msgText = m.text || "";
      // Lead ID chat'ten bulunacak
    }

    // Format: unsorted webhook
    if (data.unsorted?.add) {
      const u = Array.isArray(data.unsorted.add) ? data.unsorted.add[0] : data.unsorted.add;
      leadId = u.lead_id;
      chatId = u.chat_id;
    }

    // Salesbot webhook formatı
    if (!msgText && data.text) msgText = data.text;
    if (!leadId && data.lead_id) leadId = data.lead_id;
    if (!chatId && data.chat_id) chatId = data.chat_id;

    // Lead ID'yi chat'ten bul
    if (chatId && !leadId) {
      // Chat'e bağlı lead'i bul
      const chatRes = await kFetch("GET", `/api/v4/leads?filter[chat_id]=${chatId}`);
      if (chatRes.s===200 && chatRes.d?._embedded?.leads?.[0]) {
        leadId = chatRes.d._embedded.leads[0].id;
      }
    }

    if (!leadId) {
      console.log("[WH] No lead_id found");
      return res.status(200).json({success:false,error:"no lead"});
    }

    // Lead bilgilerini al
    const leadRes = await kFetch("GET", `/api/v4/leads/${leadId}`);
    if (leadRes.s!==200) {
      console.log("[WH] Lead fetch failed:", leadRes.s);
      return res.status(200).json({success:false,error:"lead fetch failed"});
    }

    const cf = readFields(leadRes.d);

    // Mesaj yoksa son chat mesajını al
    if (!msgText && chatId) {
      const msgRes = await kFetch("GET",`/api/v4/chats/${chatId}/messages?limit=1&order=desc`);
      if (msgRes.s===200 && msgRes.d?._embedded?.messages?.[0]) {
        const lastMsg = msgRes.d._embedded.messages[0];
        if (lastMsg.author?.type==="contact") msgText = lastMsg.text||"";
      }
    }

    if (!msgText) {
      console.log("[WH] No message");
      return res.status(200).json({success:false,error:"no message"});
    }

    console.log("[WH] Msg:", msgText.slice(0,80), "Lead:", leadId);

    // chat.js çağır
    const result = await processChat({
      message:msgText, last_input_text:msgText, source:"kommo",
      customer_id:String(leadId), ...cf, entry_product:cf.ilgilenilen_urun||"",
    });

    console.log("[WH] Reply:", (result.ai_reply||"").slice(0,80));

    // Field güncelle
    await updateFields(leadId, result);

    // Mesaj gönder
    if (chatId && result.ai_reply) {
      await kFetch("POST",`/api/v4/chats/${chatId}/messages`,[{type:"text",text:result.ai_reply}]);
    }

    return res.status(200).json({success:true, ai_reply:result.ai_reply||""});

  } catch(e) {
    console.error("[WH] Err:",e.message);
    return res.status(200).json({success:false,error:e.message});
  }
}
