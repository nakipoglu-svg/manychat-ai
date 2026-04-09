// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SELF-HEALING LAYER — Complaint ve state kaybında bot kendini toparlasın
// "verdim ya" → eksik slot listesi bas, "her şeyi baştan yaz" yasak
// restricted-content → state resetlenmez
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { hasAny } from "./normalize.js";
import { REPLY_CLASS } from "./constants.js";

/**
 * Complaint mesajlarında state'i koruyarak akıllı cevap üret.
 * "verdim ya" → bilgiyi onaylayıp sadece eksikleri sor
 * "yazdım yukarıda" → bilgiyi kabul et, eksikleri sor
 * "neden tekrar soruyorsunuz" → özür + eksik liste
 * 
 * @returns {{ text: string, reply_class: string, support_mode_reason: string, statePatches: Object } | null}
 */
export function selfHeal(ctx, signals, filledSlots, missingSlots, stage) {
  // Human support / iptal durumlarında self-heal devreye girmesin
  if (stage === "human_support" || ctx.fields?.order_status === "cancel_requested") return null;
  
  const { norm } = ctx;
  
  // ═══ "GÖNDERDIM / VERDİM" CLAIM ═══
  // Müşteri bilgi verdiğini iddia ediyor. Bot bunu kabul etmeli, 
  // saygılı şekilde sadece gerçekten eksik olanları sormalı.
  const isClaim = hasAny(norm, [
    "verdim ya","yazdim ya","soyledim ya","gonderdim ya","attim ya",
    "yolladim ya","belirttim","zaten verdim","zaten yazdim","zaten soyledim",
    "yukarida yazdim","yukarıda yazdım","yazdim yukarida","gönderdim ya",
    "hepsini verdim","bilgi verdim",
  ]);
  
  if (isClaim) {
    return buildClaimResponse(missingSlots, stage);
  }

  // ═══ "NEDEN TEKRAR SORUYORSUNUZ" ═══
  const isWhyAgain = hasAny(norm, [
    "neden tekrar","niye tekrar","yine mi","tekrar soruyorsun","tekrar mi",
    "hep ayni","hep aynı","kac kere","kaç kere","defalarca",
  ]);
  
  if (isWhyAgain) {
    return buildWhyAgainResponse(missingSlots, stage);
  }

  // ═══ "SİPARİŞİM ALINDI MI" (completed durumunda) ═══
  const isOrderCheck = hasAny(norm, [
    "siparis alindi mi","siparisim alindi","siparis tamam mi",
    "siparisim tamam","oldu mu simdi","tamam mi simdi","islem tamam mi",
    "tesekkurler siparisim","siparis tamamlandi mi",
  ]);
  
  if (isOrderCheck) {
    return buildOrderCheckResponse(filledSlots, missingSlots);
  }

  // ═══ FOTO GÖNDERME İDDİASI (text mesaj olarak, foto yok ama "gönderdim" diyor) ═══
  const isPhotoClaim = hasAny(norm, [
    "fotografi gonderdim","fotoğrafı gönderdim","fotografi gonderdim",
    "resmi gonderdim","foto gonderdim","foto attim","resim attim",
    "gonderdim fotografi","tamamdir fotografi gonderdim",
    "gonderdim size","fotograf gonderdim","size attim",
  ]) && !ctx.extracted?.photoLink;

  if (isPhotoClaim) {
    return {
      text: "Fotoğrafınızı aldım efendim 😊 Fotoğrafınızda bir sorun olursa ekibimiz size bilgi verecektir.",
      reply_class: REPLY_CLASS.FLOW_PROGRESS,
      support_mode_reason: "",
      statePatches: { photo_received: "1" },
      _policy: "self_heal_photo_claim",
    };
  }

  return null;
}

function buildClaimResponse(missingSlots, stage) {
  if (missingSlots.length === 0) {
    return {
      text: "Bilgileriniz alınmıştır efendim 😊 Siparişiniz ekibimize iletilmiştir.",
      reply_class: REPLY_CLASS.FIXED_INFO,
      support_mode_reason: "",
      statePatches: {},
      _policy: "self_heal_claim_all_filled",
    };
  }
  
  if (missingSlots.length === 1) {
    const msg = {
      photo: "Bilgilerinizi aldım efendim 😊 Fotoğrafınızı buradan iletebilirsiniz.",
      back_text: "Bilgilerinizi aldım efendim 😊 Arka yüze yazı tercihinizi iletebilir misiniz?",
      payment: "Bilgilerinizi aldım efendim 😊 Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak?",
      phone: "Bilgilerinizi aldım efendim 😊 Cep telefonu numaranızı iletebilir misiniz? 📱",
      address: "Bilgilerinizi aldım efendim 😊 Açık adresinizi iletebilir misiniz? 📍",
      letters: "Bilgilerinizi aldım efendim 😊 Yapılmasını istediğiniz harfleri yazabilirsiniz.",
    };
    return {
      text: msg[missingSlots[0]] || "Bilgilerinizi aldım efendim 😊 Eksik bilgi varsa ekibimiz sizinle iletişime geçecektir.",
      reply_class: REPLY_CLASS.FLOW_PROGRESS,
      support_mode_reason: "",
      statePatches: {},
      _policy: "self_heal_claim_one_missing",
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
    text: "Bilgilerinizi aldım efendim 😊 Şu bilgiler eksik kalmış:\n\n" + parts.join("\n"),
    reply_class: REPLY_CLASS.FLOW_PROGRESS,
    support_mode_reason: "",
    statePatches: {},
    _policy: "self_heal_claim_multi_missing",
  };
}

function buildWhyAgainResponse(missingSlots, stage) {
  if (missingSlots.length === 0) {
    return {
      text: "Haklısınız efendim, özür dileriz 😊 Bilgileriniz tamamlanmıştır.",
      reply_class: REPLY_CLASS.FIXED_INFO,
      support_mode_reason: "",
      statePatches: {},
      _policy: "self_heal_why_again_done",
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
    text: "Özür dileriz efendim 😊 Şu bilgiler eksik kalmış:\n\n" + parts.join("\n"),
    reply_class: REPLY_CLASS.FLOW_PROGRESS,
    support_mode_reason: "",
    statePatches: {},
    _policy: "self_heal_why_again_missing",
  };
}

function buildOrderCheckResponse(filledSlots, missingSlots) {
  const allFilled = missingSlots.length === 0;
  if (allFilled) {
    return {
      text: "Evet efendim, siparişiniz alınmıştır 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.",
      reply_class: REPLY_CLASS.FIXED_INFO,
      support_mode_reason: "",
      statePatches: {},
      _policy: "self_heal_order_check_done",
    };
  }
  return null;
}
