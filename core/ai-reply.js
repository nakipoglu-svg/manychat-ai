// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI REPLY INTERPRETER — Hibrit cevap katmanı
//
// Deterministic commit yapmaz.
// Doğal, sıcak, kısa cevap üretir.
// Slot/state kararı vermez — sadece önerir.
// Knowledge dosyalarından konuya göre mini pack okur.
//
// Input: mesaj + stage + slotlar + product + mini knowledge
// Output: { reply, intent_label, topic, should_commit_slot, next_action, confidence }
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import fs from "fs";
import path from "path";

// ─── KNOWLEDGE MINI PACKS ──────────────────────────────────
// Konuya göre sadece ilgili knowledge dosyalarını gönder

const knowledgeCache = {};

function readKnowledge(filename) {
  if (knowledgeCache[filename] !== undefined) return knowledgeCache[filename];
  try {
    const fp = path.join(process.cwd(), "knowledge", filename);
    const content = fs.readFileSync(fp, "utf8");
    knowledgeCache[filename] = content || "";
    return content || "";
  } catch {
    knowledgeCache[filename] = "";
    return "";
  }
}

function buildMiniKnowledge(topic, product) {
  // Her zaman: core rules + pricing (kısa)
  const base = [readKnowledge("CORE_SYSTEM.txt"), readKnowledge("PRICING.txt")].filter(Boolean);

  // Ürüne göre
  if (product === "lazer") base.push(readKnowledge("PRODUCT_LASER.txt"));
  if (product === "atac") base.push(readKnowledge("PRODUCT_ATAC.txt"));

  // Konuya göre ek
  const topicFiles = {
    trust: ["TRUST.txt"],
    shipping: ["SHIPPING.txt"],
    payment: ["PAYMENT.txt"],
    back_text: ["IMAGE_RULES.txt"],
    photo: ["IMAGE_RULES.txt"],
    post_order: ["ORDER_FLOW.txt"],
    product: ["PRODUCT_LASER.txt", "PRODUCT_ATAC.txt"],
  };

  const extras = topicFiles[topic] || [];
  for (const f of extras) {
    const content = readKnowledge(f);
    if (content && !base.includes(content)) base.push(content);
  }

  return base.join("\n\n").substring(0, 4000); // Token limiti için kırp
}

// ─── SHOULD USE AI? ────────────────────────────────────────
// Deterministic kesin sonuç verdiyse AI'ye gitme

export function shouldUseAI(ctx, signals, arbitrationResult) {
  // System message → kesin, AI'ye gitme
  if (signals.system_message) return false;
  // Cancel → kesin
  if (ctx.intent === "cancel_order") return false;
  // Phone detected → kesin
  if (signals.slot_updates?.phone) return false;
  // Address detected → kesin
  if (signals.slot_updates?.address) return false;
  // Photo URL → kesin
  if (signals.slot_updates?.photo) return false;
  // Payment selection with verb → kesin
  if (signals.slot_updates?.payment_method) {
    const hasVerb = /seceyim|seçeyim|olsun|istiyorum|sectim|seçtim|seciyorum|seçiyorum/.test(ctx.norm || "");
    if (hasVerb) return false;
  }
  // Letters (ataç) → kesin
  if (signals.slot_updates?.letters) return false;
  // Price/bargaining → deterministic (AI fiyat kırabilir, pazarlığı kabul edebilir)
  if (ctx.intent === "price" || ctx.intent === "shipping_price") return false;
  if (/\d{3}/.test(ctx.message || "") && /tl|lira|olur mu|yapar|indirim|anlasalim|anlaşalım/i.test(ctx.norm || "")) return false;

  // ═══ AI'YE GİDECEK DURUMLAR ═══

  // Arbitration cevap verdi ama low-confidence (catch-all veya fallback)
  const lowConfidenceRules = new Set(["catch-all", "smalltalk", null]);
  if (lowConfidenceRules.has(arbitrationResult?.meta?.selectedRule)) return true;

  // Fallback'e düştü → AI lazım
  if (!arbitrationResult?.reply?.text || arbitrationResult.meta?.replySource === "model_fallback") return true;

  // Frustration sinyali var → AI daha iyi ton verebilir
  if (signals.complaints?.includes("frustration")) return true;

  // Undecided → AI daha doğal cevap verir
  if (signals.undecided) return true;

  // Back text ile ilgili herhangi bir durum
  if (ctx.intent === "back_text" || ctx.intent === "back_text_info" ||
      ctx.intent === "back_photo_info" || ctx.intent === "back_text_examples") return true;

  // Capability sorusu
  if (signals.questions?.includes("capability_multi_photo")) return true;

  // Payment info (selection değil)
  if (ctx.intent === "payment_info_question") return true;

  // General intent + aktif stage → muhtemelen belirsiz mesaj
  if (ctx.intent === "general" && ctx.fields?.conversation_stage) return true;

  // Complaint
  if (signals.complaints?.length > 0) return true;

  // Greeting → AI daha doğal
  if (ctx.intent === "smalltalk") return true;

  return false;
}

// ─── DETECT TOPIC ──────────────────────────────────────────

function detectTopic(ctx, signals) {
  if (signals.topic_hint) return signals.topic_hint;
  const intent = ctx.intent || "";
  if (intent.includes("trust") || intent.includes("material")) return "trust";
  if (intent.includes("shipping")) return "shipping";
  if (intent.includes("payment")) return "payment";
  if (intent.includes("back_text") || intent.includes("back_photo")) return "back_text";
  if (intent.includes("photo")) return "photo";
  if (intent.includes("post_sale") || intent.includes("cancel")) return "post_order";
  return null;
}

// ─── BUILD AI PROMPT ───────────────────────────────────────

function buildPrompt(message, stage, product, filledSlots, missingSlots, lastBotReply, lastIntent, knowledge) {
  return `Sen Yudum Jewels kuyumculuk markasının satış asistanısın. Müşteriye kısa, sıcak, doğal ve profesyonel cevap vereceksin.

KURALLAR:
- Kısa cevap ver. Maksimum 2-3 cümle.
- Sıcak ve samimi ol. "Efendim" kullan. Emoji az kullan (en fazla 1).
- Fiyat bilgisi: Lazer kolye EFT 599 TL, kapıda 649 TL. Ataç kolye EFT 499 TL, kapıda 549 TL.
- Kargo: PTT Kargo, ücretsiz, İstanbul 1-2 gün, diğer 2-3 gün.
- Malzeme: 14 ayar altın kaplama paslanmaz çelik. Kararma solma yapmaz.
- Arka yazı: Ücretsiz. Müşteri isterse isim, tarih, kısa not yazılabilir.
- Arka fotoğraf: Ücret farkı olmadan yapılabilir.
- WhatsApp: 0505 471 35 45
- Konum: İstanbul Eminönü

YASAK:
- Ödeme yöntemi SEÇME. "EFT seçtim efendim" gibi cümleler YASAK.
- Telefon/adres/isim bilgisi KAYDETME kararı verme.
- Sipariş tamamlandı DEME.
- Fiyat UYDURMA. Fiyatlar SABİT: Lazer EFT 599, kapıda 649. Ataç EFT 499, kapıda 549.
- İNDİRİM YAPMA, fiyat KIRMA. Müşteri pazarlık yaparsa "Fiyatlarımız sabittir efendim" de.
- "Tabi efendim" diyerek fiyat teklifini KABUL ETME. Fiyat konusunda taviz verme.
- should_commit_slot'u TRUE yapma. HER ZAMAN false olacak.

BAĞLAM:
- Ürün: ${product || "belirlenmedi"}
- Aşama: ${stage || "başlangıç"}
- Dolu slotlar: ${JSON.stringify(filledSlots)}
- Eksik slotlar: ${JSON.stringify(missingSlots)}
- Son bot cevabı: "${(lastBotReply || "").substring(0, 120)}"
- Son intent: ${lastIntent || "yok"}

BİLGİ:
${knowledge}

MÜŞTERİ MESAJI: "${message}"

SADECE JSON döndür:
{"reply": "...", "intent_label": "...", "topic": "...", "should_commit_slot": false, "next_action": "none|ask_payment|ask_address|ask_photo|handoff", "confidence": 0.0-1.0}`;
}

// ─── CALL AI ───────────────────────────────────────────────

export async function getAIReply(ctx, signals, filledSlots, missingSlots) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1";
  const model = process.env.AI_REPLY_MODEL || process.env.DEEPSEEK_MODEL || "deepseek-chat";

  if (!apiKey) {
    console.log("[AI_SKIP] No API key found. Set DEEPSEEK_API_KEY env variable.");
    return null;
  }

  const topic = detectTopic(ctx, signals);
  const knowledge = buildMiniKnowledge(topic, ctx.product);

  const prompt = buildPrompt(
    ctx.message,
    ctx.fields?.conversation_stage || "",
    ctx.product || "",
    filledSlots,
    missingSlots,
    ctx.fields?.ai_reply || "",
    ctx.fields?.last_intent || "",
    knowledge
  );

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 200,
        messages: [
          { role: "system", content: "Sen bir Türkçe satış asistanısın. SADECE JSON döndür." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      console.log("[AI_HTTP_ERROR]", JSON.stringify({ status: response.status, statusText: response.statusText }));
      return null;
    }

    const data = await response.json();

    // Token logging
    if (data?.usage) {
      console.log("[TOKEN]", JSON.stringify({
        source: "ai_reply",
        model,
        prompt_tokens: data.usage.prompt_tokens || 0,
        completion_tokens: data.usage.completion_tokens || 0,
        total_tokens: data.usage.total_tokens || 0,
        ts: new Date().toISOString(),
      }));
    }

    const text = data?.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // GÜVENLIK: should_commit_slot her zaman false olmalı
    parsed.should_commit_slot = false;

    return {
      reply: parsed.reply || null,
      intent_label: parsed.intent_label || "general",
      topic: parsed.topic || topic,
      should_commit_slot: false, // ZORUNLU false
      next_action: parsed.next_action || "none",
      confidence: parsed.confidence || 0,
      _tokenUsage: data?.usage ? {
        source: "ai_reply", model,
        prompt_tokens: data.usage.prompt_tokens || 0,
        completion_tokens: data.usage.completion_tokens || 0,
        total_tokens: data.usage.total_tokens || 0,
      } : null,
    };
  } catch (err) {
    console.log("[AI_FETCH_ERROR]", err?.message || String(err));
    return null; // AI fail → deterministic devam eder
  }
}

// ─── POLICY GUARD ──────────────────────────────────────────
// AI çıktısını denetler. Slot commit engelenir. Dolu slot tekrar sorulmaz.

export function applyPolicyGuard(aiResult, filledSlots, missingSlots) {
  if (!aiResult || !aiResult.reply) return null;

  let reply = aiResult.reply;

  // HARD BLOCK: AI slot commit öneriyorsa engelle
  if (aiResult.should_commit_slot) {
    aiResult.should_commit_slot = false;
  }

  // next_action kontrolü: AI'nin önerdiği action geçerli mi?
  const validActions = new Set(["none", "ask_payment", "ask_address", "ask_photo", "handoff"]);
  if (!validActions.has(aiResult.next_action)) {
    aiResult.next_action = "none";
  }

  // next_action'a göre reply'e ek yapma — bunu engine yapacak

  return aiResult;
}
