import { runSuite } from "./_harness.js";

const cases = [
  // ─── P0 sipariş öldüren log kayıtları ───
  {
    name: "[14.04 22:28] 'Resim olsun istiyorum' [waiting_letters,atac]",
    input: { message: "Resim olsun ıstıyorum", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    notIncludes: "bu modelde fotograf kullanilmiyor",
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    name: "[14.04 22:28] 'Peki Hangı modelde resım oluyor' [waiting_letters,atac]",
    input: { message: "Peki Hangı modelde resım oluyor", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    notIncludes: "bu modelde fotograf kullanilmiyor",
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    name: "[14.04 22:28] 'Ama görsel de neden resım var' [waiting_letters,atac]",
    input: { message: "Ama görsel de neden resım var", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    notIncludes: "bu modelde fotograf kullanilmiyor",
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    name: "[14.04 22:04] 'Kolyenin iki tarafına foto yapilabilirmi' [waiting_letters→atac mismatched]",
    input: { message: "Kolyenin iki tarafına foto yapilabilirmi", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    notIncludes: ["yapilmasini istediginiz harfleri", "bu modelde fotograf kullanilmiyor"],
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    name: "[15.04 16:22] 'Yanyana yapacaksınız' [order_completed,atac]",
    input: { message: "Yanyana yapacaksınız", conversation_stage: "order_completed", ilgilenilen_urun: "atac", siparis_alindi: "1", order_status: "completed" },
    notIncludes: "bu modelde fotograf kullanilmiyor",
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    name: "[15.04 18:03] 'Resim atacaktiniz' [waiting_address,atac]",
    input: { message: "Resim atacaktiniz", conversation_stage: "waiting_address", ilgilenilen_urun: "atac" },
    notIncludes: "bu modelde fotograf kullanilmiyor",
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    name: "[14.04 22:46] 'Ben kolye olarak istiyorum resimli' [waiting_photo,atac]",
    input: { message: "Ben kolye olarak ıstıyorum resımlı", conversation_stage: "waiting_photo", ilgilenilen_urun: "atac" },
    expect: { ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[14.04 22:29] 'Resimli LAZER kolye olucak efendim' [waiting_photo,atac]",
    input: { message: "Resimli LAZER kolye olucak efendim", conversation_stage: "waiting_photo", ilgilenilen_urun: "atac" },
    expect: { ilgilenilen_urun: "lazer" },
    notIncludes: "ekibimize iletiyorum",
  },
  {
    name: "[15.04 22:51] 'Peki resim yaptirsak yanına bir harf koysak olurmu'",
    input: { message: "Peki resim yaptirsak yanına bir harf koysak olurmu", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    expect: { ilgilenilen_urun: "lazer" },
    notIncludes: "bu modelde fotograf kullanilmiyor",
  },
  {
    name: "[14.04 23:01] 'Peki üç çocuk resmi olur mu' [waiting_letters,atac]",
    input: { message: "Peki üç çocuk resmi olur mu", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    expect: { ilgilenilen_urun: "lazer" },
    notIncludes: "bu modelde fotograf kullanilmiyor",
  },
  {
    name: "[15.04 16:17] 'Son resimde ayıcık olmasa olur' [waiting_address,atac]",
    input: { message: "Son resimde ayıcık olmasa olur", conversation_stage: "waiting_address", ilgilenilen_urun: "atac" },
    notIncludes: "bu modelde fotograf kullanilmiyor",
    expect: { ilgilenilen_urun: "lazer" },
  },

  // ─── REGRESSION — ataç kalmalı, switch yapmamalı ───
  {
    name: "REGRESSION: 'Harfler alerji yapar mı' [waiting_letters,atac] — kalmalı",
    input: { message: "Harfler alerji yapar mı", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    expect: { ilgilenilen_urun: "atac" },
  },
  {
    name: "REGRESSION: 'A B C yazalım' [waiting_letters,atac] — kalmalı",
    input: { message: "A B C yazalım", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    expect: { ilgilenilen_urun: "atac" },
  },
  {
    name: "REGRESSION: 'Ataç kolye fiyatı ne' [waiting_product] — atac seçimi",
    input: { message: "Ataç kolye fiyatı ne", conversation_stage: "waiting_product", ilgilenilen_urun: "" },
    expect: { ilgilenilen_urun: "atac" },
    includes: "499",
  },
];

const result = await runSuite("F5_product_switch", cases);
process.exit(result.fail > 0 ? 1 : 0);
