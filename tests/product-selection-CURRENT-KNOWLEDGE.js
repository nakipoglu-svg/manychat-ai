import { runSuite } from "./_harness.js";

const bileklikState = {
  ilgilenilen_urun: "resimli_lazer_bileklik",
  user_product: "resimli_lazer_bileklik",
  context_lock: "1",
  conversation_stage: "waiting_photo",
  order_status: "started",
};

const cases = [
  {
    name: "Bileklik tek başına resimli bileklik seçer",
    input: { message: "bileklik" },
    includes: ["Resimli Bileklik"],
    expect: { ilgilenilen_urun: "resimli_lazer_bileklik", conversation_stage: "waiting_photo" },
  },
  {
    name: "Kadın bileklik normal resimli bileklik seçer",
    input: { message: "kadın bileklik" },
    includes: ["Resimli Bileklik"],
    expect: { ilgilenilen_urun: "resimli_lazer_bileklik", conversation_stage: "waiting_photo" },
  },
  {
    name: "Erkek bileklik otomatik siparişe alınmaz siteye yönlenir",
    input: { message: "erkek bileklik" },
    includes: ["Erkek bileklik", "web sitemizden", "www.yudumjewels.com"],
    notIncludes: ["bulunmamaktadır", "Fotoğraf ön yüze", "fotoğrafınızı buradan"],
    expect: { ilgilenilen_urun: "other_product", conversation_stage: "" },
  },
  {
    name: "Bileklikten sonra erkek bileklik düzeltmesi akışı temizler",
    input: { ...bileklikState, message: "erkek bileklik istiyorum ben" },
    includes: ["Erkek bileklik", "web sitemizden", "www.yudumjewels.com"],
    notIncludes: ["bulunmamaktadır", "Fotoğraf ön yüze", "fotoğrafınızı buradan"],
    expect: {
      ilgilenilen_urun: "other_product",
      conversation_stage: "",
      order_status: "",
      photo_received: "",
    },
  },
  {
    name: "Yoca yazımı İsimli Yonca seçer",
    input: { message: "yoca kolye" },
    includes: ["İsimli Yonca Kolye", "yaprak"],
    expect: { ilgilenilen_urun: "yonca", conversation_stage: "waiting_letters" },
  },
  {
    name: "Yonja yazımı İsimli Yonca seçer",
    input: { message: "yonja kolye" },
    includes: ["İsimli Yonca Kolye", "yaprak"],
    expect: { ilgilenilen_urun: "yonca", conversation_stage: "waiting_letters" },
  },
  {
    name: "Yonc yazımı İsimli Yonca seçer",
    input: { message: "yonc kolye" },
    includes: ["İsimli Yonca Kolye", "yaprak"],
    expect: { ilgilenilen_urun: "yonca", conversation_stage: "waiting_letters" },
  },
  {
    name: "Yonsa yazımı İsimli Yonca seçer",
    input: { message: "yonsa kolye istiyorum" },
    includes: ["İsimli Yonca Kolye", "yaprak"],
    expect: { ilgilenilen_urun: "yonca", conversation_stage: "waiting_letters" },
  },
  {
    name: "Yonca tek seçim cevabı ürün seçer",
    input: { message: "yonca" },
    includes: ["İsimli Yonca Kolye", "yaprak"],
    expect: { ilgilenilen_urun: "yonca", conversation_stage: "waiting_letters" },
  },
  {
    name: "İsimli kolye İsimli Yonca ürününe gider",
    input: { message: "isimli kolye istiyorum" },
    includes: ["İsimli Yonca Kolye", "yaprak"],
    expect: { ilgilenilen_urun: "yonca", conversation_stage: "waiting_letters" },
  },
  {
    name: "Fotoğraflı kolye Resimli Lazer seçer",
    input: { message: "fotograflı kolye" },
    includes: ["Resimli Lazer Kolye", "yudumjewels.com"],
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    name: "Fotoğrafli yazımı Resimli Lazer seçer",
    input: { message: "fotoğrafli kolyenin fiyatı nedir" },
    includes: ["Resimli Lazer Kolye", "649"],
    expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
  },
  {
    name: "Resimlii kolyee yazımı Resimli Lazer seçer",
    input: { message: "resimlii kolyee fiyatt" },
    includes: ["Resimli Lazer Kolye", "649"],
    expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
  },
  {
    name: "Resimlimkolye birleşik yazımı Resimli Lazer seçer",
    input: { message: "Nedir resimlimkolye fiyati" },
    includes: ["Resimli Lazer Kolye", "649"],
    expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
  },
  {
    name: "Kolue yazımı Resimli Lazer seçer",
    input: { message: "Resimli kolue fiyatını öğrenebilir miyim" },
    includes: ["Resimli Lazer Kolye", "649"],
    expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
  },
  {
    name: "Razer yazımı Resimli Lazer seçer",
    input: { message: "Resimli razer kolye" },
    includes: ["Resimli Lazer Kolye"],
    expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
  },
  {
    name: "Raxel yazımı Resimli Lazer seçer",
    input: { message: "Resimli raxel kolye fiyat nedir" },
    includes: ["Resimli Lazer Kolye", "649"],
    expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
  },
  {
    name: "Resimli olan Resimli Lazer seçer",
    input: { message: "Ben resimli olanı istiyorum" },
    includes: ["Resimli Lazer Kolye"],
    expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
  },
  {
    name: "Harfli kolye Ataç seçer",
    input: { message: "harfli kolye" },
    includes: ["Harfli Ataç Kolye", "yudumjewels.com"],
    expect: { ilgilenilen_urun: "atac" },
  },
  {
    name: "Ataş kolye yazımı Ataç seçer",
    input: { message: "ataş kolye ne kadar" },
    includes: ["Harfli Ataç Kolye", "549"],
    expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" },
  },
  {
    name: "Anahtarlık olarak yapılır mı Anahtarlık seçer",
    input: { message: "Merhaba anahtarlık olarak yapılır mı" },
    includes: ["Anahtarlık"],
    expect: { ilgilenilen_urun: "anahtarlik", conversation_stage: "waiting_photo" },
  },
  {
    name: "Kolye tek başına ürün seçmez",
    input: { message: "Kolye" },
    includes: ["Hangi ürün"],
    expect: { ilgilenilen_urun: "" },
  },
];

const result = await runSuite("CURRENT_KNOWLEDGE_PRODUCT_SELECTION", cases);
process.exit(result.fail > 0 ? 1 : 0);
