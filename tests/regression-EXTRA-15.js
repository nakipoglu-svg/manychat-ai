// GPT'nin tespit ettiği ve ana 333 backlog'da ayrı bug olarak detaylanmayan 15 log.
// Family kategorileri:
//   F9_sales_warmth         — satış sıcaklığı / eski müşteri praise
//   F9_post_sale_warmth     — satış sonrası sıcak karşılama
//   F9_empathic_continuation — duygusal continuation
//   F9_false_slot_ack       — olmayan slot aldım yanlışı
//   F3_back_text_long       — uzun duygusal back_text skip edilmesi
//   F3_back_text_info_completed — completed'da "Ne yazabiliriz" → yanlış yanıt
//   F6_payment_typo         — "Nakşt" nakit typo'su
//   F8_high_intent_weak_cta — high-intent müşteriye pasif CTA
//   F7_partial_bundle_merge — kısmi bundle (isim+tel, adres yok) merge
//   F2_half_cta             — "Sipariş verirsem tamam" — yarım CTA
//   F8_confabulated_status  — uydurma durum ("Fotoğrafı hazırlıyoruz")
//   F8_weak_clarify_context — "Bumu" son mesaj bağlamı olmadan clarify
//   F9_deferral_sales_closer — "düşünüp döneceğim" sonrası satış kapanış zayıf

import { runSuite } from "./_harness.js";

const cases = [
  {
    name: "E01 [F9_sales_warmth] 'Kolyemle aşk yaşıyorum resmen' [waiting_product]",
    input: { message: "Kolyemle aşk yaşıyorum resmen", conversation_stage: "waiting_product", ilgilenilen_urun: "" },
    notIncludes: "hangi model ile ilgileniyorsunuz",
  },
  {
    name: "E02 [F9_post_sale_warmth] 'atarım şimdi bile çok güzel 👏' [completed]",
    input: { message: "Tabiki atarım şimdi bile çok güzel 👏", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "E03 [F3_back_text_long] uzun duygusal back_text [completed]",
    input: { message: "Seni çok seviyorum canım oğlum, her nefesimsin, iyi ki varsın, Allah hep bağışlasın", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "arka yazi",
  },
  {
    name: "E04 [F9_empathic_continuation] 'Önemli olan o çünki' [completed]",
    input: { message: "Önemli olan o çünki", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: ["neden"],
  },
  {
    name: "E05 [F9_post_sale_warmth] 'Hiç çıkarmıcak boynundan inanın ki' [completed]",
    input: { message: "Hiç çıkarmıcak boynundan inanın ki", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "E06 [F9_false_slot_ack] 'Olabilir' [completed] — false slot aldım olmamalı",
    input: { message: "Olabilir", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: ["bilgilerinizi aldim", "adresi aldim"],
  },
  {
    name: "E07 [F9_sales_warmth] eski müşteri teşekkür [waiting_product]",
    input: { message: "Teşekkür ederim çok beğendim elinize sağlık hediyeniz için teşekkür ederim", conversation_stage: "waiting_product", ilgilenilen_urun: "" },
    notIncludes: ["hangi model ile ilgileniyorsunuz"],
  },
  {
    name: "E08 [F3_back_text_info_completed] 'Ne yazabiliriz' [completed]",
    input: { message: "Ne yazabiliriz", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "arka",
    notIncludes: ["siparisiniz basariyla tamamlandi", "lazer zincir 60cm"],
  },
  {
    name: "E09 [F6_payment_typo] 'Nakşt' [waiting_photo] — nakit typo",
    input: { message: "Nakşt", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "E10 [F8_high_intent_weak_cta] 'Resimli kolye düşünüyorum çocuklarımın' [waiting_photo]",
    input: { message: "Resimli kolye düşünüyorum çocuklarımın", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "fotograf",
    notIncludes: ["bekliyoruz efendim  ne zaman isterseniz"],
  },
  {
    name: "E11 [F7_partial_bundle_merge] isim + telefon (adres yok) [waiting_address]",
    input: { message: "Ayşe Yılmaz\n05421234567", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: "acik adres",
    notIncludes: ["siparisiniz olusturul"],
  },
  {
    name: "E12 [F2_half_cta] 'Sipariş verirsem tamam' [waiting_photo]",
    input: { message: "Sipariş verirsem tamam", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "fotograf",
  },
  {
    name: "E13 [F8_confabulated_status] 'Bekliyoruz' [waiting_photo] — uydurma süreç yok",
    input: { message: "Bekliyoruz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: ["fotografi hazirliyoruz", "hazirlaniyor"],
  },
  {
    name: "E14 [F8_weak_clarify_context] 'Bumu' [waiting_photo] — bağlamsız clarify",
    input: { message: "Bumu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer",
             ai_reply: "Lazer kolye 60 cm zincirli tek modelimiz var efendim 😊" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "E15 [F9_deferral_sales_closer] 'Düşüneyim dönüş yaparım'",
    input: { message: "Çok teşekkür ederim düşüneyim dönüş yaparım size", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "suya dayanikli",
  },
];

const result = await runSuite("EXTRA-15 (GPT findings)", cases);
process.exit(result.fail > 0 ? 1 : 0);
