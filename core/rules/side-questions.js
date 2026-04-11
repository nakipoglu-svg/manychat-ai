// side-questions.js — Yan soru cevapları (her stage'de çalışır)
import { INTENT, PRODUCT, STAGE, REPLY_CLASS, SUPPORT_REASON, TEXT } from "../constants.js";
import { hasAny } from "../normalize.js";

const R = (t, c = REPLY_CLASS.FIXED_INFO, r = SUPPORT_REASON.NONE) => ({ text: t, reply_class: c, support_mode_reason: r });
const SEL = (t) => R(t, REPLY_CLASS.SELLER_REQUIRED, SUPPORT_REASON.SELLER);
const OP = (t) => R(t, REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_REASON.OPERATIONAL);

export function sideQuestions(ctx, state) {
  const { intent, norm } = ctx;
  const ap = state.product || ctx.fields.ilgilenilen_urun || ctx.fields.user_product || ctx.product || "";

  if (intent === INTENT.LOCATION) return R("İstanbul Eminönü'ndeyiz efendim 😊 Satışlarımız online üzerinden yapılmaktadır, Türkiye'nin her yerine kargo ile gönderim yapıyoruz.");
  if (intent === INTENT.SHIPPING_PRICE) return R("Kargo ücreti fiyata dahildir efendim 😊 Ekstra bir ücret ödemezsiniz.");

  if (intent === INTENT.SHIPPING) {
    if (hasAny(norm, ["kargom nerede","takip no","takip numarasi","takip numarası","kargoya verildi mi","yola cikti mi","yola çıktı mı","kargom gelmedi","urun gelmedi","ürün gelmedi","kargo numarasi","kargo numarası"])) return OP(TEXT.FALLBACK);
    if (hasAny(norm, ["kargo takip","nasil takip","nasıl takip","takip edebilir"])) return R("Ürününüz kargoya verildiğinde size SMS ile takip numarası gönderilecektir efendim 😊 PTT'nin resmi sitesinden takip edebilirsiniz.");
    if (hasAny(norm, ["hangi kargo","kargo firmasi","kargo şirketi"])) return R("PTT Kargo ile gönderim yapıyoruz efendim 😊");
    if (hasAny(norm, ["aras kargo","aras ile","aras gonder","farkli kargo","farklı kargo","baska kargo","başka kargo"])) {
      if (hasAny(norm, ["kapida","kapıda"])) return R("Kapıda ödeme siparişlerinde yalnızca PTT Kargo ile gönderim yapılmaktadır efendim 😊 Aras Kargo seçeneği EFT/Havale siparişlerinde geçerlidir.");
      return R("EFT / Havale ile ödeme yaparsanız Aras Kargo ile gönderebiliriz, +25 TL fark ile efendim 😊 Kapıda ödeme siparişlerinde yalnızca PTT Kargo geçerlidir.");
    }
    if (hasAny(norm, ["ptt yavas","ptt yavaş","kargo yavas","kargo yavaş"])) return R("PTT Kargo ile gönderim yapıyoruz efendim 😊 İstanbul içi 1-2, İstanbul dışı 2-3 iş günü içinde teslim edilir.");
    if (hasAny(norm, ["kargo parasi","kargo parasI","kargo var mi"])) return R("Kargo ücretsizdir efendim 😊 Ekstra bir ücret ödemezsiniz.");
    if (hasAny(norm, ["ptt kargo","ptt ile","ptt gonderim","ptt gönderi"])) return R("Evet efendim, PTT Kargo ile gönderim yapıyoruz 😊 Kargoya verildiğinde size otomatik SMS gelecektir.");
    if (hasAny(norm, ["sms","mesaj gelir mi","mesaj gelirmi","bilgi gelir mi","bilgi gelirmi","haber verir mi"])) return R("Ürününüz kargoya verildiğinde size SMS gelecektir, ayrıca şubenize ulaştığında da bir SMS daha alacaksınız efendim 😊");
    return R(TEXT.SHIPPING_TIME);
  }

  if (intent === INTENT.MATERIAL) {
    if (hasAny(norm, ["alerji","alerjim","alerjik"])) return R("14 ayar altın kaplama paslanmaz çeliktir efendim 😊 Kararma, solma yapmaz. Alerji konusunda da risk oluşturacak bir malzeme kullanmıyoruz.");
    if (hasAny(norm, ["gumus mu","gümüş mü","gumusmu","gümüşmü","gumus mudur","gümüş müdür","kolye gumus","kolye gümüş","urun gumus","ürün gümüş"])) return R("Ürünlerimiz paslanmaz çelikten üretilmektedir efendim 😊 Altın kaplama ve gümüş kaplama modelimiz bulunmaktadır. Kararma, solma yapmaz.");
    if (hasAny(norm, ["altin mi","altın mı","altinmi","altınmı"])) return R("14 ayar altın kaplama paslanmaz çeliktir efendim 😊 Kararma, solma yapmaz.");
    if (hasAny(norm, ["suya dayanikli","dusta","duşta","deniz","havuz"])) return R("Denizde, havuzda veya duşta gönül rahatlığıyla kullanabilirsiniz efendim 😊 Uzun ömürlü ve dayanıklıdır.");
    return R("14 ayar altın kaplama paslanmaz çeliktir efendim 😊 Kararma, solma yapmaz.");
  }

  if (intent === INTENT.TRUST) {
    if (hasAny(norm, ["kaplama","kaplamasi atar","kaplaması atar"])) return R("14 ayar altın kaplama çeliktir, kaplama atmaz efendim 😊 Günlük kullanımda rahatlıkla kullanabilirsiniz.");
    if (hasAny(norm, ["paslanmaz demi","paslanmaz demı","paslanmaz mi","paslanmaz mı"])) return R("Evet efendim, 14 ayar altın kaplama paslanmaz çeliktir 😊 Kararma, solma veya paslanma yapmaz.");
    if (hasAny(norm, ["kararma","kararir","solar","solma","paslan","karar ma","soluyor","renk bozul","karariyormu","kararıyormu","kararirmi","kararırmi","karaa","renk atma","renk atar","renk atması","silinme","resim silin","rengi gidiyor","rengi gider","rengi aciyor","rengi açıyor"])) return R("14 ayar altın kaplama çeliktir, kararma solma paslanma yapmaz efendim 😊 Günlük kullanımda rahatlıkla kullanabilirsiniz.");
    if (hasAny(norm, ["suya dayanikli","dusta","duşta","deniz","ter ","havuz"])) return R("Denizde, havuzda veya duşta gönül rahatlığıyla kullanabilirsiniz efendim 😊 Uzun ömürlü ve dayanıklıdır.");
    if (hasAny(norm, ["sure","süre","ne kadar sure","ne kadar süre","kac yil","kaç yıl","kac sene","kaç sene","yillik","yıllık","omur boyu","ömür boyu","mesela 1","mesela bir"])) return R("Garanti veriyoruz efendim 😊 Kararma, solma veya kaplama kaynaklı bir durumda ürün değişimi sağlıyoruz. Ömür boyu kullanılabilir.");
    if (norm.includes("garanti")) return R("Garanti veriyoruz efendim 😊 Kararma, solma veya kaplama kaynaklı bir durumda ürün değişimi sağlıyoruz.");
    return R("Güvenle sipariş verebilirsiniz efendim 😊");
  }

  // Back side info — müşteri açtığında cevapla, proaktif sunma
  if ([INTENT.BACK_TEXT_INFO, INTENT.BACK_PHOTO_INFO, INTENT.BACK_PHOTO_PRICE].includes(intent)) {
    if (ap === PRODUCT.ATAC) return R("Bu özellik resimli lazer kolye için geçerlidir efendim 😊");
    if (intent === INTENT.BACK_PHOTO_PRICE) return R("Ücret farkı olmadan yapılabiliyor efendim 😊");
    if (intent === INTENT.BACK_PHOTO_INFO) {
      return R("Evet efendim 😊 Arka tarafa da fotoğraf basabiliyoruz, ücret farkı olmadan yapılabiliyor. İsterseniz ikinci fotoğrafı da buradan iletebilirsiniz.");
    }
    if (intent === INTENT.BACK_TEXT_INFO) return R("Evet efendim 😊 Arka tarafa ücretsiz bir şekilde yazı ekleyebiliyoruz. İsterseniz ne yazılmasını istediğinizi buradan iletebilirsiniz.");
  }

  // Photo question
  if (intent === INTENT.PHOTO_QUESTION) {
    if (ap === PRODUCT.ATAC) return R("Ataç kolyede fotoğraf gerekmiyor efendim 😊 İsterseniz harfleri yazabilirsiniz.");
    if (ap === PRODUCT.LAZER) {
      // Vesikalık / fotoğraf türü sorusu
      if (hasAny(norm, ["vesikalik","vesikalık","selfie","ne tur","ne tür","ne cesit","ne çeşit","nasil bir fotograf","nasıl bir fotoğraf"])) {
        return R("Vesikalık olmasına gerek yok efendim 😊 İstediğiniz fotoğrafı buradan gönderebilirsiniz, ekibimiz kontrol edecektir.");
      }
      return R("Buradan direkt gönderebilirsiniz efendim 😊 Siz gönderin, biz hemen kontrol edelim.");
    }
    return null;
  }

  // Chain
  if (intent === INTENT.CHAIN) {
    if (hasAny(norm, ["boyutu ne kadar","plaka boyut","plaka kac cm","plaka olcu","plaka ölçü","plakanin olcu","plakanın ölçü","yuvarlak plaka","yuvarlak bolum","yuvarlak bölüm","yuvarlak kism","yuvarlak kısm","cerceve boyut","çerçeve boyut","madalyon boyut","olcusu nedir","ölçüsü nedir","olcusu ne","ölçüsü ne"])) return R("Ürün plaka boyutu 3 cm'dir efendim 😊");
    if (hasAny(norm, ["zincir dahil","zincir dayil"])) return R("Evet efendim, zincir dahildir 😊");
    if (hasAny(norm, ["kisalt","kısalt","kisalir","kısalır","kisaltma","kısaltma","kisa zincir","kısa zincir","kisa istiyorum","kısa istiyorum"])) return R("Tabi efendim, kısa zincir gönderelim 😊");
    if (hasAny(norm, ["uzat","uzatma","uzatilir","uzatılır","uzatabilir","70 cm","70cm","daha uzun"])) {
      if (ap === PRODUCT.ATAC) return R("Zinciri 70 cm'ye kadar uzatabiliyoruz efendim 😊 Uzatma için +50 TL ek ücret alınmaktadır.");
      return R("Lazer kolyede zincir uzatma bulunmamaktadır efendim 😊");
    }
    if (ap === PRODUCT.LAZER) {
      if (hasAny(norm, ["zincir boyu","zincir uzunlugu","zincir uzunluğu","uzunlugu ne kadar","uzunluğu ne kadar","uzunlugu nekadar","uzunluğu nekadar","zincir kac cm","zincir kaç cm","zincir kisalir","zincir kısalır","boyu ne kadar","kac santim","kaç santım","kac santım","kolye boyu","kac cm","kaç cm","zincir ne kadar","zincirin boyu","zincirin uzunlugu","zincirin uzunluğu"])) return R("Standart zincirimiz 60 cm'dir, fiyata dahildir efendim 😊");
      if (hasAny(norm, ["model","modeli","seceneg","seçenek","cesit","çeşit","ince","kalin","kalın","burgulu","halat"])) return R("Standart zincirimiz ile gönderiyoruz efendim 😊");
      return R("Standart zincirimiz ile gönderiyoruz efendim 😊");
    }
    if (ap === PRODUCT.ATAC) {
      if (hasAny(norm, ["zincir boyu","zincir uzunlugu","zincir uzunluğu","uzunlugu ne kadar","uzunluğu ne kadar","zincir kac cm","zincir kaç cm","boyu ne kadar","zincir ne kadar"])) return R("Standart zincir 50 cm'dir, fiyata dahildir efendim 😊");
      return R("Bu üründe tek zincir modeli kullanılıyor efendim 😊");
    }
    if (hasAny(norm, ["zincir boyu","zincir uzunlugu","zincir uzunluğu","uzunlugu ne kadar","uzunluğu ne kadar","zincir kac cm","zincir kaç cm","boyu ne kadar","boyutu nedir","kac cm","kaç cm","kac santim","kaç santım"])) return R("Resimli lazer kolyede zincir 60 cm, ataç kolyede 50 cm'dir efendim 😊");
    if (hasAny(norm, ["zincir ne kadar"])) return R("Zincir fiyata dahildir efendim 😊 Resimli lazer kolyede 60 cm, ataç kolyede 50 cm standart zincir gelir.");
    return R("Standart zincirimiz ile gönderiyoruz efendim 😊");
  }

  // Post-sale
  if (intent === INTENT.POST_SALE) return OP("Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊");

  // New order
  if (intent === INTENT.NEW_ORDER) return { text: "Tabi efendim 😊 Hangi model ile ilgileniyorsunuz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye", reply_class: REPLY_CLASS.MENU, support_mode_reason: "" };

  // Example
  if (intent === INTENT.EXAMPLE_REQUEST) return R("Örnek çalışmalarımızı buradan inceleyebilirsiniz efendim 😊\n\n📸 Örnek ürünler: instagram.com/stories/highlights/18391039714130558/\n📦 Sizden gelenler: instagram.com/stories/highlights/18079575341155587/");

  // Detail
  if (intent === INTENT.DETAIL_REQUEST) {
    if (state.conversation_stage === STAGE.WAITING_ADDRESS) return R("Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊", REPLY_CLASS.FLOW_PROGRESS);
    if (state.conversation_stage === STAGE.WAITING_PAYMENT) return R("Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊", REPLY_CLASS.FLOW_PROGRESS);
    if (!state.product) return { text: TEXT.MAIN_MENU, reply_class: REPLY_CLASS.MENU, support_mode_reason: "" };
    if (state.product === PRODUCT.LAZER) return { text: TEXT.LAZER_PRICE, reply_class: REPLY_CLASS.PRODUCT_ENTRY, support_mode_reason: "" };
    if (state.product === PRODUCT.ATAC) return { text: TEXT.ATAC_PRICE, reply_class: REPLY_CLASS.PRODUCT_ENTRY, support_mode_reason: "" };
  }

  // Back text (outside flow)
  if (intent === INTENT.BACK_TEXT && state.conversation_stage !== STAGE.WAITING_PAYMENT) {
    return R("Evet efendim 😊 Resimli lazer kolyede arka yüzüne yazı veya istenirse ikinci bir fotoğraf eklenebiliyor.");
  }
  if (intent === INTENT.PAYMENT_INFO) {
    if (hasAny(norm, ["iban","hesap numara","hesap bilgi"])) return R(`Tabi efendim 😊\n\n${TEXT.EFT_INFO}`);
    return R("Kapıda ödeme ile ürün elinize ulaştığında kurye ye nakit olarak ödeme yaparsınız efendim 😊 Kapıda ödemede sadece nakit geçerlidir, kredi kartı kullanılamamaktadır.");
  }
  if (intent === INTENT.PHOTO_SENT_CONFIRM) return R("Fotoğrafınız ulaştı efendim, ekibimiz kontrol edip dönüş sağlayacaktır 😊", REPLY_CLASS.FLOW_PROGRESS);

  // ═══ EK KONULAR (knowledge gap'lerden eklendi) ═══

  // İnternet sitesi sorusu
  if (hasAny(norm, ["internet site","web site","siteniz","sitenize"])) {
    if (hasAny(norm, ["acilmiyor","açılmıyor","erisil","erişil","hata","neden","niye"])) {
      return R("Şu an yapım aşamasındadır efendim, satışlarımızı Instagram üzerinden gerçekleştiriyoruz 😊");
    }
    return R("Satışlarımızı doğrudan Instagram üzerinden gerçekleştiriyoruz efendim 😊");
  }

  // Link ile ödeme
  if (hasAny(norm, ["link ile odeme","link ile ödeme","online odeme","online ödeme","link odeme","link ödeme"])) {
    return R("Link ile ödeme seçeneğimiz bulunmamaktadır efendim, EFT / havale veya kapıda ödeme seçeneklerimiz mevcuttur 😊");
  }

  // Kolye ucu ayrı satış
  if (hasAny(norm, ["sadece kolye ucu","kolye ucu ayri","kolye ucunu al","kendi zincirime","kolye ucu olarak"])) {
    return R("Ürünlerimiz zinciri ile birlikte sunulmaktadır efendim 😊");
  }

  // Elden teslim / mağazadan alma
  if (hasAny(norm, ["elden teslim","gelip al","gelip teslim","dukkan","dükkana gel","magazadan al","mağazadan al","kendim al","yerinden al"])) {
    if (!hasAny(norm, ["kargo","ptt"])) {
      return R("Siparişlerimiz kargo ile gönderilmektedir efendim, elden teslim bulunmamaktadır 😊");
    }
  }

  return null;
}
