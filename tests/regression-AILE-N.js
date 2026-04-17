// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGRESSION AILE N — Late "Merhaba" stage-unaware
//
// KÖK NEDEN: Müşteri flow içindeyken (waiting_photo/address vb.)
// "Merhaba/Selam" dediğinde bot jenerik "Size nasıl yardımcı olabilirim?"
// dönüyor. Flow devam etmesi gereken yerde unutturuyor.
//
// Prod vakaları: 25
// - order_completed: 8 (Selam/Merhaba)
// - waiting_photo: 6
// - waiting_payment: 6
// - waiting_address: 4
// - waiting_letters: 1
//
// KATMAN: answer-engine.js — smalltalk handler (~satır 1127)
//
// FIX: isFirstMessage=false ise stage'e göre hatırlatma ekle
// "Merhaba efendim 😊 Fotoğrafınızı..."
//
// MIN TEST: 15-20 (orta aile)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { runSuite } from "./_harness.js";

const cases = [
  // ═══════════════════════════════════════════════════════════════
  // STAGE-AWARE SELAM — her stage için spesifik hatırlatma
  // ═══════════════════════════════════════════════════════════════
  {
    name: "N.photo.1 — 'Merhaba' waiting_photo → foto hatırlatma",
    input: { message: "Merhaba", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "fotograf"],
    notIncludes: ["size nasıl yardımcı"],
  },
  {
    name: "N.photo.2 — 'Selam' waiting_photo",
    input: { message: "Selam", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "fotograf"],
  },
  {
    name: "N.photo.3 — 'Slm' waiting_photo",
    input: { message: "Slm", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "fotograf"],
  },
  {
    name: "N.pay.1 — 'Merhaba' waiting_payment → ödeme hatırlatma",
    input: { message: "Merhaba", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "odeme"],
    notIncludes: ["size nasıl yardımcı"],
  },
  {
    name: "N.pay.2 — 'Selam' waiting_payment",
    input: { message: "Selam", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "odeme"],
  },
  {
    name: "N.pay.3 — 'Merhabalar' waiting_payment",
    input: { message: "Merhabalar", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "odeme"],
  },
  {
    name: "N.addr.1 — 'Selam' waiting_address → adres hatırlatma",
    input: { message: "Selam", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "adres"],
  },
  {
    name: "N.addr.2 — 'Merhaba' waiting_address",
    input: { message: "Merhaba", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "adres"],
  },
  {
    name: "N.addr.3 — Merhaba + phone alındı → adres prompt",
    input: { message: "Merhaba", conversation_stage: "waiting_address", phone_received: "1", address_status: "", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "adres"],
  },
  {
    name: "N.addr.4 — Merhaba + adres alındı → telefon prompt",
    input: { message: "Merhaba", conversation_stage: "waiting_address", address_status: "address_only", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "telefon"],
  },
  {
    name: "N.letters.1 — 'Merhaba' waiting_letters",
    input: { message: "Merhaba", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    includes: ["merhaba efendim", "harf"],
  },
  {
    name: "N.completed.1 — 'Selam' order_completed",
    input: { message: "Selam", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "siparis"],
  },
  {
    name: "N.completed.2 — 'Selamlar' order_completed",
    input: { message: "Selamlar", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim"],
  },

  // ═══════════════════════════════════════════════════════════════
  // TYPO / VARIATION
  // ═══════════════════════════════════════════════════════════════
  {
    name: "TYPO.1 — 'Selammmmm' (multiple m)",
    input: { message: "Selammmmm", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "fotograf"],
  },
  {
    name: "TYPO.2 — 'MERHABA' büyük harf",
    input: { message: "MERHABA", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "fotograf"],
  },
  {
    name: "TYPO.3 — 'merhaba' küçük harf",
    input: { message: "merhaba", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim", "fotograf"],
  },

  // ═══════════════════════════════════════════════════════════════
  // FIRST MESSAGE — selam → menu (mevcut davranış korunmalı)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "FIRST.1 — 'Merhaba' ilk mesaj → menu",
    input: { message: "Merhaba", conversation_stage: "" },
    includes: ["hangi model"],  // TEXT.MAIN_MENU
    notIncludes: ["fotografını"],
  },
  {
    name: "FIRST.2 — 'Selam' waiting_product → menu",
    input: { message: "Selam", conversation_stage: "waiting_product" },
    includes: ["hangi model"],
  },

  // ═══════════════════════════════════════════════════════════════
  // NEGATIVE — selam DEĞİL
  // ═══════════════════════════════════════════════════════════════
  {
    name: "NEG.1 — 'Merhaba fotoğrafı hazırladınız mı?' → soru + selam — soru handler",
    input: { message: "Merhaba fotoğrafı hazırladınız mı?", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    // Intent farklı (photo_status_check belki), sadece jenerik "nasıl yardım" olmamalı
    notIncludes: ["size nasıl yardımcı olabilirim"],
  },
  {
    name: "NEG.2 — 'Selam nasılsınız' — uzatılmış selam ama halen selam",
    input: { message: "Selam nasılsınız", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["merhaba efendim"],
  },
];

runSuite("AILE N — Late Merhaba stage-aware (25 prod vakası)", cases);
