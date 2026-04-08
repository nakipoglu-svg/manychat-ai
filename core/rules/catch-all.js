// catch-all.js — Son çare deterministik cevaplar
import { STAGE, REPLY_CLASS, SUPPORT_REASON } from "../constants.js";
import { hasAny, looksLikePhotoUrl } from "../normalize.js";

const R = (t, c = REPLY_CLASS.FLOW_PROGRESS) => ({ text: t, reply_class: c, support_mode_reason: "" });
const OP = (t) => ({ text: t, reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL });

export function catchAll(ctx, state) {
  const { norm, message } = ctx;
  const raw = String(message || "").trim();
  const stage = state.conversation_stage || "";

  // ── Short confirm / emoji ──
  const isConfirm = raw.length <= 15 && hasAny(norm, ["tamam","tamamdir","tm","tmm","tmmm","olur","peki","evet","ok","tamam dir","anladim","anladım"]);
  const isEmoji = raw.length <= 4 && /^[^\w\s]+$/.test(raw);
  const isShort = raw.length <= 6 && !hasAny(norm, ["fiyat","iban","eft","iptal"]);

  if (isConfirm || isEmoji || isShort) {
    if (stage === STAGE.WAITING_PHOTO) return R("Fotoğrafı buradan gönderebilirsiniz efendim 😊");
    if (stage === STAGE.WAITING_BACK_TEXT) return R("Arka yüze yazı eklemek ister misiniz? İsterseniz yazıyı buradan iletebilirsiniz, istemezseniz \"yok\" yazabilirsiniz 😊");
    if (stage === STAGE.WAITING_PAYMENT) return R("Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊");
    if (stage === STAGE.WAITING_ADDRESS) return R("Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊");
    if (stage === STAGE.WAITING_LETTERS) return R("Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊");
    return R("Tabi efendim 😊");
  }

  // ── Gönderdim pattern ──
  if (hasAny(norm, ["gonderdim","gönderdim","attim","attım","yukarida","yukarıda","ustte","üstte","yazdim","yazdım","belirttim","belirtmistim","belirtmiştim","demin","az once","az önce","biraz once","biraz önce","daha once","daha önce","resim yukarida","resim yukarıda","yolladim","yolladım","gonderdlm","gondermiş oldugum"])) {
    if (stage === STAGE.WAITING_PHOTO) {
      if (!state.back_text_status) return R("Fotoğrafınızı aldım efendim 😊 Arka yüze yazı eklemek ister misiniz? İsterseniz yazıyı buradan iletebilirsiniz, istemezseniz \"yok\" yazabilirsiniz.");
      return R("Fotoğrafınızı aldım efendim 😊 Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?");
    }
    if (stage === STAGE.WAITING_ADDRESS) return R("Bilgilerinizi aldım efendim 😊 Eksik bilgi varsa ekibimiz sizinle iletişime geçecektir.");
    if (stage === STAGE.WAITING_BACK_TEXT) return R("Arka yüz bilginizi aldım efendim 😊 Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak?");
  }

  // ── Stage-aware catch-all ──
  if (raw.length <= 2) return null;

  if (stage === STAGE.WAITING_PHOTO) {
    if (hasAny(norm, ["ulasmadi","ulaştı","geldi","gelmedi","siparis verdim","sipariş verdim","memnun degil"])) return OP("Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊");
    return R("Tabi efendim 😊 Fotoğrafı buradan gönderebilirsiniz.");
  }
  if (stage === STAGE.WAITING_PAYMENT) return R("Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊");
  if (stage === STAGE.WAITING_ADDRESS) return R("Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊");
  if (stage === STAGE.WAITING_LETTERS) return R("Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊");
  if (stage === STAGE.WAITING_BACK_TEXT) return R("Arka yüze yazı eklemek ister misiniz? İsterseniz yazıyı buradan iletebilirsiniz, istemezseniz \"yok\" yazabilirsiniz 😊");
  if (stage === STAGE.WAITING_PRODUCT) return ({ text: "Fotoğrafınız ulaştı efendim 😊 Önce hangi model ile ilgilendiğinizi belirtebilir misiniz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye", reply_class: REPLY_CLASS.MENU, support_mode_reason: "" });

  return null;
}
