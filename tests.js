// tests.js — Birleşik master test dosyası v2 (400+ test)
// Kullanım: node tests.js

import { processChat } from "./api/chat.js";

console.log("🔥 TEST BAŞLADI (400+ test)");

// ─── HELPER FACTORY ────────────────────────────────────────────────────────
function body(message, state = {}) {
  return {
    message,
    ilgilenilen_urun: state.ilgilenilen_urun || "",
    user_product: state.user_product || state.ilgilenilen_urun || "",
    conversation_stage: state.conversation_stage || "",
    payment_method: state.payment_method || "",
    address_status: state.address_status || "",
    phone_received: state.phone_received || "",
    order_status: state.order_status || "",
    photo_received: state.photo_received || "",
    back_text_status: state.back_text_status || "",
    menu_gosterildi: state.menu_gosterildi || "",
    context_lock: state.context_lock || "",
    letters_received: state.letters_received || "",
    support_mode: state.support_mode || "",
    siparis_alindi: state.siparis_alindi || "",
    cancel_reason: state.cancel_reason || "",
  };
}

// ─── STATE SHORTCUTS ───────────────────────────────────────────────────────
function lazer(o = {}) {
  return { ilgilenilen_urun: "lazer", user_product: "lazer", context_lock: "1", order_status: "started", ...o };
}
function atac(o = {}) {
  return { ilgilenilen_urun: "atac", user_product: "atac", context_lock: "1", order_status: "started", ...o };
}
function lazerWaitingPayment(o = {}) {
  return lazer({ photo_received: "1", back_text_status: "skipped", conversation_stage: "waiting_payment", ...o });
}
function lazerWaitingAddress(o = {}) {
  return lazer({ photo_received: "1", back_text_status: "skipped", payment_method: "eft_havale", conversation_stage: "waiting_address", ...o });
}
function atacWaitingPayment(o = {}) {
  return atac({ letters_received: "1", conversation_stage: "waiting_payment", ...o });
}
function atacWaitingAddress(o = {}) {
  return atac({ letters_received: "1", payment_method: "eft_havale", conversation_stage: "waiting_address", ...o });
}
function lazerCompleted(o = {}) {
  return lazer({ photo_received: "1", back_text_status: "skipped", payment_method: "eft_havale", address_status: "received", phone_received: "1", conversation_stage: "order_completed", order_status: "completed", siparis_alindi: "1", ...o });
}
function atacCompleted(o = {}) {
  return atac({ letters_received: "1", payment_method: "eft_havale", address_status: "received", phone_received: "1", conversation_stage: "order_completed", order_status: "completed", siparis_alindi: "1", ...o });
}

// ─── TEXT NORMALIZER FOR ASSERTIONS ───────────────────────────────────────
function normalizeForTest(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/i̇/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── TEST LİSTESİ ──────────────────────────────────────────────────────────
const tests = [

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 1: CORE FLOW TESTS (T01–T20 — mevcut)
  // ════════════════════════════════════════════════════════════════════════
  { id: "T01", name: "[CORE] Lazer ürün seçimi → waiting_photo", input: body("resimli lazer kolye"), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" } },
  { id: "T02", name: "[CORE] Lazer seçimi fiyat yanıtı vermeli (599)", input: body("lazer istiyorum"), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" }, expectReplyIncludes: "599" },
  { id: "T03", name: "[CORE] Lazer: Facebook CDN foto URL → photo_received=1", input: body("https://lookaside.fbsbx.com/photo123.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "1", conversation_stage: "waiting_back_text" } },
  { id: "T04", name: "[CORE] Lazer: 'yok' → back_text_status=skipped", input: body("yok", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped", conversation_stage: "waiting_payment" } },
  { id: "T05", name: "[CORE] Lazer: 'istemiyorum' → back_text_status=skipped", input: body("istemiyorum", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped", conversation_stage: "waiting_payment" } },
  { id: "T06", name: "[CORE] Lazer: EFT seçimi → waiting_address", input: body("eft", lazerWaitingPayment()), expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" } },
  { id: "T07", name: "[CORE] Lazer: kapıda ödeme → waiting_address", input: body("kapıda ödeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" } },
  { id: "T08", name: "[CORE] Lazer: tek mesajda full adres → order_completed", input: body("Ali Yılmaz 05551234567 İstanbul Kadıköy Moda Mah No:5", lazerWaitingAddress()), expect: { address_status: "received", phone_received: "1", conversation_stage: "order_completed", order_status: "completed" } },
  { id: "T09", name: "[CORE] order_completed sonrası adres korunmalı", input: body("tamam", lazerCompleted()), expect: { address_status: "received", conversation_stage: "order_completed" } },
  { id: "T10", name: "[CORE] Ataç ürün seçimi → waiting_letters", input: body("ataç kolye"), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" } },
  { id: "T11", name: "[CORE] Ataç: harfler → waiting_payment", input: body("ABC", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "1", conversation_stage: "waiting_payment" } },
  { id: "T12", name: "[CORE] Ataç: EFT → waiting_address", input: body("eft", atacWaitingPayment()), expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" } },
  { id: "T13", name: "[CORE] Ataç: kapıda → waiting_address", input: body("kapıda ödeme", atacWaitingPayment()), expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" } },
  { id: "T14", name: "[CORE] Ataç: full adres → order_completed", input: body("Ayşe Kaya 05321234567 Ankara Çankaya Kızılay Cad No:10", atacWaitingAddress()), expect: { address_status: "received", phone_received: "1", conversation_stage: "order_completed", order_status: "completed" } },
  { id: "T15", name: "[CORE] Konum sorusu → Eminönü", input: body("neredesiniz"), expectReplyIncludes: "eminonu" },
  { id: "T16", name: "[CORE] Kargo süresi → iş günü", input: body("kargo ne zaman gelir"), expectReplyIncludes: "is gunu" },
  { id: "T17", name: "[CORE] Güven sorusu", input: body("güvenilir misiniz"), expectReplyIncludes: "guven" },
  { id: "T18", name: "[CORE] Merhaba → karşılama", input: body("merhaba"), expectReplyIncludes: "merhaba" },
  { id: "T19", name: "[CORE] İptal → cancel_requested", input: body("iptal etmek istiyorum", lazerWaitingPayment()), expect: { order_status: "cancel_requested", conversation_stage: "human_support" } },
  { id: "T20", name: "[CORE] Kargo ücreti → dahil", input: body("kargo ücreti var mı"), expectReplyIncludes: "dahil" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 2: REGRESSION TESTS (R01–R45 — mevcut)
  // ════════════════════════════════════════════════════════════════════════
  { id: "R01", name: "[REG-A1] merhaba menüye dönmemeli", input: body("merhaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz" },
  { id: "R02", name: "[REG-A1] ürün korunmalı", input: body("tamam", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "R03", name: "[REG-A2] menu_gosterildi varken menü engel", input: body("devam", lazer({ menu_gosterildi: "evet", conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz" },
  { id: "R04", name: "[REG-A3] Evet waiting_photo ürün korunmalı", input: body("evet", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "R05", name: "[REG-A3] Tamam waiting_letters ürün korunmalı", input: body("tamam", atac({ conversation_stage: "waiting_letters" })), expect: { ilgilenilen_urun: "atac" } },
  { id: "R06", name: "[REG-A5] context_lock korunmalı", input: body("ne renk?", lazer({ context_lock: "1", conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer", context_lock: "1" } },
  { id: "R07", name: "[REG-B1] 'Resimli' → lazer", input: body("resimli"), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" } },
  { id: "R08", name: "[REG-B1] 'Ataç' → atac", input: body("ataç"), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" } },
  { id: "R09", name: "[REG-B2] Ataç kolye seçimi letters_received boş", input: body("ataç kolye"), expect: { ilgilenilen_urun: "atac", letters_received: "" } },
  { id: "R10", name: "[REG-B5] Ürün değişiminde photo sıfır", input: body("ataç kolye istiyorum", lazer({ photo_received: "1", back_text_status: "skipped", conversation_stage: "waiting_payment" })), expect: { photo_received: "" } },
  { id: "R11", name: "[REG-B5] Ürün değişiminde back_text sıfır", input: body("ataç kolye istiyorum", lazer({ photo_received: "1", back_text_status: "skipped" })), expect: { back_text_status: "" } },
  { id: "R12", name: "[REG-B6] Ataç fiyat sorusu lazer bozmamalı", input: body("ataç fiyatı ne kadar", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "R13", name: "[REG-B4] Açık ataç seçimi değiştirmeli", input: body("yok ben ataç alayım", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "atac" } },
  { id: "R14", name: "[REG-C2] Niyet cümlesi photo set etmemeli", input: body("fotoğrafı gönderiyorum", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "" } },
  { id: "R15", name: "[REG-C2] Birazdan atacağım photo set etmemeli", input: body("birazdan fotoğraf atacağım", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "" } },
  { id: "R16", name: "[REG-C3] Instagram CDN → photo=1", input: body("https://cdninstagram.com/photo123.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "1" } },
  { id: "R17", name: "[REG-C3] .jpeg URL → photo=1", input: body("https://example.com/foto.jpeg", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "1" } },
  { id: "R18", name: "[REG-C4] photo=1 sonrası 'gönderin' yazmamalı", input: body("devam", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "fotografi gonderin" },
  { id: "R19", name: "[REG-C5] 'Bu foto olur mu?' stage ilerletmemeli", input: body("bu foto olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { photo_received: "1", conversation_stage: "waiting_back_text" } },
  { id: "R20", name: "[REG-C6] 'Arkasına yazı oluyor mu?' back_text set etmemeli", input: body("arkasına yazı oluyor mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "" } },
  { id: "R21", name: "[REG-C7] waiting_back_text foto URL → received", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "R22", name: "[REG-C8] Arka foto fiyat → ek ücret", input: body("arkasına foto koyarsam fiyat ne olur", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "ek ucret" },
  { id: "R23", name: "[REG-C9] Arka yazı → received + waiting_payment", input: body("sevgilime", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received", conversation_stage: "waiting_payment" } },
  { id: "R24", name: "[REG-D1] Ataç seçimde photo boş", input: body("ataç kolye istiyorum"), expect: { ilgilenilen_urun: "atac", photo_received: "" } },
  { id: "R25", name: "[REG-D2] Ataç letters boşken waiting_letters", input: body("devam", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "R26", name: "[REG-D3] Ataç letters yokken eft stage bozmamalı", input: body("eft", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "R27", name: "[REG-D3] Ataç letters yokken kapıda stage bozmamalı", input: body("kapıda ödeme olsun", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "R28", name: "[REG-D4] AYS kısa harf → letters=1", input: body("AYS", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "1" } },
  { id: "R29", name: "[REG-D5] EKB → letters=1 + waiting_payment", input: body("EKB", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "1", conversation_stage: "waiting_payment" } },
  { id: "R30", name: "[REG-D6] letters=1 varken waiting_payment korunmalı", input: body("devam", atacWaitingPayment()), expect: { conversation_stage: "waiting_payment" } },
  { id: "R31", name: "[REG-E1] havale → eft_havale", input: body("havale", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },
  { id: "R32", name: "[REG-E1] kapida → kapida_odeme", input: body("kapida", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "R33", name: "[REG-E3] Kapıda ödeme olsun → kapida_odeme", input: body("kapıda ödeme olsun", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "R34", name: "[REG-F1] 'Adres veriyorum' → status boş", input: body("adres veriyorum", lazerWaitingAddress({ address_status: "" })), expect: { address_status: "" } },
  { id: "R35", name: "[REG-F3] Kargo sorusu → address boş", input: body("istanbul içi kaç günde gelir"), expect: { address_status: "" } },
  { id: "R36", name: "[REG-F4] Sadece adres → address_only", input: body("İstanbul Kadıköy Moda Mah Bahariye Cad No:5", lazerWaitingAddress()), expect: { address_status: "address_only" } },
  { id: "R37", name: "[REG-F4] address_only → order_completed olmamalı", input: body("İstanbul Kadıköy Moda Mah Bahariye Cad No:5", lazerWaitingAddress()), expect: { conversation_stage: "waiting_address" } },
  { id: "R38", name: "[REG-F7] İsim+tel+adres → tam", input: body("Ahmet Yılmaz 05551234567 Ankara Çankaya Kızılay Mah No:3", lazerWaitingAddress()), expect: { address_status: "received", phone_received: "1", conversation_stage: "order_completed" } },
  { id: "R39", name: "[REG-F8] address_only + tel → received", input: body("05551234567", lazerWaitingAddress({ address_status: "address_only" })), expect: { address_status: "received", phone_received: "1" } },
  { id: "R40", name: "[REG-G5] order_completed senkron", input: body("Ali 05551234567 İstanbul Kadıköy Moda Mah No:5", lazerWaitingAddress()), expect: { conversation_stage: "order_completed", order_status: "completed", siparis_alindi: "1" } },
  { id: "R41", name: "[REG-G6] İptal siparis_alindi temizlemeli", input: body("iptal", lazer({ order_status: "completed", siparis_alindi: "1", conversation_stage: "order_completed" })), expect: { siparis_alindi: "", order_status: "cancel_requested" } },
  { id: "R42", name: "[REG-H1] Güven sorusu ürünü bozmamalı", input: body("güvenilir misiniz", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" }, expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz" },
  { id: "R43", name: "[REG-H1] Kargo sorusu stage bozmamalı", input: body("kargo ne kadar sürer", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment" }, expectReplyIncludes: "is gunu" },
  { id: "R44", name: "[REG-H2] Kargo ücreti menü açmamalı", input: body("kargo ücreti var mı", lazerWaitingPayment()), expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz" },
  { id: "R45", name: "[REG-J2] Kargom nerede → ekip", input: body("kargom nerede"), expectReplyIncludes: "ekibimiz" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 3: PARSING TESTS (P01–P10 — mevcut)
  // ════════════════════════════════════════════════════════════════════════
  { id: "P01", name: "[PARSE] +90 tel", input: body("+905551234567", lazerWaitingAddress()), expect: { phone_received: "1" } },
  { id: "P02", name: "[PARSE] 05XX tel", input: body("05551234567", lazerWaitingAddress()), expect: { phone_received: "1" } },
  { id: "P03", name: "[PARSE] 8 hane → phone boş", input: body("12345678", lazerWaitingAddress()), expect: { phone_received: "" } },
  { id: "P04", name: "[PARSE] Mah+Cad+No adres", input: body("Moda Mah Bahariye Cad No:5 Kadıköy", lazerWaitingAddress()), expect: { address_status: "address_only" } },
  { id: "P05", name: "[PARSE] Site+Apt adres", input: body("Bahçeşehir Sitesi Lale Apt Kat:3 İstanbul", lazerWaitingAddress()), expect: { address_status: "address_only" } },
  { id: "P06", name: "[PARSE] Adres+tel → received", input: body("Kadıköy Moda Mah No:3 05551234567", lazerWaitingAddress()), expect: { address_status: "received", phone_received: "1" } },
  { id: "P07", name: "[PARSE] fbsbx URL → photo", input: body("https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=123", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "1" } },
  { id: "P08", name: "[PARSE] Non-HTTP → photo boş", input: body("example.com/foto.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "" } },
  { id: "P09", name: "[PARSE] Ataç fiyat sorusu letters boş", input: body("fiyat ne kadar", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "" } },
  { id: "P10", name: "[PARSE] Havale yapacağım → eft_havale", input: body("havale yapacağım", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 4: VARIATION TESTS (V01–V18 — mevcut)
  // ════════════════════════════════════════════════════════════════════════
  { id: "V01", name: "[VAR] Foto kolye → lazer", input: body("foto kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "V02", name: "[VAR] Fotoğraflı kolye → lazer", input: body("fotoğraflı kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "V03", name: "[VAR] Fotolu kolye → lazer", input: body("fotolu kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "V04", name: "[VAR] İsim harf kolye → atac", input: body("isim harf kolye"), expect: { ilgilenilen_urun: "atac" } },
  { id: "V05", name: "[VAR] 3 harf kolye → atac", input: body("3 harf kolye"), expect: { ilgilenilen_urun: "atac" } },
  { id: "V06", name: "[VAR] Vazgeçtim → cancel", input: body("vazgeçtim", lazerWaitingPayment()), expect: { order_status: "cancel_requested" } },
  { id: "V07", name: "[VAR] Siparişi iptal → cancel", input: body("siparişi iptal", lazerWaitingPayment()), expect: { order_status: "cancel_requested" } },
  { id: "V08", name: "[VAR] Gerek yok → skipped", input: body("gerek yok", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },
  { id: "V09", name: "[VAR] Boş kalsın → skipped", input: body("boş kalsın", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },
  { id: "V10", name: "[VAR] Arka boş kalsın → skipped", input: body("arka boş kalsın", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },
  { id: "V11", name: "[VAR] Yazı olmasın → skipped", input: body("yazı olmasın", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },
  { id: "V12", name: "[VAR] Kaç günde gelir", input: body("kaç günde gelir"), expectReplyIncludes: "is gunu" },
  { id: "V13", name: "[VAR] Teslimat süresi", input: body("teslimat süresi ne kadar"), expectReplyIncludes: "is gunu" },
  { id: "V14", name: "[VAR] Yeriniz nerede", input: body("yeriniz nerede"), expectReplyIncludes: "istanbul" },
  { id: "V15", name: "[VAR] Dolandırıcı", input: body("dolandırıcı mısınız"), expectReplyIncludes: "guven" },
  { id: "V16", name: "[VAR] Kapıda öderim", input: body("kapıda öderim", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "V17", name: "[VAR] Kapıda olsun", input: body("kapıda olsun", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "V18", name: "[VAR] EFT ile ödeyeceğim", input: body("eft ile ödeyeceğim", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 5: STATE TESTS (S01–S09 — mevcut)
  // ════════════════════════════════════════════════════════════════════════
  { id: "S01", name: "[STATE] Lazer waiting_photo korunmalı", input: body("devam", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo" } },
  { id: "S03", name: "[STATE] Ataç waiting_letters korunmalı", input: body("devam", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "S04", name: "[STATE] Lazer seçilince started", input: body("resimli lazer kolye"), expect: { order_status: "started" } },
  { id: "S05", name: "[STATE] Ataçta photo boş", input: body("AYS", atac({ conversation_stage: "waiting_letters" })), expect: { photo_received: "" } },
  { id: "S06", name: "[STATE] Ataçta back_text boş", input: body("AYS", atac({ conversation_stage: "waiting_letters" })), expect: { back_text_status: "" } },
  { id: "S07", name: "[STATE] Lazerde letters boş", input: body("https://lookaside.fbsbx.com/foto.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { letters_received: "" } },
  { id: "S08", name: "[STATE] order_completed korunmalı", input: body("tamam", lazerCompleted()), expect: { address_status: "received", conversation_stage: "order_completed" } },
  { id: "S09", name: "[STATE] Lazerden ataca geçiş", input: body("harfli ataç kolye istiyorum", lazer({ photo_received: "1", back_text_status: "skipped", conversation_stage: "waiting_payment" })), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 6: MANYCHAT CONTRACT (MC01–MC09 — mevcut)
  // ════════════════════════════════════════════════════════════════════════
  { id: "MC01", name: "[MC] {{cuf_12345}} boş", input: body("ataç kolye", { ilgilenilen_urun: "{{cuf_12345}}" }), expect: { ilgilenilen_urun: "atac" } },
  { id: "MC02", name: "[MC] {cuf_999} boş", input: body("lazer istiyorum", { ilgilenilen_urun: "{cuf_999}" }), expect: { ilgilenilen_urun: "lazer" } },
  { id: "MC03", name: "[MC] cuf stage geçersiz", input: body("merhaba", { conversation_stage: "cuf_456" }), expect: { success: true }, expectReplyIncludes: "merhaba" },
  { id: "MC04", name: "[MC] undefined string boş", input: body("merhaba", { ilgilenilen_urun: "undefined" }), expect: { ilgilenilen_urun: "" } },
  { id: "MC05", name: "[MC] null string boş", input: body("merhaba", { ilgilenilen_urun: "null" }), expect: { ilgilenilen_urun: "" } },
  { id: "MC06", name: "[MC] Boş mesaj crash yok", input: body(""), expect: { success: true } },
  { id: "MC07", name: "[MC] Boşluk mesaj crash yok", input: body("   "), expect: { success: true } },
  { id: "MC08", name: "[MC] Geçersiz stage ignore", input: body("ataç kolye", { conversation_stage: "some_invalid_stage_xyz" }), expect: { ilgilenilen_urun: "atac" } },
  { id: "MC09", name: "[MC] success:true her zaman", input: body("neredesiniz"), expect: { success: true } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 7: MODEL SAFETY (MS01–MS70 — mevcut)
  // ════════════════════════════════════════════════════════════════════════
  { id: "MS01", name: "[MODEL] Konum deterministic", input: body("neredesiniz"), expectReplyIncludes: "emin", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS02", name: "[MODEL] Kargo süresi deterministic", input: body("kargo ne zaman gelir"), expectReplyIncludes: "is gunu", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS03", name: "[MODEL] Kargo ücreti deterministic", input: body("kargo ücreti var mı"), expectReplyIncludes: "dahil", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS04", name: "[MODEL] Güven deterministic", input: body("güvenilir misiniz"), expectReplyIncludes: "guven", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS05", name: "[MODEL] Kararır mı deterministic", input: body("kararır mı"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS06", name: "[MODEL] Kaplama atar mı deterministic", input: body("kaplaması atar mı"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS07", name: "[MODEL] Zincir 60cm", input: body("zincir uzunluğu ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS08", name: "[MODEL] Arkasına yazı olur mu deterministic", input: body("arkasına yazı olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS09", name: "[MODEL] Arkasına foto olur mu deterministic", input: body("arkasına foto olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS10", name: "[MODEL] Arka foto fiyat deterministic", input: body("arkasına foto koyarsam fiyat ne olur", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "ek ucret", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS11", name: "[MODEL] EFT fallback yok", input: body("eft", lazerWaitingPayment()), expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS12", name: "[MODEL] Kapıda fallback yok", input: body("kapıda ödeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS13", name: "[MODEL] Yok fallback yok", input: body("yok", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped", conversation_stage: "waiting_payment" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS14", name: "[MODEL] Serbest arka yazı fallback yok", input: body("canım ailem", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received", conversation_stage: "waiting_payment" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS15", name: "[MODEL] Harf girdisi fallback yok", input: body("ABC", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "1", conversation_stage: "waiting_payment" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS16", name: "[MODEL] Telefon fallback yok", input: body("05551234567", lazerWaitingAddress({ address_status: "address_only" })), expect: { phone_received: "1", address_status: "received" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS17", name: "[MODEL] Adres fallback yok", input: body("Kadıköy Moda Mah No:3", lazerWaitingAddress()), expect: { address_status: "address_only" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS18", name: "[MODEL] Foto URL fallback yok", input: body("https://lookaside.fbsbx.com/photo123.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "1", conversation_stage: "waiting_back_text" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS19", name: "[MODEL] Belirsiz mesaj crash yok", input: body("uzaylı kolye yapıyor musunuz"), expect: { success: true }, expectReplyIncludes: "hangi" },
  { id: "MS20", name: "[MODEL] Alakasız mesaj crash yok", input: body("mercury retrograde sırasında bitcoin ne olur"), expect: { success: true }, expectReplyIncludes: "hangi" },
  { id: "MS21", name: "[MODEL] Side: waiting_photo + konum", input: body("neredesiniz", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "istanbul" },
  { id: "MS22", name: "[MODEL] Side: waiting_photo + güven", input: body("güvenilir misiniz", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "guven" },
  { id: "MS23", name: "[MODEL] Side: waiting_photo + kargo", input: body("kaç günde gelir", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "is gunu" },
  { id: "MS24", name: "[MODEL] Side: waiting_photo + kargo ücreti", input: body("kargo ücreti var mı", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "dahil" },
  { id: "MS25", name: "[MODEL] Side: waiting_payment + konum", input: body("yeriniz nerede", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "istanbul" },
  { id: "MS26", name: "[MODEL] Side: waiting_payment + güven", input: body("dolandırıcı mısınız", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "guven" },
  { id: "MS27", name: "[MODEL] Side: waiting_payment + kargo", input: body("kargo ne zaman gelir", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "is gunu" },
  { id: "MS28", name: "[MODEL] Side: waiting_payment + kargo ücreti", input: body("kargo ücretli mi", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "dahil" },
  { id: "MS29", name: "[MODEL] Side: waiting_address + konum", input: body("konumunuz nerede", lazerWaitingAddress()), expect: { conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "istanbul" },
  { id: "MS30", name: "[MODEL] Side: waiting_address + güven", input: body("güvenilir mi", lazerWaitingAddress()), expect: { conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "guven" },
  { id: "MS31", name: "[MODEL] Ataç letters + konum", input: body("neredesiniz", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" }, expectReplyIncludes: "istanbul" },
  { id: "MS32", name: "[MODEL] Ataç letters + güven", input: body("güvenilir misiniz", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" }, expectReplyIncludes: "guven" },
  { id: "MS33", name: "[MODEL] Ataç letters + kargo", input: body("kargo ne zaman gelir", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" }, expectReplyIncludes: "is gunu" },
  { id: "MS34", name: "[MODEL] Ataç payment + konum", input: body("yeriniz nerede", atacWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "atac" }, expectReplyIncludes: "istanbul" },
  { id: "MS35", name: "[MODEL] Ataç payment + güven", input: body("dolandırıcı mısınız", atacWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "atac" }, expectReplyIncludes: "guven" },
  { id: "MS36", name: "[MODEL] Ataç payment + kargo", input: body("kaç günde gelir", atacWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "atac" }, expectReplyIncludes: "is gunu" },
  { id: "MS37", name: "[MODEL] Ataç address + konum", input: body("neredesiniz", atacWaitingAddress()), expect: { conversation_stage: "waiting_address", ilgilenilen_urun: "atac" }, expectReplyIncludes: "istanbul" },
  { id: "MS38", name: "[MODEL] Ataç address + güven", input: body("güvenilir misiniz", atacWaitingAddress()), expect: { conversation_stage: "waiting_address", ilgilenilen_urun: "atac" }, expectReplyIncludes: "guven" },
  { id: "MS39", name: "[MODEL] Ataç address + kargo", input: body("teslimat süresi", atacWaitingAddress()), expect: { conversation_stage: "waiting_address", ilgilenilen_urun: "atac" }, expectReplyIncludes: "is gunu" },
  { id: "MS40", name: "[MODEL] Ataç letters + fiyat", input: body("fiyat ne kadar", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" } },
  { id: "MS41", name: "[MODEL] Switch: lazer→atac photo reset", input: body("ataç kolye istiyorum", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters", photo_received: "" } },
  { id: "MS42", name: "[MODEL] Switch: lazer back_text→atac", input: body("harfli ataç kolye istiyorum", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters", back_text_status: "" } },
  { id: "MS43", name: "[MODEL] Switch: lazer payment→atac", input: body("yok ben ataç alayım", lazerWaitingPayment()), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters", payment_method: "" } },
  { id: "MS44", name: "[MODEL] Switch: lazer address→atac", input: body("ataç alayım", lazerWaitingAddress({ address_status: "address_only" })), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters", address_status: "" } },
  { id: "MS45", name: "[MODEL] Switch: atac→lazer", input: body("resimli lazer kolye istiyorum", atac({ conversation_stage: "waiting_letters" })), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo", letters_received: "" } },
  { id: "MS46", name: "[MODEL] Switch: atac payment→lazer", input: body("yok ben resimli istiyorum", atacWaitingPayment()), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo", payment_method: "" } },
  { id: "MS47", name: "[MODEL] Switch: atac address→lazer", input: body("resimli istiyorum", atacWaitingAddress({ address_status: "address_only" })), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo", address_status: "" } },
  { id: "MS48", name: "[MODEL] Cross: lazerde atac fiyat switch yok", input: body("ataç kolye fiyatı ne kadar", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" } },
  { id: "MS49", name: "[MODEL] Cross: atacda lazer fiyat switch yok", input: body("resimli kolye fiyatı ne kadar", atac({ conversation_stage: "waiting_letters" })), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" } },
  { id: "MS50", name: "[MODEL] Explicit: fikrimi değiştirdim", input: body("ben fikrimi değiştirdim resimli olsun", atacWaitingPayment()), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo", letters_received: "" } },
  { id: "MS51", name: "[MODEL] kapida odeme var mi deterministic", input: body("kapida odeme var mi"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS52", name: "[MODEL] kapida olsun → kapida_odeme", input: body("kapida olsun", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" } },
  { id: "MS53", name: "[MODEL] havale olsun → eft_havale", input: body("havale olsun", lazerWaitingPayment()), expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" } },
  { id: "MS54", name: "[MODEL] eft ile odeyecegim", input: body("eft ile odeyecegim", lazerWaitingPayment()), expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" } },
  { id: "MS55", name: "[MODEL] foto atsam olur mu fallback yok", input: body("fotograf atsam olur mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS56", name: "[MODEL] resim nasıl gönderiyorum", input: body("resim nasıl gönderiyorum", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS57", name: "[MODEL] arka tarafa yazı olur mu", input: body("arka tarafa yazı olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS58", name: "[MODEL] iki yüzüne de foto", input: body("iki yüzüne de foto olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS59", name: "[MODEL] teslimat ne zaman olur", input: body("teslimat ne zaman olur"), expectReplyIncludes: "is gunu" },
  { id: "MS60", name: "[MODEL] konum atar mısınız", input: body("konum atar mısınız"), expectReplyIncludes: "istanbul" },
  { id: "MS61", name: "[MODEL] 0555 123 45 67", input: body("0555 123 45 67", lazerWaitingAddress()), expect: { phone_received: "1" } },
  { id: "MS62", name: "[MODEL] +90 555 123 45 67", input: body("+90 555 123 45 67", lazerWaitingAddress()), expect: { phone_received: "1" } },
  { id: "MS63", name: "[MODEL] Site blok daire adres", input: body("Gül Sitesi A Blok Daire 3 Kadıköy İstanbul", lazerWaitingAddress()), expect: { address_status: "address_only" } },
  { id: "MS64", name: "[MODEL] Apartman kat no adres", input: body("Lale Apartmanı Kat 2 No 5 Çankaya Ankara", lazerWaitingAddress()), expect: { address_status: "address_only" } },
  { id: "MS65", name: "[MODEL] Sadece şehir adres değil", input: body("İstanbul", lazerWaitingAddress()), expect: { address_status: "" } },
  { id: "MS66", name: "[MODEL] Sadece ilçe adres değil", input: body("Kadıköy", lazerWaitingAddress()), expect: { address_status: "" } },
  { id: "MS67", name: "[MODEL] İsim waiting_address fallback yok", input: body("Ali Yılmaz", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS68", name: "[MODEL] waiting_photo iptal", input: body("iptal", lazer({ conversation_stage: "waiting_photo" })), expect: { order_status: "cancel_requested", conversation_stage: "human_support" } },
  { id: "MS69", name: "[MODEL] waiting_letters iptal", input: body("vazgeçtim", atac({ conversation_stage: "waiting_letters" })), expect: { order_status: "cancel_requested", conversation_stage: "human_support" } },
  { id: "MS70", name: "[MODEL] address_only completed olmamalı", input: body("Kadıköy Moda Mah No:3", atacWaitingAddress()), expect: { conversation_stage: "waiting_address", order_status: "started" } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 8: BACKLOG (B01–B10 — mevcut)
  // ════════════════════════════════════════════════════════════════════════
  { id: "B01", name: "[BACKLOG] Ataçta foto sorusu", input: body("fotoğrafı nasıl göndereceğim", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "B02", name: "[BACKLOG] Ataçta arka yazı → lazer", input: body("arkasına yazı olur mu", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },
  { id: "B03", name: "[BACKLOG] Ataçta arka foto → lazer", input: body("arkasına foto olur mu", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },
  { id: "B04", name: "[BACKLOG] Ataçta arka foto fiyat", input: body("arka foto olursa fiyat ne olur", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },
  { id: "B05", name: "[BACKLOG] Ataçta resim gönderme", input: body("resim nasıl gönderiyorum", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "B06", name: "[BACKLOG] Ataçta iki yüz foto", input: body("iki yüzüne de foto olur mu", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },
  { id: "B07", name: "[BACKLOG] Ataçta arka tarafa foto", input: body("arka tarafa foto olur mu", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },
  { id: "B08", name: "[BACKLOG] Ataçta arka tarafa yazı", input: body("arka tarafa yazı olur mu", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },
  { id: "B09", name: "[BACKLOG] Ataçta fotoğraf atsam olur mu", input: body("fotoğraf atsam olur mu", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "B10", name: "[BACKLOG] Ataçta arka yüz fotoğraf", input: body("arka yüzüne fotoğraf koyabiliyor muyuz", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 9: GERÇEK MÜŞTERİ MESAJLARI (RW01–RW60)
  // En sık gelen 60 gerçek mesaj — Instagram raporundan
  // ════════════════════════════════════════════════════════════════════════
  { id: "RW01", name: "[REAL] 'Bir ürünün fiyatını kontrol edebilir misiniz?' (5931x)", input: body("Bir ürünün fiyatını kontrol edebilir misiniz?"), expectReplyIncludes: "hangi" },
  { id: "RW02", name: "[REAL] 'detay' (1605x)", input: body("detay"), expectReplyIncludes: "hangi" },
  { id: "RW03", name: "[REAL] 'detay' lazer bağlamında", input: body("detay", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "599" },
  { id: "RW04", name: "[REAL] 'ürün satın alabilir miyim?' (1257x)", input: body("ürün satın alabilir miyim?"), expectReplyIncludes: "hangi" },
  { id: "RW05", name: "[REAL] 'yeriniz nerede?' (964x)", input: body("yeriniz nerede?"), expectReplyIncludes: "istanbul" },
  { id: "RW06", name: "[REAL] 'fiyat nedir' (400x)", input: body("fiyat nedir"), expectReplyIncludes: "hangi" },
  { id: "RW07", name: "[REAL] 'teşekkür ederim' (255x)", input: body("teşekkür ederim"), expectReplyIncludes: "rica" },
  { id: "RW08", name: "[REAL] 'teşekkürler' (188x)", input: body("teşekkürler"), expectReplyIncludes: "rica" },
  { id: "RW09", name: "[REAL] 'fiyat' (116x)", input: body("fiyat"), expectReplyIncludes: "hangi" },
  { id: "RW10", name: "[REAL] 'fiyat' lazer bağlamında (116x)", input: body("fiyat", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "599" },
  { id: "RW11", name: "[REAL] 'resimli lazer kolye' (105x)", input: body("resimli lazer kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW12", name: "[REAL] 'kapıda ödeme' (68x)", input: body("kapıda ödeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "RW13", name: "[REAL] 'çok teşekkür ederim' (66x)", input: body("çok teşekkür ederim", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" }, expectReplyNotIncludes: "hangi model" },
  { id: "RW14", name: "[REAL] 'çelik mi' (46x)", input: body("çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "RW15", name: "[REAL] 'kolay gelsin' (46x)", input: body("kolay gelsin"), expect: { success: true } },
  { id: "RW16", name: "[REAL] 'resimli kolye' (42x)", input: body("resimli kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW17", name: "[REAL] 'ne kadar' (40x)", input: body("ne kadar"), expectReplyIncludes: "hangi" },
  { id: "RW18", name: "[REAL] 'kararma yapar mı' (35x)", input: body("kararma yapar mı"), expectReplyIncludes: "kararma", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "RW19", name: "[REAL] 'sipariş vermek istiyorum' (48x)", input: body("sipariş vermek istiyorum"), expectReplyIncludes: "hangi" },
  { id: "RW20", name: "[REAL] 'sipariş vermek istiyorum' lazer bağlamı", input: body("sipariş vermek istiyorum", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" }, expectReplyIncludes: "599" },
  { id: "RW21", name: "[REAL] 'eft' (24x)", input: body("eft", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },
  { id: "RW22", name: "[REAL] 'kaç günde gelir' (23x)", input: body("kaç günde gelir"), expectReplyIncludes: "is gunu" },
  { id: "RW23", name: "[REAL] 'kapıda ödeme olacak' (19x)", input: body("kapıda ödeme olacak", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "RW24", name: "[REAL] 'gönderdim' (18x)", input: body("gönderdim", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW25", name: "[REAL] 'emeğinize sağlık' (13x)", input: body("emeğinize sağlık", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" }, expectReplyNotIncludes: "hangi model" },
  { id: "RW26", name: "[REAL] 'çelikmi' (13x)", input: body("çelikmi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "RW27", name: "[REAL] 'çok güzel' (13x)", input: body("çok güzel", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW28", name: "[REAL] 'kapıda ödeme istiyorum' (12x)", input: body("kapıda ödeme istiyorum", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "RW29", name: "[REAL] 'ürün çelik mi' (11x)", input: body("ürün çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "RW30", name: "[REAL] 'resimli lazer' (11x)", input: body("resimli lazer"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW31", name: "[REAL] 'ellerinize sağlık' (11x)", input: body("ellerinize sağlık", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "RW32", name: "[REAL] 'fiyat lütfen' (11x)", input: body("fiyat lütfen"), expectReplyIncludes: "hangi" },
  { id: "RW33", name: "[REAL] 'harfli ataç kolye' (6x)", input: body("harfli ataç kolye"), expect: { ilgilenilen_urun: "atac" } },
  { id: "RW34", name: "[REAL] 'indirim var mı' (6x)", input: body("indirim var mı", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW35", name: "[REAL] 'kapıda ödeme var mı' (6x)", input: body("kapıda ödeme var mı", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "RW36", name: "[REAL] 'lazer' (6x)", input: body("lazer"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW37", name: "[REAL] 'harfli' (5x)", input: body("harfli"), expect: { ilgilenilen_urun: "atac" } },
  { id: "RW38", name: "[REAL] 'hangi kargo' (5x)", input: body("hangi kargo"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "RW39", name: "[REAL] 'ürünler çelik mi' (5x)", input: body("ürünler çelik mi"), expectReplyIncludes: "paslanmaz" },
  { id: "RW40", name: "[REAL] 'kaç güne hazır olur' (5x)", input: body("kaç güne hazır olur"), expectReplyIncludes: "is gunu" },
  { id: "RW41", name: "[REAL] 'sipariş oluştur' (193x) menü veya bilgi", input: body("sipariş oluştur"), expectReplyIncludes: "hangi" },
  { id: "RW42", name: "[REAL] 'fiyatı nedir' (106x)", input: body("fiyatı nedir"), expectReplyIncludes: "hangi" },
  { id: "RW43", name: "[REAL] 'fiyat alabilirmiyim' (60x)", input: body("fiyat alabilirmiyim"), expectReplyIncludes: "hangi" },
  { id: "RW44", name: "[REAL] 'fiyat ne kadar' (57x)", input: body("fiyat ne kadar"), expectReplyIncludes: "hangi" },
  { id: "RW45", name: "[REAL] 'merhaba fiyat nedir' (35x)", input: body("merhaba fiyat nedir"), expectReplyIncludes: "hangi" },
  { id: "RW46", name: "[REAL] 'resimli kolye fiyatı nedir' (14x)", input: body("resimli kolye fiyatı nedir"), expect: { ilgilenilen_urun: "lazer" }, expectReplyIncludes: "599" },
  { id: "RW47", name: "[REAL] 'yaptırmak istiyorum' (14x)", input: body("yaptırmak istiyorum"), expectReplyIncludes: "hangi" },
  { id: "RW48", name: "[REAL] 'fıyat' yazım hatası (14x)", input: body("fıyat"), expectReplyIncludes: "hangi" },
  { id: "RW49", name: "[REAL] 'evet kapıda ödeme' (6x)", input: body("evet kapıda ödeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "RW50", name: "[REAL] 'sipariş verebilir miyim' (6x)", input: body("sipariş verebilir miyim"), expectReplyIncludes: "hangi" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 10: ORDER COMPLETED KARA DELİK TESTLERI (OC01–OC25)
  // Sipariş bittikten sonra gelen mesajlar doğru cevaplanmalı
  // ════════════════════════════════════════════════════════════════════════
  { id: "OC01", name: "[OC] Completed + fiyat sorusu → fiyat cevabı", input: body("fiyatını öğrenebilir miyim", lazerCompleted()), expectReplyIncludes: "599", expectReplyNotIncludes: "siparis" },
  { id: "OC02", name: "[OC] Completed + kargo sorusu → kargo cevabı", input: body("kargo ne zaman gelir", lazerCompleted()), expectReplyIncludes: "is gunu" },
  { id: "OC03", name: "[OC] Completed + güven sorusu → güven cevabı", input: body("kararma yapar mı", lazerCompleted()), expectReplyIncludes: "kararma" },
  { id: "OC04", name: "[OC] Completed + konum sorusu → konum cevabı", input: body("neredesiniz", lazerCompleted()), expectReplyIncludes: "istanbul" },
  { id: "OC05", name: "[OC] Completed + çelik mi → malzeme cevabı", input: body("çelik mi", lazerCompleted()), expectReplyIncludes: "paslanmaz" },
  { id: "OC06", name: "[OC] Completed + kargo ücreti → dahil", input: body("kargo dahil mi", lazerCompleted()), expectReplyIncludes: "dahil" },
  { id: "OC07", name: "[OC] Completed + teşekkür → smalltalk cevabı", input: body("teşekkür ederim", lazerCompleted()), expectReplyNotIncludes: "siparis" },
  { id: "OC08", name: "[OC] Completed + merhaba → menü açmamalı", input: body("merhaba", lazerCompleted()), expectReplyNotIncludes: "hangi model" },
  { id: "OC09", name: "[OC] Completed + iptal → cancel", input: body("iptal", lazerCompleted()), expect: { order_status: "cancel_requested" } },
  { id: "OC10", name: "[OC] Completed + kolyem hazır mı → post_sale", input: body("kolyem hazır mı", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "OC11", name: "[OC] Completed + ürün gelmedi → post_sale", input: body("ürün gelmedi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "OC12", name: "[OC] Completed + zincir uzunluğu → 60cm", input: body("zincir uzunluğu kaç cm", lazerCompleted()), expectReplyIncludes: "60" },
  { id: "OC13", name: "[OC] Completed ataç + fiyat → 499", input: body("fiyat ne kadar", atacCompleted()), expectReplyIncludes: "499" },
  { id: "OC14", name: "[OC] Completed + ödeme yaptım → ekibimiz", input: body("eft attım", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "OC15", name: "[OC] Completed + IBAN istiyorum → IBAN", input: body("iban atar mısınız", lazerCompleted()), expectReplyIncludes: "TR34" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 11: YANLISLIK NAME_ONLY TESPİTİ (NN01–NN25)
  // Daha önce name_only olarak yanlış algılanan mesajlar
  // ════════════════════════════════════════════════════════════════════════
  { id: "NN01", name: "[NN] 'Kolyem hazır mı' isim değil", input: body("Kolyem hazır mı", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad" },
  { id: "NN02", name: "[NN] 'Çelik mi' isim değil", input: body("Çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "NN03", name: "[NN] 'Ürün çelik mi' isim değil", input: body("Ürün çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "NN04", name: "[NN] 'Çok beğendim' isim değil", input: body("Çok beğendim", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ad soyad" },
  { id: "NN05", name: "[NN] 'Emeğinize sağlık' isim değil", input: body("Emeğinize sağlık", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ad soyad" },
  { id: "NN06", name: "[NN] 'Resimli lazer kolye' isim değil", input: body("Resimli lazer kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "NN07", name: "[NN] 'Resimli madalyon' isim değil", input: body("Resimli madalyon"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "NN08", name: "[NN] 'Nazar boncuklu' isim değil", input: body("Nazar boncuklu", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "NN09", name: "[NN] 'Sipariş ettiğim ürün gelmedi' isim değil", input: body("Sipariş ettiğim ürün gelmedi"), expectReplyIncludes: "ekibimiz" },
  { id: "NN10", name: "[NN] 'Kolye mi görebilir miyim' isim değil", input: body("Kolye mi görebilir miyim", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad" },
  { id: "NN11", name: "[NN] 'La familia es todo' waiting_back_text'te arka yazı olmalı", input: body("La familia es todo", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "NN12", name: "[NN] 'Adres bilgilerimi tekrar yazmak gerekli mi' soru", input: body("Adres bilgilerimi tekrar yazmak gerekli mi", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad" },
  { id: "NN13", name: "[NN] 'Bekliyorum' isim değil", input: body("Bekliyorum", lazerCompleted()), expectReplyNotIncludes: "ad soyad" },
  { id: "NN14", name: "[NN] 'Daha önce yapılan' isim değil", input: body("Daha önce yapılan", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ad soyad" },
  { id: "NN15", name: "[NN] Gerçek isim: 'FATİME AZİZOĞLU' → name_only", input: body("FATİME AZİZOĞLU", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "NN16", name: "[NN] Gerçek isim: 'Halime Dal' → name_only", input: body("Halime Dal", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "NN17", name: "[NN] Gerçek isim: 'Nurcan Sevinç' → name_only", input: body("Nurcan Sevinç", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 12: YANLIŞ ADDRESS TESPİTİ (NA01–NA15)
  // ════════════════════════════════════════════════════════════════════════
  { id: "NA01", name: "[NA] 'Tek zincir satışı yapıyor musunuz' adres değil", input: body("Tek zincir satışı yapıyor musunuz", lazer({ conversation_stage: "waiting_photo" })), expect: { address_status: "" } },
  { id: "NA02", name: "[NA] 'Pek indirim yapmıyor musunuz' adres değil", input: body("Pek indirim yapmıyor musunuz hiç", lazer({ conversation_stage: "waiting_photo" })), expect: { address_status: "" } },
  { id: "NA03", name: "[NA] '2 veya 3 tane yaptırmak istiyoruz' adres değil", input: body("2 veya 3 tane yaptırmak istiyoruz", lazer({ conversation_stage: "waiting_photo" })), expect: { address_status: "" } },
  { id: "NA04", name: "[NA] Soru cümlesi adres değil", input: body("İstanbul'da mağazanız var mı?", lazerWaitingAddress()), expect: { address_status: "" } },
  { id: "NA05", name: "[NA] 'Kargoya verildi mi acaba' adres değil", input: body("Kargoya verildi mi acaba", lazerWaitingAddress()), expect: { address_status: "" } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 13: MALZEME / ÇELİK SORULARI (MT01–MT10)
  // ════════════════════════════════════════════════════════════════════════
  { id: "MT01", name: "[MAT] 'çelik mi' → paslanmaz", input: body("çelik mi"), expectReplyIncludes: "paslanmaz" },
  { id: "MT02", name: "[MAT] 'çelikmi' birleşik → paslanmaz", input: body("çelikmi"), expectReplyIncludes: "paslanmaz" },
  { id: "MT03", name: "[MAT] 'ürün çelik mi' → paslanmaz", input: body("ürün çelik mi"), expectReplyIncludes: "paslanmaz" },
  { id: "MT04", name: "[MAT] 'ürünler çelik mi' → paslanmaz", input: body("ürünler çelik mi"), expectReplyIncludes: "paslanmaz" },
  { id: "MT05", name: "[MAT] 'malzeme ne' → paslanmaz", input: body("malzeme ne"), expectReplyIncludes: "paslanmaz" },
  { id: "MT06", name: "[MAT] 'çelik mi peki' (6x) → paslanmaz", input: body("çelik mi peki", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "MT07", name: "[MAT] 'çelik mi' waiting_photo stage bozmamalı", input: body("çelik mi", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" } },
  { id: "MT08", name: "[MAT] 'çelik mi' waiting_payment stage bozmamalı", input: body("çelik mi", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment" } },
  { id: "MT09", name: "[MAT] 'paslanmaz mı' → paslanmaz", input: body("paslanmaz mı"), expectReplyIncludes: "paslanmaz" },
  { id: "MT10", name: "[MAT] 'çelik mi' ataç bağlamı", input: body("çelik mi", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "paslanmaz", expect: { ilgilenilen_urun: "atac" } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 14: KARARMA / GÜVEN VARYASYONLARI (TR01–TR15)
  // ════════════════════════════════════════════════════════════════════════
  { id: "TR01", name: "[TRUST] 'kararma yapar mı' (35x)", input: body("kararma yapar mı"), expectReplyIncludes: "kararma" },
  { id: "TR02", name: "[TRUST] 'kararma yapıyor mu' (22x)", input: body("kararma yapıyor mu"), expectReplyIncludes: "kararma" },
  { id: "TR03", name: "[TRUST] 'kararma oluyor mu' (15x)", input: body("kararma oluyor mu"), expectReplyIncludes: "kararma" },
  { id: "TR04", name: "[TRUST] 'kararma oluyormu' (14x)", input: body("kararma oluyormu"), expectReplyIncludes: "kararma" },
  { id: "TR05", name: "[TRUST] 'kararma yaparmi' (13x)", input: body("kararma yaparmi"), expectReplyIncludes: "kararma" },
  { id: "TR06", name: "[TRUST] 'kararma olur mu' (11x)", input: body("kararma olur mu"), expectReplyIncludes: "kararma" },
  { id: "TR07", name: "[TRUST] 'kararma olurmu' (11x)", input: body("kararma olurmu"), expectReplyIncludes: "kararma" },
  { id: "TR08", name: "[TRUST] 'kararır mı' (6x)", input: body("kararır mı"), expectReplyIncludes: "kararma" },
  { id: "TR09", name: "[TRUST] 'kararma' tek kelime (6x)", input: body("kararma"), expectReplyIncludes: "kararma" },
  { id: "TR10", name: "[TRUST] 'kararma oluyor mu acaba' (6x)", input: body("kararma oluyor mu acaba"), expectReplyIncludes: "kararma" },
  { id: "TR11", name: "[TRUST] 'size güveniyorum' (6x)", input: body("size güveniyorum", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "TR12", name: "[TRUST] Güven sorusu waiting_photo stage bozmamalı", input: body("kararma yapar mı", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo" } },
  { id: "TR13", name: "[TRUST] Güven sorusu waiting_letters stage bozmamalı", input: body("kararma yapar mı", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "TR14", name: "[TRUST] 'garanti var mı' deterministic", input: body("garanti var mı"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "TR15", name: "[TRUST] 'kaplama atar mı' deterministic", input: body("kaplama atar mı"), expectReplyIncludes: "kaplama" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 15: KISA/TEK KELİME MESAJLAR (SK01–SK20)
  // ════════════════════════════════════════════════════════════════════════
  { id: "SK01", name: "[SHORT] 'evet' waiting_photo ürünü bozmamalı", input: body("evet", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK02", name: "[SHORT] 'tamam' waiting_payment ürünü bozmamalı", input: body("tamam", lazerWaitingPayment()), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK03", name: "[SHORT] 'olur' waiting_letters ürünü bozmamalı", input: body("olur", atac({ conversation_stage: "waiting_letters" })), expect: { ilgilenilen_urun: "atac" } },
  { id: "SK04", name: "[SHORT] 'tm' (49x)", input: body("tm", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK05", name: "[SHORT] 'tmm' (35x)", input: body("tmm", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK06", name: "[SHORT] 'tamamdır' (110x)", input: body("tamamdır", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK07", name: "[SHORT] 'ok' (33x)", input: body("ok", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK08", name: "[SHORT] 'peki' (28x)", input: body("peki", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK09", name: "[SHORT] 'anladım' (30x)", input: body("anladım", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK10", name: "[SHORT] 'bu olsun' (30x)", input: body("bu olsun", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK11", name: "[SHORT] 'amin' (15x) isim/harf sayılmamalı", input: body("amin", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "" } },
  { id: "SK12", name: "[SHORT] 'inşallah' (16x) isim sayılmamalı", input: body("inşallah", lazerWaitingAddress()), expect: { address_status: "" } },
  { id: "SK13", name: "[SHORT] 'maşallah' isim sayılmamalı", input: body("maşallah", lazerWaitingAddress()), expect: { address_status: "" } },
  { id: "SK14", name: "[SHORT] '?' tek soru işareti crash yok", input: body("?"), expect: { success: true } },
  { id: "SK15", name: "[SHORT] '??' çift soru crash yok", input: body("??"), expect: { success: true } },
  { id: "SK16", name: "[SHORT] '.' tek nokta crash yok", input: body("."), expect: { success: true } },
  { id: "SK17", name: "[SHORT] emoji 👍 crash yok", input: body("👍"), expect: { success: true } },
  { id: "SK18", name: "[SHORT] emoji 🙏 crash yok", input: body("🙏"), expect: { success: true } },
  { id: "SK19", name: "[SHORT] 'allah razı olsun' (31x) harf sayılmamalı", input: body("allah razı olsun", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "" } },
  { id: "SK20", name: "[SHORT] 'mrb' (16x) → selamlama", input: body("mrb"), expectReplyIncludes: "merhaba" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 16: FİYAT SORULARI ÇEŞITLI BAĞLAMLAR (PR01–PR15)
  // ════════════════════════════════════════════════════════════════════════
  { id: "PR01", name: "[PRICE] Lazer bağlamında 'fiyat' → 599+649", input: body("fiyat", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "599" },
  { id: "PR02", name: "[PRICE] Ataç bağlamında 'fiyat' → 499+549", input: body("fiyat", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "499" },
  { id: "PR03", name: "[PRICE] 'fiyat nedir acaba' (51x) menü", input: body("fiyat nedir acaba"), expectReplyIncludes: "hangi" },
  { id: "PR04", name: "[PRICE] 'fiyat bilgisi alabilir miyim' (38x)", input: body("fiyat bilgisi alabilir miyim"), expectReplyIncludes: "hangi" },
  { id: "PR05", name: "[PRICE] 'fiyatını öğrenebilir miyim' (38x)", input: body("fiyatını öğrenebilir miyim"), expectReplyIncludes: "hangi" },
  { id: "PR06", name: "[PRICE] 'fiyat öğrenebilir miyim' (38x)", input: body("fiyat öğrenebilir miyim"), expectReplyIncludes: "hangi" },
  { id: "PR07", name: "[PRICE] 'ne kadar fiyatı' (10x)", input: body("ne kadar fiyatı"), expectReplyIncludes: "hangi" },
  { id: "PR08", name: "[PRICE] 'fiyat ne' (25x)", input: body("fiyat ne"), expectReplyIncludes: "hangi" },
  { id: "PR09", name: "[PRICE] 'ücret nedir' (6x)", input: body("ücret nedir"), expectReplyIncludes: "hangi" },
  { id: "PR10", name: "[PRICE] 'ücret ne kadar' (6x)", input: body("ücret ne kadar"), expectReplyIncludes: "hangi" },
  { id: "PR11", name: "[PRICE] Fiyat sorusu letters stage bozmamalı", input: body("fiyat ne kadar", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "PR12", name: "[PRICE] Fiyat sorusu waiting_photo stage bozmamalı", input: body("ne kadar", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo" } },
  { id: "PR13", name: "[PRICE] Completed + fiyat sorusu 'sipariş tamamlandı' DEMEMELİ", input: body("3 adet fiyat nedir", lazerCompleted()), expectReplyNotIncludes: "siparis icin gerekli bilgiler tamamlandi" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 17: ÖDEME VARYASYONLARI (PY01–PY15)
  // ════════════════════════════════════════════════════════════════════════
  { id: "PY01", name: "[PAY] 'kapida odeme' (5x)", input: body("kapida odeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "PY02", name: "[PAY] 'kapıda ödeme olucak' (15x)", input: body("kapıda ödeme olucak", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "PY03", name: "[PAY] 'evet kapıda ödeme olacak' (5x)", input: body("evet kapıda ödeme olacak", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "PY04", name: "[PAY] 'kapıda ödeme varmi' (6x) deterministic", input: body("kapıda ödeme varmi"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PY05", name: "[PAY] 'iban' tek kelime lazerWP'de → IBAN", input: body("iban", lazerWaitingPayment()), expectReplyIncludes: "TR34" },
  { id: "PY06", name: "[PAY] 'iban atın ödeme yapayım'", input: body("iban atın ödeme yapayım", lazerWaitingPayment()), expectReplyIncludes: "TR34" },
  { id: "PY07", name: "[PAY] 'ödeme havale olarak olacak'", input: body("ödeme havale olarak olacak", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },
  { id: "PY08", name: "[PAY] 'eft yapabilirim'", input: body("eft yapabilirim", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },
  { id: "PY09", name: "[PAY] 'açıklama ne yazayım' → açıklama cevabı", input: body("açıklama ne yazayım", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PY10", name: "[PAY] 'dekont atayım mı' deterministic", input: body("dekont atayım mı", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 18: SMALLTALK / SELAMLAŞMA (SM01–SM15)
  // ════════════════════════════════════════════════════════════════════════
  { id: "SM01", name: "[SMALL] 'selam' (78x)", input: body("selam"), expectReplyIncludes: "merhaba" },
  { id: "SM02", name: "[SMALL] 'merhabalar' (58x)", input: body("merhabalar"), expectReplyIncludes: "merhaba" },
  { id: "SM03", name: "[SMALL] 'slm' (6x)", input: body("slm"), expectReplyIncludes: "merhaba" },
  { id: "SM04", name: "[SMALL] 'iyi akşamlar' (43x)", input: body("iyi akşamlar"), expect: { success: true } },
  { id: "SM05", name: "[SMALL] 'iyi günler' (22x)", input: body("iyi günler"), expect: { success: true } },
  { id: "SM06", name: "[SMALL] 'tşk ederim' (21x)", input: body("tşk ederim", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SM07", name: "[SMALL] 'tamam teşekkür ederim' (36x)", input: body("tamam teşekkür ederim", lazerCompleted()), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SM08", name: "[SMALL] 'çok güzel olmuş' (13x)", input: body("çok güzel olmuş", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "SM09", name: "[SMALL] 'süper' (13x)", input: body("süper", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SM10", name: "[SMALL] 'merhaba kolay gelsin' (14x)", input: body("merhaba kolay gelsin"), expect: { success: true } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 19: ARKA YAZI / BACK TEXT ÇEŞİTLİ (BT01–BT15)
  // ════════════════════════════════════════════════════════════════════════
  { id: "BT01", name: "[BT] Tarih arka yazı", input: body("01.04.2021", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "BT02", name: "[BT] İsim + tarih arka yazı", input: body("Ela 01.04.2021", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "BT03", name: "[BT] Dua arka yazı", input: body("Allah korusun", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "BT04", name: "[BT] 'canım ailem seni çok seviyorum' arka yazı", input: body("canım ailem seni çok seviyorum", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "BT05", name: "[BT] 'sonsuzluk işareti' arka yazı", input: body("sonsuzluk işareti", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "BT06", name: "[BT] Genelde ne yazılıyor sorusu → öneri", input: body("genelde ne yazılıyor", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "isim" },
  { id: "BT07", name: "[BT] 'arka boş kalsın' → skipped", input: body("arka boş kalsın", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },
  { id: "BT08", name: "[BT] 'arka yazı yok' → skipped", input: body("arka yazı yok", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 20: KARGO ÇEŞİTLİ (KG01–KG10)
  // ════════════════════════════════════════════════════════════════════════
  { id: "KG01", name: "[KARGO] 'ne zaman gelir' (6x)", input: body("ne zaman gelir"), expectReplyIncludes: "is gunu" },
  { id: "KG02", name: "[KARGO] 'kaç güne gelir' (15x)", input: body("kaç güne gelir"), expectReplyIncludes: "is gunu" },
  { id: "KG03", name: "[KARGO] 'kargom nerede' → ekip", input: body("kargom nerede"), expectReplyIncludes: "ekibimiz" },
  { id: "KG04", name: "[KARGO] 'gelmedi' (5x) → ekip", input: body("gelmedi"), expectReplyIncludes: "ekibimiz" },
  { id: "KG05", name: "[KARGO] 'kargo dahil mi' → dahil", input: body("kargo dahil mi"), expectReplyIncludes: "dahil" },
  { id: "KG06", name: "[KARGO] 'kargo ücretsiz mi' → dahil", input: body("kargo ücretsiz mi"), expectReplyIncludes: "dahil" },
  { id: "KG07", name: "[KARGO] 'kargo ücretli mi' → dahil", input: body("kargo ücretli mi"), expectReplyIncludes: "dahil" },
  { id: "KG08", name: "[KARGO] 'hangi kargo' (5x) → PTT veya kargo", input: body("hangi kargo"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "KG09", name: "[KARGO] 'kargo ücreti ile birlikte mi' → dahil", input: body("kargo ücreti ile birlikte mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },
  { id: "KG10", name: "[KARGO] Kargo sorusu waiting_address stage bozmamalı", input: body("kaç günde gelir", lazerWaitingAddress()), expect: { conversation_stage: "waiting_address" } },

];

// ─── RUNNER ───────────────────────────────────────────────────────────────
async function runTests() {
  let passed = 0;
  const failed = [];

  const categories = {};

  function getCat(id) {
    if (id.startsWith("T")) return "CORE";
    if (id.startsWith("R0") || id.startsWith("R1") || id.startsWith("R2") || id.startsWith("R3") || id.startsWith("R4")) return "REG";
    if (id.startsWith("RW")) return "REAL_WORLD";
    if (id.startsWith("P0") || id.startsWith("P1")) return "PARSE";
    if (id.startsWith("PR")) return "PRICE";
    if (id.startsWith("PY")) return "PAYMENT";
    if (id.startsWith("V")) return "VAR";
    if (id.startsWith("S0")) return "STATE";
    if (id.startsWith("SK")) return "SHORT";
    if (id.startsWith("SM")) return "SMALLTALK";
    if (id.startsWith("MC")) return "MC";
    if (id.startsWith("MS")) return "MODEL";
    if (id.startsWith("B0") || id.startsWith("B1")) return "BACKLOG";
    if (id.startsWith("BT")) return "BACK_TEXT";
    if (id.startsWith("OC")) return "ORDER_COMP";
    if (id.startsWith("NN")) return "NAME_GUARD";
    if (id.startsWith("NA")) return "ADDR_GUARD";
    if (id.startsWith("MT")) return "MATERIAL";
    if (id.startsWith("TR")) return "TRUST";
    if (id.startsWith("KG")) return "KARGO";
    return "OTHER";
  }

  for (const test of tests) {
    const cat = getCat(test.id);
    if (!categories[cat]) categories[cat] = [0, 0];
    categories[cat][1]++;

    try {
      const res = await processChat(test.input, { skipKnowledgeCheck: true });
      let ok = true;

      if (test.expect) {
        for (const key of Object.keys(test.expect)) {
          if (res[key] !== test.expect[key]) ok = false;
        }
      }
      if (test.expectReplyIncludes) {
        const reply = normalizeForTest(res.ai_reply || "");
        const expected = normalizeForTest(test.expectReplyIncludes);
        if (!reply.includes(expected)) ok = false;
      }
      if (test.expectReplyNotIncludes) {
        const reply = normalizeForTest(res.ai_reply || "");
        const forbidden = normalizeForTest(test.expectReplyNotIncludes);
        if (reply.includes(forbidden)) ok = false;
      }

      if (ok) {
        console.log(`✅ ${test.id} - ${test.name}`);
        passed++;
        categories[cat][0]++;
      } else {
        console.log(`❌ ${test.id} - ${test.name}`);
        if (test.expect) {
          for (const k of Object.keys(test.expect)) {
            if (res[k] !== test.expect[k]) console.log(`   [${k}] exp="${test.expect[k]}" got="${res[k]}"`);
          }
        }
        if (test.expectReplyIncludes) console.log(`   missing: "${test.expectReplyIncludes}" | reply: "${(res.ai_reply || "").substring(0, 100)}"`);
        if (test.expectReplyNotIncludes) console.log(`   has: "${test.expectReplyNotIncludes}" | reply: "${(res.ai_reply || "").substring(0, 100)}"`);
        failed.push(test.id);
      }
    } catch (err) {
      console.log(`💥 ${test.id} - ${test.name}`);
      console.log(`   ${err?.message || err}`);
      failed.push(test.id);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log("KATEGORİ BAZLI SONUÇ:");

  const catNames = {
    CORE: "Core Flow", REG: "Regression", REAL_WORLD: "Real World Msgs",
    PARSE: "Parsing", PRICE: "Price Queries", PAYMENT: "Payment",
    VAR: "Variation", STATE: "State Machine", SHORT: "Short Messages",
    SMALLTALK: "Smalltalk", MC: "ManyChat", MODEL: "Model Safety",
    BACKLOG: "Backlog", BACK_TEXT: "Back Text", ORDER_COMP: "Order Completed",
    NAME_GUARD: "Name Guard", ADDR_GUARD: "Address Guard",
    MATERIAL: "Material Qs", TRUST: "Trust/Kararma", KARGO: "Kargo",
    OTHER: "Other",
  };

  for (const [cat, [p, t]] of Object.entries(categories)) {
    if (t > 0) {
      const icon = p === t ? "✅" : "❌";
      console.log(`  ${icon} ${(catNames[cat] || cat).padEnd(22)} ${p}/${t}`);
    }
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n🎯 SONUÇ: ${passed}/${tests.length} geçti`);
  if (failed.length > 0) console.log(`❌ Başarısız: ${failed.join(", ")}`);
  if (passed !== tests.length) process.exit(1);
}

runTests();
