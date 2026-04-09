// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KOMMO ADAPTER — Webhook handler, field mapping, bot trigger
// Core engine'den tamamen bağımsız. Platform-specific her şey burada.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { processChat } from "../core/engine.js";
import { looksLikePhotoUrl } from "../core/normalize.js";
import { logConversationRow } from "../lib/sheetsLogger.js";

// ─── CONFIG ─────────────────────────────────────────────────

const T = process.env.KOMMO_TOKEN || "";
const API = process.env.KOMMO_API_BASE || "https://nakipoglu.kommo.com";
const HDR = { "Authorization": "Bearer " + T, "Content-Type": "application/json" };

const REPLY_BOT_ID = 72303;
const MENU_BOT_ID = 72073;

const PIPELINE_ID = 13481231;
const STAGE_MAP = {
  "":                    104000639,  // Gelen Talepler
  "waiting_product":     104000639,  // Gelen Talepler
  "waiting_photo":       104000647,  // Fotoğraf Bekleniyor
  "waiting_letters":     104000647,  // Harf Bekleniyor (aynı kolon)
  "waiting_back_text":   104000651,  // Arka Yazı Bekleniyor
  "waiting_payment":     104000655,  // Ödeme Seçimi Bekleniyor
  "waiting_address":     104000659,  // Adres Bekleniyor
  "order_completed":     104106243,  // Sipariş Tamamlandı
  "human_support":       104106247,  // İnsan Desteği
};
const STAGE_PRODUCT_SELECTED = 104000643;  // Ürün Seçildi

// Ödeme yöntemine göre ek pipeline aşamaları (varsa)
// Not: Kommo'da bu aşamalar yoksa oluşturulmalı veya mevcut ID'ler güncellenmelidir
// Şimdilik waiting_address kullanılır, ileride ayrılabilir
const PAYMENT_STAGE_MAP = {
  "eft_waiting":   104000659,  // EFT seçildi, ödeme bekleniyor → mevcut "Adres Bekleniyor" kullan
  "kapida_ready":  104000659,  // Kapıda ödeme → adres iste
};

const FID = {
  ilgilenilen_urun: 1831171, conversation_stage: 1831173, last_intent: 1831175,
  order_status: 1831177, payment_method: 1831179, photo_received: 1831181,
  back_text_status: 1831183, address_status: 1831185, support_mode: 1831187,
  support_mode_reason: 1831189, menu_gosterildi: 1831191, siparis_alindi: 1831193,
  letters_received: 1831195, phone_received: 1831197, reply_class: 1831199,
  context_lock: 1831201, cancel_reason: 1831203, ai_reply: 1831205,
};

// ─── SALESBOT BUTTON DETECTION ──────────────────────────────

const BUTTON_TEXTS = new Set(["resimli lazer kolye", "harfli ataç kolye"]);

function isButtonClick(text) {
  return text ? BUTTON_TEXTS.has(text.trim().toLowerCase()) : false;
}

function getProductFromButton(text) {
  const t = (text || "").trim().toLowerCase();
  if (t.includes("resimli") || t.includes("lazer")) return "lazer";
  if (t.includes("harfli") || t.includes("ataç") || t.includes("atac")) return "atac";
  return "";
}

// ─── DEDUP (Kommo Field-Based, Serverless-Safe) ─────────────
// context_lock: SADECE aktif lock → "lock:<msgId>:<timestamp>" veya boş
// cancel_reason: Replay watermark → "wm:<createdAt>:<id1>|<id2>|..."
//
// Watermark mantığı:
//   gelen created_at < watermark ts → eski mesaj, replay, skip
//   gelen created_at == watermark ts VE msgId listede → replay, skip
//   gelen created_at > watermark ts → yeni mesaj, işle, watermark güncelle

const LOCK_TTL_MS = 60000;

function buildLockValue(msgId) {
  return "lock:" + (msgId || "x").slice(0, 20) + ":" + Date.now();
}

function isLockActive(lockVal) {
  if (!lockVal || !lockVal.startsWith("lock:")) return false;
  const parts = lockVal.split(":");
  const ts = parseInt(parts[parts.length - 1], 10);
  if (isNaN(ts)) return false;
  return (Date.now() - ts) < LOCK_TTL_MS;
}

function isMyLock(lockVal, myLock) {
  return lockVal === myLock;
}

// ─── WATERMARK ──────────────────────────────────────────────

function shortMsgId(msgId) {
  return (msgId || "").slice(0, 12);
}

function parseWatermark(val) {
  if (!val || !val.startsWith("wm:")) return { ts: 0, ids: [] };
  const rest = val.slice(3);
  const firstColon = rest.indexOf(":");
  if (firstColon === -1) return { ts: 0, ids: [] };
  const ts = parseInt(rest.slice(0, firstColon), 10);
  const ids = rest.slice(firstColon + 1).split("|").filter(Boolean);
  return { ts: Number.isFinite(ts) ? ts : 0, ids };
}

function buildWatermark(createdAt, msgId, prevVal) {
  const prev = parseWatermark(prevVal);
  const sid = shortMsgId(msgId);
  if (!createdAt || !sid) return prevVal || "";
  if (createdAt > prev.ts) return `wm:${createdAt}:${sid}`;
  if (createdAt === prev.ts) {
    const ids = [sid, ...prev.ids.filter(x => x !== sid)].slice(0, 5);
    return `wm:${createdAt}:${ids.join("|")}`;
  }
  return prevVal || "";
}

function isReplayByWatermark(createdAt, msgId, prevVal) {
  const prev = parseWatermark(prevVal);
  const sid = shortMsgId(msgId);
  if (!createdAt || !sid || !prev.ts) return false;
  if (createdAt < prev.ts) return true;
  if (createdAt === prev.ts && prev.ids.includes(sid)) return true;
  return false;
}

// ─── EMOJI STRIP (Kommo Salesbot emoji'den sonrasını kesiyor) ──

function stripEmoji(text) {
  if (!text) return "";
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "").replace(/[\u{1F300}-\u{1F5FF}]/gu, "")
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "").replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "").replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "").replace(/[\u{1F900}-\u{1F9FF}]/gu, "")
    .replace(/[\u{200D}]/gu, "").replace(/[\u{20E3}]/gu, "")
    .replace(/[\u{E0020}-\u{E007F}]/gu, "").replace(/\s{2,}/g, " ").trim();
}

// ─── KOMMO API HELPERS ──────────────────────────────────────

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

async function kApi(method, path, body) {
  const o = { method, headers: HDR };
  if (body) o.body = JSON.stringify(body);
  const r = await fetch(API + path, o);
  const t = await r.text();
  console.log("[K]", method, path, r.status, t.slice(0, 300));
  try { return { s: r.status, d: JSON.parse(t) }; } catch { return { s: r.status, d: t }; }
}

async function updateFields(leadId, fields) {
  const cfv = [];
  for (const [n, v] of Object.entries(fields)) {
    if (FID[n] && v !== undefined) cfv.push({ field_id: FID[n], values: [{ value: String(v) }] });
  }
  if (cfv.length > 0) return kApi("PATCH", "/api/v4/leads/" + leadId, { custom_fields_values: cfv });
}

async function triggerBot(botId, leadId) {
  console.log("[WH] Triggering bot", botId, "for lead", leadId);
  return kApi("POST", `/api/v4/bots/${botId}/run`, { entity_id: Number(leadId), entity_type: "leads" });
}

async function movePipelineStage(leadId, stage, hasProduct, paymentMethod) {
  let target = STAGE_MAP[stage];
  if (!target && hasProduct) target = STAGE_PRODUCT_SELECTED;
  if (!target) return;

  // Ödeme-aware pipeline: EFT seçildi ama adres bekleniyor → özel stage
  if (stage === "waiting_address" && paymentMethod === "eft_havale" && PAYMENT_STAGE_MAP["eft_waiting"]) {
    target = PAYMENT_STAGE_MAP["eft_waiting"];
  }

  try {
    await kApi("PATCH", "/api/v4/leads/" + leadId, { pipeline_id: PIPELINE_ID, status_id: target });
    console.log("[WH] Pipeline moved:", stage, "→", target, paymentMethod ? "(payment:" + paymentMethod + ")" : "");
  } catch (e) { console.error("[WH] Pipeline move error:", e.message); }
}

async function readLeadFields(leadId) {
  try {
    const r = await kApi("GET", "/api/v4/leads/" + leadId);
    if (r.s === 200) return readFields(r.d);
  } catch (e) { console.error("[WH] readLeadFields error:", e.message); }
  return {};
}

async function resolveLeadId(leadId, contactId) {
  let resolvedLead = leadId || "";
  let contactName = "";
  
  if (contactId) {
    try {
      const r = await kApi("GET", "/api/v4/contacts/" + contactId + "?with=leads");
      if (r.s === 200) {
        if (!resolvedLead && r.d?._embedded?.leads?.[0]?.id) {
          resolvedLead = String(r.d._embedded.leads[0].id);
        }
        contactName = r.d?.name || "";
      }
    } catch (e) {
      console.error("[WH] Contact fetch error:", e.message);
    }
  }
  
  return { leadId: resolvedLead, contactName };
}

// ─── FIRST MESSAGE DETECTION ────────────────────────────────

function isFirstMessage(cf, msgText) {
  if (cf.menu_gosterildi || cf.ilgilenilen_urun) return false;
  if (cf.conversation_stage || cf.order_status) return false;
  // Watermark varsa daha önce mesaj işlenmiş demek
  if (cf.cancel_reason && cf.cancel_reason.startsWith("wm:")) return false;
  if (/resimli|lazer|ata[cç]|harfli|fiyat|sipari[sş]|kolye|ücret|ne kadar/i.test(msgText.toLowerCase())) return false;
  return true;
}

// ─── MAIN WEBHOOK HANDLER ───────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(200).json({ ok: false, message: "Only POST." });

  try {
    const d = req.body || {};

    // ── DEBUG: Gelen tüm payload key'lerini logla ──
    const allKeys = Object.keys(d).slice(0, 50).join(", ");
    const hasMsg = !!d["message[add][0][text]"] || !!d["message[add][0][id]"];
    const hasTalk = allKeys.includes("talk[");
    const hasLead = allKeys.includes("leads[");
    console.log("[WH_DEBUG]", JSON.stringify({ hasMsg, hasTalk, hasLead, keyCount: Object.keys(d).length, firstKeys: allKeys.substring(0, 200) }));

    // ── Direct API call (ManyChat-compatible) ──
    if (d.message_text) {
      const cf = d.custom_fields || {};
      const result = await processChat({ message: d.message_text, ...cf, entry_product: cf.ilgilenilen_urun || "" });
      return res.status(200).json({ success: true, ai_reply: result.ai_reply || "", fields: result });
    }

    // ── Kommo webhook format ──
    const msgText = d["message[add][0][text]"] || "";
    const msgType = d["message[add][0][type]"] || "";
    const msgId = d["message[add][0][id]"] || "";
    const msgCreatedAt = parseInt(d["message[add][0][created_at]"] || "0", 10);
    const attachType = d["message[add][0][attachment][type]"] || "";
    const attachLink = d["message[add][0][attachment][link]"] || "";

    // ══ EVENT TYPE DETECTION ═════════════════════════════════
    // Kommo field-change, salesbot, system webhook'ları da gönderiyor.
    // Gerçek mesaj: msgId VEYA text VEYA attachment olmalı.
    // Hiçbiri yoksa → non-message event.
    // msgId yoksa ama text varsa → Kommo farklı payload kullanmış olabilir → devam et.
    const hasText = !!msgText;
    const hasAttachment = !!(attachType && attachLink);
    
    if (!msgId && !hasText && !hasAttachment) {
      // Gerçekten non-message mı yoksa bilinmeyen payload mı? Logla.
      const bodyKeys = Object.keys(d).slice(0, 30).join(", ");
      console.log("[WH] NON-MSG: no msgId/text/attach. keys:", bodyKeys);
      return res.status(200).json({ ok: true, skipped: true, reason: "non_message_event" });
    }
    
    // msgId yoksa ama text veya attachment var → payload keşfi
    if (!msgId && (hasText || hasAttachment)) {
      console.log("[WH] WARN: no msgId but hasText:", hasText, "hasAttach:", hasAttachment, "text:", msgText.slice(0, 80));
      // Geçici msgId üret — dedup çalışması için
      // (Kommo bazen msgId göndermeyebilir)
    }
    // ═════════════════════════════════════════════════════════

    // ══ STALE MESSAGE GUARD ══════════════════════════════════
    if (msgCreatedAt > 0) {
      const ageSeconds = Math.floor(Date.now() / 1000) - msgCreatedAt;
      if (ageSeconds > 300) {
        console.log("[WH] STALE: msg is", ageSeconds, "s old, skip. id:", msgId.slice(0, 20));
        return res.status(200).json({ ok: true, skipped: true, reason: "stale_message", age: ageSeconds });
      }
    }
    // ═════════════════════════════════════════════════════════

    // Fotoğraf: text boş ama attachment picture varsa → URL olarak kullan
    let effectiveText = msgText;
    if (!effectiveText && attachType === "picture" && attachLink) {
      effectiveText = attachLink;
      console.log("[WH] Photo attachment detected:", attachLink.slice(0, 100));
    }

    if (!effectiveText) {
      console.log("[WH] SKIP: no_text. msgId:", msgId.slice(0, 20), "type:", msgType, "attach:", attachType);
      return res.status(200).json({ ok: true, skipped: true, reason: "no_text" });
    }
    if (msgType === "outgoing") {
      // ═══ SELLER MESSAGE STATE SYNC ═══════════════════════════
      // İşletme sahibi yazdığında cevap üretme ama state'i güncelle.
      // Böylece sonraki müşteri mesajı doğru stage'de işlenir.
      const outNorm = effectiveText.toLowerCase()
        .replace(/İ/g, "i").replace(/ç/g, "c").replace(/ğ/g, "g")
        .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u");

      const shouldSync = lid && effectiveText.length > 3;

      if (shouldSync) {
        let stateUpdates = null;

        // Fotoğraf alındı sinyalleri
        if (/fotograf.*(ald|geldi|ulast|tamam)|fotonu.*(ald|gordu)|resmi.*(ald|gordu)|fotografi kontrol/i.test(outNorm) ||
            /gorsel.*(ald|geldi)|fotografiniz.*ald|resminiz.*ald/i.test(outNorm)) {
          const curCf = await readLeadFields(lid);
          if (curCf.conversation_stage === "waiting_photo" || !curCf.back_text_status) {
            stateUpdates = { photo_received: "1", conversation_stage: "waiting_back_text" };
          }
        }

        // Arka yazı alındı / sipariş ilerleme sinyalleri
        if (/arka.*ald|yazi.*ald|not.*ald|yaziniz.*ald/i.test(outNorm)) {
          const curCf = await readLeadFields(lid);
          if (curCf.conversation_stage === "waiting_back_text") {
            stateUpdates = { back_text_status: "received", conversation_stage: "waiting_payment" };
          }
        }

        // Ödeme alındı sinyalleri
        if (/odeme.*(ald|geldi|gordu|kontrol)|eft.*(geldi|ald)|havale.*(geldi|ald)|dekont.*(ald|gordu)/i.test(outNorm)) {
          const curCf = await readLeadFields(lid);
          if (curCf.conversation_stage === "waiting_payment" || !curCf.payment_method) {
            stateUpdates = { payment_method: curCf.payment_method || "eft_havale" };
            if (curCf.address_status !== "received") stateUpdates.conversation_stage = "waiting_address";
          }
        }

        // Sipariş tamamlandı sinyalleri
        if (/siparis.*(olustur|tamamlan|alindi|onaylan)|kargoya.*(veril|cik)/i.test(outNorm)) {
          stateUpdates = { order_status: "completed", conversation_stage: "order_completed", siparis_alindi: "1" };
        }

        // Adres alındı sinyalleri
        if (/adres.*(ald|tamam|not)|bilgiler.*(ald|tamam)|tesekk.*bilgi/i.test(outNorm)) {
          const curCf = await readLeadFields(lid);
          if (curCf.conversation_stage === "waiting_address") {
            stateUpdates = { address_status: "received" };
            if (curCf.phone_received === "1") {
              stateUpdates.conversation_stage = "order_completed";
              stateUpdates.order_status = "completed";
              stateUpdates.siparis_alindi = "1";
            }
          }
        }

        if (stateUpdates) {
          console.log("[WH] SELLER-SYNC: detected state signals in outgoing:", JSON.stringify(stateUpdates));
          await updateFields(lid, stateUpdates);
          if (stateUpdates.conversation_stage) {
            await movePipelineStage(lid, stateUpdates.conversation_stage, true);
          }
        }
      }
      // ═══════════════════════════════════════════════════════════

      console.log("[WH] SKIP: outgoing. msgId:", msgId.slice(0, 20), "text:", effectiveText.slice(0, 40));
      return res.status(200).json({ ok: true, skipped: true, reason: "outgoing" });
    }

    const leadId = d["message[add][0][element_id]"] || d["message[add][0][entity_id]"] || "";
    const contactId = d["message[add][0][contact_id]"] || "";

    console.log("[WH] MSG:", effectiveText.slice(0, 120), "lead:", leadId, "contact:", contactId, "type:", msgType);

    // ── Button click ──
    if (isButtonClick(effectiveText)) {
      console.log("[WH] Button:", effectiveText);
      const { leadId: btnLid } = await resolveLeadId(leadId, contactId);
      if (btnLid) {
        const product = getProductFromButton(effectiveText);
        const stage = product === "lazer" ? "waiting_photo" : "waiting_letters";
        // Lead field'larını oku (done list için)
        let btnCf = {};
        try {
          const btnLr = await kApi("GET", "/api/v4/leads/" + btnLid);
          if (btnLr.s === 200) btnCf = readFields(btnLr.d);
        } catch {}
        await updateFields(btnLid, {
          ilgilenilen_urun: product, conversation_stage: stage,
          context_lock: "",
          cancel_reason: buildWatermark(msgCreatedAt, msgId, btnCf.cancel_reason),
          order_status: "started", last_intent: "product_entry",
        });
        await movePipelineStage(btnLid, stage, true);
      }
      return res.status(200).json({ ok: true, handled_by: "button", product: getProductFromButton(effectiveText) });
    }

    // ── Resolve lead + read fields ──
    const { leadId: lid, contactName } = await resolveLeadId(leadId, contactId);
    console.log("[WH] Resolved lid:", lid, "contactName:", contactName);
    let cf = {};
    if (lid) {
      const lr = await kApi("GET", "/api/v4/leads/" + lid);
      if (lr.s === 200) cf = readFields(lr.d);
    }

    // ══════════════════════════════════════════════════════════
    // DEDUP GUARD — 4 katmanlı, serverless-safe
    // ══════════════════════════════════════════════════════════

    // Katman 0: Watermark replay guard
    // cancel_reason field'ında "wm:<ts>:<id1>|<id2>|..." formatında saklanıyor
    if (msgId && msgCreatedAt > 0 && isReplayByWatermark(msgCreatedAt, msgId, cf.cancel_reason)) {
      console.log("[WH] DEDUP-0: replay by watermark, skip.", shortMsgId(msgId), "ts:", msgCreatedAt);
      return res.status(200).json({ ok: true, skipped: true, reason: "dedup_replay_watermark" });
    }

    // Katman 1: ai_reply doluysa → eski cevap kalıntısı olabilir
    // Salesbot okumuş ama temizlememiş olabilir — watermark ile teyit et
    if (cf.ai_reply && cf.ai_reply.length > 0 && cf.ai_reply !== "#FIELD_NAME#") {
      // Watermark kontrolü: bu mesajın created_at'i watermark'tan büyükse → YENİ mesaj, ai_reply eski kalıntı
      const wm = parseWatermark(cf.cancel_reason);
      if (msgCreatedAt > 0 && wm.ts > 0 && msgCreatedAt > wm.ts) {
        // Yeni mesaj — eski ai_reply'i temizle ve devam et
        console.log("[WH] DEDUP-1: ai_reply stale (msg newer than watermark), clearing and processing");
        await updateFields(lid, { ai_reply: "" });
        cf.ai_reply = "";
      } else {
        console.log("[WH] DEDUP-1: ai_reply set, skip");
        return res.status(200).json({ ok: true, skipped: true, reason: "dedup_ai_reply" });
      }
    }

    // Katman 2: Aktif lock varsa → başka instance işliyor
    if (isLockActive(cf.context_lock)) {
      console.log("[WH] DEDUP-2: active lock, skip. lock:", cf.context_lock);
      return res.status(200).json({ ok: true, skipped: true, reason: "dedup_lock" });
    }

    // Katman 3: Double-check write lock (yaz → tekrar oku → doğrula)
    // msgId yoksa lock yapma
    const lockable = !!msgId;
    if (lid && lockable) {
      const myLock = buildLockValue(msgId);
      
      // 3a: Lock yaz
      await updateFields(lid, { context_lock: myLock });
      
      // 3b: 150ms bekle (Kommo API propagation)
      await new Promise(r => setTimeout(r, 150));
      
      // 3c: Tekrar oku — hâlâ senin lock'un mu?
      try {
        const recheck = await kApi("GET", "/api/v4/leads/" + lid);
        if (recheck.s === 200) {
          const recheckFields = readFields(recheck.d);
          
          // ai_reply bu arada dolmuş olabilir — AMA watermark ile teyit et
          if (recheckFields.ai_reply && recheckFields.ai_reply.length > 0 && recheckFields.ai_reply !== "#FIELD_NAME#") {
            const recheckWm = parseWatermark(recheckFields.cancel_reason);
            if (!(msgCreatedAt > 0 && recheckWm.ts > 0 && msgCreatedAt > recheckWm.ts)) {
              console.log("[WH] DEDUP-3a: ai_reply appeared during lock, skip");
              return res.status(200).json({ ok: true, skipped: true, reason: "dedup_race_ai_reply" });
            }
            console.log("[WH] DEDUP-3a: ai_reply stale during lock, continuing");
          }
          
          // Başka instance lock'u üzerine yazmış olabilir
          if (!isMyLock(recheckFields.context_lock, myLock)) {
            console.log("[WH] DEDUP-3b: lock stolen, skip. mine:", myLock, "theirs:", recheckFields.context_lock);
            return res.status(200).json({ ok: true, skipped: true, reason: "dedup_race_lock" });
          }
        }
      } catch (e) {
        console.error("[WH] DEDUP recheck error:", e.message);
      }
      
      console.log("[WH] DEDUP: lock acquired, processing. msgId:", msgId.slice(0, 20));
    }
    // ══════════════════════════════════════════════════════════

    // ══ MULTI-MESSAGE BUNDLING ═══════════════════════════════
    // Müşteri hızlıca ardışık mesaj atıyorsa (isim + tel + adres gibi)
    // 2 saniye bekleyip son hali ile devam et
    // Sadece kısa mesajlarda (<40 char) bundle yap — uzun mesajlar anında işle
    if (lid && effectiveText.length < 40 && !looksLikePhotoUrl(effectiveText)) {
      await new Promise(r => setTimeout(r, 2000));
      
      // Tekrar oku — yeni mesaj gelmiş mi?
      try {
        const bundleCheck = await kApi("GET", `/api/v4/leads/${lid}/notes?note_type=incoming_message&limit=3`);
        // Not: Bu endpoint varsa son mesajları kontrol ederiz
        // Yoksa sadece field'ları kontrol ederiz
      } catch {}
      
      // Lock hâlâ bizde mi? Başka instance devralmış olabilir
      try {
        const lockCheck = await kApi("GET", "/api/v4/leads/" + lid);
        if (lockCheck.s === 200) {
          const lcf = readFields(lockCheck.d);
          if (lcf.ai_reply && lcf.ai_reply.length > 0 && lcf.ai_reply !== "#FIELD_NAME#") {
            console.log("[WH] BUNDLE: ai_reply appeared during wait, another instance handled it");
            return res.status(200).json({ ok: true, skipped: true, reason: "bundle_superseded" });
          }
        }
      } catch {}
    }
    // ═════════════════════════════════════════════════════════

    // ── First message → trigger menu bot ──
    if (isFirstMessage(cf, effectiveText)) {
      console.log("[WH] First message → menu bot");
      if (lid) {
        await triggerBot(MENU_BOT_ID, lid);
        await updateFields(lid, {
          context_lock: "",
          cancel_reason: buildWatermark(msgCreatedAt, msgId, cf.cancel_reason),
        });
      }
      return res.status(200).json({ ok: true, handled_by: "menu_bot" });
    }

    // ── Normal flow: core engine ──
    const result = await processChat({
      message: effectiveText, ...cf, entry_product: cf.ilgilenilen_urun || "",
    });

    console.log("[WH] Reply:", (result.ai_reply || "").slice(0, 80));
    console.log("[WH] Stage:", cf.conversation_stage, "→", result.conversation_stage, "| Intent:", result.last_intent);

    if (!lid) return res.status(200).json({ success: true, ai_reply: result.ai_reply || "" });

    // ── Build field update ──
    const fieldUpdate = {
      ilgilenilen_urun: result.ilgilenilen_urun || "",
      conversation_stage: result.conversation_stage || "",
      last_intent: result.last_intent || "",
      order_status: result.order_status || "",
      payment_method: result.payment_method || "",
      photo_received: result.photo_received || "",
      back_text_status: result.back_text_status || "",
      address_status: result.address_status || "",
      support_mode: result.support_mode || "",
      support_mode_reason: result.support_mode_reason || "",
      menu_gosterildi: cf.menu_gosterildi || result.menu_gosterildi || "",
      siparis_alindi: result.siparis_alindi || "",
      letters_received: result.letters_received || "",
      phone_received: result.phone_received || "",
      reply_class: result.reply_class || "",
      context_lock: "",  // Lock temizle
      cancel_reason: buildWatermark(msgCreatedAt, msgId, cf.cancel_reason),  // Watermark güncelle
    };

    // ══ STAGE WRITE STRATEGY ══════════════════════════════════
    // 1. Önce state field'larını yaz (ai_reply HARİÇ)
    //    → Böylece sonraki mesaj gelirse doğru stage'i okur
    // 2. Sonra ai_reply yaz + bot trigger
    //    → Salesbot ai_reply'i okuyup müşteriye gönderir
    // 3. Pipeline move (en son)
    // ══════════════════════════════════════════════════════════

    // Adım 1: State field'larını yaz (ai_reply boş bırak)
    await updateFields(lid, { ...fieldUpdate, ai_reply: "" });

    // Adım 2: Kısa bekleme — Kommo API propagation
    await new Promise(r => setTimeout(r, 100));

    // Adım 3: ai_reply yaz + bot trigger
    const cleanReplyText = stripEmoji(result.ai_reply || "");
    await updateFields(lid, { ai_reply: cleanReplyText });

    if (result.ai_reply) {
      await triggerBot(REPLY_BOT_ID, lid);
    }

    // Adım 4: Pipeline stage (arka planda)
    await movePipelineStage(lid, result.conversation_stage || "", !!result.ilgilenilen_urun, result.payment_method || "");

    // ── Logging + Order Sync (arka plan) ──
    try {
      // Debug summary log — production root cause analysis için
      const dbg = result._debug || {};
      console.log("[WH] DECISION:", JSON.stringify({
        msg: effectiveText.slice(0, 60),
        intent: result.last_intent,
        rule: dbg.selected_rule,
        source: dbg.reply_source,
        stage: dbg.state_before + " → " + dbg.state_after,
        corrected: dbg.state_corrected || false,
        product: result.ilgilenilen_urun,
        is_confirm: dbg.is_short_confirm,
      }));

      await Promise.allSettled([
        logConversationRow({
          body: { message: effectiveText, lead_id: lid, contact_id: contactId, instagram_username: contactName || "" },
          result,
        }).catch(e => console.error("[WH] Log error:", e.message)),
        safeOrderSync(effectiveText, lid, result, cf, contactName).catch(e => console.error("[WH] OrderSync error:", e.message)),
      ]);
    } catch (e) { console.error("[WH] Background tasks error:", e.message); }

    return res.status(200).json({ success: true, ai_reply: result.ai_reply || "" });

  } catch (e) {
    console.error("[WH] Error:", e.message);
    // Lock takılı kalmasın — temizle. Watermark'a dokunma (tekrar denenebilsin).
    try {
      const errLid = (req.body?.["message[add][0][element_id]"]) || "";
      if (errLid) {
        await updateFields(errLid, { context_lock: "" });
      }
    } catch {}
    return res.status(200).json({ success: false, error: e.message });
  }
}

// ─── ORDER SYNC (Google Sheets) ─────────────────────────────

const ORDER_WEBHOOK_URL = process.env.GOOGLE_ORDER_WEBHOOK_URL || "";

function extractCustomerId(leadId, contactId) {
  return leadId || contactId || "";
}

function buildStableOrderId(customerId, product, result) {
  if (!customerId) return `noid_${Date.now()}`;
  if (!product) return `pre_${customerId}`;
  return `open_${customerId}_${product}`;
}

function calculateConfidence(result) {
  let score = 0;
  if (result.ilgilenilen_urun) score += 20;
  if (result.ilgilenilen_urun === "lazer") {
    if (result.photo_received) score += 20;
    if (result.back_text_status) score += 10;
  } else if (result.ilgilenilen_urun === "atac") {
    if (result.letters_received) score += 20;
    score += 10;
  }
  if (result.payment_method) score += 20;
  if (result.address_status === "received") score += 20;
  if (result.phone_received) score += 10;
  return score;
}

async function safeOrderSync(msgText, leadId, result, cf, contactName) {
  if (!ORDER_WEBHOOK_URL) return;
  const product = result.ilgilenilen_urun || "";
  const customerId = leadId || "";
  if (!product && !customerId) return;

  const orderId = buildStableOrderId(customerId, product, result);
  const ext = result._extracted || {};
  const isCompleted = result.conversation_stage === "order_completed" || result.order_status === "completed";
  const isCancelled = result.order_status === "cancel_requested" || result.conversation_stage === "human_support";
  const hadPreviousData = !!(cf.ilgilenilen_urun || cf.photo_received || cf.payment_method || cf.address_status);

  // Operation type: Apps Script'in INSERT/UPDATE kararı için
  // "create" = ilk kez sipariş oluşturuluyor
  // "update" = mevcut sipariş güncelleniyor
  // "complete" = sipariş tamamlandı
  const operation = isCompleted ? "complete" : hadPreviousData ? "update" : "create";

  // Orders_Raw Apps Script header formatına tam uyumlu payload
  const payload = {
    type: "order_raw",
    operation,  // ← Apps Script buna bakarak UPDATE/INSERT kararı verecek
    data: {
      order_id: orderId,
      created_at: operation === "create" ? new Date().toISOString() : "",
      updated_at: new Date().toISOString(),
      customer_id: customerId,
      instagram_username: contactName || "",
      customer_name: contactName || "",
      dm_link: customerId ? `https://nakipoglu.kommo.com/leads/detail/${customerId}` : "",
      // Cumulative: hem yeni extracted hem de önceki CRM field'ları birleştir
      recipient_name: ext.name || cf.recipient_name || "",
      phone: ext.phone || "",
      full_address: ext.addressText || "",
      product_type: product,
      payment_type: result.payment_method || "",
      photo_received: result.photo_received || "",
      photo_count: result.photo_received ? "1" : "",
      photo_url: ext.photoUrl || "",
      back_text_status: result.back_text_status || "",
      back_text_value: ext.backText || "",
      letters_value: ext.letters || "",
      order_status: result.order_status || "",
      confirmation_source: "bot",
      confirmed_at: isCompleted ? new Date().toISOString() : "",
      confidence_score: calculateConfidence(result),
      last_message: msgText,
      // Yeni: stage + intent bilgisi (operations dashboard için)
      conversation_stage: result.conversation_stage || "",
      last_intent: result.last_intent || "",
      reply_class: result.reply_class || "",
      support_mode: result.support_mode || "",
    },
  };

  try {
    const resp = await fetch(ORDER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[WH] OrderSync:", operation, "orderId:", orderId.slice(0, 30), "status:", resp.status);

    // ═══ Sipariş tamamlandıysa veya iptal edildiyse Operations sayfasına da gönder ═══
    if (isCompleted || isCancelled) {
      const opsPayload = {
        type: "order_operation",
        data: {
          order_id: orderId,
          final_status: isCancelled ? "cancelled" : "confirmed",
          finalized_at: new Date().toISOString(),
          instagram_username: contactName || "",
          customer_name: contactName || "",
          dm_link: customerId ? `https://nakipoglu.kommo.com/leads/detail/${customerId}` : "",
          recipient_name: ext.name || cf.recipient_name || "",
          phone: ext.phone || "",
          full_address: ext.addressText || "",
          product_type: product,
          payment_type: result.payment_method || "",
          photo_received: result.photo_received || "",
          photo_url: ext.photoUrl || "",
          back_text_value: ext.backText || "",
          letters_value: ext.letters || "",
          decision_source: "bot",
        },
      };
      try {
        await fetch(ORDER_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(opsPayload),
        });
        console.log("[WH] OpsSync: confirmed", orderId.slice(0, 30));
      } catch (oe) { console.error("[WH] Ops sync error:", oe.message); }
    }
  } catch (e) { console.error("[WH] Order sync error:", e.message); }
}
