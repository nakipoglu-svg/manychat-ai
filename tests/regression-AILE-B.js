// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGRESSION AILE B — back_text false positive
//
// KÖK NEDEN: waiting_payment short message handler + C2 isim+tarih
// handler, gerçek yazı olmayan mesajları da back_text_content olarak
// alıyor ve "Tabi efendim, arka yazı notu aldım" döndürüyor.
//
// Prod vakaları: 12
// - İnitials: "B k olcak", "B K", "F Y Z"
// - Complaint: "Sürekli aynı şeyi deyip duruyor sunuz"
// - Address structure: "İl Balıkesir İlçe ivrindi mah..."
// - Operational: "Kargolamadan önce iletişime geçelim"
// - Age: "16 yaşın da"
// - Emotional: "Yok yok ben bebegim adına heyecandan..."
// - Photo question: "Bu fotoyu basabilir misiniz"
// - Poetry (gri alan): "Gözlerimin gördüğü yerde olmasanda..."
//
// KATMAN: intent-engine.js — waiting_payment short back_text
// (~satır 626) ve C2 pattern (~satır 208)
//
// FIX: isBlocked listesi genişletildi + isInitials/isJustLetters
// pattern'ları + adres structure detection güçlendirildi
//
// MIN TEST: 10-15 (küçük aile)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { runSuite } from "./_harness.js";

const cases = [
  // ═══════════════════════════════════════════════════════════════
  // B1 — İnitials (tek harf kısaltmalar)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "B1.a — 'B K' sadece iki harf → back_text DEĞİL",
    input: { message: "B K", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yazi notu"],
  },
  {
    name: "B1.b — 'F Y Z' üç harf → back_text DEĞİL",
    input: { message: "F Y Z", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yazi notu"],
  },
  {
    name: "B1.c — 'B k olcak' (initial+filler) → back_text DEĞİL",
    input: { message: "B k olcak", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yazi notu"],
  },

  // ═══════════════════════════════════════════════════════════════
  // B2 — Şikayet / complaint
  // ═══════════════════════════════════════════════════════════════
  {
    name: "B2.a — 'Sürekli aynı şeyi deyip duruyor sunuz' → back_text DEĞİL",
    input: { message: "Sürekli aynı şeyi deyip duruyor sunuz", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yazi notu"],
  },
  {
    name: "B2.b — 'Hep aynı şeyi söylüyorsunuz' (paraphrase)",
    input: { message: "Hep aynı şeyi söylüyorsunuz", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yazi notu"],
  },

  // ═══════════════════════════════════════════════════════════════
  // B3 — Adres structure (İl X İlçe Y)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "B3.a — 'İl Balıkesir İlçe ivrindi mah xyz' → back_text DEĞİL (adres)",
    input: { message: "İl Balıkesir İlçe ivrindi mah xyz", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yazi notu"],
  },
  {
    name: "B3.b — 'Merve demir Sarıyer/İstanbul PTT mahallesi' → adres DEĞİL back_text",
    input: { message: "Merve demir Sarıyer/İstanbul PTT evleri mahallesi", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yazi notu"],
  },

  // ═══════════════════════════════════════════════════════════════
  // B4 — Operasyonel talep
  // ═══════════════════════════════════════════════════════════════
  {
    name: "B4.a — 'Kargolamadan önce iletişime geçelim' → back_text DEĞİL",
    input: { message: "Kargolamadan önce iletişime geçelim lütfen", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yazi notu"],
  },

  // ═══════════════════════════════════════════════════════════════
  // B5 — Age statement
  // ═══════════════════════════════════════════════════════════════
  {
    name: "B5.a — '16 yaşın da' → back_text DEĞİL",
    input: { message: "16 yaşın da", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yazi notu"],
  },

  // ═══════════════════════════════════════════════════════════════
  // B6 — Emotional/operational explain
  // ═══════════════════════════════════════════════════════════════
  {
    name: "B6.a — 'Yok yok ben bebegim adına heyecandan' → back_text DEĞİL",
    input: { message: "Yok yok ben bebegim adına heyecandan merak rttim görmek istedim", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yazi notu"],
  },

  // ═══════════════════════════════════════════════════════════════
  // B7 — Photo question (soru)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "B7.a — 'Bu fotoyu basabilir misiniz' → photo_acceptance, back_text DEĞİL",
    input: { message: "Bu fotoyu basabilir misiniz", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yazi notu aldim"],  // arka yüze yazı bilgi OLABILIR ama "notu aldım" yanlış
  },

  // ═══════════════════════════════════════════════════════════════
  // POSITIVE — gerçek back_text mesajları hala çalışsın
  // ═══════════════════════════════════════════════════════════════
  {
    name: "POS.a — 'Canım annem' gerçek back_text",
    input: { message: "Canım annem", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["arka yazi notu"],
  },
  {
    name: "POS.b — 'Sude sonsuzluk olsun' gerçek içerik",
    input: { message: "Sude sonsuzluk olsun", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["arka yazi notu"],
  },
  {
    name: "POS.c — Tarih 03.01.2025 completed → back_text",
    input: { message: "03.01.2025", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["arka yazi notu"],
  },
  {
    name: "POS.d — 'Ayetel kürsi' olsun → back_text",
    input: { message: "Ayetel kürsi olsun", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["arka yazi notu"],
  },
];

runSuite("AILE B — back_text false positive (12 prod vakası)", cases);
