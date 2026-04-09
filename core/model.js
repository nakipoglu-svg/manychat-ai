// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODEL — AI fallback (sadece deterministik cevap üretemediğinde)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import fs from "fs";
import path from "path";
import { CRITICAL_KNOWLEDGE, TEXT } from "./constants.js";

const fileCache = {};

function safeRead(filename) {
  if (fileCache[filename] !== undefined) return fileCache[filename];
  try {
    const fp = path.join(process.cwd(), "knowledge", filename);
    const content = fs.readFileSync(fp, "utf8");
    fileCache[filename] = content || "";
    return content || "";
  } catch {
    fileCache[filename] = "";
    return "";
  }
}

function buildKnowledgePack(product) {
  const files = [
    "SYSTEM_MASTER.txt", "CORE_SYSTEM.txt", "ROUTING_RULES.txt",
    "EDGE_CASES.txt", "FEW_SHOT_EXAMPLES.txt", "IMAGE_RULES.txt",
    product === "lazer" ? "PRODUCT_LASER.txt" : "",
    product === "atac" ? "PRODUCT_ATAC.txt" : "",
    "PRICING.txt", "SHIPPING.txt", "PAYMENT.txt",
    "ORDER_FLOW.txt", "TRUST.txt", "SMALLTALK.txt",
  ];
  return files.filter(Boolean).map(f => safeRead(f)).filter(Boolean).join("\n\n");
}

function checkCriticalFiles() {
  return CRITICAL_KNOWLEDGE.filter(f => !safeRead(f).trim());
}

export async function callModelFallback(ctx) {
  const missing = checkCriticalFiles();
  if (missing.length > 0) {
    console.error("Knowledge safety guard triggered. Missing:", missing);
    return TEXT.FALLBACK;
  }

  const pack = buildKnowledgePack(ctx.product);

  const systemPrompt = `
You are a sales assistant for Yudum Jewels.

Rules:
- Keep replies short, natural, warm, and professional.
- If product context exists, do not ask product again.
- If customer already gave payment or address earlier, do not ask the same thing again.
- If customer asks a side question during order flow, answer it briefly and then continue with the next missing step.
- If you truly do not know, reply exactly with: ${TEXT.FALLBACK}

CRITICAL STAGE RULES — NEVER VIOLATE:
- If back_text_status is "received" or "skipped", NEVER ask about back text again.
- If payment_method is set, NEVER ask about payment again.
- If address_status is "received", NEVER ask for address again.
- If conversation_stage is "waiting_payment", ask ONLY about payment method.
- If conversation_stage is "waiting_address", ask ONLY for ad soyad, telefon, and adres.
- If conversation_stage is "order_completed", do NOT restart any order flow.
- NEVER go backwards in the flow.

KNOWLEDGE:
${pack}
  `.trim();

  const userPrompt = `
Customer message: ${ctx.message}
Context:
- detected_product: ${ctx.product || ""}
- detected_intent: ${ctx.intent || ""}
- conversation_stage: ${ctx.fields.conversation_stage || ""}
- photo_received: ${ctx.fields.photo_received || ""}
- payment_method: ${ctx.fields.payment_method || ""}
- order_status: ${ctx.fields.order_status || ""}
- back_text_status: ${ctx.fields.back_text_status || ""}
- address_status: ${ctx.fields.address_status || ""}
- letters_received: ${ctx.fields.letters_received || ""}
- phone_received: ${ctx.fields.phone_received || ""}
  `.trim();

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || "deepseek-chat";
  const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1";

  if (!apiKey) return TEXT.FALLBACK;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.MODEL_TIMEOUT_MS || 5000));

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model, temperature: 0.2, max_tokens: 150,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) return TEXT.FALLBACK;
    const data = await res.json();
    
    // ═══ TOKEN USAGE LOGGING ═══
    if (data?.usage) {
      const u = data.usage;
      console.log("[TOKEN]", JSON.stringify({
        source: "model_fallback",
        model: model,
        prompt_tokens: u.prompt_tokens || 0,
        completion_tokens: u.completion_tokens || 0,
        total_tokens: u.total_tokens || 0,
        ts: new Date().toISOString(),
      }));
    }
    
    return data?.choices?.[0]?.message?.content || TEXT.FALLBACK;
  } catch {
    return TEXT.FALLBACK;
  } finally {
    clearTimeout(timeout);
  }
}
