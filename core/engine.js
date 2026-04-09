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
import { extractSignals } from "./signals.js";
import { readInitialState, deriveState, commitPatch, getFilledSlots, getMissingSlots } from "./state.js";
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
  
  // System message guard — API restrictions, dosya eki gibi mesajlar entity extraction'ı tetiklememeli
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

  // Intent
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

    // 1.5 STATE CONSISTENCY GUARD — CRM field çelişkilerini düzelt
    // Kommo API gecikmeleri yüzünden field'lar tutarsız gelebilir
    const f = ctx.fields;
    if (f.conversation_stage === "waiting_photo" && f.photo_received === "1") {
      // Fotoğraf gelmiş ama stage ilerlememiş → düzelt
      ctx.fields.conversation_stage = f.back_text_status ? "waiting_payment" : "waiting_back_text";
    }
    if (f.conversation_stage === "waiting_payment" && f.payment_method && f.payment_method !== "") {
      // Ödeme seçilmiş ama stage ilerlememiş → düzelt
      if (f.address_status !== "received") ctx.fields.conversation_stage = "waiting_address";
      else ctx.fields.conversation_stage = "order_completed";
    }
    if (f.conversation_stage === "waiting_address" && f.address_status === "received" && f.phone_received === "1") {
      // Adres + telefon gelmiş ama stage ilerlememiş → düzelt
      ctx.fields.conversation_stage = "order_completed";
    }
    if (f.conversation_stage === "waiting_letters" && f.letters_received === "1") {
      // Harfler gelmiş ama stage ilerlememiş → düzelt
      ctx.fields.conversation_stage = f.payment_method ? "waiting_address" : "waiting_payment";
    }

    // 1.7 ═══ SIGNAL EXTRACTION (intent'ten ÖNCE) ═══
    // Mesajdan TÜM sinyalleri çıkar — slot updates, questions, corrections, complaints
    const signals = extractSignals(ctx);
    ctx.signals = signals;
    
    // 1.8 ═══ SLOT-FIRST COMMIT ═══
    // Mesajda slot bilgisi varsa, intent ne olursa olsun önce kaydet
    // Örnek: "EFT seçeyim, kargo ücreti var mı" → EFT önce kaydedilir
    if (!signals.system_message) {
      // Payment slot — extracted'da değilse ama signal'de varsa
      if (signals.slot_updates.payment_method && !ctx.extracted.payment) {
        ctx.extracted.payment = signals.slot_updates.payment_method;
      }
      // Back text — signal'den content geliyorsa
      if (signals.slot_updates.back_text && !ctx.extracted.backText) {
        ctx.extracted.backText = signals.slot_updates.back_text;
      }
    }

    // 2. Derive state (proposed patch + nextStage)
    const initial = readInitialState(ctx.fields, ctx.product);
    const derived = deriveState(initial, ctx);

    // 3. Arbitrate (rule chain → final cevap seçimi)
    const { reply: selectedReply, meta } = arbitrate(ctx, derived);

    // 3.5 ═══ SIGNAL-AWARE REPLY OVERRIDE ═══
    // Arbitration tek intent'e göre cevap verdi. Ama signal'ler ek şeyler söylüyor olabilir.
    let finalReply = selectedReply;

    // UNDECIDED: "bilemedim", "ne yazsak ki" → arka yazı DEĞİL, yardım cevabı
    if (signals.undecided && ctx.fields.conversation_stage === STAGE.WAITING_BACK_TEXT) {
      finalReply = { text: "Genelde isim, tarih, kısa bir not veya özel bir söz yazılıyor efendim 😊 Karar verdiğinizde buradan iletebilirsiniz. İstemezseniz 'yok' yazabilirsiniz.", reply_class: REPLY_CLASS.FIXED_INFO, support_mode_reason: "" };
      meta.signalOverride = "undecided_back_text";
    }

    // COMPLAINTS: "verdim ya" → stage'e göre akıllı cevap
    if (signals.complaints.includes("already_sent") && !signals.confirmations.length) {
      const missing = getMissingSlots(derived.derivedState);
      if (missing.length === 0) {
        finalReply = { text: "Bilgileriniz alınmıştır efendim 😊 Siparişiniz ekibimize iletilmiştir.", reply_class: REPLY_CLASS.FIXED_INFO, support_mode_reason: "" };
      } else if (missing.length === 1) {
        const slotMsg = { photo:"Fotoğrafınızı buradan iletebilirsiniz efendim 😊", back_text:"Arka yüze yazı tercihinizi iletebilir misiniz efendim?", payment:"Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?", phone:"Cep telefonu numaranızı iletebilir misiniz efendim? 📱", address:"Açık adresinizi iletebilir misiniz efendim? 📍" };
        finalReply = { text: "Bilgilerinizi aldım efendim 😊 " + (slotMsg[missing[0]] || ""), reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" };
      } else {
        const parts = missing.filter(m => !["product","letters"].includes(m)).map(m => ({phone:"📱 Cep telefonu",address:"📍 Açık adres",payment:"💳 Ödeme yöntemi",photo:"📷 Fotoğraf",back_text:"✍️ Arka yazı tercihi"}[m])).filter(Boolean);
        finalReply = { text: "Bilgilerinizi aldım efendim 😊 Şu bilgiler eksik:\n\n" + parts.join("\n"), reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" };
      }
      meta.signalOverride = "complaint_already_sent";
    }

    // CONFIRMATIONS: "siparişim alındı mı" 
    if (signals.confirmations.includes("order_status")) {
      if (derived.derivedState.order_status === "completed") {
        finalReply = { text: "Evet efendim, siparişiniz alınmıştır 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", reply_class: REPLY_CLASS.FIXED_INFO, support_mode_reason: "" };
      } else {
        const missing = getMissingSlots(derived.derivedState);
        if (missing.length > 0) {
          const parts = missing.filter(m => !["product","letters"].includes(m)).map(m => ({phone:"📱 Cep telefonu",address:"📍 Açık adres",payment:"💳 Ödeme yöntemi",photo:"📷 Fotoğraf",back_text:"✍️ Arka yazı tercihi"}[m])).filter(Boolean);
          finalReply = { text: "Siparişiniz devam ediyor efendim 😊 Tamamlamak için şu bilgiler gerekli:\n\n" + parts.join("\n"), reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" };
        }
      }
      meta.signalOverride = "confirmation_order_status";
    }

    // CAPABILITY QUESTION: "ikili resim yapıyor musunuz"
    if (signals.questions.includes("capability_multi_photo") && !meta.signalOverride) {
      const extra = ctx.fields.conversation_stage === STAGE.WAITING_PHOTO ? " Fotoğrafları buradan gönderebilirsiniz." : "";
      finalReply = { text: "Evet efendim, tek yüze birden fazla fotoğraf koyabiliyoruz 😊 Profesyonelce birleştirip tek tasarım haline getiriyoruz." + extra, reply_class: REPLY_CLASS.FIXED_INFO, support_mode_reason: "" };
      meta.signalOverride = "capability_multi_photo";
    }

    // MULTI-SIGNAL: slot commit + yan soru birlikte
    // Örnek: "EFT seçeyim kargo ücreti var mı" → EFT kaydedildi + kargo cevabı ver
    if (signals.slot_updates.payment_method && signals.questions.length > 0 && !meta.signalOverride) {
      const payLabel = signals.slot_updates.payment_method === "eft_havale" ? "EFT / Havale" : "Kapıda ödeme";
      let answer = payLabel + " olarak not aldım efendim 😊 ";
      // En önemli soruya cevap ver
      if (signals.questions.includes("shipping_price")) answer += "Kargo ücreti fiyata dahildir, ekstra ücret yok.";
      else if (signals.questions.includes("shipping")) answer += "Kargomuz PTT Kargo ile gönderilmektedir. İstanbul 1-2, diğer iller 2-3 iş günüdür.";
      else if (signals.questions.includes("trust")) answer += "Kararma solma yapmaz, günlük kullanıma uygundur.";
      else if (signals.questions.includes("price")) answer += "";
      
      // Sonraki adımı ekle
      const missing = getMissingSlots(derived.derivedState);
      const nextMissing = missing.filter(m => m !== "payment");
      if (nextMissing.includes("address") || nextMissing.includes("phone")) {
        answer += "\n\nAd soyad, cep telefonu ve açık adresinizi iletebilir misiniz?";
      }
      
      if (answer.length > 50) {
        finalReply = { text: answer, reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" };
        meta.signalOverride = "multi_signal_payment_plus_question";
      }
    }

    // 4. Model fallback (arbitration null döndüyse)
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

    // 4.5 ═══ ANTI-REPEAT GUARD ═══════════════════════════════
    // Bot cevabı çıkmadan ÖNCE: dolu slotu tekrar soruyor mu?
    // Eğer evet → cevabı otomatik düzelt, sadece eksik slotu sor
    // İSTİSNA: Correction mesajları bypass eder (yanlış/değiştir/düzelt)
    const correctionBypass = /yanlis|yanlış|degistir|değiştir|duzelt|düzelt|degil|değil.*olsun|iptal.*ed|vazgec/.test(
      (ctx.norm || "").toLowerCase()
    );
    
    if (finalReply && finalReply.text && !correctionBypass) {
      const filledSlots = getFilledSlots(derived.derivedState);
      const replyLower = finalReply.text.toLowerCase()
        .replace(/ı/g,"i").replace(/ş/g,"s").replace(/ç/g,"c")
        .replace(/ö/g,"o").replace(/ü/g,"u").replace(/ğ/g,"g");
      
      let violation = null;
      
      // Dolu slot tekrar soruluyor mu?
      if (filledSlots.photo && /fotograf.*gonder|fotograf.*ilet|resim.*gonder|fotografi.*buradan/i.test(replyLower) 
          && !replyLower.includes("sorun olursa") && !replyLower.includes("aldik")) {
        violation = "photo_already_received";
      }
      if (filledSlots.back_text && /arka yuz.*yazi.*ister|arka yuze.*yazi|ne yazilmasini/i.test(replyLower)
          && !replyLower.includes("not aldim")) {
        violation = "back_text_already_set";
      }
      if (filledSlots.payment && /eft.*kapida.*tercih|odeme yontemi|hangisini tercih/i.test(replyLower)) {
        violation = "payment_already_chosen";
      }
      if (filledSlots.phone && /telefon numara.*ilet|cep telefon.*ilet|telefon.*paylasabilir/i.test(replyLower)
          && !replyLower.includes("aldim")) {
        violation = "phone_already_received";
      }
      if (filledSlots.address_full && /acik adres.*ilet|adresinizi.*ilet|adresinizi.*yazabilir/i.test(replyLower)
          && !replyLower.includes("aldim")) {
        violation = "address_already_received";
      }
      
      if (violation) {
        // Dolu slot tekrar soruluyordu → düzelt
        const missing = getMissingSlots(derived.derivedState);
        meta.antiRepeatFired = violation;
        meta.antiRepeatMissing = missing;
        
        if (missing.length === 0) {
          // Hiçbir şey eksik değil → sipariş durumuna göre cevap
          if (derived.derivedState.order_status === "completed") {
            finalReply = { text: "Tabi efendim 😊", reply_class: REPLY_CLASS.FIXED_INFO, support_mode_reason: "" };
          } else {
            finalReply = { text: "Bilgileriniz alınmıştır efendim 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" };
          }
        } else if (missing.length === 1) {
          // Tek eksik var → sadece onu sor
          const slotMessages = {
            photo: "Fotoğrafınızı buradan iletebilirsiniz efendim 😊",
            back_text: "Arka yüze yazı eklemek ister misiniz? İstemezseniz 'yok' yazabilirsiniz 😊",
            payment: "Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊",
            phone: "Cep telefonu numaranızı iletebilir misiniz efendim? 📱",
            address: "Açık adresinizi iletebilir misiniz efendim? 📍",
            letters: "Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊",
            product: "Hangi model ile ilgileniyorsunuz efendim? 😊",
          };
          finalReply = { text: slotMessages[missing[0]] || finalReply.text, reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" };
        } else {
          // Birden fazla eksik → sadece eksikleri sor
          const parts = [];
          if (missing.includes("phone")) parts.push("📱 Cep telefonu");
          if (missing.includes("address")) parts.push("📍 Açık adres");
          if (missing.includes("payment")) parts.push("💳 Ödeme yöntemi");
          if (missing.includes("photo")) parts.push("📷 Fotoğraf");
          if (missing.includes("back_text")) parts.push("✍️ Arka yazı tercihi");
          if (parts.length > 0) {
            finalReply = { text: "Tabi efendim 😊 Şu bilgileriniz eksik:\n\n" + parts.join("\n"), reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" };
          }
        }
      }
    }
    // ═══════════════════════════════════════════════════════════

    // 5. Commit patch (final field'lar)
    const committed = commitPatch(derived, finalReply);
    committed._nextStage = derived.nextStage;

    // 6. Build output
    const output = buildOutput(ctx, finalReply, committed, meta);
    
    // 6.5 DEBUG SUMMARY — her karar için observability
    output._debug = {
      state_before: ctx.fields.conversation_stage || "(none)",
      state_after: output.conversation_stage || "(none)",
      state_corrected: ctx.fields.conversation_stage !== (body.conversation_stage || "") ? body.conversation_stage + " → " + ctx.fields.conversation_stage : "",
      state_frozen: derived._frozenStage || false,
      freeze_reason: derived._freezeReason || null,
      detected_intent: ctx.intent,
      intent_candidates: ctx._intentCandidates || [],
      reply_source: meta.replySource || "deterministic",
      selected_rule: meta.selectedRule || "none",
      product: output.ilgilenilen_urun,
      message_length: ctx.message.length,
      is_short_confirm: ctx.message.length <= 15 && /^(evet|tamam|olur|peki|tm|tmm|ok|anladım|tamamdır)$/i.test(ctx.message.trim()),
      field_confidence: derived._confidence || {},
      field_source: derived._source || {},
      corrections: derived._corrections || {},
      anti_repeat_fired: meta.antiRepeatFired || null,
      anti_repeat_missing: meta.antiRepeatMissing || null,
      signal_override: meta.signalOverride || null,
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
