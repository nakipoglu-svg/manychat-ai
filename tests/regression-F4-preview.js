import { runSuite } from "./_harness.js";

const cases = [
  // ─── COMPLETED stage — preview/reminder policy dönsün, operatör değil ───
  {
    name: "[14.04 21:11] 'ürün hazırlandıktan sonra kargoya verilmeden önce görselini gönderebilir misiniz'",
    input: { message: "Tekrar rahatsız ediyorum ama ürün hazırlandıktan sonra kargoya verilmeden önce görselini gönderebilir misiniz", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "paylasabiliyoruz",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[14.04 21:11] 'heyecanlı bi kargo, görmek isterim' — shipping sızmamalı",
    input: { message: "Benim için heyecanlı bi kargo, görmek isterim", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "paylasabiliyoruz",
    notIncludes: ["kargo ucretsiz", "istanbul ici 1 2"],
  },
  {
    name: "[14.04 18:26] 'Rica etsem atma şansınız varmı'",
    input: { message: "Rica etsem atma şansınız varmı merak ediyorum da", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "paylasabiliyoruz",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[14.04 21:48] 'Burgu görsel bakabilir miyim'",
    input: { message: "Burgu görsel bakabilir miyim", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[14.04 21:52] 'Teyit için mj atmadınız nasıl oldu kolyem'",
    input: { message: "Teyit için mj atmadınız nasıl oldu kolyem", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "paylasabiliyoruz",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[14.04 23:19] 'Görsel ala bilirmıyım nasıl oöur diye'",
    input: { message: "Görsel ala bilirmıyım nasıl oöur diye", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "paylasabiliyoruz",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 10:22] 'zinciri de atarsınız bı bakayım müsait olduğunuz zaman'",
    input: { message: "Tamam zinciri de atarsınız bı bakayım müsait olduğunuz zaman", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "paylasabiliyoruz",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 14:51] 'Sipairş görseli atıcaktınız'",
    input: { message: "Sipairş görseli atıcaktınız", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "paylasabiliyoruz",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 15:04] 'Ben size şimdi fotoğraflari atsam bana taslağı atsanız olurmu'",
    input: { message: "Ben size şimdi fotoğraflari atsam bana taslağı atsanız olurmu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 15:10] 'Yapildi mi acaba gorsel iletebilirmisiniz'",
    input: { message: "Yapildi mi acaba gorsel iletebilirmisiniz", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "paylasabiliyoruz",
  },
  {
    name: "[15.04 21:56] 'Benim ürünü göremezmiyim acaba'",
    input: { message: "Benim ürünü göremezmiyim acaba", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "paylasabiliyoruz",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[16.04 00:14] 'Attığımız görselim baskıdan önceki Haline görebiliyor muyuz'",
    input: { message: "Attığımız görselim baskıdan önceki Haline görebiliyor muyuz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[16.04 00:07] 'Fotoğraf göndersem önce taslağını görebilir miyim'",
    input: { message: "Fotoğraf göndersem önce taslağını görebilir miyim nasıl olacak", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[16.04 11:55] 'Fotograf atsam nasil durduguna bakabilirmiyim'",
    input: { message: "Fotograf atsam nasil durduguna bakabilirmiyim", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[16.04 14:51] 'Merhaba sipariş görseli atıcaktınız ama'",
    input: { message: "Merhaba sipariş görseli atıcaktınız ama", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "paylasabiliyoruz",
    notIncludes: "merhaba efendim",
  },

  // ─── REGRESSION — gerçek durum sorusu operatöre gitmeli ───
  {
    name: "REGRESSION: 'Hazırlandı mı' — gerçek durum sorusu",
    input: { message: "Hazırlandı mı", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "ekibimize iletiyorum",
  },
  {
    name: "REGRESSION: 'Ne durumda kolyem' — durum sorusu",
    input: { message: "Ne durumda kolyem", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "ekibimize iletiyorum",
  },
  {
    name: "REGRESSION: 'Kargom nerede' — kargo takibi operatöre",
    input: { message: "Kargom nerede", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "ekibimize iletiyorum",
  },
];

const result = await runSuite("F4_preview", cases);
process.exit(result.fail > 0 ? 1 : 0);
