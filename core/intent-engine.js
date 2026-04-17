// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTENT ENGINE v8.3 — Kapsamlı intent algılama
// Sıra: system → slot_commit → sensitivity → complaint → claim →
//       info (specific→generic) → product_flow → ack/smalltalk → back_text → general
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { KW, INTENT, STAGE, PRODUCT, SLOT_CLAIM_SIGNALS, FUTURE_INTENT_SIGNALS, CLAIM_TARGET_PHOTO, CLAIM_TARGET_ADDRESS, CLAIM_TARGET_PHONE, CLAIM_TARGET_ALL, PARTIAL_ADDRESS_SIGNALS, PHONE_REGEX, COMPLETED_NEUTRAL_ACK, COMPLETED_GRATITUDE, COMPLETED_PHOTO_SHARE_REQ, COMPLETED_CHANGE_REQ } from "./constants.js";
import { hasAny, looksLikePhotoUrl, extractPhone, looksLikeAddress, looksLikeName, extractLetters, parsePaymentFromMessage } from "./normalize.js";

export function detectIntent(ctx) {
  const { message, norm, product, stage, extracted } = ctx;
  const raw = String(message || "").trim();

  // ═══ 0. EMPTY / SYSTEM ═══
  if (!raw || raw.length <= 1) return "general";
  const backTextDone = ctx.fields?.back_text_status === "received" || ctx.fields?.back_text_status === "skipped";
  if (/^(liked a message|reacted)/.test(norm)) return "smalltalk";
  if (hasAny(norm, ["the message could not be displayed","api restrictions","dosya eki gonderdi","bir dosya eki gönderdi","started an audio call","missed an audio call","started a video chat","reacted to your message"])) return "system_message";


  // ═══════════════════════════════════════════════════════════════════════
  // SIRA 7 — COMPLETED EDGE-CASE POLICY
  // Completed stage'de özel intent hiyerarşisi — normal stage'den önce çalışır
  // ═══════════════════════════════════════════════════════════════════════
  if (stage === STAGE.ORDER_COMPLETED || stage === "order_completed") {
    // C1: completed_change_request — değişiklik/iptal
    if (hasAny(norm, COMPLETED_CHANGE_REQ)) return "completed_change_request";
    // C2: arka yazı ek içerik — "arkasına doğum tarihi de olsun"
    if (hasAny(norm, ["arkasina","arkasına","arka yuzune","arka yüzüne","arka tarafa","arkaya"]) &&
        hasAny(norm, ["yazalim","yazalım","yazsin","yazsın","ekleyelim","ekle","olsun","de olsun","da olsun","eklensin","yazilsin","yazılsın"])) return "completed_back_text_content";
    // C3: foto paylaşım isteği
    if (hasAny(norm, COMPLETED_PHOTO_SHARE_REQ)) return "completed_photo_share_request";
    // C4: teşekkür / memnuniyet
    if (hasAny(norm, COMPLETED_GRATITUDE)) return "completed_gratitude";
    // C5: kısa nötr ack — sadece exact match, uzunluk tabanlı değil
    if (hasAny(norm, COMPLETED_NEUTRAL_ACK)) return "completed_neutral_ack";
  }

  // ═══ 1. SLOT COMMITS (highest priority) ═══
  if (looksLikePhotoUrl(message)) {
    // URL + "bu model" / referans → photo_reference, gerçek fotoğraf commit değil
    if (hasAny(norm, ["bu model olsun","bu modelden olsun","bundan olsun","bundan olacak"])) return "photo_reference";
    if (stage === STAGE.WAITING_PAYMENT) return "back_photo_upload";
    return "photo";
  }

  // ━━━ H4 F7 HARDENING: bundle detection before phone/address (Özge/Tülay bug) ━━━
  // Önce tam bundle kontrolü; phone intent'ten önce yakalasın
  if ([STAGE.WAITING_ADDRESS, STAGE.WAITING_PAYMENT, STAGE.ORDER_COMPLETED, "order_completed"].includes(stage)) {
    const _hasPhoneEarly = extracted.phone || /\b0?5\d{2}[\s.\-]?\d{3}[\s.\-]?\d{2}[\s.\-]?\d{2}\b/.test(raw);
    const _hasAddressEarly = extracted.hasAddress || hasAny(norm, ["mahalle","mah ","cadde","cad ","sokak","sok ","bulvar","apt","daire","kat "]);
    const _hasNameEarly = extracted.hasName || (/[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}\s+[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}/.test(raw) && raw.trim().length < 120);
    // Sohbet bağlamı varsa bundle DEĞİL (false positive engelle)
    const _isChatty = hasAny(norm, ["cunku","çünkü","icin","için","daha once","daha önce","esnaf","hediye ettim","musterilerim","müşterilerim","yonlendirmem","yönlendirmem","yaptirmistim","yaptırmıştım","soruyorlar","gormek icin","görmek için"]);
    const _score = (_hasPhoneEarly ? 1 : 0) + (_hasAddressEarly ? 1 : 0) + (_hasNameEarly ? 1 : 0);
    // Bundle: skor >=2 VE sohbet bağlamı YOK VE en az biri phone veya address
    if (_score >= 2 && !_isChatty && (_hasPhoneEarly || _hasAddressEarly)) return "full_contact_bundle";
  }

  if (extracted.phone && stage === STAGE.WAITING_ADDRESS) return "phone";
  if (stage === STAGE.WAITING_ADDRESS && extracted.hasAddress) return "address";
  if (stage === STAGE.WAITING_ADDRESS && extracted.hasName && raw.length < 40) return "name_only";
  if (stage === STAGE.WAITING_LETTERS && extracted.letters) {
    // Smalltalk/complaint/sensitivity/info soruları w_letters'da letters olarak algılanmasın
    if (hasAny(norm, KW.smalltalk) || hasAny(norm, ["tesekkur","teşekkür","sagol","sağol","rica"])) return "smalltalk";
    if (hasAny(norm, ["iptal","vazgec","vazgeç"])) return "cancel_order";
    // Info soruları — keyword check
    if (hasAny(norm, KW.trust) || hasAny(norm, ["guvenilir","güvenilir","guven","güven","dolandirici","dolandırıcı","nasil guven","nasıl güven"])) return "trust";
    if (hasAny(norm, KW.location) || hasAny(norm, ["neredesiniz","nerede"])) return "location";
    if (hasAny(norm, KW.shipping) || hasAny(norm, KW.shipping_price) || hasAny(norm, ["kargo","seffaf","şeffaf"])) return "shipping";
    if (hasAny(norm, KW.chain) || hasAny(norm, ["italyan","halat","burgulu"])) return "chain_question";
    if (hasAny(norm, KW.material_question)) return "material_question";
    return "letters";
  }

  // Payment commit
  const paymentVerb = /seceyim|seçeyim|olsun|istiyorum|sectim|seçtim|seciyorum|seçiyorum|yapacagim|yapacağım|yapicam|yapıcam|yapayim|yapayım|yapalim|yapalım/.test(norm);
  // Payment confirmation (dekont, ödeme yaptım) — payment commit'ten ÖNCE
  if (hasAny(norm, ["dekont attim","dekont attım","dekont gonderdim","dekont gönderdim","eft attim","eft attım","eft gonderdim","eft gönderdim","havale gonderdim","havale gönderdim","havale attim","havale attım","odeme yaptim","ödeme yaptım","odemeyi yaptim","ödemeyi yaptım","odeme gonderdim","ödeme gönderdim","hesaba attim","hesaba attım","ekran goruntusu","ekran görüntüsü","dekont atayim","dekont atayım","ucreti attim","ücreti attım"])) return "payment_confirmation";
  // Payment commit: verb varsa her yerde, w_payment'ta verb olmadan da kabul et
  if (extracted.payment && (paymentVerb || stage === STAGE.WAITING_PAYMENT)) return "payment";

  // ═══ 2. SENSITIVITY ═══
  if (hasAny(norm, ["vefat","kaybettik","kaybettim","rahmetli","merhum","babami kaybettim","babamı kaybettim","annemi kaybettim","esimi kaybettim","eşimi kaybettim","vefat etti","annem vefat","babam vefat","hayatini kaybetti","hayatını kaybetti","olum yildonumu","ölüm yıldönümü"])) return "sensitivity";

  // ═══ 3. FRUSTRATION HARD STOP ═══
  if (hasAny(norm, ["otomatik mesaj istemiyorum","robot musunuz","aptal misiniz","salak misiniz","dalga geciyor","dalga geçiyor","dava ediyorum","dava ederim","rezalet","rezilsiniz","insan baglayın","insan bağlayın","gercek insan","gerçek insan","canli destek","canlı destek","yetkili baglayın","yetkili bağlayın","ne bilgisi aldin","ne bilgisi aldın","dalga mi geciyorsunuz","dalga mı geçiyorsunuz"])) return "frustration";

  // ═══════════════════════════════════════════════════════════════════════
  // 3.5. BACK_TEXT SUPREMACY — 3 subtype, tüm kritik stage'lerde override
  // Sırası: back_text_fit_question → back_text_question → back_text_content
  // Bu blok; payment / general / fallback / short-ack cevaplarını ezer.
  // ═══════════════════════════════════════════════════════════════════════

  const BACK_TEXT_STAGES = [STAGE.WAITING_PAYMENT, STAGE.WAITING_ADDRESS, STAGE.ORDER_COMPLETED, "order_completed", STAGE.WAITING_PHOTO];

  // ── A) back_text_fit_question: sığma / uzunluk soruları ──
  // waiting_photo'da "uzun olmaz mi" → zincir sorusu olabilir; arka yazı için değil
  if (hasAny(norm, KW.back_text_fit_question)) {
    // Composition guard: "5 kişi sıgarmi", "2 çocuk sığar" → back_text değil composition
    const isPersonFit = hasAny(norm, ["kisi","kişi","cocuk","çocuk","aile","oglum","oğlum","kizim","kızım","birden fazla","hepsi","ikisi","ucu","üçü"]);
    if (isPersonFit) {
      // composition_question'a bırak
    }
    // "uzun olmaz mi" waiting_photo'da + zincir bağlamı varsa → back_text_fit değil
    else if (stage === STAGE.WAITING_PHOTO && hasAny(norm, ["uzun olmaz","daha uzun","uzun mu","uzun degil","uzun değil"]) && !hasAny(norm, ["yazi","yazı","dua","isim","harf","arka"])) {
      // chain_question'a bırak, burada return etme
    } else {
      return "back_text_fit_question";
    }
  }
  if (/sığar|sigar|s[iı]gar/.test(norm) && !hasAny(norm, ["zincir","fotograf","fotoğraf","resim","kolyemi","kisi","kişi","cocuk","çocuk","aile"])) return "back_text_fit_question";

  // ── B) back_text_question: arka yüze yazı/dua/tarih/isim yapılabilir mi soruları ──
  if (hasAny(norm, KW.back_text_question_explicit)) return "back_text_question";
  if (hasAny(norm, ["arkasina","arka kismina","arka kısmına","arka yuze","arka yüze","arka tarafa","arkaya"]) &&
      hasAny(norm, ["yazilir mi","yazılır mı","yazabilir misiniz","yazabilir mısınız","basabilir misiniz","basabilir mısınız","olur mu","oluyor mu","yapiliyor mu","yapılıyor mu","eklenebilir mi","yazabiliyor musunuz","yazdir","yazdır","yazalim","yazalım"])) return "back_text_question";
  if (hasAny(norm, ["dua","ayet","sure","ayetel","kursi","fatiha","nazar duasi","ihlas"]) &&
      hasAny(norm, ["basabilir","yazilir","yazılır","yazabilir","olur mu","eklenebilir","yapilir","yapılır"])) return "back_text_question";
  if (hasAny(norm, ["yazabilir misiniz","yazabilir mısınız","basabilir misiniz","basabilir mısınız"]) &&
      BACK_TEXT_STAGES.includes(stage)) return "back_text_question";

  // ── C) back_text_content: müşteri direkt içerik veriyor ──
  // SADECE back_text için anlamlı stage'lerde çalış — waiting_product ve boş stage'de çalışma
  const BACK_TEXT_CONTENT_STAGES = [STAGE.WAITING_PAYMENT, STAGE.WAITING_ADDRESS, STAGE.ORDER_COMPLETED, "order_completed"];
  const isBackTextStage = BACK_TEXT_CONTENT_STAGES.includes(stage);

  // C1: "canım" + akrabalık/isim → sadece back_text stage'lerinde
  const CANIM_BLACKLIST = ["cok guzel","çok güzel","tesekkur","teşekkür","sagol","sağol","rica","birazdan","ileride","yazarim","yazarım","donerim","dönerim","bakayim","bakayım"];
  if (hasAny(norm, ["canim"]) && !hasAny(norm, CANIM_BLACKLIST) && isBackTextStage) {
    if (hasAny(norm, ["oglum","oğlum","kizim","kızım","annem","babam","esim","eşim","kardesim","kardeşim","torunum","yeğenim","yegenim"]) ||
        /[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}/.test(raw)) return "back_text_content";
    if ([STAGE.WAITING_PAYMENT, STAGE.WAITING_ADDRESS, STAGE.ORDER_COMPLETED, "order_completed"].includes(stage)) return "back_text_content";
  }

  // C2: isim + tarih pattern → back_text_content (sadece back_text stage'lerinde)
  if (isBackTextStage && (/\d{2}[.\-\/]\d{2}[.\-\/]\d{2,4}/.test(raw) || /\b(20\d{2}|19\d{2})\b/.test(raw))) {
    const hasName = /[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}/.test(raw);
    const isAddress = hasAny(norm, ["mahalle","mahallesi","sokak","cadde","caddesi","apt","daire","kat","no "]);
    const isDateOnly = /^[\d\s.\-\/]+$/.test(raw.trim());
    const isShippingCtx = hasAny(norm, ["kargoya","kargoda","teslim","ne zaman gelir","kac gunde","kaç günde","siparis verdim","sipariş verdim"]);
    if (!isAddress && !isShippingCtx && !hasAny(norm, ["adres","telefon","kargo","odeme","ödeme","dekont","whatsapp"])) {
      if (hasName) return "back_text_content";
      if (isDateOnly && [STAGE.ORDER_COMPLETED, "order_completed"].includes(stage)) return "back_text_content";
    }
  }

  // C3: Dua/ayet/sure direkt içerik (soru fiili YOK)
  if (hasAny(norm, ["nazar duasi","ayetel kursi","ayetel kürsî","fatiha","ihlas","kalem suresi","yasin","besmele"]) &&
      !hasAny(norm, ["var mi","var mı","olur mu","yazilir mi","yazılır mı","oluyor mu","eklenebilir","yapiliyor"])) return "back_text_content";

  // C4: Arapça / Kuran ayeti direkt metin
  if (/[\u0600-\u06FF]/.test(raw) && raw.length > 10) return "back_text_content";

  // C5: "yazılsın / yazılcak / yazsın" + payment/address/completed → back_text_content (soru değilse)
  if (hasAny(norm, ["yazilsin","yazılsın","yazilcak","yazılcak","yazilacak","yazılacak","yazsin","yazsın","ekleyin"]) &&
      isBackTextStage &&
      !hasAny(norm, ["ucret","ücret","fiyat","para","ekstra","bedava","ucretsiz","ücretsiz","bir ucret","bir ücret"])) return "back_text_content";

  // C6: dua/ayet + olsun/yazalım bağlamı → back_text_content
  if (hasAny(norm, ["dua","ayet","sure","ayetel","kursi","fatiha","ihlas"]) &&
      (ctx.fields?.back_text_status === "received" || hasAny(norm, ["yazalim","yazalım","olsun"])) &&
      !hasAny(norm, ["istemiyorum","istemem","olmamali","olmamalı"])) return "back_text_content";

  // ━━━ FIX F3: back_text içerik genişletme ━━━
  // C7: "YAZARSANIZ / YAZARMISINIZ / YAZSIN / YAZALIM + isim/tarih/cümle" → back_text_content
  if (isBackTextStage) {
    const hasWriteVerb = hasAny(norm, [
      "yazarsaniz","yazarsanız","yazarmisiniz","yazar misiniz","yazarmısınız","yazar mısınız",
      "yazin","yazın","yazalim","yazalım","yazsin","yazsın","eklensin","olsun",
      "basabilir","basin","basın"
    ]);
    const hasNameOrDate = /[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}/.test(raw) || /\d{2}[.\-\/]\d{2}[.\-\/]\d{2,4}/.test(raw) || /\b20\d{2}\b/.test(raw) || /\b19\d{2}\b/.test(raw);
    const hasQuoteOrEmoji = /["'❤️💫♾️🤍💜❤💫⭐]/.test(raw);
    const isQuestionFormat = hasAny(norm, ["var mi","var mı","olur mu","oluyor mu","yapiliyor mu","yapılıyor mu","mumkun mu","mümkün mü"]);
    if (hasWriteVerb && (hasNameOrDate || hasQuoteOrEmoji) && !isQuestionFormat) return "back_text_content";
  }

  // C8: Multi-line mesajda her satırı ayrı kontrol — bir satır tarih/isim ise content
  if (isBackTextStage && raw.includes("\n")) {
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    const hasDateLine = lines.some(l => /\d{2}[.\-\/]\d{2}[.\-\/]\d{2,4}/.test(l) || /^\d{4}$/.test(l));
    const hasShortNameLine = lines.some(l => /^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(\s+[A-ZÇĞİÖŞÜa-zçğıöşü]+)*$/.test(l) && l.length < 40 && l.split(/\s+/).length <= 4);
    const hasNoQuestion = !/\?/.test(raw) && !hasAny(norm, ["olur mu","var mi","yapiliyor"]);
    if ((hasDateLine || hasShortNameLine) && hasNoQuestion) return "back_text_content";
  }

  // C9: Tek satır kısa isim+akrabalık ("Annem Kevokamın", "Ediz Metem ve Erol'um", "Canım Kızım Meyram")
  if (isBackTextStage && raw.length < 80 && !/\?/.test(raw)) {
    const wordCount = raw.trim().split(/\s+/).length;
    // Word-boundary ile akrabalık (resim içinde esim bulma gibi false match'leri önle)
    // Prefix'li suffix varyantları (kevokamin, annemin, canımın vs) word-boundary'de kaçırmasın:
    const relationRegex = /\b(annem|annemin|annemi|babam|babamin|babami|esim|eşim|esimin|eşimin|oglum|oğlum|oglumun|oğlumun|kizim|kızım|kizimin|kızımın|kardesim|kardeşim|torunum|torunumun|yegenim|yeğenim|canim|canım|canimin|canımın|amcam|dayim|dayım|teyzem|halam|dedem|ninem|anneannem|babaannem|kevokam|kevokamin|hayatim|hayatım|hayatimin|sevgilim|melegim|meleğim|birtanem|prensesim|aslanim|aslanım)\b/i;
    const hasRelation = relationRegex.test(norm);
    const hasCapitalName = /[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}/.test(raw);
    // Ayrıca mesajda "resim", "foto", "kolye" gibi composition keyword'leri varsa bu back_text DEĞİL
    const hasPhotoContext = hasAny(norm, ["resim","resmi","foto","fotograf","fotoğraf","kolye","cizebilir","çizebilir","yapabilir","basabilir","koyabilir"]);
    if (hasRelation && hasCapitalName && wordCount <= 8 && !hasPhotoContext) return "back_text_content";
  }

  // C10: Tek satır tarih + emoji (completed/address/payment) → back_text_content
  if ([STAGE.ORDER_COMPLETED, "order_completed", STAGE.WAITING_ADDRESS, STAGE.WAITING_PAYMENT].includes(stage) &&
      /^\s*\d{2}[.\-\/]\d{2}[.\-\/]\d{2,4}\s*[❤️💫♾🤍💜⭐]*\s*$/.test(raw.trim())) {
    return "back_text_content";
  }

  // C11: "SENI COK SEVIYORUM", "EN COK SEN", "CANIM AILEM" vb. sevgi sözcüğü cümle
  if (isBackTextStage && raw.length < 80 && !/\?/.test(raw)) {
    if (hasAny(norm, [
      "seni cok seviyorum","seni çok seviyorum","en cok sen","en çok sen",
      "hosgeldin","hoşgeldin","iyi ki","nefesim","canim ailem","canım ailem",
      "kabul olmus","kabul olmuş","en guzel duam","en güzel duam",
      "gozlerimin","gözlerimin","kalbimin","güneşim","gunesim","papatyam"
    ])) return "back_text_content";
  }

  // C12: "Arkasına" + ne-ise içerik (completed/waiting_payment/waiting_address) → back_text_content
  // Soru değil, direkt içerik verdiği zaman
  if (isBackTextStage && hasAny(norm, ["arkasina","arkasına","arkaya","arka yuze","arka yüze","arka tarafa"]) &&
      !hasAny(norm, ["olur mu","yazilir mi","yazılır mı","yazabilir mi","basabilir mi","yapiliyor mu","yapılıyor mu","eklenebilir","var mi","var mı"])) {
    // Negation exception: "yazı DEĞİL DE resim" / "yazı yerine resim" → composition
    const isNegatingText = hasAny(norm, ["yazi degil","yazı değil","yazi yerine","yazı yerine","yazi olmasin","yazı olmasın"]) &&
                           hasAny(norm, ["resim","foto","fotograf","fotoğraf"]);
    if (isNegatingText) {
      return "composition_question";
    } else {
      // İçerik barındırıyor mu?
      const hasContent = /[A-ZÇĞİÖŞÜ][a-zçğıöşü]/.test(raw) || /\d{2}/.test(raw) || hasAny(norm, ["yazi","yazı","dua","isim","tarih","not"]);
      if (hasContent) return "back_text_content";
    }
  }

  // ═══ 4. COMPLAINT / CLAIM ═══
  if (hasAny(norm, ["verdim ya","yazdim ya","yazdım ya","soyledim ya","söyledim ya","yazdim zaten","yazdım zaten","verdim zaten","attim zaten","attım zaten","gonderdim zaten","gönderdim zaten","adresimi yazdim","adresimi yazdım","hepsini verdim","bilgi verdim","belirttim","belirtmistim","belirtmiştim","daha once yazdim","daha önce yazdım","niye ayni seyi","niye aynı şeyi","neden tekrar","yine mi","yeter artik","yeter artık","yanlis anladiniz","yanlış anladınız","cevap vermiyorsunuz","cevap alamiyorum","neden cevap","ayni seyi sorma","aynı şeyi sorma","tekrar sorma","cevap yok mu","cevap yok","cevap yokmu"])) return "complaint";

  // ═══ 5. SIRA 6 — SLOT CLAIM / PARTIAL SLOT / FULL BUNDLE ═══

  // 5a. Photo reference ("üstteki olsun")
  if (hasAny(norm, ["ustteki olsun","üstteki olsun","bundan olsun","bundan olacak","bu model olsun","bu modelden olsun"])) return "photo_reference";

  // 5b. Future-intent guard — sadece claim context'te (genel mesajları block etme)
  // "atacağım" tek başına genel → block etme; "adresi atacağım" gibi claim bağlamı → block et
  // Kaldırıldı - çok agresif, normal mesajları da blokluyordu

  // 5c. Full contact bundle: name + phone + address tek mesajda (address/payment stages only)
  const hasPhone = PHONE_REGEX.test(raw);
  const hasAddress = hasAny(norm, ["mahalle","mah ","cadde","cad ","sokak","sok ","bulvar","apt","daire","kat "]) ||
    (hasAny(norm, PARTIAL_ADDRESS_SIGNALS) && norm.length > 40 && hasAny(norm, ["mahalle","sokak","cadde","bulvar","mah ","no:","no "]));
  const hasName = /[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}(\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,})+/.test(raw);
  const BUNDLE_STAGES = [STAGE.WAITING_ADDRESS, STAGE.WAITING_PAYMENT];
  if (BUNDLE_STAGES.includes(stage) && hasPhone && hasAddress) return "full_contact_bundle";

  // 5d. Claim target tespiti
  const CLAIM_ACTIVE_STAGES = [STAGE.WAITING_PHOTO, STAGE.WAITING_PAYMENT, STAGE.WAITING_ADDRESS, STAGE.ORDER_COMPLETED, "order_completed", STAGE.WAITING_LETTERS];
  // waiting_product'ta: claim sinyali varsa general_claim ver (slot collection yok)
  if (hasAny(norm, SLOT_CLAIM_SIGNALS) && !CLAIM_ACTIVE_STAGES.includes(stage)) return "general_claim";
  if (hasAny(norm, SLOT_CLAIM_SIGNALS) && CLAIM_ACTIVE_STAGES.includes(stage)) {
    if (hasAny(norm, CLAIM_TARGET_PHOTO))   return "photo_claim";
    if (hasAny(norm, CLAIM_TARGET_ADDRESS)) return "address_claim";
    if (hasAny(norm, CLAIM_TARGET_PHONE))   return "phone_claim";
    if (hasAny(norm, CLAIM_TARGET_ALL))     return "slot_claim";
    // Genel claim — stage'e göre
    if (stage === STAGE.WAITING_PHOTO)    return "photo_claim";
    if (stage === STAGE.WAITING_ADDRESS)  return "address_claim";
    if (stage === STAGE.WAITING_PAYMENT)  return "slot_claim";
    return "slot_claim";
  }

  // 5e. phone_provide: sadece telefon numarası (waiting_address veya waiting_payment stage'de)
  const PHONE_PROVIDE_STAGES = [STAGE.WAITING_ADDRESS, STAGE.WAITING_PAYMENT, STAGE.WAITING_PHOTO];
  if (hasPhone && !hasAddress && PHONE_PROVIDE_STAGES.includes(stage)) return "phone_provide";

  // 5f. address_provide_full: açık adres var (mahalle+cadde ya da yeterli uzunluk, waiting_address stage'de)
  if (hasAddress && norm.length > 40 && !hasPhone && stage === STAGE.WAITING_ADDRESS) {
    if (hasAny(norm, ["mahalle","mah ","cadde","cad ","sokak","sok "])) return "address_provide_full";
  }

  // 5g. address_provide_partial: şehir/ilçe düzeyinde, tam adres değil (sadece waiting_address)
  if (hasAny(norm, PARTIAL_ADDRESS_SIGNALS) && !hasPhone && norm.length < 40 && stage === STAGE.WAITING_ADDRESS && !hasAny(norm, ["ne kadar","fiyat","kargo","odeme","siparis","kolye","lazer","atac"])) return "address_provide_partial";

  // 5h. identity_provide: isim soyad geldi, başka slot yok
  if (hasName && !hasPhone && !hasAddress && stage === STAGE.WAITING_ADDRESS && norm.length < 30) return "identity_provide";

  // ═══ 6. CANCEL ═══
  if (hasAny(norm, KW.cancel)) return "cancel_order";

  // ═══ 7. INFO INTENTS (specific → generic) ═══
  // Dönüş/bekleme — shipping'den ÖNCE (birkaç gün → "kac gun" false match engeli)
  if (hasAny(norm, ["donus yapacagim","dönüş yapacağım","donus yapicam","dönüş yapıcam","tekrar donecegim","tekrar döneceğim","dusunup","düşünüp","dusuneyim","düşüneyim","dusunuyorum","düşünüyorum","sonra yazacagim","sonra yazacağım"])) return "general";
  
  if (hasAny(norm, KW.shipping_price)) return "shipping_price";
  // Shipping BEFORE trust — only explicit delivery questions
  if (hasAny(norm, ["kargo","teslimat","takip no","kargom nerede","teslim","sms gelir","mesaj gelir","bilgi gelir","haber verir"])) return "shipping";
  if (hasAny(norm, ["ne zaman gelir","kac gunde","kaç günde","ne zaman elimde","elime ulasir","elime ulaşır","ne kadar surede gelir","ne kadar sürede gelir","ne kadar surede ulasir","ne kadar sürede ulaşır","ne kadar surede elime","ne kadar sürede elime"])) return "shipping";
  if (hasAny(norm, KW.chain)) return "chain_question";
  if (hasAny(norm, KW.material_question)) return "material_question";
  if (hasAny(norm, KW.trust)) return "trust";
  if (hasAny(norm, KW.location)) return "location";
  // Şubeden teslim
  if (hasAny(norm, ["subeden alacag","şubeden alacağ","subeden teslim","şubeden teslim","elden alacag","elden alacağ","gelip alacag","gelip alacağ","dukkanin","dükkânın","dukkandan","dükkandan","magazadan","mağazadan","subeden alma","şubeden alma","elden alma","gelip alma","yerinden alma"])) return "store_pickup";
  // ════════════════════════════════════════════════════════════════
  // PREVIEW / KARAR DESTEĞİ AİLESİ — 3 subtype
  // Öncelik: decision_support > preview_request > composition_question
  // Bu aile price / back_photo_info / general tarafından ezilmemeli.
  // Aktif stage'ler: waiting_photo, waiting_payment, waiting_address, order_completed
  // ════════════════════════════════════════════════════════════════

  // Negatif bağlam: payment/shipping/material soruları preview'a çekilmesin
  const PREVIEW_NEG = ["kararma","solma","fiyat","kargo","odeme","ödeme","kapida","kapıda","eft","havale","paketleme","kutu","zincir boyu","zincir uzunlugu"];

  // ── A) decision_support ──
  // Explicit KW array
  if (hasAny(norm, KW.decision_support) && !hasAny(norm, ["odeme","ödeme","kapida","kapıda","eft","havale"])) return "decision_support";
  // "karar veremedim/kararsız" + resim/foto/seçim bağlamı
  if (hasAny(norm, ["karar veremedim","karar veremiyorum","kararsiz","kararsız","arasinda kaldim","arasında kaldım","arasinda karar"]) &&
      hasAny(norm, ["resim","foto","fotoğraf","fotograf","uc","üç","3","secim","seçim","hangisi","tasarim","tasarım"])) return "decision_support";
  // "sizce hangisi / siz seçin" tek başına da yeterli
  if (hasAny(norm, ["sizce hangisi","sizce hangi","siz secebilir","siz seçebilir","siz secin","siz seçin","hangini begendirsiniz","hangini beğendirsiniz"])) return "decision_support";

  // ── B) preview_request ──
  if (hasAny(norm, KW.preview_request) && !hasAny(norm, PREVIEW_NEG)) return "preview_request";
  // "nasıl olur/durur/olacak" + foto/resim/görsel/kolye/model bağlamı
  if (hasAny(norm, ["nasil olur","nasıl olur","nasil olacag","nasıl olacağ","nasil gorunur","nasıl görünür","nasil durur","nasıl durur"]) &&
      hasAny(norm, ["foto","resim","gorsel","görsel","kolye","tasarim","tasarım","modeli","model olarak","model","gormek","görmek"]) &&
      !hasAny(norm, PREVIEW_NEG) &&
      !hasAny(norm, ["birlestir","birleştir","arkali onlu","arkalı önlü","iki foto","iki resim","ayni kare","aynı kare"])) return "preview_request";
  // "nasıl olur/durur" tek başına + waiting_photo bağlamı (composition sinyali yoksa)
  if (hasAny(norm, ["nasil olur","nasıl olur","nasil durur","nasıl durur"]) &&
      stage === STAGE.WAITING_PHOTO &&
      !hasAny(norm, PREVIEW_NEG) &&
      !hasAny(norm, ["birlestir","birleştir","arkali onlu","arkalı önlü","iki foto","iki resim","ayni kare","aynı kare","tek kolyede","birden fazla"])) return "preview_request";
  // "görüp karar / bakıp karar" tek başına
  if (hasAny(norm, ["gorup karar","görüp karar","bakip karar","bakıp karar","gormeden siparis","görmeden sipariş"])) return "preview_request";
  // "ön izleme" her bağlamda
  if (hasAny(norm, ["on izleme","ön izleme","onizleme","önizleme"])) return "preview_request";
  // "beğenip beğenmemek için / fikir için" + görsel bağlam
  if (hasAny(norm, ["begenip begenme","beğenip beğenme","fikir icin","fikir için"]) &&
      hasAny(norm, ["resim","foto","gorsel","görsel","kolye","atsam","atarsam"])) return "preview_request";

    // Composition signals that overlap with photo_question — catch BEFORE photo_question
  // "arkalı önlü nasıl", "birleştirseniz", "tek kolyede iki foto" → composition not photo_question
  if (hasAny(norm, ["arkali onlu nasil","arkalı önlü nasıl","onlu arkali nasil","önlü arkalı nasıl",
      "birlestirseniz","birleştirseniz","birlestirerek","birleştirerek",
      "iki foto tek kolyede","tek kolyede iki foto","iki tarafli nasil","iki taraflı nasıl"])) return "composition_question";
  // "aynı karede" + "nasıl olur" veya çok kişi bağlamı → composition
  if (hasAny(norm, ["ayni karede","aynı karede","ayni kareye","aynı kareye"]) &&
      (hasAny(norm, ["nasil olur","nasıl olur","nasil goz","nasıl gör","olur mu"]) ||
       /\d/.test(norm) || hasAny(norm, ["dort","dört","4","bes","beş","5"]))) return "composition_question";

    if (hasAny(norm, KW.photo_question)) return "photo_question";
  if (hasAny(norm, KW.example_request)) return "example_request";
  if (hasAny(norm, ["iban","hesap no","hesap numarasi","hesap numarası","eft bilgi","havale bilgi"])) {
    if (hasAny(norm, ["indirim","indirimli","uygun","ucuz"])) {} // bargain'a düşsün
    else return "iban_request";
  }
  // Remaining shipping (after trust took garanti/süre questions)
  if (hasAny(norm, KW.shipping)) return "shipping";
  if (hasAny(norm, KW.payment)) {
    if (/\d{3}/.test(norm) && hasAny(norm, ["olmaz","olur mu","yapar mi","yapar mı"])) {} // bargain'a düşsün
    else return "payment_info_question";
  }
  if (hasAny(norm, KW.back_text_info)) return "back_text_info";
  // Ek back_text_info: "arkasına" + soru kalıbı (tarih/isim/yazı atiyor mu vs)
  if (hasAny(norm, ["arkasina","arka kismina","arka kısmına","arka yuze","arka yüze"]) && hasAny(norm, ["atiyor","atıyor","yaziyor","yazıyor","olur mu","oluyor mu","yapiliyor","yapılıyor","yazilir","yazılır","eklenebilir","yazabilir","yazabiliyor","koyabiliyor","yazdir","yazdır","olabilir","yazalim","yazalım","basabilir","koyabilir"])) return "back_text_info";

  // ━━━ FIX F5: composition_question back_photo_info'dan ÖNCE ━━━
  // KW.composition_question genişletilmiş olduğundan artık geniş yakalıyor
  if (hasAny(norm, KW.composition_question)) return "composition_question";

  // Kişi/resim sayısı soruları → photo_question (back_photo_info'dan ÖNCE)
  if (hasAny(norm, ["kac kisi","kaç kişi","kac kisilik","kaç kişilik","iki kisi","iki kişi","2 kisi","2 kişi","birden fazla kisi","birden fazla kişi","ikisini","3 kisi","3 kişi","5 kisi","5 kişi","aile foto","3 kisilik","3 kişilik"])) return "photo_question";
  if (hasAny(norm, ["ikili resim","ikili foto","ayni kare","aynı kare","tek kare","yan yana"])) return "photo_question";
  if (hasAny(norm, ["kac resim koyabil","kaç resim koyabil","kac fotograf koyabil","kaç fotoğraf koyabil","3 lu yapiy","3 lü yapıy","3lu yapiy","3lü yapıy"])) return "photo_question";
  if (hasAny(norm, KW.back_photo_info) && !hasAny(norm, ["siparis","siparış","sipariş","kargo","teslimat","iade"])) return "back_photo_info";
  if (hasAny(norm, KW.back_text_skip) && !norm.includes("zincir")) return "back_text_skip";


  // ════════════════════════════════════════════════════════════════
  // PRODUCT STRUCTURE vs QUANTITY AİLESİ (Sıra 4)
  // ÖNCE yapı intenti — composition'dan önce gelmeli (plaka/uç/tek kolye)
  // ════════════════════════════════════════════════════════════════

  // ── A) single_pendant_request: zincirsiz / sadece uç ──
  if (hasAny(norm, KW.single_pendant_signals)) return "single_pendant_request";
  if (hasAny(norm, ["sadece uc","sadece uç","sadece kolye ucu","zincirsiz"]) && !hasAny(norm, ["zincir dahil","zincir fiyat","zincir boyu","zincir uzunlug"])) return "single_pendant_request";

  // ── B) product_structure_request: tek kolye / çift uç / yapı soruları ──
  if (hasAny(norm, KW.product_structure_signals)) return "product_structure_request";
  if (hasAny(norm, ["tek olacak","kolye tek","tek kolye"]) && hasAny(norm, ["ucu","uç","uc","tane","plaka"])) return "product_structure_request";
  if (hasAny(norm, ["ust uste","üst üste"])) return "product_structure_request";
  // "tek kolyede iki plaka / tek kolyede iki uç" — composition'dan önce yakala
  if (hasAny(norm, ["tek kolyede","tek kolyeye","bir kolyeye","bir kolyede"]) && hasAny(norm, ["plaka","uc","uç","iki uc","iki plaka","iki uç"])) return "product_structure_request";

  // ── C) chain_structure_request: zincir yapısı ──
  if (hasAny(norm, KW.chain_structure_signals)) return "chain_structure_request";

  // ── D) composition_question ──
  if (hasAny(norm, KW.composition_question)) return "composition_question";
  // "birleştirmek" + foto/resim bağlamı
  if (hasAny(norm, ["birlestirmek","birleştirmek","birlestirerek","birleştirerek"]) &&
      hasAny(norm, ["foto","resim","fotograf","fotoğraf"]) &&
      !hasAny(norm, ["siparis","siparış","kargo","alim","alım"])) return "composition_question";
  // "aynı karede / tek kolyede" + kişi/foto (plaka/uç değil — o yukarıda yakalandı)
  if (hasAny(norm, ["ayni karede","aynı karede","tek kolyede","tek kolyeye","ayni kareye","aynı kareye"]) &&
      hasAny(norm, ["iki","2","uc","üç","3","dort","dört","4","cocuk","çocuk","kisi","kişi","foto","resim"]) &&
      !hasAny(norm, ["plaka","uç iki","iki uç","ust uste","üst üste"])) return "composition_question";

  // new_order: yeni sipariş isteği — quantity_order'dan ÖNCE kontrol et
  if (hasAny(norm, KW.new_order)) return "new_order";

  // ━━━ FIX F5: multi_order composition guard ━━━
  // "3 çocuk", "iki oğlumun", "3 cocugumun fotograf" → multi_order DEĞİL composition
  // "3 çocuğumun fotoğrafı" → 3 kolye değil, tek kolyede 3 kişi
  const hasPersonContext = hasAny(norm, [
    "cocuk","çocuk","cocugumun","çocuğumun","cocuklarim","çocuklarım",
    "oglum","oğlum","oglumun","oğlumun","kizim","kızım","kizimin","kızımın",
    "kisi","kişi","yuz","yüz","taraf","cocuklarimin","çocuklarımın",
    "resim","resmi","resmini","foto","fotograf","fotoğraf","fotograflari","fotoğrafları",
    "aile","ailem","ailemi","kardes","kardeş"
  ]);
  const hasKolyeQuantityKW = hasAny(norm, [
    "kolye","adet","tane kolye","urun","ürün",
    "toplu","coklu","çoklu","siparis","sipariş"
  ]);
  const hasCompositionNumber = hasAny(norm, [
    "iki","2","uc","üç","3","dort","dört","4","bes","beş","5","iki tane","3 tane","4 tane"
  ]);
  if (hasPersonContext && hasCompositionNumber && !hasKolyeQuantityKW) {
    return "composition_question";
  }

  // ── D) quantity_order / multi_order: gerçek adet siparişi ──
  // Önce negatif kontrol: structure sinyali varsa multi_order'a gitme
  const hasStructureSignal = hasAny(norm, ["kolye tek","tek olacak","ucu iki","iki tane uc","iki tane uç","ust uste","üst üste","bir kolyeye","ayni kolyeye","aynı kolyeye","tek kolyede","tek kolyeye","tek kolye ama","tek kolye ucu"]);
  if (!hasStructureSignal) {
    if (hasAny(norm, KW.quantity_signals)) return "quantity_order";
    // "kolye ucu" / "tek kolye ucu" → product_structure değil multi_order — structure'a bırak
    // Ama "kolye ucunda 2 tane resim" gibi adet soruları → multi_order kalmalı
    if (hasAny(norm, ["2 tane","iki tane","3 tane","uc tane","üç tane","4 tane","dort tane","dört tane","5 tane","bes tane","beş tane","2li","2'li","3lu","3'lü","uclu","üçlü","toplu alim","toplu alım","iki kolye","2 kolye","3 kolye","4 kolye","5 kolye","ikisinin fiyati","ikisinin fiyatı","toplu siparis","toplu sipariş","coklu alim","çoklu alım","2 urun","2 ürün","3 urun","3 ürün","3 adet","4 adet","5 adet","20 adet"]) &&
        !hasAny(norm, ["tek kolye ucu","sadece kolye ucu","sadece ucu","zincirsiz ucu"]) &&
        !hasPersonContext) return "multi_order";
    if (/\d\s*(li|lü|lu|lı)\s*(alim|alım|siparis|sipariş)/i.test(norm)) return "multi_order";
    if (hasAny(norm, ["toplu","coklu","çoklu"]) && hasAny(norm, ["indirim","fiyat"])) return "multi_order";
  }

  // Price confirmation (fiyat teyidi — pazarlık DEĞİL)
  if (/\d{3}\s*(tl|lira)?\s*(miydi|mıydı|demi|degil mi|değil mi|gonderecegim|göndereceğim|gonderiyorum|gönderiyorum|atacagim|atacağım|yatircam|yatırcam|yatıracağım)/i.test(norm)) return "price";

  // Bargain
  if (hasAny(norm, ["indirim","indirin","son fiyat","yardimci olun","yardımcı olun","anlasalim","anlaşalım","pazarlik","pazarlık","kaca yaparsiniz","kaça yaparsınız","birakir misiniz","bırakır mısınız","indirimli","uygun fiyat","son fiyati","son fiyatı","duz hesap","düz hesap","indirim var mi","indirim var mı","indirim yapar","indirim olur","biraz daha uygun","biraz indirim","ucuza","daha ucuz","cok pahali","çok pahalı"])) return "bargain";
  if (/\d+\s*(tl|lira)?\s*(olur|yapar|yap\b|yapalim|yapalım|birak|bırak|anlas|anlaş|yapin|yapın|gonder|gönder|olmaz|atsam|indirin|indır)/i.test(norm)) return "bargain";
  if (/\d{3}\s*(e |a |ye |ya )(birak|bırak|gonder|gönder|yapar|yapın|yapin)/i.test(norm)) return "bargain";
  if (/\d{3}\s*(tl)?\s*(olmaz|olur)\s*(mi|mı|mu|mü)/i.test(norm)) return "bargain";

  if (hasAny(norm, KW.price)) return "price";

  // ═══ 8. BACK TEXT (waiting_payment, explicit signal) ═══
  if (stage === STAGE.WAITING_PAYMENT && !backTextDone) {
    if (hasAny(norm, KW.back_text_direct)) return "back_text";
    if (hasAny(norm, ["arkasina","arkasına","arka yuze","arka yüze","arkaya yazi","arkaya yazı"])) return "back_text";
  }

  // ═══ 9. PHOTO REFERENCE / CHANGE (order_start'tan ÖNCE — "foto" keyword çakışması) ═══
  if (hasAny(norm, ["bundan olacak","bundan olsun","son attigim","son attığım","ustteki","üstteki","ustteki olsun","üstteki olsun","bu olsun","bu foto olsun","bu resim olsun","bu model olsun","bu modelden olsun","bu fotograf olacak","bu fotoğraf olacak","bu foto olacak","bu resim olacak"])) return "photo_reference";
  if (hasAny(norm, ["baska resim","başka resim","farkli foto","farklı foto","fotografi degistir","fotoğrafı değiştir","resim degistir","resim değiştir","baska foto","başka foto","degistireyim","değiştireyim","baska resim bakayim","başka resim bakayım","farkli foto atayim","farklı foto atayım","bu fotograf degil","bu fotoğraf değil","bu foto degil","bu foto değil","yanlis foto","yanlış foto","yanlis resim","yanlış resim","o fotograf degil","o fotoğraf değil"])) return "photo_change_request";

  // ═══ 10. PRODUCT FLOW ═══
  // "atacaktınız" hatırlatma → order_start değil
  if (hasAny(norm, ["atacaktiniz","atacaktınız","atacaksiniz","atacaksınız","atacaginizi","atacağınızı","atacaktiniz ama","gorsel atacak","görsel atacak","resim atacak","foto atacak"])) return "general";
  // future-tense resim/foto gönderim → general (order_start değil)
  if (hasAny(norm, ["resim atacagim","resim atacağım","foto atacagim","foto atacağım","resim atcam","foto atcam","resim yollarim","foto yollarim","resim gondericegim","foto gondericegim"]) &&
      !hasAny(norm, ["hadi","haydi","simdi","şimdi","hazir","hazır"])) return "general";
  if (raw.length <= 30 && (hasAny(norm, KW.product_lazer) || hasAny(norm, KW.product_atac))) return "order_start";
  if (hasAny(norm, KW.order_start)) {
    if (hasAny(norm, ["ama suan degil","ama henuz degil","ama simdi degil","dusunuyorum","düşünüyorum","daha sonra","henuz","henüz","vermeyeceg","istemiyorum","vazgec","vazgeç"])) return "general";
    return "order_start";
  }
  if (hasAny(norm, KW.post_sale)) return "post_sale";
  if (hasAny(norm, KW.detail_request)) return "detail_request";

  // ═══ 10. ACK / SMALLTALK ═══
  const ACK_WORDS = ["tamam","tamamdir","tmm","olur","peki","evet","ok","anladim","anladım","he","hee","tm"];
  if (raw.length <= 15 && ACK_WORDS.includes(norm)) return "ack";
  if (hasAny(norm, KW.smalltalk)) return "smalltalk";

  // ═══ 11. WAITING_PAYMENT short messages → back_text (very strict) ═══
  if (stage === STAGE.WAITING_PAYMENT && raw.length <= 40 && !backTextDone) {
    const isQuestion = /[?]/.test(raw) || /\b(mi|mı|mu|mü|misiniz|mısınız)\b/i.test(raw);
    const isPhone = /0\d{3}\s?\d{3}\s?\d{2}\s?\d{2}/.test(raw) || /05\d{2}/.test(raw);
    const isUndecided = hasAny(norm, ["bilemedim","karar veremedim","kararsiz","kararsız","ne yazsak","emin degilim","emin değilim"]);
    const isBlocked = hasAny(norm, [
      "bekliyorum","neden","niye","hala","hâlâ","tekrar","yine","sorun","sikayet","şikayet","memnun",
      "yanlis","yanlış","yeter","yazdim","yazdım","verdim","attim","attım","gonderdim","gönderdim",
      "zincir","kolye","renk","gumus","gümüş","gold","altin","altın","fiyat","kargo",
      "materyal","celik","çelik","garanti","iade","iptal","taksit","eft","havale","kapida","kapıda",
      "adres","telefon","numara","whatsapp",
      "tamam","olur","peki","evet","hayir","hayır","yok","istemiyorum","gerek yok",
      "gormek","görmek","gormeden","görmeden","gorsel","görsel","paylasir","paylaşır",
      "kalite","net","fotograf","fotoğraf","resim","kopma","silinme","dayanikli",
    ]);
    if (!isQuestion && !isBlocked && !isPhone && !isUndecided && !hasAny(norm, ACK_WORDS)) return "back_text";
  }

  // ═══ DEFAULT ═══
  return "general";
}

export function extractEntities(message, norm, product, stage) {
  return {
    phone: extractPhone(message),
    hasAddress: looksLikeAddress(norm, message, stage),
    hasName: looksLikeName(message, norm, stage),
    payment: parsePaymentFromMessage(norm, ""),
    photoLink: looksLikePhotoUrl(message),
    letters: extractLetters(message, norm, product, stage),
  };
}

// ══════════════════════════════════════════════════════════════════
// SECONDARY INTENT DETECTION (Sıra 5 — Multi-Question desteği)
// Desteklenen kombinasyonlar (primary → secondary):
//   shipping_carrier+eta, material+trust, chain+composition,
//   back_text_question+fit, price+chain, price+shipping,
//   preview+decision, payment+shipping, single_pendant+price
// ══════════════════════════════════════════════════════════════════

// Birden fazla soru belirteci — geniş tanımlama
const MULTI_Q_MARKERS = ["bide","bir de","bide ","bir de ","de bir","ayrıca","ayrica","hem de","peki bide","peki bir de","bunun yaninda","bunun yanında","ya da ","yada "];

function hasMultiQuestionSignal(norm) {
  if (MULTI_Q_MARKERS.some(m => norm.includes(m))) return true;
  // Virgülle ayrılmış iki farklı soru
  if (norm.includes(",") && norm.split(",").length >= 2) return true;
  // "ne kadar" birden fazla kez
  if (norm.split("ne kadar").length > 2) return true;
  // "olur mu" birden fazla kez
  if (norm.split("olur mu").length > 2) return true;
  // "mi" + farklı konu sinyali (material+trust, shipping+eta gibi klasik çiftler)
  // Soru + soru — "X mi Y olur mu" pattern
  if (/\w+\s+mi\b.+\w+\s+olur\s+mu\b/i.test(norm)) return true;
  // Kargo/teslim sorusu → ikisi de shipping ailesi içinde birleştir
  if (norm.includes("kargo") && (norm.includes("kac gun") || norm.includes("kac is gunu") || norm.includes("ne zaman"))) return true;
  // Zincir dahil mi → chain + price birleşimi
  if (norm.includes("zincir") && norm.includes("dahil")) return true;
  // Malzeme + güven → "çelik mi kararma"
  if ((norm.includes("celik") || norm.includes("gumus") || norm.includes("malzeme")) && (norm.includes("kararma") || norm.includes("solma") || norm.includes("paslanma"))) return true;
  // Arka yazı + sığar
  if ((norm.includes("arkasina") || norm.includes("arka yuze") || norm.includes("arkaya")) && (norm.includes("sigar") || norm.includes("sığar"))) return true;
  // Uzunluk + renk/model
  if ((norm.includes("uzunluk") || norm.includes("kac cm") || norm.includes("zincir")) && (norm.includes("renk") || norm.includes("cesit") || norm.includes("secenegi"))) return true;
  return false;
}

// Hangi intent ailesine giriyor
function intentFamily(intent) {
  if (["shipping","shipping_price"].includes(intent)) return "shipping";
  if (["material_question"].includes(intent)) return "material";
  if (["trust"].includes(intent)) return "trust";
  if (["chain_question","chain_structure_request"].includes(intent)) return "chain";
  if (["price"].includes(intent)) return "price";
  if (["back_text_question","back_text_info"].includes(intent)) return "back_text_q";
  if (["back_text_fit_question"].includes(intent)) return "back_text_fit";
  if (["composition_question","photo_question","back_photo_info"].includes(intent)) return "composition";
  if (["preview_request"].includes(intent)) return "preview";
  if (["decision_support"].includes(intent)) return "decision";
  if (["payment_info_question","payment"].includes(intent)) return "payment";
  if (["single_pendant_request","product_structure_request"].includes(intent)) return "structure";
  return "other";
}

// Kombine edilebilir çiftler tablosu (primary_family → secondary_family → secondary_intent_hint)
const COMBINE_TABLE = {
  "shipping":    { "shipping": "shipping_eta", "payment": "payment_info_question" },
  "material":    { "trust": "trust" },
  "chain":       { "composition": "composition_question", "price": "price", "structure": "product_structure_request" },
  "price":       { "chain": "chain_question", "shipping": "shipping", "structure": "single_pendant_request" },
  "back_text_q": { "back_text_fit": "back_text_fit_question" },
  "preview":     { "decision": "decision_support", "composition": "composition_question" },
  "trust":       { "material": "material_question", "shipping": "shipping" },
  "payment":     { "shipping": "shipping" },
};

export function detectSecondaryIntent(norm, primaryIntent, ctx) {
  // Çok soru belirteci yoksa secondary çıkarma
  if (!hasMultiQuestionSignal(norm)) return null;

  const pFamily = intentFamily(primaryIntent);
  const candidates = COMBINE_TABLE[pFamily];
  if (!candidates) return null;

  // Her candidate için norm'da sinyal ara
  for (const [secFamily, secHint] of Object.entries(candidates)) {
    let found = false;
    if (secFamily === "shipping" && hasAny(norm, ["kac gun","kaç gün","kac is gunu","kaç iş günü","ne zaman gelir","kac gunde","kaç günde","teslim","ptt","kargo"])) found = true;
    if (secFamily === "trust" && hasAny(norm, ["kararma","solma","paslanma","dayanikli","dayanıklı","silinme","garanti"])) found = true;
    if (secFamily === "material" && hasAny(norm, ["celik","çelik","gumus","gümüş","altin","altın","malzeme","kaplama"])) found = true;
    if (secFamily === "chain" && hasAny(norm, ["zincir","zinciri","zincir boyu","60 cm","zincir uzunlug"])) found = true;
    if (secFamily === "composition" && hasAny(norm, ["iki kisi","iki kişi","iki cocuk","iki çocuk","ayni kare","aynı kare","birden fazla","iki foto","iki resim","kac kisi","kaç kişi"])) found = true;
    if (secFamily === "price" && hasAny(norm, ["fiyat","ne kadar","ucret","ücret","tl","lira"])) found = true;
    if (secFamily === "back_text_fit" && hasAny(norm, ["sigar","sığar","sigdirir","sığdırır","olur mu","uzun olmaz","yazar mi","yazılır mı"])) found = true;
    if (secFamily === "decision" && hasAny(norm, ["karar veremedim","kararsiz","hangisi","sizce"])) found = true;
    if (secFamily === "structure" && hasAny(norm, ["sadece uc","zincirsiz","sadece uç","kolye ucu"])) found = true;
    if (secFamily === "payment" && hasAny(norm, ["kapida","kapıda","eft","havale","odeme","ödeme","kart"])) found = true;

    if (found) return secHint;
  }
  return null;
}
