// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// POLICY ENGINE — Tek doğru karar modeli
// Her mesaj için: what_to_store + what_to_answer + what_to_ask_next
// State ve reply aynı yerden beslenir, asla kopuk çalışmaz
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { PRODUCT, STAGE, TEXT, REPLY_CLASS, PRICE } from "./constants.js";
import { truthy } from "./normalize.js";

/**
 * Multi-signal mesajlar için birleşik cevap üret.
 * Sadece signal override durumlarında devreye girer.
 * Normal rule-chain akışı bozulmaz.
 * 
 * @returns {{ text: string, reply_class: string, support_mode_reason: string } | null}
 */
export function policyDecision(ctx, signals, derivedState, missingSlots) {
  // Policy engine sadece multi-signal durumlarında devreye girer
  // Tek intent mesajlarda null döner → rule chain devam eder
  
  const hasPaymentUpdate = !!signals.slot_updates?.payment_method;
  const hasQuestions = signals.questions.length > 0;
  const hasCorrections = signals.corrections.length > 0;
  const hasComplaints = signals.complaints.length > 0;
  const hasConfirmations = signals.confirmations.length > 0;
  const isUndecided = signals.undecided;
  const stage = ctx.fields?.conversation_stage || "";

  // ═══ FRUSTRATION: AI veya keyword frustration algıladı → insan devri ═══
  if (signals.complaints?.includes("frustration") || signals._aiLabel === "frustration") {
    return {
      text: "Çok özür dileriz efendim, ekibimize hemen yönlendiriyorum 😊",
      reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED,
      support_mode_reason: SUPPORT_REASON.OPERATIONAL,
      _policy: "frustration_handoff",
    };
  }

  // ═══ MULTI-SIGNAL: Payment + Question ═══
  if (hasPaymentUpdate && hasQuestions) {
    return buildPaymentPlusQuestion(signals, derivedState, missingSlots);
  }

  // ═══ UNDECIDED in waiting_back_text ═══
  if (isUndecided && stage === STAGE.WAITING_BACK_TEXT) {
    return {
      text: "Genelde isim, tarih, kısa bir not veya özel bir söz yazılıyor efendim 😊 Karar verdiğinizde buradan iletebilirsiniz. İstemezseniz 'yok' yazabilirsiniz.",
      reply_class: REPLY_CLASS.FIXED_INFO,
      support_mode_reason: "",
      _policy: "undecided_back_text",
    };
  }

  // ═══ COMPLAINT: "verdim ya" / "gönderdim ya" ═══
  if (hasComplaints && !hasConfirmations) {
    return buildComplaintResponse(signals, derivedState, missingSlots, stage);
  }

  // ═══ CONFIRMATION: "siparişim alındı mı" ═══
  if (hasConfirmations && signals.confirmations.includes("order_status")) {
    return buildConfirmationResponse(derivedState, missingSlots);
  }

  // ═══ CAPABILITY: "ikili resim" ═══
  if (signals.questions.includes("capability_multi_photo")) {
    const extra = stage === STAGE.WAITING_PHOTO ? " Fotoğrafları buradan gönderebilirsiniz." : "";
    return {
      text: "Evet efendim, tek yüze birden fazla fotoğraf koyabiliyoruz 😊 Profesyonelce birleştirip tek tasarım haline getiriyoruz." + extra,
      reply_class: REPLY_CLASS.FIXED_INFO,
      support_mode_reason: "",
      _policy: "capability_multi_photo",
    };
  }

  // ═══ PAYMENT INFO (AI classified) ═══
  // "EFT ile kapıda fark nedir" → bilgi ver, slot commit etme
  if (signals.questions?.includes("payment_info") || signals._aiLabel === "payment_info") {
    return {
      text: "EFT / Havale ile ödeme yaptığınızda hesaba transfer yaparsınız, fiyatı 599 TL'dir. Kapıda ödeme ile kurye geldiğinde nakit ödersiniz, fiyatı 649 TL'dir efendim 😊 Kapıda ödemede sadece nakit geçerlidir.",
      reply_class: REPLY_CLASS.FIXED_INFO,
      support_mode_reason: "",
      _policy: "payment_info_answer",
    };
  }

  // ═══ WHATSAPP PHOTO CLAIM ═══
  if (signals.complaints?.includes("sent_on_whatsapp") || signals.complaints?.includes("sent_photo_already")) {
    return buildWhatsappPhotoResponse(signals, derivedState, missingSlots);
  }

  return null; // Normal rule chain'e bırak
}

// ─── Payment + Side Question ─────────────────────────────────
function buildPaymentPlusQuestion(signals, state, missingSlots) {
  const payVal = signals.slot_updates.payment_method;
  const payLabel = payVal === "eft_havale" ? "EFT / Havale" : "Kapıda ödeme";
  
  let answer = payLabel + " olarak not aldım efendim 😊 ";
  
  // En önemli soruya cevap
  if (signals.questions.includes("shipping_price")) {
    answer += "Kargo ücreti fiyata dahildir, ekstra ücret yok.";
  } else if (signals.questions.includes("shipping")) {
    answer += "Kargomuz PTT Kargo ile gönderilmektedir. İstanbul 1-2, diğer iller 2-3 iş günüdür.";
  } else if (signals.questions.includes("trust")) {
    answer += "Kararma solma yapmaz, günlük kullanıma uygundur.";
  } else if (signals.questions.includes("price")) {
    // Price zaten payment ile birlikte → sadece onay
  }

  // Sonraki adım
  const nextMissing = missingSlots.filter(m => m !== "payment");
  if (nextMissing.length > 0) {
    if (nextMissing.includes("address") || nextMissing.includes("phone")) {
      if (payVal === "eft_havale") {
        answer += `\n\n${TEXT.EFT_INFO}\n\nAd soyad, cep telefonu ve açık adresinizi iletebilir misiniz?`;
      } else {
        answer += "\n\nAd soyad, cep telefonu ve açık adresinizi iletebilir misiniz?";
      }
    } else if (nextMissing.includes("photo")) {
      answer += " Fotoğrafınızı buradan iletebilirsiniz.";
    } else if (nextMissing.includes("back_text")) {
      answer += " Arka yüze yazı eklemek ister misiniz?";
    }
  }

  return {
    text: answer,
    reply_class: REPLY_CLASS.FLOW_PROGRESS,
    support_mode_reason: "",
    _policy: "payment_plus_question",
  };
}

// ─── Complaint Response ──────────────────────────────────────
function buildComplaintResponse(signals, state, missingSlots, stage) {
  if (missingSlots.length === 0) {
    return {
      text: "Bilgileriniz alınmıştır efendim 😊 Siparişiniz ekibimize iletilmiştir.",
      reply_class: REPLY_CLASS.FIXED_INFO,
      support_mode_reason: "",
      _policy: "complaint_all_filled",
    };
  }
  
  if (missingSlots.length === 1) {
    const msg = {
      photo: "Fotoğrafınızı buradan iletebilirsiniz efendim 😊",
      back_text: "Arka yüze yazı tercihinizi iletebilir misiniz efendim?",
      payment: "Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?",
      phone: "Cep telefonu numaranızı iletebilir misiniz efendim? 📱",
      address: "Açık adresinizi iletebilir misiniz efendim? 📍",
    };
    return {
      text: "Bilgilerinizi aldım efendim 😊 " + (msg[missingSlots[0]] || ""),
      reply_class: REPLY_CLASS.FLOW_PROGRESS,
      support_mode_reason: "",
      _policy: "complaint_one_missing",
    };
  }
  
  const parts = missingSlots
    .filter(m => !["product", "letters"].includes(m))
    .map(m => ({
      phone: "📱 Cep telefonu",
      address: "📍 Açık adres",
      payment: "💳 Ödeme yöntemi",
      photo: "📷 Fotoğraf",
      back_text: "✍️ Arka yazı tercihi",
    }[m]))
    .filter(Boolean);
    
  return {
    text: "Bilgilerinizi aldım efendim 😊 Şu bilgiler eksik:\n\n" + parts.join("\n"),
    reply_class: REPLY_CLASS.FLOW_PROGRESS,
    support_mode_reason: "",
    _policy: "complaint_multi_missing",
  };
}

// ─── Order Status Confirmation ───────────────────────────────
function buildConfirmationResponse(state, missingSlots) {
  if (state.order_status === "completed") {
    return {
      text: "Evet efendim, siparişiniz alınmıştır 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.",
      reply_class: REPLY_CLASS.FIXED_INFO,
      support_mode_reason: "",
      _policy: "confirmation_completed",
    };
  }
  
  if (missingSlots.length > 0) {
    const parts = missingSlots
      .filter(m => !["product", "letters"].includes(m))
      .map(m => ({
        phone: "📱 Cep telefonu",
        address: "📍 Açık adres",
        payment: "💳 Ödeme yöntemi",
        photo: "📷 Fotoğraf",
        back_text: "✍️ Arka yazı tercihi",
      }[m]))
      .filter(Boolean);
    return {
      text: "Siparişiniz devam ediyor efendim 😊 Tamamlamak için şu bilgiler gerekli:\n\n" + parts.join("\n"),
      reply_class: REPLY_CLASS.FLOW_PROGRESS,
      support_mode_reason: "",
      _policy: "confirmation_in_progress",
    };
  }
  
  return null;
}

// ─── WhatsApp Photo Claim ────────────────────────────────────
function buildWhatsappPhotoResponse(signals, state, missingSlots) {
  return {
    text: "WhatsApp üzerinden ilettiyseniz kontrol edip dönüş sağlayalım efendim 😊 Dilerseniz buradan da iletebilirsiniz.",
    reply_class: REPLY_CLASS.FLOW_PROGRESS,
    support_mode_reason: "",
    _policy: "whatsapp_photo_claim",
  };
}
