// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENGINE v2 — Orchestrator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  REPLY_CLASS, SUPPORT_REASON, TEXT, STAGE,
  EXPLICIT_SWITCH_PHRASES, KW,
} from "./constants.js";
import {
  normalizeText, unwrap, normalizeProduct, normalizeStage,
  normalizePayment, normalizeOrderStatus, normalizeBackText, normalizeAddress,
  hasAny, truthy, cleanReply, getEntryProduct,
  looksLikePhotoUrl, extractPhone, looksLikeAddress, looksLikeName,
  parsePaymentFromMessage, detectProductFromText, extractLetters,
} from "./normalize.js";
import { detectIntent } from "./intent.js";
import { readInitialState, deriveState, commitPatch } from "./state.js";
import { arbitrate } from "./arbitration.js";
import { callModelFallback } from "./model.js";

// ─── BUILD CONTEXT ──────────────────────────────────────────

function buildContext(body) {
  const message = unwrap(body.message || body.last_input_text || body.last_user_message || "");
  const norm = normalizeText(message);

  const fields = {
    ilgilenilen_urun:    unwrap(body.ilgilenilen_urun),
    user_product:        unwrap(body.user_product),
    conversation_stage:  normalizeStage(unwrap(body.conversation_stage)),
    photo_received:      unwrap(body.photo_received),
    payment_method:      normalizePayment(unwrap(body.payment_method)),
    menu_gosterildi:     unwrap(body.menu_gosterildi || body.menu_shown || body.menuShown),
    ai_reply:            unwrap(body.ai_reply),
    last_intent:         unwrap(body.last_intent),
    order_status:        normalizeOrderStatus(unwrap(body.order_status)),
    back_text_status:    normalizeBackText(unwrap(body.back_text_status)),
    address_status:      normalizeAddress(unwrap(body.address_status)),
    support_mode:        unwrap(body.support_mode),
    support_mode_reason: unwrap(body.support_mode_reason),
    reply_class:         unwrap(body.reply_class),
    siparis_alindi:      unwrap(body.siparis_alindi),
    cancel_reason:       unwrap(body.cancel_reason),
    context_lock:        unwrap(body.context_lock),
    letters_received:    unwrap(body.letters_received),
    phone_received:      unwrap(body.phone_received),
  };

  // Product resolution
  const previousProduct = normalizeProduct(fields.ilgilenilen_urun || fields.user_product || "");
  const entryProduct = getEntryProduct(body);
  const explicitProduct = detectProductFromText(norm);
  let product = previousProduct || entryProduct || explicitProduct || "";

  if (previousProduct && explicitProduct && previousProduct !== explicitProduct) {
    const keep = !hasAny(norm, EXPLICIT_SWITCH_PHRASES) && (
      hasAny(norm, KW.price) || hasAny(norm, KW.shipping_price) || hasAny(norm, KW.shipping) ||
      hasAny(norm, KW.trust) || hasAny(norm, KW.photo_question) || hasAny(norm, KW.back_text_info) ||
      hasAny(norm, KW.back_photo_info) || hasAny(norm, KW.back_photo_price) || hasAny(norm, KW.chain) ||
      hasAny(norm, KW.payment) || hasAny(norm, KW.material_question)
    );
    product = keep ? previousProduct : explicitProduct;
  }
  if (!previousProduct && entryProduct && explicitProduct && entryProduct !== explicitProduct) {
    product = hasAny(norm, EXPLICIT_SWITCH_PHRASES) ? explicitProduct : entryProduct;
  }

  // Entity extraction
  const stage = fields.conversation_stage;
  const extracted = {
    phone: extractPhone(message),
    hasAddress: looksLikeAddress(norm, message, stage),
    hasName: looksLikeName(message, norm, stage),
    payment: parsePaymentFromMessage(norm, ""),
    photoLink: looksLikePhotoUrl(message),
    letters: extractLetters(message, norm, product, stage),
  };

  // Intent
  const intent = detectIntent({ message, norm, product, stage, extracted });

  return { message, norm, product, previousProduct, intent, fields, extracted };
}

// ─── BUILD OUTPUT ───────────────────────────────────────────

function buildOutput(ctx, reply, committedState, meta) {
  const replyText = cleanReply(reply?.text || "") || TEXT.FALLBACK;
  const menuShown = replyText === TEXT.MAIN_MENU || replyText.includes("Hangi model ile ilgileniyorsunuz?");

  const s = committedState;
  let conversationStage = s._nextStage || s.conversation_stage || ctx.fields.conversation_stage || "";
  let orderStatus = s.order_status || "";
  let siparisAlindi = s.siparis_alindi || "";
  let menuGosterildi = s.menu_gosterildi || ctx.fields.menu_gosterildi || "";
  let supportMode = s.support_mode || "";
  let supportReason = s.support_mode_reason || "";
  let replyClass = reply?.reply_class || s.reply_class || "";

  if (!replyText || replyText === TEXT.FALLBACK) {
    supportMode = "1";
    supportReason = reply?.support_mode_reason || SUPPORT_REASON.FALLBACK;
    replyClass = replyClass || REPLY_CLASS.FALLBACK;
  }
  if (reply?.support_mode_reason) { supportReason = reply.support_mode_reason; supportMode = "1"; }

  if (menuShown) {
    menuGosterildi = "evet";
    if (!s.product) conversationStage = STAGE.WAITING_PRODUCT;
  }

  if (s._nextStage === STAGE.ORDER_COMPLETED) {
    orderStatus = "completed";
    siparisAlindi = "1";
    replyClass = replyClass || REPLY_CLASS.ORDER_COMPLETE;
  } else if (!orderStatus && s.product) {
    orderStatus = "started";
  }

  if (s._nextStage === STAGE.HUMAN_SUPPORT || orderStatus === "cancel_requested") {
    conversationStage = STAGE.HUMAN_SUPPORT;
    orderStatus = "cancel_requested";
    supportMode = "1";
    supportReason = supportReason || SUPPORT_REASON.CANCEL;
    siparisAlindi = "";
    replyClass = replyClass || REPLY_CLASS.FALLBACK;
  }

  return {
    success: true,
    ai_reply: replyText,
    ilgilenilen_urun: s.product,
    user_product: s.product,
    last_intent: ctx.intent,
    conversation_stage: conversationStage,
    photo_received: s.photo_received || "",
    payment_method: s.payment_method || "",
    menu_gosterildi: menuGosterildi,
    order_status: orderStatus,
    back_text_status: s.back_text_status || "",
    address_status: s.address_status || "",
    support_mode: supportMode,
    support_mode_reason: supportReason,
    reply_class: replyClass,
    siparis_alindi: siparisAlindi,
    cancel_reason: s.cancel_reason || "",
    context_lock: s.context_lock || "",
    letters_received: s.letters_received || "",
    phone_received: s.phone_received || "",
    // Debug metadata (test/debug için)
    _meta: meta || {},
  };
}

// ─── MAIN PROCESSOR ─────────────────────────────────────────

export async function processChat(body = {}) {
  try {
    // 1. Context
    const ctx = buildContext(body);

    // 2. Derive state (proposed patch + nextStage)
    const initial = readInitialState(ctx.fields, ctx.product);
    const derived = deriveState(initial, ctx);

    // 3. Arbitrate (rule chain → final cevap seçimi)
    const { reply: selectedReply, meta } = arbitrate(ctx, derived);

    // 4. Model fallback (arbitration null döndüyse)
    let finalReply = selectedReply;
    if (!finalReply || !finalReply.text) {
      try {
        const modelText = await callModelFallback(ctx);
        finalReply = { text: cleanReply(modelText) || TEXT.FALLBACK, reply_class: REPLY_CLASS.FALLBACK, support_mode_reason: SUPPORT_REASON.NONE };
        meta.replySource = "model_fallback";
      } catch {
        finalReply = { text: TEXT.FALLBACK, reply_class: REPLY_CLASS.FALLBACK, support_mode_reason: SUPPORT_REASON.FALLBACK };
        meta.replySource = "model_error";
      }
    }

    // 5. Commit patch (final field'lar)
    const committed = commitPatch(derived, finalReply);
    committed._nextStage = derived.nextStage;

    // 6. Build output
    const output = buildOutput(ctx, finalReply, committed, meta);
    
    // 7. Extracted raw data (order sync için)
    output._extracted = {
      phone: ctx.extracted.phone || "",
      photoUrl: ctx.extracted.photoLink ? ctx.message.match(/https?:\/\/\S+/)?.[0] || "" : "",
      letters: ctx.extracted.letters || "",
      name: ctx.extracted.hasName ? ctx.message : "",
      addressText: ctx.extracted.hasAddress ? ctx.message : "",
      backText: (ctx.intent === "back_text" && ctx.fields.conversation_stage === "waiting_back_text") ? ctx.message : "",
    };
    
    return output;

  } catch (error) {
    console.error("engine error:", error?.message || error);
    return {
      success: true,
      ai_reply: TEXT.FALLBACK,
      ilgilenilen_urun: "", user_product: "",
      last_intent: "error", conversation_stage: "",
      photo_received: "", payment_method: "",
      menu_gosterildi: "", order_status: "",
      back_text_status: "", address_status: "",
      support_mode: "1", support_mode_reason: SUPPORT_REASON.FALLBACK,
      reply_class: REPLY_CLASS.FALLBACK,
      siparis_alindi: "", cancel_reason: "",
      context_lock: "", letters_received: "",
      phone_received: "", _meta: {},
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ success: false, message: "Only POST." });
  return res.status(200).json(await processChat(req.body || {}));
}
