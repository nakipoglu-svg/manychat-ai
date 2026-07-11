// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GUARD ENGINE v8.2 — Sadece denetim, cevap üretmez
// 1. validateFacts  2. validateStage  3. validatePolicy
// Gerekirse veto edip güvenli fallback verir.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { PRICE, STAGE, REPLY_CLASS, SUPPORT_REASON, TEXT, FACTS } from "./constants.js";
import { hasAny } from "./normalize.js";

export function guardReply(reply, ctx, filledSlots, missingSlots) {
  if (!reply || !reply.text) return reply;

  let text = reply.text;
  const product = ctx.product;
  const stage = ctx.fields?.conversation_stage || "";

  // ═══ 0. SELF-INTRO SIZINTISI ═══
  // AI ara ara "Yudum Jewels satış asistanıyım..." diye kendini tanıtıyor.
  // Müşteri "sen kimsin / robot musun" SORMADIKÇA bu ifadeyi cümle başından sök.
  if (/asistan[ıi]y[ıi]m|satış asistan|satis asistan|yudum jewels asistan/i.test(text) &&
      !hasAny(ctx.norm, ["kimsin","kim siniz","robot","bot musun","gercek misin","gerçek misin","insan misin","makine misin","yapay zeka","asistan mi"])) {
    const before = text;
    text = text
      .replace(/^\s*(yudum\s*jewels\s*)?(sat[ıi]ş|satis)?\s*asistan[ıi](n[ıi]z)?y[ıi]m[.,;!]?\s*/i, "")
      .replace(/(yudum\s*jewels\s*)?(sat[ıi]ş|satis)?\s*asistan[ıi](n[ıi]z)?y[ıi]m[.,;!]?\s*/i, "")
      .trim();
    if (text && text !== before) {
      // Cümle başına düşen küçük harfi büyüt
      text = text.replace(/^([a-zçğıöşü])/, (m, c) => c.toLocaleUpperCase("tr"));
      if (text.length < 4) text = "Tabi efendim 😊";
      console.log("[GUARD] STRIP: self-intro removed");
    }
  }

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
  if (/zincir.*(uzat|uzatıl|uzatabil)/i.test(text) && product === "lazer" && !/(uzatma|uzatılma|uzatilma|uzatabilme).*(bulunma|yok|yapılma|yapilma)/i.test(text)) {
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

  // Fiyat: sadece bilinen fiyatlar geçerli — TEK KAYNAK: FACTS'ten türetilir.
  // Zam yapıldığında constants.js/FACTS.fiyat değişince bu liste OTOMATİK güncellenir.
  const prices = text.match(/(\d{1,2}[.,]\d{3}|\d{3,4})\s*TL/g) || [];
  const eftPrices = Object.values(FACTS.fiyat);                                   // EFT/kart fiyatları
  const kapidaPrices = Object.entries(FACTS.fiyat)
    .filter(([k]) => k !== "mezar")                                               // mezar taşında kapıda yok
    .map(([, v]) => v + FACTS.kapidaEk);                                          // kapıda = eft + ek ücret
  const validPrices = new Set([...eftPrices, ...kapidaPrices].map(String));
  for (const p of prices) {
    const num = p.match(/(\d[\d.,]*)/)?.[1]?.replace(/[.,]/g, "");
    if (num && !validPrices.has(num) && !["50","300","25","20"].includes(num)) {
      console.log("[GUARD] VETO: invalid price", num);
      if (product === "lazer") text = TEXT.LAZER_PRICE;
      else if (product === "atac") text = TEXT.ATAC_PRICE;
      break;
    }
  }

  // Materyal: "gümüş/altın" değerli maden gibi yazıldıysa renk diliyle düzelt.
  if (/(gümüş|altın)\s+(kolye|zincir|ürün)/i.test(text) && !/(gümüş|altın)\s+renk/i.test(text)) {
    text = text.replace(/gümüş\s+(kolye|zincir|ürün)/gi, "gümüş renk $1");
    text = text.replace(/altın\s+(kolye|zincir|ürün)/gi, "altın renk $1");
  }

  // ═══ 3. VALIDATE STAGE ═══

  // Completed order'da yeniden satış akışı başlatma
  if ((stage === STAGE.ORDER_COMPLETED || ctx.fields?.order_status === "completed") && /foto.*gonder|foto.*ilet|adres.*ilet|odeme.*sec/i.test(text.replace(/ğ/g,"g").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ı/g,"i").replace(/ü/g,"u"))) {
    console.log("[GUARD] VETO: order completed but flow response detected");
    text = "Tabi efendim 😊";
  }

  // ═══ 4. VALIDATE POLICY ═══

  // WhatsApp sızması
  if (/whatsapp|wa\.me|505\s*471/i.test(text) && !hasAny(ctx.norm, ["whatsapp","watsap","whatssap","whatsap","numara","telefon","tel alab"]) && ctx.intent !== "contact_channel_question") {
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

  // ── TELEFON / ADRES tekrar sorma koruması ──
  // Slot zaten doluyken cevap onu tekrar soruyorsa → onaya çevir, gerçek eksik slotu iste.
  // "aldım/aldik" içeren cevaplar zaten onay verdiği için dokunma.
  {
    // IBAN/ödeme-commit cevabı ("EFT ile ilerleyebiliriz + IBAN") tekrar-sorma sayılmaz;
    // müşteri EFT seçtiyse telefon dolu olsa bile IBAN'ı YUTMA.
    const isPaymentInfo = /iban|ilerleyebiliriz/i.test(norm_text);
    const alreadyAck = /ald[iı]m|aldik|aldık|ulasti|ulaşt/i.test(norm_text) || isPaymentInfo;
    const asksPhone = /telefon|cep numara|numaranizi (ilet|yaz|da)|cep numaranizi/i.test(norm_text);
    const asksAddress = /acik adres|adresinizi (ilet|yaz)|adres bilginizi/i.test(norm_text);
    const phoneFilled = !!filledSlots?.phone;
    const addrFilled = !!filledSlots?.address_full;
    const orderDone = ctx.fields?.order_status === "completed" || ctx.fields?.siparis_alindi === "1" || stage === STAGE.ORDER_COMPLETED;

    if (!alreadyAck && !orderDone && ((phoneFilled && asksPhone) || (addrFilled && asksAddress))) {
      if (phoneFilled && addrFilled) {
        console.log("[GUARD] ANTI-REPEAT: phone+address already received");
        text = "Bilgilerinizi aldım efendim 😊 Siparişiniz oluşturulmuştur, en kısa sürede hazırlanacaktır.";
      } else if (phoneFilled && !addrFilled) {
        console.log("[GUARD] ANTI-REPEAT: phone already received, asking address");
        text = "Telefonunuzu aldım efendim 😊 Açık adres bilginiz ile devam edelim.";
      } else if (addrFilled && !phoneFilled) {
        console.log("[GUARD] ANTI-REPEAT: address already received, asking phone");
        text = "Adres bilginizi aldım efendim 😊 Cep telefonu numaranızı da yazabilir misiniz?";
      }
    }
  }

  // ── İSİM tekrar sorma koruması ──
  // İsim daha önce alındıysa "ad soyad" ifadesini iletişim prompt'undan çıkar.
  if (filledSlots?.name && /adres|telefon/i.test(text) && /ad soyad/i.test(text)) {
    const before = text;
    text = text
      .replace(/[Aa]d soyad,\s*/g, "")     // "Ad soyad, cep telefonu ve ..." → "cep telefonu ve ..."
      .replace(/[Aa]d soyad ve\s*/g, "");  // "Ad soyad ve açık adres..." → "açık adres..."
    if (text !== before) {
      // Cümle başına düşen küçük harfi büyüt: metin başı, "😊 " sonrası, ". " sonrası
      text = text.replace(/(^|😊\s*|[.!?]\s+)([a-zçğıöşü])/g, (m, p1, p2) => p1 + p2.toLocaleUpperCase("tr"));
      console.log("[GUARD] NAME-KNOWN: stripped 'ad soyad' re-ask");
    }
  }

  // ═══ 6. FLOW REMINDER STRIP ═══
  // Yan soru cevabının sonundaki gereksiz akış hatırlatması
  // Preview/decision/composition intentleri için trim yapma — cevap kasıtlı fotoğraf içeriyor
  const TRIM_EXEMPT_INTENTS = ["preview_request","decision_support","composition_question","back_text_question","back_text_fit_question","product_structure_request","single_pendant_request","back_photo_info","photo_acceptance_question","photo_suitability_question","photo_question",
    // Slot-ack intent'leri: isim/telefon/adres aldı cevabı kasıtlı olarak "devam edelim" içerir
    "name_only","phone","address","address_provide_partial","phone_only"];
  // waiting_photo/waiting_letters'ta order_start/new_order cevabı kasıtlı olarak stage-prompt içerir
  const STAGE_INVITE_EXEMPT = ctx.intent === "order_start" || ctx.intent === "new_order" || ctx.intent === "photo_offer";
  // High-intent mesajlarda CTA kasıtlı — TRIM'leme (EXTRA-15 E10)
  const HIGH_INTENT_EXEMPT = (stage === STAGE.WAITING_PHOTO) &&
                             hasAny(ctx.norm || "", ["resimli kolye dusun","resimli kolye düşün","kolye dusunuyorum","kolye düşünüyorum","kolye yaptirmayi","kolye yaptırmayı","siparis verirsem","sipariş verirsem","siparis versem","sipariş versem","fotograf atsam","fotoğraf atsam"]);
  // waiting_photo + info-class cevap (renk/material/kararma vb.) → cevabın sonundaki
  // "Fotoğrafınızı iletebilirsiniz" ifadesi flow-continuation olarak kasıtlıdır; trim etme.
  const INFO_FLOW_EXEMPT = (stage === STAGE.WAITING_PHOTO || ctx.intent === "general") &&
                           /(kaplama|çelik|kararma|solma|güvenle|aksesuar|nazar|netleştirme|netlestirme|net fotoğraf|net fotograf|fotoğraf kalitesi|fotograf kalitesi)/i.test(text);
  // Payment commit cevaplarında adres/fotoğraf devamı kasıtlı olabilir.
  const PAYMENT_FLOW_EXEMPT = ctx.intent === "payment";
  // waiting_address + slot-ack cevaplar "adres...iletirseniz" kasıtlı içerir
  const ADDRESS_SLOT_EXEMPT = stage === STAGE.WAITING_ADDRESS &&
                              /(isim bilginizi aldım|telefonunuzu aldım|adres bilginizi aldım|bilgilerinizi aldım)/i.test(text);
  // ACK intent: "Tamam efendim 😊 fotoğrafınızı buradan iletebilirsiniz" pattern
  // kasıtlı — prefix + prompt. Trim etme.
  const ACK_PREFIX_EXEMPT = ctx.intent === "ack" && /(tamam efendim|harika efendim)\s*😊/i.test(text);
  // SMALLTALK intent: "Merhaba efendim 😊 Fotoğrafınızı..." stage-aware hatırlatma kasıtlı
  const SMALLTALK_PREFIX_EXEMPT = ctx.intent === "smalltalk" && /^merhaba efendim\s*😊/i.test(text);
  // Negatif ödeme bilgileri "ödeme seçeneği bulunmamaktadır" gibi ifadeler içerir;
  // bunlar akış hatırlatması değil, asıl cevabın kendisidir.
  const NEGATIVE_PAYMENT_INFO_EXEMPT = /(ödeme|odeme).*(bulunmamaktadır|bulunmamaktadir|bulunmuyor|yok|geçerli değildir|gecerli degildir|yalnızca nakit|yalnizca nakit)/i.test(text);
  const flowReminder = /[.,]?\s*(fotoğrafınızı|foto.*gönder|foto.*bekl|adres.*ilet|ödeme.*seç)[^.]*[.!]?\s*$/i;
  if (flowReminder.test(text) && text.length > 50 && !TRIM_EXEMPT_INTENTS.includes(ctx.intent) && !STAGE_INVITE_EXEMPT && !HIGH_INTENT_EXEMPT && !INFO_FLOW_EXEMPT && !ADDRESS_SLOT_EXEMPT && !PAYMENT_FLOW_EXEMPT && !ACK_PREFIX_EXEMPT && !SMALLTALK_PREFIX_EXEMPT && !NEGATIVE_PAYMENT_INFO_EXEMPT) {
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
  // Ayrıca "Adres?", "Telefon?", "İsim?" tek kelimelik prompt'lar da buraya düşüyor.
  if (/^[A-ZÇĞİÖŞÜa-zçğıöşü]{2,15}\?\s*😊?\s*$/.test(text.trim())) {
    console.log("[GUARD] AI_LEAK: short question stripped → ", text.trim());
    const stage = ctx.fields?.conversation_stage || "";
    if (stage === "waiting_photo") text = "Fotoğrafınızı buradan iletebilirsiniz efendim 😊";
    else if (stage === "waiting_payment") text = "Ödeme tercihinizi belirtebilir misiniz efendim? EFT / Havale veya kapıda ödeme 😊";
    else if (stage === "waiting_address") text = "Ad soyad, cep telefonu ve açık adres bilgileriniz ile devam edelim efendim 😊";
    else text = "Tabi efendim 😊";
  }
  // "Tam efendim..." gibi LLM'in mesajı KESMİŞ cümleleri yakala (müşteri "Tamam" dedi, bot "Tam" diye parse etti)
  // Pattern: başta 3-4 karakterlik truncated Türkçe kelime ardından "efendim"
  if (/^(Tam|Evt|Hyr|Pek|Tem|Ank)\s+efendim/i.test(text.trim())) {
    console.log("[GUARD] AI_LEAK: truncated word stripped → ", text.substring(0, 40));
    const stage = ctx.fields?.conversation_stage || "";
    if (stage === "waiting_photo") text = "Tamam efendim, fotoğrafınızı bekliyorum 😊";
    else text = "Tabi efendim 😊";
  }

  // "ben sen" AI hatası
  if (text.includes("ben Sen ") || text.includes("ben sen ")) {
    text = text.replace(/ben [Ss]en /g, "");
  }

  // ═══ TEKRAR-ÖNLEME (VARYASYON) ═══
  // Bot art arda AYNI cevabı vermesin — "sürekli aynı şeyi söylüyorsunuz" şikayetini önler.
  // Aynı tür aşama daveti tekrarlanacaksa farklı kelimelerle söyle.
  {
    const prev = (ctx.fields?.ai_reply || "").trim();
    const cur = text.trim();
    if (prev && cur) {
      const seed = (ctx.message || ctx.norm || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const POOLS = [
        { test: /fotoğraf.*(ilet|gönder|bekl)|fotoğrafınızı buradan/i, variants: [
          "Fotoğrafınızı buradan iletebilirsiniz efendim 😊",
          "Hazır olduğunuzda fotoğrafınızı buradan gönderebilirsiniz efendim 😊",
          "Fotoğrafınızı bekliyorum efendim, dilediğinizde buradan iletebilirsiniz 😊",
          "Kullanmak istediğiniz fotoğrafı buradan gönderebilirsiniz efendim 😊",
        ]},
        { test: /ödeme terci|hangisini tercih|eft.*kapıda|kapıda ödeme mi|ödeme.*belirt/i, variants: [
          "Ödeme tercihinizi belirtebilir misiniz efendim? EFT / Sitemizden Kartla Ödeme veya kapıda ödeme.",
          "Nasıl ödemek istersiniz efendim? EFT / Sitemizden Kartla Ödeme ya da kapıda ödeme seçebilirsiniz.",
          "Ödeme yönteminizi öğrenebilir miyim efendim? EFT / Sitemizden Kartla Ödeme veya kapıda ödeme.",
        ]},
        { test: /açık adres|adresinizi (ilet|yaz)|adres bilgi/i, variants: [
          "Açık adres bilgileriniz ile devam edebiliriz efendim 😊",
          "Teslimat için açık adresinizi iletebilir misiniz efendim? 😊",
          "Siparişiniz için açık adres bilginizi alabilir miyim efendim? 😊",
        ]},
        { test: /harf.*(yaz|ilet)|istediğiniz harf|yaprak.*(isim|yaz)|isim.*sembol/i, variants: [
          "Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊",
          "Hangi harflerin işlenmesini istersiniz efendim? 😊",
          "İstediğiniz harf ya da isimleri buraya yazabilirsiniz efendim 😊",
        ]},
        // Telefon isteği (298x tekrar)
        { test: /cep telefonu numaranızı|telefon numaranızı (ilet|yaz|da)/i, variants: [
          "Cep telefonu numaranızı iletebilir misiniz efendim? 😊",
          "Size ulaşabilmemiz için telefon numaranızı alabilir miyim efendim? 😊",
          "Telefon numaranızı da paylaşır mısınız efendim? 😊",
        ]},
        // Menü (826x tekrar) — tekrarında TAM menü yerine kısa yönlendirme
        { test: /hangi ürün ile ilgileniyorsunuz|hangi model ile ilgileniyor/i, variants: [
          "Yukarıdaki ürünlerden hangisiyle ilgileniyorsunuz efendim? Numarasını yazmanız yeterli 😊",
          "Hangi ürünümüzü istersiniz efendim? 1-6 arası numarayı yazabilirsiniz 😊",
          "Dilediğiniz ürünün numarasını yazabilirsiniz efendim 😊",
        ]},
        // Operatör devri (273x + 151x + 63x tekrar)
        { test: /ekibimize iletiyorum|ekibimize yönlendiriyorum|sizi ekibimize|ekibimize aktar/i, variants: [
          "Ekibimize ilettim efendim, en kısa sürede dönüş sağlanacaktır 😊",
          "Konuyu ekibimize aktardım efendim, kısa süre içinde size dönüş yapılacaktır 😊",
          "İlgili ekibimize ilettim efendim, en kısa sürede yanıt alacaksınız 😊",
        ]},
        { test: /^(tabi|tabii|elbette)\s+efendim\s*😊?\s*$/i, variants: [
          "Tabii efendim 😊", "Elbette efendim 😊", "Memnuniyetle efendim 😊", "Rica ederim efendim 😊",
        ]},
      ];
      for (const pool of POOLS) {
        if (!pool.test.test(cur)) continue;
        const prevSamePool = pool.test.test(prev) || pool.variants.some(v => v.trim() === prev);
        if (prev === cur || prevSamePool) {
          let idx = seed % pool.variants.length;
          if (pool.variants[idx].trim() === prev) idx = (idx + 1) % pool.variants.length;
          text = pool.variants[idx];
          console.log("[GUARD] ANTI-REPEAT-VARIETY: varied repeated reply");
        }
        break;
      }
    }
  }

  reply.text = text;
  return reply;
}
