// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENGINE v8 — 5 katmanlı temiz orkestratör
// 1. Understand  2. State  3. Answer  4. Guard  5. Output
// Tek karar noktası. Override zinciri yok.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  REPLY_CLASS, SUPPORT_REASON, TEXT, STAGE, PRODUCT,
  EXPLICIT_SWITCH_PHRASES, KW,
} from "./constants.js";
import {
  normalizeText, unwrap, normalizeProduct, normalizeStage,
  normalizePayment, normalizeOrderStatus, normalizeBackText, normalizeAddress,
  hasAny, truthy, cleanReply, getEntryProduct, detectProductFromText,
} from "./normalize.js";
import { detectIntent, extractEntities } from "./intent-engine.js";
import { readInitialState, deriveState, commitPatch, getFilledSlots, getMissingSlots } from "./state.js";
import { buildSlotStates, applyEarlySlotMemory } from "./slot-machine.js";
import { generateAnswer } from "./answer-engine.js";
import { guardReply } from "./guard-engine.js";

function buildContext(body) {
  const message = unwrap(body.message || body.last_input_text || body.last_user_message || "");
  const norm = normalizeText(message);
  const fields = {
    ilgilenilen_urun: unwrap(body.ilgilenilen_urun), user_product: unwrap(body.user_product),
    conversation_stage: normalizeStage(unwrap(body.conversation_stage)),
    photo_received: unwrap(body.photo_received), payment_method: normalizePayment(unwrap(body.payment_method)),
    menu_gosterildi: unwrap(body.menu_gosterildi || body.menu_shown || body.menuShown),
    ai_reply: unwrap(body.ai_reply), last_intent: unwrap(body.last_intent),
    order_status: normalizeOrderStatus(unwrap(body.order_status)),
    back_text_status: normalizeBackText(unwrap(body.back_text_status)),
    address_status: normalizeAddress(unwrap(body.address_status)),
    support_mode: unwrap(body.support_mode), support_mode_reason: unwrap(body.support_mode_reason),
    reply_class: unwrap(body.reply_class), siparis_alindi: unwrap(body.siparis_alindi),
    cancel_reason: unwrap(body.cancel_reason), context_lock: unwrap(body.context_lock),
    letters_received: unwrap(body.letters_received), phone_received: unwrap(body.phone_received),
  };
  const previousProduct = normalizeProduct(fields.ilgilenilen_urun || fields.user_product || "");
  const entryProduct = getEntryProduct(body);
  const explicitProduct = detectProductFromText(norm);
  let product = previousProduct || entryProduct || explicitProduct || "";
  if (previousProduct && explicitProduct && previousProduct !== explicitProduct) {
    const keep = !hasAny(norm, EXPLICIT_SWITCH_PHRASES) && (
      hasAny(norm, KW.price) || hasAny(norm, KW.shipping) || hasAny(norm, KW.trust) ||
      hasAny(norm, KW.chain) || hasAny(norm, KW.payment) || hasAny(norm, KW.material_question)
    );
    product = keep ? previousProduct : explicitProduct;
  }
  const extracted = extractEntities(message, norm, product, fields.conversation_stage);
  const intent = detectIntent({ message, norm, product, stage: fields.conversation_stage, extracted, fields });
  return { message, norm, product, previousProduct, intent, fields, extracted };
}

function buildOutput(ctx, reply, committed, meta) {
  const replyText = cleanReply(reply?.text || "") || TEXT.FALLBACK;
  const s = committed;
  let stage = s._nextStage || s.conversation_stage || ctx.fields.conversation_stage || "";
  let orderStatus = s.order_status || "";
  let siparisAlindi = s.siparis_alindi || "";
  let menuShown = s.menu_gosterildi || ctx.fields.menu_gosterildi || "";
  let supportMode = s.support_mode || "";
  let supportReason = s.support_mode_reason || "";
  let replyClass = reply?.reply_class || s.reply_class || "";
  // support_mode temizleme: reply operatör/fallback değilse ve stage human_support değilse temizle
  if (supportMode === "1" && !reply?.support_mode_reason && stage !== STAGE.HUMAN_SUPPORT && replyText && replyText !== TEXT.FALLBACK) {
    supportMode = "";
    supportReason = "";
  }
  if (!replyText || replyText === TEXT.FALLBACK) { supportMode = "1"; supportReason = SUPPORT_REASON.FALLBACK; replyClass = REPLY_CLASS.FALLBACK; }
  if (reply?.support_mode_reason) { supportReason = reply.support_mode_reason; supportMode = "1"; }
  if (replyText.includes("Hangi model ile ilgileniyorsunuz")) { menuShown = "evet"; if (!s.product) stage = STAGE.WAITING_PRODUCT; }
  if (s._nextStage === STAGE.ORDER_COMPLETED) { orderStatus = "completed"; siparisAlindi = "1"; }
  else if (!orderStatus && s.product) orderStatus = "started";
  if ((orderStatus === "completed" || siparisAlindi === "1") && [STAGE.WAITING_PHOTO,STAGE.WAITING_PAYMENT,STAGE.WAITING_ADDRESS,STAGE.WAITING_LETTERS,STAGE.WAITING_PRODUCT].includes(stage)) stage = STAGE.ORDER_COMPLETED;
  if (s._nextStage === STAGE.HUMAN_SUPPORT || orderStatus === "cancel_requested") { stage = STAGE.HUMAN_SUPPORT; orderStatus = "cancel_requested"; supportMode = "1"; }
  return {
    success: true, ai_reply: replyText, ilgilenilen_urun: s.product, user_product: s.product,
    last_intent: ctx.intent, conversation_stage: stage, photo_received: s.photo_received || "",
    payment_method: s.payment_method || "", menu_gosterildi: menuShown, order_status: orderStatus,
    back_text_status: s.back_text_status || "", address_status: s.address_status || "",
    support_mode: supportMode, support_mode_reason: supportReason, reply_class: replyClass,
    siparis_alindi: siparisAlindi, cancel_reason: s.cancel_reason || "", context_lock: s.context_lock || "",
    letters_received: s.letters_received || "", phone_received: s.phone_received || "",
    _meta: meta, _extracted: {
      phone: ctx.extracted.phone || "",
      photoUrl: ctx.extracted.photoLink ? (ctx.message.match(/https?:\/\/\S+/)?.[0] || "") : "",
      letters: ctx.extracted.letters || "", name: ctx.extracted.hasName ? ctx.message : "",
      addressText: ctx.extracted.hasAddress ? ctx.message : "",
      backText: (ctx.intent === "back_text" && ctx.fields.conversation_stage === "waiting_payment") ? ctx.message : "",
    },
  };
}

export async function processChat(body = {}) {
  try {
    const ctx = buildContext(body);
    const meta = { replySource: "none" };
    console.log("[V8]", JSON.stringify({ intent: ctx.intent, product: ctx.product, stage: ctx.fields.conversation_stage, msg: ctx.message.substring(0, 40) }));

    // State consistency
    const f = ctx.fields;
    if (f.conversation_stage === "waiting_photo" && f.photo_received === "1") f.conversation_stage = "waiting_payment";
    if (f.conversation_stage === "waiting_payment" && f.payment_method) f.conversation_stage = f.address_status !== "received" ? "waiting_address" : "order_completed";
    if (f.conversation_stage === "waiting_address" && f.address_status === "received" && f.phone_received === "1") f.conversation_stage = "order_completed";
    if (f.conversation_stage === "waiting_letters" && f.letters_received === "1") f.conversation_stage = f.payment_method ? "waiting_address" : "waiting_payment";

    // State derive
    const initial = readInitialState(ctx.fields, ctx.product);
    const derived = deriveState(initial, ctx);
    const slotStates = buildSlotStates(ctx.fields, { slot_updates: {} }, ctx.extracted, ctx.product);
    const earlySlots = applyEarlySlotMemory(slotStates, ctx.fields.conversation_stage, { slot_updates: {} }, ctx.extracted);
    if (earlySlots.payment_method_early && !derived.derivedState.payment_method) { derived.derivedState.payment_method = earlySlots.payment_method_early; derived.proposedPatch.payment_method = earlySlots.payment_method_early; }
    if (earlySlots.phone_early && derived.derivedState.phone_received !== "1") { derived.derivedState.phone_received = "1"; derived.proposedPatch.phone_received = "1"; }
    const filledSlots = getFilledSlots(derived.derivedState);
    const missingSlots = getMissingSlots(derived.derivedState);
    ctx.filledSlots = filledSlots;
    ctx.missingSlots = missingSlots;

    // Answer (answer-engine handles ALL response decisions)
    let reply = await generateAnswer(ctx);
    meta.replySource = reply.source || "none";

    // Fallback
    if (!reply.text) {
      const st = ctx.fields.conversation_stage;
      if (st === STAGE.WAITING_PHOTO) reply.text = "Fotoğrafınızı buradan iletebilirsiniz efendim 😊";
      else if (st === STAGE.WAITING_PAYMENT) reply.text = "EFT / Havale veya kapıda ödeme seçeneklerimiz mevcuttur efendim 😊";
      else if (st === STAGE.WAITING_ADDRESS) { reply.text = "Ad soyad, cep telefonu ve açık adres bilgileriniz ile devam edelim efendim 😊"; }
      else if (st === STAGE.WAITING_LETTERS) reply.text = "Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊";
      else reply.text = TEXT.FALLBACK;
      meta.replySource = "fallback";
    }

    // Guard
    reply = guardReply(reply, ctx, filledSlots, missingSlots);

    // Output
    const committed = commitPatch(derived, reply);
    committed._nextStage = derived.nextStage;
    const output = buildOutput(ctx, reply, committed, meta);
    output._debug = { intent: ctx.intent, source: meta.replySource, product: ctx.product };
    return output;
  } catch (error) {
    console.error("[V8_ERROR]", error?.message || error);
    return { success: true, ai_reply: TEXT.FALLBACK, ilgilenilen_urun: "", user_product: "", last_intent: "error", conversation_stage: "", photo_received: "", payment_method: "", menu_gosterildi: "", order_status: "", back_text_status: "", address_status: "", support_mode: "1", support_mode_reason: SUPPORT_REASON.FALLBACK, reply_class: REPLY_CLASS.FALLBACK, siparis_alindi: "", cancel_reason: "", context_lock: "", letters_received: "", phone_received: "", _meta: {} };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ success: false, message: "Only POST." });
  const result = await processChat(req.body || {});
  try { const { logConversationRow } = await import("../lib/sheetsLogger.js"); logConversationRow({ body: req.body, result }).catch(() => {}); } catch {}
  return res.status(200).json(result);
}
