// menu.js — Menü gösterme kararı
// İlk mesajda HER ZAMAN menü göster (ürün seçimi yapılmamışsa)
import { INTENT, REPLY_CLASS, TEXT } from "../constants.js";
import { truthy } from "../normalize.js";

// Bu intent'lerde menü göster (ürün yoksa)
const MENU_INTENTS = new Set([
  INTENT.GENERAL, INTENT.PRICE, INTENT.PAYMENT, INTENT.ORDER_START,
  INTENT.ADDRESS, INTENT.DETAIL_REQUEST,
]);

export function menuCheck(ctx, state) {
  // Ürün zaten seçilmiş → menü gösterme
  if (state.product) return null;
  if (truthy(state.context_lock)) return null;
  if (state.order_status === "cancel_requested") return null;

  // İLK MESAJ TESPİTİ: ürün yok + menü gösterilmemiş + stage yok
  // → intent ne olursa olsun menü göster
  // İSTİSNA: konum, kargo, güven gibi yan sorular + post_sale + cancel
  const isFirstContact = !state.product && !state.menu_gosterildi &&
    !state.conversation_stage && !truthy(state.context_lock);

  const SIDE_INTENTS = new Set([
    INTENT.LOCATION, INTENT.SHIPPING, INTENT.SHIPPING_PRICE,
    INTENT.TRUST, INTENT.MATERIAL, INTENT.CHAIN,
    INTENT.CANCEL, INTENT.POST_SALE,
    // İlk mesajda bile yan soru olarak cevaplanmalı (menü değil)
    INTENT.BACK_PHOTO_INFO, INTENT.BACK_TEXT_INFO,
    INTENT.BACK_PHOTO_PRICE, INTENT.PHOTO_QUESTION,
    INTENT.EXAMPLE_REQUEST, INTENT.NEW_ORDER,
    INTENT.BACK_TEXT, INTENT.PAYMENT_INFO,
  ]);

  if (isFirstContact && !SIDE_INTENTS.has(ctx.intent)) {
    // Mesajda ürün adı geçiyorsa menü gösterme → product-entry rule'una bırak
    // Orada fiyat + yönlendirme verilecek
    if (ctx.product) return null;
    return { text: TEXT.MAIN_MENU, reply_class: REPLY_CLASS.MENU, support_mode_reason: "" };
  }

  // Normal menü kontrolü (ilk mesaj değil ama ürün hala yok)
  if (!MENU_INTENTS.has(ctx.intent)) return null;
  return { text: TEXT.MAIN_MENU, reply_class: REPLY_CLASS.MENU, support_mode_reason: "" };
}
