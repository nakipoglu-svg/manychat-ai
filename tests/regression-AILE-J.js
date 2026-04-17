// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGRESSION AILE J — Soru sorulmuş ama stage-prompt dönüyor
//
// KÖK NEDEN: info-question gate dar; kullanıcı "...mi/mı/mu/mü" ile
// soru sormuş ama intent detection stage-prompt'a düşüyor.
//
// Prod vakaları: 94 (büyük aile)
// Alt-aileler: J1 price_confirm, J2 trust, J3 back_text_q, J5 chain,
// J6 human, J9 autopilot, J13 whatsapp, J14 vesikalık, J15 preview,
// J16 order_start, J21 composition + J_OTHER
//
// KATMAN: intent-engine.js (~satır 40-150)
//
// MIN TEST: 25+ (büyük aile — hedef 40+)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { runSuite } from "./_harness.js";

const cases = [
  // ═══════════════════════════════════════════════════════════════
  // J1 — Price confirmation (3 vaka)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J1.a — '600 tl mi' → EFT fiyat",
    input: { message: "600 tl mi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["599"],
    notIncludes: ["fotografınızı buradan"],
  },
  {
    name: "J1.b — '649 dimi' → kapıda teyit",
    input: { message: "649 dimi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["649"],
  },
  {
    name: "J1.c — 'Kapıda ödeme 650 tl degil mi'",
    input: { message: "Kapıda ödeme 650 tl degil mi", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["649"],
  },

  // ═══════════════════════════════════════════════════════════════
  // J2 — Trust/kararma (3 vaka)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J2.a — 'Karatma yapar mi' → trust",
    input: { message: "Karatma yapar mi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["kararma"],
    notIncludes: ["fotografınızı buradan"],
  },
  {
    name: "J2.b — 'Renk degişirmi'",
    input: { message: "Renk degişirmi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["kararma"],
  },
  {
    name: "J2.c — 'Solma yapar mı'",
    input: { message: "Solma yapar mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["kararma"],
  },

  // ═══════════════════════════════════════════════════════════════
  // J3 — Back text question waiting_payment (4 vaka)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J3.a — 'Arkasına yazı yazılıyor mu'",
    input: { message: "Arkasına yazı yazılıyor mu", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["arka yuze"],
    notIncludes: ["arka yazi notu aldim"],
  },
  {
    name: "J3.b — 'Arkasina yazi oluyor mu'",
    input: { message: "Arkasina yazi oluyor mu", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["arka yuze"],
  },
  {
    name: "J3.c — 'Arkasina yazi yaziyor musunuz'",
    input: { message: "Arkasina yazi yaziyor musunuz", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["arka yuze"],
  },
  {
    name: "J3.d — 'Arkaya isim de mi yazılıyor'",
    input: { message: "Arkaya isim de mi yazılıyor", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["arka yuze"],
  },

  // ═══════════════════════════════════════════════════════════════
  // J5 — Zincir (dar, sadece "zincirden var mı" ve "sorabilir miyim")
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J5.a — 'zincir uzunluğunu sorabilir miyim'",
    input: { message: "zinciri uzunluğunu sorabilir miyim", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["60 cm"],
  },
  {
    name: "J5.b — 'Bu zincirden var mi'",
    input: { message: "Bu zincirden var mi", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["zincir"],
  },

  // ═══════════════════════════════════════════════════════════════
  // J6 — Human help (3 vaka)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J6.a — 'Yardımcı olur musunuz'",
    input: { message: "Yardımcı olur musunuz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["ekibimiz"],
  },
  {
    name: "J6.b — 'Ya artık biri yardımcı olabilir mi'",
    input: { message: "Ya artık biri yardımcı olabilir mi", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["ekibimiz"],
  },
  {
    name: "J6.c — 'Sizinle ortaklık yapabilir miyiz'",
    input: { message: "Sizinle ortaklık yapabilir miyiz", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["ekibimiz"],
  },

  // ═══════════════════════════════════════════════════════════════
  // J9 — Autopilot (3 vaka)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J9.a — 'Otomatik mesaj mi'",
    input: { message: "Otomatik mesaj mi", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["otomatik"],
    notIncludes: ["ad soyad"],
  },
  {
    name: "J9.b — 'Yapay zeka mi cevap veriyor bana'",
    input: { message: "Yapay zeka mi cevap veriyor bana", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["otomatik"],
  },
  {
    name: "J9.c — 'Bot mu'",
    input: { message: "Bot mu sen", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["otomatik"],
  },

  // ═══════════════════════════════════════════════════════════════
  // J13 — WhatsApp (2 vaka)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J13.a — 'WhatsApp var mı' → contact_channel",
    input: { message: "WhatsApp var mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["whatsapp"],
  },
  {
    name: "J13.b — 'Watsap var mı' (typo)",
    input: { message: "Watsap var mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["whatsapp"],
  },

  // ═══════════════════════════════════════════════════════════════
  // J14 — Vesikalık (2 vaka)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J14.a — 'Vesikalik çektirsem mi'",
    input: { message: "Vesikalik cektirsem mi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["vesikalik olmasi gerekmez"],
  },
  {
    name: "J14.b — 'Vesikalık mı olmalı'",
    input: { message: "Vesikalık mı olmalı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["vesikalik"],
  },

  // ═══════════════════════════════════════════════════════════════
  // J16 — Order start (3 vaka)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J16.a — 'Ürün satın alabilir miyim?'",
    input: { message: "Ürün satın alabilir miyim?", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["tabii efendim"],
    notIncludes: ["hangi model ile ilgileniy"],  // stage-prompt değil, işlem onayı
  },
  {
    name: "J16.b — 'Sipariş vermek istiyorum' (soru formatında değil)",
    input: { message: "Sipariş vermek istiyorum", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // Sipariş ifadesi → normal flow
  },

  // ═══════════════════════════════════════════════════════════════
  // J21 — Çoklu kişi composition (2 vaka)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J21.a — 'Kızım ve oğlum var birlikte çekilmiş'",
    input: { message: "Kızım ve oğlum var birlikte çekilmiş resimleri olur mu acaba", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // composition_question - birleştirme / yan yana cevabı
    includes: ["birleştir"],
  },

  // ═══════════════════════════════════════════════════════════════
  // TYPO / VARIATIONS
  // ═══════════════════════════════════════════════════════════════
  {
    name: "TYPO.1 — '600 TL Mİ' büyük harf",
    input: { message: "600 TL Mİ", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["599"],
  },
  {
    name: "TYPO.2 — 'karatma var mı' küçük harf",
    input: { message: "karatma var mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["kararma"],
  },
  {
    name: "TYPO.3 — 'vesıkalık mı' (ı-i bozuk)",
    input: { message: "vesıkalık mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["vesikalik"],
  },

  // ═══════════════════════════════════════════════════════════════
  // NEGATIVE — J pattern'e düşmemeli
  // ═══════════════════════════════════════════════════════════════
  {
    name: "NEG.a — 'Zincir 60 cm olmaz mi' → chain_question DEĞİL, trust/composition",
    input: { message: "Zincir 60 cm olmaz mi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // Mevcut davranış: "foto gönderdikten sonra" veya "60 cm" cevabı
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "NEG.b — 'Zincir kararıyor mu' → trust DEĞİL chain",
    input: { message: "Zincir kararıyor mu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // trust cevabı (kararma yapmaz) veya chain (foto gönderdikten sonra)
    notIncludes: ["fotografınızı buradan iletebilirsiniz"],
  },
  {
    name: "NEG.c — 'Yapay zeka ile mi yapıyorsunuz' → lazer yapım sorusu",
    input: { message: "Yapay zeka ile mi yapıyorsunuz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // LT26: "lazer baski" içermeli, autopilot değil
    notIncludes: ["otomatik yanıt sistemi"],
  },
  {
    name: "NEG.d — 'Vesikalık fotoğraf yok' → vesikalık handler DEĞİL",
    input: { message: "Vesikalık fotoğraf yok. Ama normal fotoğraflarım var", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // R88_2405: "tabi" içermeli
    notIncludes: ["vesikalik olmasi gerekmez"],
  },
  {
    name: "NEG.e — 'Çelik mi alerjim var' → material_question",
    input: { message: "Çelik mi alerjim var", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["celik"],
  },

  // ═══════════════════════════════════════════════════════════════
  // STAGE-AWARE
  // ═══════════════════════════════════════════════════════════════
  {
    name: "STAGE.a — waiting_product'ta 'Otomatik mi' → J gate çalışmasın",
    input: { message: "Otomatik mi", conversation_stage: "waiting_product" },
    // waiting_product J gate'e dahil değil - normal flow
    notIncludes: ["otomatik yanıt sistemi"],
  },
  {
    name: "STAGE.b — waiting_product'ta 'Watsap var mi' → smalltalk/menu",
    input: { message: "Watsap var mi", conversation_stage: "waiting_product" },
    // contact_channel yerine genel menu
    notIncludes: ["whatsapp desteğimiz şu anda"],
  },

  // ═══════════════════════════════════════════════════════════════
  // MULTI-TURN — stage değişimi
  // ═══════════════════════════════════════════════════════════════
  {
    name: "MT.a — waiting_address'te 'Otomatik mesaj mi bu' → autopilot",
    input: { message: "Otomatik mesaj mi bu", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["otomatik"],
  },
  {
    name: "MT.b — waiting_payment'ta 'Arkasına yazı yazılıyor mu' → back_text_info",
    input: { message: "Arkasına yazı yazılıyor mu", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["arka yuze"],
  },
  {
    name: "MT.c — 'Yardımcı olur musunuz' payment",
    input: { message: "Yardımcı olur musunuz", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["ekibimiz"],
  },

  // ═══════════════════════════════════════════════════════════════
  // J_OTHER — tail patterns (spesifik prod vakaları)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J_OTHER.a — 'Bir de buradan mi gonderiyorhz' → photo_format",
    input: { message: "Bir de buradan mi gonderiyorhz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["normal fotograf"],
  },
  {
    name: "J_OTHER.b — 'Rakamlar yazılıyor mu' → back_text_info",
    input: { message: "Rakamlar yazılıyor mu", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    notIncludes: ["ad soyad, cep telefonu"],
  },
  {
    name: "J_OTHER.c — 'Kontrol ettiniz mi' → photo_status",
    input: { message: "Kontrol ettiniz mi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["fotograf"],
    notIncludes: ["fotografınızı buradan iletebilirsiniz efendim 😊$"],
  },
  {
    name: "J_OTHER.d — 'Neler yazıyorsun fikir alabilir miyim' → back_text_examples",
    input: { message: "Neler yazıyorsun fikir alabilir miyim", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["isim"],
  },
  {
    name: "J_OTHER.e — 'Sizde örnek foto var mı' → preview",
    input: { message: "Sizde örnek foto var mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: ["fotografınızı buradan iletebilirsiniz efendim 😊$"],
  },
  {
    name: "J_OTHER.f — 'Öncesınde görmez mıyız' → preview",
    input: { message: "Öncesınde görmez mıyız", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    // preview_request handler'a gitmeli
    notIncludes: ["odeme tercihinizi belirtebilir misiniz"],
  },
  {
    name: "J_OTHER.g — 'Bu foto uygun mu' → photo_acceptance",
    input: { message: "Bu foto uygun mu", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["inceledikten sonra"],
  },
  {
    name: "J_OTHER.h — 'Siparişim hazırlanmadı mı' → order_status",
    input: { message: "Siparişim daha hazirlanmadi mi", conversation_stage: "order_completed", siparis_alindi: "1", order_status: "completed", ilgilenilen_urun: "lazer" },
    includes: ["ekibimiz"],
  },
  {
    name: "J_OTHER.i — 'Soru sorabilir miyim' → general_question",
    input: { message: "Soru sorabilir miyim", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["sorunuzu iletebilir"],
  },
  {
    name: "J_OTHER.j — 'Mümkün mü' → general_question",
    input: { message: "Mümkün mü", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["sorunuzu iletebilir"],
  },

  // ═══════════════════════════════════════════════════════════════
  // J_FINAL tail (son residual pattern'ları)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "J_FINAL.a — 'Bu olabilir mi' waiting_address → photo_acceptance",
    input: { message: "Bu olabilir mi", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    notIncludes: ["ad soyad, cep telefonu"],
  },
  {
    name: "J_FINAL.b — 'Bu resimdeki gibi mi geliyor' → preview",
    input: { message: "Bu resimdeki gibi mi geliyor", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["on izleme"],
  },
  {
    name: "J_FINAL.c — 'Karttan mi atiyoruz' waiting_address → payment_info",
    input: { message: "Karttan mi atiyoruz", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    includes: ["eft"],
  },
  {
    name: "J_FINAL.d — 'Beyefendi fotoğrafı biz mi atıyoruz' → photo_format",
    input: { message: "Beyefendi fotoğrafı biz mi atıyoruz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["normal fotograf"],
  },
  {
    name: "J_FINAL.e — 'Nasıl yapıyorsunuz resimleri size mi göndereceğiz' → photo_format",
    input: { message: "Nasıl yapıyorsunuz resimleri size mi göndereceğiz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["normal fotograf"],
  },

  // NEGATIVE — yeni pattern'lar regresyon üretmemeli
  {
    name: "J_FINAL.NEG.a — 'Bu ne kadar' → price, photo_acceptance DEĞİL",
    input: { message: "Bu ne kadar", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    // Price question mevcut handler'a gitmeli
    notIncludes: ["inceledikten sonra"],
  },
  {
    name: "J_FINAL.NEG.b — 'Bitince görsel atar mısınız' → preview DEĞİL (exception)",
    input: { message: "Bitince görsel atar mısınız", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    // R88_9016: "paylaş" (preview) değil "kargo öncesi" metni  
  },
];

runSuite("AILE J — Soru → stage-prompt (94 prod vakası)", cases);
