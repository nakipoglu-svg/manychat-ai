// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SIGNALS — Çoklu sinyal çıkarıcı
// Tek intent yerine mesajdan TÜM sinyalleri aynı anda çıkarır
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { KW, INTENT, STAGE, PRODUCT } from "./constants.js";
import { hasAny, normalizeText } from "./normalize.js";

/**
 * Mesajdan tüm sinyalleri çıkarır — tek intent değil, çoklu analiz
 * @returns {{ slot_updates, questions, corrections, complaints, confirmations, ack, undecided, topic_hint }}
 */
export function extractSignals(ctx) {
  const { message, norm, product, extracted, fields } = ctx;
  const raw = String(message || "").trim();
  const stage = fields?.conversation_stage || "";

  const signals = {
    slot_updates: {},     // { payment_method: "eft_havale", phone: "05xx" }
    questions: [],        // ["shipping_price", "trust", "capability_multi_photo"]
    corrections: [],      // ["change_back_text", "change_photo", "change_payment"]
    complaints: [],       // ["already_sent", "no_response"]
    confirmations: [],    // ["order_status", "order_received"]
    ack: false,           // "tamam", "olur", emoji
    undecided: false,     // "bilemedim", "ne yazsak ki"
    topic_hint: null,     // son konuşma konusu
    system_message: false, // API restrictions vb.
  };

  // ═══ SYSTEM MESSAGE ═══
  if (hasAny(norm, ["the message could not be displayed","api restrictions","dosya eki gonderdi","started an audio call","missed an audio call","started a video chat","reacted to your message"])) {
    signals.system_message = true;
    return signals;
  }

  // ═══ SLOT UPDATES — mesajda bilgi varsa yakala ═══
  if (extracted.payment) signals.slot_updates.payment_method = extracted.payment;
  if (extracted.phone) signals.slot_updates.phone = extracted.phone;
  if (extracted.hasAddress) signals.slot_updates.address = true;
  if (extracted.hasName) signals.slot_updates.name = true;
  if (extracted.photoLink) signals.slot_updates.photo = true;
  if (extracted.letters) signals.slot_updates.letters = extracted.letters;

  // Back text content detection (sadece w_back_text'te ve gerçek içerikse)
  if (stage === STAGE.WAITING_BACK_TEXT && raw.length > 0 && raw.length <= 80) {
    const CONFIRM_WORDS = ["tamam","tamamdir","tmm","tmmm","olur","peki","evet","ok","he","hee","tm"];
    const isJustConfirm = CONFIRM_WORDS.includes(norm) || norm === "tamam dir";
    const isUndecided = hasAny(norm, ["bilemedim","karar veremedim","ne yazsak","ne yazalim","ne yazsak ki","dusuneyim","düşüneyim","emin degilim","emin değilim","bilmiyorum","kararsizim","kararsızım","kararsiz kaldim","kararsız kaldım","bir sey dusunemedim","bir şey düşünemedim","sonra soylesem","sonra söylesem","aklima gelmiyor","aklıma gelmiyor","karar veremedim","henuz dusunmedim","henüz düşünmedim"]);
    const isQuestion = /[?]/.test(raw) || hasAny(norm, [
      "ne yazilir","ne yazılır","ne yaziyorsunuz","ne yazılıyor","ne yazabiliriz","ne yazilabilir",
      "genelde ne","neler var","var mi","var mı","hangi charm","hangi aksesuar","hangi seceneg",
      "olur mu","olurmu","yapilir mi","yapılır mı","nasil","nasıl","acaba","nedir",
      "ne gibi","ne tarz","ornek","örnek","arkali onlu","arkalı önlü",
      "ne yazdiriyorlar","ne yazdırıyorlar","yazdiriyorlar","yazdırıyorlar",
      "yazdirabilir","yazdırabilir","yazdirilir","yazdırılır",
      "sigar mi","sığar mı","sigarmi","sığarmı",
      "ne yazdiriliyor","ne yazdırılıyor",
      "genelde","genellikle",
    ]);
    const isBlocked = hasAny(norm, [
      ...KW.smalltalk, ...KW.cancel, ...KW.payment, ...KW.shipping,
      ...KW.shipping_price, ...KW.trust, ...KW.location, ...KW.price,
      ...KW.chain, ...KW.photo_question, ...KW.material_question,
    ]);

    if (isUndecided) {
      signals.undecided = true;
    } else if (isJustConfirm) {
      signals.ack = true;
    } else if (isQuestion || isBlocked) {
      // soru veya başka intent — back_text DEĞİL
    } else if (extracted.phone) {
      // ENTITY PRIORITY: telefon numarası back_text DEĞİL
      signals.slot_updates.phone = extracted.phone;
    } else if (extracted.hasAddress) {
      // ENTITY PRIORITY: adres back_text DEĞİL
      signals.slot_updates.address = true;
    } else {
      signals.slot_updates.back_text = raw; // gerçek arka yazı içeriği
    }
  }

  // ═══ QUESTIONS ═══
  if (hasAny(norm, KW.shipping_price)) signals.questions.push("shipping_price");
  if (hasAny(norm, KW.shipping) && !hasAny(norm, ["kargom nerede","siparisim","gelmedi","ulasmadi"])) signals.questions.push("shipping");
  if (hasAny(norm, KW.trust)) signals.questions.push("trust");
  if (hasAny(norm, KW.price)) signals.questions.push("price");
  if (hasAny(norm, KW.photo_question)) signals.questions.push("photo_question");
  if (hasAny(norm, KW.material_question)) signals.questions.push("material");
  if (hasAny(norm, KW.location)) signals.questions.push("location");
  if (hasAny(norm, KW.chain)) signals.questions.push("chain");
  if (hasAny(norm, KW.back_text_info)) signals.questions.push("back_text_info");
  if (hasAny(norm, KW.back_photo_info)) signals.questions.push("back_photo_info");

  // Capability questions — kaç kişi / ikili resim ailesi
  if (hasAny(norm, ["ikili resim","iki resim","iki kisi","iki kisinin","iki cocuk","iki çocuk","ikili foto","coklu foto","çoklu foto","birlestir","birleştir","tek yuze","tek yüze","ayni karede","aynı karede","kac kisi","kaç kişi","kac kisilik","kaç kişilik","kac yuz","kaç yüz","kac resim","kaç resim","kac foto","kaç foto","uc kisi","üç kişi","uclu","üçlü","3 kisi","4 kisi","5 kisi","dort kisi","dört kişi","bes kisi","beş kişi"])) {
    signals.questions.push("capability_multi_photo");
  }

  // ═══ CORRECTIONS ═══
  if (hasAny(norm, ["yanlis","yanlış","degistir","değiştir","duzelt","düzelt"]) || hasAny(norm, ["degil","değil"]) && hasAny(norm, ["olsun","istiyorum","yapalim"])) {
    if (hasAny(norm, ["telefon","numara","cep"])) signals.corrections.push("change_phone");
    if (hasAny(norm, ["adres","mahalle"])) signals.corrections.push("change_address");
    if (hasAny(norm, ["arka","yazi","yazı"])) signals.corrections.push("change_back_text");
    if (hasAny(norm, ["foto","resim"])) signals.corrections.push("change_photo");
    if (hasAny(norm, ["eft","havale","kapida","kapıda","odeme","ödeme"])) signals.corrections.push("change_payment");
    if (signals.corrections.length === 0) signals.corrections.push("change_unknown");
  }

  // ═══ COMPLAINTS ═══
  if (hasAny(norm, ["verdim ya","yazdim ya","soyledim ya","gonderdim ya","attim ya","yolladim ya","belirttim","zaten verdim","zaten yazdim","zaten soyledim","hepsini verdim","bilgi verdim","yukarida yazdim","yazdim yukarida"])) {
    signals.complaints.push("already_sent");
  }
  if (hasAny(norm, ["cevap vermiyorsunuz","cevap alamiyorum","donus yapmiyorsunuz","neden cevap yok"])) {
    signals.complaints.push("no_response");
  }
  // WhatsApp'tan gönderme iddiası
  if (hasAny(norm, ["whatsapptan gonderdim","whatsapp tan gonderdim","whatsaptan gonderdim","whatsapptan attim","whatsapp gonderdim","whatsapp a gonderdim","whatsapp uzerinden","whatsapp tan attim"])) {
    signals.complaints.push("sent_on_whatsapp");
  }
  // Foto gönderme iddiası (URL yok ama claim var)
  if (hasAny(norm, ["fotografi gonderdim","foto gonderdim","resmi gonderdim","foto attim","resim attim","gonderdim fotografi","tamamdir fotografi gonderdim","gonderdim size fotografi","fotoyu gonderdim","fotolari gonderdim","gonderdim ya fotografi"]) && !extracted.photoLink) {
    signals.complaints.push("sent_photo_already");
  }
  // "Aldınız mı" tarzı onay sorusu
  if (hasAny(norm, ["aldiniz mi","aldinizmi","ulasti mi","ulastimi","gordunuz mu","gordunuzmu","geldi mi","geldimi"])) {
    if (hasAny(norm, ["foto","resim","fotograf"])) signals.confirmations.push("photo_received_check");
    else signals.confirmations.push("info_received_check");
  }

  // ═══ CONFIRMATIONS ═══
  if (hasAny(norm, ["siparis alindi mi","siparisim alindi","siparis tamam mi","siparisim tamam","oldu mu simdi","tamam mi simdi","islem tamam mi"])) {
    signals.confirmations.push("order_status");
  }

  // ═══ ACK ═══
  if (!signals.ack) {
    const isEmoji = raw.length <= 4 && /^[^\w\s]+$/.test(raw);
    const CONFIRM = ["tamam","tamamdir","tmm","tmmm","olur","peki","evet","ok","he","hee","tm","anladim","anladım","dogru","doğru"];
    if (isEmoji || (raw.length <= 15 && CONFIRM.includes(norm))) {
      signals.ack = true;
    }
  }

  // ═══ TOPIC HINT ═══
  const lastIntent = fields?.last_intent || "";
  // Trust follow-up: "ne kadar süre" → trust devam (shipping'e kaymaz)
  if (signals.questions.includes("trust") || 
      (lastIntent === "trust" && hasAny(norm, ["sure","süre","garanti","kac yil","kaç yıl","mesela","ne kadar","kac sene","kaç sene","yillik","yıllık","omur boyu","ömür boyu","1 yil","2 yil","3 yil","5 yil","peki","eger","eğer","olursa","durumda","o zaman"]))) {
    signals.topic_hint = "trust";
  } else if (signals.questions.includes("shipping") || signals.questions.includes("shipping_price")) {
    signals.topic_hint = "shipping";
  } else if (signals.questions.includes("price")) {
    signals.topic_hint = "price";
  } else if (signals.slot_updates.payment_method) {
    signals.topic_hint = "payment";
  } else if (signals.slot_updates.back_text || signals.questions.includes("back_text_info") || signals.questions.includes("back_photo_info")) {
    signals.topic_hint = "back_text";
  } else if (signals.slot_updates.photo || signals.questions.includes("photo_question")) {
    signals.topic_hint = "photo";
  }
  // Back text follow-up: last_intent back_text_info iken "başka ne var", "hangi" gibi sorular
  if (!signals.topic_hint && (lastIntent === "back_text_info" || lastIntent === "back_text_examples") && 
      hasAny(norm, ["baska","başka","hangi","ne gibi","neler","var mi","var mı","ornek","örnek","charm","aksesuar"])) {
    signals.topic_hint = "back_text";
  }

  return signals;
}
