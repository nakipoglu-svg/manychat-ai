// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENGINE v8 — 5 katmanlı temiz orkestratör
// 1. Understand  2. State  3. Answer  4. Guard  5. Output
// Tek karar noktası. Override zinciri yok.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  REPLY_CLASS, SUPPORT_REASON, TEXT, STAGE, PRODUCT,
  EXPLICIT_SWITCH_PHRASES, KW,
  LAZER_STRONG_SIGNALS, LAZER_MEDIUM_SIGNALS, ATAC_STRONG_SIGNALS, PRODUCT_AMBIGUOUS_SIGNALS,
} from "./constants.js";
import {
  normalizeText, unwrap, normalizeProduct, normalizeStage,
  normalizePayment, normalizeOrderStatus, normalizeBackText, normalizeAddress,
  hasAny, truthy, cleanReply, getEntryProduct, detectProductFromText,
  applyTypoNormalization,
} from "./normalize.js";
import { detectIntent, detectSecondaryIntent, extractEntities } from "./intent-engine.js";
import { readInitialState, deriveState, commitPatch, getFilledSlots, getMissingSlots } from "./state.js";
import { buildSlotStates, applyEarlySlotMemory } from "./slot-machine.js";
import { generateAnswer } from "./answer-engine.js";
import { guardReply } from "./guard-engine.js";

function buildContext(body) {
  const messageRaw = unwrap(body.message || body.last_input_text || body.last_user_message || "");
  // Sıra 8: Typo normalization — kanıtlanmış yüzey-form typo'ları düzelt
  const message = applyTypoNormalization(messageRaw);
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

  // ════════════════════════════════════════════════════════════════
  // PRODUCT CONTEXT SWITCH — 3 seviyeli sinyal sistemi (Sıra 3)
  // ════════════════════════════════════════════════════════════════

  // Helper: skoru hesapla
  function calcLazerSignal(n) {
    let score = 0;
    if (hasAny(n, LAZER_STRONG_SIGNALS)) score += 3;
    const mediumHits = LAZER_MEDIUM_SIGNALS.filter(s => n.includes(s)).length;
    score += Math.min(mediumHits, 2); // max 2 orta sinyal sayılır
    return score;
  }
  function calcAtacSignal(n) {
    if (hasAny(n, ATAC_STRONG_SIGNALS)) return 3;
    return 0;
  }

  // Mevcut ürün var + explicit text sinyali farklı → standard switch kararı
  if (previousProduct && explicitProduct && previousProduct !== explicitProduct) {
    // Ambiguous bağlam → switch yapma
    if (hasAny(norm, PRODUCT_AMBIGUOUS_SIGNALS)) {
      product = previousProduct;
    }
    // Sadece fiyat/bilgi soruları → bağlamı koru
    else if (!hasAny(norm, EXPLICIT_SWITCH_PHRASES) && (
      hasAny(norm, KW.price) || hasAny(norm, KW.shipping) || hasAny(norm, KW.trust) ||
      hasAny(norm, KW.chain) || hasAny(norm, KW.payment) || hasAny(norm, KW.material_question)
    )) {
      product = previousProduct;
    }
    else {
      product = explicitProduct;
    }
  }

  // ── PRODUCT CONTEXT RECOVERY ──
  // Mevcut ürün ataç iken lazer lehine güçlü sinyal → lazer'e geç
  if (product === PRODUCT.ATAC) {
    // ━━━ FIX F5_product_switch ━━━
    // Güçlü resim/foto/lazer sinyali varsa AMBIGUOUS olsa bile switch yap
    const strongPhotoSignal = hasAny(norm, [
      "resim olsun","resimli olsun","resimli istiyor","resim istiyor","resim olur mu",
      "fotograf olsun","fotoğraf olsun","foto olsun","foto istiyor","fotograf istiyor","fotoğraf istiyor",
      "hangi modelde resim","hangi modelde foto","hangi modelde fotograf","hangi modelde fotoğraf",
      "resimli hangi","resim yapilan","resim yapılan","fotograf yapilan","fotoğraf yapılan",
      "gorsel de neden resim","görsel de neden resim","ama resim","ama fotograf","ama fotoğraf",
      "resimli modele","resimli modelde","resimli model",
      "kolyenin iki tarafina foto","kolyenin iki tarafına foto","iki tarafina foto","iki tarafına foto",
      "yanyana yapacak","yan yana yapacak","yanyana yapacaksiniz","yan yana yapacaksınız",
      "resim atacakti","resim atacaktı","resmi atacakti","resmi atacaktı",
      "lazer kolye","lazer kolyesi","resimli lazer","lazer olacak","lazerli foto","lazerli resim",
      "fotograf atacakti","fotoğraf atacaktı","foto atacakti","foto atacaktı",
      "resim yaptir","resim yaptırıp","resim yaptırsak","resim yaptirsak",
      "resmi yaptir","resmi yaptırıp","resimli yaptir","resimli yaptır",
      "son resimde","son resim","son attigim resim","son attığım resim",
      "resimde ayicik","resimde ayıcık","resimde boncuk","resimde kalp",
    ]);
    if (strongPhotoSignal) {
      product = PRODUCT.LAZER;
      // waiting_letters'tan waiting_photo'ya düş (harf değil foto bekliyoruz artık)
      if (fields.conversation_stage === "waiting_letters") {
        fields.conversation_stage = STAGE.WAITING_PHOTO;
      }
      // Sonraki info response'ları doğru ürün üzerinden okusun
      fields.ilgilenilen_urun = PRODUCT.LAZER;
      fields.user_product = PRODUCT.LAZER;
    }
    // Ambiguous ise geçme
    const isAmbiguous = hasAny(norm, PRODUCT_AMBIGUOUS_SIGNALS);
    if (product === PRODUCT.ATAC && !isAmbiguous) {
      const lazerScore = calcLazerSignal(norm);
      const atacScore = calcAtacSignal(norm);
      // Fotoğraf yükleme → kesin lazer
      if (hasAny(norm, ["http","lookaside","fbsbx","cdninstagram","amojo","kommo"]) || /https?:\/\//.test(message || "")) {
        product = PRODUCT.LAZER;
      }
      // Güçlü lazer sinyali (score≥3) ve ataç güçlü sinyal yok → geç
      else if (lazerScore >= 3 && atacScore === 0) {
        product = PRODUCT.LAZER;
      }
      // Orta lazer sinyal (score≥2) ve mevcut ataç stage erken (waiting_letters/waiting_product) → geç
      else if (lazerScore >= 2 && atacScore === 0 &&
               ["waiting_letters","waiting_product",""].includes(fields.conversation_stage || "")) {
        product = PRODUCT.LAZER;
      }
      // Resim + kişi/çocuk bağlamı ataç waiting_letters'da → lazer (score≥1 + özel sinyal)
      else if (lazerScore >= 1 && atacScore === 0 &&
               fields.conversation_stage === "waiting_letters" &&
               hasAny(norm, ["resim","resmi","resmini","foto","fotograf","fotografin","fotografı","fotoğraf","fotografini","fotoğrafını"]) &&
               hasAny(norm, ["cocuk","çocuk","cocug","kardes","kardeş","aile","kisi","kişi","tek resim","bir resim","cocuklarim","çocuklarım","cocuğumun","cocuklarimin","oglum","oglu","oğlum","kizim","kızım"])) {
        product = PRODUCT.LAZER;
      }
      // 3+ resim waiting_letters → lazer (fotoğraf bağlamı)
      else if (lazerScore >= 1 && atacScore === 0 &&
               fields.conversation_stage === "waiting_letters" &&
               hasAny(norm, ["3 resim","uc resim","üç resim","iki resim","2 resim","3 foto","uc foto","üç foto","iki foto","2 foto"]) &&
               hasAny(norm, ["tek kolye","tek kolyede","kolye","bir kolye"])) {
        product = PRODUCT.LAZER;
      }
    }
  }

  // Mevcut ürün lazer iken ataç lehine güçlü sinyal → ataç'a geç (daha temkinli)
  if (product === PRODUCT.LAZER) {
    const isAmbiguous = hasAny(norm, PRODUCT_AMBIGUOUS_SIGNALS);
    if (!isAmbiguous && calcAtacSignal(norm) >= 3 && calcLazerSignal(norm) === 0) {
      // Sadece erken stage'de (fotoğraf gönderilmemişse)
      if (!fields.photo_received && ["waiting_photo","waiting_product",""].includes(fields.conversation_stage || "")) {
        product = PRODUCT.ATAC;
      }
    }
  }
  // No-product context: güçlü lazer sinyali varsa lazer set et
  if (!product && hasAny(norm, LAZER_STRONG_SIGNALS)) {
    product = PRODUCT.LAZER;
  }

  const extracted = extractEntities(message, norm, product, fields.conversation_stage);
  const intent = detectIntent({ message, norm, product, stage: fields.conversation_stage, extracted, fields });
  const secondary_intent = detectSecondaryIntent(norm, intent, { fields, product });
  // F5_product_switch: switch olduysa previousProduct'ı da senkronize et ki
  // answer-engine'deki `ctx.previousProduct || ctx.fields.ilgilenilen_urun` kontrolleri yeni ürünü görsün.
  const effectivePreviousProduct = (product && previousProduct && product !== previousProduct) ? product : previousProduct;
  // ━━━ FIX F8: lastContext — son bot cevabından bağlam çıkar ━━━
  const lastReplyNorm = normalizeText(fields.ai_reply || "");
  const lastContext = {
    askedAboutFit: /sigar|sigdi|bebek kucuk|cok kucuk/.test(lastReplyNorm) || fields.last_intent === "back_text_fit_question",
    askedAboutPeople: /kac kisi|birden fazla|iki kisi|uc kisi|aile fot|3 kisi|3 kisilik/.test(lastReplyNorm),
    askedAboutColor: /renk|gumus|altin|sari|gold/.test(lastReplyNorm),
    askedAboutChain: /zincir|italyan|burgu|60 cm/.test(lastReplyNorm),
    askedAboutBackText: /arka yazi|arka yuz|ne yazalim|arkasina|arka tarafa/.test(lastReplyNorm),
    askedAboutPayment: /odeme|eft|havale|kapida/.test(lastReplyNorm),
    askedAboutShip: /kargo|teslim|kac gunde|iş gunu|is gunu/.test(lastReplyNorm),
    askedAboutTrust: /kararma|solma|paslanma|14 ayar|celik|alerji|garanti/.test(lastReplyNorm),
    askedAboutPreview: /yogunluga gore|kargo sonrasi|kargo oncesi|paylasabiliyoruz/.test(lastReplyNorm),
    lastIntent: fields.last_intent || "",
  };
  return { message, norm, product, previousProduct: effectivePreviousProduct, intent, secondary_intent, fields, extracted, lastContext };
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
  const LAST_INTENT_MAP = {
    "back_text_content": "back_text", "back_text_question": "back_text_info",
    "back_text_fit_question": "back_text_info", "quantity_order": "multi_order",
    "decision_support": "preview_request", "composition_question": "back_photo_info",
    "example_request": "preview_request",
  };
  return {
    success: true, ai_reply: replyText, ilgilenilen_urun: s.product, user_product: s.product,
    last_intent: LAST_INTENT_MAP[ctx.intent] || ctx.intent, conversation_stage: stage, photo_received: s.photo_received || "",
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
