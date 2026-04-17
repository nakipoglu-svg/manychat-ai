// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GUARD ENGINE v8.2 — Sadece denetim, cevap üretmez
// 1. validateFacts  2. validateStage  3. validatePolicy
// Gerekirse veto edip güvenli fallback verir.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { PRICE, STAGE, REPLY_CLASS, SUPPORT_REASON, TEXT } from "./constants.js";
import { hasAny } from "./normalize.js";

export function guardReply(reply, ctx, filledSlots, missingSlots) {
  if (!reply || !reply.text) return reply;

  let text = reply.text;
  const product = ctx.product;
  const stage = ctx.fields?.conversation_stage || "";

  // ═══ 1. FRUSTRATION HARD STOP ═══
  if (hasAny(ctx.norm, [
    "otomatik mesaj istemiyorum","robot musunuz","aptal misiniz","salak misiniz",
    "dalga geciyor","dalga geçiyor","geciyonuz","geçiyonuz","geciyorsunuz","geçiyorsunuz","dava ediyorum","dava ederim",
    "rezalet","rezilsiniz","sacmalik","saçmalık",
    "insan baglayın","insan bağlayın","gercek insan","gerçek insan",
    "canli destek","canlı destek","yetkili baglayın","yetkili bağlayın",
    "ne bilgisi aldin","ne bilgisi aldın","ne bilgisi aldi","ne bilgisi aldı",
  ])) {
    return {
      text: "Çok özür dileriz efendim, ekibimize iletiyorum, sizi hemen bir insan temsilcimize yönlendiriyoruz 😊",
      source: "guard_frustration",
      reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED,
      support_mode_reason: SUPPORT_REASON.OPERATIONAL,
    };
  }

  // ═══ 2. VALIDATE FACTS ═══

  // Zincir: lazer'de uzatma yok
  if (/zincir.*(uzat|uzatıl|uzatabil)/i.test(text) && product === "lazer") {
    console.log("[GUARD] VETO: lazer zincir uzatma");
    text = "Lazer kolyede zincir 60 cm standarttır, uzatma bulunmamaktadır efendim 😊";
  }
  // Zincir: yanlış uzunluklar
  if (/45\s*cm/i.test(text)) {
    console.log("[GUARD] FIX: 45cm → 60cm");
    text = text.replace(/45\s*cm/gi, "60 cm");
  }
  if (/50\s*cm/i.test(text) && product === "lazer") {
    console.log("[GUARD] FIX: 50cm → 60cm (lazer)");
    text = text.replace(/50\s*cm/gi, "60 cm");
  }
  if (product === "lazer" && /kisa zincir|kısa zincir/i.test(text)) {
    console.log("[GUARD] VETO: kısa zincir (lazer)");
    text = "Lazer kolyede zincir 60 cm standarttır efendim 😊";
  }

  // Fiyat: sadece bilinen fiyatlar geçerli
  const prices = text.match(/(\d{3,4})\s*TL/g) || [];
  const validPrices = new Set(["499","549","599","649","1000","1100","1400","1500","1750","2000"]);
  for (const p of prices) {
    const num = p.match(/(\d+)/)?.[1];
    if (num && !validPrices.has(num) && !["50","300","25","20"].includes(num)) {
      console.log("[GUARD] VETO: invalid price", num);
      if (product === "lazer") text = `EFT / Havale ile ${PRICE.LAZER_EFT} TL, kapıda ödeme ile ${PRICE.LAZER_KAPIDA} TL'dir efendim 😊`;
      else if (product === "atac") text = `EFT / Havale ile ${PRICE.ATAC_EFT} TL, kapıda ödeme ile ${PRICE.ATAC_KAPIDA} TL'dir efendim 😊`;
      break;
    }
  }

  // Materyal: "gümüş" derken "gümüş kaplama" olmalı
  if (/gümüş\s+(kolye|zincir|ürün)/i.test(text) && !/gümüş\s+kaplama/i.test(text)) {
    // AI "gümüş kolye" derse düzelt
    text = text.replace(/gümüş\s+(kolye|zincir|ürün)/gi, "gümüş kaplama $1");
  }

  // ═══ 3. VALIDATE STAGE ═══

  // Completed order'da yeniden satış akışı başlatma
  if ((stage === STAGE.ORDER_COMPLETED || ctx.fields?.order_status === "completed") && /foto.*gonder|foto.*ilet|adres.*ilet|odeme.*sec/i.test(text.replace(/ğ/g,"g").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ı/g,"i").replace(/ü/g,"u"))) {
    console.log("[GUARD] VETO: order completed but flow response detected");
    text = "Tabi efendim 😊";
  }

  // ═══ 4. VALIDATE POLICY ═══

  // WhatsApp sızması
  if (/whatsapp|wa\.me|505\s*471/i.test(text) && !hasAny(ctx.norm, ["whatsapp","numara","telefon","tel alab"])) {
    console.log("[GUARD] STRIP: unsolicited WhatsApp");
    text = text.replace(/[^.]*(?:whatsapp|wa\.me|505\s*471)[^.]*/gi, "").trim();
    if (!text || text.length < 5) text = "Tabi efendim 😊";
  }

  // IBAN sızması (müşteri EFT seçmediyse)
  if (/TR\d{2}\s*\d{4}/i.test(text) && !hasAny(ctx.norm, ["iban","eft","havale","hesap"])) {
    console.log("[GUARD] STRIP: unsolicited IBAN");
    text = text.replace(/IBAN[^.]*\./gi, "").replace(/TR\d{2}[^.]*\./gi, "").trim();
    if (!text || text.length < 5) text = "Tabi efendim 😊";
  }

  // ═══ 5. ANTI-REPEAT ═══

  // Dolu slot'u tekrar sorma
  const norm_text = text.toLowerCase().replace(/[ıİ]/g,"i").replace(/[şŞ]/g,"s").replace(/[çÇ]/g,"c").replace(/[öÖ]/g,"o").replace(/[üÜ]/g,"u").replace(/[ğĞ]/g,"g");
  if (filledSlots?.photo && /fotograf.*gonder|fotograf.*ilet|resim.*gonder/i.test(norm_text)) {
    if (!/aldik|ulasti|ulastı|odeme|ödeme/i.test(norm_text)) {
      console.log("[GUARD] ANTI-REPEAT: photo already received");
      text = "Tabi efendim 😊";
    }
  }
  if (filledSlots?.payment && /eft.*kapida.*tercih|odeme yontemi|hangisini tercih/i.test(norm_text)) {
    console.log("[GUARD] ANTI-REPEAT: payment already chosen");
    text = "Tabi efendim 😊";
  }

  // ═══ 6. FLOW REMINDER STRIP ═══
  // Yan soru cevabının sonundaki gereksiz akış hatırlatması
  // Preview/decision/composition intentleri için trim yapma — cevap kasıtlı fotoğraf içeriyor
  const TRIM_EXEMPT_INTENTS = ["preview_request","decision_support","composition_question","back_text_question","back_text_fit_question","product_structure_request","single_pendant_request","back_photo_info"];
  // waiting_photo/waiting_letters'ta order_start/new_order cevabı kasıtlı olarak stage-prompt içerir
  const STAGE_INVITE_EXEMPT = (ctx.intent === "order_start" || ctx.intent === "new_order" || ctx.intent === "photo_offer") &&
                              (stage === STAGE.WAITING_PHOTO || stage === STAGE.WAITING_LETTERS);
  const flowReminder = /[.,]?\s*(fotoğrafınızı|foto.*gönder|foto.*bekl|adres.*ilet|ödeme.*seç)[^.]*[.!]?\s*$/i;
  if (flowReminder.test(text) && text.length > 50 && !TRIM_EXEMPT_INTENTS.includes(ctx.intent) && !STAGE_INVITE_EXEMPT) {
    const cleaned = text.replace(flowReminder, "").trim();
    if (cleaned.length > 10) {
      console.log("[GUARD] TRIM: flow reminder stripped");
      text = cleaned;
      if (!text.endsWith("😊") && !text.endsWith(".") && !text.endsWith("!")) text += " 😊";
    }
  }

  // ═══ 7. AI LEAKAGE HARD GUARD ═══
  const norm_msg = (ctx.norm || "").toLowerCase();
  const norm_reply = text.toLowerCase().replace(/[çÇ]/g,"c").replace(/[şŞ]/g,"s").replace(/[ğĞ]/g,"g").replace(/[ıİ]/g,"i").replace(/[öÖ]/g,"o").replace(/[üÜ]/g,"u");
  
  // "Suya dayanıklı" sızma — sadece su/deniz sorusu gelirse kullanılmalı
  if (norm_reply.includes("suya dayanikli") && !hasAny(norm_msg, ["su","deniz","dus","duş","dusta","duşta","banyo","yuzme","yüzme","islak","ıslak","yikama","yıkama","su degdig","su değdiğ"])) {
    console.log("[GUARD] AI_LEAK: suya dayanıklı stripped");
    text = "Tabi efendim 😊";
  }
  
  // Kısa AI cevap — "Fotoğraf? 😊", "Kaç? 😊", "Renk? 😊" gibi tek kelime soru yasak
  if (/^[A-ZÇĞİÖŞÜa-zçğıöşü]{2,15}\?\s*😊?\s*$/.test(text.trim())) {
    console.log("[GUARD] AI_LEAK: short question stripped → ", text.trim());
    const stage = ctx.fields?.conversation_stage || "";
    if (stage === "waiting_photo") text = "Fotoğrafınızı buradan iletebilirsiniz efendim 😊";
    else if (stage === "waiting_payment") text = "Ödeme tercihinizi belirtebilir misiniz efendim? EFT / Havale veya kapıda ödeme 😊";
    else if (stage === "waiting_address") text = "Ad soyad, cep telefonu ve açık adres bilgileriniz ile devam edelim efendim 😊";
    else text = "Tabi efendim 😊";
  }

  // "ben sen" AI hatası
  if (text.includes("ben Sen ") || text.includes("ben sen ")) {
    text = text.replace(/ben [Ss]en /g, "");
  }

  reply.text = text;
  return reply;
}
