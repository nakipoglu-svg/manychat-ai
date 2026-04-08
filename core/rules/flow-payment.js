// flow-payment.js — Ödeme akışı (her iki ürün için ortak)
import { INTENT, PRODUCT, STAGE, REPLY_CLASS, SUPPORT_REASON, TEXT } from "../constants.js";
import { hasAny, truthy } from "../normalize.js";

const R = (t, c = REPLY_CLASS.FLOW_PROGRESS) => ({ text: t, reply_class: c, support_mode_reason: "" });
const OP = (t) => ({ text: t, reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL });
const FI = (t) => ({ text: t, reply_class: REPLY_CLASS.FIXED_INFO, support_mode_reason: "" });

export function flowPayment(ctx, state, nextStage) {
  if (ctx.intent !== INTENT.PAYMENT) return null;
  const { norm, product } = ctx;

  // Kredi kartı → nakit uyarısı
  if (hasAny(norm, ["kartla","kart ile","kredi karti","kredi kartı","banka karti","banka kartı"])) {
    return FI("Kapıda ödeme sadece nakit olarak alınmaktadır efendim 😊 EFT / Havale veya kapıda nakit ödeme ile ilerleyebiliriz.");
  }

  // Dekont / açıklama
  if (norm.includes("dekont")) return FI("Tabi efendim, iletebilirsiniz 😊");
  if (norm.includes("aciklama") || norm.includes("açıklama")) return FI("Açıklama yazmanıza gerek yok efendim 😊");

  // IBAN
  if (norm.includes("iban")) return R(`Tabi efendim 😊\n\n${TEXT.EFT_INFO}`);

  // Ödeme yaptım
  if (hasAny(norm, ["eft attim","havale yaptim","odeme yaptim","ödeme yaptım"])) return OP("Teşekkür ederiz efendim, ekibimiz kontrol edip size dönüş sağlayacaktır 😊");

  // Post-completion payment
  if (state.order_status === "completed" || nextStage === STAGE.ORDER_COMPLETED) {
    if (hasAny(norm, ["odemeyi yaptim","ödemeyi yaptım","ucretini yollarim","ücretini yollarım"])) return OP("Teşekkür ederiz efendim, ekibimiz kontrol edip size dönüş sağlayacaktır 😊");
    return ({ text: "Ödeme ile ilgili ekibimiz size yardımcı olacaktır efendim 😊", reply_class: REPLY_CLASS.SELLER_REQUIRED, support_mode_reason: SUPPORT_REASON.SELLER });
  }

  // Ürün yok → menü
  if (!product && nextStage === STAGE.WAITING_PRODUCT) {
    return ({ text: "Ödeme yöntemimiz EFT / Havale veya kapıda ödeme şeklindedir efendim 😊 Önce hangi model ile ilgilendiğinizi yazabilir misiniz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye", reply_class: REPLY_CLASS.MENU, support_mode_reason: "" });
  }

  // Erken ödeme — lazer foto beklerken
  if (product === PRODUCT.LAZER && nextStage === STAGE.WAITING_PHOTO) {
    if (state.payment_method === "eft_havale") return R(`EFT / Havale ile ilerleyebiliriz efendim 😊 Önce fotoğrafınızı buradan gönderebilirsiniz.\n\n${TEXT.EFT_INFO}`);
    if (state.payment_method === "kapida_odeme") return R("Kapıda ödeme ile ilerleyebiliriz efendim 😊 Önce fotoğrafınızı buradan gönderebilirsiniz.");
  }

  // Lazer back_text beklerken
  if (product === PRODUCT.LAZER && nextStage === STAGE.WAITING_BACK_TEXT) {
    return R("Ödeme aşamasına geçmeden önce arka yüz için yazı isteyip istemediğinizi iletebilir misiniz? İstemiyorsanız 'yok' yazabilirsiniz 😊");
  }

  // Ataç harf beklerken
  if (product === PRODUCT.ATAC && !truthy(state.letters_received)) {
    if (state.payment_method === "eft_havale") return R(`EFT / Havale ile ilerleyebiliriz 😊 Önce istediğiniz harfleri yazabilirsiniz.\n\n${TEXT.EFT_INFO}`);
    if (state.payment_method === "kapida_odeme") return R("Kapıda ödeme ile ilerleyebiliriz efendim 😊 Önce istediğiniz harfleri yazabilirsiniz.");
  }

  // Normal akış — adres henüz alınmadı
  if (state.address_status !== "received") {
    if (state.payment_method === "eft_havale") return R(`EFT / Havale için ödeme bilgilerimiz şu şekildedir 😊\n\n${TEXT.EFT_INFO}\n\n${TEXT.ORDER_DETAILS}`);
    if (state.payment_method === "kapida_odeme") return R(`Kapıda ödeme ile ilerleyebiliriz efendim 😊\n\n${TEXT.ORDER_DETAILS}`);
  }

  // Adres zaten alınmış
  if (state.address_status === "received") {
    if (state.payment_method === "eft_havale") return R(`EFT / Havale ile ilerleyebiliriz efendim 😊\n\n${TEXT.EFT_INFO}`);
    if (state.payment_method === "kapida_odeme") return R("Kapıda ödeme ile ilerleyebiliriz efendim 😊");
  }

  return null;
}
