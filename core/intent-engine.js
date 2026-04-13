// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTENT ENGINE v8.3 — Kapsamlı intent algılama
// Sıra: system → slot_commit → sensitivity → complaint → claim →
//       info (specific→generic) → product_flow → ack/smalltalk → back_text → general
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { KW, INTENT, STAGE, PRODUCT } from "./constants.js";
import { hasAny, looksLikePhotoUrl, extractPhone, looksLikeAddress, looksLikeName, extractLetters, parsePaymentFromMessage } from "./normalize.js";

export function detectIntent(ctx) {
  const { message, norm, product, stage, extracted } = ctx;
  const raw = String(message || "").trim();

  // ═══ 0. EMPTY / SYSTEM ═══
  if (!raw || raw.length <= 1) return "general";
  const backTextDone = ctx.fields?.back_text_status === "received" || ctx.fields?.back_text_status === "skipped";
  if (/^(liked a message|reacted)/.test(norm)) return "smalltalk";
  if (hasAny(norm, ["the message could not be displayed","api restrictions","dosya eki gonderdi","bir dosya eki gönderdi","started an audio call","missed an audio call","started a video chat","reacted to your message"])) return "system_message";

  // ═══ 1. SLOT COMMITS (highest priority) ═══
  if (looksLikePhotoUrl(message)) {
    // URL + "bu model" / referans → photo_reference, gerçek fotoğraf commit değil
    if (hasAny(norm, ["bu model olsun","bu modelden olsun","bundan olsun","bundan olacak"])) return "photo_reference";
    if (stage === STAGE.WAITING_PAYMENT) return "back_photo_upload";
    return "photo";
  }
  if (extracted.phone && stage === STAGE.WAITING_ADDRESS) return "phone";
  if (stage === STAGE.WAITING_ADDRESS && extracted.hasAddress) return "address";
  if (stage === STAGE.WAITING_ADDRESS && extracted.hasName && raw.length < 40) return "name_only";
  if (stage === STAGE.WAITING_LETTERS && extracted.letters) {
    // Smalltalk/complaint/sensitivity/info soruları w_letters'da letters olarak algılanmasın
    if (hasAny(norm, KW.smalltalk) || hasAny(norm, ["tesekkur","teşekkür","sagol","sağol","rica"])) return "smalltalk";
    if (hasAny(norm, ["iptal","vazgec","vazgeç"])) return "cancel_order";
    // Info soruları — keyword check
    if (hasAny(norm, KW.trust) || hasAny(norm, ["guvenilir","güvenilir","guven","güven","dolandirici","dolandırıcı","nasil guven","nasıl güven"])) return "trust";
    if (hasAny(norm, KW.location) || hasAny(norm, ["neredesiniz","nerede"])) return "location";
    if (hasAny(norm, KW.shipping) || hasAny(norm, KW.shipping_price) || hasAny(norm, ["kargo","seffaf","şeffaf"])) return "shipping";
    if (hasAny(norm, KW.chain) || hasAny(norm, ["italyan","halat","burgulu"])) return "chain_question";
    if (hasAny(norm, KW.material_question)) return "material_question";
    return "letters";
  }

  // Payment commit
  const paymentVerb = /seceyim|seçeyim|olsun|istiyorum|sectim|seçtim|seciyorum|seçiyorum|yapacagim|yapacağım|yapicam|yapıcam|yapayim|yapayım|yapalim|yapalım/.test(norm);
  // Payment confirmation (dekont, ödeme yaptım) — payment commit'ten ÖNCE
  if (hasAny(norm, ["dekont attim","dekont attım","dekont gonderdim","dekont gönderdim","eft attim","eft attım","eft gonderdim","eft gönderdim","havale gonderdim","havale gönderdim","havale attim","havale attım","odeme yaptim","ödeme yaptım","odemeyi yaptim","ödemeyi yaptım","odeme gonderdim","ödeme gönderdim","hesaba attim","hesaba attım","ekran goruntusu","ekran görüntüsü","dekont atayim","dekont atayım","ucreti attim","ücreti attım"])) return "payment_confirmation";
  // Payment commit: verb varsa her yerde, w_payment'ta verb olmadan da kabul et
  if (extracted.payment && (paymentVerb || stage === STAGE.WAITING_PAYMENT)) return "payment";

  // ═══ 2. SENSITIVITY ═══
  if (hasAny(norm, ["vefat","kaybettik","kaybettim","rahmetli","merhum","babami kaybettim","babamı kaybettim","annemi kaybettim","esimi kaybettim","eşimi kaybettim","vefat etti","annem vefat","babam vefat","hayatini kaybetti","hayatını kaybetti","olum yildonumu","ölüm yıldönümü"])) return "sensitivity";

  // ═══ 3. FRUSTRATION HARD STOP ═══
  if (hasAny(norm, ["otomatik mesaj istemiyorum","robot musunuz","aptal misiniz","salak misiniz","dalga geciyor","dalga geçiyor","dava ediyorum","dava ederim","rezalet","rezilsiniz","insan baglayın","insan bağlayın","gercek insan","gerçek insan","canli destek","canlı destek","yetkili baglayın","yetkili bağlayın","ne bilgisi aldin","ne bilgisi aldın","dalga mi geciyorsunuz","dalga mı geçiyorsunuz"])) return "frustration";

  // ═══ 4. COMPLAINT / CLAIM ═══
  if (hasAny(norm, ["verdim ya","yazdim ya","yazdım ya","soyledim ya","söyledim ya","yazdim zaten","yazdım zaten","verdim zaten","attim zaten","attım zaten","gonderdim zaten","gönderdim zaten","adresimi yazdim","adresimi yazdım","hepsini verdim","bilgi verdim","belirttim","belirtmistim","belirtmiştim","daha once yazdim","daha önce yazdım","niye ayni seyi","niye aynı şeyi","neden tekrar","yine mi","yeter artik","yeter artık","yanlis anladiniz","yanlış anladınız","cevap vermiyorsunuz","cevap alamiyorum","neden cevap","ayni seyi sorma","aynı şeyi sorma","tekrar sorma","cevap yok mu","cevap yok","cevap yokmu"])) return "complaint";

  // ═══ 5. "GÖNDERDİM" CLAIM (stage-aware) ═══
  // "üstteki olsun" / "bu olsun" → reference, claim değil
  if (hasAny(norm, ["ustteki olsun","üstteki olsun","bundan olsun","bundan olacak","bu model olsun","bu modelden olsun"])) return "photo_reference";
  if (hasAny(norm, ["gonderdim","gönderdim","attim","attım","yolladim","yolladım","yukarida","yukarıda","ustte","üstte","demin attim","daha once gonderdim","daha önce gönderdim","biraz once attim","biraz önce attım","resim yukarida","resim yukarıda","yazdim","yazdım","gondermistim","göndermistim","gondermiştim","göndermistim","yukarda","yukarda var","ustunde","üstünde","atmistim","atmıştım"])) {
    // "yazdım zaten" / "verdim ya" complaint'e düşmeli — complaint layer daha önce yakalamış olmalı
    if (stage === STAGE.WAITING_PHOTO) return "photo_claim";
    if (stage === STAGE.WAITING_ADDRESS) return "address_claim";
    if (stage === STAGE.WAITING_PAYMENT) return "info_claim";
    return "general_claim";
  }

  // ═══ 6. CANCEL ═══
  if (hasAny(norm, KW.cancel)) return "cancel_order";

  // ═══ 7. INFO INTENTS (specific → generic) ═══
  // Dönüş/bekleme — shipping'den ÖNCE (birkaç gün → "kac gun" false match engeli)
  if (hasAny(norm, ["donus yapacagim","dönüş yapacağım","donus yapicam","dönüş yapıcam","tekrar donecegim","tekrar döneceğim","dusunup","düşünüp","dusuneyim","düşüneyim","dusunuyorum","düşünüyorum","sonra yazacagim","sonra yazacağım"])) return "general";
  
  if (hasAny(norm, KW.shipping_price)) return "shipping_price";
  // Shipping BEFORE trust — only explicit delivery questions
  if (hasAny(norm, ["kargo","teslimat","takip no","kargom nerede","teslim","sms gelir","mesaj gelir","bilgi gelir","haber verir"])) return "shipping";
  if (hasAny(norm, ["ne zaman gelir","kac gunde","kaç günde","ne zaman elimde","elime ulasir","elime ulaşır","ne kadar surede gelir","ne kadar sürede gelir","ne kadar surede ulasir","ne kadar sürede ulaşır","ne kadar surede elime","ne kadar sürede elime"])) return "shipping";
  if (hasAny(norm, KW.chain)) return "chain_question";
  if (hasAny(norm, KW.material_question)) return "material_question";
  if (hasAny(norm, KW.trust)) return "trust";
  if (hasAny(norm, KW.location)) return "location";
  // Şubeden teslim
  if (hasAny(norm, ["subeden alacag","şubeden alacağ","subeden teslim","şubeden teslim","elden alacag","elden alacağ","gelip alacag","gelip alacağ","dukkanin","dükkânın","dukkandan","dükkandan","magazadan","mağazadan","subeden alma","şubeden alma","elden alma","gelip alma","yerinden alma"])) return "store_pickup";
  if (hasAny(norm, KW.photo_question)) return "photo_question";
  if (hasAny(norm, KW.example_request)) return "example_request";
  if (hasAny(norm, ["iban","hesap no","hesap numarasi","hesap numarası","eft bilgi","havale bilgi"])) {
    if (hasAny(norm, ["indirim","indirimli","uygun","ucuz"])) {} // bargain'a düşsün
    else return "iban_request";
  }
  // Remaining shipping (after trust took garanti/süre questions)
  if (hasAny(norm, KW.shipping)) return "shipping";
  if (hasAny(norm, KW.payment)) {
    if (/\d{3}/.test(norm) && hasAny(norm, ["olmaz","olur mu","yapar mi","yapar mı"])) {} // bargain'a düşsün
    else return "payment_info_question";
  }
  if (hasAny(norm, KW.back_text_info)) return "back_text_info";
  // Ek back_text_info: "arkasına" + soru kalıbı (tarih/isim/yazı atiyor mu vs)
  if (hasAny(norm, ["arkasina","arka kismina","arka kısmına","arka yuze","arka yüze"]) && hasAny(norm, ["atiyor","atıyor","yaziyor","yazıyor","olur mu","oluyor mu","yapiliyor","yapılıyor","yazilir","yazılır","eklenebilir","yazabilir","koyabiliyor","yazdir","yazdır","olabilir"])) return "back_text_info";
  // Kişi/resim sayısı soruları → photo_question (back_photo_info'dan ÖNCE)
  if (hasAny(norm, ["kac kisi","kaç kişi","kac kisilik","kaç kişilik","iki kisi","iki kişi","2 kisi","2 kişi","birden fazla kisi","birden fazla kişi","ikisini","3 kisi","3 kişi","5 kisi","5 kişi","aile foto","3 kisilik","3 kişilik"])) return "photo_question";
  if (hasAny(norm, ["ikili resim","ikili foto","ayni kare","aynı kare","tek kare","yan yana"])) return "photo_question";
  if (hasAny(norm, ["kac resim koyabil","kaç resim koyabil","kac fotograf koyabil","kaç fotoğraf koyabil","3 lu yapiy","3 lü yapıy","3lu yapiy","3lü yapıy"])) return "photo_question";
  if (hasAny(norm, KW.back_photo_info)) return "back_photo_info";
  if (hasAny(norm, KW.back_text_skip) && !norm.includes("zincir")) return "back_text_skip";

  // Multi-order
  if (hasAny(norm, ["2 tane","iki tane","3 tane","uc tane","üç tane","4 tane","dort tane","dört tane","5 tane","bes tane","beş tane","2li","2'li","3lu","3'lü","uclu","üçlü","toplu alim","toplu alım","iki kolye","2 kolye","3 kolye","4 kolye","5 kolye","ikisinin fiyati","ikisinin fiyatı","toplu siparis","toplu sipariş","coklu alim","çoklu alım","2 urun","2 ürün","3 urun","3 ürün","3 adet","4 adet","5 adet","20 adet"])) return "multi_order";
  if (/\d\s*(li|lü|lu|lı)\s*(alim|alım|siparis|sipariş)/i.test(norm)) return "multi_order";
  if (hasAny(norm, ["toplu","coklu","çoklu"]) && hasAny(norm, ["indirim","fiyat"])) return "multi_order";

  // Price confirmation (fiyat teyidi — pazarlık DEĞİL)
  if (/\d{3}\s*(tl|lira)?\s*(miydi|mıydı|demi|degil mi|değil mi|gonderecegim|göndereceğim|gonderiyorum|gönderiyorum|atacagim|atacağım|yatircam|yatırcam|yatıracağım)/i.test(norm)) return "price";

  // Bargain
  if (hasAny(norm, ["indirim","indirin","son fiyat","yardimci olun","yardımcı olun","anlasalim","anlaşalım","pazarlik","pazarlık","kaca yaparsiniz","kaça yaparsınız","birakir misiniz","bırakır mısınız","indirimli","uygun fiyat","son fiyati","son fiyatı","duz hesap","düz hesap","indirim var mi","indirim var mı","indirim yapar","indirim olur","biraz daha uygun","biraz indirim","ucuza","daha ucuz","cok pahali","çok pahalı"])) return "bargain";
  if (/\d+\s*(tl|lira)?\s*(olur|yapar|yap\b|yapalim|yapalım|birak|bırak|anlas|anlaş|yapin|yapın|gonder|gönder|olmaz|atsam|indirin|indır)/i.test(norm)) return "bargain";
  if (/\d{3}\s*(e |a |ye |ya )(birak|bırak|gonder|gönder|yapar|yapın|yapin)/i.test(norm)) return "bargain";
  if (/\d{3}\s*(tl)?\s*(olmaz|olur)\s*(mi|mı|mu|mü)/i.test(norm)) return "bargain";

  if (hasAny(norm, KW.price)) return "price";

  // ═══ 8. BACK TEXT (waiting_payment, explicit signal) ═══
  if (stage === STAGE.WAITING_PAYMENT && !backTextDone) {
    if (hasAny(norm, KW.back_text_direct)) return "back_text";
    if (hasAny(norm, ["arkasina","arkasına","arka yuze","arka yüze","arkaya yazi","arkaya yazı"])) return "back_text";
  }

  // ═══ 9. PHOTO REFERENCE / CHANGE (order_start'tan ÖNCE — "foto" keyword çakışması) ═══
  if (hasAny(norm, ["bundan olacak","bundan olsun","son attigim","son attığım","ustteki","üstteki","ustteki olsun","üstteki olsun","bu olsun","bu foto olsun","bu resim olsun","bu model olsun","bu modelden olsun","bu fotograf olacak","bu fotoğraf olacak","bu foto olacak","bu resim olacak"])) return "photo_reference";
  if (hasAny(norm, ["baska resim","başka resim","farkli foto","farklı foto","fotografi degistir","fotoğrafı değiştir","resim degistir","resim değiştir","baska foto","başka foto","degistireyim","değiştireyim","baska resim bakayim","başka resim bakayım","farkli foto atayim","farklı foto atayım","bu fotograf degil","bu fotoğraf değil","bu foto degil","bu foto değil","yanlis foto","yanlış foto","yanlis resim","yanlış resim","o fotograf degil","o fotoğraf değil"])) return "photo_change_request";

  // ═══ 10. PRODUCT FLOW ═══
  // "atacaktınız" hatırlatma → order_start değil
  if (hasAny(norm, ["atacaktiniz","atacaktınız","atacaksiniz","atacaksınız","atacaginizi","atacağınızı","atacaktiniz ama","gorsel atacak","görsel atacak","resim atacak","foto atacak"])) return "general";
  if (raw.length <= 30 && (hasAny(norm, KW.product_lazer) || hasAny(norm, KW.product_atac))) return "order_start";
  if (hasAny(norm, KW.order_start)) {
    if (hasAny(norm, ["ama suan degil","ama henuz degil","ama simdi degil","dusunuyorum","düşünüyorum"])) return "general";
    return "order_start";
  }
  if (hasAny(norm, KW.new_order)) return "new_order";
  if (hasAny(norm, KW.post_sale)) return "post_sale";
  if (hasAny(norm, KW.detail_request)) return "detail_request";

  // ═══ 10. ACK / SMALLTALK ═══
  const ACK_WORDS = ["tamam","tamamdir","tmm","olur","peki","evet","ok","anladim","anladım","he","hee","tm"];
  if (raw.length <= 15 && ACK_WORDS.includes(norm)) return "ack";
  if (hasAny(norm, KW.smalltalk)) return "smalltalk";

  // ═══ 11. WAITING_PAYMENT short messages → back_text (very strict) ═══
  if (stage === STAGE.WAITING_PAYMENT && raw.length <= 40 && !backTextDone) {
    const isQuestion = /[?]/.test(raw) || /\b(mi|mı|mu|mü|misiniz|mısınız)\b/i.test(raw);
    const isPhone = /0\d{3}\s?\d{3}\s?\d{2}\s?\d{2}/.test(raw) || /05\d{2}/.test(raw);
    const isUndecided = hasAny(norm, ["bilemedim","karar veremedim","kararsiz","kararsız","ne yazsak","emin degilim","emin değilim"]);
    const isBlocked = hasAny(norm, [
      "bekliyorum","neden","niye","hala","hâlâ","tekrar","yine","sorun","sikayet","şikayet","memnun",
      "yanlis","yanlış","yeter","yazdim","yazdım","verdim","attim","attım","gonderdim","gönderdim",
      "zincir","kolye","renk","gumus","gümüş","gold","altin","altın","fiyat","kargo",
      "materyal","celik","çelik","garanti","iade","iptal","taksit","eft","havale","kapida","kapıda",
      "adres","telefon","numara","whatsapp",
      "tamam","olur","peki","evet","hayir","hayır","yok","istemiyorum","gerek yok",
      "gormek","görmek","gormeden","görmeden","gorsel","görsel","paylasir","paylaşır",
    ]);
    if (!isQuestion && !isBlocked && !isPhone && !isUndecided && !hasAny(norm, ACK_WORDS)) return "back_text";
  }

  // ═══ DEFAULT ═══
  return "general";
}

export function extractEntities(message, norm, product, stage) {
  return {
    phone: extractPhone(message),
    hasAddress: looksLikeAddress(norm, message, stage),
    hasName: looksLikeName(message, norm, stage),
    payment: parsePaymentFromMessage(norm, ""),
    photoLink: looksLikePhotoUrl(message),
    letters: extractLetters(message, norm, product, stage),
  };
}
