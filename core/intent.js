// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTENT — 3 katmanlı intent algılama
// Katman 0: boş/kısa mesajlar
// Katman 1: kesin keyword intent'ler (en yüksek öncelik)
// Katman 2: flow-aware intent'ler (stage'e göre)
// Katman 3: entity-based intent'ler (en düşük öncelik)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { KW, INTENT, STAGE, PRODUCT } from "./constants.js";
import { hasAny, looksLikePhotoUrl } from "./normalize.js";

/**
 * @param {Object} ctx — { message, norm, product, stage, extracted }
 * @returns {string} intent name
 */
export function detectIntent(ctx) {
  const { message, norm, product, stage, extracted } = ctx;
  const raw = String(message || "").trim();
  const _candidates = []; // Intent competition log

  function candidate(name, score) { _candidates.push({ intent: name, score }); }

  // ═══ KATMAN 0: Boş / çok kısa ═══
  if (!raw || raw.length <= 1) { ctx._intentCandidates = [{ intent: "general", score: 0 }]; return INTENT.GENERAL; }
  if (/^(liked a message|reacted)/.test(norm)) { ctx._intentCandidates = [{ intent: "smalltalk", score: 1 }]; return INTENT.SMALLTALK; }

  // API RESTRICTIONS / boş içerik guard — bu mesajlar gerçek mesaj değil
  if (hasAny(norm, ["the message could not be displayed","api restrictions","could not be displayed","bu mesaj gosterilemiyor","mesaj görüntülenemiyor","dosya eki gonderdi","bir dosya eki gönderdi","started an audio call","missed an audio call","started a video chat"])) {
    ctx._intentCandidates = [{ intent: "system_message", score: 1 }];
    return INTENT.GENERAL; // Hiçbir slot doldurmadan geç
  }

  // ═══ NEGATIVE SIGNAL LIST ═══
  // Belirli pattern'ler belirli intent'leri baskılar
  const negativeSignals = {
    suppress_order_flow: hasAny(norm, ["kargom nerede","siparisim ne durumda","siparişim ne durumda","gelmedi","ulasmadi"]),
    suppress_product_info: hasAny(norm, ["iade","geri gonder","geri gönder","memnun degil","memnun değil"]),
    suppress_back_text: hasAny(norm, ["foto uygun","fotoğraf uygun","bu foto olur","olur mu bu"]),
    suppress_address: /[?]/.test(raw) && hasAny(norm, ["magaza","mağaza","nerede","konum","sube","şube"]),
  };

  // ═══ KATMAN 0.5: ACK & PAYMENT CONFIRMATION ═══

  // Payment confirmation — "ücreti attım", "ödeme yaptım" gibi mesajlar
  // Bu mesajlar pricing'e düşmemeli, ödeme bildirimi olarak ele alınmalı
  if (hasAny(norm, KW.payment_confirmation)) {
    ctx._intentCandidates = [{ intent: "payment_confirmation", score: 0.95 }];
    return INTENT.PAYMENT_CONFIRMATION;
  }

  // ACK — kısa onay mesajları (evet, tamam, olur, peki, bu olsun, bundan olacak)
  // State-aware: engine tarafında aktif süreç varsa devam eder, yoksa sadece onay cevabı verir
  const ACK_WORDS = ["evet","tamam","tamamdir","tamamdır","tmm","tmmm","olur","peki","ok","he","hee","tm",
    "tamam dir","anladim","anladım","dogru","doğru","aynen","tabi","tabii"];
  const ACK_PHRASES = ["bu olsun","bu olacak"];
  const isShortAck = raw.length <= 15 && ACK_WORDS.includes(norm);
  const isPhraseAck = raw.length <= 20 && ACK_PHRASES.some(p => norm.includes(p)) && !looksLikePhotoUrl(message);
  const isEmojiAck = raw.length <= 4 && /^[^\w\s]+$/.test(raw);

  if (isShortAck || isPhraseAck || isEmojiAck) {
    // ACK mesajları back_text stage'indeyse back_text olarak DEĞİL, ACK olarak işlenmeli
    // Ama eğer waiting_back_text stage'indeyse ve mesaj gerçek bir isim/tarih/yazı gibi görünüyorsa → back_text
    // Kısa onaylar (tamam, evet vb.) kesinlikle back_text değil
    ctx._intentCandidates = [{ intent: "ack", score: 0.9 }];
    return INTENT.ACK;
  }

  // ═══ KATMAN 1: KESİN KEYWORD INTENT'LER ═══

  // İptal — her zaman en yüksek öncelik
  if (hasAny(norm, KW.cancel)) return INTENT.CANCEL;

  // Post-sale
  if (hasAny(norm, KW.post_sale)) {
    const isShort = norm === "gelmedi" || norm === "ulasmadi";
    // "ne zaman hazır" aktif sipariş akışında → shipping sorusu, post-sale değil
    const isGenericTiming = hasAny(norm, ["ne zaman hazir","ne zaman hazır"]) && !hasAny(norm, ["kolyem","siparisim","siparişim","urunum","ürünüm"]);
    if ((isShort || isGenericTiming) && stage && stage !== STAGE.ORDER_COMPLETED) {
      // shipping'e veya general'e bırak
    } else {
      return INTENT.POST_SALE;
    }
  }

  // Yeni sipariş
  if (hasAny(norm, KW.new_order)) return INTENT.NEW_ORDER;

  // ── Back text stage-specific ──
  if (stage === STAGE.WAITING_PAYMENT) {
    if (hasAny(norm, [
      "olur mu bu fotograf","olur mu bu foto","sizce bu fotograf olur mu",
      "bu fotograf olur mu","bu foto olur mu","fotograf uygun mu","foto uygun mu",
      "uygun mudur","bu olur mu","bu olurmu","boyle olur mu","böyle olur mu",
      "bu uygun mu","bu uygunmu","mesela boyle","mesela böyle",
      "bu fotograf uygun","bu fotoğraf uygun",
    ])) return INTENT.PHOTO_SUITABILITY;

    if (hasAny(norm, [
      "gonderdim ya zaten","gönderdim ya zaten",
      "ikinci fotoyu da gonderdim","ikinci fotoyu da gönderdim",
      "arka fotografi da gonderdim","arka fotoyu da gonderdim",
    ])) return INTENT.BACK_PHOTO_SENT;

    if (hasAny(norm, [
      "genelde ne yaziliyor","genelde ne yazılıyor",
      "ne yaziliyor genelde","ne yazılıyor genelde",
      "yazi ne yazalim","yazı ne yazalım",
      "arkaya ne yaziliyor","arkaya ne yazılıyor",
    ])) return INTENT.BACK_TEXT_EXAMPLES;

    if (hasAny(norm, KW.back_text_skip)) return INTENT.BACK_TEXT_SKIP;
    if (hasAny(norm, KW.back_text_info)) return INTENT.BACK_TEXT_INFO;
    if (hasAny(norm, KW.back_photo_info)) return INTENT.BACK_PHOTO_INFO;
  }

  // Arka foto fiyat
  if (hasAny(norm, KW.back_photo_price)) return INTENT.BACK_PHOTO_PRICE;

  // Fotoğraf URL
  if (looksLikePhotoUrl(message)) {
    if (!product) return INTENT.PHOTO;
    if (product === PRODUCT.LAZER) {
      const textWithoutUrl = raw.replace(/https?:\/\/\S+/g, "").trim();
      const hasText = textWithoutUrl.length > 2;
      if (!hasText) {
        if (stage === STAGE.WAITING_PAYMENT) return INTENT.BACK_PHOTO_UPLOAD;
        return INTENT.PHOTO;
      }
      if (hasAny(norm, [
        "bu model","bu kolye","bu urun","bu ürün",
        "bunun aynisi","bunun aynısı","bu sekilde","bu şekilde",
        "bu tarz","bu tip","bu tasarim","bu tasarım",
        "aynisından istiyorum","aynısından istiyorum",
        "model bu olcak","model bu olacak",
      ])) return INTENT.PRODUCT_IMAGE_REF;
      if (stage === STAGE.WAITING_PAYMENT) return INTENT.BACK_PHOTO_UPLOAD;
      return INTENT.PHOTO;
    }
    if (product === PRODUCT.ATAC) return INTENT.PHOTO;
  }

  // Kargo ücreti (shipping'den ÖNCE)
  if (hasAny(norm, KW.shipping_price)) return INTENT.SHIPPING_PRICE;

  // ═══ TRUST FOLLOW-UP (shipping'den ÖNCE) ═══
  // Son intent trust ise ve "süre/garanti/ne kadar" geliyorsa → trust olarak yorumla
  // Yoksa "ne kadar süre" shipping keyword'üne düşer
  const lastIntent = ctx.fields?.last_intent || "";
  if (lastIntent === "trust" && hasAny(norm, ["sure","süre","garanti","kac yil","kaç yıl","1 yil","ne kadar sure","ne kadar süre","mesela","kac sene","kaç sene","yillik","yıllık","omur boyu","ömür boyu"])) {
    candidate("trust_followup", 0.8);
    ctx._intentCandidates = _candidates;
    return INTENT.TRUST;
  }

  // Kargo
  if (hasAny(norm, KW.shipping)) {
    if (hasAny(norm, ["donus yapicam","dönüş yapıcam","donus yapacagim","dönüş yapacağım","tekrar donecegim","tekrar döneceğim","daha sonra donecegim","icinde donecegim","içinde döneceğim","icinde donus","içinde dönüş"])) {
      // Müşteri "ben döneceğim" diyor → kargo değil
    } else {
      return INTENT.SHIPPING;
    }
  }

  // Malzeme (trust'tan önce)
  if (hasAny(norm, KW.material_question)) return INTENT.MATERIAL;

  // Güven
  if (hasAny(norm, KW.trust)) return INTENT.TRUST;

  // Lokasyon
  if (hasAny(norm, KW.location)) return INTENT.LOCATION;

  // Ödeme
  if (hasAny(norm, KW.payment)) {
    if (hasAny(norm, ["nedir","ne demek","ne anlama","nasil oluyor","nasıl oluyor"])) return INTENT.PAYMENT_INFO;
    if (hasAny(norm, ["ne kadar","kac tl","kac lira","fiyat","ucret"])) {
      if (!hasAny(norm, ["yapacagim","yapacağım","olsun","istiyorum","yapicam","yapıcam","seciyorum","seçiyorum"])) return INTENT.PRICE;
    }
    return INTENT.PAYMENT;
  }

  // Zincir
  if (hasAny(norm, KW.chain)) return INTENT.CHAIN;

  // Fiyat
  if (hasAny(norm, KW.price)) {
    if (norm.includes("kargo")) return INTENT.SHIPPING_PRICE;
    return INTENT.PRICE;
  }

  // Fotoğraf gönderdiğini onaylıyor
  if (hasAny(norm, ["gondermis oldugum","göndermiş olduğum","attigim foto uygun","attığım foto uygun","gonderdigim foto uygun","gönderdiğim foto uygun"])) return INTENT.PHOTO_SENT_CONFIRM;

  // Fotoğraf sorusu
  if (hasAny(norm, KW.photo_question)) return INTENT.PHOTO_QUESTION;

  // Arka yazı/foto info (stage dışında)
  if (hasAny(norm, KW.back_text_info)) return INTENT.BACK_TEXT_INFO;
  if (hasAny(norm, KW.back_photo_info)) return INTENT.BACK_PHOTO_INFO;
  if (hasAny(norm, KW.back_text_direct)) return INTENT.BACK_TEXT;

  // Örnek isteği
  if (hasAny(norm, KW.example_request)) return INTENT.EXAMPLE_REQUEST;

  // Detay isteği
  if (hasAny(norm, KW.detail_request)) return INTENT.DETAIL_REQUEST;

  // Sipariş başlatma
  if (hasAny(norm, KW.order_start)) {
    if (hasAny(norm, ["ama suan degil","ama henuz degil","ama simdi degil","ama su an","ama henuz","sonra donus","daha sonra","dusunuyorum","düşünüyorum"])) return INTENT.GENERAL;
    return INTENT.ORDER_START;
  }

  // ═══ KATMAN 2: FLOW-AWARE INTENT'LER ═══

  // waiting_back_text: kısa mesajlar arka yazı olarak yorumlanır
  if (stage === STAGE.WAITING_PAYMENT) {
    // Kısa onay mesajları arka yazı DEĞİL — "tamamdır" demek "arka yazı istiyorum" demek
    const CONFIRM_NOT_BACKTEXT = ["tamam","tamamdir","tmm","tmmm","olur","peki","evet","ok","he","hee","tm"];
    const isJustConfirm = raw.length <= 15 && (CONFIRM_NOT_BACKTEXT.includes(norm) || norm === "tamam dir");

    const blocked = hasAny(norm, [
      ...KW.smalltalk, ...KW.cancel, ...KW.payment, ...KW.shipping,
      ...KW.shipping_price, ...KW.trust, ...KW.location, ...KW.price,
      ...KW.chain, ...KW.photo_question, ...KW.material_question,
    ]);

    const isQuestion = /[?]/.test(raw) ||
      /\b(mi|mı|mu|mü|miyim|mıyım|musun|müsün|misiniz|mısınız|musunuz|müsünüz)\b/i.test(raw) ||
      hasAny(norm, [
        "olur mu","olurmu","oluyor mu","oluyormu",
        "yapilir mi","yapılır mı","yapar mi","yapar mı",
        "nasil","nasıl","acaba","nedir","ne kadar",
        "bu foto","bu fotograf","bu fotoğraf",
        "uygun mu","uygunmu",
        "alabilirim","yapabilir",
        "gondereyim mi","göndereyim mi","atayim mi","atayım mı",
        "yaparsaniz","yaparsanız","sevinirim","memnun olurum",
        "rica etsem","rica ediyorum",
        "ne gibi","ne yazilir","ne yazılır","ne tarz","ornek",
        "ne yaziyorsunuz","ne yazılıyor","ne yazabiliriz","ne yazilabilir",
        "hangi charm","hangi aksesuar","hangi seceneg","hangi seçenek",
        "neler var","var mi","var mı","neler yaziliyor","neler yazılıyor",
        "genelde ne","ne genelde","ne olur genelde",
        "bulamadim","bulamadım","tapilir","yapilir",
        "arkali onlu","arkalı önlü","onlu arkali","önlü arkalı",
        "iki taraf","iki yuz","iki yüz",
        "ne yazdiriyorlar","ne yazdırıyorlar","yazdiriyorlar","yazdırıyorlar",
        "yazdirabilir","yazdırabilir","yazdirilir","yazdırılır",
        "sigar mi","sığar mı","sigarmi","sığarmı",
        "ne yazdiriliyor","ne yazdırılıyor",
        "genelde","genellikle",
      ]);

    const hasIntentVerb = hasAny(norm, ["istiyorum","isterim","olsun","yapalim","yapın","yaparsaniz"]) && raw.length > 15
      && !hasAny(norm, ["yazilsin","yazılsın","yazsin","yazsın","yazarsaniz","yazarsanız","ekleyin","eklesin"]);

    if (raw && !blocked && !isQuestion && !hasIntentVerb && !isJustConfirm && !looksLikePhotoUrl(message) && raw.length <= 80) {
      // ENTITY PRIORITY: telefon, adres, isim → back_text DEĞİL
      if (extracted.phone) return INTENT.PHONE;
      if (extracted.hasAddress) return INTENT.ADDRESS;
      return INTENT.BACK_TEXT;
    }
  }

  // Fotoğraf URL (ürün bağlamı olmadan)
  if (looksLikePhotoUrl(message)) return INTENT.PHOTO;

  // Smalltalk (keyword'lerden SONRA)
  if (hasAny(norm, KW.smalltalk)) {
    const hasQ = /[?]/.test(raw) ||
      /(?:^|\s)(mi|mı|mu|mü|miyim|mıyım|misiniz|mısınız|musunuz|müsünüz)(?:\s|$|[?.,!])/i.test(raw) ||
      hasAny(norm, [
        "ne kadar","kac","kaç","nasil","nasıl","nedir",
        "olur mu","olurmu","var mi","var mı","varmi","varmı",
        "yapilir mi","yapılır mı","oluyor mu","oluyormu",
        "dayanikli","kararma","celik mi","gumus mu","altin mi",
        "kac cm","kaç cm","kac gun","kaç gün","kac tl","kaç tl",
      ]);

    if (!hasQ) {
      const hasOrder = hasAny(norm, [
        ...KW.order_start, ...KW.new_order,
        "siparis","sipariş","almak istiyorum","yaptirmak","yaptırmak",
        "resimli","lazer","atac","ataç","harfli",
      ]);
      if (!hasOrder) return INTENT.SMALLTALK;
    }
  }

  // ═══ KATMAN 3: ENTITY-BASED INTENT'LER ═══

  // Şubeden teslim
  if (hasAny(norm, ["subeden alacagim","şubeden alacağım","subeden alma","şubeden alma","subeden teslim","şubeden teslim","magazadan alacagim","mağazadan alacağım","elden teslim","elden alabilir","elden alacagim","elden alacağım","gelip alabilir","gelip alabilirim","kendim alabilir","kendim teslim"])) { candidate("store_pickup", 0.9); ctx._intentCandidates = _candidates; return INTENT.STORE_PICKUP; }

  // Adres — negative signal: soru cümlesi ile lokasyon soruyorsa adres değil
  if (extracted.hasAddress && ["waiting_address", ""].includes(stage) && !negativeSignals.suppress_address) {
    candidate("address", 0.85);
    ctx._intentCandidates = _candidates;
    return INTENT.ADDRESS;
  }

  // Telefon
  if (extracted.phone && ["waiting_address", ""].includes(stage)) { candidate("phone", 0.85); ctx._intentCandidates = _candidates; return INTENT.PHONE; }

  // İsim
  if (extracted.hasName && stage === "waiting_address") { candidate("name_only", 0.7); ctx._intentCandidates = _candidates; return INTENT.NAME_ONLY; }

  // Harfler
  if (product === PRODUCT.ATAC && extracted.letters) { candidate("letters", 0.8); ctx._intentCandidates = _candidates; return INTENT.LETTERS; }

  candidate("general", 0.1);
  ctx._intentCandidates = _candidates;
  return INTENT.GENERAL;
}
