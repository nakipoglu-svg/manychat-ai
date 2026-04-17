// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGRESSION AILE M — completed/human_support "Ekibimize overreach"
//
// KÖK NEDEN: order_completed + human_support stage'lerinde default fallback
// "Ekibimize iletiyorum" (87 prod vakası). Fix: spesifik intent handling.
//
// KATMAN: answer-engine.js (completed cascade)
//
// TEST TÜRLERİ:
// 1. Exact regression (prod log'daki tam mesaj)
// 2. Paraphrase / typo variation
// 3. Stage-aware (completed vs non-completed)
// 4. Negative test (bu pattern'e düşmesi gerekmeyen mesajlar)
// 5. Multi-turn / context
//
// MIN TEST: 25+ (büyük aile)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { runSuite } from "./_harness.js";

const cases = [
  // ═══════════════════════════════════════════════════════════════
  // ALT-AILE M5 — Teşekkür/saolun → gratitude (ekibimize DEĞİL)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "M5.a — 'Saolun' completed → rica ederiz",
    input: { message: "Saolun", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["rica ederiz"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M5.b — 'Teşkkürler tamamdır' (typo)",
    input: { message: "Teşkkürler tamamdır", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["rica ederiz"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M5.c — 'Tamamdır cok saolun'",
    input: { message: "Tamamdır cok saolun", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["rica ederiz"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M5.d — 'Çok teşekkürler' — paraphrase",
    input: { message: "Çok teşekkürler", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["rica ederiz"],
    notIncludes: ["ekibimize iletiyorum"],
  },

  // ═══════════════════════════════════════════════════════════════
  // ALT-AILE M1 — Sadece isim → "İsim bilginizi aldım"
  // ═══════════════════════════════════════════════════════════════
  {
    name: "M1.a — 'Yağmur kaya' sadece isim",
    input: { message: "Yağmur kaya", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["bilginizi aldim"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M1.b — 'Salih demir' küçük harf soyadı",
    input: { message: "Salih demir", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["bilginizi aldim"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M1.c — 'Mihriban Akdere' iki kelime",
    input: { message: "Mihriban Akdere", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["bilginizi aldim"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M1.d — 'Esra Ünal Tarakçı' üç kelime",
    input: { message: "Esra Ünal Tarakçı", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["bilginizi aldim"],
    notIncludes: ["ekibimize iletiyorum"],
  },

  // ═══════════════════════════════════════════════════════════════
  // ALT-AILE M6 — Back_text content completed
  // ═══════════════════════════════════════════════════════════════
  {
    name: "M6.a — 'İsmi mustafa' → arka yazı notu",
    input: { message: "İsmi mustafa", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["arka yazi notu"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M6.b — 'Annesine dogum günü' → arka yazı",
    input: { message: "Annesine dogum günü", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["arka yazi notu"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M6.c — 'Tarih 03.01.2025' → arka yazı",
    input: { message: "Tarih 03.01.2025", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["arka yazi notu"],
    notIncludes: ["ekibimize iletiyorum"],
  },

  // ═══════════════════════════════════════════════════════════════
  // ALT-AILE M_OTHER — "dimi/degil mi" onay soruları
  // ═══════════════════════════════════════════════════════════════
  {
    name: "M_dimi.a — 'Bu model olacak dimi'",
    input: { message: "Bu model olacak dimi", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["evet", "efendim"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M_dimi.b — 'Olur dimi bu sekilde'",
    input: { message: "Olur dimi bu sekilde", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["evet", "efendim"],
    notIncludes: ["ekibimize iletiyorum"],
  },

  // ═══════════════════════════════════════════════════════════════
  // ALT-AILE M8 — Past action reference (at[ı]caktınız/attınız)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "M8.a — 'Resim atıcaktımız' → kibar operatör",
    input: { message: "Resim atıcaktımız", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["ilgileneceğiz", "efendim"],
  },
  {
    name: "M8.b — 'Bize bunu attınız' → operatör",
    input: { message: "Bize bunu attınız", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["ilgileneceğiz", "efendim"],
  },

  // ═══════════════════════════════════════════════════════════════
  // ALT-AILE M_tamam — "Tamam + X"
  // ═══════════════════════════════════════════════════════════════
  {
    name: "M_tamam.a — 'Tamam ben istedim'",
    input: { message: "Tamam ben istedim", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["not aldık"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M_tamam.b — 'Tamam uygun benim icin'",
    input: { message: "Tamam uygun benim icin", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["not aldık"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M_tamam.c — 'Tamam bu olacak'",
    input: { message: "Tamam bu olacak", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["not aldık"],
    notIncludes: ["ekibimize iletiyorum"],
  },

  // ═══════════════════════════════════════════════════════════════
  // ALT-AILE M7 — Zincir detayı completed
  // ═══════════════════════════════════════════════════════════════
  {
    name: "M7.a — 'Zinciriniz nasıl' completed",
    input: { message: "Zinciriniz nasıl", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["zincir"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M7.b — 'Zincirde burgu olsun' completed",
    input: { message: "Zincirde burgu olsun", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["zincir", "not aldık"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M7.c — 'Bu zincirddn istiyorum' (typo)",
    input: { message: "Bu zincirddn istiyorum", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["zincir"],
    notIncludes: ["ekibimize iletiyorum"],
  },

  // ═══════════════════════════════════════════════════════════════
  // ALT-AILE M9 — Anlamadım
  // ═══════════════════════════════════════════════════════════════
  {
    name: "M9.a — 'Anlamadım' completed",
    input: { message: "Anlamadım", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["tekrar", "açıklayalım"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M9.b — 'Bunu anlamadım'",
    input: { message: "Bunu anlamadım", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["tekrar", "açıklayalım"],
    notIncludes: ["ekibimize iletiyorum"],
  },

  // ═══════════════════════════════════════════════════════════════
  // NEGATIVE TESTLER — bu pattern'ler operatöre GİTMELİ (kalsın)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "NEG.a — 'Siparişim yola çıktı mı' → operatör DOĞRU",
    input: { message: "Siparişim yola çıktı mı", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["ekibimize"],  // operatör doğru
  },
  {
    name: "NEG.b — 'Siparişimi iptal etmek istiyorum' → completed_change_request",
    input: { message: "Siparişimi iptal etmek istiyorum", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["ekibimize"],  // değişiklik → operatör
  },
  {
    name: "NEG.c — 'kirik geldi' → operatör (şikayet)",
    input: { message: "kirik geldi", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["ekibimize"],
  },
  {
    name: "NEG.d — Non-completed stage'de isim → bundle ya da isim teyit, completed path'e düşmez",
    input: { message: "Yağmur kaya", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    // Completed DEĞİL, waiting_address → isim alındı ama devam prompt'u gerekir
    includes: ["efendim"],
  },

  // ═══════════════════════════════════════════════════════════════
  // STAGE-AWARE TESTLER
  // ═══════════════════════════════════════════════════════════════
  {
    name: "STAGE.a — 'Saolun' waiting_photo → gratitude DEĞİL (completed path yok)",
    input: { message: "Saolun", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // Completed değil, farklı handler — "rica ederiz" OLABILIR ama completed özel değil
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "STAGE.b — 'Teşkkürler' waiting_payment → normal flow",
    input: { message: "Teşkkürler", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    notIncludes: ["ekibimize iletiyorum"],
  },

  // ═══════════════════════════════════════════════════════════════
  // TYPO/PARAPHRASE VARİASYONLARI
  // ═══════════════════════════════════════════════════════════════
  {
    name: "TYPO.a — 'Tesekkur ederim' (Türkçe karakter eksik)",
    input: { message: "Tesekkur ederim", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["rica ederiz"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "TYPO.b — 'saolun' küçük harf",
    input: { message: "saolun", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["rica ederiz"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "TYPO.c — 'Cok sagolun' (g-ğ eksik)",
    input: { message: "Cok sagolun", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["rica ederiz"],
    notIncludes: ["ekibimize iletiyorum"],
  },

  // ══════════════════════════════════════════════════════════════
  // M RESIDUAL — Kalan alt-aileler (44 vaka → 15 düzeltilebilir)
  // ══════════════════════════════════════════════════════════════
  {
    name: "M11.a — 'RECEP AKDEMİR' UPPER → isim teyit",
    input: { message: "RECEP AKDEMİR", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["bilginizi aldim"],
  },
  {
    name: "M12.a — 'Ediz Metem ve Erol' → arka yazı notu",
    input: { message: "Ediz Metem ve Erol", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["arka yazi notu"],
  },
  {
    name: "M13.a — '2026-01-09 00:00:00' tarih → arka yazı",
    input: { message: "2026-01-09 00:00:00", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["arka yazi notu"],
  },
  {
    name: "M13.b — '03/01/2025' tarih → arka yazı",
    input: { message: "03/01/2025", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["arka yazi notu"],
  },
  {
    name: "M14.a — 'Ödemeyi yaptım' completed → payment kontrol (operator)",
    input: { message: "Ödemeyi yaptım", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["ekibimiz"],  // payment_confirmation handler → operator'a
  },
  {
    name: "M15.a — '🙏🙏🙏' → teşekkür",
    input: { message: "🙏🙏🙏", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["rica ederiz"],
  },
  {
    name: "M16.a — 'Allah'a emanet' → blessing",
    input: { message: "Allah'a emanet", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["tesekkur"],
  },
  {
    name: "M16.NEG — 'Allah razı olsun amin' → mevcut amin handler'a",
    input: { message: "Allah razı olsun amin", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["amin"],
  },
  {
    name: "M17.a — 'Tamamdır o zaman' → not aldık",
    input: { message: "Tamamdır o zaman", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["not aldık"],
  },
  {
    name: "M17.b — 'Çok iyi olur' → makul cevap (smalltalk'a düşüyor)",
    input: { message: "Çok iyi olur", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    // smalltalk handler'a düşüyor; completed'da operator'a gidebiliyor
    notIncludes: ["adres bilgilerinizi"],
  },
  {
    name: "M18.a — 'Kolyenin altına yazi' → back_text content teyit",
    input: { message: "Kolyenin altına yazi", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    // "Tabi efendim, notunuzu aldık" VEYA "arka yazi notu aldım" her ikisi de kabul
    intentIn: ["general","back_text_content"],
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "M17.NEG — 'Evet' completed → ack handler, M17 tetiklenmemeli",
    input: { message: "Evet", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    notIncludes: ["not aldık"],
  },
  {
    name: "M10.NEG — 'Olabilir' completed → adres bilgilerinizi tetiklememeli",
    input: { message: "Olabilir", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    notIncludes: ["adres bilgilerinizi"],
  },
];

runSuite("AILE M — Completed Overreach (87 prod vakası)", cases);
