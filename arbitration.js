// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ARBITRATION — Tek final karar noktası
// Rule modüllerini sırayla çağırır, ilk non-null cevabı seçer.
// Debug metadata ile birlikte döner.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { guards } from "./rules/guards.js";
import { preHandlers } from "./rules/pre-handlers.js";
import { menuCheck } from "./rules/menu.js";
import { sideQuestions } from "./rules/side-questions.js";
import { priceRule } from "./rules/price.js";
import { productEntry } from "./rules/product-entry.js";
import { flowLazer } from "./rules/flow-lazer.js";
import { flowAtac } from "./rules/flow-atac.js";
import { flowPayment } from "./rules/flow-payment.js";
import { flowAddress } from "./rules/flow-address.js";
import { completionRule } from "./rules/completion.js";
import { smalltalkRule } from "./rules/smalltalk.js";
import { catchAll } from "./rules/catch-all.js";

// Sıralı rule listesi — öncelik sırası KRİTİK
const RULE_CHAIN = [
  { name: "guards",        fn: guards },
  { name: "pre-handlers",  fn: preHandlers },
  { name: "menu",          fn: menuCheck },
  { name: "side-questions", fn: sideQuestions },
  { name: "price",         fn: priceRule },
  { name: "product-entry", fn: productEntry },
  { name: "flow-lazer",    fn: flowLazer },
  { name: "flow-atac",     fn: flowAtac },
  { name: "flow-payment",  fn: flowPayment },
  { name: "flow-address",  fn: flowAddress },
  { name: "completion",    fn: completionRule },
  { name: "smalltalk",     fn: smalltalkRule },
  { name: "catch-all",     fn: catchAll },
];

/**
 * @param {Object} ctx — { message, norm, intent, product, previousProduct, fields, extracted }
 * @param {Object} derived — { derivedState, proposedPatch, nextStage }
 * @returns {{ reply: {text,reply_class,support_mode_reason}|null, meta: Object }}
 */
export function arbitrate(ctx, derived) {
  const { derivedState: state, nextStage } = derived;
  const candidatesTried = [];

  for (const { name, fn } of RULE_CHAIN) {
    candidatesTried.push(name);

    const result = fn(ctx, state, nextStage);

    if (result && result.text) {
      return {
        reply: result,
        meta: {
          selectedRule: name,
          decisionReason: ctx.intent,
          replySource: "deterministic",
          candidatesTried: [...candidatesTried],
        },
      };
    }
  }

  // Hiçbir rule cevap üretmedi → model fallback
  return {
    reply: null,
    meta: {
      selectedRule: null,
      decisionReason: ctx.intent,
      replySource: "model_fallback",
      candidatesTried: [...candidatesTried],
    },
  };
}
