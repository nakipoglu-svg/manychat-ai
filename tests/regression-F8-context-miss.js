import { runSuite } from "./_harness.js";

const cases = [
  // ─── Deferral / farewell → "Suya dayanıklı" sızıntısı ───
  {
    name: "[14.04 20:36] 'Teşekür ederim düşüneyim dönüş yaparım' — Suya dayanıklı sızmamalı",
    input: { message: "Teşekür ederim ben bı düşüneyim dönüş yaparım size tekrardan", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: ["suya dayanikli", "denizde sorun"],
    includes: "bekliyoruz",
  },
  {
    name: "[14.04 21:57] 'Teşekkür ederim düşünüp geri dönüş yapacağım'",
    input: { message: "Teşekkür ederim düşünüp geri dönüş yapacağım", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "suya dayanikli",
    includes: "bekliyoruz",
  },
  {
    name: "[14.04 22:38] 'Çok teşekkür ederim düşünüp dönüş yaparım iyi geceler'",
    input: { message: "Çok teşekkür ederim düşünüp dönüş yaparım iyi geceler", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "suya dayanikli",
  },
  {
    name: "[14.04 23:12] 'Tamam ben düşünüp sizi döneceğim iyi akşamlar'",
    input: { message: "Tamam ben düşünüp sizi döneceğim iyi akşamlar", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "suya dayanikli",
  },
  {
    name: "[16.04 00:43] 'Tmm bi dusunup donus yapacam siz'",
    input: { message: "Tmm bi dusunup donus yapacam siz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "suya dayanikli",
    includes: "bekliyoruz",
  },
  {
    name: "[14.04 22:15] 'Teşekkür ederim şuan değil müsait bir zamanda inşallah sipariş oluşturacağım'",
    input: { message: "Teşekkür ederim şuan değil müsait bir zamanda inşallah sipariş oluşturacağım", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: ["599", "kapida odeme ile 649", "resimli lazer kolye fiyatimiz"],
    includes: "bekliyoruz",
  },
  {
    name: "[15.04 22:03] 'Babam sorup geri döndüş yapıcam annemin vefat eden babasın yaptırmayı düşünüyorum'",
    input: { message: "Babam sorup geri döndüş yapıcam annemin vefat eden babasın yaptırmayı düşünüyorum da", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "suya dayanikli",
  },
  {
    name: "[15.04 16:28] 'Tek atarsınız diye düşünmüştüm görseli'",
    input: { message: "Tek atarsınız diye düşünmüştüm görseli", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "suya dayanikli",
  },

  // ─── Short follow-up with lastContext ───
  {
    name: "[14.04 21:00] 'Fiyat değişir mi' — önceki: 5 kişi soru",
    input: { message: "Fiyat değişir mi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer",
             ai_reply: "Evet efendim, birden fazla kişi olabilir 😊 Fotoğrafta kaç kişi olursa olsun basıyoruz." },
    includes: ["fiyat", "fark"],
    notIncludes: ["kapida odeme ile 649 tl"],
  },
  {
    name: "[14.04 21:05] 'Yani rengi' — önceki: solar mı kararma",
    input: { message: "Yani rengi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer",
             ai_reply: "Kararma yapmaz efendim, paslanmaz çeliktir. Solma yapmaz." },
    includes: ["renk"],
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 22:14] 'Mümkün mü' — önceki: 2 kişi/resim bağlamı",
    input: { message: "Mümkün mü", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer",
             ai_reply: "2 kişi aynı karede olabilir efendim, birden fazla kişi fotoğrafta yan yana basılıyor." },
    includes: "evet",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 11:39] 'Bunu yapabiliyor muyuz' — önceki: arka yazı sorusu",
    input: { message: "Bunu yapabiliyor muyuz", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer",
             ai_reply: "Arka yüze ne yazalım efendim? İsim, tarih veya dua yazabilirsiniz." },
    includes: "arka",
  },

  // ─── Context-sensitive price/quantity ───
  {
    name: "[14.04 20:51] 'İkiside' [waiting_product] — iki fiyat",
    input: { message: "İkiside", conversation_stage: "waiting_product", ilgilenilen_urun: "" },
    notIncludes: "odeme olarak eft mi",
  },

  // ─── REGRESSION — Gerçekten su sorusuna su cevabı ───
  {
    name: "REGRESSION: 'Suya dayanıklı mı' — gerçek su sorusu",
    input: { message: "Suya dayanıklı mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "suya dayanikli",
  },
  {
    name: "REGRESSION: 'Banyoda takabilir miyim' — banyo",
    input: { message: "Banyoda takabilir miyim", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "suya dayanikli",
  },
];

const result = await runSuite("F8_context_miss", cases);
process.exit(result.fail > 0 ? 1 : 0);
