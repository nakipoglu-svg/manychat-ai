import { runSuite } from "./_harness.js";

const cases = [
  // ─── Full bundle merge — re-ask olmamalı ───
  {
    name: "[14.04 21:02] 'Özge şenyüz + phone + adres' — tek mesajda bundle",
    input: {
      message: "Özge şenyüz\n05461234567\nAkbilek mahallesi 5. sokak No:12 Merkez Amasya",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    notIncludes: ["acik adres bilginiz ile devam", "ad soyad cep telefonu"],
    includes: ["bilgilerinizi", "aldim"],
  },
  {
    name: "[16.04 00:50] 'Tülay ulukoz + adres + phone' — küçük harfli isim",
    input: {
      message: "Tülay ulukoz\nArapçeşme mahallesi 123 sokak no 5 daire 7 Gebze Kocaeli\n05427654321",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    notIncludes: "acik adres bilginiz ile devam",
    includes: ["bilgilerinizi", "aldim"],
  },
  {
    name: "[15.04 23:04] 'Merve demir Sarıyer/İstanbul PTT evleri [PHONE]'",
    input: {
      message: "Merve demir Sarıyer/ İstanbul PTT evleri mahallesi 45. sokak no 3 daire 8 05301112233",
      conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed"
    },
    notIncludes: "ekibimize iletiyorum en kisa surede",
  },
  {
    name: "[16.04 14:31] '2.sakarya mahallesi 4033sokak kapı no 7daire 4 Balıkesir/karesi'",
    input: {
      message: "2.sakarya mahallesi 4033sokak kapı no 7daire 4 Balıkesir/karesi",
      conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed",
      phone_received: "1", address_status: ""
    },
    notIncludes: "ekibimize iletiyorum",
  },

  // ─── Address phantom — alınan bilgi yok, "bilgilerinizi aldım" denemez ───
  {
    name: "[14.04 22:24] Ben esnaf olduğum için... — sohbet tonu, bilgi yok",
    input: {
      message: "Ben esnaf olduğum için daha önce de yaptırmıştım babamın resmini illa ki kolyeyi hediye ettim ablama bu nedenle",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    notIncludes: "bilgilerinizi aldim",
  },
  {
    name: "[14.04 22:24] 'Müşterilerim görünce soruyorlar size yönlendirmem için' — adres iste",
    input: {
      message: "Müşterilerim görünce soruyorlar size yönlendirmem için güzel olması gerekiyor",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    notIncludes: ["cep telefonu numaranizi iletebilir misiniz"],
  },

  // ─── Name-only — muhtemel isim, açık adres iste ───
  {
    name: "[14.04 22:26] 'Nurdil kalyoncu' — sadece isim",
    input: {
      message: "Nurdil kalyoncu",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    includes: ["acik adres", "devam edelim"],
  },
  {
    name: "[15.04 21:02] 'İlknur düzgün' — sadece isim",
    input: {
      message: "İlknur düzgün",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    includes: ["acik adres"],
  },

  // ─── Phone in completed — 'telefonunuzu aldım' demeli, operatör değil ───
  {
    name: "[14.04 22:27] Phone only in completed — operatöre gitmesin",
    input: {
      message: "05461112233",
      conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed"
    },
    notIncludes: "ekibimize iletiyorum en kisa surede donus",
  },

  // ─── Address update (completed'dan sonra düzeltme) ───
  {
    name: "[16.04 12:12] 'Merhaba ben adres [ADDRESS]' — adres güncelleme",
    input: {
      message: "Merhaba ben adres Yeni mahalle 5 sokak no 12 daire 3 Kadıköy İstanbul",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    notIncludes: ["size nasil yardimci olabilirim", "hangi model"],
  },
  {
    name: "[16.04 12:12] '69 değil 67 olacaktı' — adres düzeltmesi",
    input: {
      message: "69 değil 67 olacaktı",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer", address_status: "received"
    },
    notIncludes: ["lazer zincir 60cm", "599 tl"],
  },

  // ─── REGRESSION — gerçek adres iste akışı korunmalı ───
  {
    name: "REGRESSION: 'Tamam' [waiting_address] — adres iste",
    input: {
      message: "Tamam",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "REGRESSION: Full address only (no name) — aldım",
    input: {
      message: "Yeni mahalle Gül sokak no 10 daire 5 Beşiktaş İstanbul",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "REGRESSION: Phone only — 'telefonunuzu aldım'",
    input: {
      message: "05421234567",
      conversation_stage: "waiting_address", ilgilenilen_urun: "lazer"
    },
    includes: "telefon",
  },
];

const result = await runSuite("F7_bundle", cases);
process.exit(result.fail > 0 ? 1 : 0);
