// menu.js — Menü gösterme kararı
import { INTENT, REPLY_CLASS, TEXT } from "../constants.js";
import { truthy } from "../normalize.js";

const MENU_INTENTS = new Set([INTENT.GENERAL, INTENT.PRICE, INTENT.PAYMENT, INTENT.ORDER_START, INTENT.ADDRESS, INTENT.DETAIL_REQUEST]);

export function menuCheck(ctx, state) {
  if (state.product) return null;
  if (truthy(state.context_lock)) return null;
  if (state.order_status === "cancel_requested") return null;
  if (!MENU_INTENTS.has(ctx.intent)) return null;
  return { text: TEXT.MAIN_MENU, reply_class: REPLY_CLASS.MENU, support_mode_reason: "" };
}
