// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGRESSION PROD-LOGS — 13-14 Nisan production logs analizinden türetilmiş
// 5 kritik hata ailesi için regresyon koruması.
//
// AILELER:
//   1. PII redaction blindness — [PHONE]/[ADDRESS] token'ları bundle sinyali
//   2. Typo-tolerant intent — kararıyo, yazılcak, solarmı, Araçlı kolye, mısınz
//   3. Short robotic reply — "Adres?", "Kaç?", "Tam efendim" → genişletme
//   4. Composition ataç→lazer routing — iki/üç foto, kişi, yan yana
//   5. Payment commit suffixes — "Kapıda ödemeli", "havale ödeyeceğim"
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { runSuite } from "./_harness.js";

const cases = [
  // ═══════════════════════════════════════════════════════════════
  // AILE 1 — PII REDACTION BLINDNESS (14 prod hata)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "AILE1.a — Hicran Doğan [PHONE] Ferahim [ADDRESS] — full bundle redacted",
    input: {
      message: "Hicran Doğan [PHONE] Ferahim Şalvuz Mahallesi 1649 [ADDRESS]",
      conversation_stage: "order_completed", ilgilenilen_urun: "lazer",
      siparis_alindi: "1", order_status: "completed"
    },
    notIncludes: ["acik adres bilginiz ile devam", "adres bilginiz ile devam", "ekibimize iletiyorum"],
  },
  {
    name: "AILE1.b — İkra Tokmak [PHONE] Muratpaşa... — name+phone+addr redacted",
    input: {
      message: "İkra Tokmak [PHONE]\nMuratpaşa mahallesi cicoz yolu caddesi [ADDRESS]",
      conversation_stage: "order_completed", ilgilenilen_urun: "lazer",
      siparis_alindi: "1", order_status: "completed"
    },
    notIncludes: ["acik adres bilginiz ile devam", "adres bilginiz ile devam"],
  },
  {
    name: "AILE1.c — Kübra Çelik [PHONE] GENÇOSMAN [ADDRESS]",
    input: {
      message: "Kübra Çelik \n[PHONE]\nGENÇOSMAN [ADDRESS]",
      conversation_stage: "order_completed", ilgilenilen_urun: "lazer",
      siparis_alindi: "1", order_status: "completed"
    },
    notIncludes: ["adres bilginiz ile devam", "ekibimize iletiyorum"],
  },
  {
    name: "AILE1.d — [PHONE] solo w_address — ad+adres iste",
    input: {
      message: "[PHONE]",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    includes: ["ad soyad", "adres"],
  },
  {
    name: "AILE1.e — [ADDRESS] solo w_address — isim+telefon iste",
    input: {
      message: "Yeşilyurt [ADDRESS]",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    // Solo adres → henüz isim ve telefon eksik, "bilgileriniz ile devam" OK ama
    // "onaylıyor musunuz" gibi gereksiz onay istemesin
    notIncludes: ["onayliyor musunuz", "siparis icin onay"],
  },

  // ═══════════════════════════════════════════════════════════════
  // AILE 2 — TYPO-TOLERANT INTENT (production typo'ları)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "AILE2.a — 'kararıyormu' → kararma intent (compound typo)",
    input: {
      message: "Çelik zamanla kararıyormu acaba",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: "kararma",
  },
  {
    name: "AILE2.b — 'Zincir kararıyormu' → trust/kararma",
    input: {
      message: "Zincir kararıyormu",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: "kararma",
  },
  {
    name: "AILE2.c — 'kararıyomu' (r eksik) → kararma",
    input: {
      message: "Kolye kararıyomu",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: "kararma",
  },
  {
    name: "AILE2.d — 'Araçlı kolye ne kadar' (typo ataç) → ataç fiyatı (499)",
    input: {
      message: "Araçlı kolye ne kadar",
      conversation_stage: "waiting_product"
    },
    includes: "499",
  },
  {
    name: "AILE2.e — 'yazılcak' (typo yazılacak) → back_text intent yakalansın",
    input: {
      message: "Alparslan yazılcak",
      conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer"
    },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "AILE2.f — 'Beyazlama yapsrmi' (typo solar mı) → renk/kararma",
    input: {
      message: "Beyazlama yapsrmi",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    notIncludes: "ekibimize iletiyorum",
  },

  // ═══════════════════════════════════════════════════════════════
  // AILE 3 — SHORT ROBOTIC REPLY (guard min-length)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "AILE3.a — waiting_photo short reply expand (Fotoğraf? 😊 yasak)",
    input: {
      message: "Oğlumun",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    // guard engine "Fotoğraf? 😊" gibi tek kelime yasaklı → detaylı cevap verilmeli
    includes: ["efendim", "buradan"],
  },
  {
    name: "AILE3.b — waiting_address short reply expand (Adres? yasak)",
    input: {
      message: "Tokat erba merkez",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    includes: "efendim",
  },
  {
    name: "AILE3.c — waiting_photo 'Benle oğlum' → detaylı cevap",
    input: {
      message: "Benle oğlum",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: "efendim",
  },

  // ═══════════════════════════════════════════════════════════════
  // AILE 4 — COMPOSITION ATAÇ→LAZER ROUTING
  // ═══════════════════════════════════════════════════════════════
  {
    name: "AILE4.a — ataç stage 'Üç kardeş tek resim olur mu' → lazer'e geç",
    input: {
      message: "Üç kardeş tek resim olur mu",
      conversation_stage: "waiting_letters", ilgilenilen_urun: "atac"
    },
    // ataç cevabı DEĞİL — composition sorusu, lazer bağlamında cevaplanmalı
    notIncludes: ["modelde fotograf kullanilmiyor", "yapilmasini istediginiz harfleri"],
  },
  {
    name: "AILE4.b — ataç stage 'Bir kolyeye 2 resimli' → lazer switch",
    input: {
      message: "Bir kolyeye 2 resimli uc yaparmisiniz",
      conversation_stage: "waiting_letters", ilgilenilen_urun: "atac"
    },
    notIncludes: ["yapilmasini istediginiz harfleri"],
  },
  {
    name: "AILE4.c — waiting_product 'iki taraflı resim' → composition cevabı",
    input: {
      message: "İki tarafına da resim yapılıyor mu",
      conversation_stage: "waiting_product"
    },
    includes: ["hangi model"],
    notIncludes: ["ekibimize iletiyorum"],
  },

  // ═══════════════════════════════════════════════════════════════
  // AILE 5 — PAYMENT COMMIT SUFFIXES
  // ═══════════════════════════════════════════════════════════════
  {
    name: "AILE5.a — 'Kapıda ödemeli efendim' → kapıda commit",
    input: {
      message: "Kapıda ödemeli efendim",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    // kapıda ödeme seçeneği bilgi cevabı DEĞİL, commit alınmış olmalı
    notIncludes: ["kapida odeme secenegimiz mevcut", "kapıda ödeme seçeneğimiz mevcut"],
  },
  {
    name: "AILE5.b — 'havale ödeyeceğim' w_address → eft_havale commit",
    input: {
      message: "Ücreti havale ödeyeceğim",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    notIncludes: ["eft havale veya kapida nakit olarak odeyebil", "ile veya kapida nakit"],
  },
  {
    name: "AILE5.c — 'Kapıda olsun' → kapıda commit",
    input: {
      message: "Kapıda olsun",
      conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer"
    },
    notIncludes: ["kapida odeme secenegimiz mevcut"],
  },

  // ═══════════════════════════════════════════════════════════════
  // AILE 6 — WARMTH / BLESSING (Allah razı olsun mapping)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "AILE6.a — 'Başınız sağolsun' → condolence ack (not back_text)",
    input: {
      message: "Başınız sağolsun",
      conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer"
    },
    notIncludes: ["arka yazi notu aldim", "bilgilerinizi aldim"],
  },

  // ═══════════════════════════════════════════════════════════════
  // AILE 7 — PAYMENT COMMIT MISS (Fix A — Turn 16)
  // Production vakaları: #7, #12, #13, #14
  // ═══════════════════════════════════════════════════════════════
  {
    name: "AILE7.a — 'Kapıda ödeme' waiting_photo → commit (info cevabı DEĞİL)",
    input: {
      message: "Kapıda ödeme",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: ["kapida"],
    notIncludes: ["kapida odeme secenegimiz mevcut"],  // info cevabı yasak
  },
  {
    name: "AILE7.b — 'Kapıda ödeme olacak' → commit",
    input: {
      message: "Kapıda ödeme olacak",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: ["kapida", "fotograf"],
  },
  {
    name: "AILE7.c — 'EFT yaparım' → commit",
    input: {
      message: "EFT yaparım",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: ["eft"],
  },
  {
    name: "AILE7.d — completed 'Kapıda ödeme ile' → teyit (operator DEĞİL)",
    input: {
      message: "Kapıda ödeme ile",
      conversation_stage: "order_completed", ilgilenilen_urun: "lazer",
      siparis_alindi: "1", order_status: "completed", payment_method: "kapida_odeme"
    },
    notIncludes: ["ekibimize iletiyorum"],
  },
  {
    name: "AILE7.e — '650 tl kapıda ödemeli dimi' → price_confirmation (commit DEĞİL)",
    input: {
      message: "650 tl kapıda ödemeli dimi",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: ["649"],  // price confirmation cevabı
  },

  // ═══════════════════════════════════════════════════════════════
  // AILE 8 — COMPOSITION "ARKA + FOTO" (Fix B — Turn 16)
  // Production vakaları: #9, #11
  // ═══════════════════════════════════════════════════════════════
  {
    name: "AILE8.a — 'Arkasına da farklı bir resim' → composition (back_text DEĞİL)",
    input: {
      message: "Arkasına da farklı bir resim koyabiliyormuyuz",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: ["birlestir"],
    notIncludes: ["arka yuze yazi yazabiliyoruz"],
  },
  {
    name: "AILE8.b — 'Arka yüz de de foto olacak' → composition",
    input: {
      message: "Arka yüz de de foto olacak ya bu yüzden soruyorum",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: ["birlestir"],
    notIncludes: ["arka yuze yazi yazabiliyoruz ucretsizdir"],
  },
  {
    name: "AILE8.c — 'Arka foto fiyat' → composition DEĞİL, back_photo_info fiyat branch",
    input: {
      message: "Arka foto fiyat farkı var mı",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: ["ucret"],  // "ücretsizdir" veya "ek ücret alınmaz"
  },
  {
    name: "AILE8.d — waiting_payment 'arka fotoraf' → legacy back_photo_info",
    input: {
      message: "Arka tarafına başka fotoraf istiyorlar",
      conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer",
      photo_received: "1"
    },
    includes: ["efendim"],  // cevap var, operator değil
  },

  // ═══════════════════════════════════════════════════════════════
  // AILE 9 — MARKETPLACE / LOCATION (Fix C — Turn 16)
  // Production vakası: #5
  // ═══════════════════════════════════════════════════════════════
  {
    name: "AILE9.a — 'Trendyolda mağazanız varmi' → marketplace cevabı (Eminönü DEĞİL)",
    input: {
      message: "Trendyolda falan mağazanız varmi",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: ["instagram"],
    notIncludes: ["eminonu"],
  },

  // ═══════════════════════════════════════════════════════════════
  // AILE 10 — PRODUCT ACK (Fix D — Turn 16)
  // Production vakaları: #2, #6, #8
  // ═══════════════════════════════════════════════════════════════
  {
    name: "AILE10.a — 'Halat kolyeyle mi bu fiyat' → chain_question",
    input: {
      message: "Halat kolyeyle mi bu fiyat?",
      conversation_stage: "waiting_product"
    },
    includes: ["zincir"],
    notIncludes: ["fiyatlarimiz:"],  // price dump yasak
  },
  {
    name: "AILE10.b — 'Gümüş fiyatı nedir' → materyal + 599 (price dump DEĞİL)",
    input: {
      message: "Gümüş fiyatı nedir acaba",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: ["kaplama", "599"],
  },
  {
    name: "AILE10.c — 'Bileklik tarzında yapıyor musunuz' → sadece kolye (hediye bileklik DEĞİL)",
    input: {
      message: "Bileklik tarzında yapıyor musunuz",
      conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer"
    },
    includes: ["sadece kolye"],
  },

  // ═══════════════════════════════════════════════════════════════
  // AILE 11 — POST-SALE MISS IN WAITING_PRODUCT (Fix E — Tur 16)
  // 2954 denetlenmemiş mesajda bulunan gizli hata ailesi (+9 prod)
  // ═══════════════════════════════════════════════════════════════
  {
    name: "AILE11.a — 'ben sipariş verdim' waiting_product → post_sale (menu DEĞİL)",
    input: {
      message: "ben sipariş verdim",
      conversation_stage: "waiting_product", menu_gosterildi: "evet"
    },
    includes: ["ekibimize"],
    notIncludes: ["resimli lazer kolye\n• harfli"],  // pure menu cevabı yasak
  },
  {
    name: "AILE11.b — 'Sipariş oluşturmuştum' → post_sale",
    input: {
      message: "Sipariş oluşturmuştum",
      conversation_stage: "waiting_product", menu_gosterildi: "evet"
    },
    includes: ["ekibimize"],
    notIncludes: ["resimli lazer kolye\n• harfli"],
  },
  {
    name: "AILE11.c — 'Size Sipariş verdim' → post_sale",
    input: {
      message: "Size Sipariş verdim",
      conversation_stage: "waiting_product", menu_gosterildi: "evet"
    },
    includes: ["ekibimize"],
  },
  {
    name: "AILE11.d — 'neden dönüş yapmıyorsunuz' → post_sale",
    input: {
      message: "Merhaba anlamıyorum neden hala dönüş yapmıyorsunuz",
      conversation_stage: "waiting_product", menu_gosterildi: "evet"
    },
    includes: ["ekibimize"],
  },
  {
    name: "AILE11.e — 'verdiğim siparişimle ilgili bilgi' → post_sale",
    input: {
      message: "Ben verdiğim siparişimle ilgili bilgi almak istiyorum",
      conversation_stage: "waiting_product", menu_gosterildi: "evet"
    },
    includes: ["ekibimize"],
  },
  {
    name: "AILE11.f — ilk mesaj 'sipariş vermek istiyorum' → order_start (post_sale DEĞİL)",
    input: {
      message: "sipariş vermek istiyorum",
      conversation_stage: "waiting_product"  // menu_gosterildi YOK → ilk mesaj
    },
    notIncludes: ["ekibimize"],  // post_sale'e gitmemeli, order akışı
  },
];

runSuite("PROD-LOGS (prod hata aileleri)", cases);
