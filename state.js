// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE v2 — derived → proposed → committed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { PRODUCT, STAGE, INTENT, SUPPORT_REASON } from "./constants.js";
import { truthy } from "./normalize.js";

// ─── READ FIELDS → INITIAL STATE ────────────────────────────

export function readInitialState(fields) {
  return {
    product:             fields.ilgilenilen_urun || fields.user_product || "",
    conversation_stage:  fields.conversation_stage || "",
    photo_received:      truthy(fields.photo_received) ? "1" : "",
    payment_method:      fields.payment_method || "",
    menu_gosterildi:     fields.menu_gosterildi || "",
    order_status:        fields.order_status || "",
    back_text_status:    fields.back_text_status || "",
    address_status:      fields.address_status || "",
    support_mode:        fields.support_mode || "",
    support_mode_reason: fields.support_mode_reason || "",
    reply_class:         fields.reply_class || "",
    cancel_reason:       fields.cancel_reason || "",
    context_lock:        fields.context_lock || "",
    siparis_alindi:      truthy(fields.siparis_alindi) ? "1" : "",
    letters_received:    truthy(fields.letters_received) ? "1" : "",
    phone_received:      truthy(fields.phone_received) ? "1" : "",
  };
}

// ─── DERIVE STATE + PROPOSED PATCH ──────────────────────────

export function deriveState(initialState, ctx) {
  const { intent, product, previousProduct, extracted, message } = ctx;
  const patch = {};

  // Ürün değişimi → full reset
  if (previousProduct && product && previousProduct !== product) {
    Object.assign(patch, {
      product, conversation_stage: "", photo_received: "", payment_method: "",
      order_status: "started", back_text_status: "", address_status: "",
      support_mode: "", support_mode_reason: "", reply_class: "",
      cancel_reason: "", context_lock: product ? "1" : initialState.context_lock || "",
      siparis_alindi: "", letters_received: "", phone_received: "",
    });
  }

  // Ürün set
  if (product) {
    patch.product = product;
    patch.context_lock = "1";
    if (!initialState.order_status && !patch.order_status) patch.order_status = "started";
  }

  // Entity fact'leri
  if (extracted.payment) patch.payment_method = extracted.payment;
  if (extracted.photoLink && intent === INTENT.PHOTO) patch.photo_received = "1";
  if (intent === INTENT.LETTERS && extracted.letters) patch.letters_received = "1";
  if (intent === INTENT.BACK_TEXT) patch.back_text_status = "received";
  if (intent === INTENT.BACK_TEXT_SKIP) patch.back_text_status = "skipped";
  if (intent === INTENT.BACK_PHOTO_UPLOAD) patch.back_text_status = "received";
  if (extracted.phone) patch.phone_received = "1";

  // Adres logic
  if (extracted.hasAddress && extracted.phone) {
    patch.address_status = "received";
    patch.phone_received = "1";
  } else if (extracted.hasAddress) {
    const cur = patch.address_status || initialState.address_status || "";
    if (!cur || cur === "address_only") patch.address_status = cur || "address_only";
  }
  const effAddr = patch.address_status || initialState.address_status || "";
  if (effAddr === "address_only" && (extracted.phone || patch.phone_received === "1")) {
    patch.address_status = "received";
    patch.phone_received = "1";
  }

  // Şubeden teslim
  if (intent === INTENT.STORE_PICKUP) patch.address_status = "received";

  // İptal
  if (intent === INTENT.CANCEL) {
    patch.cancel_reason = message || "cancel_requested";
    patch.support_mode = "1";
    patch.support_mode_reason = SUPPORT_REASON.CANCEL;
    patch.order_status = "cancel_requested";
    patch.siparis_alindi = "";
  }

  // Derived = initial + patch
  const derived = { ...initialState, ...patch };

  // Ürüne göre alan temizliği
  if (derived.product !== PRODUCT.LAZER) { derived.photo_received = ""; derived.back_text_status = ""; }
  if (derived.product !== PRODUCT.ATAC) { derived.letters_received = ""; }

  return { derivedState: derived, proposedPatch: patch, nextStage: calcNextStage(derived) };
}

// ─── NEXT STAGE ─────────────────────────────────────────────

function calcNextStage(s) {
  if (!s.product) return s.menu_gosterildi === "evet" ? STAGE.WAITING_PRODUCT : "";
  if (s.order_status === "cancel_requested") return STAGE.HUMAN_SUPPORT;
  if (s.product === PRODUCT.LAZER) {
    if (!truthy(s.photo_received)) return STAGE.WAITING_PHOTO;
    if (!s.back_text_status) return STAGE.WAITING_BACK_TEXT;
    if (!s.payment_method) return STAGE.WAITING_PAYMENT;
    if (s.address_status !== "received") return STAGE.WAITING_ADDRESS;
    return STAGE.ORDER_COMPLETED;
  }
  if (s.product === PRODUCT.ATAC) {
    if (!truthy(s.letters_received)) return STAGE.WAITING_LETTERS;
    if (!s.payment_method) return STAGE.WAITING_PAYMENT;
    if (s.address_status !== "received") return STAGE.WAITING_ADDRESS;
    return STAGE.ORDER_COMPLETED;
  }
  return "";
}

export { calcNextStage as getNextStage };

// ─── COMMIT PATCH ───────────────────────────────────────────
// Final cevap seçildikten sonra, cevaba göre patch'i finalleştir.

export function commitPatch(derivedResult, reply) {
  // Şimdilik derived state'i olduğu gibi commit.
  // İleride reply'a göre düzeltme gerekirse burası genişler.
  return { ...derivedResult.derivedState };
}
