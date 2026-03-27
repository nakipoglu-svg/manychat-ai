// tests.js — Birleşik master test dosyası
// Kullanım: node tests.js

import { processChat } from "./api/chat.js";

console.log("🔥 TEST BAŞLADI");

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
function lazer(overrides = {}) {
  return {
    ilgilenilen_urun: "lazer",
    user_product: "lazer",
    context_lock: "1",
    order_status: "started",
    ...overrides,
  };
}

function atac(overrides = {}) {
  return {
    ilgilenilen_urun: "atac",
    user_product: "atac",
    context_lock: "1",
    order_status: "started",
    ...overrides,
  };
}

function lazerWaitingPayment(overrides = {}) {
  return lazer({
    photo_received: "1",
    back_text_status: "skipped",
    conversation_stage: "waiting_payment",
    ...overrides,
  });
}

function lazerWaitingAddress(overrides = {}) {
  return lazer({
    photo_received: "1",
    back_text_status: "skipped",
    payment_method: "eft_havale",
    conversation_stage: "waiting_address",
    ...overrides,
  });
}

function atacWaitingPayment(overrides = {}) {
  return atac({
    letters_received: "1",
    conversation_stage: "waiting_payment",
    ...overrides,
  });
}

function atacWaitingAddress(overrides = {}) {
  return atac({
    letters_received: "1",
    payment_method: "eft_havale",
    conversation_stage: "waiting_address",
    ...overrides,
  });
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
  // GRUP 1: CORE FLOW TESTS
  // ════════════════════════════════════════════════════════════════════════

  {
    id: "T01",
    name: "[CORE] Lazer ürün seçimi → waiting_photo",
    input: body("resimli lazer kolye"),
    expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
  },
  {
    id: "T02",
    name: "[CORE] Lazer seçimi fiyat yanıtı vermeli (599)",
    input: body("lazer istiyorum"),
    expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
    expectReplyIncludes: "599",
  },
  {
    id: "T03",
    name: "[CORE] Lazer: Facebook CDN foto URL → photo_received=1",
    input: body(
      "https://lookaside.fbsbx.com/photo123.jpg",
      lazer({ conversation_stage: "waiting_photo" })
    ),
    expect: { photo_received: "1", conversation_stage: "waiting_back_text" },
  },
  {
    id: "T04",
    name: "[CORE] Lazer: 'yok' → back_text_status=skipped",
    input: body("yok", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { back_text_status: "skipped", conversation_stage: "waiting_payment" },
  },
  {
    id: "T05",
    name: "[CORE] Lazer: 'istemiyorum' → back_text_status=skipped (iptal değil)",
    input: body("istemiyorum", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { back_text_status: "skipped", conversation_stage: "waiting_payment" },
  },
  {
    id: "T06",
    name: "[CORE] Lazer: EFT seçimi → waiting_address",
    input: body("eft", lazerWaitingPayment()),
    expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" },
  },
  {
    id: "T07",
    name: "[CORE] Lazer: kapıda ödeme seçimi → waiting_address",
    input: body("kapıda ödeme", lazerWaitingPayment()),
    expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" },
  },
  {
    id: "T08",
    name: "[CORE] Lazer: tek mesajda isim+telefon+adres → order_completed",
    input: body(
      "Ali Yılmaz 05551234567 İstanbul Kadıköy Moda Mah No:5",
      lazerWaitingAddress()
    ),
    expect: {
      address_status: "received",
      phone_received: "1",
      conversation_stage: "order_completed",
      order_status: "completed",
    },
  },
  {
    id: "T09",
    name: "[CORE] Lazer: order_completed sonrası adres korunmalı",
    input: body(
      "tamam",
      lazer({
        photo_received: "1",
        back_text_status: "skipped",
        payment_method: "eft_havale",
        address_status: "received",
        phone_received: "1",
        conversation_stage: "order_completed",
        order_status: "completed",
      })
    ),
    expect: { address_status: "received", conversation_stage: "order_completed" },
  },
  {
    id: "T10",
    name: "[CORE] Ataç ürün seçimi → waiting_letters",
    input: body("ataç kolye"),
    expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" },
  },
  {
    id: "T11",
    name: "[CORE] Ataç: harfler alınıyor → waiting_payment",
    input: body("ABC", atac({ conversation_stage: "waiting_letters" })),
    expect: { letters_received: "1", conversation_stage: "waiting_payment" },
  },
  {
    id: "T12",
    name: "[CORE] Ataç: EFT seçimi → waiting_address",
    input: body("eft", atacWaitingPayment()),
    expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" },
  },
  {
    id: "T13",
    name: "[CORE] Ataç: kapıda ödeme → waiting_address",
    input: body("kapıda ödeme", atacWaitingPayment()),
    expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" },
  },
  {
    id: "T14",
    name: "[CORE] Ataç: adres + telefon → order_completed",
    input: body(
      "Ayşe Kaya 05321234567 Ankara Çankaya Kızılay Cad No:10",
      atacWaitingAddress()
    ),
    expect: {
      address_status: "received",
      phone_received: "1",
      conversation_stage: "order_completed",
      order_status: "completed",
    },
  },
  {
    id: "T15",
    name: "[CORE] Konum sorusu → İstanbul/Eminönü cevabı",
    input: body("neredesiniz"),
    expectReplyIncludes: "eminonu",
  },
  {
    id: "T16",
    name: "[CORE] Kargo süresi sorusu → iş günü cevabı",
    input: body("kargo ne zaman gelir"),
    expectReplyIncludes: "is gunu",
  },
  {
    id: "T17",
    name: "[CORE] Güven sorusu → güven cevabı",
    input: body("güvenilir misiniz"),
    expectReplyIncludes: "guven",
  },
  {
    id: "T18",
    name: "[CORE] Merhaba → menü veya sıcak karşılama",
    input: body("merhaba"),
    expectReplyIncludes: "merhaba",
  },
  {
    id: "T19",
    name: "[CORE] İptal → cancel_requested + human_support",
    input: body("iptal etmek istiyorum", lazerWaitingPayment()),
    expect: { order_status: "cancel_requested", conversation_stage: "human_support" },
  },
  {
    id: "T20",
    name: "[CORE] Kargo ücreti sorusu → ücretsiz cevabı",
    input: body("kargo ücreti var mı"),
    expectReplyIncludes: "dahil",
  },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 2: REGRESSION TESTS
  // ════════════════════════════════════════════════════════════════════════

  {
    id: "R01",
    name: "[REG-A1] Ürün bağlamı varken 'merhaba' gelince menüye dönmemeli",
    input: body("merhaba", lazer({ conversation_stage: "waiting_photo" })),
    expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz",
  },
  {
    id: "R02",
    name: "[REG-A1] Ürün bağlamında ilgilenilen_urun korunmalı",
    input: body("tamam", lazer({ conversation_stage: "waiting_photo" })),
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    id: "R03",
    name: "[REG-A2] menu_gosterildi=evet varken ürün bağlamı menüyü engeller",
    input: body("devam", lazer({ menu_gosterildi: "evet", conversation_stage: "waiting_photo" })),
    expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz",
  },
  {
    id: "R04",
    name: "[REG-A3] 'Evet' kısa mesajı waiting_photo'da ürünü unutmamalı",
    input: body("evet", lazer({ conversation_stage: "waiting_photo" })),
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    id: "R05",
    name: "[REG-A3] 'Tamam' kısa mesajı waiting_letters'da ürünü unutmamalı",
    input: body("tamam", atac({ conversation_stage: "waiting_letters" })),
    expect: { ilgilenilen_urun: "atac" },
  },
  {
    id: "R06",
    name: "[REG-A5] context_lock=1 varken ürün bağlamı korunmalı",
    input: body("ne renk?", lazer({ context_lock: "1", conversation_stage: "waiting_photo" })),
    expect: { ilgilenilen_urun: "lazer", context_lock: "1" },
  },
  {
    id: "R07",
    name: "[REG-B1] 'Resimli' → lazer ürün seçimi",
    input: body("resimli"),
    expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
  },
  {
    id: "R08",
    name: "[REG-B1] 'Ataç' tek kelime → ataç ürün seçimi",
    input: body("ataç"),
    expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" },
  },
  {
    id: "R09",
    name: "[REG-B2] 'Ataç kolye' ürün seçimi - letters_received boş kalmalı",
    input: body("ataç kolye"),
    expect: { ilgilenilen_urun: "atac", letters_received: "" },
  },
  {
    id: "R10",
    name: "[REG-B5] Ürün değişiminde photo_received sıfırlanmalı",
    input: body(
      "ataç kolye istiyorum",
      lazer({ photo_received: "1", back_text_status: "skipped", conversation_stage: "waiting_payment" })
    ),
    expect: { photo_received: "" },
  },
  {
    id: "R11",
    name: "[REG-B5] Ürün değişiminde back_text_status sıfırlanmalı",
    input: body("ataç kolye istiyorum", lazer({ photo_received: "1", back_text_status: "skipped" })),
    expect: { back_text_status: "" },
  },
  {
    id: "R12",
    name: "[REG-B6] Lazer akışındayken ataç fiyatı sorulunca lazer ürünü bozulmamalı",
    input: body("ataç fiyatı ne kadar", lazer({ conversation_stage: "waiting_photo" })),
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    id: "R13",
    name: "[REG-B4] Aktif lazer varken ataç seçilince ürün değişmeli",
    input: body("yok ben ataç alayım", lazer({ conversation_stage: "waiting_photo" })),
    expect: { ilgilenilen_urun: "atac" },
  },
  {
    id: "R14",
    name: "[REG-C2] 'Fotoğrafı gönderiyorum' niyet cümlesi → photo_received set olmamalı",
    input: body("fotoğrafı gönderiyorum", lazer({ conversation_stage: "waiting_photo" })),
    expect: { photo_received: "" },
  },
  {
    id: "R15",
    name: "[REG-C2] 'Birazdan fotoğraf atacağım' → photo_received set olmamalı",
    input: body("birazdan fotoğraf atacağım", lazer({ conversation_stage: "waiting_photo" })),
    expect: { photo_received: "" },
  },
  {
    id: "R16",
    name: "[REG-C3] Instagram CDN URL → photo_received=1",
    input: body("https://cdninstagram.com/photo123.jpg", lazer({ conversation_stage: "waiting_photo" })),
    expect: { photo_received: "1" },
  },
  {
    id: "R17",
    name: "[REG-C3] .jpeg uzantılı URL → photo_received=1",
    input: body("https://example.com/foto.jpeg", lazer({ conversation_stage: "waiting_photo" })),
    expect: { photo_received: "1" },
  },
  {
    id: "R18",
    name: "[REG-C4] photo_received=1 sonrası 'fotoğrafı gönderin' yazmamalı",
    input: body("devam", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expectReplyNotIncludes: "fotografi gonderin",
  },
  {
    id: "R19",
    name: "[REG-C5] 'Bu foto olur mu?' waiting_back_text'te stage ilerletmemeli",
    input: body("bu foto olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { photo_received: "1", conversation_stage: "waiting_back_text" },
  },
  {
    id: "R20",
    name: "[REG-C6] 'Arkasına yazı oluyor mu?' back_text_status set etmemeli",
    input: body("arkasına yazı oluyor mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { back_text_status: "" },
  },
  {
    id: "R21",
    name: "[REG-C7] waiting_back_text'te gelen foto URL → back_text_status=received",
    input: body("https://lookaside.fbsbx.com/backphoto.jpg", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { back_text_status: "received" },
  },
  {
    id: "R22",
    name: "[REG-C8] Arka foto fiyat sorusu → ek ücret yok cevabı",
    input: body("arkasına foto koyarsam fiyat ne olur", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expectReplyIncludes: "ek ucret",
  },
  {
    id: "R23",
    name: "[REG-C9] Arka yazı alındıktan sonra waiting_payment gelmeli",
    input: body("sevgilime", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { back_text_status: "received", conversation_stage: "waiting_payment" },
  },
  {
    id: "R24",
    name: "[REG-D1] Ataç seçiminde photo_received set edilmemeli",
    input: body("ataç kolye istiyorum"),
    expect: { ilgilenilen_urun: "atac", photo_received: "" },
  },
  {
    id: "R25",
    name: "[REG-D2] Ataç: letters_received='' iken stage waiting_letters olmalı",
    input: body("devam", atac({ conversation_stage: "waiting_letters" })),
    expect: { conversation_stage: "waiting_letters" },
  },
  {
    id: "R26",
    name: "[REG-D3] Ataç: letters yokken 'eft' yazılsa stage waiting_letters kalmalı",
    input: body("eft", atac({ conversation_stage: "waiting_letters" })),
    expect: { conversation_stage: "waiting_letters" },
  },
  {
    id: "R27",
    name: "[REG-D3] Ataç: letters yokken 'kapıda ödeme' stage atlatmamalı",
    input: body("kapıda ödeme olsun", atac({ conversation_stage: "waiting_letters" })),
    expect: { conversation_stage: "waiting_letters" },
  },
  {
    id: "R28",
    name: "[REG-D4] Ataç: 'AYS' kısa harf girişi → letters_received=1",
    input: body("AYS", atac({ conversation_stage: "waiting_letters" })),
    expect: { letters_received: "1" },
  },
  {
    id: "R29",
    name: "[REG-D5] Harfler sonrası waiting_payment gelmeli",
    input: body("EKB", atac({ conversation_stage: "waiting_letters" })),
    expect: { letters_received: "1", conversation_stage: "waiting_payment" },
  },
  {
    id: "R30",
    name: "[REG-D6] letters_received=1 varken stage waiting_letters olmamalı",
    input: body("devam", atacWaitingPayment()),
    expect: { conversation_stage: "waiting_payment" },
  },
  {
    id: "R31",
    name: "[REG-E1] Tek 'havale' mesajı → eft_havale",
    input: body("havale", lazerWaitingPayment()),
    expect: { payment_method: "eft_havale" },
  },
  {
    id: "R32",
    name: "[REG-E1] Tek 'kapida' mesajı → kapida_odeme",
    input: body("kapida", lazerWaitingPayment()),
    expect: { payment_method: "kapida_odeme" },
  },
  {
    id: "R33",
    name: "[REG-E3] 'Kapıda ödeme olsun' → payment_method set edilmeli",
    input: body("kapıda ödeme olsun", lazerWaitingPayment()),
    expect: { payment_method: "kapida_odeme" },
  },
  {
    id: "R34",
    name: "[REG-F1] 'Adres veriyorum' niyet cümlesi → address_status boş kalmalı",
    input: body("adres veriyorum", lazerWaitingAddress({ address_status: "" })),
    expect: { address_status: "" },
  },
  {
    id: "R35",
    name: "[REG-F3] 'İstanbul içi kaç günde?' → address_status set edilmemeli",
    input: body("istanbul içi kaç günde gelir"),
    expect: { address_status: "" },
  },
  {
    id: "R36",
    name: "[REG-F4] Sadece adres gelince address_only (received değil)",
    input: body("İstanbul Kadıköy Moda Mah Bahariye Cad No:5", lazerWaitingAddress()),
    expect: { address_status: "address_only" },
  },
  {
    id: "R37",
    name: "[REG-F4] address_only varken order_completed olmamalı",
    input: body("İstanbul Kadıköy Moda Mah Bahariye Cad No:5", lazerWaitingAddress()),
    expect: { conversation_stage: "waiting_address" },
  },
  {
    id: "R38",
    name: "[REG-F7] İsim+telefon+adres tek mesajda → tam işlenmeli",
    input: body("Ahmet Yılmaz 05551234567 Ankara Çankaya Kızılay Mah No:3", lazerWaitingAddress()),
    expect: { address_status: "received", phone_received: "1", conversation_stage: "order_completed" },
  },
  {
    id: "R39",
    name: "[REG-F8] address_only varken telefon gelince received olmalı",
    input: body("05551234567", lazerWaitingAddress({ address_status: "address_only" })),
    expect: { address_status: "received", phone_received: "1" },
  },
  {
    id: "R40",
    name: "[REG-G5] order_completed'ta siparis_alindi=1 ve order_status=completed senkron",
    input: body("Ali 05551234567 İstanbul Kadıköy Moda Mah No:5", lazerWaitingAddress()),
    expect: { conversation_stage: "order_completed", order_status: "completed", siparis_alindi: "1" },
  },
  {
    id: "R41",
    name: "[REG-G6] İptal gelince siparis_alindi temizlenmeli",
    input: body("iptal", lazer({ order_status: "completed", siparis_alindi: "1", conversation_stage: "order_completed" })),
    expect: { siparis_alindi: "", order_status: "cancel_requested" },
  },
  {
    id: "R42",
    name: "[REG-H1] Güven sorusu aktif lazer akışında ürünü bozmamalı",
    input: body("güvenilir misiniz", lazer({ conversation_stage: "waiting_photo" })),
    expect: { ilgilenilen_urun: "lazer" },
    expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz",
  },
  {
    id: "R43",
    name: "[REG-H1] Kargo sorusu waiting_payment'ta stage bozmamali",
    input: body("kargo ne kadar sürer", lazerWaitingPayment()),
    expect: { conversation_stage: "waiting_payment" },
    expectReplyIncludes: "is gunu",
  },
  {
    id: "R44",
    name: "[REG-H2] 'Kargo ücreti var mı?' → ana menü açılmamalı",
    input: body("kargo ücreti var mı", lazerWaitingPayment()),
    expectReplyNotIncludes: "hangi model ile ilgileniyorsunuz",
  },
  {
    id: "R45",
    name: "[REG-J2] 'Kargom nerede?' → ekip yönlendirmesi gelmeli",
    input: body("kargom nerede"),
    expectReplyIncludes: "ekibimiz",
  },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 3: PARSING TESTS
  // ════════════════════════════════════════════════════════════════════════

  {
    id: "P01",
    name: "[PARSE] +90 formatı telefon → phone_received=1",
    input: body("+905551234567", lazerWaitingAddress()),
    expect: { phone_received: "1" },
  },
  {
    id: "P02",
    name: "[PARSE] 05XX formatı telefon → phone_received=1",
    input: body("05551234567", lazerWaitingAddress()),
    expect: { phone_received: "1" },
  },
  {
    id: "P03",
    name: "[PARSE] 8 haneli numara → phone_received set edilmemeli",
    input: body("12345678", lazerWaitingAddress()),
    expect: { phone_received: "" },
  },
  {
    id: "P04",
    name: "[PARSE] Mahalle+sokak+no kombinasyonu adres sayılmalı",
    input: body("Moda Mah Bahariye Cad No:5 Kadıköy", lazerWaitingAddress()),
    expect: { address_status: "address_only" },
  },
  {
    id: "P05",
    name: "[PARSE] Site+apartman+şehir kombinasyonu adres sayılmalı",
    input: body("Bahçeşehir Sitesi Lale Apt Kat:3 İstanbul", lazerWaitingAddress()),
    expect: { address_status: "address_only" },
  },
  {
    id: "P06",
    name: "[PARSE] Adres+telefon birlikte → received",
    input: body("Kadıköy Moda Mah No:3 05551234567", lazerWaitingAddress()),
    expect: { address_status: "received", phone_received: "1" },
  },
  {
    id: "P07",
    name: "[PARSE] lookaside.fbsbx.com URL → photo tanınmalı",
    input: body("https://lookaside.fbsbx.com/lookaside/crawler/media/?media_id=123", lazer({ conversation_stage: "waiting_photo" })),
    expect: { photo_received: "1" },
  },
  {
    id: "P08",
    name: "[PARSE] HTTP olmayan metin → photo sayılmamalı",
    input: body("example.com/foto.jpg", lazer({ conversation_stage: "waiting_photo" })),
    expect: { photo_received: "" },
  },
  {
    id: "P09",
    name: "[PARSE] Ataç: fiyat sorusu letters_received set etmemeli",
    input: body("fiyat ne kadar", atac({ conversation_stage: "waiting_letters" })),
    expect: { letters_received: "" },
  },
  {
    id: "P10",
    name: "[PARSE] 'Havale yapacağım' → eft_havale",
    input: body("havale yapacağım", lazerWaitingPayment()),
    expect: { payment_method: "eft_havale" },
  },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 4: VARIATION TESTS
  // ════════════════════════════════════════════════════════════════════════

  {
    id: "V01",
    name: "[VAR] 'Foto kolye' → lazer",
    input: body("foto kolye"),
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    id: "V02",
    name: "[VAR] 'Fotoğraflı kolye' → lazer",
    input: body("fotoğraflı kolye"),
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    id: "V03",
    name: "[VAR] 'Fotolu kolye' → lazer",
    input: body("fotolu kolye"),
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    id: "V04",
    name: "[VAR] 'Isim harf kolye' → ataç",
    input: body("isim harf kolye"),
    expect: { ilgilenilen_urun: "atac" },
  },
  {
    id: "V05",
    name: "[VAR] '3 harf kolye' → ataç",
    input: body("3 harf kolye"),
    expect: { ilgilenilen_urun: "atac" },
  },
  {
    id: "V06",
    name: "[VAR] 'Vazgeçtim' → cancel_requested",
    input: body("vazgeçtim", lazerWaitingPayment()),
    expect: { order_status: "cancel_requested" },
  },
  {
    id: "V07",
    name: "[VAR] 'Siparişi iptal' → cancel_requested",
    input: body("siparişi iptal", lazerWaitingPayment()),
    expect: { order_status: "cancel_requested" },
  },
  {
    id: "V08",
    name: "[VAR] 'Gerek yok' → back_text_status=skipped",
    input: body("gerek yok", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { back_text_status: "skipped" },
  },
  {
    id: "V09",
    name: "[VAR] 'Boş kalsın' → back_text_status=skipped",
    input: body("boş kalsın", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { back_text_status: "skipped" },
  },
  {
    id: "V10",
    name: "[VAR] 'Arka boş kalsın' → back_text_status=skipped",
    input: body("arka boş kalsın", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { back_text_status: "skipped" },
  },
  {
    id: "V11",
    name: "[VAR] 'Yazı olmasın' → back_text_status=skipped",
    input: body("yazı olmasın", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { back_text_status: "skipped" },
  },
  {
    id: "V12",
    name: "[VAR] 'Kaç günde gelir' → kargo cevabı",
    input: body("kaç günde gelir"),
    expectReplyIncludes: "is gunu",
  },
  {
    id: "V13",
    name: "[VAR] 'Teslimat süresi' → kargo cevabı",
    input: body("teslimat süresi ne kadar"),
    expectReplyIncludes: "is gunu",
  },
  {
    id: "V14",
    name: "[VAR] 'Yeriniz nerede' → İstanbul cevabı",
    input: body("yeriniz nerede"),
    expectReplyIncludes: "istanbul",
  },
  {
    id: "V15",
    name: "[VAR] 'Dolandırıcı mısınız' → güven cevabı",
    input: body("dolandırıcı mısınız"),
    expectReplyIncludes: "guven",
  },
  {
    id: "V16",
    name: "[VAR] 'Kapıda öderim' → kapida_odeme",
    input: body("kapıda öderim", lazerWaitingPayment()),
    expect: { payment_method: "kapida_odeme" },
  },
  {
    id: "V17",
    name: "[VAR] 'Kapıda olsun' → kapida_odeme",
    input: body("kapıda olsun", lazerWaitingPayment()),
    expect: { payment_method: "kapida_odeme" },
  },
  {
    id: "V18",
    name: "[VAR] 'EFT ile ödeyeceğim' → eft_havale",
    input: body("eft ile ödeyeceğim", lazerWaitingPayment()),
    expect: { payment_method: "eft_havale" },
  },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 5: STATE TRANSITION TESTS
  // ════════════════════════════════════════════════════════════════════════

  {
    id: "S01",
    name: "[STATE] Lazer: ürün belli, foto yok → waiting_photo",
    input: body("devam", lazer({ conversation_stage: "waiting_photo" })),
    expect: { conversation_stage: "waiting_photo" },
  },
  {
    id: "S02",
    name: "[STATE] Lazer: foto var, back_text yokken stage waiting_back_text ile başlayabilmeli",
    input: body("", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { conversation_stage: "waiting_back_text" },
  },
  {
    id: "S03",
    name: "[STATE] Ataç: ürün belli, harfler yok → waiting_letters",
    input: body("devam", atac({ conversation_stage: "waiting_letters" })),
    expect: { conversation_stage: "waiting_letters" },
  },
  {
    id: "S04",
    name: "[STATE] Lazer seçilince order_status=started",
    input: body("resimli lazer kolye"),
    expect: { order_status: "started" },
  },
  {
    id: "S05",
    name: "[STATE] Ataç'ta photo_received her zaman boş",
    input: body("AYS", atac({ conversation_stage: "waiting_letters" })),
    expect: { photo_received: "" },
  },
  {
    id: "S06",
    name: "[STATE] Ataç'ta back_text_status her zaman boş",
    input: body("AYS", atac({ conversation_stage: "waiting_letters" })),
    expect: { back_text_status: "" },
  },
  {
    id: "S07",
    name: "[STATE] Lazer'de letters_received her zaman boş",
    input: body("https://lookaside.fbsbx.com/foto.jpg", lazer({ conversation_stage: "waiting_photo" })),
    expect: { letters_received: "" },
  },
  {
    id: "S08",
    name: "[STATE] address_received varken 'tamam' gelince order_completed korunmalı",
    input: body(
      "tamam",
      lazer({
        photo_received: "1",
        back_text_status: "skipped",
        payment_method: "eft_havale",
        address_status: "received",
        phone_received: "1",
        conversation_stage: "order_completed",
        order_status: "completed",
      })
    ),
    expect: { address_status: "received", conversation_stage: "order_completed" },
  },
  {
    id: "S09",
    name: "[STATE] Lazerden ataca geçince yeni stage waiting_letters olmalı",
    input: body(
      "harfli ataç kolye istiyorum",
      lazer({ photo_received: "1", back_text_status: "skipped", conversation_stage: "waiting_payment" })
    ),
    expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" },
  },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 6: MANYCHAT CONTRACT TESTS
  // ════════════════════════════════════════════════════════════════════════

  {
    id: "MC01",
    name: "[MC] {{cuf_12345}} formatı boş sayılmalı",
    input: body("ataç kolye", { ilgilenilen_urun: "{{cuf_12345}}" }),
    expect: { ilgilenilen_urun: "atac" },
  },
  {
    id: "MC02",
    name: "[MC] {cuf_999} formatı boş sayılmalı",
    input: body("lazer istiyorum", { ilgilenilen_urun: "{cuf_999}" }),
    expect: { ilgilenilen_urun: "lazer" },
  },
  {
    id: "MC03",
    name: "[MC] cuf_123 prefix'li stage gerçek stage sayılmamalı",
    input: body("merhaba", { conversation_stage: "cuf_456" }),
    expect: { success: true },
    expectReplyIncludes: "hangi model",
  },
  {
    id: "MC04",
    name: "[MC] 'undefined' string değeri boş sayılmalı",
    input: body("merhaba", { ilgilenilen_urun: "undefined" }),
    expect: { ilgilenilen_urun: "" },
  },
  {
    id: "MC05",
    name: "[MC] 'null' string değeri boş sayılmalı",
    input: body("merhaba", { ilgilenilen_urun: "null" }),
    expect: { ilgilenilen_urun: "" },
  },
  {
    id: "MC06",
    name: "[MC] Boş mesaj gelince sistem çökmemeli (success:true)",
    input: body(""),
    expect: { success: true },
  },
  {
    id: "MC07",
    name: "[MC] Sadece boşluk mesaj gelince sistem çökmemeli",
    input: body("   "),
    expect: { success: true },
  },
  {
    id: "MC08",
    name: "[MC] Geçersiz stage string'i ignore edilmeli",
    input: body("ataç kolye", { conversation_stage: "some_invalid_stage_xyz" }),
    expect: { ilgilenilen_urun: "atac" },
  },
  {
    id: "MC09",
    name: "[MC] Yanıt her zaman success:true döndürmeli",
    input: body("neredesiniz"),
    expect: { success: true },
  },

  // ════════════════════════════════════════════════════════════════════════
  // GRUP 7: MODEL SAFETY TESTS
  // ════════════════════════════════════════════════════════════════════════

  {
    id: "MS01",
    name: "[MODEL] Fixed info: konum sorusu deterministic cevaplanmalı",
    input: body("neredesiniz"),
    expectReplyIncludes: "emin",
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS02",
    name: "[MODEL] Fixed info: kargo süresi deterministic cevaplanmalı",
    input: body("kargo ne zaman gelir"),
    expectReplyIncludes: "is gunu",
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS03",
    name: "[MODEL] Fixed info: kargo ücreti deterministic cevaplanmalı",
    input: body("kargo ücreti var mı"),
    expectReplyIncludes: "dahil",
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS04",
    name: "[MODEL] Fixed info: güven sorusu deterministic cevaplanmalı",
    input: body("güvenilir misiniz"),
    expectReplyIncludes: "guven",
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS05",
    name: "[MODEL] Fixed info: kararır mı sorusu deterministic cevaplanmalı",
    input: body("kararır mı"),
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS06",
    name: "[MODEL] Fixed info: kaplama atar mı deterministic cevaplanmalı",
    input: body("kaplaması atar mı"),
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS07",
    name: "[MODEL] Fixed info: zincir uzunluğu deterministic cevaplanmalı",
    input: body("zincir uzunluğu ne kadar", lazer({ conversation_stage: "waiting_photo" })),
    expectReplyIncludes: "60",
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS08",
    name: "[MODEL] Fixed info: arkasına yazı olur mu deterministic cevaplanmalı",
    input: body("arkasına yazı olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS09",
    name: "[MODEL] Fixed info: arkasına foto olur mu deterministic cevaplanmalı",
    input: body("arkasına foto olur mu", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS10",
    name: "[MODEL] Fixed info: arka foto fiyat farkı deterministic cevaplanmalı",
    input: body("arkasına foto koyarsam fiyat ne olur", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expectReplyIncludes: "ek ucret",
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS11",
    name: "[MODEL] Active flow: waiting_payment'ta 'eft' fallbacke düşmemeli",
    input: body("eft", lazerWaitingPayment()),
    expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" },
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS12",
    name: "[MODEL] Active flow: waiting_payment'ta 'kapıda ödeme' fallbacke düşmemeli",
    input: body("kapıda ödeme", lazerWaitingPayment()),
    expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" },
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS13",
    name: "[MODEL] Active flow: waiting_back_text'te 'yok' fallbacke düşmemeli",
    input: body("yok", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { back_text_status: "skipped", conversation_stage: "waiting_payment" },
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS14",
    name: "[MODEL] Active flow: waiting_back_text'te serbest arka yazı fallbacke düşmemeli",
    input: body("canım ailem", lazer({ photo_received: "1", conversation_stage: "waiting_back_text" })),
    expect: { back_text_status: "received", conversation_stage: "waiting_payment" },
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS15",
    name: "[MODEL] Active flow: waiting_letters'ta harf girdisi fallbacke düşmemeli",
    input: body("ABC", atac({ conversation_stage: "waiting_letters" })),
    expect: { letters_received: "1", conversation_stage: "waiting_payment" },
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS16",
    name: "[MODEL] Active flow: waiting_address'ta telefon girdisi fallbacke düşmemeli",
    input: body("05551234567", lazerWaitingAddress({ address_status: "address_only" })),
    expect: { phone_received: "1", address_status: "received" },
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS17",
    name: "[MODEL] Active flow: waiting_address'ta adres girdisi fallbacke düşmemeli",
    input: body("Kadıköy Moda Mah No:3", lazerWaitingAddress()),
    expect: { address_status: "address_only" },
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
  {
    id: "MS18",
    name: "[MODEL] Active flow: waiting_photo'ta gerçek foto URL fallbacke düşmemeli",
    input: body("https://lookaside.fbsbx.com/photo123.jpg", lazer({ conversation_stage: "waiting_photo" })),
    expect: { photo_received: "1", conversation_stage: "waiting_back_text" },
    expectReplyNotIncludes: "ekibimize iletiyorum",
  },
{
  id: "MS19",
  name: "[MODEL] No-key safety: belirsiz mesajda crash olmadan menü veya güvenli cevap dönmeli",
  input: body("uzaylı kolye yapıyor musunuz"),
  expect: { success: true },
  expectReplyIncludes: "hangi model",
},
  {
  id: "MS20",
  name: "[MODEL] No-key safety: çok alakasız mesajda crash olmadan menü veya güvenli cevap dönmeli",
  input: body("mercury retrograde sırasında bitcoin ne olur"),
  expect: { success: true },
  expectReplyIncludes: "hangi model",
},
];

// ─── RUNNER ───────────────────────────────────────────────────────────────
async function runTests() {
  let passed = 0;
  const failed = [];

  const categories = {
    CORE: [0, 0],
    REG: [0, 0],
    PARSE: [0, 0],
    VAR: [0, 0],
    STATE: [0, 0],
    MC: [0, 0],
    MODEL: [0, 0],
  };

  function getCat(id) {
    if (id.startsWith("T")) return "CORE";
    if (id.startsWith("R")) return "REG";
    if (id.startsWith("P")) return "PARSE";
    if (id.startsWith("V")) return "VAR";
    if (id.startsWith("S")) return "STATE";
    if (id.startsWith("MS")) return "MODEL";
    if (id.startsWith("MC")) return "MC";
    return "CORE";
  }

  for (const test of tests) {
    const cat = getCat(test.id);
    categories[cat][1]++;

    try {
      const res = await processChat(test.input, { skipKnowledgeCheck: true });
      let ok = true;

      if (test.expect) {
        for (const key of Object.keys(test.expect)) {
          if (res[key] !== test.expect[key]) {
            ok = false;
          }
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
          for (const key of Object.keys(test.expect)) {
            if (res[key] !== test.expect[key]) {
              console.log(`   [${key}] beklenen="${test.expect[key]}" gelen="${res[key]}"`);
            }
          }
        }

        if (test.expectReplyIncludes) {
          console.log(`   Reply içinde aranan: "${test.expectReplyIncludes}"`);
          console.log(`   Gelen: "${res.ai_reply}"`);
        }

        if (test.expectReplyNotIncludes) {
          console.log(`   Reply içinde OLMAMASI gereken: "${test.expectReplyNotIncludes}"`);
          console.log(`   Gelen: "${res.ai_reply}"`);
        }

        failed.push(test.id);
      }
    } catch (err) {
      console.log(`💥 ${test.id} - ${test.name}`);
      console.log(err?.message || err);
      failed.push(test.id);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log("KATEGORİ BAZLI SONUÇ:");

  const catNames = {
    CORE: "Core Flow",
    REG: "Regression",
    PARSE: "Parsing",
    VAR: "Variation",
    STATE: "State Machine",
    MC: "ManyChat Contract",
    MODEL: "Model Safety",
  };

  for (const [cat, [p, t]] of Object.entries(categories)) {
    if (t > 0) {
      const icon = p === t ? "✅" : "❌";
      console.log(`  ${icon} ${catNames[cat].padEnd(22)} ${p}/${t}`);
    }
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n🎯 SONUÇ: ${passed}/${tests.length} geçti`);

  if (failed.length > 0) {
    console.log(`❌ Başarısız: ${failed.join(", ")}`);
  }

  if (passed !== tests.length) {
    process.exit(1);
  }
}

runTests();
