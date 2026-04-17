import { runSuite } from "./_harness.js";

const cases = [
  // ─── Kararma typo'ları ───
  {
    name: "[14.04 22:04] 'Karartma yapıyor mu'",
    input: { message: "Karartma yapıyor mu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "kararma",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[14.04 22:09] 'Karama yapıyorum'",
    input: { message: "Karama yapıyorum", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "kararma",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[14.04 22:16] 'Kararna oluyormu'",
    input: { message: "Kararna oluyormu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "kararma",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 00:02] 'Ürünler karalama yapar mı'",
    input: { message: "Ürünler karalama yapar mı", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    includes: "kararma",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 20:57] 'Kullandıkça kararla olurmu'",
    input: { message: "Kullandıkça kararla olurmu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "kararma",
    notIncludes: "ekibimize iletiyorum",
  },

  // ─── Material typo ───
  {
    name: "[14.04 21:46] 'Metaryeni nedir'",
    input: { message: "Metaryeni nedir", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["celik", "kaplama"],
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 23:12] 'Materyal nedir acaba'",
    input: { message: "Materyal nedir acaba", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "kaplama",
    notIncludes: "fotografinizi buradan",
  },

  // ─── Durability / silinir ───
  {
    name: "[14.04 21:42] 'Zamanla silinir mi resim aceba'",
    input: { message: "Zamanla silinir mi resim aceba", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["kalici", "silinmez"],
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 20:03] 'silinir efendim fotoğraf'",
    input: { message: "silinir efendim fotoğraf", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "599 tl",
  },

  // ─── Alerji ───
  {
    name: "[14.04 23:35] 'Alarjı yapar mı'",
    input: { message: "Alarjı yapar mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "alerji",
    notIncludes: "ekibimize iletiyorum",
  },

  // ─── Guarantee/return ───
  {
    name: "[15.04 22:10] 'İSTEDİĞİM GİBİ OLMAZSA YADA BEĞENMEZSEM NE OLUYOR'",
    input: { message: "İSTEDİĞİM GİBİ OLMAZSA YADA BEĞENMEZSEM NE OLUYOR ACABA", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "ekibimize iletiyorum kontrol edip",
  },
  {
    name: "[15.04 21:57] 'Öyle bir durumda iade kabul ediyor musunuz'",
    input: { message: "Öyle bir durumda iade kabul ediyor musunuz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum kontrol",
  },

  // ─── Trust phrase ───
  {
    name: "[15.04 20:40] 'Dolandırmıyosunuz değilmi'",
    input: { message: "Dolandırmıyosunuz değilmi", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },

  // ─── Privacy ───
  {
    name: "[15.04 21:03] 'Gönderdiğim fotoğraf ve reklam amaçlı kullanılacak mı'",
    input: { message: "Gönderdiğim fotoğraf ve reklam amaçlı kullanılacak mı peki", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },

  // ─── Material skepticism ───
  {
    name: "[14.04 20:26] 'Gerçek altın değil galiba'",
    input: { message: "Gerçek altın değil galiba", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "kaplama",
    notIncludes: "ekibimize iletiyorum",
  },

  // ─── REGRESSION — gerçek trust cevabı standart kalmalı ───
  {
    name: "REGRESSION: 'Çelik mi'",
    input: { message: "Çelik mi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["celik", "kaplama"],
  },
  {
    name: "REGRESSION: 'Paslanmaz mı'",
    input: { message: "Paslanmaz mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "paslanmaz",
  },
  {
    name: "REGRESSION: 'Kararma yapar mı' — normal kararma (typo değil)",
    input: { message: "Kararma yapar mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "kararma",
  },
];

const result = await runSuite("F6_trust_material", cases);
process.exit(result.fail > 0 ? 1 : 0);
