import { runSuite } from "./_harness.js";

const cases = [
  // ─── "Amin efendim" substring bug ───
  {
    name: "[14.04 19:52] 'Annem Kevokamın' — substring bug: Amin olmamalı",
    input: { message: "Annem Kevokamın", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed", back_text_status: "" },
    notIncludes: "amin efendim",
    includes: "arka yazi",
  },
  {
    name: "[14.04 19:52] Multi-line 'Annem / Kevokamın'",
    input: { message: "Annem\nKevokamın", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "amin efendim",
  },

  // ─── Tarih+isim+cümle content ───
  {
    name: "[14.04 21:01] '08.02.2026 İyi ki sen Alparslanım yazalım'",
    input: { message: "08.02.2026 İyi ki sen Alparslan'ım yazalım", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
    includes: "arka yazi",
  },
  {
    name: "[16.04 00:37] 'Kalbimin en güzel köşesi Canım Kızım MEYRAM 29.01.2024'",
    input: { message: "Kalbimin en güzel köşesi Canım Kızım MEYRAM❤️ 29.01.2024💫", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "ekibimize iletiyorum",
    includes: "arka yazi",
  },
  {
    name: "[15.04 21:02] 'Arkasınada 22.08.2022 hoşgeldin nefesim yazarmısınız'",
    input: { message: "Arkasınada 22.08.2022 hoşgeldin nefesim yazarmısınız", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[16.04 14:33] 'Eyupcan Lina yazarsanız sevinirim'",
    input: { message: "Eyupcan Lina yazarsanız sevinirim", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "ekibimize iletiyorum",
    includes: "arka yazi",
  },
  {
    name: "[14.04 22:47] 'Resmin arkasına Senı çok sevıyorum dıye yazılabılırmı'",
    input: { message: "Resmîn arkasına Senı çok sevıyorum dıye yazılabılırmı", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "ekibimize iletiyorum",
    includes: "arka",
  },
  {
    name: "[15.04 20:30] '09.01.2026' [order_completed]",
    input: { message: "09.01.2026", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "ekibimize iletiyorum",
    includes: "arka yazi",
  },
  {
    name: "[14.04 22:39] '29.05.2021' [waiting_address]",
    input: { message: "29.05.2021", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    notIncludes: ["siparis efendim", "ekibimize"],
  },
  {
    name: "[14.04 22:55] 'Arkasına 24.10.2025'",
    input: { message: "Arkasına 24.10.2025", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "ekibimize iletiyorum",
  },

  // ─── back_text_info soru ───
  {
    name: "[14.04 21:34] 'Arkasına dogdugu tarih isim felan da yazılıyor demi'",
    input: { message: "Arkasına dogdugu tarih isim felan da yazılıyor demi saat felan", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "fotografinizi buradan",
    includes: "arka",
  },
  {
    name: "[16.04 02:12] 'Peki isim veya tarihte arka kismina yaziliyormu'",
    input: { message: "Peki isim veya tarihte arka kismina yaziliyormu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[16.04 13:26] 'Buna tarih ekleniyor mı'",
    input: { message: "Buna tarih ekleniyor mı", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },

  // ─── Content verilen uzun cümleler ───
  {
    name: "[15.04 19:40] 'Arkasina yazi olarak EN ÇOK SEN yazsin'",
    input: { message: "Arkasina yazi olarak EN ÇOK SEN yazsin", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 22:32] 'Arkada Ömer ve 24.11.2025 yazsın'",
    input: { message: "Arkada Ömer ve 24.11.2025 yazsın", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 21:05] 'Nazar duası olsun'",
    input: { message: "Nazar duası olsun", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },

  // ─── REGRESSION — Gerçek Amin gerçek amin cevabı almalı ───
  {
    name: "REGRESSION: 'Allah razı olsun amin'",
    input: { message: "Allah razı olsun amin", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "amin",
  },
  {
    name: "REGRESSION: sadece 'amin'",
    input: { message: "amin", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "amin",
  },

  // ─── REGRESSION — İsim-listesi gerçekten name ise back_text content olarak alınmalı ama
  // soru cümlesi ("yazabiliyor musunuz") olursa question intent'e gitmeli
  {
    name: "REGRESSION: 'Arkasına ne yazabiliriz' — question, content değil",
    input: { message: "Arkasına ne yazabiliriz", conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" },
    includes: ["arka"],
  },
];

const result = await runSuite("F3_back_text", cases);
process.exit(result.fail > 0 ? 1 : 0);
