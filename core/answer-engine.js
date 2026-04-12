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
    if (photoMissing) return "Ödeme tercihinizi aldım efendim 😊 Fotoğraf iletildikten sonra siparişe devam edelim.";
    
    // Combo: payment + bilgi sorusu aynı mesajda
    let comboNote = "";
    if (hasAny(norm, ["kargo ucreti","kargo ücreti","kargo dahil","kargo var mi","kargo var mı"])) comboNote = "\n\nKargo ücretsizdir, fiyata dahildir 😊";
    else if (hasAny(norm, ["kararir","kararır","kararma","solma","paslan","bozulur"])) comboNote = "\n\nÜrünlerimiz 14 ayar altın kaplama paslanmaz çeliktir, kararma solma yapmaz 😊";
    else if (hasAny(norm, ["ne zaman","kac gun","kaç gün","ne kadar surede","ne kadar sürede"])) comboNote = "\n\nKargo İstanbul içi 1-2, diğer iller 2-3 iş günü 😊";
    
    // Adres/tel zaten alınmışsa → sipariş teyidi
    const addrDone = ctx.fields?.address_status === "received";
    const phoneDone = ctx.fields?.phone_received === "1";
    
    if (ctx.extracted?.payment === "eft_havale") {
      if (addrDone) return `EFT / havale ile ilerleyebiliriz efendim 😊\n${TEXT.EFT_INFO}${comboNote}`;
      return `EFT / havale ile ilerleyebiliriz efendim 😊\n${TEXT.EFT_INFO}\n\nÖdeme sonrası ad soyad, cep telefonu ve açık adresinizi iletebilirsiniz.${comboNote}`;
    }
    // Kapıda + kartla → nakit uyarısı
    if (hasAny(norm, ["kart","kartla","kredi"])) return `Kapıda ödeme ile ilerleyebiliriz efendim 😊 Kapıda ödemede sadece nakit geçerlidir.${addrDone ? "" : " Ad soyad, cep telefonu ve açık adresinizi iletebilirsiniz."}${comboNote}`;
    if (addrDone) return `Kapıda ödeme ile ilerleyebiliriz efendim 😊 Sadece nakit geçerlidir.${comboNote}`;
    if (phoneDone) return `Kapıda ödeme ile ilerleyebiliriz efendim 😊 Sadece nakit geçerlidir. Açık adres bilgileriniz ile devam edelim.${comboNote}`;
    return `Kapıda ödeme ile ilerleyebiliriz efendim 😊 Sadece nakit geçerlidir. Ad soyad, cep telefonu ve açık adresinizi iletebilirsiniz.${comboNote}`;
  }
  if (intent === "payment_confirmation") {
    const isComp = ctx.fields?.order_status === "completed" || ctx.fields?.siparis_alindi === "1";
    if (isComp) return "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊";
    return "Teşekkür ederiz efendim 😊 Ekibimiz ödemenizi kontrol edip size dönüş sağlayacaktır.";
  }
  if (intent === "back_text") return null;
  if (intent === "back_text_skip") {
    const st = ctx.fields?.conversation_stage || "";
    if (st === STAGE.WAITING_ADDRESS) {
      const hasPhone = ctx.fields?.phone_received === "1";
      const hasAddr = ctx.fields?.address_status === "address_only";
      if (hasAddr && !hasPhone) return "Tabi efendim 😊 Cep telefonu numaranızı iletebilir misiniz?";
      if (hasPhone && !hasAddr) return "Tabi efendim 😊 Açık adresinizi iletebilir misiniz?";
    }
    return "Tabi efendim 😊";
  }
  if (intent === "back_photo_upload") {
    const st = ctx.fields?.conversation_stage || "";
    if (st === STAGE.WAITING_PAYMENT) return "Arka fotoğrafı aldım efendim 😊 Ödeme tercihinizi belirtebilir misiniz? EFT / Havale veya kapıda ödeme.";
    return null;
  }
  if (["phone","address","name_only","letters","cancel_order","system_message"].includes(intent)) return null;
  return undefined;
}

// ═══ B. DETERMINISTIC INFO ═══
function getDeterministicInfoResponse(intent, ctx) {
  const { product: p, norm, message } = ctx;
  const stage = ctx.fields?.conversation_stage || "";

  // ── NORM-BASED BARGAIN (intent ne olursa olsun, indirim kelimesi varsa sabit) ──
  if (hasAny(norm, ["indirimli olur","indirimli olsun","biraz indirimli"])) return "Fiyatlarımız sabit olarak belirlenmiştir efendim 😊";

  // ── TRUST FOLLOW-UP (last_intent trust + süre/yıl sorusu) ──
  if (ctx.fields?.last_intent === "trust" && hasAny(norm, ["yil mi","yıl mı","kac yil","kaç yıl","kac sene","kaç sene","sure","süre","mesela"])) return "Garanti veriyoruz efendim 😊 Kararma, solma veya kaplama kaynaklı bir durumda ürün değişimi sağlıyoruz. Kesin bir süre sınırı bulunmamaktadır.";

  // ── PRICE ──
  if (intent === "price") {
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
    if (hasAny(norm, ["kargom","siparisim","siparişim","gelmedi","ulasmadi","ulaşmadı","verildi mi","yola cikti"])) return "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊";
    if (hasAny(norm, ["aras kargo","aras ile","mng kargo","surat kargo","sürat kargo","farkli kargo","farklı kargo"])) return "Gönderimlerimiz PTT Kargo ile yapılmaktadır efendim 😊 Farklı kargo seçeneği için +25 TL ek ücret ile Aras Kargo tercih edilebilir.";
    if (hasAny(norm, ["hangi kargo","kargo firmasi","kargo firması","ptt mi","ptt ile"])) return "Gönderimlerimiz PTT Kargo ile yapılmaktadır efendim 😊";
    if (hasAny(norm, ["takip numarasi","takip numarası","takip no","numara rica","numarasi rica","numarası rica"])) return "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊";
    if (hasAny(norm, ["takip","nasil takip","nasıl takip"])) return "Kargoya verildiğinde size otomatik SMS gelecektir efendim 😊 PTT Kargo takip numarası ile takibinizi yapabilirsiniz.";
    if (hasAny(norm, ["istanbul disi","istanbul dışı","sehir disi","şehir dışı"])) return "İstanbul dışı gönderimler genellikle 2-3 iş günü içinde teslim edilmektedir efendim 😊 Kargoya verildiğinde SMS gelecektir.";
    if (hasAny(norm, ["ne zaman","kac gun","kaç gün","suresi","süresi","kac gunde","kaç günde","ne kadar surede","ne kadar sürede","ulasir","ulaşır"])) return "İstanbul içi 1-2, diğer iller 2-3 iş günü içinde teslim edilmektedir efendim 😊 Kargoya verildiğinde SMS gelecektir.";
    if (hasAny(norm, ["sms","mesaj gelir","mesaj geliyor","bilgi gelir","haber verir","bildirim"])) return "Kargoya verildiğinde size otomatik SMS gelecektir efendim 😊";
    if (hasAny(norm, ["nereye","turkiye","türkiye","her yere","yurt disi","yurt dışı"])) return "Evet efendim, Türkiye'nin her yerine kargo ile gönderim yapıyoruz 😊";
    return "Kargo ücretsiz, PTT ile gönderim yapılmaktadır efendim 😊 İstanbul içi 1-2, diğer iller 2-3 iş günü. Kargoya verildiğinde SMS gelecektir.";
  }

  // ── CHAIN ──
  if (intent === "chain_question") {
    // Plaka ölçüsü sorusu chain'e düşebilir
    if (hasAny(norm, ["plaka","olcu","ölçü","yuvarlak","boyut"]) && !hasAny(norm, ["zincir"])) return "Plaka boyutu yaklaşık 3 cm'dir efendim 😊";
    if (p === "lazer") {
      if (hasAny(norm, ["uzat","uzatma","uzatilir","uzatılır","daha uzun"])) return "Lazer kolyede zincir 60 cm standarttır, uzatma bulunmamaktadır efendim 😊";
      if (hasAny(norm, ["kisalt","kısalt","kisa zincir","kısa zincir"])) return "Lazer kolyede zincir 60 cm standarttır, kısaltma yapılmamaktadır efendim 😊";
      if (hasAny(norm, ["degisiyor","değişiyor","baska model","başka model","farkli model","farklı model","seceneg","seçenek","cesit","çeşit"])) return "Tek model standart zincirimiz bulunmaktadır efendim 😊";
      if (hasAny(norm, ["dahil","dahil mi"])) return "Evet efendim, zincir fiyata dahildir 😊";
      if (hasAny(norm, ["kac cm","kaç cm","boyu","uzunlugu","uzunluğu","santim"])) return "Standart zincirimiz 60 cm'dir efendim 😊";
      return "Tek model standart zincirimiz 60 cm'dir efendim 😊";
    }
    if (p === "atac") {
      if (hasAny(norm, ["uzat","uzatma"])) return "Standart zincir 50 cm'dir efendim 😊 İstenirse 70 cm'ye kadar uzatılabilir, uzatma +50 TL.";
      if (hasAny(norm, ["baska model","başka model","farkli","farklı","italyan","figaro"])) return "Bu üründe tek model standart zincir kullanılıyor efendim 😊";
      if (hasAny(norm, ["kac cm","kaç cm","boyu","uzunlugu","uzunluğu"])) return "Standart zincir 50 cm'dir efendim 😊";
      return "Bu üründe tek model standart zincir kullanılıyor efendim 😊 50 cm.";
    }
    return "Resimli lazer kolyede standart zincir 60 cm, harfli ataç kolyede 50 cm'dir efendim 😊";
  }

  // ── TRUST ──
  if (intent === "trust") {
    if (hasAny(norm, ["kararma","kararir","kararır","karariyormu","kararıyormu","karaa","karar ma","solar","solma","paslan","renk atma","renk atar","silinme","silinir","kaplama atar","kaplama atma","bozulur"])) return "14 ayar altın kaplama paslanmaz çeliktir, kararma solma paslanma yapmaz efendim 😊 Güvenle kullanabilirsiniz.";
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
    if (hasAny(norm, ["renk","gold","altin kaplama","altın kaplama","mat celik","mat çelik"])) return "Altın kaplama (gold), gümüş kaplama ve mat çelik seçeneğimiz mevcut efendim 😊";
    return "Ürünlerimiz 14 ayar altın kaplama paslanmaz çeliktir efendim 😊 Gerçek altın değildir, kaplamadır. Kararma, solma yapmaz.";
  }

  // ── LOCATION ──
  if (intent === "location") return "İstanbul Eminönü'ndeyiz efendim 😊 Satışlarımız online üzerinden yapılmaktadır, Türkiye'nin her yerine kargo ile gönderim yapıyoruz.";
  // ── STORE PICKUP ──
  if (intent === "store_pickup") return "İstanbul Eminönü'ndeki şubemizden teslim alabilirsiniz efendim 😊";

  // ── PAYMENT INFO ──
  if (intent === "payment_info_question") {
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
    return "Tabi efendim, arka yüze yazı veya fotoğraf ekleyebiliyoruz 😊 Ücretsizdir.";
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
    const origProduct = ctx.fields?.ilgilenilen_urun || ctx.product;
    if (origProduct === "atac") return "Bu modelde arka yüze yazı yapılmıyor efendim 😊 Resimli lazer kolyede arka yüze yazı eklenebilmektedir.";
    if (hasAny(norm, ["ne yazilir","ne yazılır","genelde","ornek","örnek","ne yazabiliriz","neler yaziliyor","neler yazılıyor"])) return "Arka yüze genelde isim, tarih, kısa bir not veya dua yazılıyor efendim 😊 Ücretsizdir.";
    if (hasAny(norm, ["dua","isim yazilir","isim yazılır","tarih yazilir","tarih yazılır"])) return "Tabi efendim, arka yüze yazılabilir 😊 Ücretsizdir.";
    if (hasAny(norm, ["ucret","ücret","ekstra"])) return "Arka yüze yazı veya fotoğraf eklemek ücretsizdir efendim 😊";
    if (hasAny(norm, ["olur mu","oluyor mu","yapiliyor mu","yapılıyor mu","var mi","var mı"])) return "Tabi efendim, arka yüze yazı olur 😊 Ücretsizdir.";
    return "Tabi efendim, arka yüze yazı veya fotoğraf ekleyebiliyoruz 😊 Ücretsizdir.";
  }
  if (intent === "back_text_examples") return "Genelde isim, tarih, kısa bir not veya dua yazılıyor efendim 😊";
  if (intent === "back_photo_info") {
    const origProduct = ctx.fields?.ilgilenilen_urun || ctx.product;
    if (origProduct === "atac") return "Bu modelde fotoğraf kullanılmıyor efendim 😊 Resimli lazer kolyede ön ve arka yüze fotoğraf eklenebilmektedir.";
    if (hasAny(norm, ["onlu arkali","önlü arkalı","arkali onlu","arkalı önlü","iki farkli foto","iki farklı foto"])) return "Tabi efendim, birden fazla kişi olabilir 😊 Ön yüze bir fotoğraf, arka yüze başka bir fotoğraf yapabiliyoruz. Aynı fiyattan.";
    // Birleştirme sorusu (tek yüz, iki ayrı resim)
    if (hasAny(norm, ["birlestir","birleştir","iki ayri resim","iki ayrı resim","iki resim gonder","iki resim gönder"])) return "Tabi efendim, fotoğrafları birleştirebiliyoruz 😊 En fazla 3 fotoğraf tek tasarımda kullanılabilir.";
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
    if (hasAny(norm, ["ayni kare","aynı kare","tek kare","yan yana","birlikte foto"])) return "Evet efendim, fotoğrafları birleştirebiliyoruz 😊 Tek karede olması en idealidir.";
    if (hasAny(norm, ["ikili resim","ikili foto"])) {
      if (hasAny(norm, ["fiyat","ucret","ücret","ne kadar"])) return `Fiyat farkı yoktur efendim 😊 EFT ${PRICE.LAZER_EFT} TL, kapıda ${PRICE.LAZER_KAPIDA} TL. Birden fazla fotoğraf birleştirebiliyoruz.`;
      return "Evet efendim, birden fazla fotoğraf birleştirebiliyoruz 😊";
    }
    if (hasAny(norm, ["iki foto","2 foto","iki resim","2 resim","kac foto","kaç foto","kac resim","kaç resim","en fazla kac","en fazla kaç","kac resim koyabil","kaç resim koyabil","kac fotograf koyabil","kaç fotoğraf koyabil","kac resim koyabili","kaç resim koyabili","3 lu yapiy","3 lü yapıy","3lu yapiy","3lü yapıy"])) return "En fazla 3 fotoğraf koyabiliyoruz efendim 😊";
    if (hasAny(norm, ["birlestir","birleştir","birlestirme","birleştirme","3 farkli foto","3 farklı foto","fotoğrafları birleştir"])) return "Tabi efendim, fotoğrafları birleştirebiliyoruz 😊 En fazla 3 fotoğraf tek tasarımda kullanılabilir.";
    if (hasAny(norm, ["3 kisi","3 kişi","uc kisi","üç kişi","5 kisi","5 kişi","aile foto","3 kisilik","3 kişilik"])) return "Evet efendim, birden fazla kişi olabilir 😊 Kaç kişi olursa olsun basıyoruz.";
    if (hasAny(norm, ["tek yuze","tek yüze"])) return "Evet efendim, tek yüze birden fazla kişi basabiliyoruz 😊";
    if (hasAny(norm, ["arkali onlu","arkalı önlü","iki cocugum","iki çocuğum"])) return "Evet efendim, birden fazla kişi olabilir 😊 Arkalı önlü de yapabiliyoruz, aynı fiyattan.";
    return "Siz gönderin efendim, kontrol edip bilgi verelim 😊";
  }
  if (intent === "photo_suitability_question") return "Gönderin efendim, kontrol edelim 😊";

  // ── FOTO PAYLAŞIM (example_request'ten ÖNCE — "görsel atar mısınız" çakışması) ──
  if (hasAny(norm, ["hazir olunca","hazır olunca","bitince paylas","bitince paylaş","gondermeden once paylas","göndermeden önce paylaş","hazir oldugunda","hazır olduğunda","atar misiniz foto","atar mısınız foto","foto atar misiniz","foto atar mısınız","paylasir misiniz","paylaşır mısınız","yapilmis halini","yapılmış halini","gorsel atar","görsel atar","bitince gorsel","bitince görsel","atiyomusunuz","atıyomusunuz","atiyormusunuz","atıyormusunuz"])) return "Tüm ürünlerimiz kalite kontrolden geçmektedir efendim 😊 Kargo sonrası talep ederseniz görselini paylaşabiliyoruz.";

  // ── EXAMPLE ──
  if (intent === "example_request") return "Tabi efendim, buradan inceleyebilirsiniz 😊\n\n📸 Örnek çalışmalar: https://www.instagram.com/stories/highlights/18084971893996144/\n📦 Sizden gelenler: https://www.instagram.com/stories/highlights/18079575341155587/";

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
  if (hasAny(norm, ["kolye ucu","sadece ucu","kendi zincirime"])) return "Ürünlerimiz zinciri ile birlikte sunulmaktadır efendim 😊";
  if (hasAny(norm, ["2 plaka","iki plaka","3 plaka","birden fazla plaka"])) return "Bir zincirde tek plaka olarak hazırlanıyor efendim 😊 İsterseniz iki ayrı kolye olarak hazırlayabiliriz.";
  if (hasAny(norm, ["aksesuar","pembe kalp","siyah kalp","nazar boncugu","nazar boncuğu","kalp var mi","kalp var mı"])) return "Pembe kalp, siyah kalp ve nazar boncuğumuz mevcut efendim 😊 Aksesuar fiyata dahildir.";
  if (hasAny(norm, ["bileklik","bilezik"])) {
    if (hasAny(norm, ["degil","değil","yerine","bileklik istiyorum","bileklik yapiy","bileklik yapıy"])) return "Şu anda sadece kolye modellerimiz bulunmaktadır efendim 😊";
    if (ctx.product === "atac" || hasAny(norm, ["hediye","gelmedi","kac cm","kaç cm"])) return "Harfli ataç kolyede aynı model bileklik hediye olarak gönderilmektedir efendim 😊 Bileklik uzunluğu 20 cm'dir.";
    return "Harfli ataç kolyede hediye bileklik gönderilmektedir efendim 😊";
  }
  if (hasAny(norm, ["yapim asama","yapım aşama","nasil yapiliyor","nasıl yapılıyor","surec nasil","süreç nasıl"])) return "Fotoğrafınızı alıyoruz, lazer kazıma yöntemiyle kolyeye işliyoruz ve kargo ile gönderiyoruz efendim 😊";
  if (hasAny(norm, ["yapay zeka","robot mu","bot mu","ai mi"]) && hasAny(norm, ["yapiy","yapıy","ile mi"])) return "Hayır efendim, lazer baskı yöntemiyle üretiyoruz 😊 Mesaj süreçlerinde yapay zekâ desteği kullanıyoruz ama ürünler el emeği ile hazırlanmaktadır.";
  if (hasAny(norm, ["renk secenek","renk seceneg","ne renk var","kac renk","kaç renk","renkler"]) && !hasAny(norm, ["renk atma","solma","kararma"])) return "Altın kaplama (gold), gümüş kaplama ve mat çelik seçeneğimiz mevcut efendim 😊";
  // Renk tercihi notu
  if (hasAny(norm, ["gold olsun","gold renk","altin kaplama olsun","altın kaplama olsun"])) return "Tabi efendim, altın kaplama göndereceğiz, not aldım 😊";
  if (hasAny(norm, ["gumus olsun","gümüş olsun","gumus istiyorum","gümüş istiyorum","gumus kaplama olsun","gümüş kaplama olsun"])) return "Tabi efendim, gümüş kaplama göndereceğiz 😊 Ürünlerimiz paslanmaz çelikten üretilmektedir.";
  if (hasAny(norm, ["mat celik olsun","mat çelik olsun"])) return "Tabi efendim, mat çelik göndereceğiz, not aldım 😊";
  if (hasAny(norm, ["sms gelir","mesaj gelir","bilgi gelir","haber verir","bildirim gelir","takip numarasi","takip numarası"])) return "Kargoya verildiğinde size otomatik SMS gelecektir efendim 😊";
  if (hasAny(norm, ["erkek icin","erkek için","babam icin","babam için","esim icin","eşim için","oglum icin","oğlum için"])) {
    if (hasAny(norm, ["zincir","cm","boyu"])) { const c = p === "atac" ? "50" : "60"; return `Tabi efendim, erkek için de uygundur 😊 Zincir ${c} cm standarttır.`; }
    return "Tabi efendim, erkek için de uygundur 😊";
  }
  if (hasAny(norm, ["olcu","ölçü","boyut","3 cm","plaka olcusu","plaka ölçüsü","kac cm plaka","kaç cm plaka"])) return "Plaka boyutu yaklaşık 3 cm'dir efendim 😊";
  if (hasAny(norm, ["fatura","fis","fiş"])) return "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";
  if (hasAny(norm, ["fotograflar silinir","fotoğraflar silinir","fotograf paylas","fotoğraf paylaş","gizlilik"])) return "Fotoğraflarınız yalnızca siparişiniz için kullanılır ve sipariş tamamlandıktan sonra silinir efendim 😊";
  if (hasAny(norm, ["donus yapacagim","dönüş yapacağım","sonra yazacagim","sonra yazacağım","dusuneyim","düşüneyim","dusunuyorum","düşünüyorum","tekrar donecegim","tekrar döneceğim","donus yapicam","dönüş yapıcam","birkac gun icinde","birkaç gün içinde","dusunup","düşünüp","dusunup size","düşünüp size","dusunup gonder","düşünüp gönder"])) return "Tabi efendim, bekliyoruz 😊 Ne zaman isterseniz yazabilirsiniz.";
  // Dönecektiniz ama — complaint/hatırlatma
  if (hasAny(norm, ["donecektiniz","dönecektiniz","donmediniz","dönmediniz","donus yapmadi","dönüş yapmadı"])) return "Özür dileriz efendim 😊 Hemen kontrol edip dönüş sağlıyoruz.";
  // Gümüş olsun/yapabiliyor musunuz → material
  if (hasAny(norm, ["gumus olsun","gümüş olsun","gumus istiyorum","gümüş istiyorum","gumus yapabiliyor","gümüş yapabiliyor","gumus var mi","gümüş var mı","gumus seceneg","gümüş seçenek"])) return "Ürünlerimiz paslanmaz çelikten üretilmektedir efendim 😊 Gümüş kaplama seçeneğimiz bulunmaktadır. Kararma, solma yapmaz.";
  // Her yere kargo
  if (hasAny(norm, ["her yere kargo","her yere gonderi","her yere gönderim","her ile","turkiyenin her yeri","türkiyenin her yeri"])) return "Evet efendim, Türkiye'nin her yerine kargo ile gönderim yapıyoruz 😊";
  if (hasAny(norm, ["seffaf kargo","şeffaf kargo","ozel kargo","özel kargo","aras kargo","mng kargo","surat kargo","sürat kargo"])) return "Gönderimlerimiz PTT Kargo ile yapılmaktadır efendim 😊 Farklı kargo seçeneği için +25 TL ek ücret ile Aras Kargo tercih edilebilir.";
  if (hasAny(norm, ["italyan zincir","halat zincir","burgulu zincir"])) { 
    const c = p === "atac" ? "50" : "60"; 
    const suffix = stage === STAGE.WAITING_LETTERS ? " Yapılmasını istediğiniz harfleri yazabilirsiniz 😊" : "";
    return `Tek model standart zincirimiz bulunmaktadır efendim 😊 ${c} cm.${suffix}`; 
  }
  if (hasAny(norm, ["siparis nasil","sipariş nasıl","nasil siparis","nasıl sipariş","siparis verme","sipariş verme","siparis vermek","sipariş vermek","nasil siparis verebilirim","nasıl sipariş verebilirim"])) {
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
  if (intent === "address_claim") return "Bilgilerinizi aldım efendim 😊 Eksik bilgi varsa ekibimiz sizinle iletişime geçecektir.";
  if (intent === "info_claim") return "Bilgilerinizi aldım efendim 😊";
  if (intent === "general_claim") return "Tabi efendim, bilgilerinizi aldım 😊";

  // ── SMALLTALK ──
  if (intent === "smalltalk") {
    const isFirstMessage = !stage || stage === "waiting_product";
    if (hasAny(norm, ["merhaba","selam","slm","mrb","merhabalar"])) return isFirstMessage ? TEXT.MAIN_MENU : "Merhaba efendim 😊 Size nasıl yardımcı olabilirim?";
    if (hasAny(norm, ["tesekkur","teşekkür","tsk","tşk","tesekurler","teşekkürler","tesekur","teşekür"])) return isFirstMessage ? `Rica ederiz efendim 😊 Hangi model ile ilgileniyorsunuz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye` : "Rica ederiz efendim 😊";
    if (hasAny(norm, ["basiniz sagolsun","başınız sağolsun","basiniz sag olsun","başınız sağ olsun"])) return "Teşekkür ederiz efendim 🤍";
    if (hasAny(norm, ["sagol","sağol","sag ol","sağ ol","sagolun","sağolun"])) return "Rica ederiz efendim 😊";
    if (hasAny(norm, ["iyi gunler","iyi günler"])) return "Size de iyi günler efendim 😊";
    if (hasAny(norm, ["iyi aksamlar","iyi akşamlar"])) return "İyi akşamlar efendim 😊";
    if (hasAny(norm, ["iyi geceler"])) return "İyi geceler efendim 😊";
    if (hasAny(norm, ["gunaydin","günaydın"])) return "Günaydın efendim 😊";
    if (hasAny(norm, ["kolay gelsin"])) return "Teşekkür ederiz efendim 😊";
    if (hasAny(norm, ["allah razi olsun","allah razı olsun"])) return "Cümlemizden efendim, teşekkür ederiz 🤍";
    if (hasAny(norm, ["insallah","inşallah"])) return "Amin efendim 🤍";
    if (hasAny(norm, ["amin"])) return "Amin efendim 🤍";
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
    if (stage === STAGE.WAITING_PHOTO) return "Fotoğrafınızı buradan iletebilirsiniz efendim 😊";
    if (stage === STAGE.WAITING_PAYMENT) return "Ödeme tercihinizi belirtebilir misiniz efendim? EFT / Havale veya kapıda ödeme 😊";
    if (stage === STAGE.WAITING_ADDRESS) {
      const hasPhone = ctx.fields?.phone_received === "1";
      const hasAddr = ctx.fields?.address_status === "address_only";
      if (hasAddr && !hasPhone) return "Cep telefonu numaranızı iletebilir misiniz efendim? 😊";
      if (hasPhone && !hasAddr) return "Açık adresinizi iletebilir misiniz efendim? 😊";
      return "Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊";
    }
    if (stage === STAGE.WAITING_LETTERS) return "Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊";
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
    if (p === "lazer") return TEXT.LAZER_PRICE;
    if (p === "atac") return TEXT.ATAC_PRICE;
    return TEXT.MAIN_MENU;
  }
  if (intent === "post_sale") return "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊";
  if (intent === "new_order") return TEXT.MAIN_MENU;
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
  const systemPrompt = `Sen Yudum Jewels Instagram satış asistanısın. SADECE JSON döndür.\nKURALLAR:\n1. Bilgi uydurma. 2. Max 2 cümle, sonuna 😊. 3. Yan soru → sadece onu cevapla. 4. Lazer zincir 60cm. 5. Fiyat: Lazer EFT 599, kapıda 649. Ataç EFT 499, kapıda 549. 6. Kapıda SADECE NAKİT. 7. WhatsApp müşteri sormadıkça verme. 8. İndirim yapma.\n${factBlock ? `KONU:\n${factBlock}` : ""}`;
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
    // Bekliyorum/tamam/peki → sakin teyit
    if (hasAny(norm, ["bekliyorum","tamam","peki","anladim","anladım","tamamdir","tamamdır"])) return { text: "En kısa sürede dönüş sağlanacaktır efendim 😊", source: "human_support", reply_class: REPLY_CLASS.FIXED_INFO };
    // Diğer → operatöre
    return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "human_support", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
  }

  // COMPLETED ORDER — en yüksek öncelik
  if (isCompleted) {
    const { norm } = ctx;
    // Completed'da normal akışa düşmesi gereken intentler
    const passThrough = ["smalltalk","ack","sensitivity","frustration","new_order","order_start","bargain","chain_question","material_question","trust","example_request","back_text_info","back_photo_info","detail_request","location","shipping_price","shipping","price"];
    
    // Sipariş teyidi — kargo takipten ÖNCE
    if (hasAny(norm, ["siparis alindi","siparişim alındı","siparis tamam","siparişim tamam","siparisim alindi","siparişim alındı"])) return { text: "Evet efendim, siparişiniz alınmıştır 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
    
    // Durum sorusu / hatırlatma — intent ne olursa olsun (passthrough override)
    if (hasAny(norm, ["hazirlandi mi","hazırlandı mı","hazirlandi","hazırlandı","yapildi mi","yapıldı mı","ne durumda","hazir mi","hazır mı","ne asamada","ne aşamada","haber bekliyorum","cvp bekliyorum","donus bekliyorum","dönüş bekliyorum","kolyeyi yapinca","kolyeyi yapınca","neden donmuyorsunuz","neden dönmüyorsunuz","neden donus","neden dönüş","cevap vermiyorsunuz","atacaktiniz","atacaktınız","atacaginizi","atacağınızı","soylemistiniz","söylemiştiniz","hatirlatma","hatırlatma","siparis verdim","sipariş verdim","siparis vermistim","sipariş vermiştim","urun geldi","ürün geldi","siparisimle alakasi","siparişimle alakası"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
    // "bekliyorum" tek başına (fiyat/bilgi bekliyorum hariç) → basit teyit
    if (hasAny(norm, ["bekliyorum"]) && !hasAny(norm, ["fiyat","bilgi"])) return { text: "Siparişiniz alınmıştır efendim 😊 En kısa sürede hazırlanıp kargoya verilecektir.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };

    // Kişisel kargo takibi her zaman operatöre (passthrough override)
    if (hasAny(norm, ["kargom","gelmedi","ulasmadi","ulaşmadı","nerede kargo","verildi mi","dagitim","dağıtım","kargoya verdiniz","kargoya verildi","herkesin kargosu","gec geldi","geç geldi","gec kaldi","geç kaldı"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
    
    // Foto paylaşım completed'da → koşullu cevap (operatör DEĞİL)
    if (hasAny(norm, ["paylasirsaniz","paylaşırsanız","bitince paylas","bitince paylaş","paylasiyor musunuz","paylaşıyor musunuz","paylasiyormusunuz","paylaşıyormusunuz","siparis sonrasi foto","sipariş sonrası foto","gorsel atar","görsel atar","foto atar","paylasir misiniz","paylaşır mısınız"])) return { text: "Tüm ürünlerimiz kalite kontrolden geçmektedir efendim 😊 Kargo sonrası talep ederseniz görselini paylaşabiliyoruz.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
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
      // Ürün sorunları
      if (hasAny(norm, ["kotu geldi","kötü geldi","kirik","kırık","cizik","çizik","hasarli","hasarlı","kopuk","eksik","hata var","cizikler","sikayet","şikayet","gec geldi","geç geldi","gec kaldi","geç kaldı"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Memnuniyetsizlik
      if (hasAny(norm, ["memnun kalmadim","memnun kalmadım","memnun degilim","memnun değilim","begenmedim","beğenmedim","sinir oldum"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Durum sorma / bekliyorum
      if (hasAny(norm, ["ne durumda","hazir mi","hazır mı","ne asamada","ne aşamada","bekliyorum","haber bekliyorum","cvp bekliyorum","donus bekliyorum","dönüş bekliyorum"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Düzeltme / değişiklik
      if (hasAny(norm, ["yanlis","yanlış","hatali","hatalı","isim yanlis","adres yanlis","adres degistir","adres değiştir","degisikli","değişikli","foto atacaktiniz","foto atacaktınız","atacaktiniz","atacaktınız","atacaginizi","atacağınızı","soylemistiniz","söylemiştiniz","hatirlatma","hatırlatma"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Ödeme / IBAN completed'da
      if (hasAny(norm, ["nereye eft","eft yapicam","eft yapıcam","odeme istiyorum","ödeme istiyorum","kapida odeme","kapıda ödeme","kapida istemiyorum","kapıda istemiyorum"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Sipariş teyidi
      if (hasAny(norm, ["siparis alindi","siparişim alındı","siparis tamam","siparişim tamam","siparis onaylandi","siparişim onaylandı","siparisim alindi mi","siparişim alındı mı"])) return { text: "Evet efendim, siparişiniz alınmıştır 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Siparişiniz oluşturuldu (satıcı onayı)
      if (hasAny(norm, ["siparisiniz olusturuldu","siparişiniz oluşturuldu","siparisiniz alindi","siparişiniz alındı"])) return { text: "Siparişiniz onaylanmıştır efendim 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Photo/claim/phone in completed → teyit
      if (intent === "phone" || intent === "name_only") return { text: "Bilgilerinizi aldım efendim 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      if (intent === "payment_confirmation" || intent === "photo" || intent === "photo_claim" || intent === "general_claim" || intent === "address_claim" || intent === "info_claim") return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      if (intent === "post_sale" || intent === "cancel_order") return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
      // Phone/short info in completed → basit teyit (ekibimize DEĞİL)
      if (intent === "phone" || intent === "name_only" || (intent === "general" && norm.length < 10)) return { text: "Tabi efendim, bilgilerinizi aldım 😊", source: "completed", reply_class: REPLY_CLASS.FIXED_INFO };
      // Foto uygunluk completed'da
      if (hasAny(norm, ["foto uygun","fotoğraf uygun","fotograf uygun"])) return { text: "Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊", source: "completed", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
    }
  }

  const slotResp = getSlotCommitResponse(intent, ctx);
  if (slotResp !== undefined) return { text: slotResp, source: "slot_commit", reply_class: REPLY_CLASS.FLOW_PROGRESS };

  // B. Deterministic info
  const infoResp = getDeterministicInfoResponse(intent, ctx);
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
    return { text: "Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊", source: "fallback", reply_class: REPLY_CLASS.FLOW_PROGRESS };
  }
  if (stage === STAGE.WAITING_LETTERS) return { text: "Yapılmasını istediğiniz harfleri yazabilirsiniz efendim 😊", source: "fallback", reply_class: REPLY_CLASS.FLOW_PROGRESS };
  
  // Ürün/stage belirsiz → menü
  if (!stage || stage === "waiting_product" || stage === "") return { text: TEXT.MAIN_MENU, source: "fallback", reply_class: REPLY_CLASS.FLOW_PROGRESS };

  return { text: null, source: "none" };
}
