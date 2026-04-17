// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGRESSION AILE Y + Z + küçük aileler (tail cleanup)
//
// Y: Renk sorusu ("Gümüş renkli var mı") → material_question (3 vaka)
// Z: Future order ("Yarın fotoğraf atacağım olur mu") → future_order (1-2 vaka)
// V9 M düzeltilmiş kontrol (Anlamadım → tekrar açıkla)
//
// KATMAN: intent-engine.js J_OTHER tail + answer-engine.js handler
//
// MIN TEST: 10-15 (küçük aile)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { runSuite } from "./_harness.js";

const cases = [
  // ═══════════════════════════════════════════════════════════════
  // AILE Y — Renk sorusu → material_question
  // ═══════════════════════════════════════════════════════════════
  {
    name: "Y.a — 'Gumus renkli var mi' waiting_address",
    input: { message: "Gumus renkli var mi diye soruyorun", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["paslanmaz", "kaplama"],
    notIncludes: ["ad soyad, cep telefonu"],
  },
  {
    name: "Y.b — 'Altın renginde mi daha mı sarı'",
    input: { message: "Altın renginde mi daha mı sarı ?", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["altin"],
    notIncludes: ["fotografınızı buradan iletebilirsiniz efendim 😊$"],
  },
  {
    name: "Y.c — 'Rose gold var mı'",
    input: { message: "Rose gold var mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["kaplama"],
  },
  {
    name: "Y.d — 'Gümüş mü'",
    input: { message: "Gümüş mü", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["paslanmaz"],
  },

  // ═══════════════════════════════════════════════════════════════
  // AILE Z — Future order intent
  // ═══════════════════════════════════════════════════════════════
  {
    name: "Z.a — 'Yarın fotoğraf seçip gönderirim olur mu'",
    input: { message: "Yarın fotoğraf seçip gönderirim olur mu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["hazır olduğunuzda"],
  },
  {
    name: "Z.b — 'Sonra alacağım olur mu'",
    input: { message: "Sonra alacağım olur mu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["hazır olduğunuzda"],
  },
  {
    name: "Z.c — 'Bu akşam sipariş vereceğim'",
    input: { message: "Bu akşam sipariş vereceğim", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // Sipariş ifadesi — normal flow
  },

  // ═══════════════════════════════════════════════════════════════
  // V — "Anlamadım" her stage
  // ═══════════════════════════════════════════════════════════════
  {
    name: "V.a — 'Anlamadım' order_completed → M9 açıklama",
    input: { message: "Anlamadım", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["tekrar", "açıklayalım"],
  },

  // ═══════════════════════════════════════════════════════════════
  // NEGATIVE — bu pattern'lere düşmemeli
  // ═══════════════════════════════════════════════════════════════
  {
    name: "NEG.a — 'Altın fiyatı ne kadar' → price, material değil",
    input: { message: "Altın fiyatı ne kadar", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // price intent
    notIncludes: ["gümüş kaplama seçeneğimiz"],
  },
  {
    name: "NEG.b — 'Gümüş renkli istiyorum' (soru değil) → material/J_OTHER'a düşmez",
    input: { message: "Gümüş renkli istiyorum", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // hasQ=false, J_OTHER Y pattern'e düşmez — fotograf prompt beklenir
    includes: ["fotograf"],
  },
  {
    name: "NEG.c — 'Yarın sipariş vereceğim' (soru değil) — normal flow",
    input: { message: "Yarın sipariş vereceğim", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // hasQ=false, J_OTHER Z pattern'e düşmez
  },

  // ═══════════════════════════════════════════════════════════════
  // PARAPHRASE / TYPO
  // ═══════════════════════════════════════════════════════════════
  {
    name: "PARA.a — 'altin renginde mi' (küçük harf + Türkçe eksik)",
    input: { message: "altin renginde mi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["altin"],
  },
  {
    name: "PARA.b — 'YARIN FOTOĞRAF ATACAĞIM olur mu' büyük harf",
    input: { message: "YARIN FOTOĞRAF ATACAĞIM olur mu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["hazır olduğunuzda"],
  },
];

runSuite("AILE Y+Z — Renk/Future (tail cleanup)", cases);
