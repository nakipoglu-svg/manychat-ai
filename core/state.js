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
  const { intent, product, previousProduct, extracted, message, norm } = ctx;
  const patch = {};
  const _confidence = {};  // Field confidence tracking
  const _source = {};      // Field source tracking
  const _corrections = {}; // Correction history counters

  // ═══ CORRECTION SIGNAL DETECTION ═══
  const correctionSignal = /yanlis|yanlış|degisti|değişti|duzelt|düzelt|yeni adres|yeni numara|dogrusu|doğrusu|degil|değil bu|numaram degisti|telefonum degisti|cep numaram/.test(norm || "");
  const phoneCorrectionSignal = /numara.*yanlis|numara.*yanlış|telefon.*yanlis|telefon.*yanlış|numaram.*degisti|telefonum.*degisti|yeni numara|dogrusu bu|doğrusu bu|numaram bu/.test(norm || "");
  const addressCorrectionSignal = /adres.*yanlis|adres.*yanlış|adres.*degisti|adres.*değişti|yeni adres|mahalle.*yanlis|numara.*yanlis.*adres/.test(norm || "");

  // Ürün değişimi → full reset + stage recovery
  if (previousProduct && product && previousProduct !== product) {
    // Ataç → Lazer: foto zaten gönderildiyse waiting_payment'a recovery
    const wasAtacToLazer = previousProduct === "atac" && product === "lazer";
    const hasPhotoInMessage = /http|lookaside|fbsbx|cdninstagram|amojo|kommo/.test(ctx?.message || "");
    const recoveryStage = wasAtacToLazer && hasPhotoInMessage ? "waiting_payment" : "";
    Object.assign(patch, {
      product, conversation_stage: recoveryStage, photo_received: hasPhotoInMessage ? "1" : "", payment_method: "",
      order_status: "started", back_text_status: "", address_status: "",
      support_mode: "", support_mode_reason: "", reply_class: "",
      cancel_reason: "", context_lock: product ? "1" : initialState.context_lock || "",
      siparis_alindi: "", letters_received: "", phone_received: "",
    });
    _source.product = "explicit_switch";
    _corrections.product_switch = (initialState._corrections?.product_switch || 0) + 1;
  }

  // Ürün set
  if (product) {
    patch.product = product;
    patch.context_lock = "1";
    if (!initialState.order_status && !patch.order_status) patch.order_status = "started";
  }

  // ═══ FIELD CONFIDENCE + SOURCE + SHOULD-UPDATE FILTER ═══

  // Payment
  // Signal-aware: mesajda açıkça "seçeyim/olsun" + payment keyword varsa, intent ne olursa olsun commit et
  const hasPaymentSelectionSignal = /seceyim|seçeyim|olsun|istiyorum|isterim|seciyorum|seçiyorum|sectim|seçtim/.test(norm || "");
  const paymentBlocked = intent === INTENT.PRICE || (intent === INTENT.SHIPPING_PRICE && !hasPaymentSelectionSignal);
  if (extracted.payment && !paymentBlocked) {
    const isSwitch = initialState.payment_method && initialState.payment_method !== extracted.payment;
    const hasCorrectionSignal = /yok|degil|değil|olsun|degistir|değiştir|vazgec|vazgeç/.test(norm);
    if (!initialState.payment_method || isSwitch) {
      patch.payment_method = extracted.payment;
      _confidence.payment = "high";
      _source.payment = isSwitch ? (hasCorrectionSignal ? "correction" : "switch") : "explicit";
      if (isSwitch) _corrections.payment_switch = (initialState._corrections?.payment_switch || 0) + 1;
    }
  }

  // Photo
  if (extracted.photoLink && intent === INTENT.PHOTO) {
    patch.photo_received = "1";
    _confidence.photo = "high";
    _source.photo = "explicit";
  }

  // Letters
  if (intent === INTENT.LETTERS && extracted.letters) {
    patch.letters_received = "1";
    _confidence.letters = "high";
    _source.letters = "explicit";
  }

  // Back text
  // Signal-aware: undecided mesajları ve SORU mesajlarını back_text olarak kaydetme
  const signalUndecided = ctx.signals?.undecided || false;
  const signalIsQuestion = (ctx.signals?.questions?.length || 0) > 0;
  const isBackTextQuestion = /yaziyor mu|yazıyor mu|yazilir mi|yazılır mı|yapilir mi|yapılır mı|olur mu|olurmu|oluyor mu|yazabilir|yazamiyor|yazilmiyor|var mi|varmi|genelde|ne yazilir/.test(ctx.norm || "");
  // back_text_content: müşteri içerik verdi → her zaman received (skipped bile olsa override)
  if (intent === "back_text_content") {
    patch.back_text_status = "received"; _confidence.back_text = "high"; _source.back_text = "content_explicit";
  }
  // back_text_question ile back_text_fit_question: soru → received SET ETME
  // Sadece eski back_text intent'i (legacy) ve heuristic aşağıda
  if (intent === INTENT.BACK_TEXT && !signalUndecided && !signalIsQuestion && !isBackTextQuestion) {
    patch.back_text_status = "received"; _confidence.back_text = "high"; _source.back_text = "explicit";
  }
  if (intent === INTENT.BACK_TEXT_SKIP) { patch.back_text_status = "skipped"; _confidence.back_text = "high"; _source.back_text = "explicit"; }
  if (intent === INTENT.BACK_PHOTO_UPLOAD) { patch.back_text_status = "received"; _confidence.back_text = "high"; _source.back_text = "photo_upload"; }

  // Heuristic back_text: w_payment + photo var + back_text boş + general intent + kişisel mesaj
  const currentStageForBT = initialState.conversation_stage;
  const btEmpty = !initialState.back_text_status && !patch.back_text_status;
  const btSkipped = initialState.back_text_status === "skipped" && !patch.back_text_status;
  const photoReady = truthy(initialState.photo_received) || patch.photo_received === "1";
  const isPersonalMessage = /canim|canım|seviyorum|annem|babam|ailem|seni cok|seni çok|hatira|hatıra|duam|allah|mekanim|mekanım|rahatla|huzurla|ozledim|özledim|sensiz|biricik|yavrum/.test(ctx.norm || "");
  // "arkaya yazdırmak istiyorum" — back_text skipped bile olsa override
  const isBackTextRequest = /arkaya.*yazdirmak|arkaya.*yazdır|arkaya da.*tarih|arkaya da.*isim|arkasina.*yazdirmak|arkasına.*yazdır/.test(ctx.norm || "");
  const msgTrimmed = (ctx.message || "").trim();
  const msgLength = msgTrimmed.length;
  const wordCount = msgTrimmed.split(/\s+/).length;
  const isShortNameLike = wordCount <= 4 && /^[A-ZÇĞİÖŞÜ]/.test(msgTrimmed) && !/\?|odeme|ödeme|kargo|fiyat|kaç|kac|nasil|nasıl|neden|nerede/.test(ctx.norm || "");
  // back_text_content skipped iken de override eder
  if (intent === "back_text_content" && btSkipped) {
    patch.back_text_status = "received"; _confidence.back_text = "high"; _source.back_text = "content_override_skipped";
  }
  if (currentStageForBT === "waiting_payment" && photoReady && intent === INTENT.GENERAL) {
    if (isBackTextRequest) {
      patch.back_text_status = "received"; _confidence.back_text = "high"; _source.back_text = "explicit_request";
    } else if (btEmpty && (isPersonalMessage || isShortNameLike)) {
      patch.back_text_status = "received"; _confidence.back_text = "medium"; _source.back_text = "heuristic_personal";
    }
  }
  // isBackTextRequest skipped iken de override
  if (isBackTextRequest && btSkipped) {
    patch.back_text_status = "received"; _confidence.back_text = "high"; _source.back_text = "explicit_override_skipped";
  }

  // ═══ SIRA 6: FULL CONTACT BUNDLE — name+phone+address tek mesajda ═══
  if (intent === "full_contact_bundle") {
    if (extracted.phone) { patch.phone_received = "1"; }
    if (extracted.hasAddress || ctx.norm?.length > 40) {
      patch.address_status = "received";
      // Stage'i ilerlet
      if (initialState.conversation_stage === "waiting_address") {
        patch.conversation_stage = "order_completed";
      }
    }
  }

  // phone_provide → phone slot doldur
  if (intent === "phone_provide" && extracted.phone) {
    patch.phone_received = "1";
  }

  // address_provide_full → address slot doldur
  if (intent === "address_provide_full") {
    patch.address_status = "received";
  }

  // ═══ PHONE (with correction mode) ═══
  if (extracted.phone) {
    const existingPhone = initialState.phone_received === "1";
    if (!existingPhone) {
      // Yeni telefon
      patch.phone_received = "1";
      _confidence.phone = "high";
      _source.phone = "explicit";
    } else if (phoneCorrectionSignal) {
      // Telefon düzeltme: mevcut var ama müşteri düzeltmek istiyor
      patch.phone_received = "1";
      _confidence.phone = "correction";
      _source.phone = "correction";
      _corrections.phone_correction = (initialState._corrections?.phone_correction || 0) + 1;
    }
    // Mevcut telefon var, correction sinyali yok → overwrite yapma
  }

  // ═══ ADDRESS LOGIC (with confidence + correction counter) ═══
  if (extracted.hasAddress && extracted.phone) {
    patch.address_status = "received";
    patch.phone_received = "1";
    _confidence.address = "high";
    _source.address = "full_combo";
  } else if (extracted.hasAddress) {
    const cur = patch.address_status || initialState.address_status || "";
    if (!cur || cur === "address_only" || addressCorrectionSignal) {
      patch.address_status = cur ? "address_only" : "address_only";
      _confidence.address = addressCorrectionSignal ? "correction" : "medium";
      _source.address = addressCorrectionSignal ? "correction" : "partial";
      if (addressCorrectionSignal && cur) _corrections.address_correction = (initialState._corrections?.address_correction || 0) + 1;
    }
  }
  const effAddr = patch.address_status || initialState.address_status || "";
  const effPhone = patch.phone_received === "1" || initialState.phone_received === "1" || extracted.phone;
  if (effAddr === "address_only" && effPhone) {
    patch.address_status = "received";
    patch.phone_received = "1";
  }

  // Şubeden teslim
  if (intent === INTENT.STORE_PICKUP) { patch.address_status = "received"; _source.address = "store_pickup"; }

  // İptal
  if (intent === INTENT.CANCEL) {
    patch.cancel_reason = message || "cancel_requested";
    patch.support_mode = "1";
    patch.support_mode_reason = SUPPORT_REASON.CANCEL;
    patch.order_status = "cancel_requested";
    patch.siparis_alindi = "";
  }

  // ═══ STAGE FREEZE GUARD ═══
  // Kritik stage'lerde düşük confidence intent geldi diye stage sıçramasın
  // AMA: ürün değişimi, ödeme seçimi, iptal gibi meşru geçişler freeze edilmemeli
  const currentStage = initialState.conversation_stage;
  const FREEZE_STAGES = new Set(["waiting_payment", "waiting_address", "waiting_payment"]);
  const hasProductSwitch = previousProduct && product && previousProduct !== product;
  const hasPaymentChange = !!patch.payment_method;
  const hasAddressChange = !!patch.address_status;
  const hasCancel = intent === INTENT.CANCEL;
  const isLegitTransition = hasProductSwitch || hasPaymentChange || hasAddressChange || hasCancel || !!patch.photo_received || !!patch.back_text_status || !!patch.letters_received || !!patch.phone_received;
  const isLowConfidenceTransition = intent === INTENT.GENERAL && FREEZE_STAGES.has(currentStage) && !isLegitTransition;

  // Derived = initial + patch
  const derived = { ...initialState, ...patch };

  // Ürüne göre alan temizliği
  if (derived.product !== PRODUCT.LAZER) { derived.photo_received = ""; derived.back_text_status = ""; }
  if (derived.product !== PRODUCT.ATAC) { derived.letters_received = ""; }

  const nextStage = calcNextStage(derived);

  // Stage freeze: düşük confidence intent ile stage değişmesin
  const wouldChange = nextStage !== currentStage;
  const frozenStage = (isLowConfidenceTransition && wouldChange) ? currentStage : null;
  const _freezeReason = frozenStage
    ? `general_intent_in_${currentStage}` + (wouldChange ? `_blocked_${nextStage}` : "")
    : null;

  return {
    derivedState: derived,
    proposedPatch: patch,
    nextStage: frozenStage || nextStage,
    _confidence,
    _source,
    _corrections,
    _frozenStage: frozenStage,
    _freezeReason,
  };
}

// ─── NEXT STAGE ─────────────────────────────────────────────

function calcNextStage(s) {
  if (!s.product) return s.menu_gosterildi === "evet" ? STAGE.WAITING_PRODUCT : "";
  if (s.order_status === "cancel_requested") return STAGE.HUMAN_SUPPORT;
  if (s.product === PRODUCT.LAZER) {
    if (!truthy(s.photo_received)) return STAGE.WAITING_PHOTO;
    // back_text artık zorunlu stage DEĞİL — müşteri isterse opsiyonel olarak verir
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

// ─── SLOT TRUTH: getMissingSlots ─────────────────────────
// Tek merkezde "ne eksik" hesaplayan fonksiyon
// Her zaman BUNA bakılır, başka yerde slot kontrolü yapılmaz

export function getMissingSlots(state) {
  const missing = [];
  const product = state.product || state.ilgilenilen_urun || "";

  if (!product) return ["product"];

  if (product === PRODUCT.LAZER) {
    if (!truthy(state.photo_received)) missing.push("photo");
    // back_text artık eksik listesinde YOK — opsiyonel
  }
  if (product === PRODUCT.ATAC) {
    if (!truthy(state.letters_received)) missing.push("letters");
  }
  if (!state.payment_method) missing.push("payment");
  if (state.address_status !== "received") {
    if (state.phone_received !== "1") missing.push("phone");
    if (state.address_status !== "address_only") missing.push("address");
    // address_only varsa sadece phone eksik olabilir
    if (state.address_status === "address_only" && state.phone_received !== "1") {
      // phone zaten eklendi yukarıda
    } else if (state.address_status !== "address_only") {
      // hiç adres yok
    }
  }

  return missing;
}

// ─── FILLED SLOTS: hangi slotlar dolu ────────────────────

export function getFilledSlots(state) {
  const filled = {};
  filled.photo = truthy(state.photo_received);
  filled.back_text = !!state.back_text_status; // received veya skipped
  filled.payment = !!state.payment_method;
  filled.phone = state.phone_received === "1";
  filled.address = state.address_status === "received" || state.address_status === "address_only";
  filled.address_full = state.address_status === "received";
  filled.letters = truthy(state.letters_received);
  filled.product = state.product || state.ilgilenilen_urun || "";
  return filled;
}

// ─── COMMIT PATCH ───────────────────────────────────────────
// Final cevap seçildikten sonra, cevaba göre patch'i finalleştir.

export function commitPatch(derivedResult, reply) {
  // Şimdilik derived state'i olduğu gibi commit.
  // İleride reply'a göre düzeltme gerekirse burası genişler.
  return { ...derivedResult.derivedState };
}
