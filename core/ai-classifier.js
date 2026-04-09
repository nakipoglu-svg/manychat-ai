// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI CLASSIFIER — Hibrit ambiguity resolver
// 
// Deterministik parser net karar veremediğinde AI'ye 
// SADECE sınıflandırma yaptırır. AI cevap yazmaz.
// 
// Çıktı: { label, confidence, topic }
// Giriş: mesaj + stage + slotlar + son bot cevabı
//
// KURAL: AI sadece sinyal üretir, son kararı policy engine verir.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── LABELS ────────────────────────────────────────────────

export const LABELS = {
  BACK_TEXT_QUESTION: "back_text_question",
  BACK_TEXT_CONTENT: "back_text_content",
  CAPABILITY_QUESTION: "capability_question",
  UNDECIDED: "undecided",
  FRUSTRATION: "frustration",
  COMPLAINT_ALREADY_SENT: "complaint_already_sent",
  COMPLAINT_NO_RESPONSE: "complaint_no_response",
  CORRECTION: "correction",
  PAYMENT_INFO: "payment_info",
  PAYMENT_SELECTION: "payment_selection",
  TRUST_QUESTION: "trust_question",
  SHIPPING_QUESTION: "shipping_question",
  PHOTO_QUESTION: "photo_question",
  ORDER_INQUIRY: "order_inquiry",
  GREETING: "greeting",
  CONFIRM_ACK: "confirm_ack",
  SKIP: "skip",
  GENERAL: "general",
};

// ─── SHOULD CLASSIFY? ──────────────────────────────────────
// Deterministic parser zaten net karar verdiyse AI'ye gitme

export function shouldClassify(ctx, signals) {
  const { norm, intent } = ctx;
  const stage = ctx.fields?.conversation_stage || "";

  // Deterministic parser güçlü sinyal veriyorsa → AI'ye gerek yok
  // Phone detected → kesin
  if (signals.slot_updates?.phone) return false;
  // Address detected → kesin
  if (signals.slot_updates?.address) return false;
  // Photo URL → kesin
  if (signals.slot_updates?.photo) return false;
  // Payment selection with verb → kesin
  if (signals.slot_updates?.payment_method) {
    const hasSelectionVerb = /seceyim|seçeyim|olsun|istiyorum|sectim|seçtim|seciyorum|seçiyorum/.test(norm);
    if (hasSelectionVerb) return false;
  }
  // Cancel → kesin
  if (intent === "cancel_order") return false;
  // System message → kesin
  if (signals.system_message) return false;

  // GRİ ALANLAR — AI gerekli:

  // waiting_back_text'te question/content/undecided ayrımı
  if (stage === "waiting_back_text" && !signals.undecided && !signals.ack) {
    // Deterministic zaten question olarak işaretlediyse OK
    if (signals.questions.length > 0) return false;
    // Ama back_text content olarak kaydettiyse → AI'ye danış
    if (signals.slot_updates?.back_text) return true;
    // Genel belirsizlik
    if (intent === "general" || intent === "back_text") return true;
  }

  // "kaç kişi" benzeri ama keyword'e takılmamış capability soruları
  if (stage === "waiting_photo" && intent === "general" && norm.length > 10) {
    return true;
  }

  // Payment keyword var ama selection mı info mı belli değil
  if (/eft|havale|kapida|kapıda|nakit/.test(norm) && /nedir|nasil|fark|hangisi|arasinda/.test(norm)) {
    return true;
  }

  // Frustration olabilir ama keyword'e takılmamış
  if (norm.length > 20 && /yahu|yav|allah|neden|niye|hala|bos|boş|anlami|anlamı/.test(norm)) {
    return true;
  }

  // Kısa belirsiz mesaj + stage var
  if (norm.length > 3 && norm.length < 40 && intent === "general" && stage) {
    return true;
  }

  return false;
}

// ─── BUILD PROMPT ──────────────────────────────────────────

export function buildClassifierPrompt(message, stage, lastBotReply, filledSlots, product) {
  return `Sen bir Türkçe mesaj sınıflandırıcısın. Bir kuyumculuk sipariş botunun müşteri mesajını sınıflandırıyorsun.

CONTEXT:
- Ürün: ${product || "belirlenmedi"}
- Aşama: ${stage || "başlangıç"}
- Dolu slotlar: ${JSON.stringify(filledSlots)}
- Son bot cevabı: "${(lastBotReply || "").substring(0, 150)}"

MÜŞTERİ MESAJI: "${message}"

Bu mesajı aşağıdaki etiketlerden BİRİ ile sınıflandır:

- back_text_question: Arka yüze ne yazılacağını SORUYOR (örnek istiyor, ne yazılır diyor, sığar mı diyor)
- back_text_content: Arka yüze yazılacak gerçek içerik VERİYOR (isim, tarih, mesaj)
- capability_question: Botun/ürünün kapasitesini soruyor (kaç kişi, kaç foto, birleştirme)
- undecided: Kararsız, karar veremiyor, düşünecek
- frustration: Sinirli, kızgın, bot'a kızmış, insan istiyor
- complaint_already_sent: Bilgiyi zaten verdiğini söylüyor
- complaint_no_response: Cevap gelmediğinden şikayet ediyor
- correction: Önceki bilgiyi düzeltmek istiyor
- payment_info: Ödeme hakkında BİLGİ soruyor (fark nedir, nasıl oluyor)
- payment_selection: Ödeme yöntemi SEÇİYOR (EFT olsun, kapıda istiyorum)
- trust_question: Kalite/garanti/malzeme sorusu
- shipping_question: Kargo/teslimat sorusu
- photo_question: Fotoğraf gönderimi hakkında soru
- order_inquiry: Sipariş durumu sorusu
- greeting: Selamlama
- confirm_ack: Onay/kabul (tamam, olur, evet)
- skip: Geç/istemiyorum
- general: Hiçbirine uymayan

SADECE JSON döndür, başka bir şey yazma:
{"label": "...", "confidence": 0.0-1.0, "topic": "..."}`;
}

// ─── CALL AI ───────────────────────────────────────────────

export async function classifyMessage(message, stage, lastBotReply, filledSlots, product) {
  try {
    const prompt = buildClassifierPrompt(message, stage, lastBotReply, filledSlots, product);

    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1";
    const model = process.env.CLASSIFIER_MODEL || process.env.DEEPSEEK_MODEL || "deepseek-chat";

    if (!apiKey) {
      return { label: LABELS.GENERAL, confidence: 0, topic: null, error: "no_api_key" };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 80,
        messages: [
          { role: "system", content: "Sen bir Türkçe mesaj sınıflandırıcısın. SADECE JSON döndür, başka hiçbir şey yazma." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      return { label: LABELS.GENERAL, confidence: 0, topic: null, error: "api_error_" + response.status };
    }

    const data = await response.json();
    
    // ═══ TOKEN USAGE LOGGING ═══
    if (data?.usage) {
      const u = data.usage;
      console.log(JSON.stringify({
        _type: "token_usage",
        source: "ai_classifier",
        model,
        prompt_tokens: u.prompt_tokens || 0,
        completion_tokens: u.completion_tokens || 0,
        total_tokens: u.total_tokens || 0,
        cache_read_tokens: u.prompt_cache_read_tokens || 0,
        cache_write_tokens: u.prompt_cache_write_tokens || 0,
        ts: new Date().toISOString(),
      }));
    }
    
    const text = data?.choices?.[0]?.message?.content || "";
    
    // Parse JSON
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      label: parsed.label || LABELS.GENERAL,
      confidence: parsed.confidence || 0,
      topic: parsed.topic || null,
    };
  } catch (err) {
    return { label: LABELS.GENERAL, confidence: 0, topic: null, error: err?.message || "parse_error" };
  }
}

// ─── APPLY CLASSIFICATION ──────────────────────────────────
// AI sınıflandırma sonucunu signals/intent'e çevir
// KURAL: AI sadece sinyal üretir, slot commit YAPMAZ

export function applyClassification(result, signals, ctx) {
  if (!result || result.confidence < 0.7) return; // Düşük güven → ignore

  const label = result.label;

  switch (label) {
    case LABELS.BACK_TEXT_QUESTION:
      // back_text content olarak kaydedilmişse geri al
      if (signals.slot_updates?.back_text) {
        delete signals.slot_updates.back_text;
      }
      if (!signals.questions.includes("back_text_info")) {
        signals.questions.push("back_text_info");
      }
      signals._aiLabel = label;
      break;

    case LABELS.BACK_TEXT_CONTENT:
      // Zaten content olarak kaydedilmişse → doğru, dokunma
      signals._aiLabel = label;
      break;

    case LABELS.CAPABILITY_QUESTION:
      if (!signals.questions.includes("capability_multi_photo")) {
        signals.questions.push("capability_multi_photo");
      }
      signals._aiLabel = label;
      break;

    case LABELS.UNDECIDED:
      signals.undecided = true;
      if (signals.slot_updates?.back_text) {
        delete signals.slot_updates.back_text;
      }
      signals._aiLabel = label;
      break;

    case LABELS.FRUSTRATION:
      if (!signals.complaints.includes("frustration")) {
        signals.complaints.push("frustration");
      }
      signals._aiLabel = label;
      break;

    case LABELS.COMPLAINT_ALREADY_SENT:
      if (!signals.complaints.includes("already_sent")) {
        signals.complaints.push("already_sent");
      }
      signals._aiLabel = label;
      break;

    case LABELS.COMPLAINT_NO_RESPONSE:
      if (!signals.complaints.includes("no_response")) {
        signals.complaints.push("no_response");
      }
      signals._aiLabel = label;
      break;

    case LABELS.PAYMENT_INFO:
      // Payment selection olarak kaydedilmişse geri al
      if (signals.slot_updates?.payment_method) {
        delete signals.slot_updates.payment_method;
      }
      if (!signals.questions.includes("payment_info")) {
        signals.questions.push("payment_info");
      }
      signals._aiLabel = label;
      break;

    case LABELS.CORRECTION:
      if (signals.corrections.length === 0) {
        signals.corrections.push("change_unknown");
      }
      signals._aiLabel = label;
      break;

    case LABELS.TRUST_QUESTION:
      signals.topic_hint = "trust";
      signals._aiLabel = label;
      break;

    case LABELS.SHIPPING_QUESTION:
      signals.topic_hint = "shipping";
      signals._aiLabel = label;
      break;

    default:
      signals._aiLabel = label;
      break;
  }
}
