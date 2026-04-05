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
  { id: "NN10", name: "[NN] 'Kolye mi görebilir miyim' isim değil", input: body("Kolye mi görebilir miyim", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "NN11", name: "[NN] 'La familia es todo' waiting_back_text'te arka yazı olmalı", input: body("La familia es todo", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "NN12", name: "[NN] 'Adres bilgilerimi tekrar yazmak gerekli mi' soru", input: body("Adres bilgilerimi tekrar yazmak gerekli mi", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
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

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 21: ARKA FOTO SONRASI TEKRAR SORMA BUGFIX (AF01–AF06)
  // ════════════════════════════════════════════════════════════════════════
  { id: "AF01", name: "[AFIX] back_text=received iken foto gelince tekrar arka yazı sormamalı", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", back_text_status: "received", conversation_stage: "waiting_payment" })), expectReplyNotIncludes: "arka yuzune yazi eklemek" },
  { id: "AF02", name: "[AFIX] back_text=skipped iken foto gelince tekrar arka yazı sormamalı", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", back_text_status: "skipped", conversation_stage: "waiting_payment" })), expectReplyNotIncludes: "arka yuzune yazi eklemek" },
  { id: "AF03", name: "[AFIX] back_text=received + payment yok → ödeme sorusu", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", back_text_status: "received", conversation_stage: "waiting_payment" })), expectReplyIncludes: "odeme" },
  { id: "AF04", name: "[AFIX] back_text=received + payment var → adres formu", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", back_text_status: "received", payment_method: "eft_havale", conversation_stage: "waiting_address" })), expectReplyIncludes: "ad soyad" },
  { id: "AF05", name: "[AFIX] İlk foto gelince hâlâ arka yazı sormalı", input: body("https://lookaside.fbsbx.com/photo1.jpg", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "arka yuzune yazi" },
  { id: "AF06", name: "[AFIX] waiting_back_text'te foto gelince back_text=received olmalı", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 22: LOG BUG FIX TESTLERİ (LB01–LB20)
  // ════════════════════════════════════════════════════════════════════════
  { id: "LB01", name: "[LOGFIX] Başınız sağolsun → teşekkür (taziye geri dönmemeli)", input: body("Başınız sağolsun", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "basiniz sag olsun" },
  { id: "LB02", name: "[LOGFIX] Başınız sağolsun → çok teşekkür", input: body("Başınız sağolsun", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "tesekkur" },
  { id: "LB03", name: "[LOGFIX] İnşallah (completed) → dua cevabı, sipariş tamamlandı DEĞİL", input: body("İnşallah", lazerCompleted()), expectReplyNotIncludes: "siparis" },
  { id: "LB04", name: "[LOGFIX] Amin (completed) → dua cevabı", input: body("Amin", lazerCompleted()), expectReplyIncludes: "amin" },
  { id: "LB05", name: "[LOGFIX] Allah yardımcınız olsun (completed) → teşekkür", input: body("Allah yardımcınız olsun", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "LB06", name: "[LOGFIX] Kaç gün içinde gelir (completed) → kargo cevabı", input: body("Kaç gün içinde gelir", lazerCompleted()), expectReplyIncludes: "is gunu" },
  { id: "LB07", name: "[LOGFIX] Dekont yollayayım mı (completed) → tabi efendim", input: body("Dekont yollayayım mı", lazerCompleted()), expectReplyIncludes: "iletebilirsiniz" },
  { id: "LB08", name: "[LOGFIX] Kargo takip numarası → fallback", input: body("Kargo takip numarası rica ediyorum", lazerCompleted()), expectReplyIncludes: "ekibimize iletiyorum" },
  { id: "LB09", name: "[LOGFIX] Fotoğrafı değiştirebilir miyim (completed) → fallback", input: body("Fotoğrafı değiştirebilir miyim", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LB10", name: "[LOGFIX] Bu fotoğraf olur mu (back_text) → soru olarak algıla", input: body("Bu fotoğraf olur mu güzel olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "" } },
  { id: "LB11", name: "[LOGFIX] Adres alınmışken ödeme sorusu tekrar adres istememeli", input: body("Kapıda ödeme 649 demi", lazer({ photo_received: "1", back_text_status: "skipped", payment_method: "kapida_odeme", address_status: "received", phone_received: "1", conversation_stage: "order_completed", order_status: "completed", siparis_alindi: "1" })), expectReplyNotIncludes: "ad soyad" },
  { id: "LB12", name: "[LOGFIX] Resmini yollarmısınız hazır olunca (completed) → sipariş tamamlandı DEĞİL", input: body("Resmini yollarmısınız hazır olunca", lazerCompleted()), expectReplyNotIncludes: "siparis" },
  { id: "LB13", name: "[LOGFIX] Hakkınızı helal edin → teşekkür", input: body("Hakkınızı helal edin lütfen", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "LB14", name: "[LOGFIX] Bol kazançlar → teşekkür", input: body("Bol kazançlar hayırlı işler", lazerCompleted()), expectReplyIncludes: "amin" },
  { id: "LB15", name: "[LOGFIX] Sipariş sonrası fiyat → fiyat cevabı", input: body("Fiyat bilgisi bekliyorum", lazerCompleted()), expectReplyIncludes: "599" },
  { id: "LB16", name: "[LOGFIX] Sipariş sonrası kararma → güven cevabı", input: body("Kararma olmaz değil mi", lazerCompleted()), expectReplyIncludes: "kararma" },
  { id: "LB17", name: "[LOGFIX] Sipariş sonrası çelik mi → malzeme cevabı", input: body("Çelik mi bu", lazerCompleted()), expectReplyIncludes: "paslanmaz" },
  { id: "LB18", name: "[LOGFIX] Ödemeyi yaptım bilginiz olsun (completed) → ekibimiz", input: body("Ödemeyi yaptım bilginiz olsun", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LB19", name: "[LOGFIX] Sipariş sonrası foto → ekibimize yönlendir", input: body("https://lookaside.fbsbx.com/newphoto.jpg", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LB20", name: "[LOGFIX] Teslimat süresi (completed) → kargo cevabı", input: body("Ne zaman teslim edilir", lazerCompleted()), expectReplyIncludes: "is gunu" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 23: SON LOG + NOT DÜZELTME TESTLERİ (NF01–NF20)
  // ════════════════════════════════════════════════════════════════════════
  { id: "NF01", name: "[NOTEFIX] Kapıda kartla ödeme → sadece nakit", input: body("Kapıda kartla ödeme istiyorum", lazerWaitingPayment()), expectReplyIncludes: "nakit" },
  { id: "NF02", name: "[NOTEFIX] Kredi kartı → nakit uyarısı", input: body("Kredi kartı ile ödeyebilir miyim", lazerWaitingPayment()), expectReplyIncludes: "nakit" },
  { id: "NF03", name: "[NOTEFIX] Boyutu ne kadar → plaka 3 cm", input: body("Boyutu ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "3 cm" },
  { id: "NF04", name: "[NOTEFIX] Boyu ne kadar → zincir 60 cm", input: body("Boyu ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },
  { id: "NF05", name: "[NOTEFIX] Hangi kargo → PTT", input: body("Hangi kargo ile gönderiyorsunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "ptt" },
  { id: "NF06", name: "[NOTEFIX] Alerji sorusu → alerji yapmaz", input: body("Benim alerjim var çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "alerji" },
  { id: "NF07", name: "[NOTEFIX] Şubeden alacağım → address received", input: body("Şubeden alacağım", lazerWaitingAddress()), expect: { address_status: "received" } },
  { id: "NF08", name: "[NOTEFIX] Kargo parası var mı → dahil", input: body("Kargo parası var mı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },
  { id: "NF09", name: "[NOTEFIX] Completed + name_only → adres sormamalı", input: body("Tamam olur", lazerCompleted()), expectReplyNotIncludes: "ad soyad" },
  { id: "NF10", name: "[NOTEFIX] Completed + Kolyem hazır mı → ekibimiz", input: body("Kolyem hazır mı", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "NF11", name: "[NOTEFIX] Zincir dahil mi → dahildir", input: body("Zincir dahil mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },
  { id: "NF12", name: "[NOTEFIX] Kapıda nakit → nakit uyarısı verilmeli", input: body("Kapıda kartla ödeme istiyorum", lazerWaitingPayment()), expectReplyIncludes: "nakit" },
  { id: "NF13", name: "[NOTEFIX] Alerji + çelik sorusu birlikte", input: body("Peki kararma yapıyor mu birde benim alerjim çelik mi acaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "alerji" },
  { id: "NF14", name: "[NOTEFIX] Eve teslim var mı → kargo dahil", input: body("Eve teslim var mı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },
  { id: "NF15", name: "[NOTEFIX] Kargo var mı → dahil", input: body("Kargo varmı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 24: POST-SALE / ORDER_COMPLETED REGRESSION (PS01–PS30)
  // ════════════════════════════════════════════════════════════════════════

  // --- Teşekkür / memnuniyet (completed'da smalltalk olmalı, fallback değil) ---
  { id: "PS01", name: "[PS] Completed + beğendim → teşekkür", input: body("Begendım cok tatlı olmus", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "PS02", name: "[PS] Completed + elinize sağlık → teşekkür", input: body("Emeğinize sağlık", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "PS03", name: "[PS] Completed + çok güzel olmuş → teşekkür", input: body("Çok güzel olmuş elinize sağlık", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "PS04", name: "[PS] Completed + bayıldım → teşekkür", input: body("Bayıldım çok güzel", lazerCompleted()), expectReplyIncludes: "tesekkur" },

  // --- Kısa onay / bekleme (completed'da fallback değil, kısa cevap) ---
  { id: "PS05", name: "[PS] Completed + tamam → kısa cevap", input: body("Tamam", lazerCompleted()), expectReplyIncludes: "efendim" },
  { id: "PS06", name: "[PS] Completed + bekliyorum → kısa cevap", input: body("Bekliyorum", lazerCompleted()), expectReplyIncludes: "efendim" },
  { id: "PS07", name: "[PS] Completed + peki → kısa cevap", input: body("Peki", lazerCompleted()), expectReplyIncludes: "efendim" },
  { id: "PS08", name: "[PS] Completed + tamamdır → kısa cevap", input: body("Tamamdır", lazerCompleted()), expectReplyIncludes: "efendim" },

  // --- Kişisel kargo takibi (completed'da ekibe yönlendir) ---
  { id: "PS09", name: "[PS] Completed + kargom gelmedi → ekibimiz", input: body("Kargom gelmedi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS10", name: "[PS] Completed + kargoya verildi mi → ekibimiz", input: body("Kargoya verildi mi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS11", name: "[PS] Completed + kargo mesajı gelmedi → ekibimiz", input: body("Hala kargo mesajı gelmedi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // --- Genel kargo bilgisi (completed'da da verilebilir) ---
  { id: "PS12", name: "[PS] Completed + kaç günde gelir → kargo cevabı", input: body("Kaç günde gelir", lazerCompleted()), expectReplyIncludes: "is gunu" },

  // --- Şikayet / memnuniyetsizlik (ekibe yönlendir) ---
  { id: "PS13", name: "[PS] Completed + memnun kalmadım → ekibimiz", input: body("Memnun kalmadım", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS14", name: "[PS] Completed + istediğim gibi değil → ekibimiz", input: body("İstediğim gibi değil", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS15", name: "[PS] Completed + şikayetim var → ekibimiz", input: body("Şikayetim var", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS16", name: "[PS] Completed + yanlış olmuş → ekibimiz", input: body("Yanlış olmuş", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // --- State koruması (completed → eski stage'lere dönmemeli) ---
  { id: "PS17", name: "[PS] Completed + tamam → stage korunmalı", input: body("Tamam", lazerCompleted()), expect: { conversation_stage: "order_completed" } },
  { id: "PS18", name: "[PS] Completed + bekliyorum → stage korunmalı", input: body("Bekliyorum", lazerCompleted()), expect: { conversation_stage: "order_completed" } },
  { id: "PS19", name: "[PS] Completed + kargom gelmedi → fotoğraf sormamalı", input: body("Kargom gelmedi", lazerCompleted()), expectReplyNotIncludes: "fotograf" },
  { id: "PS20", name: "[PS] Completed + memnun kalmadım → adres sormamalı", input: body("Memnun kalmadım", lazerCompleted()), expectReplyNotIncludes: "adres" },

  // --- Kısa mesaj stage-aware handling ---
  { id: "PS21", name: "[PS] waiting_photo + tm → foto iste", input: body("Tm", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "fotograf" },
  { id: "PS22", name: "[PS] waiting_photo + tamamdır → foto iste", input: body("Tamamdır", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "fotograf" },
  { id: "PS23", name: "[PS] waiting_payment + tamam → ödeme sor", input: body("Tamam", lazer({ conversation_stage: "waiting_payment", photo_received: "1", back_text_status: "received" })), expectReplyIncludes: "odeme" },

  // --- Typo / variant coverage ---
  { id: "PS24", name: "[PS] Karar ma (boşluklu) → trust", input: body("Karar ma oluyor mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kararma" },
  { id: "PS25", name: "[PS] Yeriniz neresi → location", input: body("Yeriniz neresi", {}), expectReplyIncludes: "eminonu" },
  { id: "PS26", name: "[PS] Zinciri kaç santım → zincir cevabı", input: body("Zinciri kaç santım", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },

  // --- Arkalı önlü / çift taraflı sorular ---
  { id: "PS27", name: "[PS] Çift taraflı resim → backPhotoInfo", input: body("Çift taraflı resim olabilir mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "arka" },
  { id: "PS28", name: "[PS] İki tarafa da resim → backPhotoInfo", input: body("İki tarafa da resim koyulabiliyor mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "arka" },
  { id: "PS29", name: "[PS] Önlü arkalı → backPhotoInfo", input: body("Önlü arkalı fotoğraf yapabiliyormusunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "arka" },

  // --- Completed'da sipariş akışı açılmamalı ---
  { id: "PS30", name: "[PS] Completed + ürün geldi ama → ekibimiz (şikayet)", input: body("Ürün geldi fakat siparişimle alakası yok", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 25: LOG-BASED BUG REGRESSION (LR01–LR50)
  // ════════════════════════════════════════════════════════════════════════

  // --- BUG-C: İsim false positive — bunlar isim DEĞİL ---
  { id: "LR01", name: "[LR] 'Bu olsun' → name_only olmamalı", input: body("Bu olsun", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR02", name: "[LR] 'Kusura bakmayın ama' → name_only olmamalı", input: body("Kusura bakmayın ama", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR03", name: "[LR] 'Basımdan önce' → name_only olmamalı", input: body("Basımdan önce", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR04", name: "[LR] 'Diyarbakır Silvan' → name_only olmamalı", input: body("Diyarbakır Silvan", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR05", name: "[LR] 'Hevesle bekleyeceğim' → name_only olmamalı", input: body("Hevesle bekleyeceğim", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR06", name: "[LR] 'Sizin attığınız' → name_only olmamalı", input: body("Sizin attığınız", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR07", name: "[LR] 'Ertesi güne kalır' → name_only olmamalı", input: body("Ertesi güne kalır", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR08", name: "[LR] 'İyi satışlar dilerim' → name_only olmamalı", input: body("İyi satışlar dilerim", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR09", name: "[LR] 'Bu olacak arkasında' → name_only olmamalı", input: body("Bu olacak arkasında", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR10", name: "[LR] 'Benim için anlamlı' → name_only olmamalı", input: body("Benim için anlamlı", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },

  // --- Gerçek isimler hala tanınmalı ---
  { id: "LR11", name: "[LR] 'Ayşe Arabacı' → isim tanınmalı", input: body("Ayşe Arabacı", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "LR12", name: "[LR] 'Elif Poyraz' → isim tanınmalı", input: body("Elif Poyraz", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "LR13", name: "[LR] 'Serap Ulaş' → isim tanınmalı", input: body("Serap Ulaş", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "LR14", name: "[LR] 'Fatma Torun' → isim tanınmalı", input: body("Fatma Torun", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "LR15", name: "[LR] 'Veli Çiçek' → isim tanınmalı", input: body("Veli Çiçek", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },

  // --- BUG-H: Kişisel kargo takibi completed'da → ekibe yönlendir ---
  { id: "LR16", name: "[LR] Completed + ürünümü kargoya verdiniz mi → ekibimiz", input: body("Benim ürünümü kargoya verdiniz mi acaba", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR17", name: "[LR] Completed + bana mesaj geldi → ekibimiz", input: body("Ptt den bana mesaj geldi çünkü", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR18", name: "[LR] Completed + herkesin kargosu geldi benim yok → ekibimiz", input: body("Herkesin kargosu eline ulaştı benim yok", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR19", name: "[LR] Completed + kargom hazır mı → ekibimiz", input: body("Ya kargom hazırmı", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // --- BUG-K: Şikayet mesajları → ekibe yönlendir ---
  { id: "LR20", name: "[LR] Completed + çok kara → ekibimiz", input: body("Çok kara olmuş hiç beğenmedim", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR21", name: "[LR] Completed + memnun değilim → ekibimiz", input: body("Memnun değilim çok kara", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR22", name: "[LR] Completed + net değil → ekibimiz", input: body("Hiç net değil anlaşılmıyor", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR23", name: "[LR] Completed + sinir oldum → ekibimiz", input: body("Gerçekten çok sinir oldum", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // --- BUG-F: Kargo fiyatı → shipping_price (dahil) ---
  { id: "LR24", name: "[LR] 'Kargo fiyati' → dahil", input: body("Kargo fiyati", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },
  { id: "LR25", name: "[LR] 'Kargo ücretli mi' → dahil", input: body("Kargo ücretlimi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },

  // --- BUG-G: Kolye boyu kaç cm → 60cm ---
  { id: "LR26", name: "[LR] 'Kolye boyu kac cm dır' → 60", input: body("Kolye boyu kac cm dır", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },
  { id: "LR27", name: "[LR] 'Kac cm dır' → 60", input: body("Kac cm dır", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },

  // --- BUG-J: Gümüş mü → material cevabı ---
  { id: "LR28", name: "[LR] 'Kolye gümüş müdür' → çelik", input: body("Kolye gümüş müdür", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "LR29", name: "[LR] 'Gümüş mü çelik mi' → çelik", input: body("Gümüş mü çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },

  // --- BUG-B: Gönderdim/attım → stage-aware ---
  { id: "LR30", name: "[LR] waiting_photo + gönderdim → kabul et", input: body("Gönderdim fotoğraf", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "LR31", name: "[LR] waiting_address + yazdım → kabul et", input: body("Yazdım bilgileri", lazerWaitingAddress()), expectReplyIncludes: "aldim" },

  // --- BUG-N/O: Geçmiş olsun, Rica ederim → smalltalk ---
  { id: "LR32", name: "[LR] Completed + çok geçmiş olsun → teşekkür", input: body("Çok geçmiş olsun", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "LR33", name: "[LR] Completed + rica ederim → ekibe değil smalltalk", input: body("Rica ederim", lazerCompleted()), expectReplyIncludes: "ederiz" },
  { id: "LR34", name: "[LR] Completed + kolay gelsin → teşekkür", input: body("Kolay gelsin", lazerCompleted()), expectReplyIncludes: "tesekkur" },

  // --- GPT-1: waiting_payment'ta arka yazı sormamalı (deterministik check) ---
  { id: "LR35", name: "[LR] waiting_payment + evet → ödeme sor, arka yazı sorma", input: body("Evet", lazer({ conversation_stage: "waiting_payment", photo_received: "1", back_text_status: "received" })), expectReplyNotIncludes: "arka yuz" },
  { id: "LR36", name: "[LR] waiting_payment + tamam → ödeme sor", input: body("Tamam", lazer({ conversation_stage: "waiting_payment", photo_received: "1", back_text_status: "received" })), expectReplyIncludes: "odeme" },

  // --- GPT-2: human_support → ekibe yönlendir (shipping dahil) ---
  { id: "LR37", name: "[LR] human_support + kargo sorusu → ekibimiz", input: body("Herkesin kargosu geldi benim yok", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "LR38", name: "[LR] human_support + sinir mesajı → ekibimiz", input: body("Hep aynı şeyleri yazıyorsun sinir oldum", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },

  // --- Stage koruması: completed'da akış açılmamalı ---
  { id: "LR39", name: "[LR] Completed + ürün fotoğrafı → ekibimiz, flow açılmamalı", input: body("Bu fotoğraf olsun", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR40", name: "[LR] Completed + kararma → trust cevabı", input: body("Kararma olur mu", lazerCompleted()), expectReplyIncludes: "kararma" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 26: GPT GAP COVERAGE + REAL LOG SCENARIOS (GC01–GC35)
  // ════════════════════════════════════════════════════════════════════════

  // --- Zor isimler ---
  { id: "GC01", name: "[GC] Ümmühan Kaya → isim", input: body("Ümmühan Kaya", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "GC02", name: "[GC] Fatime Güneş → isim", input: body("Fatime Güneş", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "GC03", name: "[GC] Halime Şahin → isim", input: body("Halime Şahin", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "GC04", name: "[GC] Büşra Balyedi → isim", input: body("Büşra Balyedi", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "GC05", name: "[GC] Mercan Görgülü → isim", input: body("Mercan Görgülü", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },

  // --- Gönderdim genişletilmiş ---
  { id: "GC06", name: "[GC] 'biraz önce attım' → kabul et", input: body("biraz önce attım", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "GC07", name: "[GC] 'daha önce gönderdim' → kabul et", input: body("daha önce gönderdim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "GC08", name: "[GC] 'resim yukarıda' → kabul et", input: body("resim yukarıda", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "GC09", name: "[GC] 'demin attım' → kabul et", input: body("demin attım", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "GC10", name: "[GC] 'yazdım' w_address → kabul et", input: body("Yazdım bilgileri", lazerWaitingAddress()), expectReplyIncludes: "aldim" },
  { id: "GC11", name: "[GC] 'belirtmiştim' w_address → kabul et", input: body("Belirtmiştim efendim", lazerWaitingAddress()), expectReplyIncludes: "aldim" },

  // --- Completed + Merhaba + operasyonel ---
  { id: "GC12", name: "[GC] Completed + Merhaba kolyeyi yapınca → ekibimiz", input: body("Merhaba kolyeyi yapınca fotoğrafını atabilir misiniz", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "GC13", name: "[GC] Completed + Merhaba kargom hazır mı → ekibimiz", input: body("Merhaba kargom hazır mı acaba", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // --- Çoklu alım fiyatları ---
  { id: "GC14", name: "[GC] 2 tane → 1000 TL", input: body("2 tane istiyorum fiyat ne olur", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "1000" },
  { id: "GC15", name: "[GC] 3 adet → 1400 TL", input: body("3 adet istiyorum fiyat", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "1400" },
  { id: "GC16", name: "[GC] 4 tane → 1750 TL", input: body("4 tane istiyorum ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "1750" },

  // --- waiting_payment arka yazı tekrar sormamalı ---
  { id: "GC17", name: "[GC] w_payment + K → arka yazı sorma", input: body("K", lazer({ conversation_stage: "waiting_payment", photo_received: "1", back_text_status: "received" })), expectReplyNotIncludes: "arka yuz" },

  // --- Gümüş mü → material ---
  { id: "GC20", name: "[GC] 'bu gümüş mü' → çelik", input: body("bu gümüş mü", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "GC21", name: "[GC] 'Kolye gümüş müdür' → çelik", input: body("Kolye gümüş müdür", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },

  // --- Kargo fiyatı ---
  { id: "GC22", name: "[GC] 'Kargo fiyati nedir' → dahil", input: body("Kargo fiyati nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },

  // --- Geçmiş olsun / Rica ederim / Kolay gelsin ---
  { id: "GC24", name: "[GC] Completed + geçmiş olsun → teşekkür", input: body("Çok geçmiş olsun", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "GC25", name: "[GC] Completed + rica ederim → ederiz", input: body("Rica ederim", lazerCompleted()), expectReplyIncludes: "ederiz" },
  { id: "GC26", name: "[GC] Completed + kolay gelsin → teşekkür", input: body("Kolay gelsin", lazerCompleted()), expectReplyIncludes: "tesekkur" },

  // --- Kolye boyu / Ataç zincir ---
  { id: "GC27", name: "[GC] 'Kolye boyu kac cm' → 60", input: body("Kolye boyu kac cm", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },
  { id: "GC28", name: "[GC] Ataç zincir → 50", input: body("Zincir uzunluğu kaç cm", { ilgilenilen_urun: "atac", user_product: "atac", context_lock: "1", conversation_stage: "waiting_letters" }), expectReplyIncludes: "50" },

  // --- human_support'ta kargo sorusu ---
  { id: "GC29", name: "[GC] human_support + PTT mesaj → ekibimiz", input: body("PPT kargola göndermişsiniz mesaj geldi dün", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },

  // --- Merhaba + sipariş niyeti ---
  { id: "GC30", name: "[GC] 'Merhaba sipariş vermek istiyorum' → smalltalk değil", input: body("Merhaba sipariş vermek istiyorum", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "hos geldiniz" },

  // --- Kişisel kargo completed ---
  { id: "GC31", name: "[GC] Completed + kargom yarın → ekibimiz", input: body("Kargom yarın elimde olur mu", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "GC32", name: "[GC] Completed + benim kargom çıktı mı → ekibimiz", input: body("Benim kargom çıktı mı bilgi verilmedi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // --- Name false positive ---
  { id: "GC33", name: "[GC] 'Sayfanıza bakmadım' → name olmamalı", input: body("Sayfanıza bakmadım bile", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "GC34", name: "[GC] 'Görseli merak ediyorum' → name olmamalı", input: body("Görseli merak ediyorum", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "GC35", name: "[GC] 'Resimleri okeyliyelim' → name olmamalı", input: body("Resimleri okeyliyelim", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 27: 40K MESAJ STRATEJİK TESTLER (ST01–ST84)
  // 40.294 gerçek müşteri mesajından çıkarılan pattern coverage testleri
  // ════════════════════════════════════════════════════════════════════════

  // --- fiyat (en sık 5928x!) ---
  { id: "ST01", name: "[40K] (5928x) Fiyat kontrol", input: body("Bir ürünün fiyatını kontrol edebilir misiniz?"), expectReplyIncludes: "model" },
  { id: "ST02", name: "[40K] (393x) Fiyat nedir", input: body("Fiyat nedir"), expectReplyIncludes: "model" },
  { id: "ST03", name: "[40K] (116x) Fiyat", input: body("Fiyat"), expectReplyIncludes: "model" },
  { id: "ST04", name: "[40K] (60x) Fiyat alabilirmiyim", input: body("Fiyat alabilirmiyim"), expectReplyIncludes: "model" },
  { id: "ST05", name: "[40K] (56x) Fiyat ne kadar", input: body("Fiyat ne kadar"), expectReplyIncludes: "model" },
  { id: "ST06", name: "[40K] (43x) Fiyat alabilir miyim", input: body("Fiyat alabilir miyim"), expectReplyIncludes: "model" },

  // --- malzeme (46x çelik mi) ---
  { id: "ST07", name: "[40K] (46x) Çelik mi", input: body("Çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "ST08", name: "[40K] (13x) Çelikmi", input: body("Çelikmi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "ST09", name: "[40K] (9x) Gümüş mü", input: body("Gümüş mü", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "ST10", name: "[40K] (4x) Materyali nedir", input: body("Ürünün materyali nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },

  // --- kararma (35x) ---
  { id: "ST11", name: "[40K] (35x) Kararma yapar mı", input: body("Kararma yapar mı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kararma" },
  { id: "ST12", name: "[40K] (22x) Kararma yapıyor mu", input: body("Kararma yapıyor mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kararma" },
  { id: "ST13", name: "[40K] (10x) Kararma olur mu", input: body("Kararma olur mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kararma" },
  { id: "ST14", name: "[40K] (10x) Kararma yaparmı", input: body("Kararma yaparmı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kararma" },

  // --- kargo (23x kaç günde) ---
  { id: "ST15", name: "[40K] (23x) Kaç günde gelir", input: body("Kaç günde gelir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },
  { id: "ST16", name: "[40K] (15x) Kaç güne gelir", input: body("Kaç güne gelir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },
  { id: "ST17", name: "[40K] (6x) Ne zaman gelir", input: body("Ne zaman gelir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },
  { id: "ST18", name: "[40K] (5x) Hangi kargo", input: body("Hangi kargo", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "PTT" },

  // --- ödeme (68x kapıda) ---
  { id: "ST19", name: "[40K] (68x) Kapıda ödeme", input: body("Kapıda ödeme", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "odeme" },
  { id: "ST20", name: "[40K] (24x) eft", input: body("eft", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "EFT" },
  { id: "ST21", name: "[40K] (7x) Kapıda ödeme var mı", input: body("Kapıda ödeme var mı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "odeme" },

  // --- zincir (7x) ---
  { id: "ST22", name: "[40K] (7x) Zincir uzunluğu nedir", input: body("Zincir uzunluğu nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },
  { id: "ST23", name: "[40K] (4x) Zincir kaç cm", input: body("Zincir kaç cm", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },
  { id: "ST24", name: "[40K] (7x) Zincir ürünsüz", input: body("Zincir uzunluğu nedir"), expectReplyIncludes: "cm" },

  // --- arka yazı/foto ---
  { id: "ST25", name: "[40K] (4x) Arkalı önlü", input: body("Arkalı önlü"), expectReplyIncludes: "foto" },
  { id: "ST26", name: "[40K] (3x) Arka yazı", input: body("Arka yazı"), expectReplyIncludes: "arka" },
  { id: "ST27", name: "[40K] (2x) İki resim oluyor mu", input: body("İki resim oluyor mu"), expectReplyIncludes: "foto" },

  // --- sipariş başlatma (48x) ---
  { id: "ST28", name: "[40K] (48x) Sipariş vermek istiyorum", input: body("Sipariş vermek istiyorum", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "TL" },
  { id: "ST29", name: "[40K] (14x) Yaptırmak istiyorum", input: body("Yaptırmak istiyorum", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "TL" },
  { id: "ST30", name: "[40K] (8x) Bende yaptırmak istiyorum", input: body("Bende yaptırmak istiyorum", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "TL" },
  { id: "ST31", name: "[40K] (7x) Nasıl sipariş verebilirim", input: body("Nasıl sipariş verebilirim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "TL" },

  // --- lokasyon (963x!) ---
  { id: "ST32", name: "[40K] (963x) Yeriniz nerede?", input: body("Yeriniz nerede?"), expectReplyIncludes: "Eminonu" },
  { id: "ST33", name: "[40K] (7x) yeriniz nerde", input: body("yeriniz nerde"), expectReplyIncludes: "Eminonu" },

  // --- smalltalk ---
  { id: "ST34", name: "[40K] (274x) Merhaba", input: body("Merhaba"), expectReplyNotIncludes: "Ekibimize iletiyorum" },
  { id: "ST35", name: "[40K] (254x) Teşekkür ederim", input: body("Teşekkür ederim"), expectReplyNotIncludes: "Ekibimize iletiyorum" },
  { id: "ST36", name: "[40K] (187x) Teşekkürler", input: body("Teşekkürler"), expectReplyNotIncludes: "Ekibimize iletiyorum" },
  { id: "ST37", name: "[40K] (46x) Kolay gelsin", input: body("Kolay gelsin"), expectReplyNotIncludes: "Ekibimize iletiyorum" },
  { id: "ST38", name: "[40K] (31x) Allah razı olsun", input: body("Allah razı olsun"), expectReplyNotIncludes: "Ekibimize iletiyorum" },

  // --- detay (1602x!) ---
  { id: "ST39", name: "[40K] (1602x) Detay", input: body("Detay"), expectReplyIncludes: "model" },
  { id: "ST40", name: "[40K] (12x) Bilgi alabilir miyim", input: body("Bilgi alabilir miyim"), expectReplyIncludes: "model" },

  // --- post-sale ---
  { id: "ST41", name: "[40K] (8x) Neden cevap vermiyorsunuz", input: body("Neden cevap vermiyorsunuz", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "ST42", name: "[40K] (7x) Siparişim hazır mı", input: body("Siparişim hazır mı", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 28: MIXED MESSAGE SUITE (MX01–MX20)
  // Smalltalk + soru birleşik mesajlar — soru intent'i kazanmalı
  // ════════════════════════════════════════════════════════════════════════

  // --- Smalltalk + chain/boyut ---
  { id: "MX01", name: "[MIX] Beğendim + boyut", input: body("Beğendim ama boyutu ne kadar", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "chain_question" } },
  { id: "MX02", name: "[MIX] Güzel + zincir cm", input: body("Çok güzel zinciri kaç cm", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "chain_question" } },

  // --- Smalltalk + trust ---
  { id: "MX03", name: "[MIX] Sağlık + kararma", input: body("Ellerinize sağlık kararır mı", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "trust" } },
  { id: "MX04", name: "[MIX] Güzel + kararma yapar mı", input: body("Çok güzel olmuş kararma yapar mı", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "trust" } },

  // --- Smalltalk + material ---
  { id: "MX05", name: "[MIX] Teşekkür + çelik mi", input: body("Teşekkürler çelik mi peki", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "material_question" } },
  { id: "MX06", name: "[MIX] Kolay gelsin + dayanıklı mı", input: body("Kolay gelsin suya dayanıklı mı", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "material_question" } },

  // --- Smalltalk + price ---
  { id: "MX07", name: "[MIX] Güzelmiş + fiyat", input: body("Çok güzelmiş fiyat nedir", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "price" } },
  { id: "MX08", name: "[MIX] Beğendim + ne kadar", input: body("Beğendim ne kadar acaba", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "price" } },

  // --- Smalltalk + shipping ---
  { id: "MX09", name: "[MIX] Tamam da + kargo", input: body("Tamam da kargo kaç günde gelir", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "shipping" } },
  { id: "MX10", name: "[MIX] Sağlık + kargo ne kadar", input: body("Elinize sağlık ama kargo ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },

  // --- Smalltalk + back text/photo ---
  { id: "MX11", name: "[MIX] Bayıldım + arka yazı", input: body("Bayıldım arkasına yazı oluyor mu", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "back_text_info" } },
  { id: "MX12", name: "[MIX] Teşekkür + iki resim", input: body("Teşekkür ederim iki resim olur mu", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "back_photo_info" } },

  // --- Smalltalk + payment ---
  { id: "MX13", name: "[MIX] Harika + kapıda ödeme var mı", input: body("Harika olmuş kapıda ödeme var mı", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "payment" } },

  // --- Pure smalltalk hala çalışmalı (regression) ---
  { id: "MX14", name: "[MIX] Pure: Geçmiş olsun → smalltalk", input: body("Çok geçmiş olsun", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "smalltalk" } },
  { id: "MX15", name: "[MIX] Pure: Kolay gelsin → smalltalk", input: body("Kolay gelsin", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "smalltalk" } },
  { id: "MX16", name: "[MIX] Pure: Teşekkür ederim → smalltalk", input: body("Teşekkür ederim"), expect: { last_intent: "smalltalk" } },
  { id: "MX17", name: "[MIX] Pure: Allah razı olsun → smalltalk", input: body("Allah razı olsun"), expect: { last_intent: "smalltalk" } },
  { id: "MX18", name: "[MIX] Pure: Merhaba → smalltalk", input: body("Merhaba"), expect: { last_intent: "smalltalk" } },
  { id: "MX19", name: "[MIX] Pure: Çok beğendim → smalltalk", input: body("Çok beğendim"), expect: { last_intent: "smalltalk" } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 29: PRODUCTION LOG REGRESSION (PL001–PL120)
  // 3309 gerçek production mesajından çıkarılmış regression testleri
  // ════════════════════════════════════════════════════════════════════════
  { id: "PL001", name: "[PROD] (1x) human_su: Off vazgeçtim yaaa", input: body("Off vazgeçtim yaaa", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL002", name: "[PROD] (1x) human_su: Kolay gelsin siparişim henüz g", input: body("Kolay gelsin siparişim henüz gelmedi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL003", name: "[PROD] (1x) human_su: Bekliyorum", input: body("Bekliyorum", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL004", name: "[PROD] (1x) human_su: Cvp", input: body("Cvp", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL005", name: "[PROD] (1x) human_su: Cvp siparişim henüz gelmedi", input: body("Cvp siparişim henüz gelmedi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL006", name: "[PROD] (1x) human_su: Bugün gelir mi", input: body("Bugün gelir mi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL007", name: "[PROD] (1x) human_su: Siparişim", input: body("Siparişim", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL008", name: "[PROD] (1x) human_su: Peki cvp bekliyorum", input: body("Peki cvp bekliyorum", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL009", name: "[PROD] (1x) human_su: Ekibi iletmediniz mi", input: body("Ekibi iletmediniz mi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL010", name: "[PROD] (1x) human_su: Ekibine iletmediniz mi sipariş", input: body("Ekibine iletmediniz mi siparişim henüz gelmedi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL011", name: "[PROD] (1x) human_su: Kargom halen gelmedi", input: body("Kargom halen gelmedi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL012", name: "[PROD] (1x) human_su: Herkesin kargosu eline ulaştı ", input: body("Herkesin kargosu eline ulaştı benim yok", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL013", name: "[PROD] (1x) human_su: Gerçekten çok sinir oldume", input: body("Gerçekten çok sinir oldume", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL014", name: "[PROD] (1x) human_su: Ekibinizden haber gelmedi mi", input: body("Ekibinizden haber gelmedi mi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL015", name: "[PROD] (1x) human_su: PPT kargola göndermişsiniz mes", input: body("PPT kargola göndermişsiniz mesaj geldi dün Telsim edeceğiz d", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL016", name: "[PROD] (14x) order_co: [PHONE]", input: body("[PHONE]", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL017", name: "[PROD] (7x) order_co: Teşekkür ederim", input: body("Teşekkür ederim", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL018", name: "[PROD] (7x) order_co: Evet", input: body("Evet", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL019", name: "[PROD] (7x) order_co: Tamamdır", input: body("Tamamdır", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL020", name: "[PROD] (7x) order_co: Tamam", input: body("Tamam", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL021", name: "[PROD] (5x) order_co: Merhaba", input: body("Merhaba", lazerCompleted()), expectReplyIncludes: "merhaba" },
  { id: "PL022", name: "[PROD] (5x) order_co: Bekliyorum", input: body("Bekliyorum", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL023", name: "[PROD] (4x) order_co: Teşekkürler", input: body("Teşekkürler", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL024", name: "[PROD] (3x) order_co: Merhaba kolyeyi yapınca fotoğr", input: body("Merhaba kolyeyi yapınca fotoğrafını atabilir misiniz", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PL025", name: "[PROD] (2x) order_co: Çok teşekkür ederim", input: body("Çok teşekkür ederim", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL026", name: "[PROD] (2x) order_co: Tamam teşekkür ederim", input: body("Tamam teşekkür ederim", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL027", name: "[PROD] (2x) order_co: Tesekkurler", input: body("Tesekkurler", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL028", name: "[PROD] (2x) order_co: Merhabalar", input: body("Merhabalar", lazerCompleted()), expectReplyIncludes: "merhaba" },
  { id: "PL029", name: "[PROD] (2x) order_co: Teşekkürler 🌸", input: body("Teşekkürler 🌸", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL030", name: "[PROD] (2x) order_co: Teşekür ederim", input: body("Teşekür ederim", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL031", name: "[PROD] (18x) waiting_: Kapıda ödeme", input: body("Kapıda ödeme", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL032", name: "[PROD] (10x) waiting_: [PHONE]", input: body("[PHONE]", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "PL033", name: "[PROD] (4x) waiting_: Eft", input: body("Eft", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL034", name: "[PROD] (4x) waiting_: Slm", input: body("Slm", lazerWaitingAddress()), expectReplyIncludes: "merhaba" },
  { id: "PL035", name: "[PROD] (3x) waiting_: Bekliyorum", input: body("Bekliyorum", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL036", name: "[PROD] (3x) waiting_: Merhaba", input: body("Merhaba", lazerWaitingAddress()), expectReplyIncludes: "merhaba" },
  { id: "PL037", name: "[PROD] (3x) waiting_: Kapıda ödeme olsun", input: body("Kapıda ödeme olsun", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL038", name: "[PROD] (3x) waiting_: Tamamdır", input: body("Tamamdır", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "PL039", name: "[PROD] (3x) waiting_: Amin", input: body("Amin", lazerWaitingAddress()), expectReplyIncludes: "efendim" },
  { id: "PL040", name: "[PROD] (3x) waiting_: Selam", input: body("Selam", lazerWaitingAddress()), expectReplyIncludes: "merhaba" },
  { id: "PL041", name: "[PROD] (2x) waiting_: Kapida", input: body("Kapida", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL042", name: "[PROD] (2x) waiting_: Kapida odeme", input: body("Kapida odeme", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL043", name: "[PROD] (2x) waiting_: Havale", input: body("Havale", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL044", name: "[PROD] (2x) waiting_: Kapıda", input: body("Kapıda", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL045", name: "[PROD] (2x) waiting_: Tamam teşekkürler", input: body("Tamam teşekkürler", lazerWaitingAddress()), expectReplyIncludes: "rica" },
  { id: "PL046", name: "[PROD] (2x) waiting_: Cok begendım", input: body("Cok begendım", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "efendim" },
  { id: "PL047", name: "[PROD] (2x) waiting_: Fiyat nedir", input: body("Fiyat nedir", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL048", name: "[PROD] (1x) waiting_: Emeğimize saglık", input: body("Emeğimize saglık", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL049", name: "[PROD] (1x) waiting_: 😄😄😄😄😄", input: body("😄😄😄😄😄", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL050", name: "[PROD] (1x) waiting_: Merhabalar  ben iki tane daha ", input: body("Merhabalar  ben iki tane daha yaptırmak istiyorum hediye ola", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL051", name: "[PROD] (1x) waiting_: Tamamdır çok teşekkür ederim", input: body("Tamamdır çok teşekkür ederim", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "rica" },
  { id: "PL052", name: "[PROD] (1x) waiting_: Ben dekontu sıze atamadım", input: body("Ben dekontu sıze atamadım", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL053", name: "[PROD] (1x) waiting_: Emegınıze saglık", input: body("Emegınıze saglık", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "efendim" },
  { id: "PL054", name: "[PROD] (1x) waiting_: Ben tsk ederım", input: body("Ben tsk ederım", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "rica" },
  { id: "PL055", name: "[PROD] (1x) waiting_: Merhabalar", input: body("Merhabalar", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "merhaba" },
  { id: "PL056", name: "[PROD] (1x) waiting_: Ürünüm elime ulaşmadı henğz", input: body("Ürünüm elime ulaşmadı henğz", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL057", name: "[PROD] (1x) waiting_: Bir kargo takip numarası rica ", input: body("Bir kargo takip numarası rica ediyorum", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL058", name: "[PROD] (1x) waiting_: Teşekkür ederim", input: body("Teşekkür ederim", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "rica" },
  { id: "PL059", name: "[PROD] (1x) waiting_: Size asla ulaşamıyorum gerçekt", input: body("Size asla ulaşamıyorum gerçekten ayıp ettnz ama yani", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL060", name: "[PROD] (1x) waiting_: Şimdi yaptirmicam sadece fiyat", input: body("Şimdi yaptirmicam sadece fiyatını sordun", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL061", name: "[PROD] (2x) waiting_: Teşekkür ederim", input: body("Teşekkür ederim", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "rica" },
  { id: "PL062", name: "[PROD] (2x) waiting_: Bir ürünün fiyatını kontrol ed", input: body("Bir ürünün fiyatını kontrol edebilir misiniz?", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL063", name: "[PROD] (1x) waiting_: Hediye olacak hepsi bir tane d", input: body("Hediye olacak hepsi bir tane daha eklenecek siparişe inceley", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL064", name: "[PROD] (1x) waiting_: Aslında üç olacak  dorduncunun", input: body("Aslında üç olacak  dorduncunun bilgilerini ilecegim size", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL065", name: "[PROD] (1x) waiting_: Birazdan sizlere bilgileri ata", input: body("Birazdan sizlere bilgileri atac", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL066", name: "[PROD] (1x) waiting_: Atacam", input: body("Atacam", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL067", name: "[PROD] (1x) waiting_: Çelikmidir", input: body("Çelikmidir", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "paslanmaz" },
  { id: "PL068", name: "[PROD] (1x) waiting_: Yeriniz nerede", input: body("Yeriniz nerede", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL069", name: "[PROD] (1x) waiting_: Kolye çift taraflı resim oluyo", input: body("Kolye çift taraflı resim oluyor mu", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL070", name: "[PROD] (1x) waiting_: Pekı 4kısı yapabılıyor musunuz", input: body("Pekı 4kısı yapabılıyor musunuz", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL071", name: "[PROD] (1x) waiting_: Merhaba kolye sipariş etmistim", input: body("Merhaba kolye sipariş etmistim İtalyan  zincir istyrm var mi", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL072", name: "[PROD] (1x) waiting_: Fiyatı aynı mı oluyor", input: body("Fiyatı aynı mı oluyor", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL073", name: "[PROD] (1x) waiting_: Olur", input: body("Olur", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL074", name: "[PROD] (1x) waiting_: Teşekkür ederim tekrardan iyi ", input: body("Teşekkür ederim tekrardan iyi çalışmalar 😊", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "rica" },
  { id: "PL075", name: "[PROD] (1x) waiting_: Merhaba", input: body("Merhaba", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "merhaba" },
  { id: "PL076", name: "[PROD] (6x) waiting_: Yok", input: body("Yok", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL077", name: "[PROD] (5x) waiting_: Evet", input: body("Evet", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL078", name: "[PROD] (3x) waiting_: Selam", input: body("Selam", lazerWaitingPayment()), expectReplyIncludes: "merhaba" },
  { id: "PL079", name: "[PROD] (2x) waiting_: Ne kadar", input: body("Ne kadar", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL080", name: "[PROD] (2x) waiting_: Tamam", input: body("Tamam", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL081", name: "[PROD] (2x) waiting_: 😊🙏", input: body("😊🙏", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL082", name: "[PROD] (2x) waiting_: Mucizelerim Hira Umut", input: body("Mucizelerim Hira Umut", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL083", name: "[PROD] (2x) waiting_: 2026-02-16 00:00:00", input: body("2026-02-16 00:00:00", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL084", name: "[PROD] (2x) waiting_: Gümüş olsun lütfen", input: body("Gümüş olsun lütfen", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL085", name: "[PROD] (2x) waiting_: Nerden sipariş veriyorum", input: body("Nerden sipariş veriyorum", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL086", name: "[PROD] (1x) waiting_: Babamı yeni kaybettim annem ha", input: body("Babamı yeni kaybettim annem hayatta siz uygun birşey yazarsa", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL087", name: "[PROD] (1x) waiting_: Evet eklemek isterim tabi", input: body("Evet eklemek isterim tabi", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL088", name: "[PROD] (1x) waiting_: Sonsuzluk işareti iki tane kal", input: body("Sonsuzluk işareti iki tane kalp", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL089", name: "[PROD] (1x) waiting_: Fiyat", input: body("Fiyat", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL090", name: "[PROD] (1x) waiting_: Bu fotoyu yapmak istiyorum", input: body("Bu fotoyu yapmak istiyorum", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL091", name: "[PROD] (60x) waiting_: Resimli lazer kolye", input: body("Resimli lazer kolye", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL092", name: "[PROD] (26x) waiting_: Teşekkür ederim", input: body("Teşekkür ederim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "rica" },
  { id: "PL093", name: "[PROD] (25x) waiting_: Bir ürünün fiyatını kontrol ed", input: body("Bir ürünün fiyatını kontrol edebilir misiniz?", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL094", name: "[PROD] (24x) waiting_: Teşekkürler", input: body("Teşekkürler", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "rica" },
  { id: "PL095", name: "[PROD] (13x) waiting_: Resimli kolye", input: body("Resimli kolye", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL096", name: "[PROD] (9x) waiting_: Tamam", input: body("Tamam", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL097", name: "[PROD] (8x) waiting_: Bu", input: body("Bu", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL098", name: "[PROD] (7x) waiting_: Fiyat", input: body("Fiyat", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL099", name: "[PROD] (6x) waiting_: Fiyat ne kadar", input: body("Fiyat ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL100", name: "[PROD] (6x) waiting_: Resimli", input: body("Resimli", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL101", name: "[PROD] (6x) waiting_: Resimli olan", input: body("Resimli olan", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL102", name: "[PROD] (5x) waiting_: Resimli lazer", input: body("Resimli lazer", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL103", name: "[PROD] (5x) waiting_: Fiyat nedir", input: body("Fiyat nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL104", name: "[PROD] (5x) waiting_: Merhaba", input: body("Merhaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "merhaba" },
  { id: "PL105", name: "[PROD] (4x) waiting_: Çelik mi", input: body("Çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "PL106", name: "[PROD] (77x) waiting_: Bir ürünün fiyatını kontrol ed", input: body("Bir ürünün fiyatını kontrol edebilir misiniz?", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL107", name: "[PROD] (27x) waiting_: Ürün satın alabilir miyim?", input: body("Ürün satın alabilir miyim?", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL108", name: "[PROD] (22x) waiting_: Yeriniz nerede?", input: body("Yeriniz nerede?", { menu_gosterildi: "evet" }), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL109", name: "[PROD] (5x) waiting_: Fiyat nedir", input: body("Fiyat nedir", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL110", name: "[PROD] (2x) waiting_: Resimi kolye", input: body("Resimi kolye", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL111", name: "[PROD] (2x) waiting_: Fiyat", input: body("Fiyat", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL112", name: "[PROD] (2x) waiting_: Bu ürün", input: body("Bu ürün", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL113", name: "[PROD] (2x) waiting_: Fiyatı nedir", input: body("Fiyatı nedir", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL114", name: "[PROD] (2x) waiting_: Bu", input: body("Bu", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL115", name: "[PROD] (1x) waiting_: Kolye fiyati ne kadar", input: body("Kolye fiyati ne kadar", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL116", name: "[PROD] (1x) waiting_: Bu resmi düz ayarlayıp yapma ş", input: body("Bu resmi düz ayarlayıp yapma şansınız varmı", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL117", name: "[PROD] (1x) waiting_: Kolyeleri aldık bu arada çok b", input: body("Kolyeleri aldık bu arada çok beğendik", { menu_gosterildi: "evet" }), expectReplyIncludes: "efendim" },
  { id: "PL118", name: "[PROD] (1x) waiting_: Daha önce yapılan", input: body("Daha önce yapılan", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL119", name: "[PROD] (1x) waiting_: Sipariş ettiğim ürün gelmedi", input: body("Sipariş ettiğim ürün gelmedi", { menu_gosterildi: "evet" }), expectReplyIncludes: "ekibimiz" },
  { id: "PL120", name: "[PROD] (1x) waiting_: Fiyat nedr", input: body("Fiyat nedr", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "MX20", name: "[MIX] Pure: İnşallah → smalltalk", input: body("İnşallah"), expect: { last_intent: "smalltalk" } },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 30: BUG FIX REGRESSION v2 (BF01–BF45)
  // Production log'dan çıkarılmış gerçek bug fix testleri
  // ════════════════════════════════════════════════════════════════════════

  // --- Gönderdim/Yolladım pattern (foto kabul) ---
  { id: "BF01", name: "[BF] Gönderdim w_photo → kabul et", input: body("Gönderdim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "BF02", name: "[BF] Yolladım w_photo → kabul et", input: body("Yolladım fotoğrafı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "BF03", name: "[BF] Attım w_photo → kabul et", input: body("Attım fotoğrafı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "BF04", name: "[BF] Yukarıda w_photo → kabul et", input: body("Yukarıda gönderdim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "BF05", name: "[BF] Gönderdim w_address → kabul et", input: body("Gönderdim bilgileri", lazerWaitingAddress()), expectReplyIncludes: "aldim" },
  { id: "BF06", name: "[BF] Yazdım w_back_text → kabul et", input: body("Yazdım yukarıda", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "aldim" },

  // --- Fiyat pazarlık koruması ---
  { id: "BF07", name: "[BF] 600 TL olur mu → pazarlık reddi", input: body("600 TL olur mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "sabit" },
  { id: "BF08", name: "[BF] 550 yap → pazarlık reddi", input: body("550 tl yap", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "sabit" },
  { id: "BF09", name: "[BF] Çok pahalı → çoklu alım öner", input: body("Çok pahalı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "coklu" },
  { id: "BF10", name: "[BF] İndirim var mı → çoklu alım öner", input: body("İndirim var mı acaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "coklu" },

  // --- Foto keyword daraltma ---
  { id: "BF11", name: "[BF] Çıplak URL w_photo → müşteri fotoğrafı", input: body("https://lookaside.fbsbx.com/photo.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "photo", photo_received: "1" } },
  { id: "BF12", name: "[BF] URL + bu model → product_image_reference", input: body("https://lookaside.fbsbx.com/photo.jpg bu model olsun", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "product_image_reference" } },
  { id: "BF13", name: "[BF] URL + bu olur mu → müşteri fotoğrafı (bu tek kelime)", input: body("https://lookaside.fbsbx.com/photo.jpg bu olur mu", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "photo" } },
  { id: "BF14", name: "[BF] URL + bunu istiyorum → müşteri fotoğrafı (bunu tek kelime)", input: body("https://lookaside.fbsbx.com/photo.jpg bunu istiyorum", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "photo" } },
  { id: "BF15", name: "[BF] URL w_back_text → back_photo_upload", input: body("https://lookaside.fbsbx.com/photo.jpg", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { last_intent: "back_photo_upload" } },

  // --- Soru algılama ("Tabi efendim" deme koruması) ---
  { id: "BF16", name: "[BF] Kaç resim koyabiliyorsunuz → cevap ver", input: body("Kaç resim koyabiliyorsunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "fotograf koyabil" },
  { id: "BF17", name: "[BF] Gümüş yapabiliyor musunuz → çelik", input: body("Gümüş yapabiliyor musunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "BF18", name: "[BF] Yapım aşamanız nasıl → süreç anlat", input: body("Yapım aşamanız nasıl", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "grafiker" },
  { id: "BF19", name: "[BF] Tel alabilir miyim → WhatsApp", input: body("Tel alabilir miyim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "0534" },
  { id: "BF20", name: "[BF] Kapıda ödeme nedir → açıklama", input: body("Kapıda ödeme nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "nakit" },
  { id: "BF21", name: "[BF] 3 lü yapıyor musunuz → evet cevap", input: body("3 lü yapıyormusunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "fotograf koyabil" },

  // --- Bitince paylaşır mısınız ---
  { id: "BF22", name: "[BF] Bitince paylaşırsanız sevinirim", input: body("Bitince benimle paylaşırsanız sevinirim", lazerCompleted()), expectReplyIncludes: "paylasiyoruz" },
  { id: "BF23", name: "[BF] Hazır olunca foto atar mısınız", input: body("Hazır olunca foto atar mısınız", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paylasiyoruz" },
  { id: "BF24", name: "[BF] Göndermeden önce paylaşır mısınız", input: body("Göndermeden önce paylaşır mısınız", lazerCompleted()), expectReplyIncludes: "paylasiyoruz" },

  // --- Göndermiş olduğum foto uygun mu ---
  { id: "BF25", name: "[BF] Göndermiş olduğum foto uygun mu", input: body("Göndermiş olduğum foto uygun mu acaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "ulasti" },

  // --- Renk tercihi ---
  { id: "BF26", name: "[BF] Bu renkte istiyorum w_payment → not aldım + ödeme sor", input: body("Bu renkte istiyorum", lazerWaitingPayment()), expectReplyIncludes: "not aldim" },
  { id: "BF27", name: "[BF] Gold renk olsun w_photo → not aldım + foto iste", input: body("Gold renk olsun", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "not aldim" },

  // --- Sipariş onay algılama ---
  { id: "BF28", name: "[BF] Siparişiniz oluşturuldu → order onay", input: body("Siparişiniz oluşturuldu", lazerCompleted()), expectReplyIncludes: "onaylanmistir" },

  // --- Dönüş yapacağım → kargo DEĞİL ---
  { id: "BF29", name: "[BF] Birkaç gün içinde dönüş yapacağım → bekliyoruz", input: body("Tamam birkaç gün içinde dönüş yapacağım", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "bekliyoruz" },
  { id: "BF30", name: "[BF] Tekrar döneceğim teşekkürler → bekliyoruz", input: body("Tekrar döneceğim teşekkürler", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "bekliyoruz" },

  // --- Cross-product fiyat ---
  { id: "BF31", name: "[BF] Harfli ataç fiyatı lazer'da → 499", input: body("Harfli ataç kolyenin fiyatı nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "499" },
  { id: "BF32", name: "[BF] Resimli kolye fiyatı ataç'ta → 599", input: body("Resimli lazer kolye fiyatı nedir", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "599" },

  // --- Keyword typo fix ---
  { id: "BF33", name: "[BF] Kalida odeme → kapıda", input: body("Kalida odeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "BF34", name: "[BF] Nakit → kapıda ödeme", input: body("Nakit", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "BF35", name: "[BF] Zincirin uzunluğu nekadar → 60cm", input: body("Zincirin boyu yani uzunluğu nekadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },

  // --- Ada 10.06.2020 completed'da → not al + ekibe yönlendir ---
  { id: "BF36", name: "[BF] Ada 10.06.2020 completed → ekibimiz", input: body("Ada 10.06.2020 yazılacak isim ve doğum tarihi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // --- Negatif testler (yanlış tetiklenmemeli) ---
  { id: "BF37", name: "[BF] Normal fiyat sorusu → pazarlık reddi DEĞİL", input: body("Fiyat ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "599" },
  { id: "BF38", name: "[BF] Merhaba → WhatsApp DEĞİL", input: body("Merhaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "0534" },
  { id: "BF39", name: "[BF] Tamam → pazarlık reddi DEĞİL", input: body("Tamam", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "sabit" },
  { id: "BF40", name: "[BF] Kapıda ödeme olsun → nedir açıklama DEĞİL", input: body("Kapıda ödeme olsun", lazerWaitingPayment()), expectReplyNotIncludes: "nakit olarak" },

  // --- Gümüş model bilgi ---
  { id: "BF41", name: "[BF] Gümüş olsun lütfen w_payment → not al", input: body("Gümüş olsun lütfen", lazerWaitingPayment()), expectReplyIncludes: "celik" },

  // --- Teyit sorusu ---
  { id: "BF42", name: "[BF] Teyit için kapıda ödeme nedir → açıklama", input: body("Teyit için kapıda ödeme nedir", lazerWaitingPayment()), expectReplyIncludes: "nakit" },

  // --- Çok pahalıymış ---
  { id: "BF43", name: "[BF] Çok pahalıymış → Tabi efendim DEMEMELİ", input: body("Çok pahalıymış", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "tabi efendim" },

  // --- Sipariş tamamlandı ama still fallback check ---
  { id: "BF44", name: "[BF] 650 tl dimi completed → sabit fiyat cevabı", input: body("650 tl dimi", lazerCompleted()), expectReplyIncludes: "649" },
  { id: "BF45", name: "[BF] Fotograflar silinir mi → ekibimiz", input: body("Fotograflar silinir mi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 31: PRODUCTION LOG TUR 2-3 (LT01–LT50)
  // Gerçek production loglarından çıkarılmış bug fix + regression testleri
  // ════════════════════════════════════════════════════════════════════════

  // --- Malzeme / Metal / Gümüş ---
  { id: "LT01", name: "[LT] Metal → malzeme cevabı", input: body("Metal", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "LT02", name: "[LT] Gümüş mü → çelik + kaplama var", input: body("Gümüş mü", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kaplama" },
  { id: "LT03", name: "[LT] Gümüş yapabiliyor musunuz → kaplama", input: body("Gümüş yapabiliyor musunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kaplama" },
  { id: "LT04", name: "[LT] Yuvarlak plakanın ölçüsü → 3 cm", input: body("Yuvarlak plakanın ölçüsü nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "3 cm" },

  // --- Duygusal mesaj ---
  { id: "LT05", name: "[LT] Oğlum vefat etti → başsağlığı", input: body("Oğlum vefat etti onun için yaptırıyorum", lazerWaitingPayment()), expectReplyIncludes: "basini" },
  { id: "LT06", name: "[LT] Allah razı olsun → cümlemizden", input: body("Allah razı olsun", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "cumlemizden" },

  // --- Ödeme algılama ---
  { id: "LT07", name: "[LT] Hesaptan atıcam → EFT kabul", input: body("Hesaptan atıcam", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },
  { id: "LT08", name: "[LT] Ücreti attım kontrol edin → ekibimiz", input: body("Ücreti attım kontrol eder misiniz", lazerWaitingAddress()), expectReplyIncludes: "ekibimiz" },
  { id: "LT09", name: "[LT] Parayı gönderdim → ekibimiz kontrol", input: body("Parayı gönderdim", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // --- Kargo kapsamı ---
  { id: "LT10", name: "[LT] Her yere kargo var mı → evet her yere", input: body("Her yere kargo varmı bana yakın gerek", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "her yeri" },
  { id: "LT11", name: "[LT] Alibeyköydeyim → kargo var", input: body("Alibeyköydeyim ben", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "LT12", name: "[LT] Artı kargo dimi → ücretsiz", input: body("Artı kargo dimi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "ucretsiz" },
  { id: "LT13", name: "[LT] PTT kargo ile gönderim var mı → evet PTT", input: body("PTT kargo ile gönderim varmı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "PTT" },
  { id: "LT14", name: "[LT] Kargo mesajı atar mısınız → ekibimiz (completed)", input: body("Kargo mesajını da atar mısınız", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // --- Sitem / Bekleme ---
  { id: "LT15", name: "[LT] Bana dönecektiniz ama → özür + ekibimiz", input: body("Bana dönecektiniz ama", lazerWaitingAddress()), expectReplyIncludes: "ozur" },
  { id: "LT16", name: "[LT] İlettim ama yeniden mi göndereyim → aldık", input: body("İlettim ama yeniden mi göndereyim anlayamadım", lazerWaitingAddress()), expectReplyIncludes: "aldim" },

  // --- Beğeni + akış devamı ---
  { id: "LT17", name: "[LT] Çok tatlı duruyor w_address → teşekkür + adres sor", input: body("Çok tatlı duruyor 🥰", lazerWaitingAddress()), expectReplyIncludes: "tesekkur" },

  // --- Arkalı önlü + fiyat ---
  { id: "LT18", name: "[LT] İki çocuğum arkalı önlü ne kadar → fiyat farkı yok", input: body("İki çocuğum var arkalı önlü ne kadar olur", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "fark" },

  // --- Çoklu foto / resim ---
  { id: "LT19", name: "[LT] 3 resim aynı karede olur mu → evet", input: body("İyi günler 3 resim aynı karede oluyor mu acaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "evet" },
  { id: "LT20", name: "[LT] Birleştirip yapıyor musunuz → evet birleştiriyoruz", input: body("Çocukların fotoğrafını ayrı ayrı yollasak birleştirip yapıyor musunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "evet" },
  { id: "LT21", name: "[LT] Örnek var mıdır üçlü → ekibimiz gönderecek", input: body("Örnek var mıdır üçlü", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "ekibimiz" },
  { id: "LT22", name: "[LT] 5 kişi tek yüze olur mu → evet", input: body("5 kişi tek yüze olur mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "evet" },

  // --- Bundan olacak / istiyorum ---
  { id: "LT23", name: "[LT] Bundan olacak → not aldım + foto iste", input: body("Bundan olacak", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "not aldim" },
  { id: "LT24", name: "[LT] Bu resimli kolye → fallback DEĞİL", input: body("Bu resimli kolye", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },

  // --- Yapım süreci / değişiklik ---
  { id: "LT25", name: "[LT] Resimde değişiklik olmaz dimi → grafiker açıkla", input: body("Resimde de herhangi bir değişiklik olmaz dimi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "grafiker" },
  { id: "LT26", name: "[LT] Yapay zeka ile mi yapıyorsunuz → hayır", input: body("Yapay zeka ile mi yapıyorsunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "yapay zeka kullanmiyoruz" },

  // --- Dönüş yapacağım ---
  { id: "LT27", name: "[LT] Düşünüp size göndereceğim → bekliyoruz", input: body("Düşünüp size göndereceğim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "bekliyoruz" },

  // --- Ne zaman elimde olur ---
  { id: "LT28", name: "[LT] Ne zaman elimde olur sipariş versem → kargo süresi", input: body("Ne zaman elimde olur sipariş versem", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },

  // --- Kapıda ödeme w_back_text → kabul et ---
  { id: "LT29", name: "[LT] Tamam kapıda ödeme olur mu w_back_text → ödeme kabul", input: body("Tamam kapıda ödeme olurmu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { payment_method: "kapida_odeme" } },

  // --- Sipariş onay ---
  { id: "LT30", name: "[LT] Siparişiniz oluşturuldu completed → onay", input: body("Siparişiniz oluşturuldu", lazerCompleted()), expectReplyIncludes: "onaylanmistir" },
  { id: "LT31", name: "[LT] Siparişiniz alındı completed → onay", input: body("Siparişiniz alındı", lazerCompleted()), expectReplyIncludes: "onaylanmistir" },

  // --- Negatif testler (yanlış tetiklenmemeli) ---
  { id: "LT32", name: "[LT] Normal EFT → pazarlık reddi DEĞİL", input: body("EFT ile ödeyeceğim", lazerWaitingPayment()), expectReplyNotIncludes: "sabit" },
  { id: "LT33", name: "[LT] Merhaba → başsağlığı DEĞİL", input: body("Merhaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "basini" },
  { id: "LT34", name: "[LT] Tamam → birleştirme cevabı DEĞİL", input: body("Tamam", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "birlestir" },
  { id: "LT35", name: "[LT] Fiyat → kaplama cevabı DEĞİL", input: body("Fiyat ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "kaplama" },
  { id: "LT36", name: "[LT] Kapıda ödeme olsun → nedir cevabı DEĞİL", input: body("Kapıda ödeme olsun", lazerWaitingPayment()), expectReplyNotIncludes: "kurye" },
  { id: "LT37", name: "[LT] Çelik mi → gümüş kaplama DEĞİL (normal celik cevabı)", input: body("Çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },

  // --- Kargo süresi farklı sorular ---
  { id: "LT38", name: "[LT] Kaç güne hazır olur → kargo süresi", input: body("Kaç güne hazır olur", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },
  { id: "LT39", name: "[LT] Birkaç gün içinde dönüş yapacağım → kargo DEĞİL", input: body("Tamam birkaç gün içinde dönüş yapacağım teşekkürler", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "bekliyoruz" },

  // --- 600 TL / Pazarlık (regression) ---
  { id: "LT40", name: "[LT] 600 TL olur mu → sabit fiyat", input: body("600 TL olur mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "sabit" },
  { id: "LT41", name: "[LT] 550 yapın → sabit fiyat", input: body("550 tl yap", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "sabit" },
  { id: "LT42", name: "[LT] Çok pahalıymış → Tabi efendim DEĞİL", input: body("Çok pahalıymış ya", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "tabi efendim" },

  // --- WhatsApp ---
  { id: "LT43", name: "[LT] Tel alabilir miyim → WhatsApp", input: body("Tel alabilir miyim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "0534" },

  // --- Foto keyword daraltma (regression) ---
  { id: "LT44", name: "[LT] Çıplak URL → müşteri fotoğrafı", input: body("https://lookaside.fbsbx.com/photo.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "photo", photo_received: "1" } },
  { id: "LT45", name: "[LT] URL + bu model → product_image_reference", input: body("https://lookaside.fbsbx.com/photo.jpg bu model olsun", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "product_image_reference" } },
  { id: "LT46", name: "[LT] URL + bu olur mu → müşteri fotoğrafı", input: body("https://lookaside.fbsbx.com/photo.jpg bu olur mu", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "photo" } },

  // --- Gönderdim/yolladım pattern ---
  { id: "LT47", name: "[LT] Gönderdim w_photo → kabul", input: body("Gönderdim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "LT48", name: "[LT] Göndermiş olduğum foto uygun mu → ulaştı", input: body("Göndermiş olduğum foto uygun mu acaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "ulasti" },

  // --- Cross product fiyat ---
  { id: "LT49", name: "[LT] Harfli ataç fiyatı lazer'da → 499", input: body("Harfli ataç kolyenin fiyatı nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "499" },
  { id: "LT50", name: "[LT] Kapıda ödeme nedir → nakit açıklama", input: body("Kapıda ödeme nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "nakit" },

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
    if (id.startsWith("AF")) return "BACK_FOTO_FIX";
    if (id.startsWith("LB")) return "LOG_BUG_FIX";
    if (id.startsWith("NF")) return "NOTE_FIX";
    if (id.startsWith("PS")) return "POST_SALE_REGRESSION";
    if (id.startsWith("LR")) return "LOG_REGRESSION";
    if (id.startsWith("GC")) return "GPT_GAP_COVERAGE";
    if (id.startsWith("ST")) return "40K_STRATEGIC";
    if (id.startsWith("MX")) return "MIXED_MESSAGE";
    if (id.startsWith("PL")) return "PROD_LOG_REGRESSION";
    if (id.startsWith("BF")) return "BUG_FIX_V2";
    if (id.startsWith("LT")) return "LOG_TUR_2_3";
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
    BACK_FOTO_FIX: "Back Foto Fix",
    LOG_BUG_FIX: "Log Bug Fix",
    NOTE_FIX: "Note Fix",
    POST_SALE_REGRESSION: "Post-Sale Regression",
    LOG_REGRESSION: "Log Regression",
    GPT_GAP_COVERAGE: "GPT Gap Coverage",
    "40K_STRATEGIC": "40K Strategic",
    MIXED_MESSAGE: "Mixed Message",
    PROD_LOG_REGRESSION: "Prod Log Regression",
    BUG_FIX_V2: "Bug Fix v2",
    LOG_TUR_2_3: "Log Tur 2-3",
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
