// side-questions.js — Yan soru cevapları (her stage'de çalışır)
import { INTENT, PRODUCT, STAGE, REPLY_CLASS, SUPPORT_REASON, TEXT } from "../constants.js";
import { hasAny } from "../normalize.js";

const R = (t, c = REPLY_CLASS.FIXED_INFO, r = SUPPORT_REASON.NONE) => ({ text: t, reply_class: c, support_mode_reason: r });
const SEL = (t) => R(t, REPLY_CLASS.SELLER_REQUIRED, SUPPORT_REASON.SELLER);
const OP = (t) => R(t, REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_REASON.OPERATIONAL);

export function sideQuestions(ctx, state) {
  const { intent, norm } = ctx;
  const ap = state.product || ctx.fields.ilgilenilen_urun || ctx.fields.user_product || ctx.product || "";

  if (intent === INTENT.LOCATION) return R("Eminönü İstanbul'dayız 😊");
  if (intent === INTENT.SHIPPING_PRICE) return R("Kargo ücreti fiyata dahildir efendim 😊 Ekstra bir ücret ödemezsiniz.");

  if (intent === INTENT.SHIPPING) {
    if (hasAny(norm, ["kargom nerede","takip no","takip numarasi","takip numarası","kargoya verildi mi","yola cikti mi","yola çıktı mı","kargom gelmedi","urun gelmedi","ürün gelmedi","kargo numarasi","kargo numarası"])) return OP(TEXT.FALLBACK);
    if (hasAny(norm, ["hangi kargo","kargo firmasi","kargo şirketi"])) return R("PTT Kargo ile gönderim yapıyoruz efendim 😊");
    if (hasAny(norm, ["kargo parasi","kargo parasI","kargo var mi"])) return R("Kargo ücreti fiyata dahildir efendim 😊 Ekstra bir ücret ödemezsiniz.");
    if (hasAny(norm, ["ptt kargo","ptt ile","ptt gonderim","ptt gönderi"])) return R("Evet efendim, PTT Kargo ile gönderim yapıyoruz 😊");
    return R(TEXT.SHIPPING_TIME);
  }

  if (intent === INTENT.MATERIAL) {
    if (hasAny(norm, ["alerji","alerjim","alerjik"])) return R("Paslanmaz çelikten üretilmektedir efendim 😊 Kararma, solma yapmaz. Alerji konusunda da risk oluşturacak bir malzeme kullanmıyoruz.");
    if (hasAny(norm, ["gumus mu","gümüş mü","gumusmu","gümüşmü","gumus mudur","gümüş müdür","kolye gumus","kolye gümüş","urun gumus","ürün gümüş"])) return R("Ürünlerimiz paslanmaz çelikten üretilmektedir efendim 😊 Gümüş kaplama modelimiz de bulunmaktadır. Kararma, solma yapmaz.");
    return R("Evet efendim, paslanmaz çelikten üretiliyor 😊 Kararma, solma veya paslanma yapmaz.");
  }

  if (intent === INTENT.TRUST) {
    if (hasAny(norm, ["kaplama","kaplamasi atar","kaplaması atar"])) return R("Kaplama atmaz efendim 😊 Günlük kullanımda rahatlıkla kullanabilirsiniz.");
    if (hasAny(norm, ["paslanmaz demi","paslanmaz demı","paslanmaz mi","paslanmaz mı"])) return R("Evet efendim, paslanmaz çelik 😊 Kararma, solma veya paslanma yapmaz.");
    if (hasAny(norm, ["kararma","kararir","solar","solma","paslan","karar ma","soluyor","renk bozul","karariyormu","kararıyormu","kararirmi","kararırmi","karaa","renk atma","renk atar","renk atması","silinme","resim silin","rengi gidiyor","rengi gider","rengi aciyor","rengi açıyor"])) return R("Kararma, solma veya paslanma yapmaz efendim 😊 Günlük kullanımda rahatlıkla kullanabilirsiniz.");
    if (hasAny(norm, ["suya dayanikli","dusta","duşta","deniz","ter "])) return R("Evet efendim, suya dayanıklıdır 😊 Duş, deniz, ter gibi durumlarda rahatlıkla kullanabilirsiniz.");
    if (norm.includes("garanti")) return R("Kararma, solma veya kaplama kaynaklı bir durumda destek sağlıyoruz efendim 😊");
    return R("Güvenle sipariş verebilirsiniz efendim 😊");
  }

  // Back side info
  if ([INTENT.BACK_TEXT_INFO, INTENT.BACK_PHOTO_INFO, INTENT.BACK_PHOTO_PRICE].includes(intent)) {
    if (ap === PRODUCT.ATAC) return R("Bu özellik resimli lazer kolye için geçerlidir efendim 😊");
    if (intent === INTENT.BACK_PHOTO_PRICE) return R("Ek ücret olmuyor efendim 😊");
    if (intent === INTENT.BACK_PHOTO_INFO) {
      let extra = "";
      if (state.conversation_stage === STAGE.WAITING_PAYMENT) extra = " Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?";
      else if (state.conversation_stage === STAGE.WAITING_ADDRESS) extra = " Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim?";
      return R("Evet efendim 😊 Ön yüze bir fotoğraf, arka yüze de ikinci bir fotoğraf ekleyebiliyoruz. Ek ücret de olmuyor." + extra);
    }
    if (intent === INTENT.BACK_TEXT_INFO) return R("Evet efendim 😊 Resimli lazer kolyede arka yüzüne yazı veya istenirse ikinci bir fotoğraf eklenebiliyor.");
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
    if (ap === PRODUCT.LAZER) {
      if (hasAny(norm, ["zincir boyu","zincir uzunlugu","zincir uzunluğu","uzunlugu ne kadar","uzunluğu ne kadar","uzunlugu nekadar","uzunluğu nekadar","zincir kac cm","zincir kaç cm","zincir kisalir","zincir kısalır","boyu ne kadar","kac santim","kaç santım","kac santım","kolye boyu","kac cm","kaç cm","zincir ne kadar","zincirin boyu","zincirin uzunlugu","zincirin uzunluğu"])) return R("Zincir fiyata dahildir, uzunluğu standart olarak 60 cm'dir efendim 😊");
      return SEL("Zincir modeliyle ilgili detay için ekibimize görsel üzerinden net bilgi verelim 😊");
    }
    if (ap === PRODUCT.ATAC) {
      if (hasAny(norm, ["zincir boyu","zincir uzunlugu","zincir uzunluğu","uzunlugu ne kadar","uzunluğu ne kadar","zincir kac cm","zincir kaç cm","boyu ne kadar","zincir ne kadar"])) return R("Standart zincir 50 cm'dir, fiyata dahildir efendim 😊");
      return R("Bu üründe tek zincir modeli kullanılıyor efendim 😊");
    }
    if (hasAny(norm, ["zincir boyu","zincir uzunlugu","zincir uzunluğu","uzunlugu ne kadar","uzunluğu ne kadar","zincir kac cm","zincir kaç cm","boyu ne kadar","boyutu nedir","kac cm","kaç cm","kac santim","kaç santım"])) return R("Resimli lazer kolyede zincir 60 cm, ataç kolyede 50 cm'dir efendim 😊");
    if (hasAny(norm, ["zincir ne kadar"])) return R("Zincir fiyata dahildir efendim 😊 Resimli lazer kolyede 60 cm, ataç kolyede 50 cm standart zincir gelir.");
    return R("Resimli lazer kolyede zincir 60 cm, ataç kolyede 50 cm'dir efendim 😊");
  }

  // Post-sale
  if (intent === INTENT.POST_SALE) return OP("Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊");

  // New order
  if (intent === INTENT.NEW_ORDER) return SEL("Tabi efendim 😊 Yeni sipariş için ekibimiz size yardımcı olacaktır.");

  // Example
  if (intent === INTENT.EXAMPLE_REQUEST) return SEL("Tabi efendim, hemen atalım size örnekleri 😊");

  // Detail
  if (intent === INTENT.DETAIL_REQUEST) {
    if (state.conversation_stage === STAGE.WAITING_ADDRESS) return R("Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim? 😊", REPLY_CLASS.FLOW_PROGRESS);
    if (state.conversation_stage === STAGE.WAITING_PAYMENT) return R("Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊", REPLY_CLASS.FLOW_PROGRESS);
    if (!state.product) return { text: TEXT.MAIN_MENU, reply_class: REPLY_CLASS.MENU, support_mode_reason: "" };
    if (state.product === PRODUCT.LAZER) return { text: TEXT.LAZER_PRICE, reply_class: REPLY_CLASS.PRODUCT_ENTRY, support_mode_reason: "" };
    if (state.product === PRODUCT.ATAC) return { text: TEXT.ATAC_PRICE, reply_class: REPLY_CLASS.PRODUCT_ENTRY, support_mode_reason: "" };
  }

  // Back text (outside flow)
  if (intent === INTENT.BACK_TEXT && state.conversation_stage !== STAGE.WAITING_BACK_TEXT) {
    return R("Evet efendim 😊 Resimli lazer kolyede arka yüzüne yazı veya istenirse ikinci bir fotoğraf eklenebiliyor.");
  }
  if (intent === INTENT.PAYMENT_INFO) return R("Kapıda ödeme ile ürün elinize ulaştığında kurye ye nakit olarak ödeme yaparsınız efendim 😊 Kredi kartı geçerli değildir, sadece nakit.");
  if (intent === INTENT.PHOTO_SENT_CONFIRM) return R("Fotoğrafınız ulaştı efendim, ekibimiz kontrol edip dönüş sağlayacaktır 😊", REPLY_CLASS.FLOW_PROGRESS);

  return null;
}
