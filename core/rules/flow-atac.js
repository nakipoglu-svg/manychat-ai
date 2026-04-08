// flow-atac.js — Ataç kolye sipariş akışı
import { INTENT, PRODUCT, STAGE, REPLY_CLASS, TEXT } from "../constants.js";

const R = (t) => ({ text: t, reply_class: REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: "" });

export function flowAtac(ctx, state, nextStage) {
  if (ctx.product !== PRODUCT.ATAC) return null;
  if (ctx.intent !== INTENT.LETTERS) return null;
  if (nextStage !== STAGE.WAITING_PAYMENT) return null;

  if (state.payment_method === "eft_havale") return R(`Harflerinizi aldım efendim 😊 EFT / Havale ile ilerleyebiliriz.\n\n${TEXT.EFT_INFO}\n\n${TEXT.ORDER_DETAILS}`);
  if (state.payment_method === "kapida_odeme") return R(`Harflerinizi aldım efendim 😊 Kapıda ödeme ile ilerleyebiliriz.\n\n${TEXT.ORDER_DETAILS}`);
  return R("Harflerinizi aldım efendim 😊 Şimdi ödeme tercihinizi iletebilir misiniz? EFT / Havale veya kapıda ödeme şeklinde ilerleyebiliriz.");
}
