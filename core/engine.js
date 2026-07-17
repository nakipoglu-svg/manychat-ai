// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENGINE v8 — 5 katmanlı temiz orkestratör
// 1. Understand  2. State  3. Answer  4. Guard  5. Output
// Tek karar noktası. Override zinciri yok.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  REPLY_CLASS, SUPPORT_REASON, TEXT, STAGE, PRODUCT, SITE_URL,
  EXPLICIT_SWITCH_PHRASES, KW,
  LAZER_STRONG_SIGNALS, LAZER_MEDIUM_SIGNALS, ATAC_STRONG_SIGNALS, PRODUCT_AMBIGUOUS_SIGNALS,
  siteOrderBlock,
} from "./constants.js";
import {
  normalizeText, unwrap, normalizeProduct, normalizeStage,
  normalizePayment, normalizeOrderStatus, normalizeBackText, normalizeAddress,
  hasAny, truthy, cleanReply, getEntryProduct, detectProductFromText,
  applyTypoNormalization, looksLikeAddress, isUnsupportedProductVariant,
} from "./normalize.js";
import { detectIntent, detectSecondaryIntent, extractEntities } from "./intent-engine.js";
import { readInitialState, deriveState, commitPatch, getFilledSlots, getMissingSlots } from "./state.js";
import { buildSlotStates, applyEarlySlotMemory } from "./slot-machine.js";
import { generateAnswer } from "./answer-engine.js";
import { guardReply } from "./guard-engine.js";
import { classifyDecision, categorizeCurrentBehavior, isPolicyV2 } from "./decision-policy.js";

function envList(name) {
  return String(process.env[name] || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);
}

function resolvePolicyVersion(body, fields) {
  const explicit = unwrap(body.policy_version || body.policy || fields.policy_version || "");
  if (explicit) return isPolicyV2(explicit) ? "v2" : "current";

  const envPolicy = String(process.env.POLICY_VERSION || "current").trim().toLowerCase();
  if (envPolicy !== "v2") return "current";

  const leadAllowlist = envList("POLICY_V2_TEST_LEAD_IDS");
  const contactAllowlist = envList("POLICY_V2_TEST_CONTACT_IDS");
  if (!leadAllowlist.length && !contactAllowlist.length) return "v2";

  const leadId = unwrap(body.lead_id || body.leadId || body.amocrm_lead_id || "");
  const contactId = unwrap(body.contact_id || body.contactId || body.amocrm_contact_id || "");
  if (leadId && leadAllowlist.includes(String(leadId))) return "v2";
  if (contactId && contactAllowlist.includes(String(contactId))) return "v2";
  return "current";
}

function buildContext(body) {
  const messageRaw = unwrap(body.message || body.last_input_text || body.last_user_message || "");
  // Sıra 8: Typo normalization — kanıtlanmış yüzey-form typo'ları düzelt
  let message = applyTypoNormalization(messageRaw);
  let norm = normalizeText(message);
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
    name_received: unwrap(body.name_received),
    policy_version: unwrap(body.policy_version || body.policy || ""),
  };
  // ── NUMARALI MENÜ SEÇİMİ ──
  // Ürün seçim aşamasında (waiting_product veya boş) müşteri "1".."6" yazarsa ilgili
  // ürüne çevrilir. Aktif sipariş akışında (foto/ödeme/adres) devreye GİRMEZ — orada
  // "1" adet/başka anlama gelebilir.
  {
    const atSelectStage = !fields.conversation_stage || fields.conversation_stage === STAGE.WAITING_PRODUCT;
    const m = message.match(/^\s*([1-6])\s*$/);
    if (atSelectStage && m) {
      const NUM_TO_PRODUCT = {
        "1": "resimli lazer kolye", "2": "resimli bileklik", "3": "isimli yonca kolye",
        "4": "anahtarlik", "5": "harfli atac kolye", "6": "evcil hayvan mezar tasi",
      };
      message = NUM_TO_PRODUCT[m[1]];
      norm = normalizeText(message);
    }
  }

  // RAW input product — buildContext'in LAZER/ATAC signal-based upgrade'lerinden önce
  // kullanıcının GERÇEKTEN seçtiği ürün. Handler'lar bunu kullanabilir: kullanıcı ürün
  // seçmeden composition sorusu soruyorsa, derived product lazer olsa bile gate aktif kalsın.
  const rawInputProduct = normalizeProduct(unwrap(body.ilgilenilen_urun) || unwrap(body.user_product) || "");
  const previousProduct = normalizeProduct(fields.ilgilenilen_urun || fields.user_product || "");
  const entryProduct = getEntryProduct(body);
  const unsupportedProductVariant = isUnsupportedProductVariant(norm);
  const explicitProduct = detectProductFromText(norm, fields.conversation_stage);
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

  // ── ADRES GUARD ──
  // Müşteri waiting_address'te adresini yazıyorsa, adres içindeki mahalle/sokak
  // isimleri ("mezarlık", "yonca" vb.) ürün switch'i TETİKLEMEMELİ. Aktif siparişte
  // teslimat adresi asla ürün değiştirmez.
  const _atAddressStage = fields.conversation_stage === STAGE.WAITING_ADDRESS;
  const _msgLooksLikeAddress = _atAddressStage && looksLikeAddress(norm, message, fields.conversation_stage);

  // Mevcut ürün var + explicit text sinyali farklı → standard switch kararı
  // MEZAR_TASI ve BILEKLIK: "foto/resim" gibi ortak kelimeler lazer sinyali verebilir;
  // bu ürünler lazer/ataç sisteminden bağımsız, switch yapılmaz.
  if (previousProduct && unsupportedProductVariant && !_msgLooksLikeAddress) {
    product = PRODUCT.OTHER;
  }
  else if (previousProduct && explicitProduct && previousProduct !== explicitProduct &&
      !_msgLooksLikeAddress &&
      ![PRODUCT.MEZAR_TASI, PRODUCT.BILEKLIK].includes(previousProduct)) {
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
    const explicitAtacPhotoQuestion =
      hasAny(norm, ["atac","ataç"]) &&
      hasAny(norm, ["foto","fotograf","fotoğraf","resim"]) &&
      hasAny(norm, ["olur mu","oluyor mu","var mi","var mı","eklen","eklenir","yapilir","yapılır"]);
    const futurePhotoOnlyInAtac =
      hasAny(norm, ["resim atacagim","resim atacağım","resim atcam","foto atacagim","foto atacağım","foto gonderecegim","foto göndereceğim","resim gonderecegim","resim göndereceğim"]) &&
      !hasAny(norm, ["lazer","resimli lazer","resimli kolye","iki","2","uc","üç","3","cocuk","çocuk","kisi","kişi","aile"]);
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
    if (strongPhotoSignal && !explicitAtacPhotoQuestion && !futurePhotoOnlyInAtac) {
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
    if (product === PRODUCT.ATAC && !isAmbiguous && !explicitAtacPhotoQuestion && !futurePhotoOnlyInAtac) {
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

  if (unsupportedProductVariant) {
    fields.conversation_stage = "";
    fields.photo_received = "";
    fields.payment_method = "";
    fields.order_status = "";
    fields.back_text_status = "";
    fields.address_status = "";
    fields.siparis_alindi = "";
    fields.letters_received = "";
    fields.phone_received = "";
    fields.name_received = "";
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
    askedAboutTrust: /kararma|solma|paslanma|316l|celik|alerji|garanti/.test(lastReplyNorm),
    askedAboutPreview: /on izleme|ön izleme|prova|bitmis urun fotografi|bitmiş ürün fotoğrafı|uretim sonrasi|üretim sonrası/.test(lastReplyNorm),
    lastIntent: fields.last_intent || "",
  };
  const policyVersion = resolvePolicyVersion(body, fields);
  return { message, norm, product, previousProduct: effectivePreviousProduct, rawInputProduct, intent, secondary_intent, fields, extracted, lastContext, policyVersion };
}

function buildOutput(ctx, reply, committed, meta) {
  // SESSİZLİK: motor bilinçli olarak boş cevap döndüyse (saf onay/emoji), fallback ile DOLDURMA.
  let replyText = reply?.silent ? "" : (cleanReply(reply?.text || "") || TEXT.FALLBACK);
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
  if (!reply?.silent && (!replyText || replyText === TEXT.FALLBACK)) { supportMode = "1"; supportReason = SUPPORT_REASON.FALLBACK; replyClass = REPLY_CLASS.FALLBACK; }
  if (reply?.support_mode_reason) { supportReason = reply.support_mode_reason; supportMode = "1"; }
  if (replyText.includes("Hangi model ile ilgileniyorsunuz")) { menuShown = "evet"; if (!s.product) stage = STAGE.WAITING_PRODUCT; }
  if (s._nextStage === STAGE.ORDER_COMPLETED) { orderStatus = "completed"; siparisAlindi = "1"; }
  else if (!orderStatus && s.product) orderStatus = "started";
  // Bileklik & anahtarlık: artık tam otomatik akış (lazer gibi) — sipariş otomatik tamamlanır.
  // Mezar taşı: bilgiler toplanır ama otomatik KAPANMAZ — tüm bilgiler gelince operatöre devredilir.
  // OTHER (yüzük/küpe vb.): gerçek ürün değil, otomatik sipariş yok.
  if (s.product === PRODUCT.MEZAR_TASI && s._nextStage === STAGE.ORDER_COMPLETED) {
    stage = STAGE.WAITING_ADDRESS;
    orderStatus = "";
    siparisAlindi = "";
    supportMode = "1";
    supportReason = SUPPORT_REASON.SELLER;
    replyText = "Bilgilerinizi aldım efendim 😊 Mezar taşı siparişiniz için ekibimiz en kısa sürede sizinle iletişime geçip tasarım sürecini başlatacaktır.";
  } else if (s.product === PRODUCT.OTHER) {
    orderStatus = "";
    siparisAlindi = "";
  }
  // ━━━ EFT SİPARİŞ GÜVENCESİ ━━━
  // Sipariş EFT ile TAM ŞU AN tamamlanıyorsa IBAN mutlaka görünsün. Müşteri fotoğraftan
  // önce "EFT yapacağım" derse ödeme adımı atlanıp IBAN hiç gösterilmeyebiliyor.
  {
    const wasCompletedOnInput = ctx.fields.order_status === "completed" || ctx.fields.siparis_alindi === "1";
    if (!wasCompletedOnInput && (orderStatus === "completed" || siparisAlindi === "1") &&
        s.payment_method === "eft_havale" && s.product !== PRODUCT.MEZAR_TASI &&
        !/IBAN|TR34/i.test(replyText)) {
      replyText = replyText.trimEnd() + `\n\n${TEXT.EFT_INFO}`;
    }
  }
  if ((orderStatus === "completed" || siparisAlindi === "1") && [STAGE.WAITING_PHOTO,STAGE.WAITING_PAYMENT,STAGE.WAITING_ADDRESS,STAGE.WAITING_LETTERS,STAGE.WAITING_PRODUCT].includes(stage)) stage = STAGE.ORDER_COMPLETED;
  if (s._nextStage === STAGE.HUMAN_SUPPORT || orderStatus === "cancel_requested") { stage = STAGE.HUMAN_SUPPORT; orderStatus = "cancel_requested"; supportMode = "1"; }
  const LAST_INTENT_MAP = {
    "back_text_content": "back_text", "back_text_question": "back_text_info",
    "back_text_fit_question": "back_text_info", "quantity_order": "multi_order",
    "decision_support": "preview_request", "composition_question": "back_photo_info",
    "example_request": "preview_request",
  };

  // ═══ DM→SİTE — SON GÜVENLİK AĞI (kesin garanti) ═══════════════════════
  // Hangi yoldan gelirse gelsin (eski/legacy slot state dahil), nihai cevap bir
  // SİPARİŞ-İŞLEME (slot toplama/onay) ifadesi içeriyorsa → ZORLA siteye çevir.
  // Bot ASLA DM'den sipariş almasın. (FAQ ifadeleri bu listede YOK.)
  if (replyText && !reply?.silent) {
    const SELLING = /[öo]deme tercihini(zi)? belirt|[öo]deme tercihiniz eft|[öo]deme tercihinizi ald[iı]m|ad soyad,? cep telefonu ve a[çc][iı]k adres|a[çc][iı]k adres bilgileriniz ile devam|a[çc][iı]k adresiniz(i| ile)|cep telefonu numaran[iı]z[iı]? (da )?(iletebilir|yaz)|foto[ğg]raf(ınız)? ula[şs]t[iı]|foto[ğg]raf[iı] ald[iı]m|arka foto[ğg]raf[iı] ald[iı]m|harflerinizi ald[iı]m|telefonunuzu ald[iı]m|adres bilginizi ald[iı]m|bilgilerinizi ald[iı]m|telefon numaran[iı]z[iı]? (not )?ald[iı]m|sipari[şs]iniz olu[şs]turulmu[şs]tur|isim bilginizi ald[iı]m/i;
    if (SELLING.test(replyText)) {
      replyText = siteOrderBlock(s.product);
      replyClass = REPLY_CLASS.FIXED_INFO;
      supportMode = ""; supportReason = "";
    }
  }

  return {
    success: true, ai_reply: replyText, ilgilenilen_urun: s.product, user_product: s.product,
    last_intent: LAST_INTENT_MAP[ctx.intent] || ctx.intent, conversation_stage: stage, photo_received: s.photo_received || "",
    payment_method: s.payment_method || "", menu_gosterildi: menuShown, order_status: orderStatus,
    back_text_status: s.back_text_status || "", address_status: s.address_status || "",
    support_mode: supportMode, support_mode_reason: supportReason, reply_class: replyClass,
    siparis_alindi: siparisAlindi, cancel_reason: s.cancel_reason || "", context_lock: s.context_lock || "",
    letters_received: s.letters_received || "", phone_received: s.phone_received || "", name_received: s.name_received || "",
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
    const initialMissingSlots = getMissingSlots(initial);
    const derived = deriveState(initial, ctx);
    const slotStates = buildSlotStates(ctx.fields, { slot_updates: {} }, ctx.extracted, ctx.product);
    const earlySlots = applyEarlySlotMemory(slotStates, ctx.fields.conversation_stage, { slot_updates: {} }, ctx.extracted);
    if (earlySlots.payment_method_early && !derived.derivedState.payment_method) { derived.derivedState.payment_method = earlySlots.payment_method_early; derived.proposedPatch.payment_method = earlySlots.payment_method_early; }
    if (earlySlots.phone_early && derived.derivedState.phone_received !== "1") { derived.derivedState.phone_received = "1"; derived.proposedPatch.phone_received = "1"; }
    const filledSlots = getFilledSlots(derived.derivedState);
    const missingSlots = getMissingSlots(derived.derivedState);
    ctx.filledSlots = filledSlots;
    ctx.missingSlots = missingSlots;
    if (ctx.policyVersion === "v2") {
      ctx.policyDecision = classifyDecision(ctx, initialMissingSlots);
      ctx.policyMissingSlots = initialMissingSlots;
    }

    // Answer (answer-engine handles ALL response decisions)
    let reply = await generateAnswer(ctx);
    meta.replySource = reply.source || "none";

    // Fallback (silent = bilinçli sessizlik, fallback doldurma)
    if (!reply.text && !reply.silent) {
      const st = ctx.fields.conversation_stage;
      if (st === STAGE.WAITING_PHOTO) reply.text = "Fotoğrafınızı buradan iletebilirsiniz efendim 😊";
      else if (st === STAGE.WAITING_PAYMENT) reply.text = "EFT / Havale veya kapıda ödeme seçeneklerimiz mevcuttur efendim 😊";
      else if (st === STAGE.WAITING_ADDRESS) { reply.text = "Ad soyad, cep telefonu ve açık adres bilgileriniz ile devam edelim efendim 😊"; }
      else if (st === STAGE.WAITING_LETTERS) reply.text = "Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊";
      else reply.text = TEXT.FALLBACK;
      meta.replySource = "fallback";
    }

    // Guard (silent cevapta denetlenecek metin yok — atla)
    if (!reply.silent) reply = guardReply(reply, ctx, filledSlots, missingSlots);

    // ═══ MERKEZİ POST-PROCESS: waiting_product menu-suffix ═══
    // Kök yapısal durum: info/material/color/shipping/accessory/trust/kararma/engraving/warranty
    // gibi "bilgi veren" cevaplar waiting_product stage'inde + ürün seçilmediğinde
    // kullanıcıyı menüye yönlendirmeli. Tekil handler'lar tek tek eklemek yerine
    // merkezi bir koşullu suffix uygulaması.
    // NOT: menu_gosterildi="evet" olsa bile kullanıcı hala ürün seçmediyse, menu prompt'u
    // tekrar ekle (stuck-in-selection durumu — kullanıcı menüyü görmüş ama cevap vermemiş).
    {
      const st = ctx.fields?.conversation_stage || "";
      const prod = ctx.product || ctx.fields?.ilgilenilen_urun || "";
      const replyText = reply?.text || "";
      const needsMenu =
        (st === STAGE.WAITING_PRODUCT || st === "waiting_product" || st === "") &&
        !prod &&
        replyText &&
        // Reply zaten menu ya da fiyat-menu içermiyorsa
        !/hangi model/i.test(replyText) &&
        !/hangi ürün ile ilgileniyorsunuz/i.test(replyText) &&
        !/fiyatlarımız/i.test(replyText) &&
        !/siparişiniz başarıyla/i.test(replyText) &&
        replyText !== TEXT.FALLBACK &&
        reply.source !== "guard_frustration" &&
        reply.source !== "fallback" &&
        // Flow commit cevapları değil
        !/fotoğrafınız ulaştı/i.test(replyText) &&
        !/fotoğrafı aldım/i.test(replyText) &&
        !/adres.*aldım/i.test(replyText) &&
        !/harfleri.*aldım/i.test(replyText) &&
        !/arka yazı notu aldım/i.test(replyText) &&
        !/bilgilerinizi aldım/i.test(replyText) &&
        !/isim bilginizi aldım/i.test(replyText) &&
        !/telefon.*aldım/i.test(replyText) &&
        !/ödeme tercihi/i.test(replyText) &&
        !/whatsapp|0505\s*471\s*35\s*45/i.test(replyText) &&
        // Ürün seçim cevapları zaten flow ilerletiyor
        !/resimli lazer kolye siparişiniz/i.test(replyText) &&
        !/harfli ataç kolye siparişiniz/i.test(replyText) &&
        // Smalltalk / warmth / praise intentleri — kapanış mesajı, menu eklenmez
        reply.source !== "smalltalk" &&
        reply.source !== "completed" &&
        ![
          "smalltalk","ack","sensitivity","frustration","complaint","gratitude","greeting",
          "praise","condolence","blessing",
          "post_sale","cancel_order",
          "shipping","shipping_price","payment_info_question","preview_request","completed_photo_share_request",
          "material_question","trust","location","store_pickup","example_request","contact_channel_question",
          "chain_question","chain_structure_request","single_pendant_request","product_structure_request",
          "photo_question","photo_suitability_question","photo_acceptance_question",
          "back_text_info","back_text_question","back_text_fit_question","back_photo_info"
        ].includes(ctx.intent) &&
        // Warmth/praise cevap içerikleri (intent 'general' olsa bile metin warmth ise)
        !/sevindik|güle güle kullan|çok mutlu|çok sevindim|paylaşmanız/i.test(replyText) &&
        !/allah razı olsun|teşekkür ederiz|rica ederiz|rica ederim/i.test(replyText) &&
        !/amin efendim|sağlıkla kullansın/i.test(replyText) &&
        !/otomatik mesajla yardımcı oluyoruz|ekibimiz de gerekli durumlarda/i.test(replyText) &&
        !/tüm ürünlerimizin örnekleri profilimizde|modellerimizi ve ürün detaylarımızı/i.test(replyText) &&
        // Fiyat listesi zaten TÜM ürünleri gösteriyor → "Hangi model?" eklemek gereksiz/rahatsız edici
        !/Güncel Fiyat Listemiz/i.test(replyText) &&
        ctx.intent !== "price" && ctx.intent !== "price_confirmation" &&
        // Cevap çok kısa nötr ise ekleme
        replyText.length > 25;

      if (needsMenu && ctx.policyVersion !== "v2") {
        reply.text = replyText.trimEnd() + (/[.!?😊🤍💫]\s*$/.test(replyText) ? "" : ".") + " Hangi model ile ilgileniyorsunuz efendim?";
      }
    }

    // Output
    const committed = commitPatch(derived, reply);
    committed._nextStage = derived.nextStage;
    const output = buildOutput(ctx, reply, committed, meta);
    output._debug = { intent: ctx.intent, source: meta.replySource, product: ctx.product };
    output.behavior_category = ctx.policyDecision?.behavior_category || categorizeCurrentBehavior(output);
    output.policy_version = ctx.policyVersion;

    // ═══ DÖNGÜ KIRICI ═══
    // Bot art arda AYNI TİP cevabı tekrarlıyorsa (müşteri takılmış, ilerleme yok),
    // verbatim tekrar yerine ALTERNATİF yol öner (web sitesi + insan yardımı) — çıkmazı kır.
    // Sadece aktif akışta; ilk mesajda (önceki cevap yok) tetiklenmez.
    if (!reply.silent && output.ai_reply) {
      const prevN = normalizeText(ctx.fields?.ai_reply || "");
      const currN = normalizeText(output.ai_reply);
      const stLoop = output.conversation_stage || "";
      // BİREBİR tekrar: bot art arda tıpatıp aynı cevabı veriyor → müşteri takılmış.
      // (Fuzzy eşleşme yanlış-pozitif veriyordu; exact-match hem kesin hem güvenli.)
      const isRepeat = prevN && currN && prevN === currN;
      const activeLoop = ["waiting_photo", "waiting_letters", "waiting_payment", "waiting_address"].includes(stLoop);
      if (isRepeat && activeLoop) {
        if (/fotograf/.test(currN)) {
          output.ai_reply = `Fotoğrafınızı göndermekte bir sorun mu yaşıyorsunuz efendim? 😊 Dilerseniz siparişinizi web sitemizden de çok kolay oluşturabilirsiniz:\n${SITE_URL}\n\nİsterseniz sizi ekibimize de aktarabilirim.`;
        } else if (/odeme/.test(currN)) {
          output.ai_reply = `Ödeme konusunda yardımcı olmamı ister misiniz efendim? 😊 Web sitemizden kartla ya da kapıda ödeme ile çok kolay ilerleyebilirsiniz:\n${SITE_URL}\n\nDilerseniz sizi ekibimize de aktarabilirim.`;
        } else {
          output.ai_reply = `Size daha iyi yardımcı olabilmek isterim efendim 😊 Dilerseniz siparişinizi web sitemizden kolayca oluşturabilir ya da sizi ekibimize aktarabilirim:\n${SITE_URL}`;
        }
        output._debug.loop_break = true;
      }
    }
    output._trace = {
      policy_version: ctx.policyVersion,
      decision: ctx.policyDecision?.decision || "current_policy",
      behavior_category: output.behavior_category,
      missing_slots: ctx.policyMissingSlots || missingSlots,
      state_entry_reason: ctx.fields.order_status === "completed" || ctx.fields.siparis_alindi === "1"
        ? "order_completed"
        : (ctx.fields.conversation_stage ? `input_stage_${ctx.fields.conversation_stage}` : "no_input_stage"),
      tried_rules: ctx.policyDecision?.trace || [`intent=${ctx.intent}`, `source=${meta.replySource}`],
      selected_policy_decision: ctx.policyDecision?.decision || "current_policy",
      selected_reply_source: meta.replySource,
      slot_prompt_reason: ctx.policyDecision?.slot_prompt_reason || "",
      handoff_reason: ctx.policyDecision?.handoff_reason || output.support_mode_reason || "",
    };
    return output;
  } catch (error) {
    console.error("[V8_ERROR]", error?.message || error);
    return { success: true, ai_reply: TEXT.FALLBACK, ilgilenilen_urun: "", user_product: "", last_intent: "error", conversation_stage: "", photo_received: "", payment_method: "", menu_gosterildi: "", order_status: "", back_text_status: "", address_status: "", support_mode: "1", support_mode_reason: SUPPORT_REASON.FALLBACK, reply_class: REPLY_CLASS.FALLBACK, siparis_alindi: "", cancel_reason: "", context_lock: "", letters_received: "", phone_received: "", name_received: "", _meta: {} };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).json({ success: false, message: "Only POST." });
  const result = await processChat(req.body || {});
  try { const { logConversationRow } = await import("../lib/sheetsLogger.js"); logConversationRow({ body: req.body, result }).catch(() => {}); } catch {}
  return res.status(200).json(result);
}
