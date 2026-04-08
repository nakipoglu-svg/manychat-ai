// completion.js — Sipariş başlatma + tamamlama
import { INTENT, PRODUCT, STAGE, REPLY_CLASS, TEXT } from "../constants.js";
import { truthy } from "../normalize.js";

export function completionRule(ctx, state, nextStage) {
  // Order start
  if (ctx.intent === INTENT.ORDER_START) {
    if (!ctx.product) return { text: TEXT.MAIN_MENU, reply_class: REPLY_CLASS.MENU, support_mode_reason: "" };
    if (ctx.product === PRODUCT.LAZER) return { text: TEXT.LAZER_PRICE, reply_class: REPLY_CLASS.PRODUCT_ENTRY, support_mode_reason: "" };
    if (ctx.product === PRODUCT.ATAC) return { text: TEXT.ATAC_PRICE, reply_class: REPLY_CLASS.PRODUCT_ENTRY, support_mode_reason: "" };
  }

  // Order completion — ilk kez order_completed'a geçiş
  if (nextStage === STAGE.ORDER_COMPLETED) {
    if (state.order_status === "completed" || truthy(state.siparis_alindi)) return null;
    return { text: "Siparişiniz tamamlanmıştır, ekibimiz en kısa sürede ürününüzü üretmeye başlayacaktır 😊", reply_class: REPLY_CLASS.ORDER_COMPLETE, support_mode_reason: "" };
  }

  return null;
}
