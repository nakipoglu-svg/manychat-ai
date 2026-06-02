// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NORMALIZE — Text temizleme, entity çıkarma, yardımcı fonksiyonlar
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  KW, LETTER_STOPWORDS, NOT_A_NAME, TURKEY_CITIES, DISTRICT_KEYWORDS,
  ADDRESS_KEYWORDS, VALID_STAGES, PRODUCT,
} from "./constants.js";

// ─── TEXT NORMALIZATION ─────────────────────────────────────

export function normalizeText(text) {
  let t = String(text || "")
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
  // Product typo normalization
  t = t.replace(/\baracli\b/g, "atacli");
  t = t.replace(/\baracl\b/g, "atacl");
  t = t.replace(/\batin deil/g, "altin degil");
  t = t.replace(/\batin mi\b/g, "altin mi");
  return t;
}

// Word-boundary regex cache — Türkçe morfolojisine uyarlı asymmetric boundary
// Türkçe aglutinatif bir dildir: kelime başında önek YOK, kelime sonunda ek VAR.
//   - "ebat" → "ebatı", "ebatları", "ebata" → başta word-boundary, sonda serbest (stem match)
//   - "deri" → "ederim" içinde substring → leak (başta word-boundary gerek)
// Asymmetric: başta `(^|\s)` zorunlu, sonda ek serbest
const _wbCache = new Map();
function _wbTest(text, k) {
  let r = _wbCache.get(k);
  if (!r) {
    const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Başta sert word-boundary, sonda hiçbir şey (stem'in sonuna Türkçe ek gelebilir)
    r = new RegExp(`(^|\\s)${esc}`);
    _wbCache.set(k, r);
  }
  return r.test(text);
}

// Kısa keyword'lerde (≤4 char) Türkçe collision riski yüksek:
//   "deri" ⊂ "ederim", "var" ⊂ "varmış", "iki" ⊂ "ikinci"
// Bu keyword'lerde baş-boundary kontrolü uygulanır;
// uzun keyword'lerde (5+) substring davranışı korunur.
export function hasAny(text, keywords) {
  return keywords.some(k => {
    if (!text.includes(k)) return false;
    if (k.includes(" ")) return true;          // çok-kelimeli → substring OK
    if (k.length <= 4) return _wbTest(text, k); // kısa → baş-boundary zorunlu
    return true;                                 // uzun → stem semantiği
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
  if (["anahtarlik", "anahtarlık", "kisiye ozel anahtarlik", "kişiye özel anahtarlık"].includes(v)) return PRODUCT.ANAHTARLIK;
  if (["evcil_hayvan_mezar_tasi", "evcil hayvan mezar tasi", "evcil hayvan mezar taşı", "mezar tasi", "mezar taşı"].includes(v)) return PRODUCT.MEZAR_TASI;
  if (["resimli_lazer_bileklik", "resimli lazer bileklik", "fotoğraflı bileklik", "fotografli bileklik", "bileklik", "bilezik"].includes(v)) return PRODUCT.BILEKLIK;
  if (["other_product", "diger", "diğer"].includes(v)) return PRODUCT.OTHER;
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

  // ━━━ Prod logs fix: explicit commit suffixes (ödemeli, ile olsun, ödeyeceğim) ━━━
  // "Kapıda ödemeli", "Kapıda ödeme ile olsun", "havale ödeyeceğim" → explicit commit
  if (hasAny(norm, ["kapida odemeli","kapıda ödemeli","kapida ile olsun","kapıda ile olsun","kapida olsun"])) return "kapida_odeme";
  if (hasAny(norm, ["havale odeyecegim","havale ödeyeceğim","eft odeyecegim","eft ödeyeceğim","havale ile olsun","eft ile olsun","havale olsun","eft olsun"])) return "eft_havale";

  // INFO QUESTION GUARD: "fark nedir", "nasıl oluyor", "ne kadar" → payment SELECTION değil
  // AMA: seçim fiili varsa ("olsun", "seçeyim", "olur") → commit izni ver
  const hasSelectionVerb = hasAny(norm, ["olsun","seceyim","seçeyim","istiyorum","sectim","seçtim","olur","yapalim","yapalım","yapacagim","yapacağım","odeyecegim","ödeyeceğim","odemeli","ödemeli"]);
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
  // Önce spesifik yeni ürünler; yoksa generic "foto/resimli" lazer kolyeye kaçabilir.
  if (hasAny(norm, KW.product_anahtarlik)) return PRODUCT.ANAHTARLIK;
  if (hasAny(norm, KW.product_mezar_tasi)) return PRODUCT.MEZAR_TASI;
  if (hasAny(norm, KW.product_bileklik)) return PRODUCT.BILEKLIK;
  if (hasAny(norm, KW.product_atac)) return PRODUCT.ATAC;
  if (hasAny(norm, KW.product_lazer)) return PRODUCT.LAZER;
  if (hasAny(norm, KW.product_other)) return PRODUCT.OTHER;
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
    "kapida","kapıda","odeme","ödeme","eft","havale","nakit",
    "kargo","teslimat","adres","telefon",
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

// ─── SIRA 8: TARGETED TYPO NORMALIZATION ──────────────────────────────────
// Sadece kanıtlanmış, sık gelen, anlamı net typo'lar normalize edilir.
// Semantic classification değil — sadece surface-form düzeltme.

const TYPO_MAP = [
  // Product typo'ları
  [/araçlı|aracli|aracli|araçli/gi, "ataçlı"],
  [/atajlı|ataslı|ataclı|ataşlı/gi, "ataçlı"],
  [/lazer kolye|lazer kolye/gi, "lazer kolye"],
  // Prod logs: "Araçlı kolye ne kadar" → "ataç kolye ne kadar" (ürün typo)
  [/\bara[çc]l[ıi]\s+kolye/gi, "ataç kolye"],

  // Material typo'ları
  [/atın deilmi|atın değil mi|altın deilmi|altin deilmi|altin değilmi/gi, "altın değil mi"],
  [/gümüş mı\b|gumus mu\b|gümüşmü|gumusmu/gi, "gümüş mü"],
  [/atın gibi|altın gibi/gi, "altın gibi"],

  // ━━━ F6 fix: kararma typo'ları ━━━
  [/(?:^|\s)karar[nml]a(?=\s|$|[.,?!])/gi, " kararma"],       // kararna, kararla, kararma
  [/(?:^|\s)karama(?=\s|$|[.,?!])/gi, " kararma"],             // karama → kararma
  [/(?:^|\s)karalama(?=\s|$|[.,?!])/gi, " kararma"],           // karalama → kararma
  [/(?:^|\s)karartma(?=\s|$|[.,?!])/gi, " kararma"],           // karartma → kararma
  [/\bkararma yapiyor\b/gi, "kararma yapıyor"],
  // Prod logs: yeni kararma varyantları
  [/(?:^|\s)kararıyo(?=\s|$|[.,?!])/gi, " kararıyor"],         // kararıyo → kararıyor (r yoksa ekle)
  [/(?:^|\s)kararıyomu(?=\s|$|[.,?!])/gi, " kararıyor mu"],    // kararıyomu → kararıyor mu
  [/(?:^|\s)kararıyormu(?=\s|$|[.,?!])/gi, " kararıyor mu"],   // kararıyormu → kararıyor mu (compound)
  [/(?:^|\s)kararir[mM][ıi](?=\s|$|[.,?!])/gi, " kararır mı"],

  // ━━━ F6 fix: material typo'ları ━━━
  [/(?:^|\s)metaryen[ei]?(?=\s|$|[.,?!])/gi, " materyal"],
  [/(?:^|\s)metareyen(?=\s|$|[.,?!])/gi, " materyal"],
  [/(?:^|\s)maderi(?=\s|$|[.,?!])/gi, " materyali"],
  [/(?:^|\s)malzemsi(?=\s|$|[.,?!])/gi, " malzemesi"],
  [/(?:^|\s)maderyal(?=\s|$|[.,?!])/gi, " materyal"],
  [/(?:^|\s)materyeli(?=\s|$|[.,?!])/gi, " materyali"],

  // ━━━ F6 fix: alerji typo'ları (Türkçe 'ı' için \b yerine manual boundary) ━━━
  [/(?:^|\s)alarj[ıi](?=\s|$|[.,?!])/gi, " alerji"],
  [/(?:^|\s)alarjik(?=\s|$|[.,?!])/gi, " alerjik"],
  [/(?:^|\s)alerjim(?=\s|$|[.,?!])/gi, " alerjim"],

  // ━━━ Prod logs fix: write verb typo'ları (yazılcak → yazılacak, yaziliyomu) ━━━
  [/(?:^|\s)yaz[ıi]lcak(?=\s|$|[.,?!])/gi, " yazılacak"],
  [/(?:^|\s)yaz[ıi]lcam[ıi](?=\s|$|[.,?!])/gi, " yazılacak mı"],
  [/(?:^|\s)yaz[ıi]l[ıi]yomu(?=\s|$|[.,?!])/gi, " yazılıyor mu"],
  [/(?:^|\s)yazarm[ıi]s[ıi]n[ıi]z(?=\s|$|[.,?!])/gi, " yazar mısınız"],
  [/(?:^|\s)yazabilirmi[sş]i?niz(?=\s|$|[.,?!])/gi, " yazabilir misiniz"],

  // ━━━ Prod logs fix: solma/renk typo ━━━
  [/(?:^|\s)solarm[ıi](?=\s|$|[.,?!])/gi, " solar mı"],
  [/(?:^|\s)solmuyor\s+mu(?=\s|$|[.,?!])/gi, " solmuyor mu"],
  [/(?:^|\s)solmazm[ıi](?=\s|$|[.,?!])/gi, " solmaz mı"],
  [/(?:^|\s)beyazl[aá]ma?\s+yap[sş]r?m[ıi](?=\s|$|[.,?!])/gi, " beyazlama yapar mı"],

  // ━━━ Prod logs fix: eksik 'ı' suffix typo'ları (mobile klavye) ━━━
  [/(?:^|\s)mısınz(?=\s|$|[.,?!])/gi, " mısınız"],
  [/(?:^|\s)musunz(?=\s|$|[.,?!])/gi, " musunuz"],
  [/(?:^|\s)olurm[ıi](?=\s|$|[.,?!])/gi, " olur mu"],
  [/(?:^|\s)varm[ıi]\s+acaba(?=\s|$|[.,?!])/gi, " var mı acaba"],

  // ━━━ Prod logs fix: order completion / size ━━━
  [/(?:^|\s)cmdir(?=\s|$|[.,?!])/gi, " cm'dir"],

  // Media typo'ları
  [/resmı\b/gi, "resmi"],
  [/fotraf\b|fotoraf\b/gi, "fotoğraf"],
  [/gorsel\b/gi, "görsel"],

  // Ack typo'ları
  [/bekliyorul\b/gi, "bekliyorum"],
  [/tesekkurler\b/gi, "teşekkürler"],

  // ━━━ F11 fix: nakit/kapıda ödeme typo'ları ━━━
  [/(?:^|\s)naks?t?(?=\s|$|[.,?!])/gi, " nakit"],      // nakşt, nakst, nakt
  [/(?:^|\s)nakıt(?=\s|$|[.,?!])/gi, " nakit"],
  [/(?:^|\s)naki̇t(?=\s|$|[.,?!])/gi, " nakit"],
  [/(?:^|\s)kapıdan(?=\s|$|[.,?!])/gi, " kapıda"],
  [/(?:^|\s)kapida(?=\s|$|[.,?!])/gi, " kapıda"],
];

/**
 * applyTypoNormalization: mesajı intent-engine'e göndermeden önce yüzeysel typo düzeltmesi.
 * Sadece TYPO_MAP'te tanımlı kanıtlanmış pattern'ler — kural dışı tahmin yok.
 */
export function applyTypoNormalization(raw = "") {
  let result = raw;
  for (const [pattern, replacement] of TYPO_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
