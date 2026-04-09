// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SLOT STATE MACHINE — Her slot için: missing/pending/confirmed/corrected
// Early slot memory: erken verilen bilgi kaybedilmez, pending olarak taşınır
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { PRODUCT, STAGE } from "./constants.js";
import { truthy } from "./normalize.js";

/**
 * Slot state tanımları:
 *   missing    — hiç bilgi yok
 *   pending    — bilgi geldi ama stage'i henüz gelmedi (early slot memory)
 *   confirmed  — bilgi geldi ve stage'de doğrulandı
 *   corrected  — düzeltme yapıldı
 *   skipped    — kullanıcı "yok" dedi (back_text için)
 *   pending_external — WhatsApp'tan gönderildiği iddia edildi (photo için)
 */

export function buildSlotStates(fields, signals, extracted, product) {
  const slots = {
    product:        { status: product ? "confirmed" : "missing", value: product || null },
    photo:          buildPhotoSlot(fields, signals, extracted),
    back_text:      buildBackTextSlot(fields, signals),
    letters:        buildLettersSlot(fields, extracted, product),
    payment_method: buildPaymentSlot(fields, signals, extracted),
    phone:          buildPhoneSlot(fields, signals, extracted),
    address:        buildAddressSlot(fields, signals, extracted),
    name:           { status: extracted.hasName ? "confirmed" : "missing", value: null },
  };

  return slots;
}

function buildPhotoSlot(fields, signals, extracted) {
  const current = truthy(fields.photo_received) ? "confirmed" : "missing";
  
  // WhatsApp claim detection
  if (signals.complaints?.includes("sent_on_whatsapp") || signals.complaints?.includes("sent_photo_already")) {
    return { status: "pending_external", value: null, channel: "whatsapp" };
  }
  
  // URL geldi
  if (extracted.photoLink) {
    return { status: "confirmed", value: "url", channel: "instagram" };
  }
  
  // Mevcut durumu koru
  if (current === "confirmed") {
    return { status: "confirmed", value: "received", channel: fields._photo_channel || "instagram" };
  }
  
  return { status: "missing", value: null, channel: "unknown" };
}

function buildBackTextSlot(fields, signals) {
  const current = fields.back_text_status;
  
  if (current === "received") return { status: "confirmed", value: "set" };
  if (current === "skipped") return { status: "skipped", value: null };
  
  // Signal'den gelen back_text content
  if (signals.slot_updates?.back_text) {
    return { status: "pending", value: signals.slot_updates.back_text };
  }
  
  return { status: "missing", value: null };
}

function buildLettersSlot(fields, extracted, product) {
  if (product !== PRODUCT.ATAC) return { status: "missing", value: null };
  if (truthy(fields.letters_received)) return { status: "confirmed", value: "set" };
  if (extracted.letters) return { status: "confirmed", value: extracted.letters };
  return { status: "missing", value: null };
}

function buildPaymentSlot(fields, signals, extracted) {
  const current = fields.payment_method;
  const newPayment = extracted.payment || signals.slot_updates?.payment_method;
  
  if (newPayment && current && newPayment !== current) {
    // Correction
    return { status: "corrected", value: newPayment, previous: current };
  }
  if (newPayment) {
    return { status: "confirmed", value: newPayment };
  }
  if (current) {
    return { status: "confirmed", value: current };
  }
  return { status: "missing", value: null };
}

function buildPhoneSlot(fields, signals, extracted) {
  if (extracted.phone) {
    if (fields.phone_received === "1") {
      return { status: "corrected", value: extracted.phone };
    }
    return { status: "confirmed", value: extracted.phone };
  }
  if (fields.phone_received === "1") return { status: "confirmed", value: "set" };
  return { status: "missing", value: null };
}

function buildAddressSlot(fields, signals, extracted) {
  if (fields.address_status === "received") return { status: "confirmed", value: "full" };
  if (extracted.hasAddress) {
    if (extracted.phone || fields.phone_received === "1") {
      return { status: "confirmed", value: "full" };
    }
    return { status: "pending", value: "address_only" };
  }
  if (fields.address_status === "address_only") return { status: "pending", value: "address_only" };
  return { status: "missing", value: null };
}

// ─── EARLY SLOT MEMORY ────────────────────────────────────────
// Stage ne olursa olsun erken verilen bilgiyi kaydet
// Örnek: waiting_photo'da arka yazı → pending olarak tut, foto gelince taşı
export function applyEarlySlotMemory(slots, stage, signals, extracted) {
  const earlyUpdates = {};

  // waiting_photo'da arka yazı verildi → pending olarak kaydet
  if (stage === STAGE.WAITING_PHOTO && signals.slot_updates?.back_text) {
    if (slots.back_text.status === "missing") {
      earlyUpdates.back_text_early = signals.slot_updates.back_text;
    }
  }

  // waiting_photo veya waiting_back_text'te ödeme seçildi → kaydet
  if ((stage === STAGE.WAITING_PHOTO || stage === STAGE.WAITING_PAYMENT) && 
      (extracted.payment || signals.slot_updates?.payment_method)) {
    const pay = extracted.payment || signals.slot_updates.payment_method;
    if (slots.payment_method.status === "missing") {
      earlyUpdates.payment_method_early = pay;
    }
  }

  // Herhangi bir stage'de telefon verildi → kaydet
  if (extracted.phone && slots.phone.status === "missing") {
    earlyUpdates.phone_early = extracted.phone;
  }

  // Herhangi bir stage'de adres verildi → kaydet
  if (extracted.hasAddress && slots.address.status === "missing") {
    earlyUpdates.address_early = true;
  }

  return earlyUpdates;
}

// ─── SLOT STATUS HELPERS ──────────────────────────────────────
export function isSlotFilled(slot) {
  return ["confirmed", "corrected", "skipped", "pending_external"].includes(slot.status);
}

export function isSlotMissing(slot) {
  return slot.status === "missing";
}

export function isSlotPending(slot) {
  return slot.status === "pending" || slot.status === "pending_external";
}
