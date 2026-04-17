// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGRESSION AILE O + S — ack/tamamdır → stage-prompt mismatch
//
// KÖK NEDEN: Müşteri "Tamam/Evet/Peki/Tamamdır" ack veriyor ama bot
// kısa bir teyit vermeden doğrudan stage-prompt dönüyor. Bu semantik
// olarak yanlış değil ama kibarlık eksik.
//
// Prod vakaları:
// - AILE O (ack→prompt): 20+ waiting_photo, waiting_address, waiting_payment
// - AILE S (tamamdır→prompt): 13+ vaka
// Toplam: 52 prod vakası
//
// KATMAN: answer-engine.js — ack intent handler (~satır 1155)
//
// FIX: ack mesajlarına teyit prefix ("Tamam efendim 😊" / "Harika efendim 😊")
// ekle, sonra stage prompt ver.
//
// TEST TÜRLERİ:
// 1. Exact regression (her ack word × stage kombinasyonu)
// 2. Paraphrase / typo (Tmm, Tamamdir, ewet)
// 3. Stage-aware (her stage için farklı prompt)
// 4. Negative (ack DEĞİL mesajlar — bundle, adres, soru)
// 5. Tamamdır özel cevap (daha güçlü — Harika)
//
// MIN TEST: 25+ (büyük aile)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { runSuite } from "./_harness.js";

const cases = [
  // ═══════════════════════════════════════════════════════════════
  // WAITING_PHOTO — en kalabalık stage (27 prod vakası)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "O.photo.1 — 'Tamam' waiting_photo → tamam + fotoğraf",
    input: { message: "Tamam", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "fotograf"],
  },
  {
    name: "O.photo.2 — 'Evet' waiting_photo → tamam + fotoğraf",
    input: { message: "Evet", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "fotograf"],
  },
  {
    name: "O.photo.3 — 'Peki' waiting_photo → tamam + fotoğraf",
    input: { message: "Peki", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "fotograf"],
  },
  {
    name: "O.photo.4 — 'Olur' waiting_photo → tamam + fotoğraf",
    input: { message: "Olur", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "fotograf"],
  },
  {
    name: "O.photo.5 — 'Ok' waiting_photo",
    input: { message: "Ok", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "fotograf"],
  },
  {
    name: "S.photo.1 — 'Tamamdır' waiting_photo → harika + fotoğraf",
    input: { message: "Tamamdır", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["harika efendim", "fotograf"],
  },
  {
    name: "S.photo.2 — 'Tmm' waiting_photo (typo) → tamam + fotoğraf",
    input: { message: "Tmm", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "fotograf"],
  },
  {
    name: "S.photo.3 — 'Tamamdir' (iki nokta eksik)",
    input: { message: "Tamamdir", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["harika efendim", "fotograf"],
  },

  // ═══════════════════════════════════════════════════════════════
  // WAITING_ADDRESS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "O.addr.1 — 'Tamam' waiting_address",
    input: { message: "Tamam", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "adres"],
  },
  {
    name: "O.addr.2 — 'Evet' waiting_address",
    input: { message: "Evet", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "adres"],
  },
  {
    name: "O.addr.3 — 'Peki' waiting_address",
    input: { message: "Peki", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "adres"],
  },
  {
    name: "O.addr.4 — 'Ok' waiting_address",
    input: { message: "Ok", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "adres"],
  },
  {
    name: "S.addr.1 — 'Tmm' waiting_address (typo)",
    input: { message: "Tmm", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "adres"],
  },

  // ═══════════════════════════════════════════════════════════════
  // WAITING_PAYMENT
  // ═══════════════════════════════════════════════════════════════
  {
    name: "O.pay.1 — 'Evet' waiting_payment → tamam + ödeme",
    input: { message: "Evet", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "odeme"],
  },
  {
    name: "O.pay.2 — 'Olur' waiting_payment",
    input: { message: "olur", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "odeme"],
  },
  {
    name: "S.pay.1 — 'Tamamdır' waiting_payment → harika + ödeme",
    input: { message: "Tamamdır", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["harika efendim", "odeme"],
  },
  {
    name: "S.pay.2 — 'Tamamdir' waiting_payment (typo)",
    input: { message: "Tamamdir", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["harika efendim", "odeme"],
  },

  // ═══════════════════════════════════════════════════════════════
  // WAITING_LETTERS (harfli atac için)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "O.let.1 — 'Tamam' waiting_letters",
    input: { message: "Tamam", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    includes: ["tamam efendim", "harf"],
  },
  {
    name: "S.let.1 — 'Tamamdır' waiting_letters",
    input: { message: "Tamamdır", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    includes: ["harika efendim", "harf"],
  },

  // ═══════════════════════════════════════════════════════════════
  // TYPO / VARIATIONS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "TYPO.1 — 'tamam' küçük harf",
    input: { message: "tamam", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "fotograf"],
  },
  {
    name: "TYPO.2 — 'EVET' büyük harf",
    input: { message: "EVET", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "fotograf"],
  },
  {
    name: "TYPO.3 — 'tabii' doble i",
    input: { message: "tabii", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "fotograf"],
  },

  // ═══════════════════════════════════════════════════════════════
  // NEGATIVE — ack DEĞİL, pattern'a düşmemeli
  // ═══════════════════════════════════════════════════════════════
  {
    name: "NEG.1 — 'Evet gönderdim' → ack değil (fiil var)",
    input: { message: "Evet gönderdim", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: ["tamam efendim 😊 fotograf"],  // özel prefix değil
  },
  {
    name: "NEG.2 — 'Tamam ben istedim' completed → M_tamam handler'a (not aldık)",
    input: { message: "Tamam ben istedim", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["not aldık"],
  },
  {
    name: "NEG.3 — Uzun mesaj 'Tamam ama şunu sormak istiyorum'",
    input: { message: "Tamam ama şunu sormak istiyorum", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: ["tamam efendim 😊 fotograf"],
  },
  {
    name: "NEG.4 — 'Merhaba' → smalltalk, ack değil",
    input: { message: "Merhaba", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: ["tamam efendim 😊 fotograf"],
  },

  // ═══════════════════════════════════════════════════════════════
  // STAGE-AWARE
  // ═══════════════════════════════════════════════════════════════
  {
    name: "STAGE.1 — 'Tamam' waiting_product → hangi model menu",
    input: { message: "Tamam", conversation_stage: "waiting_product" },
    // ack waiting_product'ta farklı davranır — ack handler çalışmaz
    notIncludes: ["tamam efendim 😊 fotograf"],
  },
  {
    name: "STAGE.2 — 'Evet' stage boş → menu / nasıl yardım",
    input: { message: "Evet", conversation_stage: "" },
    notIncludes: ["tamam efendim 😊 fotograf"],
  },

  // ═══════════════════════════════════════════════════════════════
  // MULTI-TURN / FIELD context
  // ═══════════════════════════════════════════════════════════════
  {
    name: "MT.1 — waiting_address + phone_received='1' → 'Tamam' → adres prompt (not telefon)",
    input: { message: "Tamam", conversation_stage: "waiting_address", phone_received: "1", address_status: "", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "adres"],
  },
  {
    name: "MT.2 — waiting_address + address_status='address_only' → 'Tamam' → telefon prompt",
    input: { message: "Tamam", conversation_stage: "waiting_address", address_status: "address_only", ilgilenilen_urun: "lazer" },
    includes: ["tamam efendim", "telefon"],
  },
];

runSuite("AILE O + S — Ack/Tamamdır stage-prompt (52 prod vakası)", cases);
