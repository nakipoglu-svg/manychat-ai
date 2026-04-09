// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOPIC MEMORY — Kısa follow-up sorular için context koruması
// "Garantisi var mı" → "Ne kadar süre" → "Mesela 1 yıl" hep trust konusu
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { hasAny } from "./normalize.js";

// Topic categories
const TOPICS = {
  trust:    "trust",
  shipping: "shipping",
  price:    "price",
  payment:  "payment",
  photo:    "photo",
  back_text: "back_text",
  product:  "product",
  address:  "address",
  post_order: "post_order",
};

/**
 * Son mesajın topic'ini belirle.
 * Kaynak: last_intent, signals.topic_hint, stage, mesaj içeriği
 */
export function resolveActiveTopic(ctx, signals) {
  const { norm, fields } = ctx;
  const lastIntent = fields?.last_intent || "";
  const signalTopic = signals.topic_hint || null;

  // 1. Signal'den gelen güçlü topic (explicit keyword)
  if (signalTopic) return signalTopic;

  // 2. Follow-up detection: önceki topic devam ediyor mu?
  if (lastIntent) {
    const followUp = detectFollowUp(norm, lastIntent);
    if (followUp) return followUp;
  }

  // 3. Default: stage-based
  return null;
}

/**
 * Kısa / belirsiz mesajlarda önceki topic'in devam edip etmediğini kontrol et.
 * Örnek: last_intent=trust → "ne kadar süre" → trust follow-up
 */
function detectFollowUp(norm, lastIntent) {
  // Trust follow-up keywords
  const TRUST_FOLLOWUP = [
    "sure","süre","garanti","kac yil","kaç yıl","ne kadar sure","ne kadar süre",
    "mesela","kac sene","kaç sene","yillik","yıllık","omur boyu","ömür boyu",
    "1 yil","2 yil","3 yil","5 yil","10 yil",
    "ne kadar","o zaman","yani","peki","eger","eğer","olursa","durumda",
  ];
  
  if (lastIntent === "trust" && hasAny(norm, TRUST_FOLLOWUP)) {
    return TOPICS.trust;
  }

  // Shipping follow-up
  const SHIPPING_FOLLOWUP = [
    "kac gun","kaç gün","ne zaman","hangi kargo","takip","nereye kadar",
    "sms","mesaj gelir","bilgi gelir","ptt","aras",
  ];
  if (lastIntent === "shipping" && hasAny(norm, SHIPPING_FOLLOWUP)) {
    return TOPICS.shipping;
  }

  // Price follow-up
  const PRICE_FOLLOWUP = [
    "ikisi","ikisinin","toplam","indirim","kampanya","fark",
    "kapida ne kadar","eft ne kadar","neden farkli","neden farklı",
  ];
  if (lastIntent === "price" && hasAny(norm, PRICE_FOLLOWUP)) {
    return TOPICS.price;
  }

  // Material/trust cross-reference
  if (lastIntent === "material_question" && hasAny(norm, ["kararma","solar","solma","paslan","garanti","dayanikli","dayanıklı"])) {
    return TOPICS.trust;
  }

  // Back text follow-up  
  const BACKTEXT_FOLLOWUP = [
    "ne yazilir","ne yazılır","genelde","ornek","örnek","baska","başka",
    "ne tarz","hangi","neler","var mi","var mı","ne gibi",
    "charm","aksesuar","yazilabilir","yazılabilir","eklenebilir",
  ];
  if ((lastIntent === "back_text_info" || lastIntent === "back_text_examples" || lastIntent === "back_text") 
      && hasAny(norm, BACKTEXT_FOLLOWUP)) {
    return TOPICS.back_text;
  }

  return null;
}

/**
 * Topic-aware intent override: 
 * signals'ın topic_hint'i yoksa ama active topic varsa, intent'i düzelt
 */
export function applyTopicOverride(intent, activeTopic, norm) {
  if (!activeTopic) return intent;
  
  // Trust follow-up: "ne kadar süre" shipping yerine trust
  if (activeTopic === "trust" && (intent === "shipping" || intent === "price" || intent === "general")) {
    // Açıkça shipping keyword varsa override yapma
    if (hasAny(norm, ["kargo","teslimat","ptt","gonderim","gönderi"])) return intent;
    // Açıkça price keyword varsa override yapma  
    if (hasAny(norm, ["fiyat","ucret","tl","lira","para"])) return intent;
    return "trust";
  }

  // Back text follow-up
  if (activeTopic === "back_text" && intent === "general") {
    return "back_text_info";
  }

  return intent;
}

export { TOPICS };
