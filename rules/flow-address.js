// flow-address.js — Adres akışı
import { INTENT, STAGE, REPLY_CLASS, TEXT } from "../constants.js";
import { truthy } from "../normalize.js";

const R = (t, c = REPLY_CLASS.FLOW_PROGRESS) => ({ text: t, reply_class: c, support_mode_reason: "" });

export function flowAddress(ctx, state, nextStage) {
  const { intent } = ctx;

  if (intent === INTENT.STORE_PICKUP) {
    if (!truthy(state.phone_received)) return R("Tabi efendim, şubemizden teslim alabilirsiniz 😊 Ad soyad ve cep telefonu numaranızı paylaşabilir misiniz?");
    return R("Tabi efendim, şubemizden teslim alabilirsiniz 😊");
  }

  // Completed → flow açılmaz
  if (state.order_status === "completed" || truthy(state.siparis_alindi)) return null;

  if (intent === INTENT.NAME_ONLY && nextStage === STAGE.WAITING_ADDRESS) {
    if (!truthy(state.phone_received)) return R("Ad soyad bilginizi aldım efendim 😊\n\n📌 Şimdi kalan bilgileri paylaşabilir misiniz?\n\n📱 Cep telefonu\n📍 Açık adres");
    return R("Ad soyad bilginizi aldım efendim 😊\n\n📍 Şimdi açık adresinizi paylaşabilir misiniz?");
  }

  if (intent === INTENT.PHONE) {
    if (nextStage === STAGE.ORDER_COMPLETED) return R("Telefon numaranızı da aldım efendim 😊 Siparişiniz tamamlanmıştır, ekibimiz en kısa sürede ürününüzü üretmeye başlayacaktır 😊", REPLY_CLASS.ORDER_COMPLETE);
    if (!state.payment_method) return R("Telefon numaranızı da aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.");
    return R("Telefon numaranızı da aldım efendim 😊\n\n📍 Şimdi açık adresinizi yazabilirsiniz. (İl, ilçe, mahalle, sokak)");
  }

  if (intent === INTENT.ADDRESS) {
    if (state.address_status === "address_only" && !truthy(state.phone_received)) return R("Adres bilginizi aldım efendim 😊\n\n📌 Siparişi tamamlayabilmemiz için cep telefonu numaranızı da paylaşabilir misiniz? 📱");
    if (nextStage === STAGE.ORDER_COMPLETED) return R("Adres bilginizi de aldım efendim 😊 Siparişiniz tamamlanmıştır, ekibimiz en kısa sürede ürününüzü üretmeye başlayacaktır 😊", REPLY_CLASS.ORDER_COMPLETE);
  }

  return null;
}
