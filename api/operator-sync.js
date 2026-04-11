// Operator Sync — Her 2 dakikada Kommo'dan aktif lead'lerin son mesajlarını tarar
// Operatör mesajı varsa state güncellemesi yapar
const T = process.env.KOMMO_TOKEN || "";
const API = process.env.KOMMO_API_BASE || "https://nakipoglu.kommo.com";
const HDR = { "Authorization": `Bearer ${T}`, "Content-Type": "application/json" };
const PIPELINE_ID = 13481231;

// Stage ID'leri
const STAGE_MAP = {
  "order_completed": 104106243,
  "waiting_payment": 104000655,
  "waiting_address": 104000659,
};

// Field ID'leri
const FID = {
  ilgilenilen_urun: 1831171, conversation_stage: 1831173, last_intent: 1831175,
  order_status: 1831177, payment_method: 1831179,
  photo_received: 1831181, back_text_status: 1831183, address_status: 1831185,
  support_mode: 1831187, support_mode_reason: 1831189,
  siparis_alindi: 1831193, phone_received: 1831199,
  cancel_reason: 1831197,
};

// Son tarama zamanını tutmak için (memory-based, her cold start'ta sıfırlanır)
let lastScanTs = 0;

async function kGet(path) {
  const r = await fetch(API + path, { method: "GET", headers: HDR });
  const t = await r.text();
  try { return { s: r.status, d: JSON.parse(t) }; } catch { return { s: r.status, d: t }; }
}

async function kPatch(path, body) {
  const r = await fetch(API + path, { method: "PATCH", headers: HDR, body: JSON.stringify(body) });
  const t = await r.text();
  try { return { s: r.status, d: JSON.parse(t) }; } catch { return { s: r.status, d: t }; }
}

function readFields(lead) {
  const cf = {};
  if (!lead?.custom_fields_values) return cf;
  for (const f of lead.custom_fields_values) {
    for (const [n, id] of Object.entries(FID)) {
      if (f.field_id === id) { cf[n] = f.values?.[0]?.value || ""; break; }
    }
  }
  return cf;
}

function parseOperatorAction(text) {
  const n = text.toLowerCase()
    .replace(/İ/g, "i").replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u");

  // Sipariş tamamlandı
  if (/siparis.*(olustur|tamamlan|alindi|alinmis|onaylan|hazirlan|aldik|olusturduk|aliyorum|onayliyorum)|kargoya.*(veril|cik)/i.test(n) ||
      /siparis.*(aldi|oldu|tamam)|siparisiniz.*(aldi|oldu|olustur|onay|hazir)/i.test(n)) {
    return { action: "ORDER_COMPLETE", updates: { order_status: "completed", conversation_stage: "order_completed", siparis_alindi: "1" } };
  }

  // Fotoğraf alındı
  if (/fotograf.*(ald|geldi|ulast|tamam)|fotonu.*(ald|gordu)|resmi.*(ald|gordu)|fotografi kontrol/i.test(n) ||
      /gorsel.*(ald|geldi)|fotografiniz.*ald|resminiz.*ald/i.test(n)) {
    return { action: "PHOTO_CONFIRMED", updates: { photo_received: "1", conversation_stage: "waiting_payment" } };
  }

  // Ödeme alındı
  if (/odeme.*(ald|geldi|gordu|kontrol)|eft.*(geldi|ald)|havale.*(geldi|ald)|dekont.*(ald|gordu)/i.test(n)) {
    return { action: "PAYMENT_CONFIRMED", updates: { conversation_stage: "waiting_address" } };
  }

  // Adres alındı
  if (/adres.*(ald|tamam|not)|bilgiler.*(ald|tamam)|tesekk.*bilgi/i.test(n)) {
    return { action: "ADDRESS_CONFIRMED", updates: { address_status: "received" } };
  }

  // Arka yazı alındı
  if (/arka.*ald|yazi.*ald|not.*ald|yaziniz.*ald/i.test(n)) {
    return { action: "BACK_TEXT_CONFIRMED", updates: { back_text_status: "received" } };
  }

  return null;
}

export default async function handler(req, res) {
  if (!T) return res.status(200).json({ error: "no_token" });

  const now = Math.floor(Date.now() / 1000);
  const scanWindow = lastScanTs > 0 ? lastScanTs - 10 : now - 180; // İlk çalışmada son 3 dakika
  lastScanTs = now;

  const results = [];

  try {
    // Aktif pipeline'daki lead'leri çek (completed olmayanlar)
    // waiting_photo, waiting_payment, waiting_address, waiting_letters aşamalarındaki lead'ler
    const activeStatuses = [104000647, 104000655, 104000659, 104000639].join(",");
    const leadsR = await kGet(`/api/v4/leads?limit=50&filter[statuses][0][pipeline_id]=${PIPELINE_ID}&filter[statuses][0][status_id]=${activeStatuses}&with=contacts&order[updated_at]=desc`);

    if (leadsR.s !== 200 || !leadsR.d?._embedded?.leads) {
      // Basit fallback — tüm lead'leri çek
      const fallbackR = await kGet(`/api/v4/leads?limit=30&with=contacts&order[updated_at]=desc`);
      if (fallbackR.s !== 200 || !fallbackR.d?._embedded?.leads) {
        return res.status(200).json({ ok: true, scanned: 0, reason: "no_leads" });
      }
      leadsR.d = fallbackR.d;
    }

    const leads = leadsR.d._embedded.leads;

    for (const lead of leads) {
      // Son güncelleme scan window'dan eski ise atla
      if (lead.updated_at < scanWindow) continue;

      const lid = lead.id;
      const cf = readFields(lead);

      // Zaten completed ise atla
      if (cf.order_status === "completed" || cf.conversation_stage === "order_completed") continue;

      // Lead'in talk'larını bul
      const talksR = await kGet(`/api/v4/talks?filter[entity_id]=${lid}&filter[entity_type]=leads&limit=1`);
      if (talksR.s !== 200 || !talksR.d?._embedded?.talks?.[0]) continue;

      const talkId = talksR.d._embedded.talks[0].id;

      // Son 5 mesajı çek
      const msgsR = await kGet(`/api/v4/talks/${talkId}/messages?limit=5&order=desc`);
      if (msgsR.s !== 200 || !msgsR.d?._embedded?.messages) continue;

      // Dedup: cancel_reason field'ında son işlenen msg ID tutulur
      // Format: "wm:ts:msgId" veya "wm:ts:msgId:opSync:lastOpMsgId"
      const wmParts = (cf.cancel_reason || "").split(":opSync:");
      const lastOpMsgId = wmParts.length > 1 ? wmParts[1] : "";

      // Son outgoing operatör mesajını bul
      for (const m of msgsR.d._embedded.messages) {
        const isOperator = (m.author?.type === "user" || m.created_by > 0) && m.author?.type !== "bot";
        const content = m.text || m.message || "";
        const mId = String(m.id || "");
        const mTs = m.created_at || 0;

        // Müşteri veya bot mesajı → atla
        if (!isOperator) continue;
        // Boş mesaj → atla
        if (!content || content.length < 5) continue;
        // Scan window'dan eski → atla
        if (mTs > 0 && mTs < scanWindow) break;
        // Zaten işlenmiş → atla
        if (mId && mId === lastOpMsgId) break;

        // Parse et
        const action = parseOperatorAction(content);
        if (!action) continue;

        // Stage koşul kontrolü
        if (action.action === "PHOTO_CONFIRMED" && cf.conversation_stage !== "waiting_photo") continue;
        if (action.action === "PAYMENT_CONFIRMED" && cf.conversation_stage !== "waiting_payment") continue;
        if (action.action === "ADDRESS_CONFIRMED" && cf.conversation_stage !== "waiting_address") continue;

        // State güncelle
        const cfv = [];
        for (const [k, v] of Object.entries(action.updates)) {
          if (FID[k]) cfv.push({ field_id: FID[k], values: [{ value: String(v) }] });
        }

        // Dedup watermark güncelle
        const newWm = (wmParts[0] || "") + ":opSync:" + mId;
        cfv.push({ field_id: FID.cancel_reason, values: [{ value: newWm }] });

        await kPatch(`/api/v4/leads/${lid}`, { custom_fields_values: cfv });

        // Pipeline taşı
        const targetStage = STAGE_MAP[action.updates.conversation_stage];
        if (targetStage) {
          await kPatch(`/api/v4/leads/${lid}`, { pipeline_id: PIPELINE_ID, status_id: targetStage });
        }

        console.log("[OPERATOR-SYNC]", action.action, "lead:", lid, "msg:", content.substring(0, 40));
        results.push({ lead_id: lid, action: action.action, msg: content.substring(0, 40) });
        break; // Bu lead için ilk eşleşmeyi bulduk
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 200));
    }

    return res.status(200).json({ ok: true, scanned: leads.length, synced: results.length, results });
  } catch (e) {
    console.error("[OPERATOR-SYNC] error:", e.message);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
