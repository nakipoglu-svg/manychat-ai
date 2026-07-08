import { processChat } from "../core/engine.js";

console.log("🔥 CURRENT SMOKE TEST BAŞLADI");

const norm = (s) => String(s || "")
  .toLowerCase()
  .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
  .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
  .replace(/[^\w\s]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

async function test(name, input, checks = {}) {
  const res = await processChat(input);
  const reply = res.ai_reply || "";
  const replyN = norm(reply);
  const errors = [];

  for (const [key, value] of Object.entries(checks.expect || {})) {
    if (res[key] !== value) errors.push(`${key}: exp="${value}" got="${res[key]}"`);
  }

  for (const wanted of [].concat(checks.includes || [])) {
    if (wanted && !replyN.includes(norm(wanted))) errors.push(`missing: "${wanted}"`);
  }

  for (const forbidden of [].concat(checks.notIncludes || [])) {
    if (forbidden && replyN.includes(norm(forbidden))) errors.push(`forbidden: "${forbidden}"`);
  }

  if (errors.length) {
    console.log(`❌ ${name}`);
    errors.forEach((e) => console.log(`   ${e}`));
    console.log(`   reply: "${reply.slice(0, 140)}"`);
    return false;
  }

  console.log(`✅ ${name}`);
  return true;
}

const lazer = (message, extra = {}) => ({
  message,
  ilgilenilen_urun: "lazer",
  user_product: "lazer",
  context_lock: "1",
  conversation_stage: "waiting_photo",
  order_status: "started",
  ...extra,
});

const done = (message) => lazer(message, {
  conversation_stage: "order_completed",
  order_status: "completed",
  siparis_alindi: "1",
});

let pass = 0;
let fail = 0;

async function run(name, input, checks) {
  if (await test(name, input, checks)) pass++;
  else fail++;
}

await run("Lazer seçim akışı", { message: "resimli lazer kolye" }, {
  expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
  includes: "649",
});

await run("Ataç seçim akışı", { message: "harfli ataç kolye" }, {
  expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" },
  includes: "549",
});

await run("Şeffaf kargo yok", { message: "Şeffaf kargo var mı?" }, {
  includes: ["şeffaf kargo", "bulunmamaktadır"],
  notIncludes: "Aras",
});

await run("Ön izleme yok", lazer("Ön izleme atar mısınız?"), {
  includes: ["onay bekleyebileceğimiz", "yürütemiyoruz"],
  notIncludes: "hazırlayalım",
});

await run("Bitmiş ürün fotoğrafı yok", done("Bitince foto atar mısınız?"), {
  includes: ["onay bekleyebileceğimiz", "yürütemiyoruz"],
  notIncludes: "paylaşabiliyoruz",
});

await run("Beykoz atölye bilgisi", { message: "Yeriniz nerede?" }, {
  includes: ["Beykoz", "atölye"],
  notIncludes: "Eminönü",
});

await run("316L materyal bilgisi", { message: "Altın mı gümüş mü?" }, {
  includes: ["316L", "renk seçeneği"],
  notIncludes: "14 ayar",
});

await run("Tek uç gönderilmez", lazer("Sadece kolye ucu olur mu?"), {
  includes: ["zinciriyle birlikte", "gönderim yapmıyoruz"],
});

await run("İki plaka olmaz", lazer("İki plaka aynı zincirde olur mu?"), {
  includes: ["iki ayrı plaka", "yapmıyoruz"],
  notIncludes: "takılabiliyor",
});

await run("WhatsApp sorulursa verilir", { message: "WhatsApp var mı?" }, {
  includes: "0505 471 35 45",
});

await run("WhatsApp sorulmazsa sızmaz", { message: "merhaba" }, {
  notIncludes: "0505 471 35 45",
});

console.log(`\n🎯 SONUÇ: ${pass}/${pass + fail} geçti`);
process.exit(fail > 0 ? 1 : 0);
