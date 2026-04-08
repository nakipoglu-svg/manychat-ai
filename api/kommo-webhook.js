import { processChat } from "./chat.js";

const T = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImRhZDAzOGMxZjlmNGU0ODQ5MmE1MjU3NmU5Y2U4N2NlMWQ1Nzc5N2E2NmMzYzJlZWE2OWJjOWU2NjU1MzNmYzRlZDJhNmMxYzM1Mjc5Yzk2In0.eyJhdWQiOiI1MTNiOWJmOC1lNzEwLTQzNzYtYmVlMS1kZGE2YThmNTI3YmIiLCJqdGkiOiJkYWQwMzhjMWY5ZjRlNDg0OTJhNTI1NzZlOWNlODdjZTFkNTc3OTdhNjZjM2MyZWVhNjliYzllNjY1NTMzZmM0ZWQyYTZjMWMzNTI3OWM5NiIsImlhdCI6MTc3NTU5Njg0NCwibmJmIjoxNzc1NTk2ODQ0LCJleHAiOjE5MzI3NjgwMDAsInN1YiI6IjE1MDYyNjIzIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM2Mjk5NjU1LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiOWUwODY3MGUtNGJmNC00Yjc4LWE4NTAtNDdkMGI0MWQ0Yjg1IiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.Q62ZD_x7abJzQ9LQIVNDKrFkdWvZXhZIbtyqHpiGVbZSGGqnRfs0TffW1xEufTQvXOmM0T2Mg7o9qsVAIvtlI7hxyv2KseSH1hMuhxROyZXxu-rliH1F8P-r4V-Np232wxztTxvzvXemHLIVCMw7L6bqOYAsPgjHEVzPcRVn_Ka8KPeIF6q5Yy5NA4OG_NiD7sfH_Fn2fDkDTxWsZjqWrzw0eIlqGavc5YEuJEiHvhf3_QAZFvEKJc-NA87fw_5i0zWJaMIXfu4fzduAFGU39m0CaRA5cKjLVOQkVCPw5iZCkqOrdC1lKBfRQusEM64LqBGS8WhzaM9eD_U8k_hKCw";
const API = "https://nakipoglu.kommo.com";
const HDR = {"Authorization":"Bearer "+T,"Content-Type":"application/json"};

const REPLY_BOT_ID = 72303;

const FID = {
  ilgilenilen_urun:1831171,conversation_stage:1831173,last_intent:1831175,
  order_status:1831177,payment_method:1831179,photo_received:1831181,
  back_text_status:1831183,address_status:1831185,support_mode:1831187,
  support_mode_reason:1831189,menu_gosterildi:1831191,siparis_alindi:1831193,
  letters_received:1831195,phone_received:1831197,reply_class:1831199,
  context_lock:1831201,cancel_reason:1831203,ai_reply:1831205,
};

const processedMessages = new Map();
const DEDUP_TTL = 30000;

function isDuplicate(msgId) {
  if (!msgId) return false;
  const now = Date.now();
  for (const [key, ts] of processedMessages) {
    if (now - ts > DEDUP_TTL) processedMessages.delete(key);
  }
  if (processedMessages.has(msgId)) return true;
  processedMessages.set(msgId, now);
  return false;
}

function readFields(lead){
  const cf={};
  if(!lead||!lead.custom_fields_values)return cf;
  for(const f of lead.custom_fields_values){
    for(const[n,id]of Object.entries(FID)){
      if(f.field_id===id){cf[n]=f.values?.[0]?.value||"";break;}
    }
  }
  return cf;
}

async function kApi(method,path,body){
  const o={method,headers:HDR};
  if(body)o.body=JSON.stringify(body);
  const r=await fetch(API+path,o);
  const t=await r.text();
  console.log("[K]",method,path,r.status,t.slice(0,300));
  try{return{s:r.status,d:JSON.parse(t)};}catch{return{s:r.status,d:t};}
}

async function updateFields(leadId,fields){
  const cfv=[];
  for(const[n,v]of Object.entries(fields)){
    if(FID[n]&&v!==undefined)cfv.push({field_id:FID[n],values:[{value:String(v)}]});
  }
  if(cfv.length>0) return await kApi("PATCH","/api/v4/leads/"+leadId,{custom_fields_values:cfv});
}

// ═══ SALESBOT TETİKLEME — /api/v4/bots/{id}/run ═══
async function triggerSalesbot(leadId) {
  console.log("[WH] Triggering bot", REPLY_BOT_ID, "for lead", leadId);
  // Obje olarak gönder (array değil)
  const result = await kApi("POST", "/api/v4/bots/" + REPLY_BOT_ID + "/run", {
    entity_id: Number(leadId),
    entity_type: "leads"
  });
  console.log("[WH] Bot trigger:", result.s);
  return result;
}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  if(req.method==="OPTIONS")return res.status(200).end();
  if(req.method!=="POST")return res.status(200).json({success:false,message:"Only POST supported."});

  try{
    const d=req.body||{};

    if(d.message_text){
      const cf=d.custom_fields||{};
      const result=await processChat({
        message:d.message_text,last_input_text:d.message_text,source:"kommo",
        customer_id:d.lead_id||"",
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

    const msgText=d["message[add][0][text]"]||"";
    const msgType=d["message[add][0][type]"]||"";
    const msgId=d["message[add][0][id]"]||"";

    if(!msgText) return res.status(200).json({ok:true,skipped:true,reason:"no_message_text"});
    if(msgType==="outgoing") return res.status(200).json({ok:true,skipped:true,reason:"outgoing"});
    if(isDuplicate(msgId)) return res.status(200).json({ok:true,skipped:true,reason:"duplicate"});

    const leadId=d["message[add][0][element_id]"]||d["message[add][0][entity_id]"]||"";
    const contactId=d["message[add][0][contact_id]"]||"";

    console.log("[WH] MSG:", msgText.slice(0,60), "lead:", leadId);

    let resolvedLeadId = leadId;
    if(!resolvedLeadId && contactId){
      const contactRes = await kApi("GET", "/api/v4/contacts/" + contactId + "?with=leads");
      if(contactRes.s === 200 && contactRes.d?._embedded?.leads?.[0]?.id){
        resolvedLeadId = String(contactRes.d._embedded.leads[0].id);
      }
    }

    let cf={};
    if(resolvedLeadId){
      const lr=await kApi("GET","/api/v4/leads/"+resolvedLeadId);
      if(lr.s===200) cf=readFields(lr.d);
    }

    const result=await processChat({
      message:msgText,last_input_text:msgText,source:"kommo",
      customer_id:String(resolvedLeadId||contactId||""),
      ...cf,entry_product:cf.ilgilenilen_urun||"",
    });

    console.log("[WH] Reply:", (result.ai_reply||"").slice(0,80));

    if(resolvedLeadId){
      await updateFields(resolvedLeadId,{
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

      if(result.ai_reply){
        await triggerSalesbot(resolvedLeadId);
      }
    }

    return res.status(200).json({success:true, ai_reply:result.ai_reply||""});

  }catch(e){
    console.error("[WH] Err:",e.message);
    return res.status(200).json({success:false,error:e.message});
  }
}
