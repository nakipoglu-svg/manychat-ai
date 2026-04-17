import { runSuite } from "./_harness.js";

const cases = [
  // ─── 2/3 resim / kişi — multi_order'a gitmesin ───
  {
    name: "[14.04 21:16] '2 resim yapabilir misiniz'",
    input: { message: "2 resim yapabilir misiniz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "birden fazla",
    notIncludes: "coklu alimda",
  },
  {
    name: "[14.04 21:17] 'Yanyana olmaz mı'",
    input: { message: "Yanyana olmaz mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "yan yana",
  },
  {
    name: "[14.04 22:08] 'Üç tane çocuğumun birlikte olan fotoğrafını' — 3 kolye sanmasın",
    input: { message: "Üç tane çocuğumun birlikte olan fotoğrafını yapabilir misiniz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: ["coklu alimda", "1400 tl"],
  },
  {
    name: "[14.04 22:22] 'Bir kolyenin üstüne 3 resim çizebilir misiniz'",
    input: { message: "Bir kolyenin ustune 3 resim cizebilir misiniz", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    notIncludes: ["arka yuze de fotograf yapabiliyoruz fiyat farki", "coklu alimda"],
    includes: "birden fazla",
  },
  {
    name: "[14.04 20:27] 'İki oğlumun resmi ve isimleri ne kadar olur fiyat değişir mi'",
    input: { message: "İki oğlumun resmi ve isimleri ne kadar olur fiyat değişir mi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "fiyat",
    notIncludes: "sadece arka yuze",
  },
  {
    name: "[14.04 21:42] 'Bir yüzüne bir çocuğum diğer yüzüne diğer çocuğumu'",
    input: { message: "Bir yüzüne bir çocuğum diğer yüzüne diğer çocuğumu bastırabilir miyim", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "on ve arka",
  },
  {
    name: "[15.04 23:33] 'İki yüzünede fotoğraf basılması mümkünmü'",
    input: { message: "İki yüzünede fotoğraf basılması mümkünmü", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "on ve arka",
  },
  {
    name: "[15.04 21:44] 'İki ayrı fot olurmu'",
    input: { message: "İki ayrı fot olurmu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "birden fazla",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[14.04 20:48] 'Bir kolyeye 3 çocuğumun resminin yapılmadını istiyorum'",
    input: { message: "Bir kolyeye 3 çocuğumun resminin yapılmasını istiyorum", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: ["ekibimize iletiyorum", "coklu alimda"],
    includes: "birden fazla",
  },
  {
    name: "[16.04 13:43] 'İki kızımın da fotoğrafının olduğu güzel bir model'",
    input: { message: "İki kızımın da fotoğrafının olduğu güzel bir model", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "birden fazla",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[14.04 22:36] 'Ayrı ayrı göndersem'",
    input: { message: "Ayrı ayrı göndersem", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "birden fazla",
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 23:49] '2 tarafta olsa'",
    input: { message: "2 tarafta olsa", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "on ve arka",
  },
  {
    name: "[14.04 20:59] '5 kişi bır kolyeye sıgarmi' — composition + fit",
    input: { message: "5 kişi bır kolyeye sıgarmi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: ["kac kisi"],
    notIncludes: "yazi icin",
  },
  {
    name: "[14.04 22:50] 'Iki cocugumun 1 olur mu ikisi bir' — bargain sanmasın",
    input: { message: "Iki cocugumun 1 olur mu ikisi bir", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: "fiyatlarimiz sabit",
  },
  {
    name: "[14.04 22:57] 'Biz size 2 kişi aynı ve 1 kişi ayrı... bunları birleştirirmisiniz'",
    input: { message: "Biz size 2 kişi aynı ve 1 kişi ayrı ve 1 kişi daha ayrı bunları birleştirirmisiniz", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "birden fazla",
  },
  {
    name: "[16.04 00:26] 'arkasına yazı değil de başka bir resim koyamazmisniz'",
    input: { message: "Pardon arkasınada yazı değil de başka bir resim koyamazmisniz", conversation_stage: "order_completed", ilgilenilen_urun: "lazer", siparis_alindi: "1", order_status: "completed" },
    includes: "birden fazla",
    notIncludes: "ekibimize iletiyorum",
  },

  // ─── REGRESSION — gerçek multi_order kalmalı ───
  {
    name: "REGRESSION: '3 kolye istiyorum' — gerçek multi_order",
    input: { message: "3 kolye istiyorum", conversation_stage: "waiting_product", ilgilenilen_urun: "" },
    includes: "1400",
  },
  {
    name: "REGRESSION: '2 tane alacağım' — gerçek multi_order",
    input: { message: "2 tane alacağım", conversation_stage: "waiting_product", ilgilenilen_urun: "" },
    includes: "1000",
  },
  {
    name: "REGRESSION: 'arkalı önlü olur mu' — arkalı önlü cevabı",
    input: { message: "Arkalı önlü olur mu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "on yuze",
  },
];

const result = await runSuite("F5_composition", cases);
process.exit(result.fail > 0 ? 1 : 0);
