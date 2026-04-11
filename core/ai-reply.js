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
  // ═══ DETERMINISTIC'TE KALACAKLAR — AI'ye gitmeyecek ═══

  // System message → kesin deterministic
  if (signals.system_message) return false;
  // Cancel → deterministic (handoff)
  if (ctx.intent === "cancel_order") return false;
  // Slot commits → kesin deterministic (AI bunları bozabilir)
  if (signals.slot_updates?.phone) return false;
  if (signals.slot_updates?.address) return false;
  if (signals.slot_updates?.photo) return false;
  if (signals.slot_updates?.letters) return false;
  // Payment selection with verb → kesin deterministic
  if (signals.slot_updates?.payment_method) {
    const hasVerb = /seceyim|seçeyim|olsun|istiyorum|sectim|seçtim|seciyorum|seçiyorum|yapacagim|yapacağım|yapicam|yapıcam/.test(ctx.norm || "");
    if (hasVerb) return false;
  }
  // Price → deterministic (AI fiyat kırabilir, pazarlığı kabul edebilir)
  if (ctx.intent === "price") return false;
  // Shipping price → deterministic (sabit bilgi: kargo dahil)
  if (ctx.intent === "shipping_price") return false;
  // Pazarlık → deterministic
  if (/\d{3}/.test(ctx.message || "") && /tl|lira|olur mu|yapar|indirim|anlasalim|anlaşalım/i.test(ctx.norm || "")) return false;
  // ACK (kısa onay) → deterministic
  if (ctx.intent === "ack") return false;
  // Payment confirmation (dekont attım) → deterministic
  if (ctx.intent === "payment_confirmation") return false;
  // Name detection → deterministic
  if (ctx.intent === "name_only") return false;
  // Phone detection → deterministic
  if (ctx.intent === "phone") return false;
  // Address detection → deterministic
  if (ctx.intent === "address") return false;
  // Product entry (lazer kolye / ataç kolye seçimi) → deterministic
  if (arbitrationResult?.meta?.selectedRule === "product-entry") return false;
  // Photo received → deterministic
  if (ctx.intent === "photo" && signals.slot_updates?.photo) return false;
  // Order start commit → deterministic
  if (ctx.intent === "order_start" && arbitrationResult?.reply?.reply_class === "product_entry") return false;

  // ═══ AI'YE GİDECEK DURUMLAR — conversational her şey ═══

  // Material / trust soruları
  if (ctx.intent === "material_question" || ctx.intent === "trust") return true;
  // Chain / zincir soruları
  if (ctx.intent === "chain_question" || ctx.intent === "chain") return true;
  // Photo question (nasıl foto, vesikalık mı)
  if (ctx.intent === "photo_question") return true;
  // Back text / back photo soruları
  if (ctx.intent === "back_text" || ctx.intent === "back_text_info" ||
      ctx.intent === "back_photo_info" || ctx.intent === "back_text_examples") return true;
  // Payment info (taksit var mı, EFT/kapıda farkı)
  if (ctx.intent === "payment_info_question") return true;
  // Example request
  if (ctx.intent === "example_request") return true;
  // Post-sale
  if (ctx.intent === "post_sale") return true;
  // Location
  if (ctx.intent === "location") return true;
  // Shipping (kargo kaç gün)
  if (ctx.intent === "shipping") return true;
  // Frustration / complaint
  if (signals.complaints?.length > 0) return true;
  // Undecided → AI daha doğal cevap verir
  if (signals.undecided) return true;
  // Capability sorusu
  if (signals.questions?.includes("capability_multi_photo")) return true;
  // Smalltalk → AI daha doğal
  if (ctx.intent === "smalltalk") return true;
  // General intent → muhtemelen belirsiz mesaj, AI cevaplasın
  if (ctx.intent === "general") return true;
  // Detail request
  if (ctx.intent === "detail_request") return true;
  // Order start (intent ama commit değil)
  if (ctx.intent === "order_start") return true;

  // Fallback: arbitration cevap veremediyse → AI
  if (!arbitrationResult?.reply?.text) return true;

  // Diğer tüm durumlar → yine AI'ye gönder (güvenli taraf)
  return true;
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

CEVAP FORMATI:
- Instagram DM'de okunacak. Satırları kısa tut.
- EMOJI KULLANMA. Hiç emoji olmasın. Ne smiley ne kalp ne ok.
- Çift satır atlama YAPMA. Tek satır atla.
- Maksimum 2-3 kısa cümle. Uzun paragraf YAZMA.
- Türkçe karakterleri doğru kullan: ğ, ü, ş, ı, ö, ç, İ.
- "efendim" kelimesini kullan, sıcak ol.

SADECE BİR SONRAKİ ADIM SOR:
- Birden fazla şey aynı anda sorma. Tek bir sonraki adım belirt.
- Fotoğraf eksikse SADECE fotoğraf iste. Ödeme sorma.
- Ödeme eksikse SADECE ödeme sor. Adres sorma.
- Adres eksikse SADECE adres iste.

ÖZEL DURUMLAR:
- Müşteri "bundan istiyorum", "bu olsun", "bunu yapın" derse: "Tabi efendim" de ve sadece bir sonraki eksik adımı söyle.
- Müşteri fotoğraf gönderdiğini söylüyorsa: "Fotoğrafınızı aldım efendim" de. "Bilgilerinizi aldım" DEME.
- Müşteri video gönderdi diyorsa: "Tamamdır efendim, videonuz alınmıştır" de.
- Müşteri konum/yer soruyorsa: "İstanbul Eminönü'ndeyiz efendim" de.
- Arka yazı SORUSU gelirse bilgi ver ama back_text_status'u received YAPMA. Soru sormak içerik vermek değildir.

BİLGİLER:
- Fiyat: Lazer kolye EFT 599 TL, kapıda 649 TL. Ataç kolye EFT 499 TL, kapıda 549 TL.
- Kargo: PTT Kargo, ücretsiz, İstanbul 1-2 gün, diğer 2-3 gün.
- Malzeme: 14 ayar altın kaplama paslanmaz çelik. Kararma solma yapmaz.
- Arka yazı: Ücretsiz. İsim, tarih, kısa not yazılabilir.
- Arka fotoğraf: Ücret farkı olmadan yapılabilir.
- WhatsApp: 0505 471 35 45
- Konum: İstanbul Eminönü

YASAK:
- Ödeme yöntemi SEÇME.
- Telefon/adres/isim bilgisi KAYDETME kararı verme.
- Sipariş tamamlandı DEME.
- Fiyat UYDURMA. Fiyatlar SABİT.
- İNDİRİM YAPMA, fiyat KIRMA.
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
