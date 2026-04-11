// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NORMALIZE — Text temizleme, entity çıkarma, yardımcı fonksiyonlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  KW, LETTER_STOPWORDS, NOT_A_NAME, TURKEY_CITIES, DISTRICT_KEYWORDS,
  ADDRESS_KEYWORDS, VALID_STAGES, PRODUCT,
} from "./constants.js";

// ─── TEXT NORMALIZATION ─────────────────────────────────────

export function normalizeText(text) {
  return String(text || "")
    .replace(/İ/g, "i")
    .toLowerCase()
    .replace(/i̇/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/\u0307/g, "")
    .replace(/[^\w\s:/?.=&+\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasAny(text, keywords) {
  return keywords.some(k => {
    if (!text.includes(k)) return false;
    if (k.length === 1) return new RegExp(`\\b${k}\\b`).test(text);
    return true;
  });
}

// ─── UNWRAP (ManyChat {{}} template değişkenleri) ───────────

export function unwrap(value) {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (!str) return "";
  if (/^\{\{\{?.+?\}\}\}?$/.test(str)) return "";
  if (/^\{[^}]+\}$/.test(str)) return "";
  if (/^cuf_\d+$/i.test(str)) return "";
  if (/^(undefined|null|none|nan)$/i.test(str)) return "";
  return str;
}

export function truthy(value) {
  const v = normalizeText(unwrap(value));
  return ["1", "true", "evet", "yes", "var", "alindi", "tamam", "received", "done"].includes(v);
}

// ─── PRODUCT NORMALIZATION ──────────────────────────────────

export function normalizeProduct(value) {
  const v = normalizeText(value);
  if (["lazer", "resimli", "resimli lazer kolye"].includes(v)) return PRODUCT.LAZER;
  if (["atac", "ataç", "harfli atac kolye", "harfli ataç kolye"].includes(v)) return PRODUCT.ATAC;
  return "";
}

export function normalizeStage(value) {
  const v = normalizeText(unwrap(value)).replace(/\s+/g, "_");
  return VALID_STAGES.has(v) ? v : "";
}

export function normalizePayment(value) {
  const v = normalizeText(value);
  if (!v) return "";
  if (v.includes("kapida")) return "kapida_odeme";
  if (v.includes("eft") || v.includes("havale")) return "eft_havale";
  return "";
}

export function normalizeOrderStatus(value) {
  const v = normalizeText(value);
  if (!v) return "";
  if (["started", "collecting", "address_pending"].includes(v)) return "started";
  if (["completed", "done", "tamam"].includes(v)) return "completed";
  if (["cancel_requested"].includes(v)) return "cancel_requested";
  return "";
}

export function normalizeBackText(value) {
  const v = normalizeText(value);
  if (!v) return "";
  if (["received", "alindi", "done", "tamam"].includes(v)) return "received";
  if (["skipped", "atlandi", "istemiyor", "yok"].includes(v)) return "skipped";
  return "";
}

export function normalizeAddress(value) {
  const v = normalizeText(value);
  if (!v) return "";
  if (["received", "alindi", "done", "tamam"].includes(v)) return "received";
  if (["address_only", "eksik", "partial"].includes(v)) return "address_only";
  return "";
}

// ─── ENTITY EXTRACTION ──────────────────────────────────────

export function looksLikePhotoUrl(raw = "") {
  const t = String(raw).trim().toLowerCase();
  if (!t.startsWith("http://") && !t.startsWith("https://")) return false;
  return (
    t.includes("lookaside.fbsbx.com") || t.includes("ig_messaging_cdn") ||
    t.includes("cdninstagram") || t.includes("cdn.instagram") ||
    t.includes("amojo.kommo.com") ||
    t.includes(".jpg") || t.includes(".jpeg") || t.includes(".jpe") ||
    t.includes(".png") || t.includes(".webp")
  );
}

export function extractPhone(raw = "") {
  const s = String(raw);
  
  // Tarih koruması — dd.mm.yyyy veya dd/mm/yyyy formatları telefon değil
  // Mesajın tamamı tarih ise kesinlikle telefon değil
  if (/^\s*\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}\s*$/.test(s.trim())) return "";
  
  // Mesaj içindeki tarihleri temizle — telefon aramasını bozmamak için
  let cleaned = s.replace(/\b\d{2}[.\/]\d{2}[.\/]\d{4}\b/g, "DATE");
  // Adres numaralarını temizle — "no 51" gibi kısa sayıları telefona karıştırma
  cleaned = cleaned.replace(/\b(?:no|kat|daire|blok|bina)\s*[:\s]?\s*\d{1,3}\b/gi, "ADDR");
  
  // +90 ile başlayan
  const plus90 = cleaned.match(/\+\s*90\s*[\s().-]*5\d[\s().\-]*\d[\s().\-]*\d[\s().\-]*\d[\s().\-]*\d[\s().\-]*\d[\s().\-]*\d[\s().\-]*\d[\s().\-]*\d/g);
  if (plus90) {
    const d = plus90[0].replace(/\D/g, "");
    if (/^905\d{9}$/.test(d)) return d.slice(-10);
  }
  
  // Standart 05xx ve 5xx pattern'leri
  const matches = cleaned.match(/(?:0?5\d(?:[\s().\-]*\d){8})/g) || [];
  for (const m of matches) {
    const d = m.replace(/\D/g, "");
    if (d.length === 11 && /^05\d{9}$/.test(d)) return d.slice(-10);
    if (d.length === 10 && /^5\d{9}$/.test(d)) return d;
  }
  
  // tel: / telefon: / cep: etiketli telefon
  const telLabel = s.match(/(?:tel|telefon|cep|numara|gsm)\s*(?:no|num|numarası|numarasi)?\s*[:\-=]?\s*\(?\s*([\+]?\s*(?:90\s*)?0?5[\d\s().\-]{8,14})/i);
  if (telLabel) {
    const d = telLabel[1].replace(/\D/g, "");
    if (/^905\d{9}$/.test(d)) return d.slice(-10);
    if (/^05\d{9}$/.test(d)) return d.slice(-10);
    if (/^5\d{9}$/.test(d)) return d;
  }
  
  // Parantezli: (0532) 123 45 67
  const parenMatch = s.match(/\(\s*0?5\d{2}\s*\)\s*\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/);
  if (parenMatch) {
    const d = parenMatch[0].replace(/\D/g, "");
    if (/^0?5\d{9}$/.test(d)) return d.slice(-10);
  }
  
  // "numaram/numaramı" + telefon
  const numaramMatch = s.match(/numara[a-zıöüçşğ]*\s*[:\s]?\s*(0?5\d[\d\s.\-]{8,12})/i);
  if (numaramMatch) {
    const d = numaramMatch[1].replace(/\D/g, "");
    if (/^0?5\d{9}$/.test(d)) return d.slice(-10);
  }
  
  return "";
}

export function looksLikeAddress(norm, raw = "", stage = "") {
  raw = String(raw).trim();
  if (!raw || raw.length < 5) return false;
  if (/[?]/.test(raw)) return false;
  if (/\b(mi|mı|mu|mü|miyim|mıyım|musun|müsün)\b/i.test(raw)) return false;

  let hit = 0;
  for (const k of ADDRESS_KEYWORDS) { if (norm.includes(k)) hit++; }
  const hasNumber = /\d/.test(raw);
  const cityHit = TURKEY_CITIES.filter(c => norm.includes(c)).length;
  const distHit = DISTRICT_KEYWORDS.filter(d => norm.includes(d)).length;
  
  // Etiketli adres: "Adres:", "Açık adres:", "Teslimat adresi:"
  if (/adres\s*:/i.test(raw)) return true;
  
  // İl/İlçe formatı: "İstanbul/Kadıköy" veya "İstanbul / Kadıköy"
  if (stage === "waiting_address" && /^[A-ZÇĞİÖŞÜa-zçğıöşü]+\s*\/\s*[A-ZÇĞİÖŞÜa-zçğıöşü]+/i.test(raw) && cityHit >= 1) return true;

  if (stage === "waiting_address") {
    if (hit >= 2) return true;
    if (hit >= 1 && hasNumber) return true;
    if (cityHit >= 1 && distHit >= 1) return true;
    if (cityHit >= 1 && hit >= 1) return true;
    if (raw.length >= 20 && cityHit >= 1 && hasNumber) return true;
    // Kısa ama şehir + ilçe var
    if (cityHit >= 1 && raw.length >= 10 && /\//.test(raw)) return true;
  } else {
    if (hit >= 3) return true;
    if (hit >= 2 && hasNumber && cityHit >= 1) return true;
    if (hit >= 2 && cityHit >= 1) return true;
  }
  return false;
}

export function looksLikeName(raw = "", norm = "", stage = "") {
  if (stage !== "waiting_address") return false;
  raw = String(raw).trim();
  if (!raw || raw.length < 3 || raw.length > 40) return false;
  if (/\d/.test(raw) || /[?!.:/]/.test(raw)) return false;

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length > 4) return false;
  if (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/.test(raw)) return false;

  const n = normalizeText(raw);
  for (const phrase of NOT_A_NAME) { if (n.includes(phrase)) return false; }

  if (/\b(yorum|yorsun|yor|yoruz|yorsunuz|yorlar|acagim|acağım|ecegim|eceğim|ayim|ayım|eyim|elim|alim|misiniz|mısınız|musunuz|müsünüz|miyim|mıyım|bilir|abilir|ebilir|sana|bana|size|bize)\b/i.test(raw)) return false;
  if (/\b\S+(mek|mak|dım|dim|tım|tim|dık|dik|tık|tik|sın|sin|sun|sün|lım|lim|nız|niz|lar|ler|dan|den|tan|ten)\b/i.test(n)) return false;

  const TWO_WORD_NON = ["bu olsun","su olsun","bunu istiyorum","bunu yap","ne guzel","cok guzel","iyi gunler","iyi aksamlar","kolay gelsin","hayirli isler","bol kazanc","tamam olur","peki tamam","hadi tamam","cok tesekkur","rica ederim","rica ederiz",
    "ne haber","ne zaman","ne kadar","biri kiz","biri oglan","iki tane","iki kiz","iki oglum","iki cocuk","dogum tarih","yeni adres","ilk gonderdigim","resmi secim","benmle olan","one tekli","bu gumus","a nehaber","a ne haber","k bakmayin"];
  if (TWO_WORD_NON.some(p => n.includes(p))) return false;

  for (const intentKey of Object.keys(KW)) {
    if (intentKey.startsWith("product_")) {
      if (hasAny(n, KW[intentKey])) return false;
    }
  }
  for (const intentKey of Object.keys(KW)) {
    if (!intentKey.startsWith("product_") && KW[intentKey]) {
      if (hasAny(n, KW[intentKey])) return false;
    }
  }

  if (looksLikeAddress(n, raw, stage)) return false;

  // Tek kelime isim: ÇOK RİSKLİ — FP oranı çok yüksek
  // "Şimdi", "Zincir", "Uygun", "Resim" gibi kelimeler isim sanılıyor
  // Tek kelime isim algılama kapalı — gerçek isimler genelde ad+soyad olarak gelir
  if (parts.length === 1) return false;

  // İki kelime ama ikisi de kısa ve anlamsız → isim değil (örn: "He ya", "Ok tm")
  if (parts.length === 2 && parts.every(p => p.length <= 3)) return false;

  // Soru kelimesi içeriyorsa isim değil
  if (/\b(mu|mı|mi|mü|kaç|kac|nasıl|nasil|neden|niçin|nicin|niye|hangisi|hangi|nerede|nere)\b/i.test(raw)) return false;

  // Fiil eki içeren kelimeler → isim değil
  if (/\b\w+(yor|yorum|yoruz|uyoruz|ıyoruz|üyor|iyor|acak|ecek|acağım|eceğim|abiliyor|ebiliyor|alım|elim|ayım|eyim|abilir|ebilir|sın|sin|sun|sün|iyomu|iyomu|iyormu|iyormı|sek|sem|sen|sam|san)\b/i.test(raw)) return false;

  // "oldu", "olmuş", "geldi", "gitti" gibi yaygın fiil kalıpları
  if (/\b(oldu|olmus|olmuş|geldi|gitti|kaldi|kaldı|yazdi|yazdı|aldi|aldı|verdi|gonderdi|gönderdi|yapti|yaptı|bitti|cikti|çıktı|girdi|buldu|gordu|gördü)\b/i.test(n)) return false;

  // 3+ kelime ama arada bağlaç/edat varsa cümle, isim değil
  if (parts.length >= 3 && /\b(ve|ile|ama|fakat|icin|için|gibi|kadar|bana|sana|size|bize|da|de|mi|mu|mı|mü)\b/i.test(raw)) return false;

  return true;
}

export function parsePaymentFromMessage(norm, existing = "") {
  // "Kapıda kart ile" → kapıda ödeme olarak al (kapıda sadece nakit ama müşteri bunu bilmeyebilir)
  // Önce kapıda + kart combo kontrolü
  if (hasAny(norm, ["kapida kart","kapıda kart","kapida kartla","kapıda kartla"])) return "kapida_odeme";
  
  // Saf kredi kartı (kapıda olmadan) → desteklenmiyor, boş dön
  if (hasAny(norm, ["kredi karti", "kredi kartı"]) && !hasAny(norm, ["kapida","kapıda"])) return existing || "";
  if (hasAny(norm, ["kartla", "kart ile"]) && !hasAny(norm, ["kapida","kapıda"])) return existing || "";
  
  // INFO QUESTION GUARD: "fark nedir", "nasıl oluyor", "ne kadar" → payment SELECTION değil
  // AMA: seçim fiili varsa ("olsun", "seçeyim", "olur") → commit izni ver
  const hasSelectionVerb = hasAny(norm, ["olsun","seceyim","seçeyim","istiyorum","sectim","seçtim","olur","yapalim","yapalım","yapacagim","yapacağım"]);
  const isInfoQuestion = hasAny(norm, ["fark nedir","arasindaki fark","arasındaki fark","farki ne","farkı ne","hangisi nasil","hangisi nasıl","nasil oluyor","nasıl oluyor","ne demek","ne anlama","ne kadar","nekadar","kac tl","kaç tl","kac lira","kaç lira","fiyati ne","fiyatı ne","ucret ne","ücret ne"]);
  const isPriceConfirmation = hasAny(norm, ["degil mi","değil mi","dimi","di mi","demi","de mi","miydi","midir","mudur"]);
  
  if (isInfoQuestion && !hasSelectionVerb) return existing || "";
  if (isPriceConfirmation && !hasSelectionVerb) return existing || "";
  
  // Negation detection: "kapıda değil" → kapıda'yı reddet
  const negatesKapida = hasAny(norm, ["kapida degil","kapıda değil","kapida istemiyorum","kapıda istemiyorum","kapida olmaz","kapıda olmaz"]);
  const negatesEft = hasAny(norm, ["eft degil","eft değil","eft istemiyorum","havale degil","havale değil","havale istemiyorum"]);
  
  if (negatesKapida && hasAny(norm, ["eft","havale","hesaptan"])) return "eft_havale";
  if (negatesEft && hasAny(norm, ["kapida","kapıda","nakit"])) return "kapida_odeme";
  
  if (hasAny(norm, ["kapida odeme", "kapıda ödeme", "kapida", "kapıda", "odeme olsun", "ödeme olsun", "kalida", "nakit"])) return "kapida_odeme";
  if (hasAny(norm, ["eft", "havale", "hesaptan"])) return "eft_havale";
  return existing || "";
}

export function detectProductFromText(norm) {
  if (hasAny(norm, KW.product_lazer)) return PRODUCT.LAZER;
  if (hasAny(norm, KW.product_atac)) return PRODUCT.ATAC;
  return "";
}

export function extractLetters(raw, norm, product, stage) {
  if (product !== PRODUCT.ATAC) return "";
  if (!["", "waiting_letters", "waiting_product"].includes(stage)) return "";
  raw = String(raw || "").trim();
  if (!raw || raw.length > 24) return "";
  if (/[?!.:,/]/.test(raw)) return "";
  if (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s&]+$/.test(raw)) return "";
  const parts = normalizeText(raw).split(/\s+/).filter(Boolean);
  if (parts.length > 3) return "";
  if (LETTER_STOPWORDS.has(normalizeText(raw))) return "";
  if (hasAny(normalizeText(raw), [
    "atac","ataç","harfli","kolye","istiyorum","ilgileniyorum",
    "almak istiyorum","kac tane","kaç tane","hangi harf","hangi harfler",
    "harf mi","fiyat","ne kadar","olur mu","celik","çelik",
    "kararma","paslanmaz","malzeme",
  ])) return "";
  return raw;
}

// ─── CLEAN REPLY ────────────────────────────────────────────

export function cleanReply(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  return t.replace(/^["'\s]+|["'\s]+$/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

// ─── ENTRY PRODUCT (reklam / flow kaynaklı) ─────────────────

export function getEntryProduct(body = {}) {
  const candidates = [
    body.entry_product, body.ad_product, body.flow_product,
    body.trigger_product, body.product_context, body.source_product,
  ];
  for (const c of candidates) {
    const n = normalizeProduct(unwrap(c));
    if (n) return n;
  }
  return "";
}
