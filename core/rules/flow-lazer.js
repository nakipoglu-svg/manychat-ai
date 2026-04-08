// flow-lazer.js — Lazer kolye sipariş akışı
import { INTENT, PRODUCT, STAGE, REPLY_CLASS, SUPPORT_REASON, TEXT } from "../constants.js";

const R = (t, c = REPLY_CLASS.FLOW_PROGRESS) => ({ text: t, reply_class: c, support_mode_reason: "" });
const SEL = (t) => ({ text: t, reply_class: REPLY_CLASS.SELLER_REQUIRED, support_mode_reason: SUPPORT_REASON.SELLER });

export function flowLazer(ctx, state, nextStage) {
  if (ctx.product !== PRODUCT.LAZER) return null;
  const { intent } = ctx;

  if (intent === INTENT.PHOTO_SUITABILITY) return R("Gönderdiğiniz fotoğrafı kontrol edip size bilgi verelim efendim 😊");
  if (intent === INTENT.BACK_PHOTO_SENT) return R("Tabi efendim, fotoğraflarınız ulaştı 😊");
  if (intent === INTENT.BACK_TEXT_EXAMPLES) return R("Genelde isim, tarih, kısa bir not veya dua yazılıyor efendim 😊", REPLY_CLASS.FIXED_INFO);

  if (intent === INTENT.PRODUCT_IMAGE_REF) {
    return R("Tabi efendim, bu modeli not aldım 😊 Şimdi kolyeye basılacak kendi fotoğrafınızı buradan gönderebilirsiniz.");
  }

  if (intent === INTENT.PHOTO) {
    if (state.order_status === "completed" || nextStage === STAGE.ORDER_COMPLETED) {
      return SEL("Sipariş bilgileri tamamlandığı için fotoğraf değişikliği talebinizi ekibimize yönlendirelim efendim 😊");
    }
    // Arka yazı/foto zaten alındıysa
    if (state.back_text_status === "received" || state.back_text_status === "skipped") {
      if (!state.payment_method) return R("Fotoğrafınızı aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.");
      if (state.address_status !== "received") return R(`Fotoğrafınızı aldım efendim 😊\n\n${TEXT.ORDER_DETAILS}`);
      return R("Fotoğrafınızı aldım efendim 😊");
    }
    return R("Fotoğrafınız alındı efendim, uygun görülmezse ekibimiz size dönüş yapacaktır 😊 Arka yüzüne yazı eklemek ister misiniz? İsterseniz yazıyı buradan iletebilirsiniz, istemezseniz 'yok' yazabilirsiniz.");
  }

  if (intent === INTENT.BACK_TEXT_SKIP && nextStage === STAGE.WAITING_PAYMENT) {
    if (state.payment_method === "eft_havale") return R(`Tamam efendim 😊 Arka yüz boş kalacak.\n\n${TEXT.EFT_INFO}\n\n${TEXT.ORDER_DETAILS}`);
    if (state.payment_method === "kapida_odeme") return R(`Tamam efendim 😊 Arka yüz boş kalacak.\n\n${TEXT.ORDER_DETAILS}`);
    return R("Tamam efendim 😊 Arka yüz boş kalacak. Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.");
  }

  if (intent === INTENT.BACK_TEXT && nextStage === STAGE.WAITING_PAYMENT) {
    if (state.payment_method === "eft_havale") return R(`Not aldım efendim 😊 EFT / Havale ile ilerleyebiliriz.\n\n${TEXT.EFT_INFO}\n\n${TEXT.ORDER_DETAILS}`);
    if (state.payment_method === "kapida_odeme") return R(`Not aldım efendim 😊 Kapıda ödeme ile ilerleyebiliriz.\n\n${TEXT.ORDER_DETAILS}`);
    return R("Not aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.");
  }

  return null;
}
