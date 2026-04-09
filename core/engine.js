// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENGINE v5 — Hybrid Orchestrator
// Deterministic: slot commit, state, anti-repeat, cancel, system
// AI Reply: conversational answers, capability, info, frustration
// Policy guard: AI çıktısını denetler, slot commit engelenir
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
import { extractSignals } from "./signals.js";
import { readInitialState, deriveState, commitPatch, getFilledSlots, getMissingSlots } from "./state.js";
import { arbitrate } from "./arbitration.js";
import { callModelFallback } from "./model.js";
import { resolveActiveTopic, applyTopicOverride } from "./topic-memory.js";
import { policyDecision } from "./policy-engine.js";
import { selfHeal } from "./self-heal.js";
import { buildSlotStates, applyEarlySlotMemory } from "./slot-machine.js";
import { shouldUseAI, getAIReply, applyPolicyGuard } from "./ai-reply.js";

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

  const stage = fields.conversation_stage;
  const isSystemMessage = hasAny(norm, ["the message could not be displayed","api restrictions","could not be displayed","dosya eki gonderdi","bir dosya eki gönderdi","started an audio call","missed an audio call","started a video chat","reacted to your message"]);
  
  const extracted = isSystemMessage ? {
    phone: null, hasAddress: false, hasName: false, payment: null, photoLink: false, letters: null,
  } : {
    phone: extractPhone(message),
    hasAddress: looksLikeAddress(norm, message, stage),
    hasName: looksLikeName(message, norm, stage),
    payment: parsePaymentFromMessage(norm, ""),
    photoLink: looksLikePhotoUrl(message),
    letters: extractLetters(message, norm, product, stage),
  };

  const intent = detectIntent({ message, norm, product, stage, extracted, fields });
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
    orderStatus = "completed"; siparisAlindi = "1";
    replyClass = replyClass || REPLY_CLASS.ORDER_COMPLETE;
  } else if (!orderStatus && s.product) {
    orderStatus = "started";
  }

  if (s._nextStage === STAGE.HUMAN_SUPPORT || orderStatus === "cancel_requested") {
    conversationStage = STAGE.HUMAN_SUPPORT; orderStatus = "cancel_requested";
    supportMode = "1"; supportReason = supportReason || SUPPORT_REASON.CANCEL;
    siparisAlindi = ""; replyClass = replyClass || REPLY_CLASS.FALLBACK;
  }

  return {
    success: true, ai_reply: replyText,
    ilgilenilen_urun: s.product, user_product: s.product,
    last_intent: ctx.intent, conversation_stage: conversationStage,
    photo_received: s.photo_received || "", payment_method: s.payment_method || "",
    menu_gosterildi: menuGosterildi, order_status: orderStatus,
    back_text_status: s.back_text_status || "", address_status: s.address_status || "",
    support_mode: supportMode, support_mode_reason: supportReason,
    reply_class: replyClass, siparis_alindi: siparisAlindi,
    cancel_reason: s.cancel_reason || "", context_lock: s.context_lock || "",
    letters_received: s.letters_received || "", phone_received: s.phone_received || "",
    _meta: meta || {},
  };
}

// ─── ANTI-REPEAT GUARD ─────────────────────────────────────

function antiRepeatGuard(reply, derivedState, norm, intent) {
  if (!reply || !reply.text) return { reply, fired: false };

  if (/yanlis|yanlış|degistir|değiştir|duzelt|düzelt|degil|değil.*olsun|iptal.*ed|vazgec/.test((norm || "").toLowerCase())) {
    return { reply, fired: false };
  }

  const INFO_INTENTS = new Set(["back_text_info","back_photo_info","back_photo_price","back_text_examples","photo_question","trust","material_question","shipping","shipping_price","chain_question","location","payment_info_question","photo_suitability_question"]);
  // Flow progress intents: foto/ödeme/adres ALINDI cevapları "tekrar sorma" değil
  const FLOW_INTENTS = new Set(["photo","back_photo_upload","payment","address","phone","name_only","letters","back_text","back_text_skip"]);
  if (INFO_INTENTS.has(intent) || FLOW_INTENTS.has(intent)) return { reply, fired: false };

  const filled = getFilledSlots(derivedState);
  const rl = reply.text.toLowerCase().replace(/ı/g,"i").replace(/ş/g,"s").replace(/ç/g,"c").replace(/ö/g,"o").replace(/ü/g,"u").replace(/ğ/g,"g");
  
  let violation = null;
  if (filled.photo && /fotograf.*gonder|fotograf.*ilet|resim.*gonder|fotografi.*buradan/i.test(rl) && !rl.includes("sorun olursa") && !rl.includes("aldik")) violation = "photo_already_received";
  if (filled.back_text && /arka yuz.*yazi.*ister|arka yuze.*yazi|ne yazilmasini/i.test(rl) && !rl.includes("not aldim")) violation = "back_text_already_set";
  if (filled.payment && /eft.*kapida.*tercih|odeme yontemi|hangisini tercih/i.test(rl)) violation = "payment_already_chosen";
  if (filled.phone && /telefon numara.*ilet|cep telefon.*ilet|telefon.*paylasabilir/i.test(rl) && !rl.includes("aldim")) violation = "phone_already_received";
  if (filled.address_full && /acik adres.*ilet|adresinizi.*ilet|adresinizi.*yazabilir/i.test(rl) && !rl.includes("aldim")) violation = "address_already_received";
  
  if (!violation) return { reply, fired: false };

  const missing = getMissingSlots(derivedState);
  let fixedReply;
  if (missing.length === 0) {
    fixedReply = derivedState.order_status === "completed"
      ? { text: "Tabi efendim 😊", reply_class: REPLY_CLASS.FIXED_INFO, support_mode_reason: "" }
      : { text: "Bilgileriniz alınmıştır efendim 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" };
  } else if (missing.length === 1) {
    const m = { photo:"Fotoğrafınızı buradan iletebilirsiniz efendim 😊", payment:"Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊", phone:"Cep telefonu numaranızı iletebilir misiniz efendim? 📱", address:"Açık adresinizi iletebilir misiniz efendim? 📍", letters:"Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊", product:"Hangi model ile ilgileniyorsunuz efendim? 😊" };
    fixedReply = { text: m[missing[0]] || reply.text, reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" };
  } else {
    const parts = [];
    if (missing.includes("phone")) parts.push("📱 Cep telefonu");
    if (missing.includes("address")) parts.push("📍 Açık adres");
    if (missing.includes("payment")) parts.push("💳 Ödeme yöntemi");
    if (missing.includes("photo")) parts.push("📷 Fotoğraf");
    fixedReply = parts.length > 0
      ? { text: "Tabi efendim 😊 Şu bilgileriniz eksik:\n\n" + parts.join("\n"), reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" }
      : reply;
  }
  return { reply: fixedReply, fired: true, violation, missing };
}

// ─── APPEND NEXT ACTION ─────────────────────────────────────
// AI'nin next_action önerisine göre reply'e ek yap (policy engine kararı)

function appendNextAction(replyText, nextAction, derivedState, missingSlots) {
  if (!nextAction || nextAction === "none") return replyText;
  // Zaten sorulmuş mu kontrol
  const filled = getFilledSlots(derivedState);
  
  if (nextAction === "ask_payment" && !filled.payment && missingSlots.includes("payment")) {
    return replyText + "\n\nÖdeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊";
  }
  if (nextAction === "ask_address" && !filled.address_full && (missingSlots.includes("address") || missingSlots.includes("phone"))) {
    return replyText + "\n\nAd soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊";
  }
  if (nextAction === "ask_photo" && !filled.photo && missingSlots.includes("photo")) {
    return replyText + "\n\nFotoğrafınızı buradan iletebilirsiniz efendim 😊";
  }
  return replyText;
}

// ─── MAIN PROCESSOR ─────────────────────────────────────────

export async function processChat(body = {}) {
  try {
    // ═══ 1. CONTEXT ═══
    const ctx = buildContext(body);
    const meta = {};

    // ═══ 1.5 STATE CONSISTENCY ═══
    const f = ctx.fields;
    if (f.conversation_stage === "waiting_photo" && f.photo_received === "1") {
      ctx.fields.conversation_stage = f.back_text_status ? "waiting_payment" : "waiting_payment";
    }
    if (f.conversation_stage === "waiting_payment" && f.payment_method && f.payment_method !== "") {
      if (f.address_status !== "received") ctx.fields.conversation_stage = "waiting_address";
      else ctx.fields.conversation_stage = "order_completed";
    }
    if (f.conversation_stage === "waiting_address" && f.address_status === "received" && f.phone_received === "1") {
      ctx.fields.conversation_stage = "order_completed";
    }
    if (f.conversation_stage === "waiting_letters" && f.letters_received === "1") {
      ctx.fields.conversation_stage = f.payment_method ? "waiting_address" : "waiting_payment";
    }

    // ═══ 2. SIGNALS ═══
    const signals = extractSignals(ctx);
    ctx.signals = signals;

    if (!signals.system_message) {
      if (signals.slot_updates.payment_method && !ctx.extracted.payment) {
        ctx.extracted.payment = signals.slot_updates.payment_method;
      }
      if (signals.slot_updates.back_text && !ctx.extracted.backText) {
        ctx.extracted.backText = signals.slot_updates.back_text;
      }
    }

    // ═══ 3. TOPIC MEMORY ═══
    const activeTopic = resolveActiveTopic(ctx, signals);
    if (activeTopic) {
      ctx._activeTopic = activeTopic;
      const overriddenIntent = applyTopicOverride(ctx.intent, activeTopic, ctx.norm);
      if (overriddenIntent !== ctx.intent) {
        ctx._originalIntent = ctx.intent;
        ctx.intent = overriddenIntent;
        meta._topicOverride = activeTopic;
      }
    }

    // ═══ 4. DERIVE STATE ═══
    const initial = readInitialState(ctx.fields, ctx.product);
    const derived = deriveState(initial, ctx);

    const slotStates = buildSlotStates(ctx.fields, signals, ctx.extracted, ctx.product);
    const earlySlots = applyEarlySlotMemory(slotStates, ctx.fields.conversation_stage, signals, ctx.extracted);
    if (earlySlots.payment_method_early && !derived.derivedState.payment_method) {
      derived.derivedState.payment_method = earlySlots.payment_method_early;
      derived.proposedPatch.payment_method = earlySlots.payment_method_early;
    }
    if (earlySlots.phone_early && derived.derivedState.phone_received !== "1") {
      derived.derivedState.phone_received = "1";
      derived.proposedPatch.phone_received = "1";
    }

    // ═══ 5. SELF-HEAL ═══
    const filledSlots = getFilledSlots(derived.derivedState);
    const currentMissing = getMissingSlots(derived.derivedState);
    const healResult = selfHeal(ctx, signals, filledSlots, currentMissing, ctx.fields.conversation_stage);
    if (healResult && healResult.statePatches) {
      Object.assign(derived.derivedState, healResult.statePatches);
      Object.assign(derived.proposedPatch, healResult.statePatches);
    }

    // ═══ 6. ARBITRATION (deterministic rule chain) ═══
    const { reply: selectedReply, meta: arbMeta } = arbitrate(ctx, derived);
    Object.assign(meta, arbMeta);

    // ═══ 7. REPLY SELECTION — HYBRID ═══
    let finalReply = selectedReply;

    // 7a. Self-heal override
    if (healResult && healResult.text) {
      finalReply = healResult;
      meta.signalOverride = healResult._policy || "self_heal";
    }

    // 7b. Policy engine (multi-signal, frustration keyword, undecided, capability, complaint)
    if (!meta.signalOverride) {
      const policyResult = policyDecision(ctx, signals, derived.derivedState, currentMissing);
      if (policyResult && policyResult.text) {
        finalReply = policyResult;
        meta.signalOverride = policyResult._policy || "policy_engine";
      }
    }

    // 7c. WhatsApp / photo confirmation overrides
    if (!meta.signalOverride && (signals.complaints.includes("sent_on_whatsapp") || signals.complaints.includes("sent_photo_already"))) {
      if (!ctx.extracted.photoLink) {
        finalReply = { text: "WhatsApp üzerinden ilettiyseniz kontrol edip dönüş sağlayalım efendim 😊 Dilerseniz buradan da iletebilirsiniz.", reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" };
        meta.signalOverride = "whatsapp_photo_claim";
      }
    }
    if (!meta.signalOverride && signals.confirmations.includes("photo_received_check")) {
      finalReply = filledSlots.photo
        ? { text: "Evet efendim, fotoğrafınız ulaştı 😊 Ekibimiz kontrol edip dönüş sağlayacaktır.", reply_class: REPLY_CLASS.FIXED_INFO, support_mode_reason: "" }
        : { text: "Fotoğrafınızı henüz alamadık efendim 😊 Buradan iletebilirsiniz.", reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" };
      meta.signalOverride = "photo_received_check";
    }

    // ═══ 8. AI REPLY INTERPRETER ═══
    const aiEnabled = !body._skipAI && !body._test;
    const needsAI = aiEnabled && shouldUseAI(ctx, signals, { reply: finalReply, meta });
    meta._aiEnabled = aiEnabled;
    meta._aiNeeded = needsAI;

    if (needsAI) {
      console.log("[AI_CALL]", JSON.stringify({ message: ctx.message.substring(0, 60), stage: ctx.fields.conversation_stage, intent: ctx.intent }));
      try {
        const aiPromise = getAIReply(ctx, signals, filledSlots, currentMissing);
        const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error("ai_timeout")), 4000));
        const aiResult = await Promise.race([aiPromise, timeoutPromise]);

        if (aiResult && aiResult.reply && aiResult.confidence >= 0.7) {
          const guarded = applyPolicyGuard(aiResult, filledSlots, currentMissing);
          if (guarded) {
            let aiReplyText = guarded.reply;
            aiReplyText = appendNextAction(aiReplyText, guarded.next_action, derived.derivedState, currentMissing);
            
            finalReply = {
              text: aiReplyText,
              reply_class: REPLY_CLASS.FLOW_PROGRESS,
              support_mode_reason: guarded.next_action === "handoff" ? SUPPORT_REASON.OPERATIONAL : "",
            };
            if (guarded.next_action === "handoff") {
              finalReply.reply_class = REPLY_CLASS.OPERATIONAL_REQUIRED;
            }
            meta.replySource = "ai_reply";
            meta._aiReply = guarded;
            if (guarded._tokenUsage) meta._tokenUsage = guarded._tokenUsage;
            console.log("[AI_USED]", JSON.stringify({ label: guarded.intent_label, confidence: guarded.confidence, tokens: guarded._tokenUsage?.total_tokens || 0 }));
          }
        } else if (aiResult) {
          console.log("[AI_LOW_CONF]", JSON.stringify({ confidence: aiResult.confidence, label: aiResult.intent_label }));
        } else {
          console.log("[AI_NULL] AI returned null — check DEEPSEEK_API_KEY env variable");
        }
      } catch (e) {
        meta._aiReplyError = e?.message || "unknown";
        console.log("[AI_ERROR]", e?.message || "unknown");
      }
    }

    // ═══ 9. FINAL FALLBACK ═══
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

    // ═══ 10. ANTI-REPEAT GUARD ═══
    const guardResult = antiRepeatGuard(finalReply, derived.derivedState, ctx.norm, ctx.intent);
    if (guardResult.fired) {
      finalReply = guardResult.reply;
      meta.antiRepeatFired = guardResult.violation;
      meta.antiRepeatMissing = guardResult.missing;
    }

    // ═══ 11. COMMIT & OUTPUT ═══
    const committed = commitPatch(derived, finalReply);
    committed._nextStage = derived.nextStage;

    const output = buildOutput(ctx, finalReply, committed, meta);

    output._debug = {
      state_before: ctx.fields.conversation_stage || "(none)",
      state_after: output.conversation_stage || "(none)",
      detected_intent: ctx.intent,
      original_intent: ctx._originalIntent || null,
      reply_source: meta.replySource || "deterministic",
      selected_rule: meta.selectedRule || "none",
      product: output.ilgilenilen_urun,
      signal_override: meta.signalOverride || null,
      topic_override: meta._topicOverride || null,
      anti_repeat_fired: meta.antiRepeatFired || null,
      ai_reply_used: meta.replySource === "ai_reply",
      ai_reply_data: meta._aiReply || null,
      ai_reply_error: meta._aiReplyError || null,
      signals_summary: {
        slots: Object.keys(signals.slot_updates || {}),
        questions: signals.questions || [],
        corrections: signals.corrections || [],
        complaints: signals.complaints || [],
        confirmations: signals.confirmations || [],
        ack: signals.ack || false,
        undecided: signals.undecided || false,
        topic: signals.topic_hint || null,
      },
    };

    output._extracted = {
      phone: ctx.extracted.phone || "",
      photoUrl: ctx.extracted.photoLink ? ctx.message.match(/https?:\/\/\S+/)?.[0] || "" : "",
      letters: ctx.extracted.letters || "",
      name: ctx.extracted.hasName ? ctx.message : "",
      addressText: ctx.extracted.hasAddress ? ctx.message : "",
      backText: (ctx.intent === "back_text" && ctx.fields.conversation_stage === "waiting_payment") ? ctx.message : "",
    };

    output._tokenUsage = meta._tokenUsage || null;
    output._aiStatus = {
      enabled: meta._aiEnabled || false,
      needed: meta._aiNeeded || false,
      used: meta.replySource === "ai_reply",
      error: meta._aiReplyError || null,
      tokens: meta._tokenUsage?.total_tokens || 0,
    };

    return output;

  } catch (error) {
    console.error("engine error:", error?.message || error);
    return {
      success: true, ai_reply: TEXT.FALLBACK,
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
