import { runSuite } from "./_harness.js";

const cases = [
  // ─── Intent-level correctness (not just reply) ───
  {
    name: "HARDEN F7: Özge bundle → full_contact_bundle intent",
    input: { message: "Özge şenyüz\n05461234567\nAkbilek mahallesi 5. sokak No:12 Merkez Amasya", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    intentIn: ["full_contact_bundle"],
  },
  {
    name: "HARDEN F7: Tülay küçük harf bundle → full_contact_bundle",
    input: { message: "Tülay ulukoz\nArapçeşme mahallesi 123 sokak no 5 daire 7 Gebze Kocaeli\n05427654321", conversation_stage: "waiting_address", ilgilenilen_urun: "lazer" },
    intentIn: ["full_contact_bundle"],
  },
  {
    name: "HARDEN F6: alarji typo → material/trust intent (not general)",
    input: { message: "Alarjı yapar mı", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    intentIn: ["material_question","trust"],
  },
  {
    name: "HARDEN F6: silinir mi → trust intent",
    input: { message: "Zamanla silinir mi resim aceba", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    intentIn: ["trust","material_question","photo_question"],
  },
  {
    name: "HARDEN F4: hazırlanmış halini [waiting_letters] → preview_request",
    input: { message: "Efendim bana hazırlanmış halini atacaktınız", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    intentIn: ["preview_request","completed_photo_share_request"],
  },
  {
    name: "HARDEN F4: taslak atsam [waiting_photo] → preview_request",
    input: { message: "Ben size şimdi fotoğraflari atsam bana taslağı atsanız olurmu", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    intentIn: ["preview_request"],
  },

  // ─── Edge cases Opus couldn't close in hardening ───
  {
    name: "HARDEN F2: 'Sipariş vermek istiyorum' [waiting_photo] — fiyat dump YASAK",
    input: { message: "Sipariş vermek istiyorum", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: ["eft havale ile 599", "kapida odeme ile 649"],
    includes: "fotografinizi buradan",
  },
  {
    name: "HARDEN F2: 'Fotoğraf atsam size' [waiting_photo] — fiyat dump YASAK",
    input: { message: "Fotoğraf atsam size", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    notIncludes: ["eft havale ile 599", "599 tl"],
  },
  {
    name: "HARDEN F2: 'Sipariş vermek istiyorum' [waiting_letters] — harfler iste",
    input: { message: "Sipariş vermek istiyorum", conversation_stage: "waiting_letters", ilgilenilen_urun: "atac" },
    notIncludes: ["eft havale ile 499", "499 tl"],
  },
  {
    name: "HARDEN F6: 'Suya girdim' → trust cevabı (Opus edge case)",
    input: { message: "Suya girdim", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "suya dayanikli",
  },
  {
    name: "HARDEN F6: 'Denize girdim kolye ile' → trust",
    input: { message: "Denize girdim kolye ile", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "suya dayanikli",
  },

  // ─── Empty/robustness ───
  {
    name: "HARDEN: empty message → null değil, merhaba dönmeli",
    input: { message: "", conversation_stage: "" },
    notIncludes: "",
  },
  {
    name: "HARDEN: ??? → en kısa sürede dönüş",
    input: { message: "???", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    includes: "en kisa surede",
  },

  // ─── lastContext false-carry protection ───
  {
    name: "HARDEN F8 false-carry: 'Mümkün mü' alakasız previous → generic fallback",
    input: { message: "Mümkün mü", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer",
             ai_reply: "Lazer kolye EFT 599 TL, kapıda 649 TL." },
    notIncludes: ["birden fazla kisi", "arka yuze istediginiz"],
  },
  {
    name: "HARDEN F8 false-carry: 'Yani rengi' payment previous → şey alakasız",
    input: { message: "Yani rengi", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer",
             ai_reply: "Ödeme tercihinizi belirtebilir misiniz? EFT/Havale veya kapıda nakit." },
    notIncludes: ["altin kaplama standart"],
  },
];

const result = await runSuite("HARDEN", cases);
process.exit(result.fail > 0 ? 1 : 0);
