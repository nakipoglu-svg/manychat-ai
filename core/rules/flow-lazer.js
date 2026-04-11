// flow-lazer.js — Lazer kolye sipariş akışı
// KURAL: Foto sonrası arka yüz opsiyonu SORULMAZ. Direkt ödemeye geçilir.
// Arka yüz tamamen müşteri tetikli opsiyoneldir.
import { INTENT, PRODUCT, STAGE, REPLY_CLASS, SUPPORT_REASON, TEXT } from "../constants.js";

const R = (t, c = REPLY_CLASS.FLOW_PROGRESS) => ({ text: t, reply_class: c, support_mode_reason: "" });
const FI = (t) => ({ text: t, reply_class: REPLY_CLASS.FIXED_INFO, support_mode_reason: "" });
const SEL = (t) => ({ text: t, reply_class: REPLY_CLASS.SELLER_REQUIRED, support_mode_reason: SUPPORT_REASON.SELLER });

export function flowLazer(ctx, state, nextStage) {
  if (ctx.product !== PRODUCT.LAZER) return null;
  const { intent } = ctx;

  if (intent === INTENT.PHOTO_SUITABILITY) return R("Fotoğrafınızı buradan iletebilirsiniz efendim 😊");

  if (intent === INTENT.BACK_PHOTO_SENT) return R("Fotoğrafınız alındı efendim 😊");
  
  // Arka yazı örnekleri sorusu — müşteri açtı
  if (intent === INTENT.BACK_TEXT_EXAMPLES) return FI("Genelde isim, tarih, kısa bir not veya dua yazılıyor efendim 😊 İsterseniz ne yazılmasını istediğinizi buradan iletebilirsiniz.");

  if (intent === INTENT.PRODUCT_IMAGE_REF) {
    return R("Tabi efendim, bu modeli not aldım 😊 Şimdi kolyeye basılacak kendi fotoğrafınızı buradan iletebilirsiniz.");
  }

  // ═══ FOTOĞRAF GELDİ ═══
  // Tüm fotoğraflar kabul edilir. Bildirim yap, ödemeye geç.
  if (intent === INTENT.PHOTO) {
    if (state.order_status === "completed" || nextStage === STAGE.ORDER_COMPLETED) {
      return SEL("Sipariş bilgileri tamamlandığı için fotoğraf değişikliği talebinizi ekibimize yönlendirelim efendim 😊");
    }
    const fotoMsg = "Fotoğrafınız ulaştı efendim 😊 Siparişiniz bu fotoğraf üzerinden hazırlanacaktır. Farklı bir görsel kullanmak isterseniz belirtebilirsiniz.";
    if (!state.payment_method) {
      return R(fotoMsg + "\n\nÖdeme tercihiniz EFT / Havale mi, kapıda ödeme mi olacak efendim?");
    }
    if (state.address_status !== "received") {
      return R(`${fotoMsg}\n\n${TEXT.ORDER_DETAILS}`);
    }
    return R(fotoMsg);
  }

  // ═══ ARKA YAZI — MÜŞTERİ KENDİ VERDİ ═══
  // Yumuşak teyit, mekanik dil yok
  if (intent === INTENT.BACK_TEXT) {
    if (!state.payment_method) {
      return R("Tamamdır efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.");
    }
    if (state.address_status !== "received") {
      return R(`Tamamdır efendim 😊\n\n${TEXT.ORDER_DETAILS}`);
    }
    return R("Tamamdır efendim 😊");
  }

  // ═══ ARKA YAZI SKIP — müşteri "yok" dedi ═══
  if (intent === INTENT.BACK_TEXT_SKIP) {
    if (!state.payment_method) {
      return R("Tabi efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.");
    }
    if (state.address_status !== "received") {
      return R(`Tabi efendim 😊\n\n${TEXT.ORDER_DETAILS}`);
    }
    return R("Tabi efendim 😊");
  }

  return null;
}
