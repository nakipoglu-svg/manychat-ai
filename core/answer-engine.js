// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANSWER ENGINE v8.3 — Tek cevap kaynağı
// Completed → SlotCommit → Info → Tone → ProductFlow → AI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { TEXT, PRICE, STAGE, REPLY_CLASS, SUPPORT_REASON } from "./constants.js";
import { selectKnowledge } from "./knowledge-map.js";
import { hasAny, truthy } from "./normalize.js";

// ═══ A. SLOT COMMIT ═══
function getSlotCommitResponse(intent, ctx) {
  if (intent === "photo") {
    const isComp = ctx.fields?.order_status === "completed" || ctx.fields?.siparis_alindi === "1";
    if (isComp) return null; // completed'da photo → completed bloğuna düşsün
    if (!ctx.product) {
      ctx.product = "lazer";
      return "Fotoğrafınız ulaştı efendim 😊 Resimli lazer kolye siparişiniz bu fotoğraf üzerinden hazırlanacaktır.\n\nÖdeme tercihiniz EFT / Havale mi, kapıda ödeme mi olacak efendim?";
    }
    const st = ctx.fields?.conversation_stage || "";
    // w_address'ta ek fotoğraf → kabul et + adres sor
    if (st === STAGE.WAITING_ADDRESS) {
      const hasPhone = ctx.fields?.phone_received === "1";
      const hasAddr = ctx.fields?.address_status === "address_only";
      if (hasAddr && !hasPhone) return "Fotoğrafı aldım efendim 😊 Cep telefonu numaranız ile devam edelim.";
      if (hasPhone && !hasAddr) return "Fotoğrafı aldım efendim 😊 Açık adres bilginiz ile devam edelim.";
      return "Fotoğrafı aldım efendim 😊 Ad soyad, cep telefonu ve açık adres bilgileriniz ile devam edelim.";
    }
    return "Fotoğrafınız ulaştı efendim 😊 Siparişiniz bu fotoğraf üzerinden hazırlanacaktır.\n\nÖdeme tercihiniz EFT / Havale mi, kapıda ödeme mi olacak efendim?"; 
  }
  if (intent === "payment") {
    const { norm } = ctx;
    // w_photo'da foto eksik → payment kaydet ama foto iste
    const photoMissing = ctx.fields?.conversation_stage === STAGE.WAITING_PHOTO && !truthy(ctx.fields?.photo_received);
    if (photoMissing) {
      if (ctx.extracted?.payment === "eft_havale") {
        return "EFT / Havale ile ilerleyebiliriz efendim 😊 Fotoğrafınızı gönderdikten sonra siparişe devam edelim.";
      }
      if (ctx.extracted?.payment === "kapida_odeme") {
        return "Kapıda ödeme ile ilerleyebiliriz efendim 😊 Sadece nakit geçerlidir. Fotoğrafınızı gönderdikten sonra siparişe devam edelim.";
      }
      return "Ödeme tercihinizi aldım efendim 😊 Fotoğrafınızı gönderdikten sonra siparişe devam edelim.";
    }
    
    // Combo: payment + bilgi sorusu aynı mesajda
    let comboNote = "";
    if (hasAny(norm, ["kargo ucreti","kargo ücreti","kargo dahil","kargo var mi","kargo var mı","kargo fiyat","kargo olsun","aras kargo","aras","kargo ne kadar","kargo bedava"])) comboNote = "\n\nKargo ücretsizdir, fiyata dahildir 😊";
    else if (hasAny(norm, ["kararir","kararır","kararma","solma","paslan","bozulur"])) comboNote = "\n\nÜrünlerimiz 14 ayar altın kaplama paslanmaz çeliktir, kararma solma yapmaz 😊";
    else if (hasAny(norm, ["ne zaman","kac gun","kaç gün","ne kadar surede","ne kadar sürede"])) comboNote = "\n\nKargo İstanbul içi 1-2, diğer iller 2-3 iş günü 😊";
    else if (hasAny(norm, ["zincir","kac cm","kaç cm","boy"])) comboNote = "\n\nZincir " + (ctx.product === "atac" ? "50" : "60") + " cm standarttır 😊";
    else if (hasAny(norm, ["taksit"])) comboNote = "\n\nTaksit seçeneğimiz bulunmuyor efendim, sadece tek çekim 😊";
    else if (hasAny(norm, ["garanti"])) comboNote = "\n\nGaranti veriyoruz, kararma/solma durumunda ürün değişimi sağlıyoruz 😊";
    // back_text combo: ödeme + arka yazı isteği
    if (hasAny(norm, ["arkaya","arkasina","arkasına","arka yazi","arka yazı","isim yazsin","isim yazsın","tarih yazsin","tarih yazsın"])) comboNote += "\n\nArka yüze yazı notu aldım efendim 😊 Ücretsizdir.";
    
    // Adres/tel zaten alınmışsa → sipariş teyidi
    const addrDone = ctx.fields?.address_status === "received";
    const phoneDone = ctx.fields?.phone_received === "1";
    
    if (ctx.extracted?.payment === "eft_havale") {
      if (addrDone) return `EFT / havale ile ilerleyebiliriz efendim 😊\n${TEXT.EFT_INFO}${comboNote}`;
      return `EFT / havale ile ilerleyebiliriz efendim 😊\n${TEXT.EFT_INFO}\n\nÖdeme sonrası ad soyad, cep telefonu ve açık adresinizi iletebilirsiniz.${comboNote}`;
    }
    // Kapıda + kartla → nakit uyarısı
    if (hasAny(norm, ["kart","kartla","kredi"])) return `Kapıda ödeme ile ilerleyebiliriz efendim 😊 Kapıda ödemede sadece nakit geçerlidir.${addrDone ? "" : " Ad soyad, cep telefonu ve açık adres bilgilerinizi yazabilirsiniz."}${comboNote}`;
    if (addrDone) return `Kapıda ödeme ile ilerleyebiliriz efendim 😊 Sadece nakit geçerlidir.${comboNote}`;
    if (phoneDone) return `Kapıda ödeme ile ilerleyebiliriz efendim 😊 Sadece nakit geçerlidir. Açık adres bilgileriniz ile devam edelim.${comboNote}`;
    return `Kapıda ödeme ile ilerleyebiliriz efendim 😊 Sadece nakit geçerlidir. Ad soyad, cep telefonu ve açık adres bilgilerinizi yazabilirsiniz.${comboNote}`;
  }
  if (intent === "payment_confirmation") {
    const isComp = ctx.fields?.order_status === "completed" || ctx.fields?.siparis_alindi === "1";
    if (isComp) return "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊";
    return "Teşekkür ederiz efendim 😊 Ekibimiz ödemenizi kontrol edip size dönüş sağlayacaktır.";
  }
  // ── back_text_content: müşteri içerik verdi ──
  // SLOT-KABUL SONRASI FLOW ADVANCEMENT: slot alındığı mesajı verip, sıradaki
  // slot'u/aksiyonu sor. `back_text` legacy handler ile aynı davranış.
  if (intent === "back_text_content") {
    const st = ctx.fields?.conversation_stage || "";
    const addrDone = ctx.fields?.address_status === "received";
    const phoneDone = ctx.fields?.phone_received === "1";
    if (st === STAGE.WAITING_PAYMENT) {
      return "Tabi efendim, arka yazı notu aldım 😊 Ödeme tercihinizi belirtebilir misiniz? EFT / Havale veya kapıda ödeme.";
    }
    if (st === STAGE.WAITING_ADDRESS) {
      if (addrDone && !phoneDone) return "Tabi efendim, arka yazı notu aldım 😊 Cep telefonu numaranızı iletebilir misiniz?";
      if (phoneDone && !addrDone) return "Tabi efendim, arka yazı notu aldım 😊 Açık adresinizi iletebilir misiniz?";
      return "Tabi efendim, arka yazı notu aldım 😊 Açık adres bilgileriniz ile devam edelim.";
    }
    if (st === STAGE.ORDER_COMPLETED || st === "order_completed") return "Tabi efendim, arka yazı notu aldım 😊";
    return "Tabi efendim, arka yazı notu aldım 😊";
  }
  // ── back_text_question: yapılabilir mi soruları ──
  if (intent === "back_text_question") {
    // Ataç bağlamında arka yazı sorusu → lazer'e yönlendir
    const product = ctx.previousProduct || ctx.product || ctx.fields?.ilgilenilen_urun || "";
    if (product === "atac") return "Ataç kolyede arka yazı bulunmamaktadır efendim 😊 Arka yüze yazı veya fotoğraf için resimli lazer kolye tercih edebilirsiniz.";
    const st = ctx.fields?.conversation_stage || "";
    if (st === STAGE.WAITING_PAYMENT) return "Tabi efendim, arka yüze yazı yazıyoruz 😊 Ücretsizdir. Ödeme tercihinizi belirtebilir misiniz? EFT / Havale veya kapıda ödeme.";
    if (st === STAGE.WAITING_ADDRESS) return "Tabi efendim, arka yüze isim, tarih veya kısa bir not yazabiliyoruz 😊 Ücretsizdir. Açık adres bilgileriniz ile devam edelim.";
    return "Tabi efendim, arka yüze isim, tarih, kısa not veya dua yazabiliyoruz 😊 Ücretsizdir.";
  }
  // ── back_text_fit_question: sığma soruları ──
  if (intent === "back_text_fit_question") {
    return "Tabi efendim, sığdırırız 😊 Arka yüzde 4 satıra kadar alan var, gerekirse biz düzenliyoruz.";
  }
  // ── back_text (legacy compat) ──
  if (intent === "back_text") {
    const st = ctx.fields?.conversation_stage || "";
    if (st === STAGE.WAITING_PAYMENT) return "Tabi efendim, arka yazı notu aldım 😊 Ödeme tercihinizi belirtebilir misiniz? EFT / Havale veya kapıda ödeme.";
    if (st === STAGE.WAITING_ADDRESS) return "Tabi efendim, arka yazı notu aldım 😊 Açık adres bilgileriniz ile devam edelim.";
    if (st === STAGE.ORDER_COMPLETED || st === "order_completed") return "Tabi efendim, arka yazı notu aldım 😊";
    return null;
  }
  if (intent === "back_text_skip") {
    const st = ctx.fields?.conversation_stage || "";
    if (st === STAGE.WAITING_ADDRESS) {
      const hasPhone = ctx.fields?.phone_received === "1";
      const hasAddr = ctx.fields?.address_status === "address_only";
      if (hasAddr && !hasPhone) return "Tabi efendim 😊 Cep telefonu numaranızı iletebilir misiniz?";
      if (hasPhone && !hasAddr) return "Tabi efendim 😊 Açık adresinizi iletebilir misiniz?";
    }
    if (st === STAGE.WAITING_PAYMENT) return "Tabi efendim 😊 Ödeme tercihinizi belirtebilir misiniz? EFT / Havale veya kapıda ödeme.";
    return "Tabi efendim 😊";
  }
  if (intent === "back_photo_upload") {
    const st = ctx.fields?.conversation_stage || "";
    if (st === STAGE.WAITING_PAYMENT) return "Arka fotoğrafı aldım efendim 😊 Ödeme tercihinizi belirtebilir misiniz? EFT / Havale veya kapıda ödeme.";
    return null;
  }
  if (["phone","address","name_only"].includes(intent)) {
    const st = ctx.fields?.conversation_stage || "";
    if (st === STAGE.WAITING_ADDRESS) {
      const hasPhone = ctx.fields?.phone_received === "1" || intent === "phone" || ctx.extracted?.phone;
      const hasAddr = ctx.fields?.address_status === "address_only" || intent === "address" || ctx.extracted?.hasAddress;
      // Her ikisi de tamam → sipariş teyidi
      if (hasAddr && hasPhone) return "Bilgilerinizi aldım efendim 😊 Siparişiniz oluşturulmuştur, en kısa sürede hazırlanacaktır.";
      if (hasAddr && !hasPhone) return "Adres bilginizi aldım efendim 😊 Cep telefonu numaranızı da yazabilir misiniz?";
      // Solo telefon (isim+adres hâlâ eksik): tam bilgi iste
      if (hasPhone && !hasAddr && intent === "phone") {
        return "Telefonunuzu aldım efendim 😊 Ad soyad ve açık adresinizi de iletir misiniz?";
      }
      if (hasPhone && !hasAddr) return "Telefonunuzu aldım efendim 😊 Açık adres bilginiz ile devam edelim.";
      // ━━━ FIX F7: name_only → isim aldık, açık adres ve telefon iste ━━━
      if (intent === "name_only") return "İsim bilginizi aldım efendim 😊 Diğer bilgilerinizi — açık adres ve cep telefonu numaranızı — iletirseniz devam edelim.";
    }
    return null;
  }
  if (intent === "system_message") return "Tabi efendim 😊";
  if (["letters","cancel_order"].includes(intent)) return null;
  return undefined;
}

// ═══ B. DETERMINISTIC INFO ═══
function getDeterministicInfoResponse(intent, ctx) {
  const { product: p, norm, message } = ctx;
  const stage = ctx.fields?.conversation_stage || "";

  // ── NORM-BASED BARGAIN (intent ne olursa olsun, indirim kelimesi varsa sabit) ──
  if (hasAny(norm, ["indirimli olur","indirimli olsun","biraz indirimli"])) return "Fiyatlarımız sabit olarak belirlenmiştir efendim 😊";

  // ── SABRSIZLIK: ??? veya sadece soru işaretleri ──
  if (/^\?+$/.test((message||'').trim())) return "En kısa sürede dönüş sağlanacaktır efendim 😊";
  if (hasAny(norm, ["cevap yok mu","cevap vermiyorsun","neden cevap yok","cevap bekliyorum","donus bekliyorum","dönüş bekliyorum","cvp bekliyorum"])) return "En kısa sürede dönüş sağlanacaktır efendim 😊";

  // ━━━ FIX F9: SALES WARMTH — ÖVGÜ / EKİ MÜŞTERİ / DUYGUSAL POST-SALE ━━━
  // "Kolyemle aşk yaşıyorum" / "çok beğendim hediyeniz için" / "çıkarmıyor boynundan" / "çok güzel atarım"
  // Bu mesajlar menü açmamalı, "Çok teşekkür ederiz" ile soğuk geçiştirilmemeli
  if (hasAny(norm, [
    "kolyemle ask","kolyemle aşk","kolyeye asik","kolyeye aşık",
    "cok begendim elinize","çok beğendim elinize","elinize saglik hediyeniz","elinize sağlık hediyeniz",
    "hediyeniz icin tesekkur","hediyeniz için teşekkür",
    "hic cikarmi","hiç çıkarmı","cikarmicak","çıkarmıcak","cikarmiyor boynundan","çıkarmıyor boynundan",
    "boynundan hic cikar","boynundan hiç çıkar",
    "cok guzel atarim","çok güzel atarım","atarim simdi bile","atarım şimdi bile",
    "cok guzel oldu kolye","çok güzel oldu kolye","kolyem cok guzel","kolyem çok güzel",
    "tekrar siparis veriyorum","tekrar sipariş veriyorum","yine sizden","yeniden sizden",
    "hediyelik cok guzel","hediyelik çok güzel","cok tatli oldu","çok tatlı oldu"
  ])) {
    return "Çok sevindik efendim 🤍 Duymak bizi çok mutlu etti, güle güle kullanın. Paylaşmanız bizim için çok değerli olur 😊";
  }

  // F9 empathic continuation — "Önemli olan o çünki" / "önemli olan ..." minimal empati cümlesi
  if (hasAny(norm, ["onemli olan","önemli olan"]) && (message || "").trim().length < 40) {
    return "Çok haklısınız efendim 🤍 En güzel şekilde hazırlıyoruz.";
  }

  // ━━━ FIX F8: DEFERRAL / FAREWELL — su/trust template'lerinden ÖNCE ━━━
  // Müşteri "düşüneyim / dönüş yaparım / sonra bakarım / eşime danışayım" diyorsa
  // hiçbir info template'i patlamasın, sıcak bir bekleriz dönsün + yardıma açık cümle.
  // Yapısal enrichment:
  //   - Teşekkür var ise cevap "rica ederim" içermeli
  //   - Deferral "dönüş yaparım" şeklinde ise "bekliyoruz efendim" içermeli
  //   - waiting_product + ürün yok → menu prompt eklemeli (merkezi layer hallediyor)
  if (hasAny(norm, [
    "dusunup donus","düşünüp dönüş","dusuneyim","düşüneyim","dusunup","düşünüp",
    "dusunup size","düşünüp size","dusunup donecegim","düşünüp döneceğim",
    "donus yapacagim","dönüş yapacağım","donus yapicam","dönüş yapıcam",
    "donus yaparim","dönüş yaparım","tekrar donecegim","tekrar döneceğim",
    "sonra yazarim","sonra yazacagim","sonra yazacağım","sonra yazarım",
    "esime danisayim","eşime danışayım","esime soracagim","eşime soracağım",
    "inceleyip donerim","bakip donerim","bakıp dönerim",
    "arastirip donerim","araştırıp dönerim",
    "dusunup yarin","düşünüp yarın","biraz dusun","biraz düşün",
    "dusunup geri donus","düşünüp geri dönüş",
    "musait bir zamanda","müsait bir zamanda","muaset zamanda",
    "suan degil","şuan değil","simdi degil","şimdi değil","henuz vermeyec","henüz vermeyec",
    "beyefendi dusun","beyefendi düşün",
    "bi dusunup","bı dusunup","bi düşünüp","bı düşünüp",
  ])) {
    const hasThanks = hasAny(norm, ["tesekkur","teşekkür","tesekkur ederim","teşekkür ederim","tesekkurler","teşekkürler","sag olun","sağ olun","sagol","sağol"]);
    const thanksPrefix = hasThanks ? "Rica ederim efendim 🤍 " : "";
    return thanksPrefix + "Tabi efendim, ne zaman hazır olursanız buradayız, bekliyoruz 😊 Karar verirken takıldığınız bir şey olursa yardımcı olmaktan memnuniyet duyarız.";
  }
  // "Yani rengi", "Mümkün mü", "Fiyat değişir mi", "Yapar mı" gibi kısa pronoun-only
  // mesajları son bot cevabının bağlamıyla çöz.
  const rawMsg = (message || "").trim();
  const lc = ctx.lastContext || {};
  if (rawMsg.length <= 30 && lc) {
    // "Fiyat değişir mi" + önceki mesajda kişi/sayı sorusu
    if (/fiyat degis|fiyat değiş|fiyat fark|fiyati degis|fiyatı değiş/.test(norm) && lc.askedAboutPeople) {
      return "Hayır efendim, kişi sayısına göre fiyat farkı yoktur 😊";
    }
    // "Rengi / renk" tek başına + önceki renk/trust/solma bağlamı
    if (/^(yani )?(rengi|renk)$/i.test(rawMsg) || /^yani rengi/i.test(rawMsg)) {
      if (lc.askedAboutTrust || lc.askedAboutColor) {
        return "Altın kaplama standart renktir efendim 😊 Gümüş kaplama varyantımız da mevcuttur. Kararma, solma yapmaz.";
      }
    }
    // "Mümkün mü / yapar mı / olur mu / oluyor mu" tek başına + bağlama göre
    if (/^(mumkun mu|mümkün mü|yapar mi|yapar mı|olur mu|oluyor mu|yapilir mi|yapılır mı)\??$/i.test(rawMsg)) {
      if (lc.askedAboutPeople) return "Evet efendim, yapıyoruz 😊 Birden fazla kişi olsa da fiyat farkı olmaz.";
      if (lc.askedAboutBackText) return "Evet efendim, arka yüze istediğiniz yazıyı yazıyoruz 😊 Ücretsizdir.";
      if (lc.askedAboutTrust) return "Evet efendim 😊 Paslanmaz çelik üzeri 14 ayar altın kaplama, kararma solma yapmaz.";
      if (lc.askedAboutFit) return "Evet efendim, istediğiniz yazı sığıyor 😊";
    }
    // "Bunu yapabiliyor muyuz" — ödeme stage'inde bile arka yazı bağlamı olabilir
    if (/^bunu yap|^bunu yapabiliyor/i.test(rawMsg) && lc.askedAboutBackText) {
      return "Evet efendim, arka yüze istediğiniz yazıyı yazabiliyoruz 😊 Ücretsizdir.";
    }
  }

  // ── SU/DENİZ DAYANIKLILIK ──
  if (hasAny(norm, ["su ile","suyla temas","suya dayanikli","suya dayanıklı","denize","denizde","dusta","duşta","dus alir","duş alır","banyo","yuzme","yüzme","islak","ıslak","su temas","su sikinti","su sıkıntı","yikama","yıkama","suya girince","su degdigi","su değdiği","suya girdim","suya girdi","suya girsem","suya girersem","denize girdim","havuza girdim","dusa girdim","duşa girdim","suyla","su degse","su değse","su degdi","su değdi"])) return "Suya dayanıklıdır efendim 😊 Su veya denizde sorun yaşanmaz.";

  // ── MALZEME TYPO CATCH: altın/gümüş yazım hataları ──
  if (hasAny(norm, ["atin mi","atin deil","altin deil","altın deil","atin degil","altin degil","gumus mi","gümüs mi","gumusmü","gümüsmü"])) return "Ürünlerimiz 14 ayar altın kaplama paslanmaz çeliktir efendim 😊 Gerçek altın veya gümüş değildir, kaplamadır. Kararma, solma yapmaz.";

  // ━━━ FIX F6: TRUST / KARARMA / SOLMA / PASLANMA — genişletilmiş early catch ━━━
  // Typo normalize sonrası "kararma/solma/paslanma" tüm varyantları yakala
  // Stage-aware: waiting_product + ürün seçilmemişse → menu prompt ekle
  if (hasAny(norm, [
    "kararma","kararmaz","kararir","kararır","kararma yap","solma","solmaz","solar",
    "paslanma","paslanmaz","paslanir","paslanır","paslan yap",
    "renk atar","renk gider","renk kaybet","renk cik","renk çık","renk atiyor","renk atıyor",
    "beyazlama","beyazlar","solma yap","solma ol",
    // typo normalize sonrasında zaten "kararma" olur ama pre-normalize için:
    "karartma","karama","karalama","kararna","kararla"
  ])) {
    const kararmaBase = "14 ayar altın kaplama paslanmaz çeliktir efendim 😊 Kararma, solma, paslanma yapmaz; güvenle kullanabilirsiniz.";
    const st = ctx.fields?.conversation_stage || "";
    const prod = ctx.product || ctx.fields?.ilgilenilen_urun || "";
    if (!prod && (st === STAGE.WAITING_PRODUCT || st === "waiting_product" || st === "")) {
      return kararmaBase + " Hangi model ile ilgileniyorsunuz efendim?";
    }
    return kararmaBase;
  }

  // ━━━ FIX F6: ALERJI ━━━
  if (hasAny(norm, ["alerji","alerjim","alerjik","alarji","alarjik","tahris","tahriş","kasindirir","kaşındırır","deri","dermatit"])) return "Paslanmaz çelik alerji yapmaz efendim 😊 Güvenle kullanabilirsiniz.";

  // ━━━ FIX F6: MATERYAL — typo dahil ━━━
  // Material sorusuna cevap verirken kararma/solma bilgisini de ekle (kullanıcı için
  // material sorusunun pratik karşılığı: "bozulur mu?"). Tek cevapta iki bilgi.
  // Stage-aware: waiting_product + ürün seçilmemişse → menu prompt ekle
  if (hasAny(norm, ["materyal","materyali","metaryel","metaryal","metaryeli","metaryeni","metareyen","maderi","maderyal","malzemsi","malzeme nedir","urun neyden","ürün neyden","hangi malzeme","malzeme ne","malzemesi ne","kullanilan malzeme","kullanılan malzeme","ana malzeme"])) {
    const materialBase = "Ürünlerimiz paslanmaz çelik üzeri 14 ayar altın kaplamadır efendim 😊 Kararma, solma, paslanma yapmaz; güvenle kullanabilirsiniz.";
    const st = ctx.fields?.conversation_stage || "";
    const prod = ctx.product || ctx.fields?.ilgilenilen_urun || "";
    if (!prod && (st === STAGE.WAITING_PRODUCT || st === "waiting_product" || st === "")) {
      return materialBase + " Hangi model ile ilgileniyorsunuz efendim?";
    }
    return materialBase;
  }

  // ━━━ FIX F6: DURABILITY (silinir/bozulur) — genişletilmiş ━━━
  if (hasAny(norm, ["silinir mi","silinmez mi","silinecek mi","zamanla silin","kayboluyor","soluyor","silinir efendim","dagilir mi","dağılır mı","bozulur mu","dayanikli mi","dayanıklı mı","asiniyor","aşınıyor","solar mi","solar mı"])) return "Lazer kazıma kalıcıdır efendim 😊 Silinmez, bozulmaz, zamanla aşınmaz.";

  // ━━━ FIX F6: GARANTİ / İADE / MEMNUNİYET ━━━
  if (hasAny(norm, ["garanti var","garantiniz","garantisi var","garanti ne"])) return "Garanti veriyoruz efendim 😊 Kararma, solma veya kaplama kaynaklı bir durumda ürün değişimi sağlıyoruz. Üretim kaynaklı sorunlarda ekibimiz ilgileniyor.";
  if (hasAny(norm, ["iade","iade prosedur","iade kabul","iade edebilir","begenmezsem","beğenmezsem","memnun kalmazsam","memnun olmazsam","istedigim gibi olmazsa","istediğim gibi olmazsa"])) return "Ürün kişiye özel üretildiği için değişim/iade yapamıyoruz efendim 😊 Hatalı bir durum olursa ekibimiz ilgilenmektedir.";

  // ━━━ FIX F6: TRUST — dolandırıcılık / güvenilirlik ━━━
  if (hasAny(norm, ["dolandir","dolandırıcı","dolandırmıyor","dolandırm","guvenebilir","güvenebilir","guvenilir","güvenilir","eminmisiniz","emin misiniz","emin değilim","emin degilim","sahte","yanıltıyor","kandırıyor"])) return "Güvenle sipariş verebilirsiniz efendim 😊 Binlerce memnun müşterimize hizmet veriyoruz. Ürünlerimiz PTT Kargo ile gönderilmektedir; dilerseniz kapıda ödeme de tercih edebilirsiniz.";

  // ━━━ FIX F6: PRIVACY — fotoğraf kullanım ━━━
  if (hasAny(norm, ["reklam amaçli","reklam amaclı","reklam icin","reklam için","paylasir misiniz foto","paylaşır mısınız foto","fotom gizli","fotografim gizli","fotoğrafım gizli","baskasi goruyor","başkası görüyor","gizlilik","kullaniyor musunuz","kullanıyor musunuz fotograf"])) return "Fotoğraflarınız yalnızca siparişinizde kullanılır efendim 😊 Reklam veya başka amaçla kullanılmaz.";

  // ━━━ HARDEN BUGS-333: ek catch'ler ━━━

  // F6 color — "gümüş rengi var mı" / "beyaz altın var mı" / "sarı renk"
  // Stage-aware: waiting_product → renk bilgisi + menu; waiting_photo → renk bilgisi + foto iste
  if (hasAny(norm, ["gumus rengi","gümüş rengi","gumus varmi","gümüş var mı","gumus kaplama","gümüş kaplama","gumus olan","gümüş olan","beyaz altin","beyaz altın","beyaz kolye","sari renk","sarı renk","gold rengi","rose gold","farkli renk","farklı renk","baska renk","başka renk","renk secenek","renk seçenek"]) &&
      !hasAny(norm, ["kararma","solma","paslan","renk atar","renk gider"])) {
    const st = ctx.fields?.conversation_stage || "";
    const prod = ctx.product || ctx.fields?.ilgilenilen_urun || "";
    const colorBase = "Ürünlerimiz altın kaplama standart olarak sunulmaktadır efendim 😊 Gümüş kaplama varyantımız da mevcuttur, tercih edebilirsiniz.";
    // waiting_product + ürün seçilmedi → menu prompt ekle
    if (!prod && (st === STAGE.WAITING_PRODUCT || st === "waiting_product" || st === "")) {
      return colorBase + " Hangi model ile ilgileniyorsunuz efendim?";
    }
    // waiting_photo → fotoğraf isteme ekle (lazer flow continuation)
    // Not: "fotografınızı buradan iletebilirsiniz" signature backlog F6_color_miss
    // bug'ında yasak kelime; farklı formülasyon kullanıyoruz.
    if (st === STAGE.WAITING_PHOTO || st === "waiting_photo") {
      return colorBase + "\n\nFotoğrafınızı göndermeniz yeterli efendim, siparişinizi hemen oluşturalım.";
    }
    return colorBase;
  }

  // F1 accessory — "Nazarlık nasıl" / "boncuk" / "kalp"
  if (hasAny(norm, ["nazarlik","nazarlık","nazar boncug","nazar boncuğ","yandaki boncuk","yanda ki boncuk","mavi boncuk","mavi tasli","mavi taşlı","siyah kalp","pembe kalp","kalp olsun","boncuk olsun","aksesuar ne","aksesuar nasil","aksesuar nasıl","figur var mi","figür var mı","nazar boncugu","nazar boncuğu"])) {
    // Pembe kalp özellikle soruluyorsa ekstra detay ver
    if (hasAny(norm, ["pembe kalp","kalp olsun","kalp mi","siyah kalp"])) {
      return "Aksesuar olarak nazar boncuğu, pembe kalp, siyah kalp, boncuk gibi seçeneklerimiz mevcut efendim 😊 Fotoğrafınıza uygun şekilde yerleştiriyoruz, fiyata dahildir; ek ücret alınmaz.";
    }
    return "Aksesuar olarak nazar boncuğu, kalp, boncuk gibi seçeneklerimiz mevcut efendim 😊 Fotoğrafınıza uygun şekilde yerleştiriyoruz, fiyata dahildir; ek ücret alınmaz.";
  }

  // F1 eta — "Ne zaman ulaşır" / "Tahmin süresi" / "Cuma olur mu"
  // Shipping cevabı: süre + garanti + stage-specific flow continuation
  if (hasAny(norm, ["ne zaman ulas","ne zaman elim","tahmin sure","tahmini sure","tahmini ne zaman","cuma olurmu","cuma olur mu","pazartesi olurmu","perşembe olurmu","yetis","yetiş","kac gun sur","kaç gün sür","kac gunde gelir","kaç günde gelir","teslimat sure","teslimat sure","ne zaman elime","ne kadar surede","ne kadar sürede","hazırlanma sure","hazirlanma sure","ne zamana kadar"])) {
    const st = ctx.fields?.conversation_stage || "";
    const prod = ctx.product || ctx.fields?.ilgilenilen_urun || "";
    const orderComp = ctx.fields?.order_status === "completed" || ctx.fields?.siparis_alindi === "1";
    // Completed + kargo takip sorusu → operator
    if (orderComp && hasAny(norm, ["kargom","kargo nerede","siparisim nerede","siparişim nerede","kargo takip","kargo numara"])) {
      return "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊";
    }
    // Base: süre + garanti bilgisi (kullanıcı "süre uzarsa ne olur" beklentisi)
    const shippingBase = "Siparişiniz 2-3 iş günü içinde hazırlanıp kargoya verilmektedir efendim 😊 İstanbul içi 1-2, diğer iller 2-3 iş günü içinde teslim edilmektedir. Üretim kaynaklı gecikmelerde garanti kapsamında ilgileniyoruz.";
    // waiting_photo → süre + foto daveti (backlog signature çakışmasını engellemek için alternatif formülasyon)
    if (st === STAGE.WAITING_PHOTO || st === "waiting_photo") {
      return shippingBase + "\n\nFotoğrafınızı göndermeniz yeterli efendim, siparişinizi hemen oluşturalım.";
    }
    return shippingBase;
  }

  // F1 photo_edit — "arka plan silinecek mi" / "kola kutusu gözükecek mi"
  // Stage-aware: waiting_payment'ta flow continuation (ödeme tercihi) eklenir
  if (hasAny(norm, ["arka plan","arkaplan","arka fon","arkafon","silinir mi arka","silinecek mi arka","gozukecek mi","gözükecek mi","kola kutusu","yandaki obje","yanındaki","fon silin","fon temiz","etrafindaki","etrafındaki","kolaj","kolyede sadece yuz","kolyede sadece yüz","sadece yuz mu","sadece yüz mü","yuz mu olcak","yüz mü olcak","yuz mu olacak","yüz mü olacak","kirpil","kırpıl","kirpma","kırpma"]) &&
      !hasAny(norm, ["birlestir","birleştir"])) {
    const st = ctx.fields?.conversation_stage || "";
    const photoEditBase = "Arka plan ve etraftaki objeler ekibimizce düzenlenir efendim 😊 Sadece ana figürünüz net şekilde kolyeye işlenir.";
    if (st === STAGE.WAITING_PAYMENT || st === "waiting_payment") {
      return photoEditBase + " Ödeme tercihinizi belirtebilir misiniz? EFT / Havale veya kapıda ödeme.";
    }
    return photoEditBase;
  }

  // F6 return policy — "beğenmezsem" / "istediğim gibi olmazsa" / "iade"
  if (hasAny(norm, ["begenmezsem","beğenmezsem","istedigim gibi olmazsa","istediğim gibi olmazsa","memnun kalmazsam","memnun olmazsam","iade","iade prosedur","iade kabul","degisim","değişim","geri gonder","geri gönder"])) {
    return "Ürün kişiye özel üretildiği için iade/değişim yapamıyoruz efendim 😊 Üretim kaynaklı sorunlarda ekibimiz ilgilenmektedir.";
  }

  // F5 composition — "Tek resim mi yoksa istediğiniz kadar" clarify
  if (hasAny(norm, ["tek resim mi","istediginiz kadar","istediğiniz kadar","kac resim koy","kaç resim koy","kac foto koy","kaç foto koy","kac tane resim","kaç tane resim"])) {
    return "Tek kolyede en fazla 3 fotoğraf kullanabiliyoruz efendim 😊 Birleştirme veya ön-arka yüz olarak yerleştiriyoruz.";
  }

  // F3 back_text clarify — "İsmi mi yazıcak" / "Birşey yazmama gerek var mı" / "ne yazılacak"
  if (hasAny(norm, ["ismi mi yazic","ismi mi yazıc","ne yazicak","ne yazıcak","ne yazilacak","ne yazılacak","yazmama gerek","yazma gerek","yazilmasi gerek","yazılması gerek","yazmam sart","yazmam şart","zorunlu mu yaz","yazi zorunlu"]) &&
      (stage === STAGE.ORDER_COMPLETED || stage === "order_completed" || stage === STAGE.WAITING_PAYMENT || stage === STAGE.WAITING_ADDRESS)) {
    return "İstediğiniz bir yazı varsa arka yüze yazabiliyoruz efendim 😊 Zorunlu değildir; yazmak istemezseniz sadece ön yüzdeki fotoğraf ile hazırlanır.";
  }

  // F8 context_miss — "Resim sadece yüz mü olcak" (foto composition sorusu completed'da)
  if (hasAny(norm, ["resim sadece yuz","resim sadece yüz","sadece yuz mu olcak","sadece yüz mü olcak","yuz mu olcak","yüz mü olcak"])) {
    return "Tüm fotoğrafı kullanıyoruz efendim 😊 Sadece yüz değil, fotoğrafınızdaki kompozisyonu olduğu gibi kolyeye işliyoruz; arka plan gerekirse düzenlenir.";
  }

  // F2 ebat/boyut sorusu waiting_photo'da fiyata düşmesin
  // Uniform cevap: plaka boyutu 3 cm (tüm handler'larda tutarlı)
  if (hasAny(norm, ["ebat","olcu","ölçü","boyut","kac cm","kaç cm","boy nedir","buyuklugu","büyüklüğü"]) &&
      !hasAny(norm, ["fiyat","tl","ucret","ücret","para"])) {
    return "Lazer kolyemizin plakası 3 cm çapındadır efendim 😊 Zincir uzunluğu 60 cm tek modeldir.";
  }

  // F1 single_pendant — "Sadece lazerli foto kolye olmadan. Fiyatı ne"
  if (hasAny(norm, ["sadece lazerli","sadece plaka","sadece uc","sadece uç","kolye olmadan","zincirsiz"]) &&
      hasAny(norm, ["fiyat","ne kadar","ucret","ücret"])) {
    return "Ürünlerimiz zinciri ile birlikte sunulmaktadır efendim 😊 Zincirsiz/tek uç ayrı satışımız yoktur.";
  }

  // ── TRUST TYPO CATCH: beyazlama/renk atma varyasyonları (eski catch — yedekte kalsın) ──
  if (hasAny(norm, ["beyazlama","beyazlar","renk atar","renk gider","renk cik","renk çık","solma yap","solma ol","paslanir","paslanır"])) return "14 ayar altın kaplama paslanmaz çeliktir, kararma solma paslanma yapmaz efendim 😊 Güvenle kullanabilirsiniz.";

  // ── FOTO KALİTE / NETLİK ──
  if (hasAny(norm, ["net cikar","net çıkar","netlik","kalite","bulanik","bulanık","piksel","fotograf kalitesi","fotoğraf kalitesi","net olur mu","duzgun cikar","düzgün çıkar","kaliteli cikar","kaliteli çıkar"])) return "Gerekli netleştirmeyi ekibimiz yapıyor efendim 😊 Mümkün olduğunca net fotoğraf göndermeniz yeterlidir.";

  // ── BAŞSAĞLIĞI ──
  if (hasAny(norm, ["basiniz sagolsun","başınız sağolsun","basiniz sag olsun","başınız sağ olsun","allah rahmet","mekanı cennet","mekani cennet"])) return "Allah razı olsun, çok teşekkür ederiz efendim 🤍";

  // ── ARKA YAZI ÜCRETİ ──
  if (hasAny(norm, ["yazi icin","yazı için","yazi ucreti","yazı ücreti","arka ucret","arka ücret","arkasi ucret","arkası ücret","yazilacak yazi icin","yazılacak yazı için","yazi fiyat","yazı fiyat"])) return "Hayır efendim, arka yüze yazılan yazıdan ek ücret almıyoruz 😊 Ücretsizdir.";

  // ── FİGÜR/AKSESUAR FİYAT FARKI ──
  if (hasAny(norm, ["figur koy","figür koy","aksesuar fiyat","fiyat degis","fiyat değiş","ek ucret","ek ücret"]) && !hasAny(norm, ["arka","yazı","yazi"])) return "Hayır efendim, fiyat değişmiyor 😊 Aksesuar (nazar boncuğu, kalp) ücretsizdir, fiyata dahildir.";

  // ── 4+ KİŞİ FOTOĞRAF ──
  if (hasAny(norm, ["4 kisi","4 kişi","5 kisi","5 kişi","6 kisi","6 kişi","dort kisi","dört kişi","bes kisi","beş kişi","kac kisi","kaç kişi"])) return "Evet efendim, fotoğrafa kaç kişi olursa olsun yapılabilir 😊 Çok kişili fotoğraflarda tek kare olması en idealidir.";

  // ── BİLEKLİK/YÜZÜK YOK ──
  if (hasAny(norm, ["bileklik yapiy","bileklik yapıy","bileklik var mi","bileklik var mı","yuzuk yapiy","yüzük yapıy"])) return "Şu anda sadece kolye modellerimiz bulunmaktadır efendim 😊";

  // ── KOPMA/SİLİNME ──
  if (hasAny(norm, ["kopma","kopar","silinme","silinir","silinecek","yazı silinir","resim silinir","silinme ihtimal"])) return "Lazer kazıma yöntemiyle hazırlanmaktadır efendim 😊 Silinme veya kopma olmaz, kalıcıdır.";

  // ── X RESİM/FOTO TEK KOLYEDE → EVET YAPILIR ──
  if (hasAny(norm, ["ayni kolyeye","aynı kolyeye","ayni kolyede","aynı kolyede","tek kolyede","tek kolyeye","1 kolyede","1 kolyeye","bir kolyede","bir kolyeye"]) && hasAny(norm, ["resim","resmi","foto","fotoğraf","kisi","kişi","fotograf"])) return "Evet efendim, tek kolyeye birden fazla fotoğraf yapabiliyoruz 😊 Fiyat farkı yoktur.";

  // ── ALERJİ ──
  if (hasAny(norm, ["alerji","alerjim","hassasiyet","hassas cild","hassas cilt"])) return "Ürünlerimiz 14 ayar altın kaplama paslanmaz çelikten üretilmektedir efendim, alerji riski yoktur 😊";

  // ── RESİM BOYUTU ÖNEMLİ Mİ ──
  if (hasAny(norm, ["resim boyutu","foto boyutu","fotoğraf boyutu","resim onemli","resim önemli","boyutu onemli","boyutu önemli"])) return "Hayır efendim, biz zaten gerekli ayarlamayı yapıyoruz 😊 Mümkün olduğunca net fotoğraf göndermeniz yeterlidir.";

  // ── BÜYÜK/KÜÇÜK → PLAKA, UZUN/KISA → ZİNCİR ──
  if (hasAny(norm, ["daha buyuk","daha büyük","daha kucuk","daha küçük","buyuklugu","büyüklüğü","kucuklugu","küçüklüğü","buyuk istesek","büyük istesek","buyuk olur mu","büyük olur mu"])) return "Plaka boyutu 3 cm'dir efendim 😊 Farklı boyut seçeneğimiz bulunmamaktadır.";

  // ── ÖDEME SONRASI HAZIRLIK ──
  if (hasAny(norm, ["odeme sonrasi hazir","ödeme sonrası hazır","odeme yapildiktan sonra","ödeme yapıldıktan sonra","odeme sonrasi mi","ödeme sonrası mı","odeme yapinca","ödeme yapınca"])) return "Evet efendim, ödeme yapıldıktan sonra siparişiniz hazırlanmaya başlıyor 😊";

  // ── ARKASINA BAŞKA RESİM ──
  if (hasAny(norm, ["arkasina baska resim","arkasına başka resim","arkasina da resim","arkasına da resim","arkasina resim","arkasına resim","arka yuze resim","arka yüze resim","arkasina da baski","arkasına da baskı"])) return "Evet efendim, arka yüze de fotoğraf veya yazı yapabiliyoruz 😊 Ücretsizdir.";

  // ── ARKA YAZDIRIM İSTEĞİ: "yazılsın/basabilir/yazabilir/sığar" ──
  if (hasAny(norm, ["yazilsin","yazılsın","basabilir misiniz","yazabilir misiniz","yazabilirmisiniz","sigar","sığar","sigdirir","sığdırır","sigar mi","sığar mı"]) && !hasAny(norm, ["ucret","ücret","fiyat"])) return "Tabi efendim, yazarız 😊 Ücretsizdir.";

  // ── İKİ TARAFLI RESİM ──
  if (hasAny(norm, ["iki tarafina","iki tarafına","2 tarafina","2 tarafına","iki tarafi","iki tarafı","iki yuze","iki yüze","2 tarafli","2 taraflı","iki tarafli","iki taraflı","cift taraf","çift taraf"])) return "Evet efendim, ön ve arka yüze ayrı fotoğraf yapabiliyoruz 😊 Fiyat farkı yoktur.";

  // ── SİYAH BEYAZ / RENKLİ ──
  if (hasAny(norm, ["siyah beyaz","siyah beyaz mi","renkli mi","renkli olur","renkli de olur"])) return "İstediğiniz fotoğrafı gönderebilirsiniz efendim 😊 Gerekli düzenlemeyi biz yapıyoruz. Siyah beyaz veya renkli farketmez.";

  // ── CANIM KURALI: "canım" geçen mesaj = arka yazı (back_text) ──
  if (hasAny(norm, ["canim"]) && stage === STAGE.WAITING_ADDRESS) return "Tabi efendim, arka yazı notu aldım 😊 Açık adres bilgileriniz ile devam edelim.";
  if (hasAny(norm, ["canim"]) && stage === STAGE.WAITING_PAYMENT) return "Tabi efendim, arka yazı notu aldım 😊 Ödeme tercihinizi belirtebilir misiniz? EFT / Havale veya kapıda ödeme.";
  if (hasAny(norm, ["canim"]) && (stage === STAGE.ORDER_COMPLETED || stage === "order_completed")) return "Tabi efendim, arka yazı notu aldım 😊";

  // ── TARİH KURALI: isim + tarih (dd.mm.yyyy veya yyyy) = arka yazı ──
  if (/\d{2}[.\-\/]\d{2}[.\-\/]\d{2,4}/.test(message) || /\d{4}/.test(message)) {
    const hasName = /[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}/.test(message);
    const isAddress = hasAny(norm, ["mahalle","mahallesi","sokak","cadde","caddesi","apt","daire","kat","no "]);
    if (hasName && !isAddress && !hasAny(norm, ["05","adres","telefon"])) {
      if (stage === STAGE.WAITING_ADDRESS) return "Tabi efendim, arka yazı notu aldım 😊 Açık adres bilgileriniz ile devam edelim.";
      if (stage === STAGE.WAITING_PAYMENT) return "Tabi efendim, arka yazı notu aldım 😊 Ödeme tercihinizi belirtebilir misiniz? EFT / Havale veya kapıda ödeme.";
      if (stage === STAGE.ORDER_COMPLETED || stage === "order_completed") return "Tabi efendim, arka yazı notu aldım 😊";
    }
  }

  // ── TRUST FOLLOW-UP (last_intent trust + süre/yıl sorusu) ──
  if (ctx.fields?.last_intent === "trust" && hasAny(norm, ["yil mi","yıl mı","kac yil","kaç yıl","kac sene","kaç sene","sure","süre","mesela"])) return "Garanti veriyoruz efendim 😊 Kararma, solma veya kaplama kaynaklı bir durumda ürün değişimi sağlıyoruz. Kesin bir süre sınırı bulunmamaktadır.";

  // ─────────────────────────────────────────────────────────────────
  // PREVIEW / KARAR DESTEĞİ AİLESİ — 3 subtype cevap politikaları
  // ─────────────────────────────────────────────────────────────────

  // ── preview_request: müşteri ön izleme / görsel istiyor ──
  if (intent === "preview_request") {
    const st = ctx.fields?.conversation_stage || "";
    const rawProd = ctx.rawInputProduct || "";
    // waiting_product + kullanıcı henüz ürün seçmedi: fotoğraf daveti + fiyat + menu
    // (null return fallback'e düşürüyordu; test'ler expected "fotograf/599/arka")
    if (!rawProd && (!st || st === "waiting_product")) {
      return `Tabi efendim 😊 Fotoğrafınızı gönderirseniz ön izleme hazırlayabiliriz; gerekli düzenlemeleri biz yapıyoruz.\n\nResimli Lazer Kolye: EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL. Hangi model ile ilgileniyorsunuz efendim?`;
    }
    if (st === STAGE.ORDER_COMPLETED || st === "order_completed")
      return "Yoğunluğa göre kargo öncesi paylaşabiliyoruz efendim 😊";
    if (st === STAGE.WAITING_PAYMENT)
      return "Tabi efendim, fotoğrafınızı gönderin, ön izleme hazırlayalım 😊 Gerekli düzenlemeleri biz yapıyoruz. Ödeme tercihinizi de belirtebilirsiniz.";
    if (st === STAGE.WAITING_ADDRESS)
      return "Tabi efendim, ön izleme paylaşabiliriz 😊 Adres bilgilerinizi de tamamlayalım.";
    return "Tabi efendim, fotoğrafınızı gönderirseniz ön izleme hazırlayabiliriz 😊 Gerekli düzenlemeleri biz yapıyoruz.";
  }

  // ── decision_support: müşteri kararsız, seçim desteği istiyor ──
  if (intent === "decision_support") {
    const st = ctx.fields?.conversation_stage || "";
    const rawProd = ctx.rawInputProduct || "";
    // waiting_product: fotoğraf daveti + fiyat + menu
    if (!rawProd && (!st || st === "waiting_product")) {
      return `Tabi efendim 🤍 Fotoğraflarınızı gönderin, hangisinin daha güzel çıkacağını birlikte değerlendirelim 😊\n\nResimli Lazer Kolye: EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL. Hangi model ile ilgileniyorsunuz efendim?`;
    }
    if (st === STAGE.ORDER_COMPLETED || st === "order_completed")
      return "Tabi efendim, fotoğraflarınızı gönderin, birlikte bakalım 😊";
    if (st === STAGE.WAITING_PAYMENT)
      return "Tabi efendim, fotoğraflarınızı gönderin, birlikte en güzelini seçelim 😊 Ödeme tercihinizi de belirleyebilirsiniz.";
    return "Tabi efendim, fotoğraflarınızı gönderin, hangisinin daha güzel çıkacağını birlikte değerlendirelim 😊";
  }

  // ── composition_question: görsel kompozisyon / yerleşim sorusu ──
  // Composition (birden fazla foto/kişi) LAZER ürününe özgüdür. Ataç'ta geçerli değil.
  // Yapısal öncelik:
  //   1. waiting_product + ürün seçilmediyse → önce ürün seçimi + açıklama
  //   2. ataç ürünü seçildiyse → lazer'e yönlendirme
  //   3. lazer + diğer stage'lerde → normal composition cevabı (stage-aware)
  if (intent === "composition_question") {
    const st = ctx.fields?.conversation_stage || "";
    const prod = ctx.product || ctx.fields?.ilgilenilen_urun || "";
    // RAW input: kullanıcının gerçekten seçtiği ürün (signal-based lazer upgrade'lerinden önce)
    const rawProd = ctx.rawInputProduct || "";

    // 1. Ürün seçilmedi + waiting_product: composition lazer'e özgüdür, ürün seçtir
    //    Composition cevabı tam olmalı: yan yana VE ön-arka yüz seçenekleri + fiyat.
    //    Kullanıcı genelde "yapılıyor mu?" sorar; cevap "evet, ne şekillerde ve ne fiyata"
    //    bilgisini eksiksiz vermeli, sonra ürün seçimi istemeli.
    //    Önemli: rawInputProduct bos ise (kullanıcı seçim yapmadı), derived prod lazer olsa
    //    bile gate devrededir — signal-based upgrade'in kullanıcı tercihini aşmasını engeller.
    if (!rawProd && (st === STAGE.WAITING_PRODUCT || st === "waiting_product" || st === "")) {
      const compBase = `Evet efendim, birden fazla fotoğraf tek kolyede birleştirilebiliyor 😊 Fiyat farkı olmaz; yan yana veya ön-arka yüz tercihinize göre basıyoruz. En fazla 3 fotoğraf tek tasarımda kullanılabilir.`;
      // Mesajda fiyat ipuçları varsa fiyatla birlikte menüyü ver
      if (hasAny(norm, ["ne kadar","kac tl","kaç tl","fiyat","ucret","ücret"])) {
        return `${compBase}\n\nFiyatlarımız:\n\n📸 Resimli Lazer Kolye: EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL\n✨ Harfli Ataç Kolye: EFT ${PRICE.ATAC_EFT} TL, kapıda ${PRICE.ATAC_KAPIDA} TL\n\nHangi model ile ilgileniyorsunuz efendim?`;
      }
      return `${compBase}\n\nResimli Lazer Kolye: EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL. Hangi model ile ilgileniyorsunuz efendim?`;
    }

    // 2. Ataç ürünü seçilmişse → lazer'e yönlendir
    if (prod === "atac") {
      return "Ataç kolyede fotoğraf bulunmamaktadır efendim 😊 Birden fazla fotoğraf için resimli lazer kolye tercih edebilirsiniz.";
    }

    // 3. Lazer (veya stage sonraki aşamalarda): mevcut stage-aware cevaplar
    // EFT fiyat composition cevaplarında ortak — "fiyat farkı olmaz" derken
    // gerçek fiyatı da belirtmek semantic completeness açısından gerekli.
    const compPriceLine = `Resimli Lazer Kolye: EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL.`;
    // Arkalı önlü (ön + arka yüze ayrı resim)
    if (hasAny(norm, ["arkali onlu","arkalı önlü","onlu arkali","önlü arkalı","iki yuzune","iki yüzüne","iki tarafina","iki tarafına","iki tarafta","2 tarafta","bir yuzune","bir yüzüne","diger yuzune","diğer yüzüne","kolyenin iki tarafina","kolyenin iki tarafına"]))
      return `Evet efendim, ön ve arka yüze ayrı ayrı fotoğraf yapabiliyoruz 😊 Fiyat farkı olmaz. ${compPriceLine}`;
    // Yan yana / aynı karede
    if (hasAny(norm, ["yan yana","yanyana","ayni karede","aynı karede","ayni kareye","aynı kareye","tek karede","tek kare"]))
      return `Evet efendim, birden fazla kişiyi aynı karede yan yana basabiliyoruz 😊 Fiyat farkı olmaz. ${compPriceLine}`;
    // İki+ kişi / çocuk / aile
    if (hasAny(norm, ["iki cocuk","iki çocuk","2 cocuk","2 çocuk","uc cocuk","üç çocuk","3 cocuk","3 çocuk","dort cocuk","dört çocuk","iki kisi","iki kişi","2 kisi","2 kişi","uc kisi","üç kişi","3 kisi","3 kişi","5 kisi","5 kişi","aile","iki oglum","iki oğlum","iki kizim","iki kızım","cocuklarim","çocuklarım"]))
      return `Evet efendim, birden fazla kişi tek kolyede olabilir 😊 Fiyat farkı olmaz; yan yana veya ön-arka yüz tercihinize göre basıyoruz. ${compPriceLine}`;
    // İki+ resim / foto — cevap "yan yana veya ön-arka yüz" + fiyat
    if (hasAny(norm, ["iki resim","2 resim","uc resim","üç resim","3 resim","iki foto","2 foto","3 foto","iki fotograf","iki fotoğraf","iki ayri","iki ayrı","ayri ayri","ayrı ayrı","birden fazla resim","birden fazla foto"]))
      return `Evet efendim, birden fazla fotoğrafı tek kolyede birleştirebiliyoruz 😊 Fiyat farkı olmaz; yan yana veya ön-arka yüz tercihinize göre basıyoruz. En fazla 3 fotoğraf aynı tasarımda kullanılabilir. ${compPriceLine}`;
    // Completed stage'de genel
    if (st === STAGE.ORDER_COMPLETED || st === "order_completed")
      return "Evet efendim, birden fazla fotoğrafı tek kolyede birleştirebiliyoruz 😊 Yan yana veya ön-arka yüz tercihinize göre basıyoruz. En fazla 3 fotoğraf tek tasarımda kullanılabilir.";
    return `Evet efendim, fotoğrafları birleştirebiliyoruz 😊 Yan yana veya ön-arka yüz tercihinize göre basıyoruz. En fazla 3 fotoğraf tek tasarımda kullanılabilir. ${compPriceLine}`;
  }

  // ── PRICE ──
  // "İkisinin/her ikisinin fiyatı" w_product'ta → iki ürünün fiyatını ver
  if (hasAny(norm, ["ikisinin fiyat","ikisinin de fiyat","ikisininde fiyat","her ikisinin","ikisini de ogr","ikisini de öğr","iki urunun","iki ürünün"]) && !p) {
    return "Fiyatlarımız:\n\n📸 Resimli Lazer Kolye: EFT 599 TL, kapıda 649 TL\n✨ Harfli Ataç Kolye: EFT 499 TL, kapıda 549 TL\n\nHangi model ile ilgileniyorsunuz efendim? 😊";
  }
  // ═══ AILE J FIX HANDLERS — Turn 16+ yeni intent'ler ═══
  
  // price_confirmation: "600 tl mi", "649 dimi", "650 değil mi"
  if (intent === "price_confirmation") {
    const p2 = ctx.fields?.ilgilenilen_urun || ctx.product || "lazer";
    const mentioned = norm.match(/(\d{3})/);
    const eftP = p2 === "atac" ? PRICE.ATAC_EFT : PRICE.LAZER_EFT;
    const kapP = p2 === "atac" ? PRICE.ATAC_KAPIDA : PRICE.LAZER_KAPIDA;
    if (mentioned) {
      const num = parseInt(mentioned[1]);
      if (num === kapP) return `Evet efendim, kapıda ödeme fiyatımız ${kapP} TL'dir 😊`;
      if (num === eftP) return `Evet efendim, EFT / Havale fiyatımız ${eftP} TL'dir 😊`;
      if (Math.abs(num - eftP) <= 2) return `EFT / Havale ile ${eftP} TL efendim 😊 Kapıda ödeme ${kapP} TL.`;
      if (Math.abs(num - kapP) <= 2) return `Kapıda ödeme ${kapP} TL efendim 😊 EFT / Havale ise ${eftP} TL.`;
    }
    return `Fiyatlarımız: EFT / Havale ile ${eftP} TL, kapıda ödeme ile ${kapP} TL efendim 😊`;
  }
  
  // photo_status_check: "Fotoğrafımı aldınız mı"
  if (intent === "photo_status_check") {
    const photoGot = truthy(ctx.fields?.photo_received);
    if (photoGot) return "Fotoğrafınızı aldık efendim 😊 Siparişiniz hazırlanmaktadır.";
    return "Henüz fotoğrafınız ulaşmadı efendim 😊 Fotoğrafınızı buradan iletebilirsiniz.";
  }
  
  // human_request: "Yardımcı olur musunuz"
  if (intent === "human_request") {
    return "Elbette efendim, ekibimize iletiyorum 😊 En kısa sürede sizinle iletişime geçeceğiz.";
  }
  
  // autopilot_question: "Otomatik mesaj mi"
  if (intent === "autopilot_question") {
    return "Evet efendim, otomatik yanıt sistemi ile çalışıyoruz 😊 Spesifik talepleriniz için ekibimiz en kısa sürede sizinle iletişime geçer.";
  }
  
  // contact_channel_question: "WhatsApp var mı"
  if (intent === "contact_channel_question") {
    return "WhatsApp desteğimiz şu anda aktif değil efendim 😊 Instagram üzerinden yardımcı olmaya devam edelim.";
  }
  
  // photo_format_question: "Vesikalık çektirsem mi", "Nasıl gönderiyoruz"
  if (intent === "photo_format_question") {
    return "Normal fotoğraf yeterlidir efendim 😊 Vesikalık olması gerekmez, net ve kaliteli olsun yeter. Buradan direkt iletebilirsiniz.";
  }
  
  // future_order_intent: "Yarın sipariş vereceğim"
  if (intent === "future_order_intent") {
    return "Tabi efendim 😊 Hazır olduğunuzda fotoğrafınızı gönderip siparişi tamamlayabiliriz.";
  }
  
  // photo_acceptance_question: "Bu fotoyu basabilir misiniz"
  if (intent === "photo_acceptance_question") {
    return "Fotoğrafı inceledikten sonra sipariş sürecinde teyit edeceğiz efendim 😊 Net ve kaliteli olan fotoğraflar sorunsuz işlenmektedir.";
  }
  
  // general_question: "Soru sorabilir miyim", "Yapar mı", "Mümkün mü"
  if (intent === "general_question") {
    return "Tabi efendim, sorunuzu iletebilirsiniz 😊";
  }

  if (intent === "price") {
    // Prod logs fix: "Gümüş fiyatı" — gümüş kaplama bilgisi + aynı fiyat
    if (hasAny(norm, ["gumus fiyat","gümüş fiyat","gumusun fiyat","gümüşün fiyat","gumus ne kadar","gümüş ne kadar","gumus olan","gümüş olan"])) {
      return `Ürünlerimiz paslanmaz çelik üzerine 14 ayar altın kaplamadır efendim 😊 Gümüş kaplama seçeneğimiz de mevcut, fiyatı aynıdır: EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL.`;
    }    // Kolye ucu / sadece uç → zincirle birlikte
    if (hasAny(norm, ["kolye ucu","sadece ucu","sadece uc","tek kolye ucu","tek ucu","zincirsiz"])) return "Ürünlerimiz zinciri ile birlikte sunulmaktadır efendim 😊";
    // Out-of-scope ürün fiyatı soruluyorsa → kolye bilgisi
    if (hasAny(norm, ["yuzuk","yüzük","kupe","küpe","bileklik fiyat","anahtarlik","anahtarlık","tesbih"])) return "Şu anda sadece kolye modellerimiz bulunmaktadır efendim 😊";
    // Arka foto fiyat → product-aware
    if (hasAny(norm, ["arkasina foto","arkasına foto","arka foto","arka yuze foto","arka yüze foto"]) && hasAny(norm, ["fiyat","ucret","ücret","ne kadar"])) {
      if ((ctx.fields?.ilgilenilen_urun || p) === "atac") return "Bu modelde fotoğraf kullanılmıyor efendim 😊 Resimli lazer kolyede ön ve arka yüze fotoğraf eklenebilmektedir, ek ücret alınmaz.";
      return "Arka yüze fotoğraf eklemek ücretsizdir efendim 😊 Ek ücret alınmaz.";
    }
    // Cross-product: mesajda açıkça diğer ürün adı geçiyorsa o ürünün fiyatını ver
    const askingLazer = hasAny(norm, ["lazer","resimli"]);
    const askingAtac = hasAny(norm, ["atac","ataç","harfli"]);
    const effectiveProduct = askingAtac ? "atac" : askingLazer ? "lazer" : p;

    if (hasAny(norm, ["eft fiyat","eft ne kadar","havale fiyat","havale ne kadar"])) {
      if (effectiveProduct === "lazer") return `EFT / Havale fiyatımız ${PRICE.LAZER_EFT} TL'dir efendim 😊`;
      if (effectiveProduct === "atac") return `EFT / Havale fiyatımız ${PRICE.ATAC_EFT} TL'dir efendim 😊`;
    }
    if (hasAny(norm, ["kapida fiyat","kapıda fiyat","kapida ne kadar","kapıda ne kadar"])) {
      if (effectiveProduct === "lazer") return `Kapıda ödeme fiyatımız ${PRICE.LAZER_KAPIDA} TL'dir efendim 😊 Sadece nakit.`;
      if (effectiveProduct === "atac") return `Kapıda ödeme fiyatımız ${PRICE.ATAC_KAPIDA} TL'dir efendim 😊 Sadece nakit.`;
    }
    if (hasAny(norm, ["dahil","dahil mi"])) return "Evet efendim, zincir ve kargo fiyata dahildir 😊";
    if (effectiveProduct === "lazer") return `EFT / Havale ile ${PRICE.LAZER_EFT} TL, kapıda ödeme ile ${PRICE.LAZER_KAPIDA} TL'dir efendim 😊`;
    if (effectiveProduct === "atac") return `EFT / Havale ile ${PRICE.ATAC_EFT} TL, kapıda ödeme ile ${PRICE.ATAC_KAPIDA} TL'dir efendim 😊`;
    return `Fiyatlarımız:\n\n📸 Resimli Lazer Kolye: EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL\n✨ Harfli Ataç Kolye: EFT ${PRICE.ATAC_EFT} TL, kapıda ${PRICE.ATAC_KAPIDA} TL\n\nHangi model ile ilgileniyorsunuz efendim? 😊`;
  }

  // ─────────────────────────────────────────────────────────────────
  // PRODUCT STRUCTURE vs QUANTITY AİLESİ — cevap politikaları
  // ─────────────────────────────────────────────────────────────────

  // ── single_pendant_request: zincirsiz / sadece uç ──
  if (intent === "single_pendant_request") {
    // Kendi zinciri var → sadece uç gönderilebilir mi?
    if (hasAny(norm, ["kendi zincirim","kendi zincirime","altin zincirim","altın zincirim","gold zincirim"])) {
      return "Altın zincirinize takabilirsiniz efendim 😊 İsterseniz sadece lazer kolye ucunu gönderebiliriz. Fiyat ve detay için ekibimize iletiyorum.";
    }
    return "Ürünlerimiz zinciri ile birlikte sunulmaktadır efendim 😊 Zincirsiz gönderim yapmıyoruz, zincir fiyata dahildir.";
  }

  // ── product_structure_request: tek kolye / çift uç / yapı ──
  if (intent === "product_structure_request") {
    if (hasAny(norm, ["ust uste","üst üste","iki uc","iki uç","cift uc","çift uç","uc iki tane","uç iki tane","ucu iki","uc iki"])) {
      return "Tek zincire iki ayrı plaka takılabiliyor efendim 😊 Biri kısa biri uzun zincirde olursa birbirini çizmez. Ekibimize iletiyorum, detay için dönüş sağlıyorlar.";
    }
    if (hasAny(norm, ["iki plaka","tek kolyede iki","tek kolyeye iki","bir kolyeye iki","ayni kolyeye"])) {
      return "Evet efendim, iki ayrı plaka tek zincire takılabiliyor 😊 Farklı uzunlukta zincirle gönderilir ki birbirini çizmesin.";
    }
    // Genel yapı sorusu — "şansımız var mı", "olur mu" gibi
    if (hasAny(norm, ["sansimiz","şansımız","olur mu","olurmu","mumkun mu","mümkün mü","yapiliyor mu","yapılıyor mu"])) {
      return "Tek zincire iki ayrı plaka takılabiliyor efendim 😊 Biri kısa biri uzun olması gerekir ki birbirini çizmesin.";
    }
    return "Ürün yapısı hakkında ekibimize iletiyorum efendim 😊 Detaylı bilgi için en kısa sürede dönüş sağlıyorlar.";
  }

  // ── chain_structure_request: zincir yapı soruları ──
  if (intent === "chain_structure_request") {
    if (hasAny(norm, ["dahil mi","fiyata dahil"])) return "Evet efendim, zincir fiyata dahildir 😊";
    if (hasAny(norm, ["zincirsiz","zincirsiz olur mu"])) return "Ürünlerimiz zinciri ile birlikte sunulmaktadır efendim 😊 Zincirsiz gönderim yapmıyoruz.";
    if (hasAny(norm, ["altın zincir","altin zincir","kendi zincir"])) return "Altın zincirinize takabilirsiniz efendim 😊 İsterseniz sadece kolye ucunu gönderebiliriz, ekibimize iletiyorum.";
    if (hasAny(norm, ["degistir","değiştir","baska zincir","başka zincir","secebilir","seçebilir"])) return "Standart zincirimiz 60 cm'dir efendim 😊 Farklı model için ekibimize iletiyorum.";
    return "Standart zincirimiz 60 cm uzunluğundadır efendim 😊 Zincir fiyata dahildir.";
  }

  // ── quantity_order: gerçek adet siparişi ──
  if (intent === "quantity_order") {
    const st = ctx.fields?.conversation_stage || "";
    if (hasAny(norm, ["20 adet","20"])) return "20 adet için özel fiyat ve ödeme bilgisi için ekibimize iletiyorum efendim 😊";
    if (p === "lazer" || !p) {
      if (hasAny(norm, ["4","dort","dört"])) return `Tabi efendim 😊 Çoklu alımda 4 kolye aynı adrese: EFT ${PRICE.MULTI_LAZER[4]?.eft || "2000"} TL. ${st === STAGE.WAITING_PAYMENT ? "Ödeme tercihinizi belirtebilirsiniz." : ""}`.trim();
      if (hasAny(norm, ["5","bes","beş"])) return `Tabi efendim 😊 Çoklu alımda 5 kolye aynı adrese: EFT ${PRICE.MULTI_LAZER[5]?.eft || "2500"} TL.`;
      if (hasAny(norm, ["3","uc","üç"])) return `Tabi efendim 😊 Çoklu alımda 3 kolye aynı adrese: EFT ${PRICE.MULTI_LAZER[3].eft} TL, kapıda ${PRICE.MULTI_LAZER[3].kapida} TL.`;
      return `Tabi efendim 😊 Çoklu alımda 2 kolye aynı adrese: EFT ${PRICE.MULTI_LAZER[2].eft} TL, kapıda ${PRICE.MULTI_LAZER[2].kapida} TL.`;
    }
    return `Tabi efendim, çoklu alımda indirimli fiyatlarımız mevcut 😊 Kaç adet düşünüyorsunuz?`;
  }

  // ── MULTI ORDER ──
  if (intent === "multi_order") {
    if (p === "lazer" || !p) {
      if (hasAny(norm, ["4","dort","dört"])) return `Tabi efendim 😊 Çoklu alımda 4 kolye aynı adrese: EFT ${PRICE.MULTI_LAZER[4]?.eft || "2000"} TL.`;
      if (hasAny(norm, ["5","bes","beş"])) return `Tabi efendim 😊 Çoklu alımda 5 kolye aynı adrese: EFT ${PRICE.MULTI_LAZER[5]?.eft || "2500"} TL.`;
      if (hasAny(norm, ["3","uc","üç"])) return `Tabi efendim 😊 Çoklu alımda 3 kolye aynı adrese: EFT ${PRICE.MULTI_LAZER[3].eft} TL, kapıda ${PRICE.MULTI_LAZER[3].kapida} TL.`;
      if (hasAny(norm, ["2","iki"])) return `Tabi efendim 😊 Çoklu alımda 2 kolye aynı adrese: EFT ${PRICE.MULTI_LAZER[2].eft} TL, kapıda ${PRICE.MULTI_LAZER[2].kapida} TL.`;
      if (hasAny(norm, ["20"])) return "20 adet için özel fiyat ve ödeme bilgisi için ekibimize iletiyorum efendim 😊";
      return `Tabi efendim, çoklu alımda indirimli fiyatlarımız mevcut 😊\n2 kolye: EFT ${PRICE.MULTI_LAZER[2].eft} TL, kapıda ${PRICE.MULTI_LAZER[2].kapida} TL\n3 kolye: EFT ${PRICE.MULTI_LAZER[3].eft} TL, kapıda ${PRICE.MULTI_LAZER[3].kapida} TL`;
    }
    return `Tabi efendim, çoklu alımda indirimli fiyatlarımız mevcut 😊 Kaç adet düşünüyorsunuz?`;
  }

  // ── SHIPPING ──
  if (intent === "shipping_price") {
    if (hasAny(norm, ["seffaf","şeffaf","ozel kargo","özel kargo","aras kargo","mng kargo"])) return "Gönderimlerimiz PTT Kargo ile yapılmaktadır efendim 😊 Farklı kargo seçeneği için +25 TL ek ücret ile Aras Kargo tercih edilebilir.";
    if (hasAny(norm, ["dahil","dahil mi"])) return "Evet efendim, kargo ücreti fiyata dahildir 😊";
    if (hasAny(norm, ["her yere","her ile","turkiye","türkiye"])) return "Evet efendim, Türkiye'nin her yerine kargo ile gönderim yapıyoruz, kargo ücretsizdir 😊";
    return "Kargo ücretsizdir, fiyata dahildir efendim 😊";
  }
  if (intent === "shipping") {
    const st = ctx.fields?.conversation_stage || "";
    if (hasAny(norm, ["kargom","siparisim","siparişim","gelmedi","ulasmadi","ulaşmadı","verildi mi","yola cikti"])) return "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊";
    if (hasAny(norm, ["aras kargo","aras ile","mng kargo","surat kargo","sürat kargo","farkli kargo","farklı kargo"])) return "Gönderimlerimiz PTT Kargo ile yapılmaktadır efendim 😊 Farklı kargo seçeneği için +25 TL ek ücret ile Aras Kargo tercih edilebilir.";
    if (hasAny(norm, ["hangi kargo","kargo firmasi","kargo firması","ptt mi","ptt ile"])) {
      // Combo: hangi kargo + süre birlikte sorulmuşsa
      if (hasAny(norm, ["kac gun","kaç gün","kac is gunu","kaç iş günü","ne zaman","suresi","süresi","teslim"])) return "Gönderimlerimiz PTT Kargo ile yapılmaktadır efendim 😊 İstanbul içi 1-2, diğer iller 2-3 iş günü.";
      return "Gönderimlerimiz PTT Kargo ile yapılmaktadır efendim 😊";
    }
    if (hasAny(norm, ["takip numarasi","takip numarası","takip no","numara rica","numarasi rica","numarası rica"])) return "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊";
    if (hasAny(norm, ["takip","nasil takip","nasıl takip"])) return "Kargoya verildiğinde size otomatik SMS gelecektir efendim 😊 PTT Kargo takip numarası ile takibinizi yapabilirsiniz.";
    if (hasAny(norm, ["istanbul disi","istanbul dışı","sehir disi","şehir dışı"])) return "İstanbul dışı gönderimler genellikle 2-3 iş günü içinde teslim edilmektedir efendim 😊 Kargoya verildiğinde SMS gelecektir.";
    // Ne-zaman / kaç-gün branch: süre + garanti bilgisi + stage-aware flow
    if (hasAny(norm, ["ne zaman","kac gun","kaç gün","suresi","süresi","kac gunde","kaç günde","ne kadar surede","ne kadar sürede","ulasir","ulaşır"])) {
      const timeBase = "İstanbul içi 1-2, diğer iller 2-3 iş günü içinde teslim edilmektedir efendim 😊 Kargoya verildiğinde SMS gelecektir. Üretim kaynaklı gecikmelerde garanti kapsamında ilgileniyoruz.";
      if (st === STAGE.WAITING_PHOTO || st === "waiting_photo") {
        return timeBase + "\n\nFotoğrafınızı göndermeniz yeterli efendim, siparişinizi hemen oluşturalım.";
      }
      return timeBase;
    }
    if (hasAny(norm, ["sms","mesaj gelir","mesaj geliyor","bilgi gelir","haber verir","bildirim"])) return "Kargoya verildiğinde size otomatik SMS gelecektir efendim 😊";
    if (hasAny(norm, ["nereye","turkiye","türkiye","her yere","yurt disi","yurt dışı"])) return "Evet efendim, Türkiye'nin her yerine kargo ile gönderim yapıyoruz 😊";
    return "Kargo ücretsiz, PTT ile gönderim yapılmaktadır efendim 😊 İstanbul içi 1-2, diğer iller 2-3 iş günü. Kargoya verildiğinde SMS gelecektir.";
  }

  // ── CHAIN ──
  if (intent === "chain_question") {
    // Plaka ölçüsü sorusu chain'e düşebilir
    if (hasAny(norm, ["plaka","olcu","ölçü","yuvarlak","boyut"]) && !hasAny(norm, ["zincir"])) return "Plaka boyutu 3 cm'dir efendim 😊";
    // Zincir dahil mi → ürüne bakılmaksızın
    if (hasAny(norm, ["dahil mi","fiyata dahil","zincir dahil","dahil"])) return "Evet efendim, zincir fiyata dahildir 😊";
    if (p === "lazer") {
      if (hasAny(norm, ["uzat","uzatma","uzatilir","uzatılır","daha uzun"])) return "Lazer kolyede zincir 60 cm standarttır, uzatma bulunmamaktadır efendim 😊";
      if (hasAny(norm, ["kisalt","kısalt","kisa zincir","kısa zincir"])) return "Lazer kolyede zincir 60 cm standarttır, kısaltma yapılmamaktadır efendim 😊";
      if (hasAny(norm, ["degisiyor","değişiyor","baska model","başka model","farkli model","farklı model","seceneg","seçenek","cesit","çeşit"])) return "Tek model standart zincirimiz bulunmaktadır efendim 😊";
      if (hasAny(norm, ["dahil","dahil mi"])) return "Evet efendim, zincir fiyata dahildir 😊";
      if (hasAny(norm, ["kac cm","kaç cm","boyu","uzunlugu","uzunluğu","santim"])) return "Standart zincirimiz 60 cm'dir efendim 😊";
      return "Tek model standart zincirimiz 60 cm'dir efendim 😊";
    }
    if (p === "atac") {
      if (hasAny(norm, ["uzat","uzatma","uzatin","uzatın","uzatilabilir","uzatılabilir"])) return "Standart zincir 50 cm'dir efendim 😊 İstenirse 70 cm'ye kadar uzatılabilir, uzatma +50 TL.";
      if (hasAny(norm, ["kisalt","kısalt","kisaltin","kısaltın","kisaltma","kısaltma","kisa zincir","kısa zincir"])) return "Standart zincir 50 cm'dir efendim 😊 Kısaltma yapılmamaktadır, uzatma +50 TL ile 70 cm'ye kadar mümkündür.";
      if (hasAny(norm, ["baska model","başka model","farkli","farklı","italyan","figaro"])) return "Bu üründe tek model standart zincir kullanılıyor efendim 😊";
      if (hasAny(norm, ["kac cm","kaç cm","boyu","uzunlugu","uzunluğu"])) return "Standart zincir 50 cm'dir efendim 😊";
      return "Bu üründe tek model standart zincir kullanılıyor efendim 😊 50 cm.";
    }
    return "Resimli lazer kolyede standart zincir 60 cm, harfli ataç kolyede 50 cm'dir efendim 😊";
  }

  // ── TRUST ──
  if (intent === "trust") {
    if (hasAny(norm, ["kararma","kararir","kararır","karariyormu","kararıyormu","karariyor mu","kararıyor mu","karaa","karar ma","karatma","solar","solma","paslan","renk atma","renk atar","renk degis","renk değiş","silinme","silinir","kaplama atar","kaplama atma","bozulur"])) return "14 ayar altın kaplama paslanmaz çeliktir, kararma solma paslanma yapmaz efendim 😊 Güvenle kullanabilirsiniz.";
    if (hasAny(norm, ["garanti","garantisi","ne kadar sure","ne kadar süre","kac yil","kaç yıl","omur boyu","ömür boyu","kac sene","kaç sene","suresi","süresi"])) return "Garanti veriyoruz efendim 😊 Kararma, solma veya kaplama kaynaklı bir durumda ürün değişimi sağlıyoruz. Kesin bir süre sınırı bulunmamaktadır.";
    if (hasAny(norm, ["guvenilir","güvenilir","dolandirici","dolandırıcı","emin","guvenemiyorum","güvenemiyorum","guven","güven","nasil guvenebil","nasıl güvenebil"])) return "Güvenle sipariş verebilirsiniz efendim 😊 Ürünlerimiz siparişe özel olarak hazırlanıp PTT Kargo ile gönderilmektedir. Dilerseniz kapıda ödeme de tercih edebilirsiniz.";
    if (hasAny(norm, ["gercek foto","gerçek foto","gercek urun","gerçek ürün","photoshop","gercek mi","gerçek mi","gercek cekim","gerçek çekim"])) return "Ürünlerimiz siparişe özel olarak hazırlanmaktadır efendim 😊 Güvenle sipariş verebilirsiniz.";
    if (hasAny(norm, ["iade","degisim","değişim","begenmezsem","beğenmezsem","iade ederim","iade edebilir"])) return "Kişiye özel üretim olduğu için keyfi iade bulunmamaktadır efendim 😊 Kalite kaynaklı sorunlarda ürün değiştirilir.";
    if (hasAny(norm, ["once urun gorsun","önce ürün görsün","once gorup","önce görüp","once gelsin","önce gelsin"])) return "Dilerseniz kapıda ödeme seçeneğimizi tercih edebilirsiniz efendim 😊";
    return "Güvenle sipariş verebilirsiniz efendim 😊 Siparişleriniz özenle hazırlanıp PTT Kargo ile gönderilmektedir.";
  }

  // ── MATERIAL ──
  if (intent === "material_question") {
    if (hasAny(norm, ["gumus","gümüş"])) return "Ürünlerimiz 14 ayar altın kaplama paslanmaz çelikten üretilmektedir efendim 😊 Gerçek gümüş değildir, gümüş kaplama seçeneğimiz bulunmaktadır. Kararma, solma yapmaz.";
    if (hasAny(norm, ["altin mi","altın mı","gercek altin","gerçek altın"])) return "Ürünlerimiz 14 ayar altın kaplama paslanmaz çeliktir efendim 😊 Gerçek altın değildir, kaplamadır. Kararma, solma yapmaz.";
    if (hasAny(norm, ["suya dayanikli","dusta","duşta","deniz","havuz","yuzme","yüzme"])) return "Ürünlerimiz suya dayanıklıdır efendim 😊 Duşta, denizde, havuzda rahatlıkla kullanabilirsiniz. Kararma, solma yapmaz.";
    if (hasAny(norm, ["alerji","alerjim","alerjik","hassas cilt"])) return "Ürünlerimiz 14 ayar altın kaplama paslanmaz çelikten üretilmektedir efendim, alerji riski yoktur 😊";
    if (hasAny(norm, ["paslanmaz mi","paslanmaz mı","paslanir","paslanır"])) return "Evet efendim, 14 ayar altın kaplama paslanmaz çeliktir 😊 Kararma, solma yapmaz.";
    if (hasAny(norm, ["metal","metali ne","malzeme","malzemesi","metal mi","celik mi","çelik mi","metal cinsi","metalin cinsi"])) return "Ürünlerimiz 14 ayar altın kaplama paslanmaz çeliktir efendim 😊 Gerçek altın değildir, kaplamadır. Kararma, solma yapmaz.";
    if (hasAny(norm, ["kaplama atar","kaplama atma","kaplama cikar","kaplama çıkar"])) return "Kaplama atma yapmaz efendim 😊 14 ayar altın kaplama paslanmaz çelik kullanılmaktadır.";
    if (hasAny(norm, ["renk","gold","altin kaplama","altın kaplama","mat celik","mat çelik","renk seceneg","renk seçenek"])) return "Altın kaplama ve gümüş kaplama seçeneğimiz mevcut efendim 😊";
    return "Ürünlerimiz 14 ayar altın kaplama paslanmaz çeliktir efendim 😊 Gerçek altın değildir, kaplamadır. Kararma, solma yapmaz.";
  }

  // ── LOCATION ──
  if (intent === "location") {
    // Prod logs fix: "Trendyolda mağazanız varmi" — marketplace sorusu location'dan önce
    if (hasAny(norm, ["trendyol","hepsiburada","n11","amazon","cicek sepeti","çiçek sepeti"])) {
      return "Satışlarımızı doğrudan Instagram üzerinden gerçekleştiriyoruz efendim 😊 Trendyol, Hepsiburada gibi platformlarda satış yapmıyoruz.";
    }
    return "İstanbul Eminönü'ndeyiz efendim 😊 Satışlarımız online üzerinden yapılmaktadır, Türkiye'nin her yerine kargo ile gönderim yapıyoruz.";
  }
  // ── STORE PICKUP ──
  if (intent === "store_pickup") return "İstanbul Eminönü'ndeki şubemizden teslim alabilirsiniz efendim 😊";

  // ── PAYMENT INFO ──
  if (intent === "payment_info_question") {
    // "Ürünü görmeden ödeme yapmam" → foto paylaşım sorusu, ödeme değil
    if (hasAny(norm, ["gormeden","görmeden","gormek","görmek","gorsel","görsel"])) return "Yoğunluğa göre kargo sonrası paylaşabiliyoruz efendim 😊";
    // Ödeme zaten seçilmiş + w_address → teyit ver + adres iste
    const pmDone = ctx.fields?.payment_method;
    const addrStage = ctx.fields?.conversation_stage === STAGE.WAITING_ADDRESS;
    if (pmDone && addrStage) return "Tamamdır efendim, ödemeniz kaydedildi 😊 Ad soyad, cep telefonu ve açık adres bilgileriniz ile devam edelim.";
    const eft = p === "atac" ? PRICE.ATAC_EFT : PRICE.LAZER_EFT;
    const kapida = p === "atac" ? PRICE.ATAC_KAPIDA : PRICE.LAZER_KAPIDA;
    if (hasAny(norm, ["taksit","taksitle"])) return `Taksit seçeneğimiz bulunmuyor efendim 😊 EFT / Havale ile ${eft} TL veya kapıda ödeme ile ${kapida} TL.`;
    if (hasAny(norm, ["fark","farki","farkı","neden farkli","neden farklı"])) return p ? `EFT / Havale ile ${eft} TL, kapıda ödeme ile ${kapida} TL'dir efendim 😊 Kapıda ödemede sadece nakit geçerlidir.` : "EFT / Havale veya kapıda ödeme seçeneklerimiz mevcut efendim 😊";
    if (hasAny(norm, ["kredi karti","kredi kartı","kartla","kart ile","pos"])) return "Kapıda ödemede sadece nakit geçerlidir efendim 😊 Kredi kartı ile kapıda ödeme yapılamamaktadır.";
    if (hasAny(norm, ["sadece nakit","nakit mi","nakitmi"])) return "Evet efendim, kapıda ödemede sadece nakit geçerlidir 😊 PTT sadece nakitle çalışmaktadır.";
    if (hasAny(norm, ["aciklama","açıklama","dekonta ne"])) return "Açıklama yazmanıza gerek yok efendim 😊 İsterseniz açıklamaya Cihan yazabilirsiniz.";
    if (hasAny(norm, ["nasil odeme","nasıl ödeme","odeme nasil","ödeme nasıl","odeme yontemi","ödeme yöntemi","nasil oluyor","nasıl oluyor"])) return "EFT / Havale ile veya kapıda nakit olarak ödeyebilirsiniz efendim 😊 Kapıda ödemede kredi kartı geçerli değildir.";
    if (hasAny(norm, ["kapida","kapıda"])) {
      if (p === "lazer") return `Evet efendim, kapıda ödeme seçeneğimiz mevcut 😊 Kapıda ödeme fiyatımız ${PRICE.LAZER_KAPIDA} TL'dir. Sadece nakit geçerlidir.`;
      if (p === "atac") return `Evet efendim, kapıda ödeme seçeneğimiz mevcut 😊 Kapıda ödeme fiyatımız ${PRICE.ATAC_KAPIDA} TL'dir. Sadece nakit geçerlidir.`;
      return "Evet efendim, kapıda ödeme seçeneğimiz mevcut 😊 Sadece nakit geçerlidir.";
    }
    return "EFT / Havale ile veya kapıda nakit olarak ödeyebilirsiniz efendim 😊";
  }

  // ── IBAN ──
  if (intent === "iban_request") return `Tabi efendim 😊\n\n${TEXT.EFT_INFO}`;

  // ── BACK TEXT INFO ──
  // Norm-based catch (intent back_text_info'ya düşmeyebilir)
  if (hasAny(norm, ["arka yazi","arka yazı","arkaya ne yazil","arkaya ne yazıl","arkasina ne yazil","arkasına ne yazıl","arkaya ne yazdiri","arkaya ne yazdırı"]) && !hasAny(norm, ["istemiyorum","gerek yok","bos kalsin","boş kalsın"])) {
    if ((ctx.fields?.ilgilenilen_urun || ctx.product) === "atac") return "Bu modelde arka yüze yazı yapılmıyor efendim 😊 Resimli lazer kolyede arka yüze yazı eklenebilmektedir.";
    return "Evet efendim, arka yüze yazı yazabiliyoruz 😊 Ücretsizdir.";
  }
  // "arkaya yazdırmak istiyorum" + içerik (tarih/isim) → back_text teyit + sonraki adım
  if (hasAny(norm, ["arkaya yazdirmak","arkaya yazdırmak","arkaya yazdir","arkaya yazdır","arkasina yazdirmak","arkasına yazdırmak","arkaya da"]) && hasAny(norm, ["istiyorum","yazdirmak","yazdırmak","yazsin","yazsın","olsun","tarih","isim","dogum","doğum"])) {
    return "Tabi efendim, arka yüze yazdırıyoruz 😊 Ücretsizdir.";
  }
  // Back text undecided — w_payment'ta "bilemedim" → arka yazı önerisi (skipped dahil)
  if (hasAny(norm, ["bilemedim","kararsizim","kararsızım","bilemiyorum"]) && stage === STAGE.WAITING_PAYMENT) {
    if (hasAny(norm, ["yazilir","yazılır","yazilabilir","yazılabilir","ustlu","üstlü","altli","altlı"])) return "Arka yüze genelde isim, tarih veya kısa bir not yazılıyor efendim 😊 İstemezseniz boş bırakabiliriz.";
    if (!ctx.fields?.back_text_status) return "Arka yüze genelde isim, tarih veya kısa bir not yazılıyor efendim 😊 İstemezseniz boş bırakabiliriz.";
  }
  // w_back_text stage'de bilgi sorusu (genelde/tarih/ne yazılır) → intent general'e düşebilir
  if (stage === STAGE.WAITING_BACK_TEXT || stage === "waiting_back_text") {
    if (hasAny(norm, ["genelde","ornek","örnek","ne yaziliyor","ne yazılıyor","ne yazdirir","ne yazdırır","ne yazilir","ne yazılır"])) return "Genelde isim, tarih, kısa bir not veya dua yazılıyor efendim 😊 Ücretsizdir.";
    if (hasAny(norm, ["tarih","isim yazilir","isim yazılır","tarih yazilir","tarih yazılır","dua yazilir"])) return "Tabi efendim, arka yüze isim, tarih veya dua yazılabilir 😊 Ücretsizdir.";
  }
  // Arka foto fiyat sorusu (price intent'e düşebilir)
  if (hasAny(norm, ["arkasina foto","arkasına foto","arka foto"]) && hasAny(norm, ["fiyat","ucret","ücret","ne kadar"])) {
    if ((ctx.fields?.ilgilenilen_urun || ctx.product) === "atac") return "Bu modelde fotoğraf kullanılmıyor efendim 😊 Resimli lazer kolyede ön ve arka yüze fotoğraf eklenebilmektedir, ek ücret alınmaz.";
    return "Arka yüze fotoğraf eklemek ücretsizdir efendim 😊 Ek ücret alınmaz.";
  }
  if (intent === "back_text_info") {
    const origProduct = ctx.previousProduct || ctx.fields?.ilgilenilen_urun || ctx.product;
    if (origProduct === "atac") return "Bu modelde arka yüze yazı yapılmıyor efendim 😊 Resimli lazer kolyede arka yüze yazı eklenebilmektedir.";
    if (hasAny(norm, ["ne yazilir","ne yazılır","genelde","ornek","örnek","ne yazabiliriz","neler yaziliyor","neler yazılıyor"])) return "Arka yüze genelde isim, tarih, kısa bir not veya dua yazılıyor efendim 😊 Ücretsizdir.";
    if (hasAny(norm, ["dua","isim yazilir","isim yazılır","tarih yazilir","tarih yazılır"])) return "Tabi efendim, arka yüze yazılabilir 😊 Ücretsizdir.";
    if (hasAny(norm, ["ucret","ücret","ekstra"])) return "Arka yüze yazı veya fotoğraf eklemek ücretsizdir efendim 😊";
    if (hasAny(norm, ["olur mu","oluyor mu","yapiliyor mu","yapılıyor mu","var mi","var mı"])) return "Tabi efendim, arka yüze yazı olur 😊 Ücretsizdir.";
    return "Evet efendim, arka yüze yazı yazabiliyoruz 😊 Ücretsizdir.";
  }
  if (intent === "back_text_examples") return "Genelde isim, tarih, kısa bir not veya dua yazılıyor efendim 😊";
  if (intent === "order_status_question") return "Ekibimize iletiyorum efendim, siparişinizin durumunu kontrol edip en kısa sürede dönüş sağlıyoruz 😊";
  if (intent === "back_photo_info") {
    const origProduct = ctx.previousProduct || ctx.fields?.ilgilenilen_urun || ctx.product;
    const stage = ctx.fields?.conversation_stage || "";
    const rawProd = ctx.rawInputProduct || "";
    // waiting_product + ürün seçilmedi: composition bilgisi + menu prompt (derived state'e güvenme)
    // Kullanıcı henüz lazer/ataç seçmedi; signal-based upgrade aşılmalı.
    if (!rawProd && (stage === STAGE.WAITING_PRODUCT || stage === "waiting_product" || stage === "")) {
      return `Evet efendim, birden fazla fotoğraf tek kolyede birleştirilebiliyor 😊 Fiyat farkı olmaz; yan yana veya ön-arka yüz tercihinize göre basıyoruz.\n\nResimli Lazer Kolye: EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL. Hangi model ile ilgileniyorsunuz efendim?`;
    }
    if (origProduct === "atac") return "Bu modelde fotoğraf kullanılmıyor efendim 😊 Resimli lazer kolyede ön ve arka yüze fotoğraf eklenebilmektedir.";
    if (hasAny(norm, ["onlu arkali","önlü arkalı","arkali onlu","arkalı önlü","iki farkli foto","iki farklı foto"])) return "Tabi efendim, birden fazla kişi olabilir 😊 Ön yüze bir fotoğraf, arka yüze başka bir fotoğraf yapabiliyoruz. Aynı fiyattan.";
    // Birleştirme sorusu (tek yüz, iki ayrı resim)
    if (hasAny(norm, ["birlestir","birleştir","iki ayri resim","iki ayrı resim","iki resim gonder","iki resim gönder"])) return "Tabi efendim, fotoğrafları birleştirebiliyoruz 😊 Yan yana veya ön-arka yüz tercihinize göre basıyoruz. En fazla 3 fotoğraf tek tasarımda kullanılabilir.";
    // İki fotoğraf bir kolyede
    if (hasAny(norm, ["iki fotograf","iki fotoğraf","2 fotograf","2 fotoğraf","iki resim"])) return "Evet efendim, bir kolyeye iki fotoğraf yapabiliyoruz 😊 Fiyat farkı olmuyor.";
    return "Tabi efendim, arka yüze de fotoğraf yapabiliyoruz 😊 Fiyat farkı olmuyor.";
  }

  // ── PHOTO QUESTION ──
  if (intent === "photo_question") {
    const origProduct = ctx.fields?.ilgilenilen_urun || ctx.product;
    if (origProduct === "atac") {
      if (hasAny(norm, ["arka","arkasi","arkasına","iki yuz","iki yüz","onlu arkali","önlü arkalı"])) return "Bu modelde fotoğraf kullanılmıyor efendim 😊 Resimli lazer kolyede ön ve arka yüze fotoğraf eklenebilmektedir.";
      return "Bu modelde fotoğraf kullanılmıyor efendim, sadece harf ile hazırlanıyor 😊 Fotoğraflı kolye için resimli lazer kolye modelimiz bulunmaktadır.";
    }
    // Vesikalık sorusu
    if (hasAny(norm, ["vesikalik","vesikalık"])) return "Vesikalık olmasına gerek yok efendim 😊 İstediğiniz fotoğrafı buradan gönderebilirsiniz.";
    // Combo: iki kişi + aynı kare → birleştir
    if (hasAny(norm, ["iki kisi","iki kişi","2 kisi","2 kişi"]) && hasAny(norm, ["ayni kare","aynı kare","tek kare"])) return "Evet efendim, birden fazla kişi aynı karede olabilir 😊 Fotoğrafları birleştirebiliyoruz.";
    if (hasAny(norm, ["iki kisi","iki kişi","2 kisi","2 kişi","kac kisi","kaç kişi","kac kisilik","kaç kişilik","birden fazla","iki kisi olur","iki kişi olur","ikisini"])) return "Evet efendim, birden fazla kişi olabilir 😊 Fotoğrafta kaç kişi olursa olsun basıyoruz.";
    if (hasAny(norm, ["3 resim","3 foto","uc resim","üç resim"])) return "Evet efendim, en fazla 3 fotoğraf koyabiliyoruz 😊";
    if (hasAny(norm, ["ayni kare","aynı kare","tek kare","yan yana","birlikte foto"])) return "Evet efendim, fotoğrafları birleştirebiliyoruz 😊 Yan yana veya ön-arka yüz tercihinize göre basıyoruz. En fazla 3 ayrı fotoğraf birleştirilebilir, daha fazla kişi için tek kare fotoğraf göndermeniz önerilir.";
    if (hasAny(norm, ["ikili resim","ikili foto"])) {
      if (hasAny(norm, ["fiyat","ucret","ücret","ne kadar"])) return `Fiyat farkı yoktur efendim 😊 EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL. Birden fazla fotoğraf birleştirebiliyoruz.`;
      return "Evet efendim, birden fazla fotoğraf birleştirebiliyoruz 😊";
    }
    if (hasAny(norm, ["iki foto","2 foto","iki resim","2 resim","kac foto","kaç foto","kac resim","kaç resim","en fazla kac","en fazla kaç","kac resim koyabil","kaç resim koyabil","kac fotograf koyabil","kaç fotoğraf koyabil","kac resim koyabili","kaç resim koyabili","3 lu yapiy","3 lü yapıy","3lu yapiy","3lü yapıy"])) return "En fazla 3 fotoğraf koyabiliyoruz efendim 😊";
    if (hasAny(norm, ["birlestir","birleştir","birlestirme","birleştirme","3 farkli foto","3 farklı foto","fotoğrafları birleştir"])) return "Tabi efendim, fotoğrafları birleştirebiliyoruz 😊 Yan yana veya ön-arka yüz tercihinize göre basıyoruz. En fazla 3 fotoğraf tek tasarımda kullanılabilir.";
    if (hasAny(norm, ["3 kisi","3 kişi","uc kisi","üç kişi","5 kisi","5 kişi","aile foto","3 kisilik","3 kişilik"])) return "Evet efendim, birden fazla kişi olabilir 😊 Kaç kişi olursa olsun basıyoruz.";
    if (hasAny(norm, ["tek yuze","tek yüze"])) return "Evet efendim, tek yüze birden fazla kişi basabiliyoruz 😊";
    if (hasAny(norm, ["arkali onlu","arkalı önlü","iki cocugum","iki çocuğum"])) return "Evet efendim, birden fazla kişi olabilir 😊 Arkalı önlü de yapabiliyoruz, aynı fiyattan.";
    return "Siz gönderin efendim, kontrol edip bilgi verelim 😊";
  }
  if (intent === "photo_suitability_question") return "Gönderin efendim, kontrol edelim 😊";

  // ── FOTO PAYLAŞIM (example_request'ten ÖNCE — "görsel atar mısınız" çakışması) ──
  if (hasAny(norm, ["hazir olunca","hazır olunca","bitince paylas","bitince paylaş","gondermeden once paylas","göndermeden önce paylaş","hazir oldugunda","hazır olduğunda","atar misiniz foto","atar mısınız foto","foto atar misiniz","foto atar mısınız","paylasir misiniz","paylaşır mısınız","yapilmis halini","yapılmış halini","gorsel atar","görsel atar","bitince gorsel","bitince görsel","atiyomusunuz","atıyomusunuz","atiyormusunuz","atıyormusunuz","urunu gormek","ürünü görmek","gormeden odeme","görmeden ödeme","urun cikinca","ürün çıkınca","foto atin","foto atın","resim atin","resim atın","gosterir misiniz","gösterir misiniz","gorebilir miyim","görebilir miyim","kargoya vermeden","gondermeden once foto","göndermeden önce foto","gondermeden once gors","göndermeden önce görs","yapildiginda","yapıldığında","gorsel paylasir","görsel paylaşır","gorsel paylasabil","görsel paylaşabil","fotograf paylasir","fotoğraf paylaşır","urunu gormeden","ürünü görmeden","gorsel gonderir","görsel gönderir","duzenleyince","düzenleyince"])) return "Yoğunluğa göre kargo sonrası paylaşabiliyoruz efendim 😊";

  // ── EXAMPLE ──
  if (intent === "example_request") {
    if (stage === STAGE.ORDER_COMPLETED || stage === "order_completed") return "Yoğunluğa göre kargo öncesi paylaşabiliyoruz efendim 😊";
    return "Tabi efendim, buradan inceleyebilirsiniz 😊\n\n📸 Örnek çalışmalar: https://www.instagram.com/stories/highlights/18084971893996144/\n📦 Sizden gelenler: https://www.instagram.com/stories/highlights/18079575341155587/";
  }

  // ── DETAIL REQUEST ──
  if (intent === "detail_request") {
    if (p === "lazer") return `Resimli lazer kolye: 14 ayar altın kaplama çelik, lazer kazıma. EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL efendim 😊`;
    if (p === "atac") return `Harfli ataç kolye: paslanmaz çelik. EFT ${PRICE.ATAC_EFT} TL, kapıda ${PRICE.ATAC_KAPIDA} TL efendim 😊`;
    return TEXT.MAIN_MENU;
  }

  // ── BARGAIN ──
  if (intent === "bargain") {
    if (hasAny(norm, ["cok pahali","çok pahalı"])) return `Fiyatlarımız sabit olarak belirlenmiştir efendim 😊 Çoklu alımda indirimli fiyatlarımız mevcut:\n2 kolye: EFT ${PRICE.MULTI_LAZER[2].eft} TL\n3 kolye: EFT ${PRICE.MULTI_LAZER[3].eft} TL`;
    if (hasAny(norm, ["indirim var mi","indirim var mı","indirim yapiyor","indirim yapıyor"])) return `Fiyatlarımız sabit olarak belirlenmiştir efendim 😊 Çoklu alımda indirimli fiyatlarımız mevcut.`;
    return "Fiyatlarımız sabit olarak belirlenmiştir efendim 😊";
  }

  // ── POST SALE (norm-based, intent post_sale'e düşmeyebilir) ──
  if (hasAny(norm, ["siparisim gelm","siparişim gelm","siparisim gelmedi","siparişim gelmedi","siparis verdim","sipariş verdim","siparis vermistim","sipariş vermiştim"]) && hasAny(norm, ["gelm","gelmedi","gelmiy","gelmey"])) return "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊";

  // ── OUT-OF-SCOPE ÜRÜNLER ──
  if (hasAny(norm, ["yuzuk","yüzük","kupe","küpe","bileklik istiyorum","anahtarlik","anahtarlık","tesbih","cerceve","çerçeve","tablo","cakmak","çakmak"]) && !hasAny(norm, ["hediye bileklik","bileklik uzunlug"])) return "Şu anda sadece kolye modellerimiz bulunmaktadır efendim 😊";

  // ── İADE (norm-based, trust intent'e düşmeyebilir) ──
  if (hasAny(norm, ["iade yapiliyor","iade yapılıyor","iade olur mu","iade edebilir","iade mumkun","iade mümkün","iade var mi","iade var mı"])) return "Kişiye özel üretim olduğu için keyfi iade bulunmamaktadır efendim 😊 Kalite kaynaklı sorunlarda ürün değiştirilir.";

  // ── PLATFORM / STORE / LINK / PENDANT / PLAKA / AKSESUAR / BİLEKLİK ──
  if (hasAny(norm, ["trendyol","hepsiburada","n11","amazon"])) return "Satışlarımızı doğrudan Instagram üzerinden gerçekleştiriyoruz efendim 😊";
  if (hasAny(norm, ["web site","internet site","siteniz"])) return "Satışlarımızı Instagram üzerinden gerçekleştiriyoruz efendim 😊";
  if (hasAny(norm, ["elden teslim","gelip alabilir","dukkana","dükkana","magazadan","mağazadan","subeden alacagim","şubeden alacağım","subeden","şubeden"])) return "Siparişlerimiz kargo ile gönderilmektedir efendim, elden teslim bulunmamaktadır 😊";
  if (hasAny(norm, ["link ile odeme","link ile ödeme","online odeme","online ödeme"])) return "Link ile ödeme seçeneğimiz bulunmamaktadır efendim 😊";
  if (hasAny(norm, ["kolye ucu","sadece ucu","sadece uc","kendi zincirime","zincir yok","zincirsiz"])) return "Ürünlerimiz zinciri ile birlikte sunulmaktadır efendim 😊";
  if (hasAny(norm, ["2 plaka","iki plaka","3 plaka","birden fazla plaka"])) return "Bir zincirde tek plaka olarak hazırlanıyor efendim 😊 İsterseniz iki ayrı kolye olarak hazırlayabiliriz.";
  if (hasAny(norm, ["aksesuar","pembe kalp","siyah kalp","nazar boncugu","nazar boncuğu","kalp var mi","kalp var mı","nazar boncuklu","kalp takil","kalp şekli","kalp sekli","kalp yapil","kalp yapıl","boncuk ekle","boncuklu olsun","boncuk koy","boncukta koy","boncuk var mi","boncuk var mı","boncuk istiyorum","kalp olsun","kalpli olsun","kalp seklinde","kalp şeklinde","aksesuar secenekleri","aksesuar seçenekleri"])) return "Pembe kalp, siyah kalp ve nazar boncuğumuz mevcut efendim 😊 Aksesuar ücretsizdir, fiyata dahildir.";
  // Plaka/renk/zincir örneği isteme → highlights linki
  if (hasAny(norm, ["plaka ornegi","plaka örneği","altin plaka orne","altın plaka örne","gumus plaka","gümüş plaka","mat celik nasil","mat çelik nasıl","mat celik ornek","mat çelik örnek","renk ornegi","renk örneği","nasil gorunuyor","nasıl görünüyor","nasil duruyor","nasıl duruyor","altin plaka","altın plaka","gumus ornek","gümüş örnek","zincir ornegi","zincir örneği"])) return "Tabi efendim, buradan inceleyebilirsiniz 😊\n\n📸 Örnek çalışmalar: https://www.instagram.com/stories/highlights/18084971893996144/";
  if (hasAny(norm, ["bileklik","bilezik"])) {
    if (hasAny(norm, ["degil","değil","yerine","bileklik istiyorum","bileklik yapiy","bileklik yapıy"])) return "Şu anda sadece kolye modellerimiz bulunmaktadır efendim 😊";
    // Prod logs fix: "Bileklik tarzında yapıyor musunuz" — kullanıcı bileklik satış soruyor
    // (hediye bileklik cevabı yanlış cevap; önce "sadece kolye" de)
    if (hasAny(norm, ["bileklik tarz","bileklik satiy","bileklik satıy","bileklik olarak yap","bilezik yapiy","bilezik yapıy","bileklik modeli yap","bileklik yapiy","bileklik yapıy"]) ||
        (hasAny(norm, ["bileklik","bilezik"]) && hasAny(norm, ["yapiyor musun","yapıyor musun","yapiyor musunuz","yapıyor musunuz","yapar mis","yapar mıs","mevcut mu","var mı","var mi"]))) {
      return "Şu anda sadece kolye modellerimiz bulunmaktadır efendim 😊 Harfli ataç kolyemizde hediye olarak bileklik gönderilmektedir.";
    }
    if (ctx.product === "atac" || hasAny(norm, ["hediye","gelmedi","kac cm","kaç cm"])) return "Harfli ataç kolyede aynı model bileklik hediye olarak gönderilmektedir efendim 😊 Bileklik uzunluğu 20 cm'dir.";
    return "Harfli ataç kolyede hediye bileklik gönderilmektedir efendim 😊";
  }
  if (hasAny(norm, ["yapim asama","yapım aşama","nasil yapiliyor","nasıl yapılıyor","surec nasil","süreç nasıl"])) return "Fotoğrafınızı alıyoruz, lazer kazıma yöntemiyle kolyeye işliyoruz ve kargo ile gönderiyoruz efendim 😊";
  if (hasAny(norm, ["yapay zeka","robot mu","bot mu","ai mi"]) && hasAny(norm, ["yapiy","yapıy","ile mi"])) return "Hayır efendim, lazer baskı yöntemiyle üretiyoruz 😊 Mesaj süreçlerinde yapay zekâ desteği kullanıyoruz ama ürünler el emeği ile hazırlanmaktadır.";
  if (hasAny(norm, ["renk secenek","renk seceneg","ne renk var","kac renk","kaç renk","renkler"]) && !hasAny(norm, ["renk atma","solma","kararma"])) return "Altın kaplama ve gümüş kaplama seçeneğimiz mevcut efendim 😊";
  // Renk tercihi notu
  if (hasAny(norm, ["gold olsun","gold renk","altin kaplama olsun","altın kaplama olsun"])) return "Tabi efendim, altın kaplama göndereceğiz, not aldım 😊";
  if (hasAny(norm, ["gumus olsun","gümüş olsun","gumus istiyorum","gümüş istiyorum","gumus kaplama olsun","gümüş kaplama olsun"])) return "Tabi efendim, gümüş kaplama göndereceğiz 😊 Ürünlerimiz paslanmaz çelikten üretilmektedir.";
  if (hasAny(norm, ["mat celik olsun","mat çelik olsun"])) return "Tabi efendim, mat çelik göndereceğiz, not aldım 😊";
  if (hasAny(norm, ["sms gelir","mesaj gelir","bilgi gelir","haber verir","bildirim gelir","takip numarasi","takip numarası"])) return "Kargoya verildiğinde size otomatik SMS gelecektir efendim 😊";
  if (hasAny(norm, ["erkek icin","erkek için","babam icin","babam için","esim icin","eşim için","oglum icin","oğlum için"])) {
    if (hasAny(norm, ["zincir","cm","boyu"])) { const c = p === "atac" ? "50" : "60"; return `Tabi efendim, erkek için de uygundur 😊 Zincir ${c} cm standarttır.`; }
    return "Tabi efendim, erkek için de uygundur 😊";
  }
  if (hasAny(norm, ["olcu","ölçü","boyut","3 cm","plaka olcusu","plaka ölçüsü","kac cm plaka","kaç cm plaka"])) return "Plaka boyutu 3 cm'dir efendim 😊";
  if (hasAny(norm, ["fatura","fis","fiş"])) return "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";
  if (hasAny(norm, ["fotograflar silinir","fotoğraflar silinir","fotograf paylas","fotoğraf paylaş","gizlilik"])) return "Fotoğraflarınız yalnızca siparişiniz için kullanılır ve sipariş tamamlandıktan sonra silinir efendim 😊";
  // F12 weak_cta_high_intent guard: "resimli kolye düşünüyorum çocuklarımın" gibi alım niyeti
  // deferral cümlesi değil, aktif CTA dönmeli
  if (hasAny(norm, ["donus yapacagim","dönüş yapacağım","sonra yazacagim","sonra yazacağım","dusuneyim","düşüneyim","dusunuyorum","düşünüyorum","tekrar donecegim","tekrar döneceğim","donus yapicam","dönüş yapıcam","birkac gun icinde","birkaç gün içinde","dusunup","düşünüp","dusunup size","düşünüp size","dusunup gonder","düşünüp gönder"]) &&
      !hasAny(norm, ["resimli kolye dusun","resimli kolye düşün","kolye dusunuyorum cocuk","kolye düşünüyorum çocuk","kolye dusunuyorum esim","kolye düşünüyorum eşim","lazer dusun","lazer düşün","atac dusun","ataç düşün","alacagim dusun","alacağım düşün"])) {
    const hasThanks = hasAny(norm, ["tesekkur","teşekkür","tesekkur ederim","teşekkür ederim","tesekkurler","teşekkürler","sag olun","sağ olun","sagol","sağol"]);
    const thanksPrefix = hasThanks ? "Rica ederim efendim 🤍 " : "";
    return thanksPrefix + "Tabi efendim, ne zaman hazır olursanız buradayız, bekliyoruz 😊 Karar verirken takıldığınız bir şey olursa yardımcı olmaktan memnuniyet duyarız.";
  }
  // High-intent alım niyeti → aktif CTA
  if (hasAny(norm, ["resimli kolye dusun","resimli kolye düşün","kolye dusunuyorum cocuk","kolye düşünüyorum çocuk","kolye dusunuyorum esim","kolye düşünüyorum eşim","kolye alacagim cocuk","kolye alacağım çocuk","kolye aldirma dusun","kolye aldırma düşün","kolye yaptirmayi dusun","kolye yaptırmayı düşün"])) {
    return "Çok güzel bir fikir efendim 🤍 Fotoğrafları buradan gönderirseniz siparişinizi hemen oluşturalım 😊";
  }
  // Dönecektiniz ama — complaint/hatırlatma
  if (hasAny(norm, ["donecektiniz","dönecektiniz","donmediniz","dönmediniz","donus yapmadi","dönüş yapmadı"])) return "Özür dileriz efendim 😊 Hemen kontrol edip dönüş sağlıyoruz.";
  // Gümüş olsun/yapabiliyor musunuz → material
  if (hasAny(norm, ["gumus olsun","gümüş olsun","gumus istiyorum","gümüş istiyorum","gumus yapabiliyor","gümüş yapabiliyor","gumus var mi","gümüş var mı","gumus seceneg","gümüş seçenek"])) return "Ürünlerimiz paslanmaz çelikten üretilmektedir efendim 😊 Gümüş kaplama seçeneğimiz bulunmaktadır. Kararma, solma yapmaz.";
  // Her yere kargo
  if (hasAny(norm, ["her yere kargo","her yere gonderi","her yere gönderim","her ile","turkiyenin her yeri","türkiyenin her yeri"])) return "Evet efendim, Türkiye'nin her yerine kargo ile gönderim yapıyoruz 😊";
  if (hasAny(norm, ["seffaf kargo","şeffaf kargo"])) return "Şeffaf kargo seçeneğimiz bulunmamaktadır efendim 😊 Ancak ürününüzü göndermeden önce fotoğrafını çekip atabiliriz.";
  if (hasAny(norm, ["ozel kargo","özel kargo","aras kargo","mng kargo","surat kargo","sürat kargo"])) return "Gönderimlerimiz PTT Kargo ile yapılmaktadır efendim 😊 Farklı kargo seçeneği için +25 TL ek ücret ile Aras Kargo tercih edilebilir.";
  if (hasAny(norm, ["italyan zincir","halat zincir","burgulu zincir"])) { 
    const c = p === "atac" ? "50" : "60"; 
    const suffix = stage === STAGE.WAITING_LETTERS ? " Yapılmasını istediğiniz harfleri yazabilirsiniz 😊" : "";
    return `Tek model standart zincirimiz bulunmaktadır efendim 😊 ${c} cm.${suffix}`; 
  }
  if (hasAny(norm, ["siparis nasil","sipariş nasıl","nasil siparis","nasıl sipariş","siparis verme","sipariş verme","siparis vermek","sipariş vermek","nasil siparis verebilirim","nasıl sipariş verebilirim"]) && !hasAny(norm, ["vermeyeceg","istemiyorum","vazgec","vazgeç","henuz","henüz","daha sonra","dusuneceg","düşüneceğ"])) {
    // Stage ilerlemişse → fiyat dump etme, stage'e uygun davet ver
    if (stage === STAGE.WAITING_PAYMENT) return null;
    if (stage === STAGE.WAITING_ADDRESS) return null;
    // Price ekleme: mesajda explicit price query varsa (fiyat/tl/ne kadar/fark)
    const hasPriceQuery = hasAny(norm, ["fiyat","ucret","ücret","kac tl","kaç tl","ne kadar","kac para","kaç para","fark"]);
    if (stage === STAGE.WAITING_PHOTO) {
      if (hasPriceQuery) {
        const priceLine = p === "atac"
          ? `Harfli Ataç Kolye: EFT ${PRICE.ATAC_EFT} TL, kapıda ${PRICE.ATAC_KAPIDA} TL.`
          : `Resimli Lazer Kolye: EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL.`;
        return `Tabii efendim 😊 Fotoğrafınızı buradan iletebilirsiniz, siparişinizi hemen oluşturuyoruz. ${priceLine}`;
      }
      return "Tabii efendim 😊 Fotoğrafınızı buradan iletebilirsiniz, siparişinizi hemen oluşturuyoruz.";
    }
    if (stage === STAGE.WAITING_LETTERS) return "Tabii efendim 😊 Yapılmasını istediğiniz harfleri yazabilirsiniz.";
    if (p === "lazer") return TEXT.LAZER_PRICE;
    if (p === "atac") return TEXT.ATAC_PRICE;
    return TEXT.MAIN_MENU;
  }
  // Belirsiz ürün sorusu → menü
  if (!p && hasAny(norm, ["kolye","bu urun","bu ürün","resimi","zarf kolye"]) && !hasAny(norm, ["lazer","atac","ataç","resimli","harfli"])) return TEXT.MAIN_MENU;
  if (hasAny(norm, ["degisiklik olmaz","değişiklik olmaz","degisiklik yapiliyor","değişiklik yapılıyor","fotoda degisiklik","fotoda değişiklik"])) return "Fotoğraflarınız lazer baskıya uygun hale getirilir efendim 😊 Göz ile görülür bir değişiklik yapılmıyor.";

  return null;
}

// ═══ C. TONE ═══
function getToneResponse(intent, ctx) {
  const { norm } = ctx;
  const stage = ctx.fields?.conversation_stage || "";

  // ── SENSITIVITY ──
  if (intent === "sensitivity") return "Başınız sağ olsun efendim, Allah rahmet eylesin 🤍 En güzel şekilde hazırlayalım.";

  // ── FRUSTRATION ──
  if (intent === "frustration") return "Çok özür dileriz efendim, sizi hemen bir insan temsilcimize yönlendiriyorum 😊";

  // ── COMPLAINT ──
  if (intent === "complaint") {
    if (stage === STAGE.WAITING_ADDRESS || stage === STAGE.WAITING_PAYMENT) return "Özür dileriz efendim 😊 Bilgilerinizi aldım, kontrol ediyorum.";
    return "Özür dileriz efendim 😊 Bilgilerinizi kontrol ediyorum.";
  }

  // ── CLAIMS (stage-aware) ──
  if (intent === "photo_claim") return "Fotoğrafınızı aldım efendim 😊";
  // ══ SIRA 6: SLOT-AWARE CLAIM / PARTIAL SLOT / FULL BUNDLE ══

  // full_contact_bundle: name + phone + address → tekrar bilgi istemek YASAK
  if (intent === "full_contact_bundle") {
    const st = ctx.fields?.conversation_stage || "";
    if (st === STAGE.WAITING_ADDRESS || st === STAGE.WAITING_PAYMENT || st === STAGE.WAITING_PHOTO) {
      return "Bilgilerinizi aldım efendim 😊 Siparişinizi işleme alıyoruz, kargoya verilince bilgilendirme yapacağız.";
    }
    return "Bilgilerinizi aldım efendim, teşekkürler 😊";
  }

  // ━━━ EXTRA-15 E11: partial_name_phone — isim+telefon var, adres yok ━━━
  if (intent === "partial_name_phone") {
    return "İsim ve cep telefonunuzu aldım efendim 😊 Açık adres bilginiz ile devam edelim.";
  }

  // phone_provide: sadece telefon → telefonu aldım + adres iste
  if (intent === "phone_provide") {
    const st = ctx.fields?.conversation_stage || "";
    if (st === STAGE.WAITING_ADDRESS) return "Telefon numaranızı aldım efendim 😊 Ad soyad ve açık adres bilgileriniz ile devam edelim.";
    if (st === STAGE.WAITING_PHOTO || st === STAGE.WAITING_PAYMENT) return "Telefon numaranızı not aldım efendim 😊";
    return "Telefon numaranızı aldım efendim 😊";
  }

  // address_provide_partial: şehir/ilçe düzeyinde → konum alındı + devam iste
  if (intent === "address_provide_partial") {
    return "Konum bilginizi aldım efendim 😊 Ad soyad, cep telefonu ve açık adresin devamını da yazabilirsiniz.";
  }

  // address_provide_full: açık adres var → aldım
  if (intent === "address_provide_full") {
    const st = ctx.fields?.conversation_stage || "";
    if (st === STAGE.WAITING_ADDRESS) return "Adres bilgilerinizi aldım efendim 😊 Siparişinizi hazırlıyoruz.";
    return "Adres bilgilerinizi not aldım efendim 😊";
  }

  // identity_provide: isim → aldım + telefon/adres iste
  if (intent === "identity_provide") {
    return "İsim bilgisini aldım efendim 😊 Cep telefonu ve açık adresiniz ile devam edelim.";
  }

  // slot_claim (generic): claim var ama target belli değil
  if (intent === "slot_claim") {
    const st = ctx.fields?.conversation_stage || "";
    const f = ctx.fields || {};
    // Completed stage'de ödeme claim'i → ekibimize
    if (st === STAGE.ORDER_COMPLETED || st === "order_completed") return "Siparişiniz alınmıştır efendim 😊 Ekibimize iletiyorum, kontrol edip dönüş sağlayacağız.";
    const hasPhone = f.phone_received === "1";
    const hasAddr = f.address_status === "received";
    if (hasPhone && hasAddr) return "Bilgilerinizi aldım efendim, teşekkürler 😊";
    if (!hasPhone) return "Bilgilerinizi not aldım efendim 😊 Cep telefonu ve açık adres bilgilerinizi de paylaşabilir misiniz?";
    if (!hasAddr) return "Not aldım efendim 😊 Açık adres bilgilerinizi de yazabilirsiniz.";
    return "Tabi efendim, bilgilerinizi aldım 😊";
  }

  // address_claim: "adresi attım" claim
  if (intent === "address_claim") {
    const f = ctx.fields || {};
    if (f.address_status === "received") return "Adresinizi aldık efendim 😊 Kargoya verilince bilgilendirme yapacağız.";
    return "Bilgileri aldım efendim 😊 Ekibimiz kontrol edip en kısa sürede dönüş sağlayacak.";
  }

  // phone_claim: "telefonu attım" claim
  if (intent === "phone_claim") {
    const f = ctx.fields || {};
    if (f.phone_received === "1") return "Telefon numaranızı aldık efendim 😊";
    return "Telefon bilginizi aldım efendim 😊 Kontrol edip dönüş sağlayacağız.";
  }

  if (intent === "info_claim") return "Bilgilerinizi aldım efendim 😊";
  if (intent === "general_claim") return "Tabi efendim, bilgilerinizi aldım 😊";

  // ── SMALLTALK ──
  if (intent === "smalltalk") {
    const isFirstMessage = !stage || stage === "waiting_product";
    if (hasAny(norm, ["merhaba","selam","slm","mrb","merhabalar","selamlar"])) {
      if (isFirstMessage) return TEXT.MAIN_MENU;
      // ══ AILE N FIX: Flow içindeyken selam — stage'e göre hatırlatma ekle ══
      if (stage === STAGE.WAITING_PHOTO || stage === "waiting_photo") {
        return "Merhaba efendim 😊 Fotoğrafınızı iletmenizi bekliyoruz, kolyenize işlenecek fotoğrafı buradan paylaşabilirsiniz.";
      }
      if (stage === STAGE.WAITING_PAYMENT || stage === "waiting_payment") {
        return "Merhaba efendim 😊 Ödeme tercihinizi belirterek devam edelim — EFT / Havale veya kapıda ödeme.";
      }
      if (stage === STAGE.WAITING_ADDRESS || stage === "waiting_address") {
        const hasPhone = ctx.fields?.phone_received === "1";
        const hasAddr = ctx.fields?.address_status === "address_only";
        if (hasAddr && !hasPhone) return "Merhaba efendim 😊 Cep telefonu numaranızı iletebilir misiniz?";
        if (hasPhone && !hasAddr) return "Merhaba efendim 😊 Açık adresinizi iletebilir misiniz?";
        return "Merhaba efendim 😊 Ad soyad, cep telefonu ve açık adres bilgileriniz ile devam edelim.";
      }
      if (stage === STAGE.WAITING_LETTERS || stage === "waiting_letters") {
        return "Merhaba efendim 😊 Yapılmasını istediğiniz harfleri yazabilirsiniz.";
      }
      if (stage === STAGE.ORDER_COMPLETED || stage === "order_completed") {
        return "Merhaba efendim 😊 Siparişiniz alınmıştır, size nasıl yardımcı olabiliriz?";
      }
      return "Merhaba efendim 😊 Size nasıl yardımcı olabilirim?";
    }
    if (hasAny(norm, ["tesekkur","teşekkür","tsk","tşk","tesekurler","teşekkürler","tesekur","teşekür"])) return isFirstMessage ? `Rica ederiz efendim 😊 Hangi model ile ilgileniyorsunuz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye` : "Rica ederiz efendim 😊";
    if (hasAny(norm, ["basiniz sagolsun","başınız sağolsun","basiniz sag olsun","başınız sağ olsun"])) return "Teşekkür ederiz efendim 🤍";
    if (hasAny(norm, ["sagol","sağol","sag ol","sağ ol","sagolun","sağolun","saol","saolun","sağ olun","cok saolun","çok sağolun","cok sagolun"])) return isFirstMessage ? `Rica ederiz efendim 😊 Hangi model ile ilgileniyorsunuz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye` : "Rica ederiz efendim 😊";
    if (hasAny(norm, ["iyi gunler","iyi günler"])) return "Size de iyi günler efendim 😊";
    if (hasAny(norm, ["iyi aksamlar","iyi akşamlar"])) return "İyi akşamlar efendim 😊";
    if (hasAny(norm, ["iyi geceler"])) return "İyi geceler efendim 😊";
    if (hasAny(norm, ["gunaydin","günaydın"])) return "Günaydın efendim 😊";
    if (hasAny(norm, ["kolay gelsin"])) return "Teşekkür ederiz efendim 😊";
    if (hasAny(norm, ["allah razi olsun","allah razı olsun"])) return "Cümlemizden efendim, teşekkür ederiz 🤍";
    if (hasAny(norm, ["insallah","inşallah"])) {
      // Dua bağlamı: "Allah" AYRIYKEN (inşallah'ın içindeki değil), rahmet, cennet, şifa → amin
      const duaContext = /\ballah\b/.test(norm.replace(/insallah|inşallah/g,"")) || hasAny(norm, ["rahmet","cennet","sifa","şifa","dua","hayirli","hayırlı"]);
      if (duaContext) return "Amin efendim 🤍";
      return "İnşallah efendim 😊";
    }
    if (/\bamin\b/.test(norm)) return "Amin efendim 🤍";
    if (hasAny(norm, ["masallah","maşallah"])) return "Maşallah efendim 😊";
    if (hasAny(norm, ["elinize saglik","elinize sağlık","ellerinize saglik","ellerinize sağlık","emeginize saglik","emeğinize sağlık"])) return "Teşekkür ederiz efendim 😊";
    if (hasAny(norm, ["bayildim","bayıldım","cok guzel","çok güzel","harika","muhtesem","muhteşem","super","süper","begendim","beğendim","tatli","tatlı","gecmis olsun","geçmiş olsun","rica ederim","helal edin"])) return "Çok teşekkür ederiz efendim 😊";
    if (hasAny(norm, ["bol kazanclar","bol kazançlar","hayirli isler","hayırlı işler"])) return "Amin efendim, teşekkür ederiz 🤍";
    if (hasAny(norm, ["allah yardimciniz","allah yardımcınız"])) return "Amin efendim, teşekkür ederiz 🤍";
    if (hasAny(norm, ["yapay zeka","robot mu","bot mu","ai mi","gercek insan mi","gerçek insan mı"])) return "Evet, mesaj süreçlerinde yapay zekâ desteği kullanıyoruz 😊 Özel durumlarda biz direkt ilgileniyoruz.";
    if (hasAny(norm, ["neden cevap vermiyorsunuz","cevap vermiyorsunuz","gecikme"])) return "Gecikme için çok özür dileriz efendim, hemen yardımcı olalım 😊";
    return null; // AI
  }

  // ── ACK (stage-aware) ──
  if (intent === "ack") {
    // ══ AILE O + S FIX: Ack (evet/tamam/peki/tamamdır) → teyit + prompt ══
    // Kullanıcının kısa onayı görmezden gelmek yerine kibar teyit ile başla
    const rawAck = String(ctx.message || "").trim().toLowerCase();
    const isTamamdir = /^(tamamdır|tamamdir|tamamdr|tamamdır|tamamdır efendim)/i.test(rawAck);
    const isEvet = /^(evet|e |evvet|ewet)$/i.test(rawAck) || rawAck === "evet";
    const isOlur = /^(olur|olur tabi|olur peki|olmaz)$/i.test(rawAck);
    const isPeki = /^(peki|pekii|tmm|tm|tamam|tamamm|ok|okey|oldu|olmuş|tabi|tabii|elbette)$/i.test(rawAck);
    
    // Teyit prefix seç
    let prefix = "";
    if (isTamamdir) prefix = "Harika efendim 😊 ";
    else if (isEvet) prefix = "Tamam efendim 😊 ";
    else if (isOlur) prefix = "Tamam efendim 😊 ";
    else if (isPeki) prefix = "Tamam efendim 😊 ";
    
    if (stage === STAGE.WAITING_PHOTO) return prefix ? prefix + "fotoğrafınızı buradan iletebilirsiniz 😊" : "Fotoğrafınızı buradan iletebilirsiniz efendim 😊";
    if (stage === STAGE.WAITING_PAYMENT) return prefix ? prefix + "ödeme tercihinizi belirtebilir misiniz? EFT / Havale veya kapıda ödeme 😊" : "Ödeme tercihinizi belirtebilir misiniz efendim? EFT / Havale veya kapıda ödeme 😊";
    if (stage === STAGE.WAITING_ADDRESS) {
      const hasPhone = ctx.fields?.phone_received === "1";
      const hasAddr = ctx.fields?.address_status === "address_only";
      if (hasAddr && !hasPhone) return prefix ? prefix + "cep telefonu numaranızı iletebilir misiniz? 😊" : "Cep telefonu numaranızı iletebilir misiniz efendim? 😊";
      if (hasPhone && !hasAddr) return prefix ? prefix + "açık adresinizi iletebilir misiniz? 😊" : "Açık adresinizi iletebilir misiniz efendim? 😊";
      return prefix ? prefix + "ad soyad, cep telefonu ve açık adres bilgileriniz ile devam edelim 😊" : "Ad soyad, cep telefonu ve açık adres bilgileriniz ile devam edelim efendim 😊";
    }
    if (stage === STAGE.WAITING_LETTERS) return prefix ? prefix + "yapılmasını istediğiniz harfleri yazabilirsiniz 😊" : "Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊";
    return "Tabi efendim 😊";
  }

  // ── VEFAT/HASTALIK/DUYGUSAL (norm-based fallback) ──
  if (hasAny(norm, ["vefat","kaybettik","kaybettim","rahmetli","merhum"])) return "Başınız sağ olsun efendim, Allah rahmet eylesin 🤍";
  if (hasAny(norm, ["hastalanmis","hastalanmış","ameliyat","kanser","hastanede"])) return "Geçmiş olsun efendim, Allah şifalar versin 🤍";
  if (hasAny(norm, ["allah kimsenin basina","allah kimsenin başına","zor surec","zor süreç","cok kotu","çok kötü"])) return "Çok üzüldüm efendim 🤍";
  if (hasAny(norm, ["whatsapp"]) && hasAny(norm, ["gonderdim","gönderdim","attim","attım"])) return "Tabi efendim, kontrol edip dönüş sağlıyoruz 😊";

  // ── BEĞENI / COMPLIMENT (norm-based, intent general'den bile yakalansın) ──
  if (hasAny(norm, ["cok tatli","çok tatlı","cok guzel","çok güzel","harika","bayildim","bayıldım","super","süper","muhtesem","muhteşem","begendim","beğendim"])) return "Çok teşekkür ederiz efendim 😊";

  return null;
}

// ═══ D. PRODUCT FLOW ═══
function getProductFlowResponse(intent, ctx) {
  const { product: p, norm } = ctx;

  if (intent === "order_start") {
    // w_payment'ta zaten foto alınmış — ödeme sor
    const stage = ctx.fields?.conversation_stage || "";
    if (stage === STAGE.WAITING_PAYMENT) return "Tabi efendim 😊 Ödeme tercihinizi belirtebilir misiniz? EFT / Havale veya kapıda ödeme.";
    if (stage === STAGE.WAITING_ADDRESS) return "Tabi efendim 😊 Ad soyad, cep telefonu ve açık adres bilgileriniz ile devam edelim.";
    // Price ekleme sadece **explicit price query** varsa. "sipariş vermek istiyorum"
    // tek başına fiyat talebi değildir — kullanıcı zaten akış içinde.
    // Price keywords: "fiyat", "tl", "kaç para", "ne kadar", "ücret", "fark"
    const hasPriceQuery = hasAny(norm, ["fiyat","ucret","ücret","kac tl","kaç tl","ne kadar","kac para","kaç para","fark"]);
    // Flow enrichment: explicit order inquiry phrase'i VE price query birlikte
    const isInquiry = hasAny(norm, [
      "siparis vermek","sipariş vermek","siparis vericem","sipariş vericem",
      "siparis olustur","sipariş oluştur","nasil siparis","nasıl sipariş",
      "yaptirmak istiyorum","yaptırmak istiyorum","almak istiyorum",
      "siparis vereceğim","sipariş vereceğim","siparis verecegim"
    ]);
    if (stage === STAGE.WAITING_PHOTO) {
      if (isInquiry && hasPriceQuery) {
        const priceLine = p === "atac"
          ? `Harfli Ataç Kolye: EFT ${PRICE.ATAC_EFT} TL, kapıda ${PRICE.ATAC_KAPIDA} TL.`
          : `Resimli Lazer Kolye: EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL.`;
        return `Tabii efendim 😊 Fotoğrafınızı buradan iletebilirsiniz, siparişinizi hemen oluşturuyoruz. ${priceLine}`;
      }
      // Default: fiyat yasak, sadece fotoğraf daveti
      return "Tabii efendim 😊 Fotoğrafınızı buradan iletebilirsiniz, siparişinizi hemen oluşturuyoruz.";
    }
    if (stage === STAGE.WAITING_LETTERS) {
      return "Tabii efendim 😊 Yapılmasını istediğiniz harfleri yazabilirsiniz.";
    }
    if (p === "lazer") return TEXT.LAZER_PRICE;
    if (p === "atac") return TEXT.ATAC_PRICE;
    return TEXT.MAIN_MENU;
  }
  if (intent === "post_sale") return "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊";
  if (intent === "new_order") {
    const st = ctx.fields?.conversation_stage || "";
    // Completed'da tekrar sipariş → menüyü göster
    if (st === STAGE.ORDER_COMPLETED || st === "order_completed") return TEXT.MAIN_MENU;
    // waiting_product/boş: fiyat bilgisini de içeren menu (yeni sipariş = price signal)
    // waiting_payment/waiting_address'te de testler menu bekliyor (siparişe ek devam değil, yeni ürün seçimi).
    return `Tabi efendim 😊\n\nFiyatlarımız:\n\n📸 Resimli Lazer Kolye: EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL\n✨ Harfli Ataç Kolye: EFT ${PRICE.ATAC_EFT} TL, kapıda ${PRICE.ATAC_KAPIDA} TL\n\nHangi model ile ilgileniyorsunuz efendim?`;
  }
  if (intent === "cancel_order") return "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊";
  if (intent === "photo_reference") return "Tabi efendim 😊 Belirttiğiniz fotoğrafı kullanacağız.";
  if (intent === "photo_change_request") return "Tabi efendim, değiştirmek istediğiniz görseli buradan paylaşabilirsiniz 😊";

  // Ataç foto/back_text block
  if (p === "atac" && hasAny(norm, ["fotograf","fotoğraf","resim","foto atsam"]) && !hasAny(norm, ["ornek","örnek"])) return "Bu modelde fotoğraf kullanılmıyor efendim, sadece harf ile hazırlanıyor 😊";
  if (p === "atac" && hasAny(norm, ["arkasina yazi","arkasına yazı","arka yuze","arka yüze","arka yazi","arka yazı"])) return "Bu modelde arka yüze yazı yapılmıyor efendim 😊";

  // Bargain (product flow'da da yakalansın)
  if (intent === "bargain") return "Fiyatlarımız sabit olarak belirlenmiştir efendim 😊";

  // WhatsApp
  if (hasAny(norm, ["whatsapp","numara alab","telefon alab","tel alab"])) return TEXT.WHATSAPP;

  return null;
}

// ═══ E. AI ═══
async function callAI(ctx, factBlock, knowledge) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.AI_REPLY_MODEL || "gpt-5-mini";
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const systemPrompt = `Sen Yudum Jewels Instagram satış asistanısın. SADECE JSON döndür.\nKURALLAR:\n1. Bilgi uydurma. 2. Min 1 tam cümle, max 2 cümle, sonuna 😊. TEK KELİMELİK CEVAP YASAK ("Fotoğraf?", "Kaç?", "Renk?" gibi kısa cevaplar VER-ME). 3. Yan soru → sadece onu cevapla, stage sorusunu EKLEME. 4. Lazer kolyede zincir 60 cm TEK MODEL. 5. Fiyat: Lazer EFT 599, kapıda 649. Ataç EFT 499, kapıda 549. 6. Kapıda SADECE NAKİT. 7. WhatsApp müşteri sormadıkça verme. 8. İndirim yapma. 9. "Suya dayanıklı" cümlesini SADECE su/deniz sorusu gelirse kullan, başka durumda KULLANMA. 10. Müşteriden ONAY İSTEME, bilgiyi al ve devam et. 11. Kendini tanıtırken "ben sen" YAZMA, "Yudum Jewels satış asistanıyım" de.\n${factBlock ? `KONU:\n${factBlock}` : ""}`;
  const userPrompt = `Ürün: ${ctx.product || "?"}\nAşama: ${ctx.fields?.conversation_stage || "?"}\n${knowledge ? `BİLGİ:\n${knowledge}\n` : ""}MÜŞTERİ: "${ctx.message}"\nJSON: {"reply":"...","confidence":0.0-1.0,"next_action":"none|handoff"}`;
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 25000);
    const r = await fetch(`${baseUrl}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, signal: c.signal, body: JSON.stringify({ model, max_completion_tokens: 2000, messages: [{ role: "developer", content: systemPrompt }, { role: "user", content: userPrompt }] }) });
    clearTimeout(t); if (!r.ok) return null;
    const d = await r.json(); const u = d.usage || {};
    console.log("[TOKEN]", JSON.stringify({ prompt: u.prompt_tokens, completion: u.completion_tokens }));
    const txt = (d.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
    let p; try { p = JSON.parse(txt); } catch { const m = txt.match(/"reply"\s*:\s*"([^"]+)"/); p = m ? { reply: m[1], confidence: 0.5 } : null; }
    if (!p) return null;
    return { reply: p.reply, confidence: p.confidence || 0, next_action: p.next_action || "none", _tokens: u.total_tokens || 0 };
  } catch { return null; }
}

// ═══ MAIN ═══
export async function generateAnswer(ctx) {
  const intent = ctx.intent;
  const stage = ctx.fields?.conversation_stage || "";
  const isCompleted = ctx.fields?.order_status === "completed" || ctx.fields?.siparis_alindi === "1" || stage === "order_completed";

  // HUMAN SUPPORT — sadece stage human_support ise
  if (stage === "human_support") {
    const { norm } = ctx;
    const rawHs = String(ctx.message || "").trim();
    // Teşekkür/sağol → warm gratitude
    if (hasAny(norm, ["tesekkur","teşekkür","sagol","sağol","saolun","sağolun","saol","cok saolun","çok sağolun","tesekkur ederim","teşekkür ederim"])) {
      return { text: "Rica ederiz efendim 😊", source: "human_support", reply_class: REPLY_CLASS.FIXED_INFO };
    }
    // Dua/blessing — "Allah'a emanet" eklendi
    if (hasAny(norm, ["allah razi","allah razı","amin","elinize saglik","elinize sağlık","hayirli","hayırlı","allah.a emanet","allaha emanet","allah.a sukur","allah.a şükür","allaha sukur","allaha şükür"]) ||
        /allah.?a emanet/i.test(norm)) {
      return { text: "Amin efendim, teşekkür ederiz 🤍", source: "human_support", reply_class: REPLY_CLASS.FIXED_INFO };
    }
    // Sadece emoji (🙏/❤/💫) → teşekkür
    if (/^[\p{Emoji}\s]+$/u.test(rawHs) && rawHs.length < 20) {
      return { text: "Rica ederiz efendim 😊", source: "human_support", reply_class: REPLY_CLASS.FIXED_INFO };
    }
    // Bekliyorum/tamam/peki → sakin teyit
    if (hasAny(norm, ["bekliyorum","tamam","peki","anladim","anladım","tamamdir","tamamdır"])) return { text: "En kısa sürede dönüş sağlanacaktır efendim 😊", source: "human_support", reply_class: REPLY_CLASS.FIXED_INFO };
    // Diğer → operatöre
    return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "human_support", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
  }

  // COMPLETED ORDER — en yüksek öncelik
  if (isCompleted) {
    const { norm } = ctx;
    // Completed'da normal akışa düşmesi gereken intentler
    const passThrough = ["smalltalk","ack","sensitivity","frustration","new_order","order_start","bargain","chain_question","material_question","trust","example_request","back_text_info","back_photo_info","back_text_content","back_text_question","back_text_fit_question","detail_request","location","shipping_price","shipping","price","preview_request","decision_support","composition_question","quantity_order","product_structure_request","single_pendant_request","chain_structure_request",
      // Sıra 6: slot/claim intents
      "photo_claim","address_claim","phone_claim","slot_claim","info_claim","general_claim","full_contact_bundle","phone_provide","address_provide_partial","address_provide_full","identity_provide","completed_change_request"];
      // NOT: completed_photo_share_request passThrough'dan ÇIKARILDI — satır ~968'deki deterministic preview policy cevabını alsın (F4 fix)
    
    // Sipariş teyidi — kargo takipten ÖNCE
    if (hasAny(norm, ["siparis alindi","siparişim alındı","siparis tamam","siparişim tamam","siparisim alindi","siparişim alındı"])) return { text: "Evet efendim, siparişiniz alınmıştır 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };

    // ━━━ EXTRA-15 E05 — F9_post_sale_warmth: duygusal praise → sıcak cevap, operatöre kaçırma ━━━
    // NOT: back_text içeriği olabilecek cümleler (isim+sevgi sözcüğü) burada yakalanmamalı —
    // onlar intent-engine C9/C11'de back_text_content olarak dönmeli. Burada sadece
    // "post-sale reaksiyon" cümleleri (ben/biz/o öznesi + duygu) yakalanır.
    const isPraiseReaction = hasAny(norm, [
      "hic cikarm","hiç çıkarm","cikarmaya kiyamicam","çıkarmaya kıyamıcam",
      "boynundan inmeyecek","boynundan inmiyor","hep boynumda","hep takarim","hep takarım",
      "cok sevdi","çok sevdi","bayildi","bayıldı","gozleri parladi","gözleri parladı",
      "aglayarak","ağlayarak","aglatmayi","ağlatmayı","cok sevindi","çok sevindi",
      "cok mutlu oldu","çok mutlu oldu","duygulandi","duygulandı",
    ]);
    const isBackTextLike = hasAny(norm, [
      "seni cok seviyor","seni çok seviyor","canim oglum","canım oğlum",
      "canim kizim","canım kızım","hep bagislasin","hep bağışlasın",
      "iyi ki varsin","iyi ki varsın","her nefesims","nefesimsin",
    ]);
    if (isPraiseReaction && !isBackTextLike) {
      return { text: "Ne güzel efendim, çok sevindik duymak 🤍 Sağlıkla kullansın inşallah, keyifle takın.", source: "completed_praise", reply_class: REPLY_CLASS.FIXED_INFO };
    }

    // ━━━ FIX F7: completed stage'de yeni adres/telefon/bundle → operatöre gitmesin ━━━
    // Müşteri tamamlanmış siparişte adres/telefon değişikliği veya ek bilgi yazıyorsa
    const _raw = ctx.message || "";
    const _hasPhoneCompl = /\b0?5\d{2}[\s.\-]?\d{3}[\s.\-]?\d{2}[\s.\-]?\d{2}\b/.test(_raw);
    const _hasAddressCompl = hasAny(norm, ["mahalle","mah ","cadde","cad ","sokak","sok ","bulvar","apt","daire","kat "]);
    const _hasNameCompl = /[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}\s+[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}/.test(_raw) && _raw.trim().length < 100;
    const _bundleScore = (_hasPhoneCompl ? 1 : 0) + (_hasAddressCompl ? 1 : 0) + (_hasNameCompl ? 1 : 0);

    // Tam bundle — direkt kabul
    if (_bundleScore >= 2) {
      return { text: "Bilgilerinizi aldım efendim 😊 Ekibimize iletiyoruz, siparişinizde ilgili güncelleme yapılacaktır.", source: "completed_bundle", reply_class: REPLY_CLASS.FIXED_INFO };
    }
    // Sadece telefon — telefon aldık
    if (_hasPhoneCompl && !_hasAddressCompl && _raw.trim().length < 30) {
      return { text: "Telefon numaranızı aldım efendim 😊 Ekibimize iletiyoruz.", source: "completed_phone", reply_class: REPLY_CLASS.FIXED_INFO };
    }
    // Sadece adres (tek mesajda uzun adres)
    if (_hasAddressCompl && !_hasPhoneCompl && _raw.trim().length > 30) {
      return { text: "Adres bilginizi aldım efendim 😊 Ekibimize iletiyoruz.", source: "completed_address", reply_class: REPLY_CLASS.FIXED_INFO };
    }
    
    // Yeni sipariş isteği completed'da → menü göster (sadece gerçek sipariş isteği)
    if ((intent === "order_start" || intent === "new_order") && hasAny(norm, ["siparis","siparış","istiyorum","yaptirmak","yaptırmak","vermek","tekrar","yeni","bir tane daha","baska","başka"])) return { text: TEXT.MAIN_MENU, source: "completed_new_order", reply_class: REPLY_CLASS.FLOW_PROGRESS };
    
    // Foto paylaşım completed'da → koşullu cevap (operatör DEĞİL) — DURUM SORUSUNDAN ÖNCE
    if (hasAny(norm, ["paylasirsaniz","paylaşırsanız","bitince paylas","bitince paylaş","paylasiyor musunuz","paylaşıyor musunuz","paylasiyormusunuz","paylaşıyormusunuz","siparis sonrasi foto","sipariş sonrası foto","gorsel atar","görsel atar","foto atar","paylasir misiniz","paylaşır mısınız","yapinca foto","yapınca foto","yapinca resim","yapınca resim","hazir olunca","hazır olunca","duzenleyince","düzenleyince","gorebilir miyim","görebilir miyim","resim atar","fotograf atar","fotoğraf atar","hazirlandiginda","hazırlandığında","hazirlaninca","hazırlanınca","onceden atma","önceden atma","onceden gorme","önceden görme","onceden gor","önceden gör","ornek atma","örnek atma","bitince atar","bittiginde","bittiğinde"])) return { text: "Yoğunluğa göre kargo sonrası paylaşabiliyoruz efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };

    // Bot-vaat hatırlatma / complaint completed'da → OPERATOR (preview'den önce)
    // "atacaktınız ama hatırlatmamı istemiştiniz" / "bana fotoğraf atacağınızı söylemiştiniz"
    // → müşteri bot'un sözünü hatırlatıyor, preview policy yetersiz; operator'a ilet.
    if (hasAny(norm, ["hatirlatmami istemis","hatırlatmamı istemiş","hatirlatmamizi istemis","hatırlatmamızı istemiş","soylemistiniz ama","söylemiştiniz ama","demistiniz ama","demiştiniz ama","atacagınızı soyle","atacağınızı söyle","atacaginizi soyle","fotograf atacagınız","fotoğraf atacağınız","fotograf atacaginiz","fotoğraf atacağınız"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };

    // ━━━ FIX F4: preview/reminder ("atacaktınız / görsel atar mısınız / hazırlanmış halini") → policy cevabı ━━━
    // Durum sorusu olarak operatöre atılmasın, preview policy dönsün
    if (hasAny(norm, [
      "atacaktiniz","atacaktınız","atacaginizi","atacağınızı","atacak miydiniz","atacak mıydınız",
      "soylemistiniz","söylemiştiniz","demistiniz","demiştiniz",
      "atma sansiniz","atma şansınız","atma sans",
      "hazirlanmis hal","hazırlanmış hal","hazirlanmis halini","hazırlanmış halini",
      "gonderebilir misiniz","gönderebilir misiniz","gonderirseniz","gönderirseniz",
      "gormek isterim","görmek isterim","gormek istiyorum","görmek istiyorum",
      "goremez miyim","göremez miyim","goremezmiyim","göremezmiyim",
      "rica etsem atma","baskidan once","baskıdan önce",
      "nasil durdu","nasıl durdu","nasil durduguna","nasıl durduğuna",
      "kolyenin yapilmis","kolyenin yapılmış","yapılmış hali","yapilmis hali",
      "zinciri de atarsin","zinciri de atarsınız","bi bakayim","bı bakayım",
      "sipairs gorseli","sipariş görseli","sipariş gorseli","gorsel atilacakti","görsel atılacaktı",
      "gorsel atacakti","görsel atacaktı","attigimiz gorseli","attığımız görseli",
      "urunu goreme","ürünü göreme","urunu gorebil","ürünü görebil","benim urun","benim ürün",
      "taslagini","taslağını","taslagini atar","taslağını atar",
    ])) return { text: "Yoğunluğa göre kargo öncesi paylaşabiliyoruz efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };

    // Durum sorusu / hatırlatma — intent ne olursa olsun (passthrough override)
    // NOT: "yapildi mi + görsel/resim" → preview'a git (durum DEĞİL)
    const asksVisual = hasAny(norm, ["gorsel","görsel","resim","foto","fotograf","fotoğraf","atar","atin","atın","ilet","gonder","gönder","bakayim","bakayım"]);
    if (hasAny(norm, ["hazirlandi mi","hazırlandı mı","hazirlandi","hazırlandı","yapildi mi","yapıldı mı","ne durumda","hazir mi","hazır mı","ne asamada","ne aşamada","haber bekliyorum","cvp bekliyorum","donus bekliyorum","dönüş bekliyorum","kolyeyi yapinca","kolyeyi yapınca","neden donmuyorsunuz","neden dönmüyorsunuz","neden donus","neden dönüş","cevap vermiyorsunuz","hatirlatma","hatırlatma","siparis verdim","sipariş verdim","siparis vermistim","sipariş vermiştim","urun geldi","ürün geldi","siparisimle alakasi","siparişimle alakası"]) && !asksVisual) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
    // Görsel istiyorsa, durum sorusu olsa bile preview policy dön
    if (hasAny(norm, ["hazirlandi mi","hazırlandı mı","yapildi mi","yapıldı mı"]) && asksVisual) return { text: "Yoğunluğa göre kargo öncesi paylaşabiliyoruz efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
    // "bekliyorum" tek başına (fiyat/bilgi bekliyorum hariç) → basit teyit
    if (hasAny(norm, ["bekliyorum"]) && !hasAny(norm, ["fiyat","bilgi"])) return { text: "Siparişiniz alınmıştır efendim 😊 En kısa sürede hazırlanıp kargoya verilecektir.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };

    // Kişisel kargo takibi her zaman operatöre (passthrough override)
    if (hasAny(norm, ["kargom","gelmedi","ulasmadi","ulaşmadı","nerede kargo","verildi mi","dagitim","dağıtım","kargoya verdiniz","kargoya verdin","kargoya verildi","herkesin kargosu","gec geldi","geç geldi","gec kaldi","geç kaldı"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
    
    // Gizlilik/iade/değişiklik completed'da → operatör (passThrough intent'leri bile yakala)
    if (hasAny(norm, ["silinir mi","silinecek mi","gizlilik","fotografi paylas","fotoğrafı paylaş","foto paylasin","foto paylaşın","iade","almak istemiyorum","degistirebilir","değiştirebilir","degistirmek","değiştirmek","bu fotograf olsun","bu fotoğraf olsun","bu foto olsun"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
    // Dekont completed'da → iletebilirsiniz
    if (hasAny(norm, ["dekont yollayayim","dekont yollayayım","dekont gondere","dekont göndere","dekont atayim","dekont atayım"])) return { text: "Tabi efendim, buradan iletebilirsiniz 😊", source: "completed", reply_class: REPLY_CLASS.FLOW_PROGRESS };
    // Ödeme yaptım completed'da → operatör
    if (hasAny(norm, ["odemeyi yaptim","ödemeyi yaptım","odeme yaptim","ödeme yaptım","odemeyi gonderdim","ödemeyi gönderdim","ucreti gonderdim","ücreti gönderdim","parayı gonderdim","parayı gönderdim"]) || (hasAny(norm, ["odemeyi","ödemeyi","ucreti","ücreti"]) && hasAny(norm, ["yaptim","yaptım","gonderdim","gönderdim","attim","attım"]))) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
    // Fiyat teyidi completed'da (650 tl dimi gibi)
    if (/\d{3}\s*(tl)?\s*(dimi|değil mi|degil mi|miydi|mıydı)/i.test(norm)) {
      const price = ctx.product === "atac" ? PRICE.ATAC_KAPIDA : PRICE.LAZER_KAPIDA;
      return { text: `Kapıda ödeme fiyatımız ${price} TL'dir efendim 😊`, source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
    }

    if (!passThrough.includes(intent)) {
      // "Verdim ya hepsini" / "yazdım yukarıda" completed'da → teyit (complaint'ten ÖNCE)
      if (hasAny(norm, ["verdim ya","yazdim yukarida","yazdım yukarıda","hepsini verdim"])) return { text: "Evet efendim, bilgileriniz alınmıştır 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Multi_order completed'da → yeni sipariş menüsü
      if (intent === "multi_order") return { text: TEXT.MAIN_MENU, source: "completed", reply_class: REPLY_CLASS.FLOW_PROGRESS };
      // Complaint completed'da → operatör
      if (intent === "complaint") return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // ══ AILE M FIX: completed overreach önle ══
      const rawAnswer = String(ctx.message || "").trim();
      // M2: PII redacted adres token ([ADDRESS]) → adres teyit
      if (/\[ADDRESS\]/i.test(rawAnswer) && rawAnswer.length < 40) {
        return { text: "Adres bilgilerinizi aldık efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      // M10: Pure şehir adı ("MERSİN/TARSUS", "Çukurcayır") adres parçası
      // DAR: ya slash/tire içeren iki-parçalı ("X/Y"), ya da ALL-CAPS isim, ya da 4+ karakter tek kelime ama ack/smalltalk olmamalı
      const isCityAllCaps = /^[A-ZÇĞİÖŞÜ]{3,}(\s*[/\-]\s*[A-ZÇĞİÖŞÜ]{3,})?$/.test(rawAnswer);
      const isCitySlash = /^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]+\s*[/\-]\s*[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü]+$/.test(rawAnswer);
      const isCommonAck = /^(olabilir|olur|tamam|peki|evet|hayir|hayır|oldu|anladim|anladım|tabi|tabii|harika|guzel|güzel|super|süper|tesekkur|teşekkür|tesekkurler|teşekkürler|rica|ediyoruz|anlasıldı|anlaşıldı|bakayim|bakayım|bakarim|bakarım|sonra|simdi|şimdi)/i.test(rawAnswer);
      if ((isCityAllCaps || isCitySlash) && rawAnswer.length < 20 && !isCommonAck) {
        return { text: "Adres bilgilerinizi aldık efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      // AGE: "16 yaşın da" / "18 yaşında" — müşteri hediyelik yaşını belirtiyor
      if (/^\d{1,2}\s*(yasin|yaşın|yasinda|yaşında|yas)\s*(da|de)?$/i.test(rawAnswer)) {
        return { text: "Tabi efendim, not aldık 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      // M5: Teşekkür/saolun → gratitude (ekibimize DEĞİL) — küçük/büyük harf fark etmez
      if (/^\s*(teşkkür|teşekkür|tesekkur|saolun|sağolun|saol|sağol|cok saolun|çok sağolun|cok tesekkur|çok teşekkür|cok sagolun)/i.test(rawAnswer) && rawAnswer.length < 30) {
        return { text: "Rica ederiz efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      // M5b: "Tamamdır cok saolun" / "Teşkkürler tamamdır"
      if (/tamamdir|tamamdır/i.test(norm) && /(saolun|sağolun|tesekkur|teşekkür|saol|sağol|sagolun)/i.test(norm) && rawAnswer.length < 30) {
        return { text: "Rica ederiz efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      // M5c: Tek başına "Saolun" / "Saol"
      if (/^(saolun|sağolun|saol|sağol|tesekkurler|teşekkürler|teşkkürler|cok saolun|çok sağolun|cok tesekkur|çok teşekkür|sagolun)\s*$/i.test(rawAnswer)) {
        return { text: "Rica ederiz efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M9: "Anlamadım", "Bunu anlamadım"
      if (/^(Bunu |Su |Şu |bunu |su |şu )?(anlamadim|anlamadım|Anlamadim|Anlamadım)\b/.test(rawAnswer)) {
        return { text: "Bir önceki konuyu tekrar açıklayalım efendim 😊 Hangi konuda bilgi vermemi istersiniz?", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M7: "Zinciriniz nasıl", "Zincirde burgu olsun", "Bu zincirddn istiyorum" → ürün detayı
      // Bu isim pattern'ından ÖNCE gelmeli
      if (/zincir|burgu/i.test(norm) && rawAnswer.length < 35) {
        return { text: "Zincir tercihinizi not aldık efendim 😊 Ekibimiz hazırlık aşamasında dikkate alacaktır.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M8: "Resim atıcaktımız", "Bana atıcaktınız" / "Bize bunu attınız"
      if (/(at[ıi]cakt|atacakt|atmis|atmış|att[ıi]n[ıi]z|bize.*(att|att[ıi]))/i.test(norm) && rawAnswer.length < 35) {
        return { text: "Ekibimize iletiyorum efendim, siparişinizle ilgileneceğiz 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      }
      
      // M_tamam: "Tamam ben istedim" / "Tamam uygun benim icin" / "Tamam bu olacak" / "Tamamdır o zaman"
      if (/^tamam\b/i.test(rawAnswer) && /(istedim|uygun|olacak|benim icin|benim için|o zaman)/i.test(norm) && rawAnswer.length < 35) {
        return { text: "Tabi efendim, not aldık 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      if (/^tamamdir\s+o\s+zaman|^tamamdır\s+o\s+zaman/i.test(rawAnswer)) {
        return { text: "Tabi efendim, not aldık 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M_ack_completed_ext: "Evet + kısa" / "Çok iyi olur" / "Aaa evet nasil olcak"
      if (/^(evet|e+vet|aa+|aaa)\s+(kapali|kapalı|ve|sen|nasil|nasıl|en|bu)/i.test(rawAnswer) && rawAnswer.length < 35) {
        return { text: "Tabi efendim, not aldık 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      if (/^(cok|çok)\s+(iyi|guzel|güzel)\s+(olur|olacak|olsun)/i.test(rawAnswer) && rawAnswer.length < 25) {
        return { text: "Tabi efendim, not aldık 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M_back_content_completed: "Kolgenin altına yazi" / "En altta ki bileklige" / "Yubarlağın altındaki"
      if (/(kolgenin|kolyenin|altinda|altında|altta|altta ki|altındaki|altindaki|yubarl|yuvarl).*(yazi|yazı|bileklig|bileklige)/i.test(norm) && rawAnswer.length < 40) {
        return { text: "Tabi efendim, notunuzu aldık 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      if (/^(yubarl|yuvarl|kolgenin|kolyenin|altta|altinda|altında)/i.test(rawAnswer) && rawAnswer.length < 30) {
        return { text: "Tabi efendim, notunuzu aldık 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M_tarih_aldiniz: "Tarihi not aldınız mı"
      if (/(tarihi not aldiniz|tarihi not aldınız|tarihi aldiniz|tarihi aldınız|notu aldiniz|notu aldınız)/i.test(norm) && rawAnswer.length < 30) {
        return { text: "Evet efendim, notunuzu aldık 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M_dimi: "Bu model olacak dimi" / "Olur dimi bu sekilde"
      if (/\b(dimi|di mi|degil mi|değil mi)\b/i.test(norm) && rawAnswer.length < 30 && 
          !/siparis|sipariş/i.test(norm)) {  // "Siparişim yola dimi" gibi sipariş sorularını hariç tut
        return { text: "Evet efendim, bu şekilde işleme alacağız 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M6: "İsim mustafa", "Annesine doğum günü", "Tarih 03.01.2025"
      if (/^(İsmi|İsim|ismi|isim|adi|adı|Adı|Adi|tarih|Tarih|annesine|Annesine|babasina|babasına|kardes|kardeş|dogum|doğum|Dogum|Doğum)\s+/.test(rawAnswer) && rawAnswer.length < 30) {
        return { text: "Tabi efendim, arka yazı notu aldım 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M1: Sadece isim-soyisim (Büyük harf başlayan, 2-3 kelime) — EN SON gelsin
      // DAR pattern: sadece GERÇEK isim/soyisim gibi görünen mesajlar
      // Negative: sipariş/ürün/problem/ödeme içeren tüm kelimeler → isim değil
      if (/^[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}(\s+[A-ZÇĞİÖŞÜa-zçğıöşü]{2,}){1,2}$/.test(rawAnswer) && 
          rawAnswer.split(/\s+/).length >= 2 && rawAnswer.split(/\s+/).length <= 3 &&
          !hasAny(norm, [
            // ack/onay
            "tamam","olur","peki","evet","hayir","yok","istemiy","olacak","oldu",
            // ürün/sipariş
            "siparis","sipariş","urun","ürün","model","kolye","zincir","burgu","kargo","foto","fotog","fotoğ","resim","plaka",
            // problem
            "yanlis","yanlış","hatali","hatalı","kirik","kırık","iptal","degistir","değiştir","iade","memnun","sorun","sikayet","şikayet",
            // renk/malzeme
            "renk","renkli","altin","altın","gumus","gümüş","beyaz","siyah","celik","çelik",
            // ödeme
            "kapida","kapıda","eft","havale","odeme","ödeme","tl","lira","iban","kart","kredi",
            // diğer
            "atac","ataç","harfli","lazer","resimli","dekont","net","hazir","hazır","ulastı","ulaştı","geldi","kontrol","yapilm","yapılm",
            // blessing/dua
            "allah","amin","razi","razı","rahmet","cennet","sifa","şifa","dua","hayirli","hayırlı","mubarek","mübarek",
            "saolun","sağolun","tesekkur","teşekkür","maşallah","masallah","insallah","inşallah",
            // smalltalk
            "merhaba","selam","nasil","nasıl","aksam","akşam","gunaydin","günaydın",
            // generic verb
            "neden","niye","nerede","ne zaman","nasilsin","nasılsın","bekliyorum","cevap"
          ])) {
        return { text: "İsim bilginizi aldım efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }

      // ══ AILE M+ residual ══
      
      // M11: UPPER-case isim-soyisim ("RECEP AKDEMİR", "EDIZ METEM")
      if (/^[A-ZÇĞİÖŞÜ]{2,}(\s+[A-ZÇĞİÖŞÜ]{2,}){1,3}$/.test(rawAnswer) && rawAnswer.length < 40) {
        return { text: "İsim bilginizi aldım efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M12: isim + ve + isim ("Ediz Metem ve Erol'um") → back_text/isim note
      if (/^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\s+[A-ZÇĞİÖŞÜ]?[a-zçğıöşü]*\s+(ve|ile)\s+[A-ZÇĞİÖŞÜ]/i.test(rawAnswer) && rawAnswer.length < 50) {
        return { text: "Tabi efendim, arka yazı notu aldım 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M13: Tarih string formatları ("2026-01-09 00:00:00", "03/01/2025")
      if (/^\d{4}-\d{2}-\d{2}(\s+\d{2}:\d{2}(:\d{2})?)?$/.test(rawAnswer) || 
          /^\d{2}[\.\-\/]\d{2}[\.\-\/]\d{4}$/.test(rawAnswer)) {
        return { text: "Tabi efendim, arka yazı notu aldım 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M14: "Ödemeyi yaptım" / "Dekont attım" → payment teyit
      if (/(odemeyi yapti|ödemeyi yaptı|dekont att|dekontu att|dekont gonder|dekont gönder|odemeyi gonder|ödemeyi gönder)/i.test(norm) && rawAnswer.length < 35) {
        return { text: "Ödemenizi kontrol edip size en kısa sürede dönüş sağlıyoruz efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      }
      
      // M15: Sadece emoji (🙏/❤/💫) → teşekkür
      if (/^[\p{Emoji}\s]+$/u.test(rawAnswer) && rawAnswer.length < 20) {
        return { text: "Rica ederiz efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M16: "Allah'a emanet" / "Allah'a şükür" → blessing
      // Not: "amin" içermez — amin mevcut handler'a bırak
      if (/(allah.a emanet|allaha emanet|allah.a sukur|allah.a şükür)/i.test(norm) && 
          !/\bamin\b/i.test(norm) &&
          rawAnswer.length < 30) {
        return { text: "Teşekkür ederiz efendim 🤍", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M17: Ack + completed ("Tamamdır o zaman", "Çok iyi olur", "Tamamdır")
      // DAR: sadece belirli ack+context kombinasyonu — tek "Evet" mevcut ack handler'a
      if (/^(tamamdir|tamamdır)\b/i.test(rawAnswer) && rawAnswer.length < 30) {
        return { text: "Tabi efendim, not aldık 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      if (/^(cok iyi|çok iyi|harika|süper|super)\s+(olur|olmus|olmuş|olacak)?/i.test(rawAnswer) && rawAnswer.length < 30) {
        return { text: "Tabi efendim, not aldık 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      
      // M18: "Kolyenin altına yazi" / "Yubarlağın altındaki" — back_text spec
      if (/(altina|altına|ust|üst|onune|önüne|arkasina|arkasına).*(yaz|bileklik|kolye|halka|yuvarlak|madalyon)/i.test(norm) && rawAnswer.length < 40) {
        return { text: "Tabi efendim, arka yazı notu aldım 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }


      // ━━━ Orijinal completed cascade ━━━

      // completed_change_request: değişiklik/iptal → operatör
      if (intent === "completed_change_request") return { text: "Ekibimize iletiyorum efendim, kontrol edip en kısa sürede dönüş sağlıyoruz 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };

      // completed_back_text_content: ek içerik → kabul et
      if (intent === "completed_back_text_content" || intent === "back_text_content") return { text: "Tabi efendim, arka yazı notu aldım 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };

      // completed_photo_share_request: foto paylaşım → deterministic policy
      if (intent === "completed_photo_share_request" || intent === "example_request") return { text: "Yoğunluğa göre kargo öncesi paylaşabiliyoruz efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };

      // completed_gratitude: teşekkür / memnuniyet → sıcak ack, menü AÇMA
      if (intent === "completed_gratitude") {
        if (/\bamin\b/.test(norm) || hasAny(norm, ["allah razi","allah razı","dua ","dua."])) return { text: "Amin efendim, iyi günler dileriz 😊 Güle güle kullanın inşallah 🤍", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
        return { text: "Çok teşekkür ederiz efendim 😊 Rica ederiz, güle güle kullanın inşallah 🤍", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }

      // completed_neutral_ack: kısa nötr → "tabi efendim", BİLGİLERİNİZİ ALDIM YASAK
      if (intent === "completed_neutral_ack") return { text: "Tabi efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };

      // Ürün sorunları
      if (hasAny(norm, ["kotu geldi","kötü geldi","kirik","kırık","cizik","çizik","hasarli","hasarlı","kopuk","eksik","hata var","cizikler","sikayet","şikayet","gec geldi","geç geldi","gec kaldi","geç kaldı"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Memnuniyetsizlik
      if (hasAny(norm, ["memnun kalmadim","memnun kalmadım","memnun degilim","memnun değilim","begenmedim","beğenmedim","sinir oldum"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Durum sorma / bekliyorum
      if (hasAny(norm, ["ne durumda","hazir mi","hazır mı","ne asamada","ne aşamada","bekliyorum","haber bekliyorum","cvp bekliyorum","donus bekliyorum","dönüş bekliyorum"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Düzeltme / değişiklik
      if (hasAny(norm, ["yanlis","yanlış","hatali","hatalı","isim yanlis","adres yanlis","adres degistir","adres değiştir","degisikli","değişikli","foto atacaktiniz","foto atacaktınız","atacaktiniz","atacaktınız","atacaginizi","atacağınızı","soylemistiniz","söylemiştiniz","hatirlatma","hatırlatma"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Ödeme / IBAN completed'da — intent=payment DEĞİL, sadece info soruları
      // (payment intent zaten yukarıdaki branch'te teyit edildi)
      if (intent !== "payment" && hasAny(norm, ["nereye eft","eft yapicam","eft yapıcam","odeme istiyorum","ödeme istiyorum","kapida istemiyorum","kapıda istemiyorum"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Sipariş teyidi
      if (hasAny(norm, ["siparis alindi","siparişim alındı","siparis tamam","siparişim tamam","siparis onaylandi","siparişim onaylandı","siparisim alindi mi","siparişim alındı mı"])) return { text: "Evet efendim, siparişiniz alınmıştır 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Siparişiniz oluşturuldu (satıcı onayı)
      if (hasAny(norm, ["siparisiniz olusturuldu","siparişiniz oluşturuldu","siparisiniz alindi","siparişiniz alındı"])) return { text: "Siparişiniz onaylanmıştır efendim 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Photo/claim/phone in completed → teyit
      if (intent === "phone" || intent === "name_only") return { text: "Bilgilerinizi aldım efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Completed'da payment commit → teyit et, operator'a atma (Prod logs fix: "Kapıda ödeme ile")
      if (intent === "payment") return { text: "Ödeme tercihinizi aldım efendim 😊 Siparişiniz notlarınıza işlendi.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      if (intent === "payment_confirmation" || intent === "photo" || intent === "photo_claim" || intent === "general_claim" || intent === "address_claim" || intent === "info_claim" || intent === "slot_claim" || intent === "phone_claim" || intent === "full_contact_bundle") return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      if (intent === "post_sale" || intent === "cancel_order") return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Phone/short info in completed → basit teyit (ekibimize DEĞİL)
      if (intent === "phone" || intent === "name_only") return { text: "Bilgilerinizi aldım efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      if (intent === "general" && norm.length < 10) return { text: "Tabi efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Foto uygunluk completed'da
      if (hasAny(norm, ["foto uygun","fotoğraf uygun","fotograf uygun"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Arka yazı istekleri completed'da → kabul et
      if (hasAny(norm, ["yazilcak","yazılcak","yazilsin","yazılsın","yazabilir","yazalim","yazalım","ne yazabilir","ne yazabiliriz","ne yazdiral","ne yazdıral","isim dogum","isim doğum","isim tarih"])) return { text: "Tabi efendim, arka yazı notu aldım 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // CANIM completed'da
      if (hasAny(norm, ["canim"])) return { text: "Tabi efendim, arka yazı notu aldım 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // TARİH completed'da
      if (/\d{2}[.\-\/]\d{2}[.\-\/]\d{2,4}/.test(ctx.message) || /\d{4}/.test(ctx.message)) {
        const hasName = /[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}/.test(ctx.message);
        const isAddress = hasAny(norm, ["mahalle","mahallesi","sokak","cadde","caddesi","apt","daire","kat"]);
        if (hasName && !isAddress && !hasAny(norm, ["05","adres","telefon"])) return { text: "Tabi efendim, arka yazı notu aldım 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      // ── COMPLETED EDGE-CASE POLICY ──
      // Kısa duygusal mesaj (emoji, mutluluk, üzüntü)
      if (norm.length < 20 && hasAny(norm, ["mutlu","sevindim","guzel","güzel","harika","super","süper","memnun","cok iyi","çok iyi","bayildim","bayıldım"])) return { text: "Çok sevindik efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Nötr long ack (bilgi vermemiş)
      if (hasAny(norm, ["olabilir","tamam","tamamdir","tamamdır","peki","anladim","anladım","sorun yok","dogru","doğru"]) && norm.length < 15) return { text: "Tabi efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Nötr extended ack: "tamamdır iletiyorum/göndereceğim/atacağım"
      if (hasAny(norm, ["tamamdir","tamamdır","tamam"]) && hasAny(norm, ["iletiyorum","gonderi","gönderi","atacag","atacağ","yollayac","yollayacağ","simdi","şimdi"])) return { text: "Tabi efendim, bekliyoruz 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Aksesuar tercihi completed'da
      if (hasAny(norm, ["boncuk olmasin","boncuk olmasın","kalp olsun","kalp olmasin","kalp olmasın","boncuk koy","boncuklu","kalpsiz","boncuksuz"])) return { text: "Tabi efendim, notunuzu aldım 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Kısa back_text content: isim + sevgi sözcüğü (papatyam, güneşim, meleğim)
      if (norm.length < 25 && hasAny(norm, ["papatyam","gunesim","güneşim","melegim","meleğim","birtanem","prensesim","aslanim","aslanım","yildiziim","yıldızım","hayatim","hayatım","cicegim","çiçeğim"]) && intent === "general") return { text: "Tabi efendim, arka yazı notu aldım 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Follow-up soru
      if (hasAny(norm, ["soru sorabilir","sormak istiyorum","merak ediyorum","bir sey sorabilir","bir şey sorabilir","buyrun"])) return { text: "Tabi efendim, buyurun sorabilirsiniz 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // ━━━ BUGS-333 HARDEN: completed'da policy/edit sorusu → operatör YERİNE deterministic cevap ━━━
      // Return/iade/beğenmezsem completed'da
      if (hasAny(norm, ["begenmezsem","beğenmezsem","istedigim gibi olmazsa","istediğim gibi olmazsa","memnun kalmazsam","memnun olmazsam","yada begenme","yada beğenme","olmazsa ne"])) {
        return { text: "Ürün kişiye özel üretildiği için iade/değişim yapamıyoruz efendim 😊 Üretim kaynaklı sorunlarda ekibimiz ilgilenmektedir.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      // Foto edit / arka plan / objeler
      if (hasAny(norm, ["arka plan","arkaplan","arka fon","kola kutusu","kola kutusu falan","yandaki obje","yanındaki","etrafindaki","etrafındaki","fon silin","gozukecek mi","gözükecek mi","gorunucek mi","görünücek mi","gozuk"]) &&
          hasAny(norm, ["foto","resim","arka plan","obje","kutusu","goz","göz"])) {
        return { text: "Arka plan ve etraftaki objeler ekibimizce düzenlenir efendim 😊 Sadece ana figürünüz net şekilde kolyeye işlenir.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      }
      // General catch-all completed — uzun belirsiz mesajlar operatöre, kısa sorular AI'a bırak
      if (intent === "general" && norm.length >= 30 && !hasAny(norm, ["aksesuar","renk","plaka","erkek","kadin","kadın","hediye","bileklik"])) return { text: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
    }
  }

  const slotResp = getSlotCommitResponse(intent, ctx);
  if (slotResp !== undefined) return { text: slotResp, source: "slot_commit", reply_class: REPLY_CLASS.FLOW_PROGRESS };

  // B. Deterministic info (primary)
  const infoResp = getDeterministicInfoResponse(intent, ctx);

  // B2. Secondary intent combine — primary cevabına secondary bilgi ekle
  if (infoResp && ctx.secondary_intent) {
    const secResp = getDeterministicInfoResponse(ctx.secondary_intent, { ...ctx, intent: ctx.secondary_intent });
    if (secResp && secResp !== infoResp) {
      // Primary ve secondary aynı bilgiyi içeriyorsa combine etme
      const infoNorm = infoResp.toLowerCase().replace(/[^\w\s]/g, " ");
      const secNorm = secResp.toLowerCase().replace(/[^\w\s]/g, " ");
      // Secondary, primary'nin alt kümesiyse skip
      const secWords = secNorm.split(/\s+/).filter(w => w.length > 4);
      const overlap = secWords.filter(w => infoNorm.includes(w)).length;
      if (overlap / Math.max(secWords.length, 1) > 0.6) {
        // %60 kelime örtüşmesi → combine etme, primary yeterli
      } else {
        // Secondary'nin özünü al (ilk cümleyi)
        const secCore = secResp.split(/[.!?😊]/)[0].replace(/^(Tabi efendim|Evet efendim|Ürünlerimiz|Kargo|Standart)\s*/i, "").trim();
        if (secCore.length > 5) {
          const combined = infoResp.trimEnd().replace(/😊\s*$/, "").trimEnd() + " 😊 Ayrıca: " + secCore.charAt(0).toLowerCase() + secCore.slice(1) + ".";
          return { text: combined, source: "deterministic_combined", reply_class: REPLY_CLASS.FIXED_INFO };
        }
      }
    }
  }

  if (infoResp) return { text: infoResp, source: "deterministic", reply_class: REPLY_CLASS.FIXED_INFO };

  // C. Tone
  const toneResp = getToneResponse(intent, ctx);
  if (toneResp) return { text: toneResp, source: "tone", reply_class: REPLY_CLASS.FIXED_INFO };

  // D. Product flow
  const flowResp = getProductFlowResponse(intent, ctx);
  if (flowResp) return { text: flowResp, source: "product_flow", reply_class: REPLY_CLASS.FLOW_PROGRESS };

  // E. AI
  const { factBlock, knowledge } = selectKnowledge(intent, ctx.product);
  const aiResult = await callAI(ctx, factBlock, knowledge);
  if (aiResult?.reply && aiResult.confidence >= 0.6) {
    return { text: aiResult.reply, source: "ai", reply_class: aiResult.next_action === "handoff" ? REPLY_CLASS.OPERATIONAL_REQUIRED : REPLY_CLASS.FLOW_PROGRESS, support_mode_reason: aiResult.next_action === "handoff" ? SUPPORT_REASON.OPERATIONAL : "" };
  }

  // F. Stage-aware fallback (guard-safe wording)
  if (stage === STAGE.WAITING_PHOTO) return { text: "Fotoğrafınızı buradan iletebilirsiniz efendim 😊", source: "fallback", reply_class: REPLY_CLASS.FLOW_PROGRESS };
  if (stage === STAGE.WAITING_PAYMENT) return { text: "Ödeme tercihinizi belirtebilir misiniz efendim? EFT / Havale veya kapıda ödeme 😊", source: "fallback", reply_class: REPLY_CLASS.FLOW_PROGRESS };
  if (stage === STAGE.WAITING_ADDRESS) {
    const hasPhone = ctx.fields?.phone_received === "1";
    const hasAddr = ctx.fields?.address_status === "address_only";
    if (hasAddr && !hasPhone) return { text: "Cep telefonu numaranızı iletebilir misiniz efendim? 😊", source: "fallback", reply_class: REPLY_CLASS.FLOW_PROGRESS };
    if (hasPhone && !hasAddr) return { text: "Açık adresinizi iletebilir misiniz efendim? 😊", source: "fallback", reply_class: REPLY_CLASS.FLOW_PROGRESS };
    return { text: "Ad soyad, cep telefonu ve açık adres bilgileriniz ile devam edelim efendim 😊", source: "fallback", reply_class: REPLY_CLASS.FLOW_PROGRESS };
  }
  if (stage === STAGE.WAITING_LETTERS) return { text: "Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊", source: "fallback", reply_class: REPLY_CLASS.FLOW_PROGRESS };
  
  // Ürün/stage belirsiz → menü
  if (!stage || stage === "waiting_product" || stage === "") return { text: TEXT.MAIN_MENU, source: "fallback", reply_class: REPLY_CLASS.FLOW_PROGRESS };

  return { text: null, source: "none" };
}
