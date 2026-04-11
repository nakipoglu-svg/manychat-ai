import { processChat } from "../core/engine.js";

console.log("🔥 SMOKE TEST BAŞLADI");

async function smoke() {
  let pass = 0, fail = 0;

  async function test(name, input, checks) {
    const res = await processChat(input);
    let ok = true;
    const errors = [];
    
    if (checks.expect) {
      for (const [k, v] of Object.entries(checks.expect)) {
        if (res[k] !== v) { ok = false; errors.push(`${k}: exp="${v}" got="${res[k]}"`); }
      }
    }
    if (checks.includes) {
      const reply = (res.ai_reply || "").toLowerCase()
        .replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u")
        .replace(/[^\w\s]/g," ").replace(/\s+/g," ").trim();
      const target = checks.includes.toLowerCase()
        .replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u")
        .replace(/[^\w\s]/g," ").replace(/\s+/g," ").trim();
      if (!reply.includes(target)) { ok = false; errors.push(`missing: "${checks.includes}" in "${(res.ai_reply||"").slice(0,80)}"`); }
    }
    if (checks.notIncludes) {
      const reply = (res.ai_reply || "").toLowerCase()
        .replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u")
        .replace(/[^\w\s]/g," ").replace(/\s+/g," ").trim();
      const target = checks.notIncludes.toLowerCase()
        .replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u")
        .replace(/[^\w\s]/g," ").replace(/\s+/g," ").trim();
      if (reply.includes(target)) { ok = false; errors.push(`has forbidden: "${checks.notIncludes}"`); }
    }

    if (ok) { pass++; console.log(`✅ ${name}`); }
    else { fail++; console.log(`❌ ${name}`); errors.forEach(e => console.log(`   ${e}`)); }
  }

  const b = (msg, state = {}) => ({ message: msg, ...state });
  const lazer = (o={}) => ({ ilgilenilen_urun:"lazer", user_product:"lazer", context_lock:"1", order_status:"started", ...o });
  const atac = (o={}) => ({ ilgilenilen_urun:"atac", user_product:"atac", context_lock:"1", order_status:"started", ...o });
  const lazerWP = (o={}) => lazer({ photo_received:"1", back_text_status:"skipped", conversation_stage:"waiting_payment", ...o });
  const lazerWA = (o={}) => lazer({ photo_received:"1", back_text_status:"skipped", payment_method:"eft_havale", conversation_stage:"waiting_address", ...o });
  const lazerDone = (o={}) => lazer({ photo_received:"1", back_text_status:"skipped", payment_method:"eft_havale", address_status:"received", phone_received:"1", conversation_stage:"order_completed", order_status:"completed", siparis_alindi:"1", ...o });

  // Core flow
  await test("T01 Lazer seçimi", b("resimli lazer kolye"), { expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" } });
  await test("T02 Lazer fiyat 599", b("lazer istiyorum"), { includes: "599" });
  await test("T03 Foto URL → photo=1", b("https://lookaside.fbsbx.com/photo.jpg", lazer({ conversation_stage: "waiting_photo" })), { expect: { photo_received: "1", conversation_stage: "waiting_payment" } });
  await test("T04 Yok → skipped", b("yok", lazer({ photo_received:"1", conversation_stage:"waiting_payment" })), { expect: { back_text_status: "skipped", conversation_stage: "waiting_payment" } });
  await test("T06 EFT → waiting_address", b("eft", lazerWP()), { expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" } });
  await test("T08 Full adres → completed", b("Ali Yılmaz 05551234567 İstanbul Kadıköy Moda Mah No:5", lazerWA()), { expect: { address_status: "received", conversation_stage: "order_completed" } });
  await test("T10 Ataç seçimi", b("ataç kolye"), { expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" } });
  await test("T11 Harfler → payment", b("ABC", atac({ conversation_stage: "waiting_letters" })), { expect: { letters_received: "1", conversation_stage: "waiting_payment" } });
  
  // Side questions
  await test("T15 Konum", b("neredesiniz"), { includes: "eminonu" });
  await test("T16 Kargo", b("kargo ne zaman gelir"), { includes: "is gunu" });
  await test("T17 Güven", b("güvenilir misiniz"), { includes: "guven" });
  await test("T18 Merhaba", b("merhaba"), { includes: "merhaba" });
  await test("T20 Kargo ücreti", b("kargo ücreti var mı"), { includes: "dahil" });
  
  // İptal
  await test("T19 İptal", b("iptal etmek istiyorum", lazerWP()), { expect: { order_status: "cancel_requested", conversation_stage: "human_support" } });
  
  // Çelik mi
  await test("RW14 Çelik mi", b("çelik mi", lazer({ conversation_stage: "waiting_photo" })), { includes: "paslanmaz" });
  
  // Completed guard
  await test("OC01 Completed + fiyat", b("fiyatını öğrenebilir miyim", lazerDone()), { includes: "599" });
  await test("OC07 Completed + teşekkür", b("teşekkür ederim", lazerDone()), { notIncludes: "siparis" });
  await test("OC10 Completed + kolyem hazır mı", b("kolyem hazır mı", lazerDone()), { includes: "ekibimiz" });
  
  // Short confirm
  await test("SK04 tm w_photo", b("tm", lazer({ conversation_stage: "waiting_photo" })), { expect: { ilgilenilen_urun: "lazer" } });
  
  // Stage koruması
  await test("R01 merhaba w_photo menü açmamalı", b("merhaba", lazer({ conversation_stage: "waiting_photo" })), { notIncludes: "hangi model ile ilgileniyorsunuz" });
  
  // Product switch
  await test("MS41 lazer→atac", b("ataç kolye istiyorum", lazer({ conversation_stage: "waiting_photo" })), { expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters", photo_received: "" } });
  
  // Kararma
  await test("TR01 Kararma", b("kararma yapar mı"), { includes: "kararma" });

  console.log(`\n🎯 SONUÇ: ${pass}/${pass+fail} geçti`);
  if (fail > 0) console.log(`❌ ${fail} test başarısız`);
}

smoke().catch(e => { console.error("Fatal:", e); process.exit(1); });
