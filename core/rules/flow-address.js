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

  // Hangi bilgiler gelmiş, hangileri eksik?
  const hasAddr = state.address_status === "address_only" || state.address_status === "received";
  const hasPhone = truthy(state.phone_received);
  const hasName = false; // Name ayrı track edilmiyor, her NAME_ONLY'de true

  // Eksik bilgileri hesapla
  function missingInfo() {
    const missing = [];
    if (!hasPhone) missing.push("📱 Cep telefonu");
    if (!hasAddr) missing.push("📍 Açık adres");
    return missing;
  }

  if (intent === INTENT.NAME_ONLY && nextStage === STAGE.WAITING_ADDRESS) {
    const missing = missingInfo();
    if (missing.length === 0) {
      // İsim geldi, diğer her şey tamam → telefon eksik olabilir
      if (!hasPhone) return R("Ad soyad bilginizi aldım efendim 😊 Cep telefonu numaranızı da paylaşabilir misiniz? 📱");
      return R("Ad soyad bilginizi aldım efendim 😊");
    }
    return R("Ad soyad bilginizi aldım efendim 😊\n\n📌 Şimdi kalan bilgileri paylaşabilir misiniz?\n\n" + missing.join("\n"));
  }

  if (intent === INTENT.PHONE) {
    if (nextStage === STAGE.ORDER_COMPLETED) return R("Telefon numaranızı da aldım efendim 😊 Siparişiniz tamamlanmıştır, ekibimiz en kısa sürede ürününüzü üretmeye başlayacaktır 😊", REPLY_CLASS.ORDER_COMPLETE);
    if (!state.payment_method) return R("Telefon numaranızı da aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.");
    if (hasAddr) return R("Telefon numaranızı da aldım efendim 😊 Bilgileriniz tamamlandı, siparişiniz oluşturuluyor.");
    return R("Telefon numaranızı da aldım efendim 😊\n\n📍 Şimdi açık adresinizi yazabilirsiniz. (İl, ilçe, mahalle, sokak)");
  }

  if (intent === INTENT.ADDRESS) {
    if (nextStage === STAGE.ORDER_COMPLETED) return R("Adres bilginizi de aldım efendim 😊 Siparişiniz tamamlanmıştır, ekibimiz en kısa sürede ürününüzü üretmeye başlayacaktır 😊", REPLY_CLASS.ORDER_COMPLETE);
    // Adres geldi ama telefon eksik
    if (!hasPhone) return R("Adres bilginizi aldım efendim 😊\n\n📌 Siparişi tamamlayabilmemiz için cep telefonu numaranızı da paylaşabilir misiniz? 📱");
    // Adres + telefon var → tamamlandı
    return R("Adres bilginizi de aldım efendim 😊 Siparişiniz tamamlanmıştır, ekibimiz en kısa sürede ürününüzü üretmeye başlayacaktır 😊", REPLY_CLASS.ORDER_COMPLETE);
  }

  return null;
}
