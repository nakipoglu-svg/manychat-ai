import { processChat } from "../core/engine.js";

console.log("🔥 TEST BAŞLADI (750+ test)");

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

function lazer(o = {}) { return { ilgilenilen_urun: "lazer", user_product: "lazer", context_lock: "1", order_status: "started", ...o }; }
function atac(o = {}) { return { ilgilenilen_urun: "atac", user_product: "atac", context_lock: "1", order_status: "started", ...o }; }
function lazerWaitingPayment(o = {}) { return lazer({ photo_received: "1", back_text_status: "skipped", conversation_stage: "waiting_payment", ...o }); }
function lazerWaitingAddress(o = {}) { return lazer({ photo_received: "1", back_text_status: "skipped", payment_method: "eft_havale", conversation_stage: "waiting_address", ...o }); }
function atacWaitingPayment(o = {}) { return atac({ letters_received: "1", conversation_stage: "waiting_payment", ...o }); }
function atacWaitingAddress(o = {}) { return atac({ letters_received: "1", payment_method: "eft_havale", conversation_stage: "waiting_address", ...o }); }
function lazerCompleted(o = {}) { return lazer({ photo_received: "1", back_text_status: "skipped", payment_method: "eft_havale", address_status: "received", phone_received: "1", conversation_stage: "order_completed", order_status: "completed", siparis_alindi: "1", ...o }); }
function atacCompleted(o = {}) { return atac({ letters_received: "1", payment_method: "eft_havale", address_status: "received", phone_received: "1", conversation_stage: "order_completed", order_status: "completed", siparis_alindi: "1", ...o }); }

function normalizeForTest(text = "") {
  return String(text).toLowerCase().replace(/i̇/g, "i").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

const tests = [
  // GRUP 1: CORE FLOW
  { id: "T01", name: "Lazer seçimi", input: body("resimli lazer kolye"), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" } },
  { id: "T02", name: "Lazer fiyat 599", input: body("lazer istiyorum"), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" }, expectReplyIncludes: "599" },
  { id: "T03", name: "Foto URL → photo=1", input: body("https://lookaside.fbsbx.com/photo123.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "1", conversation_stage: "waiting_back_text" } },
  { id: "T04", name: "yok → skipped", input: body("yok", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped", conversation_stage: "waiting_payment" } },
  { id: "T05", name: "istemiyorum → skipped", input: body("istemiyorum", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped", conversation_stage: "waiting_payment" } },
  { id: "T06", name: "EFT → waiting_address", input: body("eft", lazerWaitingPayment()), expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" } },
  { id: "T07", name: "kapıda → waiting_address", input: body("kapıda ödeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" } },
  { id: "T08", name: "full adres → completed", input: body("Ali Yılmaz 05551234567 İstanbul Kadıköy Moda Mah No:5", lazerWaitingAddress()), expect: { address_status: "received", phone_received: "1", conversation_stage: "order_completed", order_status: "completed" } },
  { id: "T09", name: "completed korunmalı", input: body("tamam", lazerCompleted()), expect: { address_status: "received", conversation_stage: "order_completed" } },
  { id: "T10", name: "Ataç seçimi", input: body("ataç kolye"), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" } },
  { id: "T11", name: "Harfler → payment", input: body("ABC", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "1", conversation_stage: "waiting_payment" } },
  { id: "T12", name: "Ataç EFT", input: body("eft", atacWaitingPayment()), expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" } },
  { id: "T13", name: "Ataç kapıda", input: body("kapıda ödeme", atacWaitingPayment()), expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" } },
  { id: "T14", name: "Ataç full adres", input: body("Ayşe Kaya 05321234567 Ankara Çankaya Kızılay Cad No:10", atacWaitingAddress()), expect: { address_status: "received", phone_received: "1", conversation_stage: "order_completed", order_status: "completed" } },
  { id: "T15", name: "Konum → Eminönü", input: body("neredesiniz"), expectReplyIncludes: "eminonu" },
  { id: "T16", name: "Kargo süresi", input: body("kargo ne zaman gelir"), expectReplyIncludes: "is gunu" },
  { id: "T17", name: "Güven", input: body("güvenilir misiniz"), expectReplyIncludes: "guven" },
  { id: "T18", name: "Merhaba", input: body("merhaba"), expectReplyIncludes: "merhaba" },
  { id: "T19", name: "İptal", input: body("iptal etmek istiyorum", lazerWaitingPayment()), expect: { order_status: "cancel_requested", conversation_stage: "human_support" } },
  { id: "T20", name: "Kargo ücreti dahil", input: body("kargo ücreti var mı"), expectReplyIncludes: "dahil" },

  // GRUP 2: REGRESSION (subset)
  { id: "R01", name: "merhaba w_photo menü açmamalı", input: body("merhaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz" },
  { id: "R02", name: "ürün korunmalı", input: body("tamam", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "R07", name: "Resimli → lazer", input: body("resimli"), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" } },
  { id: "R08", name: "Ataç → atac", input: body("ataç"), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" } },
  { id: "R12", name: "Ataç fiyat sorusu lazer bozmamalı", input: body("ataç fiyatı ne kadar", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "R13", name: "Açık ataç seçimi", input: body("yok ben ataç alayım", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "atac" } },
  { id: "R16", name: "Instagram CDN → photo=1", input: body("https://cdninstagram.com/photo123.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "1" } },
  { id: "R23", name: "Arka yazı → received", input: body("sevgilime", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received", conversation_stage: "waiting_payment" } },
  { id: "R28", name: "AYS → letters=1", input: body("AYS", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "1" } },
  { id: "R31", name: "havale → eft_havale", input: body("havale", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },
  { id: "R32", name: "kapida → kapida_odeme", input: body("kapida", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "R36", name: "Sadece adres → address_only", input: body("İstanbul Kadıköy Moda Mah Bahariye Cad No:5", lazerWaitingAddress()), expect: { address_status: "address_only" } },
  { id: "R38", name: "İsim+tel+adres → tam", input: body("Ahmet Yılmaz 05551234567 Ankara Çankaya Kızılay Mah No:3", lazerWaitingAddress()), expect: { address_status: "received", phone_received: "1", conversation_stage: "order_completed" } },
  { id: "R39", name: "address_only + tel → received", input: body("05551234567", lazerWaitingAddress({ address_status: "address_only" })), expect: { address_status: "received", phone_received: "1" } },
  { id: "R41", name: "İptal siparis_alindi temizlemeli", input: body("iptal", lazer({ order_status: "completed", siparis_alindi: "1", conversation_stage: "order_completed" })), expect: { siparis_alindi: "", order_status: "cancel_requested" } },

  // GRUP 3: PARSING
  { id: "P01", name: "+90 tel", input: body("+905551234567", lazerWaitingAddress()), expect: { phone_received: "1" } },
  { id: "P02", name: "05XX tel", input: body("05551234567", lazerWaitingAddress()), expect: { phone_received: "1" } },
  { id: "P03", name: "8 hane → phone boş", input: body("12345678", lazerWaitingAddress()), expect: { phone_received: "" } },
  { id: "P07", name: "fbsbx URL → photo", input: body("https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=123", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "1" } },
  { id: "P10", name: "Havale yapacağım → eft", input: body("havale yapacağım", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },

  // GRUP 4: VARIATION
  { id: "V01", name: "Foto kolye → lazer", input: body("foto kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "V04", name: "İsim harf kolye → atac", input: body("isim harf kolye"), expect: { ilgilenilen_urun: "atac" } },
  { id: "V06", name: "Vazgeçtim → cancel", input: body("vazgeçtim", lazerWaitingPayment()), expect: { order_status: "cancel_requested" } },
  { id: "V08", name: "Gerek yok → skipped", input: body("gerek yok", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },
  { id: "V12", name: "Kaç günde gelir", input: body("kaç günde gelir"), expectReplyIncludes: "is gunu" },
  { id: "V16", name: "Kapıda öderim", input: body("kapıda öderim", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },

  // GRUP 5: STATE
  { id: "S01", name: "w_photo korunmalı", input: body("devam", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo" } },
  { id: "S04", name: "Lazer seçilince started", input: body("resimli lazer kolye"), expect: { order_status: "started" } },
  { id: "S05", name: "Ataçta photo boş", input: body("AYS", atac({ conversation_stage: "waiting_letters" })), expect: { photo_received: "" } },
  { id: "S09", name: "Lazerden ataca geçiş", input: body("harfli ataç kolye istiyorum", lazer({ photo_received: "1", back_text_status: "skipped", conversation_stage: "waiting_payment" })), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" } },

  // GRUP 6: MANYCHAT CONTRACT
  { id: "MC01", name: "{{cuf}} boş", input: body("ataç kolye", { ilgilenilen_urun: "{{cuf_12345}}" }), expect: { ilgilenilen_urun: "atac" } },
  { id: "MC04", name: "undefined boş", input: body("merhaba", { ilgilenilen_urun: "undefined" }), expect: { ilgilenilen_urun: "" } },
  { id: "MC06", name: "Boş mesaj crash yok", input: body(""), expect: { success: true } },
  { id: "MC09", name: "success:true", input: body("neredesiniz"), expect: { success: true } },

  // GRUP 7: MODEL SAFETY (deterministik cevap, fallback yok)
  { id: "MS01", name: "Konum deterministic", input: body("neredesiniz"), expectReplyIncludes: "emin", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS02", name: "Kargo deterministic", input: body("kargo ne zaman gelir"), expectReplyIncludes: "is gunu", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS03", name: "Kargo ücreti deterministic", input: body("kargo ücreti var mı"), expectReplyIncludes: "dahil", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS05", name: "Kararır mı deterministic", input: body("kararır mı"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS07", name: "Zincir 60cm", input: body("zincir uzunluğu ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS11", name: "EFT fallback yok", input: body("eft", lazerWaitingPayment()), expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS13", name: "Yok fallback yok", input: body("yok", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped", conversation_stage: "waiting_payment" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS14", name: "Arka yazı fallback yok", input: body("canım ailem", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received", conversation_stage: "waiting_payment" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS15", name: "Harf fallback yok", input: body("ABC", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "1", conversation_stage: "waiting_payment" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS18", name: "Foto URL fallback yok", input: body("https://lookaside.fbsbx.com/photo123.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "1", conversation_stage: "waiting_back_text" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS21", name: "Side: w_photo + konum", input: body("neredesiniz", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "istanbul" },
  { id: "MS41", name: "Switch: lazer→atac photo reset", input: body("ataç kolye istiyorum", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters", photo_received: "" } },
  { id: "MS48", name: "Cross: lazerde atac fiyat switch yok", input: body("ataç kolye fiyatı ne kadar", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" } },
  { id: "MS52", name: "kapida olsun → kapida_odeme", input: body("kapida olsun", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" } },
  { id: "MS55", name: "foto atsam olur mu fallback yok", input: body("fotograf atsam olur mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS65", name: "Sadece şehir adres değil", input: body("İstanbul", lazerWaitingAddress()), expect: { address_status: "" } },
  { id: "MS67", name: "İsim w_address fallback yok", input: body("Ali Yılmaz", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS68", name: "w_photo iptal", input: body("iptal", lazer({ conversation_stage: "waiting_photo" })), expect: { order_status: "cancel_requested", conversation_stage: "human_support" } },
  { id: "MS70", name: "address_only completed olmamalı", input: body("Kadıköy Moda Mah No:3", atacWaitingAddress()), expect: { conversation_stage: "waiting_address", order_status: "started" } },

  // GRUP 8: BACKLOG
  { id: "B02", name: "Ataçta arka yazı → lazer", input: body("arkasına yazı olur mu", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },

  // GRUP 9: REAL WORLD
  { id: "RW01", name: "Fiyat kontrol (5931x)", input: body("Bir ürünün fiyatını kontrol edebilir misiniz?"), expectReplyIncludes: "hangi" },
  { id: "RW07", name: "teşekkür ederim", input: body("teşekkür ederim"), expectReplyIncludes: "rica" },
  { id: "RW11", name: "resimli lazer kolye", input: body("resimli lazer kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW14", name: "çelik mi", input: body("çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "RW18", name: "kararma yapar mı", input: body("kararma yapar mı"), expectReplyIncludes: "kararma", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "RW33", name: "harfli ataç kolye", input: body("harfli ataç kolye"), expect: { ilgilenilen_urun: "atac" } },
  { id: "RW38", name: "hangi kargo", input: body("hangi kargo"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "RW46", name: "resimli kolye fiyatı", input: body("resimli kolye fiyatı nedir"), expect: { ilgilenilen_urun: "lazer" }, expectReplyIncludes: "599" },

  // GRUP 10: ORDER COMPLETED
  { id: "OC01", name: "Completed + fiyat", input: body("fiyatını öğrenebilir miyim", lazerCompleted()), expectReplyIncludes: "599", expectReplyNotIncludes: "siparis" },
  { id: "OC02", name: "Completed + kargo", input: body("kargo ne zaman gelir", lazerCompleted()), expectReplyIncludes: "is gunu" },
  { id: "OC04", name: "Completed + konum", input: body("neredesiniz", lazerCompleted()), expectReplyIncludes: "istanbul" },
  { id: "OC05", name: "Completed + çelik mi", input: body("çelik mi", lazerCompleted()), expectReplyIncludes: "paslanmaz" },
  { id: "OC06", name: "Completed + kargo dahil", input: body("kargo dahil mi", lazerCompleted()), expectReplyIncludes: "dahil" },
  { id: "OC07", name: "Completed + teşekkür", input: body("teşekkür ederim", lazerCompleted()), expectReplyNotIncludes: "siparis" },
  { id: "OC08", name: "Completed + merhaba menü yok", input: body("merhaba", lazerCompleted()), expectReplyNotIncludes: "hangi model" },
  { id: "OC09", name: "Completed + iptal", input: body("iptal", lazerCompleted()), expect: { order_status: "cancel_requested" } },
  { id: "OC10", name: "Completed + kolyem hazır mı", input: body("kolyem hazır mı", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "OC12", name: "Completed + zincir 60", input: body("zincir uzunluğu kaç cm", lazerCompleted()), expectReplyIncludes: "60" },
  { id: "OC14", name: "Completed + eft attım", input: body("eft attım", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "OC15", name: "Completed + IBAN", input: body("iban atar mısınız", lazerCompleted()), expectReplyIncludes: "TR34" },

  // GRUP 11: NAME GUARD
  { id: "NN02", name: "Çelik mi isim değil", input: body("Çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "NN11", name: "La familia w_back_text arka yazı", input: body("La familia es todo", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "NN15", name: "Gerçek isim: FATİME AZİZOĞLU", input: body("FATİME AZİZOĞLU", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "NN16", name: "Gerçek isim: Halime Dal", input: body("Halime Dal", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },

  // GRUP 12: ADDRESS GUARD
  { id: "NA04", name: "Soru cümlesi adres değil", input: body("İstanbul'da mağazanız var mı?", lazerWaitingAddress()), expect: { address_status: "" } },

  // GRUP 13: MATERIAL
  { id: "MT01", name: "çelik mi → paslanmaz", input: body("çelik mi"), expectReplyIncludes: "paslanmaz" },
  { id: "MT05", name: "malzeme ne → paslanmaz", input: body("malzeme ne"), expectReplyIncludes: "paslanmaz" },
  { id: "MT07", name: "çelik mi w_photo stage korunmalı", input: body("çelik mi", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" } },
  { id: "MT10", name: "çelik mi ataç", input: body("çelik mi", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "paslanmaz", expect: { ilgilenilen_urun: "atac" } },

  // GRUP 14: TRUST
  { id: "TR01", name: "kararma yapar mı", input: body("kararma yapar mı"), expectReplyIncludes: "kararma" },
  { id: "TR05", name: "kararma yaparmi", input: body("kararma yaparmi"), expectReplyIncludes: "kararma" },
  { id: "TR15", name: "kaplama atar mı", input: body("kaplama atar mı"), expectReplyIncludes: "kaplama" },

  // GRUP 15: SHORT MESSAGES
  { id: "SK01", name: "evet w_photo ürünü bozmamalı", input: body("evet", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK04", name: "tm w_photo", input: body("tm", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK11", name: "amin harf sayılmamalı", input: body("amin", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "" } },
  { id: "SK14", name: "? crash yok", input: body("?"), expect: { success: true } },
  { id: "SK17", name: "emoji crash yok", input: body("👍"), expect: { success: true } },
  { id: "SK20", name: "mrb → selamlama", input: body("mrb"), expectReplyIncludes: "merhaba" },

  // GRUP 16: PRICE
  { id: "PR01", name: "Lazer fiyat → 599", input: body("fiyat", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "599" },
  { id: "PR02", name: "Ataç fiyat → 499", input: body("fiyat", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "499" },
  { id: "PR03", name: "fiyat nedir menü", input: body("fiyat nedir acaba"), expectReplyIncludes: "hangi" },

  // GRUP 17: PAYMENT
  { id: "PY01", name: "kapida odeme", input: body("kapida odeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "PY05", name: "iban → IBAN", input: body("iban", lazerWaitingPayment()), expectReplyIncludes: "TR34" },

  // GRUP 18: SMALLTALK
  { id: "SM01", name: "selam", input: body("selam"), expectReplyIncludes: "merhaba" },
  { id: "SM07", name: "tamam teşekkür completed", input: body("tamam teşekkür ederim", lazerCompleted()), expect: { ilgilenilen_urun: "lazer" } },

  // GRUP 19: BACK TEXT
  { id: "BT01", name: "Tarih arka yazı", input: body("01.04.2021", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "BT03", name: "Dua arka yazı", input: body("Allah korusun", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "BT06", name: "Genelde ne yazılıyor", input: body("genelde ne yazılıyor", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "isim" },
  { id: "BT07", name: "arka boş kalsın → skipped", input: body("arka boş kalsın", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },

  // GRUP 20: KARGO
  { id: "KG01", name: "ne zaman gelir", input: body("ne zaman gelir"), expectReplyIncludes: "is gunu" },
  { id: "KG03", name: "kargom nerede → ekip", input: body("kargom nerede"), expectReplyIncludes: "ekibimiz" },
  { id: "KG05", name: "kargo dahil → dahil", input: body("kargo dahil mi"), expectReplyIncludes: "dahil" },

  // GRUP 21: BACK FOTO FIX
  { id: "AF01", name: "back_text=received foto → arka yazı sormamalı", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", back_text_status: "received", conversation_stage: "waiting_payment" })), expectReplyNotIncludes: "arka yuzune yazi eklemek" },
  { id: "AF03", name: "back_text=received + payment yok → ödeme", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", back_text_status: "received", conversation_stage: "waiting_payment" })), expectReplyIncludes: "odeme" },
  { id: "AF05", name: "İlk foto → arka yazı sormalı", input: body("https://lookaside.fbsbx.com/photo1.jpg", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "arka yuzune yazi" },

  // GRUP 22: LOG BUG FIX
  { id: "LB01", name: "Başınız sağolsun → taziye geri dönmemeli", input: body("Başınız sağolsun", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "basiniz sag olsun" },
  { id: "LB02", name: "Başınız sağolsun → teşekkür", input: body("Başınız sağolsun", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "tesekkur" },

  // GRUP 23: NOTE FIX
  { id: "NF01", name: "Kapıda kartla → nakit", input: body("Kapıda kartla ödeme istiyorum", lazerWaitingPayment()), expectReplyIncludes: "nakit" },
  { id: "NF03", name: "Boyutu ne kadar → 3 cm", input: body("Boyutu ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "3 cm" },
  { id: "NF05", name: "Hangi kargo → PTT", input: body("Hangi kargo ile gönderiyorsunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "ptt" },
  { id: "NF06", name: "Alerji → alerji", input: body("Benim alerjim var çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "alerji" },
  { id: "NF07", name: "Şubeden alacağım → received", input: body("Şubeden alacağım", lazerWaitingAddress()), expect: { address_status: "received" } },
  { id: "NF11", name: "Zincir dahil → dahil", input: body("Zincir dahil mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },

  // GRUP 24: POST-SALE
  { id: "PS01", name: "Completed + beğendim → teşekkür", input: body("Begendım cok tatlı olmus", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "PS05", name: "Completed + tamam → kısa cevap", input: body("Tamam", lazerCompleted()), expectReplyIncludes: "efendim" },
  { id: "PS09", name: "Completed + kargom gelmedi → ekibimiz", input: body("Kargom gelmedi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS13", name: "Completed + memnun kalmadım → ekibimiz", input: body("Memnun kalmadım", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS17", name: "Completed + tamam → stage korunmalı", input: body("Tamam", lazerCompleted()), expect: { conversation_stage: "order_completed" } },
  { id: "PS21", name: "w_photo + tm → foto iste", input: body("Tm", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "fotograf" },
  { id: "PS23", name: "w_payment + tamam → ödeme sor", input: body("Tamam", lazer({ conversation_stage: "waiting_payment", photo_received: "1", back_text_status: "received" })), expectReplyIncludes: "odeme" },

  // GRUP 25: LOG REGRESSION
  { id: "LR11", name: "Ayşe Arabacı → isim", input: body("Ayşe Arabacı", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "LR30", name: "w_photo + gönderdim → kabul", input: body("Gönderdim fotoğraf", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "LR32", name: "Completed + geçmiş olsun → teşekkür", input: body("Çok geçmiş olsun", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "LR33", name: "Completed + rica ederim → ederiz", input: body("Rica ederim", lazerCompleted()), expectReplyIncludes: "ederiz" },

  // GRUP 26: GPT GAP COVERAGE
  { id: "GC14", name: "2 tane → 1000 TL", input: body("2 tane istiyorum fiyat ne olur", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "1000" },
  { id: "GC28", name: "Ataç zincir → 50", input: body("Zincir uzunluğu kaç cm", { ilgilenilen_urun: "atac", user_product: "atac", context_lock: "1", conversation_stage: "waiting_letters" }), expectReplyIncludes: "50" },

  // GRUP 27: 40K STRATEGIC
  { id: "ST07", name: "Çelik mi", input: body("Çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "ST18", name: "Hangi kargo", input: body("Hangi kargo", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "PTT" },
  { id: "ST32", name: "Yeriniz nerede?", input: body("Yeriniz nerede?"), expectReplyIncludes: "Eminonu" },
  { id: "ST34", name: "Merhaba", input: body("Merhaba"), expectReplyNotIncludes: "Ekibimize iletiyorum" },

  // GRUP 28: MIXED MESSAGE
  { id: "MX01", name: "Beğendim + boyut", input: body("Beğendim ama boyutu ne kadar", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "chain_question" } },
  { id: "MX03", name: "Sağlık + kararma", input: body("Ellerinize sağlık kararır mı", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "trust" } },
  { id: "MX05", name: "Teşekkür + çelik mi", input: body("Teşekkürler çelik mi peki", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "material_question" } },
  { id: "MX07", name: "Güzelmiş + fiyat", input: body("Çok güzelmiş fiyat nedir", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "price" } },
  { id: "MX14", name: "Pure: Geçmiş olsun → smalltalk", input: body("Çok geçmiş olsun", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "smalltalk" } },
  { id: "MX18", name: "Pure: Merhaba → smalltalk", input: body("Merhaba"), expect: { last_intent: "smalltalk" } },

  // GRUP 30: BUG FIX
  { id: "BF07", name: "600 TL olur mu → pazarlık reddi", input: body("600 TL olur mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "sabit" },
  { id: "BF09", name: "Çok pahalı → çoklu alım", input: body("Çok pahalı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "coklu" },
  { id: "BF11", name: "Çıplak URL → photo", input: body("https://lookaside.fbsbx.com/photo.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "photo", photo_received: "1" } },
  { id: "BF12", name: "URL + bu model → product_image_ref", input: body("https://lookaside.fbsbx.com/photo.jpg bu model olsun", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "product_image_reference" } },
  { id: "BF19", name: "Tel alabilir miyim → WhatsApp", input: body("Tel alabilir miyim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "0534" },
  { id: "BF22", name: "Bitince paylaşırsanız", input: body("Bitince benimle paylaşırsanız sevinirim", lazerCompleted()), expectReplyIncludes: "paylasiyoruz" },
  { id: "BF29", name: "Dönüş yapacağım → bekliyoruz", input: body("Tamam birkaç gün içinde dönüş yapacağım", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "bekliyoruz" },
  { id: "BF31", name: "Cross: ataç fiyatı lazer'da → 499", input: body("Harfli ataç kolyenin fiyatı nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "499" },
  { id: "BF33", name: "Kalida → kapıda", input: body("Kalida odeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "BF43", name: "Pahalıymış → tabi efendim DEĞİL", input: body("Çok pahalıymış", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "tabi efendim" },

  // GRUP 31: LOG TUR 2-3
  { id: "LT05", name: "Vefat → başsağlığı", input: body("Oğlum vefat etti onun için yaptırıyorum", lazerWaitingPayment()), expectReplyIncludes: "basini" },
  { id: "LT10", name: "Her yere kargo → evet", input: body("Her yere kargo varmı bana yakın gerek", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "her yeri" },
  { id: "LT23", name: "Bundan olacak → not aldım", input: body("Bundan olacak", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "not aldim" },
  { id: "LT25", name: "Değişiklik olmaz dimi → grafiker", input: body("Resimde de herhangi bir değişiklik olmaz dimi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "grafiker" },
  { id: "LT40", name: "600 TL olur mu → sabit", input: body("600 TL olur mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "sabit" },
  { id: "LT43", name: "Tel → WhatsApp", input: body("Tel alabilir miyim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "0534" },

  // PROD LOG REGRESSION (subset)
  { id: "PL017", name: "Completed teşekkür", input: body("Teşekkür ederim", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL019", name: "Completed tamamdır", input: body("Tamamdır", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL021", name: "Completed merhaba", input: body("Merhaba", lazerCompleted()), expectReplyIncludes: "merhaba" },
  { id: "PL092", name: "w_photo teşekkür", input: body("Teşekkür ederim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "rica" },
  { id: "PL105", name: "w_photo çelik mi", input: body("Çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },

  // DAHA FAZLA REGRESSION
  { id: "R03", name: "menu_gosterildi engel", input: body("devam", lazer({ menu_gosterildi: "evet", conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz" },
  { id: "R04", name: "Evet w_photo korunmali", input: body("evet", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "R05", name: "Tamam w_letters korunmali", input: body("tamam", atac({ conversation_stage: "waiting_letters" })), expect: { ilgilenilen_urun: "atac" } },
  { id: "R06", name: "context_lock korunmali", input: body("ne renk?", lazer({ context_lock: "1", conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer", context_lock: "1" } },
  { id: "R09", name: "Atac letters bos", input: body("ataç kolye"), expect: { ilgilenilen_urun: "atac", letters_received: "" } },
  { id: "R10", name: "Urun degisiminde photo sifir", input: body("ataç kolye istiyorum", lazer({ photo_received: "1", back_text_status: "skipped", conversation_stage: "waiting_payment" })), expect: { photo_received: "" } },
  { id: "R14", name: "Niyet cumlesi photo yok", input: body("fotoğrafı gönderiyorum", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "" } },
  { id: "R17", name: ".jpeg URL photo=1", input: body("https://example.com/foto.jpeg", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "1" } },
  { id: "R19", name: "Bu foto olur mu stage dur", input: body("bu foto olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { photo_received: "1", conversation_stage: "waiting_back_text" } },
  { id: "R20", name: "Arka yazi info set etmemeli", input: body("arkasına yazı oluyor mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "" } },
  { id: "R21", name: "w_back_text foto received", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "R22", name: "Arka foto fiyat ek ucret", input: body("arkasına foto koyarsam fiyat ne olur", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "ek ucret" },
  { id: "R25", name: "Atac w_letters korunmali", input: body("devam", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "R26", name: "Atac letters yok eft stage dur", input: body("eft", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "R27", name: "Atac letters yok kapida dur", input: body("kapıda ödeme olsun", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "R33", name: "Kapida odeme olsun", input: body("kapıda ödeme olsun", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "R35", name: "Kargo adres bos", input: body("istanbul içi kaç günde gelir"), expect: { address_status: "" } },
  { id: "R37", name: "address_only completed yok", input: body("İstanbul Kadıköy Moda Mah Bahariye Cad No:5", lazerWaitingAddress()), expect: { conversation_stage: "waiting_address" } },
  { id: "R40", name: "order_completed senkron", input: body("Ali 05551234567 İstanbul Kadıköy Moda Mah No:5", lazerWaitingAddress()), expect: { conversation_stage: "order_completed", order_status: "completed", siparis_alindi: "1" } },
  { id: "R42", name: "Guven urun korunmali", input: body("güvenilir misiniz", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" }, expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz" },
  { id: "R43", name: "Kargo stage korunmali", input: body("kargo ne kadar sürer", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment" }, expectReplyIncludes: "is gunu" },
  { id: "R44", name: "Kargo ucreti menu yok", input: body("kargo ücreti var mı", lazerWaitingPayment()), expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz" },
  { id: "R45", name: "Kargom nerede ekip", input: body("kargom nerede"), expectReplyIncludes: "ekibimiz" },
  { id: "MS04", name: "Guven deterministic", input: body("güvenilir misiniz"), expectReplyIncludes: "guven", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS06", name: "Kaplama atar mi", input: body("kaplaması atar mı"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS12", name: "Kapida fallback yok", input: body("kapıda ödeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS16", name: "Tel fallback yok", input: body("05551234567", lazerWaitingAddress({ address_status: "address_only" })), expect: { phone_received: "1", address_status: "received" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS22", name: "Side w_photo guven", input: body("güvenilir misiniz", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "guven" },
  { id: "MS42", name: "Switch back_text atac", input: body("harfli ataç kolye istiyorum", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters", back_text_status: "" } },
  { id: "MS43", name: "Switch payment atac", input: body("yok ben ataç alayım", lazerWaitingPayment()), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters", payment_method: "" } },
  { id: "MS45", name: "Switch atac lazer", input: body("resimli lazer kolye istiyorum", atac({ conversation_stage: "waiting_letters" })), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo", letters_received: "" } },
  { id: "MS49", name: "Cross atac lazer fiyat", input: body("resimli kolye fiyatı ne kadar", atac({ conversation_stage: "waiting_letters" })), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" } },
  { id: "MS50", name: "Fikrimi degistirdim", input: body("ben fikrimi değiştirdim resimli olsun", atacWaitingPayment()), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo", letters_received: "" } },
  { id: "MS61", name: "0555 spaced tel", input: body("0555 123 45 67", lazerWaitingAddress()), expect: { phone_received: "1" } },
  { id: "MS63", name: "Site blok adres", input: body("Gül Sitesi A Blok Daire 3 Kadıköy İstanbul", lazerWaitingAddress()), expect: { address_status: "address_only" } },
  { id: "MS66", name: "Sadece ilce adres degil", input: body("Kadıköy", lazerWaitingAddress()), expect: { address_status: "" } },
  { id: "PL003", name: "human_su Bekliyorum", input: body("Bekliyorum", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL038", name: "w_addr Tamamdir", input: body("Tamamdır", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "PL067", name: "w_letters Celikmidir", input: body("Çelikmidir", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "paslanmaz" },
  { id: "BF01", name: "Gonderdim w_photo kabul", input: body("Gönderdim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "BF05", name: "Gonderdim w_address kabul", input: body("Gönderdim bilgileri", lazerWaitingAddress()), expectReplyIncludes: "aldim" },
  { id: "BF15", name: "URL w_back_text intent", input: body("https://lookaside.fbsbx.com/photo.jpg", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { last_intent: "back_photo_upload" } },
  { id: "BF20", name: "Kapida odeme nedir nakit", input: body("Kapıda ödeme nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "nakit" },
  { id: "BF25", name: "Gondermis oldugum ulasti", input: body("Göndermiş olduğum foto uygun mu acaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "ulasti" },
  { id: "BF28", name: "Siparisiniz olusturuldu onay", input: body("Siparişiniz oluşturuldu", lazerCompleted()), expectReplyIncludes: "onaylanmistir" },
  { id: "BF37", name: "Fiyat ne kadar 599", input: body("Fiyat ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "599" },
  { id: "BF44", name: "650 tl dimi completed", input: body("650 tl dimi", lazerCompleted()), expectReplyIncludes: "649" },
  { id: "LT01", name: "Metal celik", input: body("Metal", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "LT02", name: "Gumus mu kaplama", input: body("Gümüş mü", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kaplama" },
  { id: "LT04", name: "Plaka olcusu 3cm", input: body("Yuvarlak plakanın ölçüsü nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "3 cm" },
  { id: "LT06", name: "Allah razi cumlemizden", input: body("Allah razı olsun", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "cumlemizden" },
  { id: "LT12", name: "Arti kargo ucretsiz", input: body("Artı kargo dimi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "ucretsiz" },
  { id: "LT15", name: "Donecektiniz ozur", input: body("Bana dönecektiniz ama", lazerWaitingAddress()), expectReplyIncludes: "ozur" },
  { id: "LT27", name: "Dusunup bekliyoruz", input: body("Düşünüp size göndereceğim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "bekliyoruz" },
  { id: "LT49", name: "Cross atac 499", input: body("Harfli ataç kolyenin fiyatı nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "499" },
  { id: "LT50", name: "Kapida odeme nedir nakit2", input: body("Kapıda ödeme nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "nakit" },

  // ═══ BATCH 2: Kalan testler (Document 4'ten) ═══

  // VARIATION devam
  { id: "V02", name: "Fotografli kolye lazer", input: body("fotoğraflı kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "V03", name: "Fotolu kolye lazer", input: body("fotolu kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "V05", name: "3 harf kolye atac", input: body("3 harf kolye"), expect: { ilgilenilen_urun: "atac" } },
  { id: "V07", name: "Siparisi iptal cancel", input: body("siparişi iptal", lazerWaitingPayment()), expect: { order_status: "cancel_requested" } },
  { id: "V09", name: "Bos kalsin skipped", input: body("boş kalsın", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },
  { id: "V10", name: "Arka bos kalsin skipped", input: body("arka boş kalsın", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },
  { id: "V11", name: "Yazi olmasin skipped", input: body("yazı olmasın", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },
  { id: "V13", name: "Teslimat suresi", input: body("teslimat süresi ne kadar"), expectReplyIncludes: "is gunu" },
  { id: "V14", name: "Yeriniz nerede", input: body("yeriniz nerede"), expectReplyIncludes: "istanbul" },
  { id: "V15", name: "Dolandirici", input: body("dolandırıcı mısınız"), expectReplyIncludes: "guven" },
  { id: "V17", name: "Kapida olsun", input: body("kapıda olsun", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "V18", name: "EFT ile odeyecegim", input: body("eft ile ödeyeceğim", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },

  // STATE devam
  { id: "S03", name: "Atac w_letters korunmali2", input: body("devam", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "S06", name: "Atacta back_text bos", input: body("AYS", atac({ conversation_stage: "waiting_letters" })), expect: { back_text_status: "" } },
  { id: "S07", name: "Lazerde letters bos", input: body("https://lookaside.fbsbx.com/foto.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { letters_received: "" } },
  { id: "S08", name: "order_completed korunmali2", input: body("tamam", lazerCompleted()), expect: { address_status: "received", conversation_stage: "order_completed" } },

  // MC devam
  { id: "MC02", name: "cuf_999 bos", input: body("lazer istiyorum", { ilgilenilen_urun: "{cuf_999}" }), expect: { ilgilenilen_urun: "lazer" } },
  { id: "MC03", name: "cuf stage gecersiz", input: body("merhaba", { conversation_stage: "cuf_456" }), expect: { success: true }, expectReplyIncludes: "merhaba" },
  { id: "MC05", name: "null string bos", input: body("merhaba", { ilgilenilen_urun: "null" }), expect: { ilgilenilen_urun: "" } },
  { id: "MC07", name: "Bosluk mesaj crash yok", input: body("   "), expect: { success: true } },
  { id: "MC08", name: "Gecersiz stage ignore", input: body("ataç kolye", { conversation_stage: "some_invalid_stage_xyz" }), expect: { ilgilenilen_urun: "atac" } },

  // PARSING devam
  { id: "P04", name: "Mah Cad No adres", input: body("Moda Mah Bahariye Cad No:5 Kadıköy", lazerWaitingAddress()), expect: { address_status: "address_only" } },
  { id: "P05", name: "Site Apt adres", input: body("Bahçeşehir Sitesi Lale Apt Kat:3 İstanbul", lazerWaitingAddress()), expect: { address_status: "address_only" } },
  { id: "P06", name: "Adres tel received", input: body("Kadıköy Moda Mah No:3 05551234567", lazerWaitingAddress()), expect: { address_status: "received", phone_received: "1" } },
  { id: "P08", name: "Non-HTTP photo bos", input: body("example.com/foto.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "" } },
  { id: "P09", name: "Atac fiyat letters bos", input: body("fiyat ne kadar", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "" } },

  // REAL WORLD devam
  { id: "RW02", name: "detay 1605x", input: body("detay"), expectReplyIncludes: "hangi" },
  { id: "RW03", name: "detay lazer", input: body("detay", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "599" },
  { id: "RW04", name: "urun satin alabilir", input: body("ürün satın alabilir miyim?"), expectReplyIncludes: "hangi" },
  { id: "RW05", name: "yeriniz nerede 964x", input: body("yeriniz nerede?"), expectReplyIncludes: "istanbul" },
  { id: "RW06", name: "fiyat nedir 400x", input: body("fiyat nedir"), expectReplyIncludes: "hangi" },
  { id: "RW08", name: "tesekkurler 188x", input: body("teşekkürler"), expectReplyIncludes: "rica" },
  { id: "RW09", name: "fiyat 116x", input: body("fiyat"), expectReplyIncludes: "hangi" },
  { id: "RW10", name: "fiyat lazer 116x", input: body("fiyat", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "599" },
  { id: "RW12", name: "kapida odeme 68x", input: body("kapıda ödeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "RW13", name: "cok tesekkur w_photo", input: body("çok teşekkür ederim", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" }, expectReplyNotIncludes: "hangi model" },
  { id: "RW15", name: "kolay gelsin", input: body("kolay gelsin"), expect: { success: true } },
  { id: "RW16", name: "resimli kolye 42x", input: body("resimli kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW17", name: "ne kadar 40x", input: body("ne kadar"), expectReplyIncludes: "hangi" },
  { id: "RW19", name: "siparis vermek istiyorum 48x", input: body("sipariş vermek istiyorum"), expectReplyIncludes: "hangi" },
  { id: "RW20", name: "siparis vermek lazer", input: body("sipariş vermek istiyorum", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" }, expectReplyIncludes: "599" },
  { id: "RW21", name: "eft 24x", input: body("eft", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },
  { id: "RW22", name: "kac gunde gelir 23x", input: body("kaç günde gelir"), expectReplyIncludes: "is gunu" },
  { id: "RW23", name: "kapida odeme olacak 19x", input: body("kapıda ödeme olacak", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "RW25", name: "emeginize saglik", input: body("emeğinize sağlık", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" }, expectReplyNotIncludes: "hangi model" },
  { id: "RW26", name: "celikmi 13x", input: body("çelikmi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "RW27", name: "cok guzel 13x", input: body("çok güzel", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW28", name: "kapida odeme istiyorum 12x", input: body("kapıda ödeme istiyorum", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "RW29", name: "urun celik mi 11x", input: body("ürün çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "RW30", name: "resimli lazer 11x", input: body("resimli lazer"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW31", name: "ellerinize saglik completed", input: body("ellerinize sağlık", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "RW32", name: "fiyat lutfen 11x", input: body("fiyat lütfen"), expectReplyIncludes: "hangi" },
  { id: "RW34", name: "indirim var mi", input: body("indirim var mı", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW35", name: "kapida odeme var mi", input: body("kapıda ödeme var mı", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "RW36", name: "lazer 6x", input: body("lazer"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "RW37", name: "harfli 5x", input: body("harfli"), expect: { ilgilenilen_urun: "atac" } },
  { id: "RW39", name: "urunler celik mi 5x", input: body("ürünler çelik mi"), expectReplyIncludes: "paslanmaz" },
  { id: "RW40", name: "kac gune hazir 5x", input: body("kaç güne hazır olur"), expectReplyIncludes: "is gunu" },
  { id: "RW41", name: "siparis olustur 193x", input: body("sipariş oluştur"), expectReplyIncludes: "hangi" },
  { id: "RW42", name: "fiyati nedir 106x", input: body("fiyatı nedir"), expectReplyIncludes: "hangi" },
  { id: "RW43", name: "fiyat alabilirmiyim 60x", input: body("fiyat alabilirmiyim"), expectReplyIncludes: "hangi" },
  { id: "RW44", name: "fiyat ne kadar 57x", input: body("fiyat ne kadar"), expectReplyIncludes: "hangi" },
  { id: "RW45", name: "merhaba fiyat nedir 35x", input: body("merhaba fiyat nedir"), expectReplyIncludes: "hangi" },
  { id: "RW47", name: "yaptirmak istiyorum 14x", input: body("yaptırmak istiyorum"), expectReplyIncludes: "hangi" },
  { id: "RW48", name: "fiyat typo 14x", input: body("fıyat"), expectReplyIncludes: "hangi" },
  { id: "RW49", name: "evet kapida odeme 6x", input: body("evet kapıda ödeme", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "RW50", name: "siparis verebilir miyim 6x", input: body("sipariş verebilir miyim"), expectReplyIncludes: "hangi" },

  // ORDER COMPLETED devam
  { id: "OC03", name: "Completed guven kararma", input: body("kararma yapar mı", lazerCompleted()), expectReplyIncludes: "kararma" },
  { id: "OC11", name: "Completed urun gelmedi", input: body("ürün gelmedi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "OC13", name: "Completed atac fiyat 499", input: body("fiyat ne kadar", atacCompleted()), expectReplyIncludes: "499" },

  // NAME GUARD devam
  { id: "NN04", name: "Cok begendim isim degil", input: body("Çok beğendim", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ad soyad" },
  { id: "NN05", name: "Emeginize saglik isim degil", input: body("Emeğinize sağlık", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ad soyad" },
  { id: "NN06", name: "Resimli lazer kolye isim degil", input: body("Resimli lazer kolye"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "NN09", name: "Siparis gelmedi isim degil", input: body("Sipariş ettiğim ürün gelmedi"), expectReplyIncludes: "ekibimiz" },
  { id: "NN17", name: "Nurcan Sevinc isim", input: body("Nurcan Sevinç", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },

  // MATERIAL devam
  { id: "MT02", name: "celikmi birlesik", input: body("çelikmi"), expectReplyIncludes: "paslanmaz" },
  { id: "MT03", name: "urun celik mi", input: body("ürün çelik mi"), expectReplyIncludes: "paslanmaz" },
  { id: "MT04", name: "urunler celik mi2", input: body("ürünler çelik mi"), expectReplyIncludes: "paslanmaz" },
  { id: "MT06", name: "celik mi peki", input: body("çelik mi peki", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "MT08", name: "celik mi w_payment", input: body("çelik mi", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment" } },
  { id: "MT09", name: "paslanmaz mi", input: body("paslanmaz mı"), expectReplyIncludes: "paslanmaz" },

  // TRUST devam
  { id: "TR02", name: "kararma yapiyor mu", input: body("kararma yapıyor mu"), expectReplyIncludes: "kararma" },
  { id: "TR03", name: "kararma oluyor mu", input: body("kararma oluyor mu"), expectReplyIncludes: "kararma" },
  { id: "TR04", name: "kararma oluyormu", input: body("kararma oluyormu"), expectReplyIncludes: "kararma" },
  { id: "TR06", name: "kararma olur mu", input: body("kararma olur mu"), expectReplyIncludes: "kararma" },
  { id: "TR07", name: "kararma olurmu", input: body("kararma olurmu"), expectReplyIncludes: "kararma" },
  { id: "TR08", name: "kararir mi", input: body("kararır mı"), expectReplyIncludes: "kararma" },
  { id: "TR09", name: "kararma tek kelime", input: body("kararma"), expectReplyIncludes: "kararma" },
  { id: "TR10", name: "kararma oluyor mu acaba", input: body("kararma oluyor mu acaba"), expectReplyIncludes: "kararma" },
  { id: "TR12", name: "Guven w_photo stage korunmali", input: body("kararma yapar mı", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo" } },
  { id: "TR13", name: "Guven w_letters stage korunmali", input: body("kararma yapar mı", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "TR14", name: "garanti var mi", input: body("garanti var mı"), expectReplyNotIncludes: "ekibimize iletiyorum" },

  // SHORT devam
  { id: "SK02", name: "tamam w_payment korunmali", input: body("tamam", lazerWaitingPayment()), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK03", name: "olur w_letters korunmali", input: body("olur", atac({ conversation_stage: "waiting_letters" })), expect: { ilgilenilen_urun: "atac" } },
  { id: "SK05", name: "tmm w_photo", input: body("tmm", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK06", name: "tamamdir w_photo", input: body("tamamdır", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK07", name: "ok w_photo", input: body("ok", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK08", name: "peki w_photo", input: body("peki", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK09", name: "anladim w_photo", input: body("anladım", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK10", name: "bu olsun w_photo", input: body("bu olsun", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SK12", name: "insallah isim degil", input: body("inşallah", lazerWaitingAddress()), expect: { address_status: "" } },
  { id: "SK13", name: "masallah isim degil", input: body("maşallah", lazerWaitingAddress()), expect: { address_status: "" } },
  { id: "SK15", name: "?? crash yok", input: body("??"), expect: { success: true } },
  { id: "SK16", name: ". crash yok", input: body("."), expect: { success: true } },
  { id: "SK18", name: "emoji2 crash yok", input: body("🙏"), expect: { success: true } },
  { id: "SK19", name: "allah razi olsun harf degil", input: body("allah razı olsun", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "" } },

  // PRICE devam
  { id: "PR04", name: "fiyat bilgisi alabilir miyim", input: body("fiyat bilgisi alabilir miyim"), expectReplyIncludes: "hangi" },
  { id: "PR05", name: "fiyatini ogrenebilir miyim", input: body("fiyatını öğrenebilir miyim"), expectReplyIncludes: "hangi" },
  { id: "PR08", name: "fiyat ne", input: body("fiyat ne"), expectReplyIncludes: "hangi" },
  { id: "PR09", name: "ucret nedir", input: body("ücret nedir"), expectReplyIncludes: "hangi" },
  { id: "PR11", name: "Fiyat w_letters stage korunmali", input: body("fiyat ne kadar", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters" } },
  { id: "PR12", name: "ne kadar w_photo stage korunmali", input: body("ne kadar", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo" } },

  // PAYMENT devam
  { id: "PY02", name: "kapida odeme olucak", input: body("kapıda ödeme olucak", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "PY03", name: "evet kapida odeme olacak", input: body("evet kapıda ödeme olacak", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "PY04", name: "kapida odeme varmi deterministic", input: body("kapıda ödeme varmi"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PY06", name: "iban atin odeme yapayim", input: body("iban atın ödeme yapayım", lazerWaitingPayment()), expectReplyIncludes: "TR34" },
  { id: "PY07", name: "odeme havale olarak", input: body("ödeme havale olarak olacak", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },
  { id: "PY08", name: "eft yapabilirim", input: body("eft yapabilirim", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },
  { id: "PY09", name: "aciklama ne yazayim", input: body("açıklama ne yazayım", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PY10", name: "dekont atayim mi", input: body("dekont atayım mı", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },

  // SMALLTALK devam
  { id: "SM02", name: "merhabalar", input: body("merhabalar"), expectReplyIncludes: "merhaba" },
  { id: "SM03", name: "slm", input: body("slm"), expectReplyIncludes: "merhaba" },
  { id: "SM04", name: "iyi aksamlar", input: body("iyi akşamlar"), expect: { success: true } },
  { id: "SM05", name: "iyi gunler", input: body("iyi günler"), expect: { success: true } },
  { id: "SM06", name: "tsk ederim w_photo", input: body("tşk ederim", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SM08", name: "cok guzel olmus completed", input: body("çok güzel olmuş", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "SM09", name: "super w_photo", input: body("süper", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "SM10", name: "merhaba kolay gelsin", input: body("merhaba kolay gelsin"), expect: { success: true } },

  // BACK TEXT devam
  { id: "BT02", name: "Isim tarih arka yazi", input: body("Ela 01.04.2021", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "BT04", name: "canim ailem arka yazi", input: body("canım ailem seni çok seviyorum", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "BT05", name: "sonsuzluk isareti arka yazi", input: body("sonsuzluk işareti", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },
  { id: "BT08", name: "arka yazi yok skipped", input: body("arka yazı yok", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "skipped" } },

  // KARGO devam
  { id: "KG02", name: "kac gune gelir", input: body("kaç güne gelir"), expectReplyIncludes: "is gunu" },
  { id: "KG04", name: "gelmedi ekip", input: body("gelmedi"), expectReplyIncludes: "ekibimiz" },
  { id: "KG06", name: "kargo ucretsiz mi dahil", input: body("kargo ücretsiz mi"), expectReplyIncludes: "dahil" },
  { id: "KG07", name: "kargo ucretli mi dahil", input: body("kargo ücretli mi"), expectReplyIncludes: "dahil" },
  { id: "KG08", name: "hangi kargo no fallback", input: body("hangi kargo"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "KG09", name: "kargo ile birlikte mi dahil", input: body("kargo ücreti ile birlikte mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },
  { id: "KG10", name: "Kargo w_address stage korunmali", input: body("kaç günde gelir", lazerWaitingAddress()), expect: { conversation_stage: "waiting_address" } },

  // BACK FOTO FIX devam
  { id: "AF02", name: "back_text skipped foto arka sormamalı", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", back_text_status: "skipped", conversation_stage: "waiting_payment" })), expectReplyNotIncludes: "arka yuzune yazi eklemek" },
  { id: "AF04", name: "back_text received payment var adres", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", back_text_status: "received", payment_method: "eft_havale", conversation_stage: "waiting_address" })), expectReplyIncludes: "ad soyad" },
  { id: "AF06", name: "w_back_text foto received", input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "received" } },

  // POST-SALE devam
  { id: "PS02", name: "Completed elinize saglik", input: body("Emeğinize sağlık", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "PS03", name: "Completed cok guzel olmus", input: body("Çok güzel olmuş elinize sağlık", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "PS06", name: "Completed bekliyorum", input: body("Bekliyorum", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PS10", name: "Completed kargoya verildi mi", input: body("Kargoya verildi mi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS12", name: "Completed kac gunde gelir", input: body("Kaç günde gelir", lazerCompleted()), expectReplyIncludes: "is gunu" },
  { id: "PS14", name: "Completed istedigim gibi degil", input: body("İstediğim gibi değil", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS15", name: "Completed sikayetim var", input: body("Şikayetim var", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS16", name: "Completed yanlis olmus", input: body("Yanlış olmuş", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS19", name: "Completed kargom gelmedi foto sormamalı", input: body("Kargom gelmedi", lazerCompleted()), expectReplyNotIncludes: "fotograf" },
  { id: "PS20", name: "Completed memnun kalmadiım adres sormamalı", input: body("Memnun kalmadım", lazerCompleted()), expectReplyNotIncludes: "adres" },
  { id: "PS22", name: "w_photo tamamdir foto iste", input: body("Tamamdır", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "fotograf" },
  { id: "PS25", name: "Yeriniz neresi location", input: body("Yeriniz neresi"), expectReplyIncludes: "eminonu" },
  { id: "PS27", name: "Cift tarafli back photo info", input: body("Çift taraflı resim olabilir mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "arka" },
  { id: "PS30", name: "Completed urun geldi sikayet", input: body("Ürün geldi fakat siparişimle alakası yok", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // LOG REGRESSION devam
  { id: "LR01", name: "Bu olsun name_only degil", input: body("Bu olsun", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR12", name: "Elif Poyraz isim", input: body("Elif Poyraz", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "LR16", name: "Completed kargoya verdiniz mi", input: body("Benim ürünümü kargoya verdiniz mi acaba", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR20", name: "Completed cok kara", input: body("Çok kara olmuş hiç beğenmedim", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR34", name: "Completed kolay gelsin", input: body("Kolay gelsin", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "LR37", name: "human_su kargo", input: body("Herkesin kargosu geldi benim yok", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "LR40", name: "Completed kararma trust", input: body("Kararma olur mu", lazerCompleted()), expectReplyIncludes: "kararma" },

  // GPT GAP devam
  { id: "GC01", name: "Ummuhan Kaya isim", input: body("Ümmühan Kaya", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "GC06", name: "biraz once attim kabul", input: body("biraz önce attım", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "GC12", name: "Completed merhaba kolyeyi yapinca", input: body("Merhaba kolyeyi yapınca fotoğrafını atabilir misiniz", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "GC15", name: "3 adet 1400", input: body("3 adet istiyorum fiyat", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "1400" },
  { id: "GC27", name: "Kolye boyu kac cm 60", input: body("Kolye boyu kac cm", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },

  // 40K STRATEGIC devam
  { id: "ST11", name: "Kararma yapar mi 35x", input: body("Kararma yapar mı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kararma" },
  { id: "ST19", name: "Kapida odeme 68x", input: body("Kapıda ödeme", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "odeme" },
  { id: "ST22", name: "Zincir uzunlugu 60", input: body("Zincir uzunluğu nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },
  { id: "ST25", name: "Arkali onlu", input: body("Arkalı önlü"), expectReplyIncludes: "foto" },
  { id: "ST28", name: "Siparis vermek istiyorum lazer", input: body("Sipariş vermek istiyorum", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "TL" },
  { id: "ST35", name: "Tesekkur ederim", input: body("Teşekkür ederim"), expectReplyNotIncludes: "Ekibimize iletiyorum" },
  { id: "ST38", name: "Allah razi olsun", input: body("Allah razı olsun"), expectReplyNotIncludes: "Ekibimize iletiyorum" },
  { id: "ST39", name: "Detay 1602x", input: body("Detay"), expectReplyIncludes: "model" },
  { id: "ST41", name: "Neden cevap vermiyorsunuz", input: body("Neden cevap vermiyorsunuz", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // MIXED devam
  { id: "MX09", name: "Tamam da kargo", input: body("Tamam da kargo kaç günde gelir", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "shipping" } },
  { id: "MX11", name: "Bayildim arka yazi", input: body("Bayıldım arkasına yazı oluyor mu", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "back_text_info" } },
  { id: "MX16", name: "Pure tesekkur smalltalk", input: body("Teşekkür ederim"), expect: { last_intent: "smalltalk" } },
  { id: "MX19", name: "Pure begendim smalltalk", input: body("Çok beğendim"), expect: { last_intent: "smalltalk" } },
  { id: "MX20", name: "Pure insallah smalltalk", input: body("İnşallah"), expect: { last_intent: "smalltalk" } },

  // PRODUCTION LOG devam
  { id: "PL001", name: "human_su off vazgectim", input: body("Off vazgeçtim yaaa", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL022", name: "Completed bekliyorum2", input: body("Bekliyorum", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL025", name: "Completed cok tesekkur", input: body("Çok teşekkür ederim", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL028", name: "Completed merhabalar", input: body("Merhabalar", lazerCompleted()), expectReplyIncludes: "merhaba" },
  { id: "PL061", name: "w_letters tesekkur", input: body("Teşekkür ederim", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "rica" },
  { id: "PL066", name: "w_letters atacam", input: body("Atacam", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL073", name: "w_letters olur", input: body("Olur", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL075", name: "w_letters merhaba", input: body("Merhaba", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "merhaba" },
  { id: "PL078", name: "w_payment selam", input: body("Selam", lazerWaitingPayment()), expectReplyIncludes: "merhaba" },
  { id: "PL094", name: "w_photo tesekkurler", input: body("Teşekkürler", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "rica" },
  { id: "PL098", name: "w_photo fiyat", input: body("Fiyat", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL109", name: "w_product fiyat nedir", input: body("Fiyat nedir", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },

  // BUG FIX devam
  { id: "BF02", name: "Yolladim w_photo kabul", input: body("Yolladım fotoğrafı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "BF03", name: "Attim w_photo kabul", input: body("Attım fotoğrafı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "BF06", name: "Yazdim w_back_text kabul", input: body("Yazdım yukarıda", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "aldim" },
  { id: "BF08", name: "550 yap pazarlik", input: body("550 tl yap", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "sabit" },
  { id: "BF10", name: "Indirim var mi coklu", input: body("İndirim var mı acaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "coklu" },
  { id: "BF13", name: "URL bu olur mu photo", input: body("https://lookaside.fbsbx.com/photo.jpg bu olur mu", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "photo" } },
  { id: "BF14", name: "URL bunu istiyorum photo", input: body("https://lookaside.fbsbx.com/photo.jpg bunu istiyorum", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "photo" } },
  { id: "BF30", name: "Tekrar donecegim bekliyoruz", input: body("Tekrar döneceğim teşekkürler", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "bekliyoruz" },
  { id: "BF32", name: "Cross resimli 599", input: body("Resimli lazer kolye fiyatı nedir", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "599" },
  { id: "BF34", name: "Nakit kapida", input: body("Nakit", lazerWaitingPayment()), expect: { payment_method: "kapida_odeme" } },
  { id: "BF38", name: "Merhaba WhatsApp degil", input: body("Merhaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "0534" },
  { id: "BF39", name: "Tamam pazarlik degil", input: body("Tamam", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "sabit" },
  { id: "BF41", name: "Gumus olsun celik", input: body("Gümüş olsun lütfen", lazerWaitingPayment()), expectReplyIncludes: "celik" },
  { id: "BF45", name: "Fotograflar silinir mi ekibimiz", input: body("Fotograflar silinir mi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // LOG BUG FIX devam
  { id: "LB03", name: "Insallah completed dua", input: body("İnşallah", lazerCompleted()), expectReplyNotIncludes: "siparis" },
  { id: "LB04", name: "Amin completed dua", input: body("Amin", lazerCompleted()), expectReplyIncludes: "amin" },
  { id: "LB05", name: "Allah yardimciniz completed", input: body("Allah yardımcınız olsun", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "LB06", name: "Kac gun gelir completed kargo", input: body("Kaç gün içinde gelir", lazerCompleted()), expectReplyIncludes: "is gunu" },
  { id: "LB07", name: "Dekont completed iletebilirsiniz", input: body("Dekont yollayayım mı", lazerCompleted()), expectReplyIncludes: "iletebilirsiniz" },
  { id: "LB18", name: "Odemeyi yaptim completed ekibimiz", input: body("Ödemeyi yaptım bilginiz olsun", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LB20", name: "Teslimat suresi completed kargo", input: body("Ne zaman teslim edilir", lazerCompleted()), expectReplyIncludes: "is gunu" },

  // NOTE FIX devam
  { id: "NF02", name: "Kredi karti nakit", input: body("Kredi kartı ile ödeyebilir miyim", lazerWaitingPayment()), expectReplyIncludes: "nakit" },
  { id: "NF04", name: "Boyu ne kadar 60", input: body("Boyu ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },
  { id: "NF08", name: "Kargo parasi dahil", input: body("Kargo parası var mı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },
  { id: "NF09", name: "Completed name_only adres sormamalı", input: body("Tamam olur", lazerCompleted()), expectReplyNotIncludes: "ad soyad" },
  { id: "NF10", name: "Completed kolyem hazir mi ekibimiz", input: body("Kolyem hazır mı", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "NF14", name: "Eve teslim dahil", input: body("Eve teslim var mı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },
  { id: "NF15", name: "Kargo varmi dahil", input: body("Kargo varmı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },

  // ═══ BATCH 3: Kalan eksik testler ═══

  // BACKLOG devam
  { id: "B01", name: "Atacta foto sorusu", input: body("fotoğrafı nasıl göndereceğim", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "B03", name: "Atacta arka foto lazer", input: body("arkasına foto olur mu", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },
  { id: "B04", name: "Atacta arka foto fiyat", input: body("arka foto olursa fiyat ne olur", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },
  { id: "B05", name: "Atacta resim gonderme", input: body("resim nasıl gönderiyorum", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "B06", name: "Atacta iki yuz foto", input: body("iki yüzüne de foto olur mu", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },
  { id: "B07", name: "Atacta arka tarafa foto", input: body("arka tarafa foto olur mu", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },
  { id: "B08", name: "Atacta arka tarafa yazi", input: body("arka tarafa yazı olur mu", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },
  { id: "B09", name: "Atacta fotograf atsam", input: body("fotoğraf atsam olur mu", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "B10", name: "Atacta arka yuz fotograf", input: body("arka yüzüne fotoğraf koyabiliyor muyuz", atac()), expectReplyNotIncludes: "ekibimize iletiyorum", expectReplyIncludes: "lazer" },

  // ADDRESS GUARD devam
  { id: "NA01", name: "Tek zincir satisi adres degil", input: body("Tek zincir satışı yapıyor musunuz", lazer({ conversation_stage: "waiting_photo" })), expect: { address_status: "" } },
  { id: "NA02", name: "Indirim yapmiyorsunuz adres degil", input: body("Pek indirim yapmıyor musunuz hiç", lazer({ conversation_stage: "waiting_photo" })), expect: { address_status: "" } },
  { id: "NA03", name: "2-3 tane adres degil", input: body("2 veya 3 tane yaptırmak istiyoruz", lazer({ conversation_stage: "waiting_photo" })), expect: { address_status: "" } },
  { id: "NA05", name: "Kargoya verildi mi adres degil", input: body("Kargoya verildi mi acaba", lazerWaitingAddress()), expect: { address_status: "" } },

  // NAME GUARD devam
  { id: "NN01", name: "Kolyem hazir mi isim degil", input: body("Kolyem hazır mı", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad" },
  { id: "NN03", name: "Urun celik mi isim degil", input: body("Ürün çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "NN07", name: "Resimli madalyon isim degil", input: body("Resimli madalyon"), expect: { ilgilenilen_urun: "lazer" } },
  { id: "NN12", name: "Adres bilgileri soru", input: body("Adres bilgilerimi tekrar yazmak gerekli mi", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "NN13", name: "Bekliyorum isim degil", input: body("Bekliyorum", lazerCompleted()), expectReplyNotIncludes: "ad soyad" },

  // LOG REGRESSION devam
  { id: "LR02", name: "Kusura bakmayin name degil", input: body("Kusura bakmayın ama", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR03", name: "Basimdan once name degil", input: body("Basımdan önce", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR04", name: "Diyarbakir Silvan name degil", input: body("Diyarbakır Silvan", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR05", name: "Hevesle bekleyecegim name degil", input: body("Hevesle bekleyeceğim", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR06", name: "Sizin attiginiz name degil", input: body("Sizin attığınız", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR07", name: "Ertesi gune kalir name degil", input: body("Ertesi güne kalır", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR08", name: "Iyi satislar name degil", input: body("İyi satışlar dilerim", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR09", name: "Bu olacak arkasinda name degil", input: body("Bu olacak arkasında", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR10", name: "Benim icin anlamli name degil", input: body("Benim için anlamlı", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "LR13", name: "Serap Ulas isim", input: body("Serap Ulaş", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "LR14", name: "Fatma Torun isim", input: body("Fatma Torun", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "LR15", name: "Veli Cicek isim", input: body("Veli Çiçek", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "LR17", name: "Completed bana mesaj geldi", input: body("Ptt den bana mesaj geldi çünkü", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR18", name: "Completed herkesin kargosu", input: body("Herkesin kargosu eline ulaştı benim yok", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR21", name: "Completed memnun degilim", input: body("Memnun değilim çok kara", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR22", name: "Completed net degil", input: body("Hiç net değil anlaşılmıyor", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR23", name: "Completed sinir oldum", input: body("Gerçekten çok sinir oldum", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LR24", name: "Kargo fiyati dahil", input: body("Kargo fiyati", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },
  { id: "LR25", name: "Kargo ucretlimi dahil", input: body("Kargo ücretlimi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },
  { id: "LR26", name: "Kolye boyu kac cm 60", input: body("Kolye boyu kac cm dır", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },
  { id: "LR28", name: "Kolye gumus mudur celik", input: body("Kolye gümüş müdür", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "LR29", name: "Gumus mu celik mi", input: body("Gümüş mü çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "LR31", name: "w_address yazdim kabul", input: body("Yazdım bilgileri", lazerWaitingAddress()), expectReplyIncludes: "aldim" },
  { id: "LR35", name: "w_payment evet arka yuz sorma", input: body("Evet", lazer({ conversation_stage: "waiting_payment", photo_received: "1", back_text_status: "received" })), expectReplyNotIncludes: "arka yuz" },
  { id: "LR36", name: "w_payment tamam odeme sor", input: body("Tamam", lazer({ conversation_stage: "waiting_payment", photo_received: "1", back_text_status: "received" })), expectReplyIncludes: "odeme" },
  { id: "LR38", name: "human_su sinir mesaji", input: body("Hep aynı şeyleri yazıyorsun sinir oldum", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "LR39", name: "Completed foto ekibimiz", input: body("Bu fotoğraf olsun", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // GPT GAP devam
  { id: "GC02", name: "Fatime Gunes isim", input: body("Fatime Güneş", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "GC03", name: "Halime Sahin isim", input: body("Halime Şahin", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "GC04", name: "Busra Balyedi isim", input: body("Büşra Balyedi", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "GC05", name: "Mercan Gorgulu isim", input: body("Mercan Görgülü", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "GC07", name: "daha once gonderdim kabul", input: body("daha önce gönderdim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "GC08", name: "resim yukarida kabul", input: body("resim yukarıda", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "GC09", name: "demin attim kabul", input: body("demin attım", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "GC10", name: "yazdim w_address kabul", input: body("Yazdım bilgileri", lazerWaitingAddress()), expectReplyIncludes: "aldim" },
  { id: "GC11", name: "belirtmistim w_address kabul", input: body("Belirtmiştim efendim", lazerWaitingAddress()), expectReplyIncludes: "aldim" },
  { id: "GC13", name: "Completed kargom hazir mi", input: body("Merhaba kargom hazır mı acaba", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "GC16", name: "4 tane 1750", input: body("4 tane istiyorum ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "1750" },
  { id: "GC20", name: "bu gumus mu celik", input: body("bu gümüş mü", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "GC21", name: "Kolye gumus mudur celik", input: body("Kolye gümüş müdür", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "GC22", name: "Kargo fiyati nedir dahil", input: body("Kargo fiyati nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "dahil" },
  { id: "GC24", name: "Completed gecmis olsun tesekkur", input: body("Çok geçmiş olsun", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "GC25", name: "Completed rica ederim ederiz", input: body("Rica ederim", lazerCompleted()), expectReplyIncludes: "ederiz" },
  { id: "GC26", name: "Completed kolay gelsin tesekkur", input: body("Kolay gelsin", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "GC29", name: "human_su ptt mesaj", input: body("PPT kargola göndermişsiniz mesaj geldi dün", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "GC31", name: "Completed kargom yarin", input: body("Kargom yarın elimde olur mu", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "GC32", name: "Completed kargom cikti mi", input: body("Benim kargom çıktı mı bilgi verilmedi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "GC33", name: "Sayfaniza bakmadiım name degil", input: body("Sayfanıza bakmadım bile", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "GC34", name: "Gorseli merak name degil", input: body("Görseli merak ediyorum", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "GC35", name: "Resimleri okeyliyelim name degil", input: body("Resimleri okeyliyelim", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },

  // 40K devam
  { id: "ST01", name: "Fiyat kontrol 5928x", input: body("Bir ürünün fiyatını kontrol edebilir misiniz?"), expectReplyIncludes: "model" },
  { id: "ST02", name: "Fiyat nedir 393x", input: body("Fiyat nedir"), expectReplyIncludes: "model" },
  { id: "ST03", name: "Fiyat 116x", input: body("Fiyat"), expectReplyIncludes: "model" },
  { id: "ST05", name: "Fiyat ne kadar 56x", input: body("Fiyat ne kadar"), expectReplyIncludes: "model" },
  { id: "ST09", name: "Gumus mu", input: body("Gümüş mü", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "ST10", name: "Materyali nedir", input: body("Ürünün materyali nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "ST15", name: "Kac gunde gelir 23x", input: body("Kaç günde gelir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },
  { id: "ST24", name: "Zincir urun yok cm", input: body("Zincir uzunluğu nedir"), expectReplyIncludes: "cm" },
  { id: "ST40", name: "Bilgi alabilir miyim", input: body("Bilgi alabilir miyim"), expectReplyIncludes: "model" },
  { id: "ST42", name: "Siparisim hazir mi", input: body("Siparişim hazır mı", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // ═══ BATCH 4: Kalan tüm eksik testler ═══

  // MS eksikler (38 adet)
  { id: "MS08", name: "Arka yazi olur mu", input: body("arkasına yazı olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS09", name: "Arka foto olur mu", input: body("arkasına foto olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS10", name: "Arka foto fiyat", input: body("arkasına foto koyarsam fiyat ne olur", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "ek ucret", expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS17", name: "Adres fallback yok", input: body("Kadıköy Moda Mah No:3", lazerWaitingAddress()), expect: { address_status: "address_only" }, expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS23", name: "Side w_photo kargo", input: body("kaç günde gelir", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "is gunu" },
  { id: "MS24", name: "Side w_photo kargo ucreti", input: body("kargo ücreti var mı", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "dahil" },
  { id: "MS25", name: "Side w_payment konum", input: body("yeriniz nerede", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "istanbul" },
  { id: "MS26", name: "Side w_payment guven", input: body("dolandırıcı mısınız", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "guven" },
  { id: "MS27", name: "Side w_payment kargo", input: body("kargo ne zaman gelir", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "is gunu" },
  { id: "MS28", name: "Side w_payment kargo ucreti", input: body("kargo ücretli mi", lazerWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "dahil" },
  { id: "MS29", name: "Side w_address konum", input: body("konumunuz nerede", lazerWaitingAddress()), expect: { conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "istanbul" },
  { id: "MS30", name: "Side w_address guven", input: body("güvenilir mi", lazerWaitingAddress()), expect: { conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" }, expectReplyIncludes: "guven" },
  { id: "MS31", name: "Atac letters konum", input: body("neredesiniz", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" }, expectReplyIncludes: "istanbul" },
  { id: "MS32", name: "Atac letters guven", input: body("güvenilir misiniz", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" }, expectReplyIncludes: "guven" },
  { id: "MS33", name: "Atac letters kargo", input: body("kargo ne zaman gelir", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" }, expectReplyIncludes: "is gunu" },
  { id: "MS34", name: "Atac payment konum", input: body("yeriniz nerede", atacWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "atac" }, expectReplyIncludes: "istanbul" },
  { id: "MS35", name: "Atac payment guven", input: body("dolandırıcı mısınız", atacWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "atac" }, expectReplyIncludes: "guven" },
  { id: "MS36", name: "Atac payment kargo", input: body("kaç günde gelir", atacWaitingPayment()), expect: { conversation_stage: "waiting_payment", ilgilenilen_urun: "atac" }, expectReplyIncludes: "is gunu" },
  { id: "MS37", name: "Atac address konum", input: body("neredesiniz", atacWaitingAddress()), expect: { conversation_stage: "waiting_address", ilgilenilen_urun: "atac" }, expectReplyIncludes: "istanbul" },
  { id: "MS38", name: "Atac address guven", input: body("güvenilir misiniz", atacWaitingAddress()), expect: { conversation_stage: "waiting_address", ilgilenilen_urun: "atac" }, expectReplyIncludes: "guven" },
  { id: "MS39", name: "Atac address kargo", input: body("teslimat süresi", atacWaitingAddress()), expect: { conversation_stage: "waiting_address", ilgilenilen_urun: "atac" }, expectReplyIncludes: "is gunu" },
  { id: "MS40", name: "Atac letters fiyat", input: body("fiyat ne kadar", atac({ conversation_stage: "waiting_letters" })), expect: { conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" } },
  { id: "MS44", name: "Switch lazer address atac", input: body("ataç alayım", lazerWaitingAddress({ address_status: "address_only" })), expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters", address_status: "" } },
  { id: "MS46", name: "Switch atac payment lazer", input: body("yok ben resimli istiyorum", atacWaitingPayment()), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo", payment_method: "" } },
  { id: "MS47", name: "Switch atac address lazer", input: body("resimli istiyorum", atacWaitingAddress({ address_status: "address_only" })), expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo", address_status: "" } },
  { id: "MS51", name: "kapida odeme var mi", input: body("kapida odeme var mi"), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS53", name: "havale olsun eft", input: body("havale olsun", lazerWaitingPayment()), expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" } },
  { id: "MS54", name: "eft ile odeyecegim", input: body("eft ile odeyecegim", lazerWaitingPayment()), expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" } },
  { id: "MS56b", name: "resim nasil gonderiyorum", input: body("resim nasıl gönderiyorum", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS57", name: "arka tarafa yazi olur mu", input: body("arka tarafa yazı olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS58", name: "iki yuzune de foto", input: body("iki yüzüne de foto olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "MS59", name: "teslimat ne zaman olur", input: body("teslimat ne zaman olur"), expectReplyIncludes: "is gunu" },
  { id: "MS60", name: "konum atar misiniz", input: body("konum atar mısınız"), expectReplyIncludes: "istanbul" },
  { id: "MS62", name: "+90 555 tel", input: body("+90 555 123 45 67", lazerWaitingAddress()), expect: { phone_received: "1" } },
  { id: "MS64", name: "Apartman kat adres", input: body("Lale Apartmanı Kat 2 No 5 Çankaya Ankara", lazerWaitingAddress()), expect: { address_status: "address_only" } },
  { id: "MS69", name: "w_letters iptal", input: body("vazgeçtim", atac({ conversation_stage: "waiting_letters" })), expect: { order_status: "cancel_requested", conversation_stage: "human_support" } },

  // PL eksikler (en sık production mesajlar)
  { id: "PL004", name: "human_su Cvp", input: body("Cvp", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL006", name: "human_su Bugun gelir mi", input: body("Bugün gelir mi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL007", name: "human_su Siparisim", input: body("Siparişim", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL011", name: "human_su Kargom halen gelmedi", input: body("Kargom halen gelmedi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL018", name: "Completed evet", input: body("Evet", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL020", name: "Completed tamam", input: body("Tamam", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL023", name: "Completed tesekkurler", input: body("Teşekkürler", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL026", name: "Completed tamam tesekkur", input: body("Tamam teşekkür ederim", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL029", name: "Completed tesekkurler emoji", input: body("Teşekkürler 🌸", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL031", name: "w_addr kapida odeme", input: body("Kapıda ödeme", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL033", name: "w_addr eft", input: body("Eft", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL034b", name: "w_addr slm", input: body("Slm", lazerWaitingAddress()), expectReplyIncludes: "merhaba" },
  { id: "PL036", name: "w_addr merhaba", input: body("Merhaba", lazerWaitingAddress()), expectReplyIncludes: "merhaba" },
  { id: "PL039", name: "w_addr amin", input: body("Amin", lazerWaitingAddress()), expectReplyIncludes: "efendim" },
  { id: "PL040", name: "w_addr selam", input: body("Selam", lazerWaitingAddress()), expectReplyIncludes: "merhaba" },
  { id: "PL046", name: "w_back_text cok begendim", input: body("Cok begendım", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "efendim" },
  { id: "PL047", name: "w_back_text fiyat", input: body("Fiyat nedir", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL049", name: "w_back_text emoji", input: body("😄😄😄😄😄", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL051", name: "w_back_text tamamdir tesekkur", input: body("Tamamdır çok teşekkür ederim", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "rica" },
  { id: "PL055", name: "w_back_text merhabalar", input: body("Merhabalar", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "merhaba" },
  { id: "PL056", name: "w_back_text urun ulasmadi", input: body("Ürünüm elime ulaşmadı henüz", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL058", name: "w_back_text tesekkur", input: body("Teşekkür ederim", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "rica" },
  { id: "PL062", name: "w_letters fiyat kontrol", input: body("Bir ürünün fiyatını kontrol edebilir misiniz?", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL068", name: "w_letters yeriniz nerede", input: body("Yeriniz nerede", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL077", name: "w_payment evet", input: body("Evet", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL080", name: "w_payment tamam", input: body("Tamam", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL081", name: "w_payment emoji", input: body("😊🙏", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL089", name: "w_payment fiyat", input: body("Fiyat", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL091b", name: "w_photo resimli lazer", input: body("Resimli lazer kolye", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL093", name: "w_photo fiyat kontrol", input: body("Bir ürünün fiyatını kontrol edebilir misiniz?", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL095", name: "w_photo resimli kolye", input: body("Resimli kolye", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL097", name: "w_photo bu", input: body("Bu", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL099", name: "w_photo fiyat ne kadar", input: body("Fiyat ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL100", name: "w_photo resimli", input: body("Resimli", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL102", name: "w_photo resimli lazer2", input: body("Resimli lazer", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL103", name: "w_photo fiyat nedir", input: body("Fiyat nedir", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL107", name: "w_product urun satin al", input: body("Ürün satın alabilir miyim?", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL108", name: "w_product yeriniz", input: body("Yeriniz nerede?", { menu_gosterildi: "evet" }), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL111", name: "w_product fiyat2", input: body("Fiyat", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },

  // LT eksikler
  { id: "LT03", name: "Gumus yapabiliyor musunuz", input: body("Gümüş yapabiliyor musunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kaplama" },
  { id: "LT07", name: "Hesaptan aticam eft", input: body("Hesaptan atıcam", lazerWaitingPayment()), expect: { payment_method: "eft_havale" } },
  { id: "LT08", name: "Ucreti attim kontrol", input: body("Ücreti attım kontrol eder misiniz", lazerWaitingAddress()), expectReplyIncludes: "ekibimiz" },
  { id: "LT09", name: "Parayi gonderdim completed", input: body("Parayı gönderdim", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LT11", name: "Alibeykoy kargo", input: body("Alibeyköydeyim ben", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "LT13", name: "PTT kargo gonderi", input: body("PTT kargo ile gönderim varmı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "PTT" },
  { id: "LT17", name: "Cok tatli w_address", input: body("Çok tatlı duruyor 🥰", lazerWaitingAddress()), expectReplyIncludes: "tesekkur" },
  { id: "LT18", name: "Arkali onlu fiyat fark yok", input: body("İki çocuğum var arkalı önlü ne kadar olur", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "fark" },
  { id: "LT19", name: "3 resim ayni kare", input: body("İyi günler 3 resim aynı karede oluyor mu acaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "evet" },
  { id: "LT22", name: "5 kisi tek yuze", input: body("5 kişi tek yüze olur mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "evet" },
  { id: "LT26", name: "Yapay zeka ile mi", input: body("Yapay zeka ile mi yapıyorsunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "yapay zeka kullanmiyoruz" },
  { id: "LT28", name: "Ne zaman elimde olur", input: body("Ne zaman elimde olur sipariş versem", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },
  { id: "LT30", name: "Siparisiniz olusturuldu", input: body("Siparişiniz oluşturuldu", lazerCompleted()), expectReplyIncludes: "onaylanmistir" },
  { id: "LT32", name: "Normal EFT pazarlik degil", input: body("EFT ile ödeyeceğim", lazerWaitingPayment()), expectReplyNotIncludes: "sabit" },
  { id: "LT33", name: "Merhaba bassagligi degil", input: body("Merhaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "basini" },
  { id: "LT34", name: "Tamam birlestirme degil", input: body("Tamam", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "birlestir" },
  { id: "LT35", name: "Fiyat kaplama degil", input: body("Fiyat ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "kaplama" },
  { id: "LT36", name: "Kapida odeme nedir degil", input: body("Kapıda ödeme olsun", lazerWaitingPayment()), expectReplyNotIncludes: "kurye" },
  { id: "LT37", name: "Celik mi paslanmaz", input: body("Çelik mi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paslanmaz" },
  { id: "LT38", name: "Kac gune hazir gun", input: body("Kaç güne hazır olur", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },
  { id: "LT39", name: "Donus yapacagim kargo degil", input: body("Tamam birkaç gün içinde dönüş yapacağım teşekkürler", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "bekliyoruz" },
  { id: "LT41", name: "550 yapin sabit", input: body("550 tl yap", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "sabit" },
  { id: "LT42", name: "Pahaliymiş tabi degil", input: body("Çok pahalıymış ya", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "tabi efendim" },
  { id: "LT44", name: "Ciplak URL photo", input: body("https://lookaside.fbsbx.com/photo.jpg", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "photo", photo_received: "1" } },
  { id: "LT45", name: "URL bu model ref", input: body("https://lookaside.fbsbx.com/photo.jpg bu model olsun", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "product_image_reference" } },
  { id: "LT46", name: "URL bu olur mu photo", input: body("https://lookaside.fbsbx.com/photo.jpg bu olur mu", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "photo" } },
  { id: "LT47", name: "Gonderdim w_photo2", input: body("Gönderdim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "LT48", name: "Gondermis oldugum ulasti", input: body("Göndermiş olduğum foto uygun mu acaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "ulasti" },

  // PS eksikler
  { id: "PS04", name: "Completed bayildim", input: body("Bayıldım çok güzel", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "PS07", name: "Completed peki", input: body("Peki", lazerCompleted()), expectReplyIncludes: "efendim" },
  { id: "PS08", name: "Completed tamamdir2", input: body("Tamamdır", lazerCompleted()), expectReplyIncludes: "efendim" },
  { id: "PS11", name: "Completed kargo mesaji gelmedi", input: body("Hala kargo mesajı gelmedi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PS18", name: "Completed bekliyorum stage", input: body("Bekliyorum", lazerCompleted()), expect: { conversation_stage: "order_completed" } },
  { id: "PS24", name: "Karar ma trust", input: body("Karar ma oluyor mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kararma" },
  { id: "PS26", name: "Zinciri kac santim", input: body("Zinciri kaç santım", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },
  { id: "PS28", name: "Iki tarafa da resim", input: body("İki tarafa da resim koyulabiliyor mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "arka" },
  { id: "PS29", name: "Onlu arkali", input: body("Önlü arkalı fotoğraf yapabiliyormusunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "arka" },

  // MX eksikler
  { id: "MX02", name: "Guzel zincir cm", input: body("Çok güzel zinciri kaç cm", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "chain_question" } },
  { id: "MX04", name: "Guzel kararma trust", input: body("Çok güzel olmuş kararma yapar mı", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "trust" } },
  { id: "MX06", name: "Kolay gelsin dayanikli", input: body("Kolay gelsin suya dayanıklı mı", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "material_question" } },
  { id: "MX08", name: "Begendim ne kadar", input: body("Beğendim ne kadar acaba", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "price" } },
  { id: "MX10", name: "Saglik kargo ne kadar", input: body("Elinize sağlık ama kargo ne kadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },
  { id: "MX12", name: "Tesekkur iki resim", input: body("Teşekkür ederim iki resim olur mu", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "back_photo_info" } },
  { id: "MX13", name: "Harika kapida var mi", input: body("Harika olmuş kapıda ödeme var mı", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "payment" } },
  { id: "MX15", name: "Pure kolay gelsin", input: body("Kolay gelsin", lazer({ conversation_stage: "waiting_photo" })), expect: { last_intent: "smalltalk" } },
  { id: "MX17", name: "Pure Allah razi olsun", input: body("Allah razı olsun"), expect: { last_intent: "smalltalk" } },

  // PR eksikler
  { id: "PR06", name: "fiyat ogrenebilir", input: body("fiyat öğrenebilir miyim"), expectReplyIncludes: "hangi" },
  { id: "PR07", name: "ne kadar fiyati", input: body("ne kadar fiyatı"), expectReplyIncludes: "hangi" },
  { id: "PR10", name: "ucret ne kadar", input: body("ücret ne kadar"), expectReplyIncludes: "hangi" },
  { id: "PR13", name: "Completed fiyat siparis degil", input: body("3 adet fiyat nedir", lazerCompleted()), expectReplyNotIncludes: "siparis icin gerekli bilgiler tamamlandi" },

  // BF eksikler
  { id: "BF04", name: "Yukarida w_photo kabul", input: body("Yukarıda gönderdim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "aldim" },
  { id: "BF16", name: "Kac resim koyabiliyorsunuz", input: body("Kaç resim koyabiliyorsunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "fotograf koyabil" },
  { id: "BF17", name: "Gumus yapabiliyor musunuz", input: body("Gümüş yapabiliyor musunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "BF18", name: "Yapim asamaniz nasil", input: body("Yapım aşamanız nasıl", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "grafiker" },
  { id: "BF21", name: "3 lu yapiyormusunuz", input: body("3 lü yapıyormusunuz", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "fotograf koyabil" },
  { id: "BF23", name: "Hazir olunca foto atar misiniz", input: body("Hazır olunca foto atar mısınız", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "paylasiyoruz" },
  { id: "BF24", name: "Gondermeden once paylasir misiniz", input: body("Göndermeden önce paylaşır mısınız", lazerCompleted()), expectReplyIncludes: "paylasiyoruz" },
  { id: "BF27", name: "Gold renk w_photo not", input: body("Gold renk olsun", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "not aldim" },
  { id: "BF35", name: "Zincirin uzunlugu nekadar 60", input: body("Zincirin boyu yani uzunluğu nekadar", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },
  { id: "BF36", name: "Completed arka yazi ekibimiz", input: body("Ada 10.06.2020 yazılacak isim ve doğum tarihi", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "BF40", name: "Kapida olsun nakit degil", input: body("Kapıda ödeme olsun", lazerWaitingPayment()), expectReplyNotIncludes: "nakit olarak" },
  { id: "BF42", name: "Kapida odeme nedir nakit", input: body("Teyit için kapıda ödeme nedir", lazerWaitingPayment()), expectReplyIncludes: "nakit" },

  // LB eksikler
  { id: "LB08", name: "Kargo takip numarasi fallback", input: body("Kargo takip numarası rica ediyorum", lazerCompleted()), expectReplyIncludes: "ekibimize iletiyorum" },
  { id: "LB09", name: "Fotografi degistirebilir miyim", input: body("Fotoğrafı değiştirebilir miyim", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "LB10", name: "Bu fotograf olur mu soru", input: body("Bu fotoğraf olur mu güzel olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expect: { back_text_status: "" } },
  { id: "LB13", name: "Hakkinizi helal edin tesekkur", input: body("Hakkınızı helal edin lütfen", lazerCompleted()), expectReplyIncludes: "tesekkur" },
  { id: "LB14", name: "Bol kazanclar amin", input: body("Bol kazançlar hayırlı işler", lazerCompleted()), expectReplyIncludes: "amin" },
  { id: "LB15", name: "Siparis sonrasi fiyat 599", input: body("Fiyat bilgisi bekliyorum", lazerCompleted()), expectReplyIncludes: "599" },
  { id: "LB16", name: "Siparis sonrasi kararma", input: body("Kararma olmaz değil mi", lazerCompleted()), expectReplyIncludes: "kararma" },
  { id: "LB17", name: "Siparis sonrasi celik", input: body("Çelik mi bu", lazerCompleted()), expectReplyIncludes: "paslanmaz" },
  { id: "LB19", name: "Siparis sonrasi foto ekibimiz", input: body("https://lookaside.fbsbx.com/newphoto.jpg", lazerCompleted()), expectReplyIncludes: "ekibimiz" },

  // R eksikler
  { id: "R11", name: "Urun degisiminde back_text sifir", input: body("ataç kolye istiyorum", lazer({ photo_received: "1", back_text_status: "skipped" })), expect: { back_text_status: "" } },
  { id: "R18", name: "photo=1 gonderin yazmamalı", input: body("devam", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "fotografi gonderin" },
  { id: "R29", name: "EKB letters=1 w_payment", input: body("EKB", atac({ conversation_stage: "waiting_letters" })), expect: { letters_received: "1", conversation_stage: "waiting_payment" } },
  { id: "R30", name: "letters=1 w_payment korunmali", input: body("devam", atacWaitingPayment()), expect: { conversation_stage: "waiting_payment" } },
  { id: "R34", name: "Adres veriyorum status bos", input: body("adres veriyorum", lazerWaitingAddress({ address_status: "" })), expect: { address_status: "" } },

  // S eksik
  { id: "S02", name: "w_photo karar bozma", input: body("ne zaman gelir", lazer({ conversation_stage: "waiting_photo" })), expect: { conversation_stage: "waiting_photo" } },

  // NN eksikler
  { id: "NN08", name: "Nazar boncuklu isim degil", input: body("Nazar boncuklu", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },
  { id: "NN10", name: "Kolye gorebilir miyim name degil", input: body("Kolye mi görebilir miyim", lazerWaitingAddress()), expectReplyNotIncludes: "ad soyad bilginizi aldim" },
  { id: "NN14", name: "Daha once yapilan name degil", input: body("Daha önce yapılan", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ad soyad" },

  // TR eksik
  { id: "TR11", name: "size guveniyorum", input: body("size güveniyorum", lazer({ conversation_stage: "waiting_photo" })), expect: { ilgilenilen_urun: "lazer" } },

  // NF eksikler
  { id: "NF12", name: "Kapida nakit uyarisi", input: body("Kapıda kartla ödeme istiyorum", lazerWaitingPayment()), expectReplyIncludes: "nakit" },
  { id: "NF13", name: "Alerji celik birlikte", input: body("Peki kararma yapıyor mu birde benim alerjim çelik mi acaba", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "alerji" },

  // ST eksikler
  { id: "ST04", name: "Fiyat alabilirmiyim 60x", input: body("Fiyat alabilirmiyim"), expectReplyIncludes: "model" },
  { id: "ST06", name: "Fiyat alabilir miyim 43x", input: body("Fiyat alabilir miyim"), expectReplyIncludes: "model" },
  { id: "ST08", name: "Celikmi 13x", input: body("Çelikmi", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "celik" },
  { id: "ST12", name: "Kararma yapiyor mu 22x", input: body("Kararma yapıyor mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kararma" },
  { id: "ST13", name: "Kararma olur mu 10x", input: body("Kararma olur mu", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kararma" },
  { id: "ST14", name: "Kararma yaparmi 10x", input: body("Kararma yaparmı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "kararma" },
  { id: "ST16", name: "Kac gune gelir 15x", input: body("Kaç güne gelir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },
  { id: "ST17", name: "Ne zaman gelir 6x", input: body("Ne zaman gelir", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "gun" },
  { id: "ST20", name: "eft 24x", input: body("eft", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "EFT" },
  { id: "ST21", name: "Kapida odeme var mi 7x", input: body("Kapıda ödeme var mı", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "odeme" },
  { id: "ST23", name: "Zincir kac cm 4x", input: body("Zincir kaç cm", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "60" },
  { id: "ST26", name: "Arka yazi", input: body("Arka yazı"), expectReplyIncludes: "arka" },
  { id: "ST27", name: "Iki resim oluyor mu", input: body("İki resim oluyor mu"), expectReplyIncludes: "foto" },
  { id: "ST29", name: "Yaptirmak istiyorum lazer", input: body("Yaptırmak istiyorum", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "TL" },
  { id: "ST30", name: "Bende yaptirmak", input: body("Bende yaptırmak istiyorum", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "TL" },
  { id: "ST31", name: "Nasil siparis verebilirim", input: body("Nasıl sipariş verebilirim", lazer({ conversation_stage: "waiting_photo" })), expectReplyIncludes: "TL" },
  { id: "ST33", name: "yeriniz nerde", input: body("yeriniz nerde"), expectReplyIncludes: "Eminonu" },
  { id: "ST36", name: "Tesekkurler 187x", input: body("Teşekkürler"), expectReplyNotIncludes: "Ekibimize iletiyorum" },
  { id: "ST37", name: "Kolay gelsin 46x", input: body("Kolay gelsin"), expectReplyNotIncludes: "Ekibimize iletiyorum" },

  // ═══ BATCH 5: 750 tamamlama ═══

  // MS eksikler
  { id: "MS19", name: "Belirsiz mesaj crash yok", input: body("uzaylı kolye yapıyor musunuz"), expect: { success: true }, expectReplyIncludes: "hangi" },
  { id: "MS20", name: "Alakasiz mesaj crash yok", input: body("mercury retrograde sırasında bitcoin ne olur"), expect: { success: true }, expectReplyIncludes: "hangi" },
  { id: "MS56", name: "Resim nasil gonderiyorum2", input: body("resim nasıl gönderiyorum", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },

  // R eksikler
  { id: "R15", name: "Birazdan atacagim photo yok", input: body("birazdan fotoğraf atacağım", lazer({ conversation_stage: "waiting_photo" })), expect: { photo_received: "" } },
  { id: "R24", name: "Atac photo bos", input: body("ataç kolye istiyorum"), expect: { ilgilenilen_urun: "atac", photo_received: "" } },

  // PL kritik eksikler (production'dan en sık gelenler)
  { id: "PL002", name: "human_su Kolay gelsin siparis gelmedi", input: body("Kolay gelsin siparişim henüz gelmedi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL005", name: "human_su Cvp siparis gelmedi", input: body("Cvp siparişim henüz gelmedi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL008", name: "human_su Peki cvp bekliyorum", input: body("Peki cvp bekliyorum", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL009", name: "human_su Ekibi iletmediniz mi", input: body("Ekibi iletmediniz mi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL010", name: "human_su Ekibine iletmediniz mi", input: body("Ekibine iletmediniz mi siparişim henüz gelmedi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL012", name: "human_su Herkesin kargosu", input: body("Herkesin kargosu eline ulaştı benim yok", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL013", name: "human_su Sinir oldum", input: body("Gerçekten çok sinir oldume", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL014", name: "human_su Ekibinizden haber", input: body("Ekibinizden haber gelmedi mi", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL015", name: "human_su PPT kargo", input: body("PPT kargola göndermişsiniz mesaj geldi dün Telsim edeceğiz d", lazer({ conversation_stage: "human_support", order_status: "cancel_requested" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL016", name: "Completed PHONE", input: body("[PHONE]", lazerCompleted()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL024", name: "Completed kolyeyi yapinca", input: body("Merhaba kolyeyi yapınca fotoğrafını atabilir misiniz", lazerCompleted()), expectReplyIncludes: "ekibimiz" },
  { id: "PL027", name: "Completed tesekkurler2", input: body("Tesekkurler", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL030", name: "Completed tesekur typo", input: body("Teşekür ederim", lazerCompleted()), expectReplyIncludes: "rica" },
  { id: "PL032", name: "w_addr PHONE", input: body("[PHONE]", lazerWaitingAddress()), expectReplyIncludes: "ad soyad" },
  { id: "PL035", name: "w_addr bekliyorum", input: body("Bekliyorum", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL037", name: "w_addr kapida olsun", input: body("Kapıda ödeme olsun", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL041", name: "w_addr kapida2", input: body("Kapida", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL042", name: "w_addr kapida odeme2", input: body("Kapida odeme", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL043", name: "w_addr havale", input: body("Havale", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL044", name: "w_addr kapida3", input: body("Kapıda", lazerWaitingAddress()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL045", name: "w_addr tamam tesekkurler", input: body("Tamam teşekkürler", lazerWaitingAddress()), expectReplyIncludes: "rica" },
  { id: "PL048", name: "w_back_text emeginize", input: body("Emeğimize saglık", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL050", name: "w_back_text iki tane daha", input: body("Merhabalar ben iki tane daha yaptırmak istiyorum hediye ola", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL052", name: "w_back_text dekont", input: body("Ben dekontu sıze atamadım", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL053", name: "w_back_text emeginize2", input: body("Emegınıze saglık", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "efendim" },
  { id: "PL054", name: "w_back_text tsk ederim", input: body("Ben tsk ederım", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "rica" },
  { id: "PL057", name: "w_back_text takip no", input: body("Bir kargo takip numarası rica ediyorum", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL059", name: "w_back_text ulasamiyorum", input: body("Size asla ulaşamıyorum gerçekten ayıp ettnz ama yani", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyIncludes: "ekibimiz" },
  { id: "PL060", name: "w_back_text simdi yaptirmicam", input: body("Şimdi yaptirmicam sadece fiyatını sordun", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL063", name: "w_letters hediye olacak", input: body("Hediye olacak hepsi bir tane daha eklenecek siparişe inceley", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL064", name: "w_letters uc olacak", input: body("Aslında üç olacak dorduncunun bilgilerini ilecegim size", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL065", name: "w_letters birazdan bilgileri", input: body("Birazdan sizlere bilgileri atac", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL069", name: "w_letters cift tarafli", input: body("Kolye çift taraflı resim oluyor mu", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL070", name: "w_letters 4kisi", input: body("Pekı 4kısı yapabılıyor musunuz", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL071", name: "w_letters italyan zincir", input: body("Merhaba kolye sipariş etmistim İtalyan zincir istyrm var mi", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "harf" },
  { id: "PL072", name: "w_letters fiyati ayni mi", input: body("Fiyatı aynı mı oluyor", atac({ conversation_stage: "waiting_letters" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL074", name: "w_letters tesekkur iyi calisma", input: body("Teşekkür ederim tekrardan iyi çalışmalar 😊", atac({ conversation_stage: "waiting_letters" })), expectReplyIncludes: "rica" },
  { id: "PL082", name: "w_payment Mucizelerim", input: body("Mucizelerim Hira Umut", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL084", name: "w_payment gumus olsun", input: body("Gümüş olsun lütfen", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL085", name: "w_payment nerden siparis", input: body("Nerden sipariş veriyorum", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL086", name: "w_payment babami kaybettim", input: body("Babamı yeni kaybettim annem hayatta siz uygun birşey yazarsa", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL087", name: "w_payment evet eklemek", input: body("Evet eklemek isterim tabi", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL088", name: "w_payment sonsuzluk isareti", input: body("Sonsuzluk işareti iki tane kalp", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL090", name: "w_payment bu fotoyu", input: body("Bu fotoyu yapmak istiyorum", lazerWaitingPayment()), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL101", name: "w_photo resimli olan", input: body("Resimli olan", lazer({ conversation_stage: "waiting_photo" })), expectReplyNotIncludes: "ekibimize iletiyorum" },
  { id: "PL110", name: "w_product resimi kolye", input: body("Resimi kolye", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL112", name: "w_product bu urun", input: body("Bu ürün", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL113", name: "w_product fiyati nedir", input: body("Fiyatı nedir", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL114", name: "w_product bu", input: body("Bu", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL115", name: "w_product kolye fiyati", input: body("Kolye fiyati ne kadar", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL117", name: "w_product kolyeleri aldik", input: body("Kolyeleri aldık bu arada çok beğendik", { menu_gosterildi: "evet" }), expectReplyIncludes: "efendim" },
  { id: "PL118", name: "w_product daha once yapilan", input: body("Daha önce yapılan", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
  { id: "PL120", name: "w_product fiyat nedr typo", input: body("Fiyat nedr", { menu_gosterildi: "evet" }), expectReplyIncludes: "hangi" },
];

async function runTests() {
  let passed = 0, failed = [];
  for (const test of tests) {
    try {
      const res = await processChat(test.input);
      let ok = true;
      if (test.expect) { for (const k of Object.keys(test.expect)) { if (res[k] !== test.expect[k]) ok = false; } }
      if (test.expectReplyIncludes) { const r = normalizeForTest(res.ai_reply||""); const e = normalizeForTest(test.expectReplyIncludes); if (!r.includes(e)) ok = false; }
      if (test.expectReplyNotIncludes) { const r = normalizeForTest(res.ai_reply||""); const f = normalizeForTest(test.expectReplyNotIncludes); if (r.includes(f)) ok = false; }
      if (ok) { passed++; } else {
        console.log(`❌ ${test.id} - ${test.name}`);
        if (test.expect) { for (const k of Object.keys(test.expect)) { if (res[k] !== test.expect[k]) console.log(`   [${k}] exp="${test.expect[k]}" got="${res[k]}"`); } }
        if (test.expectReplyIncludes) { const r=normalizeForTest(res.ai_reply||""),e=normalizeForTest(test.expectReplyIncludes); if(!r.includes(e)) console.log(`   missing: "${test.expectReplyIncludes}" in "${(res.ai_reply||"").slice(0,120)}"`); }
        if (test.expectReplyNotIncludes) { const r=normalizeForTest(res.ai_reply||""),f=normalizeForTest(test.expectReplyNotIncludes); if(r.includes(f)) console.log(`   has: "${test.expectReplyNotIncludes}" in "${(res.ai_reply||"").slice(0,120)}"`); }
        failed.push(test.id);
      }
    } catch(e) { console.log(`💥 ${test.id}: ${e?.message||e}`); failed.push(test.id); }
  }
  console.log(`\n🎯 SONUÇ: ${passed}/${tests.length} geçti`);
  if (failed.length>0) console.log(`❌ Başarısız (${failed.length}): ${failed.join(", ")}`);
  if (passed!==tests.length) process.exit(1);
}
runTests();
