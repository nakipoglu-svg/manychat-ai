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
    t.includes(".jpg") || t.includes(".jpeg") ||
    t.includes(".png") || t.includes(".webp")
  );
}

export function extractPhone(raw = "") {
  const s = String(raw);
  const matches = s.match(/(?:\+?90[\s().-]*)?(?:0?5\d(?:[\s().-]*\d){8})/g) || [];
  for (const m of matches) {
    const d = m.replace(/\D/g, "");
    if (/^905\d{9}$/.test(d)) return d.slice(-10);
    if (/^05\d{9}$/.test(d)) return d.slice(-10);
    if (/^5\d{9}$/.test(d)) return d;
  }
  return "";
}

export function looksLikeAddress(norm, raw = "", stage = "") {
  raw = String(raw).trim();
  if (!raw || raw.length < 10) return false;
  if (/[?]/.test(raw)) return false;
  if (/\b(mi|mı|mu|mü|miyim|mıyım|musun|müsün)\b/i.test(raw)) return false;

  let hit = 0;
  for (const k of ADDRESS_KEYWORDS) { if (norm.includes(k)) hit++; }
  const hasNumber = /\d/.test(raw);
  const cityHit = TURKEY_CITIES.filter(c => norm.includes(c)).length;
  const distHit = DISTRICT_KEYWORDS.filter(d => norm.includes(d)).length;

  if (stage === "waiting_address") {
    if (hit >= 2) return true;
    if (hit >= 1 && hasNumber) return true;
    if (cityHit >= 1 && distHit >= 1) return true;
    if (cityHit >= 1 && hit >= 1) return true;
    if (raw.length >= 20 && cityHit >= 1 && hasNumber) return true;
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
  if (!raw || raw.length < 4 || raw.length > 40) return false;
  if (/\d/.test(raw) || /[?!.:/]/.test(raw)) return false;

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;
  if (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/.test(raw)) return false;

  const n = normalizeText(raw);
  for (const phrase of NOT_A_NAME) { if (n.includes(phrase)) return false; }

  if (/\b(yorum|yorsun|yor|yoruz|yorsunuz|yorlar|acagim|acağım|ecegim|eceğim|ayim|ayım|eyim|elim|alim|misiniz|mısınız|musunuz|müsünüz|miyim|mıyım|bilir|abilir|ebilir|sana|bana|size|bize)\b/i.test(raw)) return false;
  if (/\b\S+(mek|mak|dım|dim|tım|tim|dık|dik|tık|tik|sın|sin|sun|sün|lım|lim|nız|niz|lar|ler|dan|den|tan|ten)\b/i.test(n)) return false;

  const TWO_WORD_NON = ["bu olsun","su olsun","bunu istiyorum","bunu yap","ne guzel","cok guzel","iyi gunler","iyi aksamlar","kolay gelsin","hayirli isler","bol kazanc","tamam olur","peki tamam","hadi tamam","cok tesekkur","rica ederim","rica ederiz"];
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
  return true;
}

export function parsePaymentFromMessage(norm, existing = "") {
  if (hasAny(norm, ["kredi karti", "kredi kartı", "kartla", "kart ile"])) return existing || "";
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
