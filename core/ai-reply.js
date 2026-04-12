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

  // ═══ BİLGİ SORULARI → AI (policy-locked) ═══
  // AI geniş alanda çalışır ama fact-block ve final guard ile kontrol edilir
  if (ctx.intent === "material_question" || ctx.intent === "trust") return true;
  if (ctx.intent === "chain_question" || ctx.intent === "chain") return true;
  if (ctx.intent === "photo_question") return true;
  if (ctx.intent === "back_text" || ctx.intent === "back_text_info" ||
      ctx.intent === "back_photo_info" || ctx.intent === "back_text_examples") return true;
  if (ctx.intent === "payment_info_question") return true;
  if (ctx.intent === "example_request") return true;
  if (ctx.intent === "post_sale") return true;
  if (ctx.intent === "location") return true;
  if (ctx.intent === "shipping") return true;
  // Photo reference/change — deterministic handler var, AI'ye gerek yok
  if (ctx.intent === "photo_reference") return false;
  if (ctx.intent === "photo_change_request") return false;
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
  // ═══ TOPIC FACT BLOCKS — intent'e göre dar bilgi ═══
  const factBlocks = {
    chain: product === "lazer" 
      ? `ZİNCİR BİLGİSİ (LAZER KOLYE):
Standart zincir uzunluğu 60 cm'dir. Fiyata dahildir.
Zincir uzatma YOKTUR. "Uzatılabilir", "daha uzun yapılabilir" gibi ifadeler YASAKTIR.
Zincir model seçeneği YOKTUR. Tek tip standart zincir gönderilir.
45 cm YAZMA. Doğru bilgi: 60 cm.

ÖZEL DURUMLAR (SADECE müşteri sorarsa):
- Müşteri "erkek için" derse → "Erkek için 50 cm gümüş zincirimiz mevcut efendim"
- Müşteri "kısa zincir" isterse → "Tabi efendim, kısa zincir gönderelim"
- Bu özel durumlar dışında HER ZAMAN 60 cm söyle.`
      : `ZİNCİR BİLGİSİ (ATAÇ KOLYE):
Standart zincir uzunluğu 50 cm'dir.
Uzatma yapılabilir: maksimum 70 cm, +50 TL ek ücret.
Tek zincir modeli vardır.`,
    
    material: `MATERYAL BİLGİSİ:
- 14 ayar altın kaplama paslanmaz çelik
- Kararma, solma yapmaz
- Duşta, denizde kullanılabilir
- Altın kaplama ve gümüş kaplama renk seçeneği var
- Gerçek altın veya gümüş DEĞİLDİR`,
    
    shipping: `KARGO BİLGİSİ:
- PTT Kargo ile gönderim, kargo ÜCRETSİZ
- İstanbul: 1-2 iş günü
- Diğer şehirler: 2-3 iş günü
- Kesin tarih verme, "genellikle" kullan
- "Yarın gelir", "bugün çıkar" gibi söz verme`,
    
    payment: `ÖDEME BİLGİSİ:
- EFT/Havale veya kapıda ödeme
- Kapıda ödeme SADECE NAKİT. Kredi kartı/banka kartı ile kapıda ödeme YOKTUR.
- Taksit seçeneği YOKTUR
- IBAN bilgisini sadece müşteri EFT seçip IBAN isterse ver. Aksi halde IBAN verme.`,
    
    trust: `GÜVEN BİLGİSİ:
- Garanti: Kararma, solma, kaplama atma durumunda değişim yapılır
- "Ne kadar süre garanti" sorusuna: Ürünlerimiz garantili olarak gönderilmektedir
- Kapıda ödeme var (güven için)
- Instagram'da müşteri yorumları/hikayeleri var`,
    
    photo: `FOTOĞRAF BİLGİSİ:
- Vesikalık olmak zorunda değil, istediği fotoğrafı gönderebilir
- Eski/bulanık foto da olabilir ama net olması tercih edilir
- Tek kolyeye birden fazla fotoğraf yapılabilir (ücret farkı yok)
- Ön yüze bir foto, arka yüze başka foto yapılabilir (ücret farkı yok)`,
    
    back_text: `ARKA YÜZ BİLGİSİ:
- Arka yüze yazı veya fotoğraf eklenebilir, ÜCRETSİZ
- İsim, tarih, kısa not, dua yazılabilir
- Bot arka yazı sormaz, müşteri isterse yapar
- "Genelde ne yazılır" sorusuna: isim, tarih, kısa dua gibi notlar`,
  };

  // Intent'e göre fact block seç
  const topicMap = {
    chain_question: "chain", chain: "chain",
    material_question: "material", trust: "trust",
    shipping: "shipping", shipping_price: "shipping",
    payment: "payment", payment_info_question: "payment", payment_confirmation: "payment",
    photo_question: "photo", photo_suitability_question: "photo",
    back_text_info: "back_text", back_text_examples: "back_text", back_photo_info: "photo",
  };
  
  const topicKey = topicMap[lastIntent] || "";
  const factBlock = factBlocks[topicKey] || "";
  
  // Hard-fact konularda full knowledge VERME — sadece fact block yeterli
  // Bu knowledge bleed'i önler (45cm/60cm karışması gibi)
  const hardFactTopics = ["chain", "material", "shipping", "payment", "trust"];
  const useFullKnowledge = !hardFactTopics.includes(topicKey);

  return `Sen Yudum Jewels kuyumculuk markasının Instagram satış asistanısın.

═══ ANAYASA — İHLAL EDİLEMEZ KURALLAR ═══

1. BİLGİ UYDURMA YASAKTIR. Sadece aşağıdaki bilgileri kullan.
2. Cevabın sonuna "fotoğrafınızı bekliyorum/gönderin" ASLA ekleme. Müşteri ne sorduysa SADECE onu cevapla.
3. WhatsApp numarasını müşteri açıkça sormadıkça ASLA verme.
4. Lazer kolyede zincir uzatma YOKTUR. "Uzatılabilir" deme.
5. Zincir uzunluğu lazer için 60 cm. 45 cm ASLA yazma.
6. Fiyat uydurma. Lazer: EFT 599, kapıda 649. Ataç: EFT 499, kapıda 549.
7. Kapıda ödeme SADECE NAKİT. Kart ile kapıda ödeme yok.
8. Maksimum 2 kısa cümle. Uzun cevap yazma.
9. Cevabın sonuna tek bir 😊 emoji koy. Başka emoji kullanma.
10. Sipariş tamamlandı deme, indirim yapma, fiyat kırma.

═══ CEVAP KURALI ═══
Müşteri yan soru sorduysa (materyal, zincir, kargo, güven, arka yazı, foto bilgisi):
→ SADECE o soruyu cevapla
→ Sonuna "fotoğraf gönderin" veya "ödeme yapın" gibi yönlendirme EKLEME
→ Kısa ve net cevap ver, başka konu açma

═══ FACT BLOCK ═══
${factBlock || "Genel bilgi: Lazer kolye EFT 599, kapıda 649. Ataç kolye EFT 499, kapıda 549. Materyal: 14 ayar altın kaplama paslanmaz çelik. Kargo ücretsiz, PTT ile."}

═══ BAĞLAM ═══
Ürün: ${product || "belirlenmedi"}
Aşama: ${stage || "başlangıç"}
Dolu: ${JSON.stringify(filledSlots)}
Eksik: ${JSON.stringify(missingSlots)}
Son bot: "${(lastBotReply || "").substring(0, 80)}"
Son intent: ${lastIntent || "yok"}

═══ BİLGİ DOSYASI ═══
${useFullKnowledge ? knowledge : "(Bu konu için sadece yukarıdaki FACT BLOCK bilgilerini kullan.)"}

MÜŞTERİ: "${message}"

═══ İKİ AŞAMALI CEVAP ═══
Önce analiz et, sonra cevap yaz. Tek JSON döndür:

{
  "analysis": {
    "intent": "chain_question|material|shipping|payment|photo|trust|smalltalk|general|...",
    "topic": "chain|material|shipping|payment|photo|back_text|trust|general",
    "risk_level": "low|medium|high",
    "must_use_fact_block": true/false,
    "should_add_next_step": false,
    "reason": "müşteri zincir sordu, sadece zincir bilgisi ver"
  },
  "reply": "...",
  "should_commit_slot": false,
  "next_action": "none|ask_payment|ask_address|ask_photo|handoff",
  "confidence": 0.0-1.0
}

KURALLAR:
- risk_level "high" ise must_use_fact_block true olmalı
- should_add_next_step false ise cevabın sonuna "fotoğraf gönderin" gibi yönlendirme EKLEME
- Zincir, materyal, fiyat, ödeme, kargo konuları risk_level "high"
- reply kısa olsun, maksimum 2 cümle
- Cevabın sonuna 😊 koy`;
}

// ─── CALL AI ───────────────────────────────────────────────

export async function getAIReply(ctx, signals, filledSlots, missingSlots) {
  // AI Provider selection: ANTHROPIC (Claude) veya DEEPSEEK/OPENAI
  const provider = process.env.AI_PROVIDER || "deepseek"; // "anthropic" veya "deepseek"
  
  const topic = detectTopic(ctx, signals);
  const knowledge = buildMiniKnowledge(topic, ctx.product);

  const prompt = buildPrompt(
    ctx.message,
    ctx.fields?.conversation_stage || "",
    ctx.product || "",
    filledSlots,
    missingSlots,
    ctx.fields?.ai_reply || "",
    ctx.intent || ctx.fields?.last_intent || "",  // Current intent öncelikli
    knowledge
  );

  try {
    let aiText = null;
    let model = "";
    let usage = {};

    if (provider === "anthropic") {
      // ═══ ANTHROPIC / CLAUDE API ═══
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) { console.log("[AI_SKIP] No ANTHROPIC_API_KEY found."); return null; }
      
      model = process.env.AI_REPLY_MODEL || "claude-sonnet-4-20250514";
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 200,
          temperature: 0.3,
          system: "Sen bir Türkçe satış asistanısın. SADECE JSON döndür.",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        console.log("[AI_HTTP_ERROR]", JSON.stringify({ status: response.status, provider: "anthropic" }));
        return null;
      }

      const data = await response.json();
      usage = { prompt_tokens: data.usage?.input_tokens || 0, completion_tokens: data.usage?.output_tokens || 0, total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) };
      aiText = data.content?.[0]?.text || "";
      
    } else {
      // ═══ DEEPSEEK / OPENAI COMPATIBLE API ═══
      const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
      const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1";
      model = process.env.AI_REPLY_MODEL || process.env.DEEPSEEK_MODEL || "deepseek-chat";

      if (!apiKey) { console.log("[AI_SKIP] No API key found. Set DEEPSEEK_API_KEY env variable."); return null; }

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
      usage = data.usage || {};
      aiText = data.choices?.[0]?.message?.content || "";
    }

    // Token logging
    if (usage.prompt_tokens || usage.total_tokens) {
      console.log("[TOKEN]", JSON.stringify({ source: "ai_reply", model, ...usage }));
    }

    // Bug fix: aiText kullan, data.choices değil (Anthropic'te choices yok)
    const text = aiText || "";
    const clean = text.replace(/```json|```/g, "").trim();
    
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      // JSON parse fail — raw text'ten reply çıkarmaya çalış
      console.log("[AI_PARSE_FAIL]", clean.substring(0, 100));
      const replyMatch = clean.match(/"reply"\s*:\s*"([^"]+)"/);
      if (replyMatch) {
        parsed = { reply: replyMatch[1], should_commit_slot: false, next_action: "none", confidence: 0.5 };
      } else {
        return null;
      }
    }

    // GÜVENLIK: should_commit_slot her zaman false olmalı
    parsed.should_commit_slot = false;

    return {
      reply: parsed.reply || null,
      intent_label: parsed.analysis?.intent || parsed.intent_label || "general",
      topic: parsed.analysis?.topic || parsed.topic || topic,
      analysis: parsed.analysis || null,
      should_commit_slot: false, // ZORUNLU false
      next_action: parsed.next_action || "none",
      confidence: parsed.confidence || 0,
      _tokenUsage: usage ? {
        source: "ai_reply", model,
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
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

  // ═══ FINAL GUARD — Yasaklı bilgi kontrolü ═══
  const lower = reply.toLowerCase();
  
  // Lazer'de zincir uzatma yok
  if (/zincir.*(uzat|uzatıl|uzatabil)/i.test(reply) && filledSlots?.product === "lazer") {
    console.log("[GUARD] BLOCKED: lazer zincir uzatma");
    // Cümleyi sil — noktalı veya noktasız
    reply = reply.replace(/[^.]*zincir.*(uzat|uzatıl|uzatabil)[^.]*/gi, "").trim();
    if (!reply || reply.length < 5) reply = "Lazer kolyede zincir uzatma bulunmamaktadır efendim 😊";
  }
  
  // Yanlış zincir uzunluğu (lazer 45cm) — sayı ve yazıyla
  if (/45\s*cm|kırk\s*beş\s*sant/i.test(reply)) {
    console.log("[GUARD] FIXED: 45cm → 60cm");
    reply = reply.replace(/45\s*cm/gi, "60 cm").replace(/kırk\s*beş\s*sant[a-zıöüçşğ]*/gi, "60 cm");
  }
  
  // "biraz daha uzun yapılabilir" — lazer'de uzatma yok
  if (filledSlots?.product === "lazer" && /daha uzun|uzatabil|uzatıl|uzunlugu artir|uzunluğu artır/i.test(reply)) {
    console.log("[GUARD] BLOCKED: lazer indirect uzatma");
    reply = reply.replace(/[^.]*(?:daha uzun|uzatabil|uzatıl|uzunlugu artir|uzunluğu artır)[^.]*/gi, "").trim();
    if (!reply || reply.length < 5) reply = "Lazer kolyede zincir uzatma bulunmamaktadır efendim 😊";
  }
  
  // WhatsApp numarası müşteri sormadan verilmemeli
  if (/whatsapp|wa\.me|505\s*471|takip için|takip numaramız|iletişim hattımız/i.test(reply)) {
    console.log("[GUARD] BLOCKED: unsolicited WhatsApp/contact");
    reply = reply.replace(/[^.]*(?:whatsapp|wa\.me|takip için|takip numaramız|iletişim hattımız|505\s*471)[^.]*/gi, "").trim();
    if (!reply || reply.length < 5) reply = "Tabi efendim 😊";
  }
  
  // "Fotoğrafınızı bekliyorum/gönderebilirsiniz" — yan soru cevaplarında gereksiz
  // Sadece reply'in son kısmında varsa kaldır
  const fotoReminder = /[.,]?\s*(fotoğrafınızı|foto.*gönder|foto.*bekl|fotoğraf.*ilet|lazer kolye için fotoğrafınızı)[^.]*[.!]?\s*$/i;
  if (fotoReminder.test(reply) && reply.length > 50) {
    const cleaned = reply.replace(fotoReminder, "").trim();
    if (cleaned.length > 10) {
      console.log("[GUARD] TRIMMED: foto reminder removed");
      reply = cleaned;
      if (!reply.endsWith("😊") && !reply.endsWith(".") && !reply.endsWith("!")) reply += " 😊";
    }
  }
  
  // Uydurma fiyat kontrolü (dosyada olmayan fiyatlar)
  const prices = reply.match(/(\d{3,4})\s*TL/g) || [];
  const validPrices = new Set(["499","549","599","649","1000","1100","1400","1500","1750","2000"]);
  for (const p of prices) {
    const num = p.match(/(\d+)/)[1];
    if (!validPrices.has(num) && !["50","300"].includes(num)) {
      console.log("[GUARD] BLOCKED: invalid price", num);
      // Fiyat cevabını tamamen güvenli versiyonla değiştir
      if (filledSlots?.product === "lazer") {
        reply = "EFT / Havale ile 599 TL, kapıda ödeme ile 649 TL'dir efendim 😊";
      } else if (filledSlots?.product === "atac") {
        reply = "EFT / Havale ile 499 TL, kapıda ödeme ile 549 TL'dir efendim 😊";
      }
      break;
    }
  }

  aiResult.reply = reply;
  
  // Katman F — AI karar logu
  if (aiResult.analysis) {
    console.log("[AI_ANALYSIS]", JSON.stringify({
      topic: aiResult.analysis?.topic,
      risk: aiResult.analysis?.risk_level,
      fact_block: aiResult.analysis?.must_use_fact_block,
      next_step: aiResult.analysis?.should_add_next_step,
    }));
  }
  
  return aiResult;
}
