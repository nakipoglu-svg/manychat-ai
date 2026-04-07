import { processChat } from "./chat.js";

const T = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImRhZDAzOGMxZjlmNGU0ODQ5MmE1MjU3NmU5Y2U4N2NlMWQ1Nzc5N2E2NmMzYzJlZWE2OWJjOWU2NjU1MzNmYzRlZDJhNmMxYzM1Mjc5Yzk2In0.eyJhdWQiOiI1MTNiOWJmOC1lNzEwLTQzNzYtYmVlMS1kZGE2YThmNTI3YmIiLCJqdGkiOiJkYWQwMzhjMWY5ZjRlNDg0OTJhNTI1NzZlOWNlODdjZTFkNTc3OTdhNjZjM2MyZWVhNjliYzllNjY1NTMzZmM0ZWQyYTZjMWMzNTI3OWM5NiIsImlhdCI6MTc3NTU5Njg0NCwibmJmIjoxNzc1NTk2ODQ0LCJleHAiOjE5MzI3NjgwMDAsInN1YiI6IjE1MDYyNjIzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM2Mjk5NjU1LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiOWUwODY3MGUtNGJmNC00Yjc4LWE4NTAtNDdkMGI0MWQ0Yjg1IiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.Q62ZD_x7abJzQ9LQIVNDKrFkdWvZXhZIbtyqHpiGVbZSGGqnRfs0TffW1xEufTQvXOmM0T2Mg7o9qsVAIvtlI7hxyv2KseSH1hMuhxROyZXxu-rliH1F8P-r4V-Np232wxztTxvzvXemHLIVCMw7L6bqOYAsPgjHEVzPcRVn_Ka8KPeIF6q5Yy5NA4OG_NiD7sfH_Fn2fDkDTxWsZjqWrzw0eIlqGavc5YEuJEiHvhf3_QAZFvEKJc-NA87fw_5i0zWJaMIXfu4fzduAFGU39m0CaRA5cKjLVOQkVCPw5iZCkqOrdC1lKBfRQusEM64LqBGS8WhzaM9eD_U8k_hKCw";
const API = "https://nakipoglu.kommo.com";
const HDR = {"Authorization":"Bearer "+T,"Content-Type":"application/json"};

const FID = {
  ilgilenilen_urun:1831171, conversation_stage:1831173, last_intent:1831175,
  order_status:1831177, payment_method:1831179, photo_received:1831181,
  back_text_status:1831183, address_status:1831185, support_mode:1831187,
  support_mode_reason:1831189, menu_gosterildi:1831191, siparis_alindi:1831193,
  letters_received:1831195, phone_received:1831197, reply_class:1831199,
  context_lock:1831201, cancel_reason:1831203, ai_reply:1831205,
};

function g(d,k) { return d[k] || ""; }

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

async function kApi(method,path,body) {
  const o={method,headers:HDR};
  if(body) o.body=JSON.stringify(body);
  const r=await fetch(API+path,o);
  const t=await r.text();
  console.log("[K]",method,path,r.status);
  try{return{s:r.status,d:JSON.parse(t)};}catch{return{s:r.status,d:t};}
}

async function updateFields(leadId,fields) {
  const cfv=[];
  for(const[n,v]of Object.entries(fields)){
    if(FID[n]&&v!==undefined) cfv.push({field_id:FID[n],values:[{value:String(v)}]});
  }
  if(cfv.length>0) await kApi("PATCH","/api/v4/leads/"+leadId,{custom_fields_values:cfv});
}

async function sendMsg(chatId,text) {
  if(!chatId||!text) return;
  // Kommo amojo chat API
  const r=await kApi("POST","/ajax/v1/chats/messages",{
    chat_id:chatId,
    text:text
  });
  if(r.s>=200&&r.s<300){console.log("[K] Msg sent via ajax");return;}
  // Fallback
  const r2=await kApi("POST","/api/v4/chats/"+chatId+"/messages",{text:text});
  if(r2.s>=200&&r2.s<300){console.log("[K] Msg sent via v4");return;}
  console.log("[K] Send failed, trying note...");
  // Son çare: lead'e note ekle (en azından Kommo'da görünsün)
  const leadId=g(req_data,"message[add][0][element_id]");
  if(leadId){
    await kApi("POST","/api/v4/leads/"+leadId+"/notes",[{
      note_type:"common",
      params:{text:"BOT CEVAP: "+text}
    }]);
  }
}

export default async function handler(req,res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();
  if(req.method!=="POST") return res.status(200).json({success:false,message:"Only POST supported."});

  try {
    const data=req.body||{};

    // ── MODE 1: Direkt test ──
    if(data.message_text){
      const cf=data.custom_fields||{};
      const result=await processChat({
        message:data.message_text,last_input_text:data.message_text,source:"kommo",
        customer_id:data.lead_id||"",
        ilgilenilen_urun:cf.ilgilenilen_urun||"",conversation_stage:cf.conversation_stage||"",
        last_intent:cf.last_intent||"",order_status:cf.order_status||"",
        payment_method:cf.payment_method||"",photo_received:cf.photo_received||"",
        back_text_status:cf.back_text_status||"",address_status:cf.address_status||"",
        support_mode:cf.support_mode||"",support_mode_reason:cf.support_mode_reason||"",
        menu_gosterildi:cf.menu_gosterildi||"",siparis_alindi:cf.siparis_alindi||"",
        letters_received:cf.letters_received||"",phone_received:cf.phone_received||"",
        reply_class:cf.reply_class||"",context_lock:cf.context_lock||"",
        cancel_reason:cf.cancel_reason||"",ai_reply:cf.ai_reply||"",
        entry_product:cf.ilgilenilen_urun||"",
      });
      return res.status(200).json({success:true,ai_reply:result.ai_reply||"",fields:result});
    }

    // ── MODE 2: Kommo webhook ──
    // SADECE message[add] event'ini işle, diğerlerini atla
    const msgText = g(data,"message[add][0][text]");
    const msgType = g(data,"message[add][0][type]");

    // message[add] event'i değilse veya outgoing mesajsa → atla
    if(!msgText || msgType==="outgoing") {
      return res.status(200).json({ok:true,skipped:true});
    }

    const chatId = g(data,"message[add][0][chat_id]");
    const leadId = g(data,"message[add][0][element_id]") || g(data,"message[add][0][entity_id]");
    const contactId = g(data,"message[add][0][contact_id]");

    console.log("[WH] MSG:",msgText.slice(0,60),"lead:",leadId,"chat:",chatId);

    // Lead field'larını Kommo API'den al
    let cf={};
    if(leadId){
      const lr=await kApi("GET","/api/v4/leads/"+leadId);
      if(lr.s===200) cf=readFields(lr.d);
    }

    console.log("[WH] Fields:",JSON.stringify(cf).slice(0,200));

    // chat.js çağır
    const result=await processChat({
      message:msgText,last_input_text:msgText,source:"kommo",
      customer_id:String(leadId||contactId||""),
      ...cf,entry_product:cf.ilgilenilen_urun||"",
    });

    console.log("[WH] Reply:",(result.ai_reply||"").slice(0,80));

    // Field'ları güncelle
    if(leadId) await updateFields(leadId,{
      ilgilenilen_urun:result.ilgilenilen_urun||result.user_product||"",
      conversation_stage:result.conversation_stage||"",
      last_intent:result.last_intent||"",order_status:result.order_status||"",
      payment_method:result.payment_method||"",photo_received:result.photo_received||"",
      back_text_status:result.back_text_status||"",address_status:result.address_status||"",
      support_mode:result.support_mode||"",support_mode_reason:result.support_mode_reason||"",
      menu_gosterildi:result.menu_gosterildi||"",siparis_alindi:result.siparis_alindi||"",
      letters_received:result.letters_received||"",phone_received:result.phone_received||"",
      reply_class:result.reply_class||"",context_lock:result.context_lock||"",
      cancel_reason:result.cancel_reason||"",ai_reply:result.ai_reply||"",
    });

    // Mesaj gönder
    if(chatId&&result.ai_reply) await sendMsg(chatId,result.ai_reply);

    return res.status(200).json({success:true,ai_reply:result.ai_reply||""});

  }catch(e){
    console.error("[WH] Err:",e.message);
    return res.status(200).json({success:false,error:e.message});
  }
}
