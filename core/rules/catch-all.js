// catch-all.js — Son çare deterministik cevaplar
// SON BOT CEVABI + STAGE + PRODUCT context'i birlikte değerlendirilir
import { STAGE, REPLY_CLASS, SUPPORT_REASON } from "../constants.js";
import { hasAny, looksLikePhotoUrl, normalizeText } from "../normalize.js";

const R = (t, c = REPLY_CLASS.FLOW_PROGRESS) => ({ text: t, reply_class: c, support_mode_reason: "" });
const OP = (t) => ({ text: t, reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL });

// ─── LAST BOT REPLY CONTEXT ────────────────────────────────
function readLastBotContext(fields) {
  const lr = normalizeText(fields.ai_reply || "");
  return {
    askedPayment: (lr.includes("eft") && lr.includes("kapida")) || lr.includes("odeme yontemi"),
    askedAddress: lr.includes("ad soyad") || lr.includes("acik adres") || lr.includes("telefon"),
    askedPhoto: lr.includes("fotograf") && (lr.includes("gonder") || lr.includes("iletebilir")),
    askedBackText: lr.includes("arka yuz") || lr.includes("yazi eklemek"),
    confirmedOrder: lr.includes("siparis") && lr.includes("tamamlan"),
    askedLetters: lr.includes("harf") && lr.includes("yazabilirsiniz"),
  };
}

export function catchAll(ctx, state) {
  const { norm, message } = ctx;
  const raw = String(message || "").trim();
  const stage = state.conversation_stage || "";
  const botCtx = readLastBotContext(ctx.fields || {});

  // ── Short confirm / emoji ──
  const looksLikeShortName = /^[A-ZÇĞİÖŞÜ]/.test(raw) && raw.length >= 4 && /^[a-zA-ZçğıöşüÇĞİÖŞÜ]+$/.test(raw);
  const CONFIRM_WORDS = ["tamam","tamamdir","tmm","tmmm","olur","peki","evet","ok","tamam dir","anladim","anladım","he","hee"];
  const isConfirm = raw.length <= 15 && !looksLikeShortName && hasAny(norm, CONFIRM_WORDS);
  const isEmoji = raw.length <= 4 && /^[^\w\s]+$/.test(raw);
  const isShort = raw.length <= 6 && !looksLikeShortName && !hasAny(norm, ["fiyat","iban","eft","iptal"]);
  const isTmExact = norm === "tm";

  if (isConfirm || isTmExact || isEmoji || isShort) {
    // ═══ SMART CONFIRM: Son bot cevabı + stage birlikte ═══

    if (botCtx.askedPayment && stage === STAGE.WAITING_PAYMENT) {
      return R("Tabi efendim 😊 EFT / Havale veya kapıda ödeme seçeneklerimiz mevcuttur. Hangisini tercih edersiniz?");
    }
    if (botCtx.askedAddress && stage === STAGE.WAITING_ADDRESS) {
      const hasPhone = state.phone_received === "1";
      const hasAddr = state.address_status === "address_only" || state.address_status === "received";
      if (hasPhone && !hasAddr) return R("Açık adresinizi iletebilir misiniz efendim? 📍");
      if (!hasPhone && hasAddr) return R("Cep telefonu numaranızı iletebilir misiniz efendim? 📱");
      return R("Tabi efendim 😊 Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz?");
    }
    if (botCtx.askedPhoto || stage === STAGE.WAITING_PHOTO) {
      return R("Fotoğrafınızı buradan iletebilirsiniz efendim 😊");
    }
    if (botCtx.askedBackText || stage === STAGE.WAITING_BACK_TEXT) {
      if (hasAny(norm, ["evet","olur","tamam","tamamdir","he"])) {
        return R("Arka yüze ne yazılmasını istersiniz efendim? 😊 İsim, tarih veya kısa bir not yazabilirsiniz.");
      }
      return R("Arka yüze yazı eklemek ister misiniz efendim? İstemezseniz \"yok\" yazabilirsiniz 😊");
    }
    if (botCtx.askedLetters || stage === STAGE.WAITING_LETTERS) {
      return R("Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊");
    }
    if (botCtx.confirmedOrder) return R("Tabi efendim 😊");

    // Stage fallback
    if (stage === STAGE.WAITING_PAYMENT) return R("Tabi efendim 😊 EFT / Havale veya kapıda ödeme seçeneklerimiz mevcuttur. Hangisini tercih edersiniz?");
    if (stage === STAGE.WAITING_ADDRESS) {
      const hasPhone = state.phone_received === "1";
      const hasAddr = state.address_status === "address_only" || state.address_status === "received";
      if (hasPhone && !hasAddr) return R("Açık adresinizi iletebilir misiniz efendim? 📍");
      if (!hasPhone && hasAddr) return R("Cep telefonu numaranızı iletebilir misiniz efendim? 📱");
      return R("Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊");
    }
    return R("Tabi efendim 😊");
  }

  // ── Gönderdim pattern ──
  if (hasAny(norm, ["gonderdim","gönderdim","attim","attım","yukarida","yukarıda","ustte","üstte","yazdim","yazdım","belirttim","belirtmistim","belirtmiştim","demin","az once","az önce","biraz once","biraz önce","daha once","daha önce","resim yukarida","resim yukarıda","yolladim","yolladım","gonderdlm","gondermiş oldugum"])) {
    if (stage === STAGE.WAITING_PHOTO) {
      if (!state.back_text_status) return R("Fotoğrafınızı aldım efendim 😊 Arka yüze yazı eklemek ister misiniz? İsterseniz yazıyı buradan iletebilirsiniz, istemezseniz \"yok\" yazabilirsiniz.");
      return R("Fotoğrafınızı aldım efendim 😊 Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?");
    }
    if (stage === STAGE.WAITING_ADDRESS) return R("Bilgilerinizi aldım efendim 😊 Eksik bilgi varsa ekibimiz sizinle iletişime geçecektir.");
    if (stage === STAGE.WAITING_BACK_TEXT) return R("Arka yüz bilginizi aldım efendim 😊 Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak?");
  }

  // ── Belirsiz orta mesajlar ──
  if (raw.length <= 2) return null;

  const isQuestion = /[?]/.test(raw) || /\b(mi|mı|mu|mü|misiniz|mısınız)\b/i.test(raw);
  const isMediumLength = raw.length > 15 && raw.length < 80;

  // ═══ "BUNDAN/ONDAN" PATTERN — ürün context varsa devam ettir ═══
  if (hasAny(norm, ["ondan","sundan","bundan","ondan olsun","sundan olsun","bundan olsun","heh bu","bu iste","bu isi","bu iyi","bunu begendim","bunu beğendim","bu guzel","bu güzel"])) {
    if (stage === STAGE.WAITING_PHOTO) return R("Tabi efendim 😊 Fotoğrafınızı buradan iletebilirsiniz.");
    if (stage === STAGE.WAITING_PAYMENT) return R("Tabi efendim, not aldım 😊 Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak?");
    if (stage === STAGE.WAITING_ADDRESS) return R("Tabi efendim, not aldım 😊 Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz?");
    if (stage === STAGE.WAITING_BACK_TEXT) return R("Tabi efendim 😊 Arka yüze yazı eklemek ister misiniz?");
    return R("Tabi efendim 😊");
  }

  // ── Stage-aware catch-all ──
  if (stage === STAGE.WAITING_PHOTO) {
    if (hasAny(norm, ["ulasmadi","geldi","gelmedi","siparis verdim","memnun degil"])) return OP("Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊");
    if (ctx.extracted?.hasAddress || ctx.extracted?.phone) {
      return R("Bilgilerinizi aldım efendim 😊 Şimdi fotoğrafınızı buradan iletebilirsiniz.");
    }
    // "Bi saniye" / "yarın atarım" / "sonra gönderirim" → bekle, stage koru
    if (hasAny(norm, ["bi saniye","bir saniye","birazdan","sonra","yarin","yarın","simdilik","aksamda","aksama","biraz bekle","hazirladiginda","hazirlayinca","bulamadim","bulamıyorum","dusuneyim","dusunuyorum","bakarim","bakalim"])) {
      return R("Tabi efendim, acele yok 😊 Hazır olduğunuzda fotoğrafı buradan iletebilirsiniz.");
    }
    // İsim tespiti
    const words = raw.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && /^[A-ZÇĞİÖŞÜ]/.test(raw) && raw.length <= 40 && !hasAny(norm, ["resimli","lazer","kolye","atac","siparis","fiyat","kargo","celik","merhaba","selam","detay"])) {
      return R("Bilgilerinizi aldım efendim 😊 Şimdi fotoğrafınızı buradan iletebilirsiniz.");
    }
    // Soru cümlesi → güvenli soft cevap
    if (isQuestion && isMediumLength) {
      return R("Tabi efendim 😊 Fotoğrafınızda bir sorun olursa ekibimiz size bilgi verecektir. Fotoğrafı hazır olduğunda buradan iletebilirsiniz.");
    }
    return R("Tabi efendim 😊 Fotoğrafınızı buradan iletebilirsiniz.");
  }
  if (stage === STAGE.WAITING_PAYMENT) {
    if (isMediumLength) return R("Tabi efendim 😊 Ödeme yönteminizi seçebilirsiniz: EFT / Havale veya kapıda ödeme.");
    return R("EFT / Havale veya kapıda ödeme seçeneklerimiz mevcuttur efendim 😊 Hangisini tercih edersiniz?");
  }
  if (stage === STAGE.WAITING_ADDRESS) {
    const hasPhone = state.phone_received === "1";
    const hasAddr = state.address_status === "address_only" || state.address_status === "received";
    if (hasPhone && hasAddr) return R("Bilgilerinizi aldım efendim 😊 Eksik bilgi varsa ekibimiz sizinle iletişime geçecektir.");
    if (hasPhone && !hasAddr) return R("Açık adresinizi iletebilir misiniz efendim? 📍 (İl, ilçe, mahalle, sokak)");
    if (!hasPhone && hasAddr) return R("Cep telefonu numaranızı iletebilir misiniz efendim? 📱");
    return R("Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊");
  }
  if (stage === STAGE.WAITING_LETTERS) return R("Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊");
  if (stage === STAGE.WAITING_BACK_TEXT) return R("Arka yüze yazı eklemek ister misiniz efendim? İstemezseniz \"yok\" yazabilirsiniz 😊");
  if (stage === STAGE.WAITING_PRODUCT) return ({ text: "Hangi model ile ilgileniyorsunuz efendim? 😊\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye", reply_class: REPLY_CLASS.MENU, support_mode_reason: "" });

  return null;
}
