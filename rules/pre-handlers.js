// pre-handlers.js — Intent handler'lardan ÖNCE çalışan özel pattern'ler
import { REPLY_CLASS, SUPPORT_REASON, STAGE, PRODUCT, TEXT } from "../constants.js";
import { hasAny } from "../normalize.js";

const R = (t, c = REPLY_CLASS.FIXED_INFO, r = SUPPORT_REASON.NONE) => ({ text: t, reply_class: c, support_mode_reason: r });
const OP = (t) => R(t, REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_REASON.OPERATIONAL);
const FP = (t) => R(t, REPLY_CLASS.FLOW_PROGRESS);

export function preHandlers(ctx, state, nextStage) {
  const { norm, message } = ctx;
  const raw = String(message || "").trim();
  const stage = state.conversation_stage || "";

  // Fiyat pazarlık
  if (/\d+\s*(tl|lira)/i.test(raw) && hasAny(norm, ["olur mu","olurmu","yapar misiniz","yaparmisiniz","yap","son fiyat","indirim"])) {
    return R("Fiyatlarımız sabit olup değişiklik yapılamamaktadır efendim 😊");
  }
  if (/\d+\s*(tl|lira)/i.test(raw) && hasAny(norm, ["dimi","di mi","degil mi","değil mi","dogrumu","doğrumu"])) {
    if (state.product === PRODUCT.LAZER) return R("Resimli lazer kolye: EFT / havale 599 TL, kapıda ödeme 649 TL'dir efendim 😊");
    if (state.product === PRODUCT.ATAC) return R("Harfli ataç kolye: EFT / havale 499 TL, kapıda ödeme 549 TL'dir efendim 😊");
  }
  if (hasAny(norm, ["cok pahali","çok pahalı","pahali","pahalıymış","pahalıymıs","pahaliymiş","indirim yap","indirim olur mu","indirim var mi","indirim varmi"])) {
    return R("Çoklu alımlarda indirimimiz bulunmaktadır efendim 😊 Kaç adet düşünüyorsunuz?");
  }

  // Duygusal — vefat
  if (hasAny(norm, ["vefat etti","kaybettim","oldu babam","oldu annem","rahmetli"])) {
    const extra = stage === STAGE.WAITING_PAYMENT ? " Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?" :
                  stage === STAGE.WAITING_PHOTO ? " Fotoğrafı hazır olduğunda buradan gönderebilirsiniz." :
                  stage === STAGE.WAITING_ADDRESS ? " Ad soyad, telefon ve adres bilgilerinizi iletebilir misiniz?" : "";
    return FP("Başınız sağ olsun efendim, çok üzüldüm 😔 Allah rahmet eylesin." + extra);
  }

  // Ödeme yaptım
  if (hasAny(norm, ["hesaptan at","hesaptan yat","ucreti attim","ücreti attım","parayi gonderdim","parayı gönderdim","odemeyi yaptim","ödemeyi yaptım","parayı attim","parayı attım","odeme yaptim","ödeme yaptım","eft attim","havale yaptim","kontrol eder","kontrol ederm"])) {
    return OP("Tabi efendim, ekibimiz kontrol edip size dönüş sağlayacaktır 😊");
  }

  // Çoklu foto
  if (hasAny(norm, ["kac resim","kaç resim","kac foto","kaç foto","3 resim","uc resim","üç resim","3 foto","3 lu","3 lü","uclu","üçlü","4 lu","4 lü","5 li","5 kisi","5 kişi","tek kolyeye uc","tek kolyeye üç","tek yuze","tek yüze","ayni karede","aynı karede","birlestirip","birleştirip","birlestirme","birleştirme","birlestir","birleştir","ayri ayri yollasak","ayrı ayrı yollasak","ayri ayri atsak","ayrı ayrı atsak"])) {
    if (hasAny(norm, ["ornek","örnek"])) return R("Tabi efendim, ekibimiz size örnek görselleri gönderecektir 😊", REPLY_CLASS.SELLER_REQUIRED, SUPPORT_REASON.SELLER);
    return R("Evet efendim, tek yüze birden fazla fotoğraf koyabiliyoruz 😊 Fotoğrafları buradan gönderebilirsiniz, ekibimiz düzenleyecektir.");
  }

  // Gümüş yap / metal
  if (hasAny(norm, ["gumus yap","gümüş yap","gumus model","gümüş model","gumus olsun","gümüş olsun"])) return R("Efendim gümüş kaplama çelik modelimiz bulunmaktadır 😊");
  if (norm === "metal" || norm === "metali ne" || norm === "malzemesi" || hasAny(norm, ["metal cinsi","metalin cinsi"])) return R("Paslanmaz çelikten üretilmektedir efendim 😊 Kararma, solma yapmaz.");

  // Yapım süreci / yapay zeka
  if (hasAny(norm, ["yapim asamasi","yapım aşaması","yapim asamaniz","yapım aşamanız","surec nasil","süreç nasıl","nasil yapiliyor","nasıl yapılıyor","yapim sureci","yapım süreci"])) {
    return R("Önce sizden fotoğraf alıyoruz, grafikerimiz düzenledikten sonra size gönderiyoruz. Onayınızın ardından üretime geçiyoruz, kargoya vermeden önce de son halini paylaşıyoruz efendim 😊");
  }
  if (hasAny(norm, ["degisiklik olmaz","değişiklik olmaz","resimde degisiklik","resimde değişiklik","fotoda degisiklik","fotoda değişiklik","yapay zeka","ai ile"])) {
    return R("Gönderdiğiniz fotoğrafları grafikerimiz lazer baskıya uygun hale getiriyor efendim 😊 Göz ile görülür bir değişiklik yapılmıyor, yapay zeka kullanmıyoruz.");
  }

  // WhatsApp
  if (hasAny(norm, ["tel alab","telefon alab","whatsapp","numara alab","numaraniz","numaranız"])) return R(TEXT.WHATSAPP);

  // Bitince paylaşır mısınız
  if (hasAny(norm, ["bitince paylas","bitince paylaş","hazir olunca paylas","hazır olunca paylaş","bitince atar","hazir olunca atar","hazır olunca atar","hazir olunca foto","hazır olunca foto","benimle paylas","benimle paylaş","gondermeden once","göndermeden önce"])) {
    return R("Tabi efendim, ürün lazerden çıktıktan sonra size görselini paylaşıyoruz 😊");
  }

  // Renk tercihi
  if (hasAny(norm, ["bu renk","bu reng","gold renk","gumus renk","gümüş renk","silver renk","rose renk","altin renk","altın renk","sari olan","sarı olan"])) {
    const extra = stage === STAGE.WAITING_PHOTO ? " Fotoğrafı buradan gönderebilirsiniz." :
                  stage === STAGE.WAITING_PAYMENT ? " Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?" :
                  stage === STAGE.WAITING_ADDRESS ? " Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz?" : "";
    return FP("Tabi efendim, not aldım 😊" + extra);
  }

  // Sipariş onay (satıcı)
  if (hasAny(norm, ["siparisiniz olusturuldu","siparişiniz oluşturuldu","siparisiniz alindi","siparişiniz alındı","siparisiniz tamamlandi","siparişiniz tamamlandı"])) {
    return R("Siparişiniz onaylanmıştır efendim 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", REPLY_CLASS.ORDER_COMPLETE);
  }

  // Dönüş yapacağım
  if (hasAny(norm, ["donus yapicam","dönüş yapıcam","donus yapacagim","dönüş yapacağım","tekrar donecegim","tekrar döneceğim","daha sonra donecegim","dusunup gonderecegim","düşünüp göndereceğim","dusunup size","düşünüp size"])) {
    return R("Tabi efendim, bekliyoruz 😊");
  }

  // Kargo kapsam
  if (hasAny(norm, ["her yere kargo","her yere gonderim","her yere gönderi","turkiye geneli","türkiye geneli","il disina","il dışına","bana yakin","bana yakın"])) return R("Evet efendim, Türkiye'nin her yerine ücretsiz kargo ile gönderim yapıyoruz 😊");
  if (hasAny(norm, ["arti kargo","artı kargo","ekstra kargo","kargo ayri","kargo ayrı"])) return R("Kargo ücretsizdir, fiyata dahildir efendim 😊");

  // Kargo mesajı
  if (hasAny(norm, ["kargo mesaj","kargo bilgi","kargo takip"]) && hasAny(norm, ["atar mi","atar mı","atarmi","gelir mi","gelirmi"])) {
    return R("Kargoya verildiğinde tarafınıza otomatik bilgi mesajı gönderilmektedir efendim 😊");
  }

  // Ne zaman elimde
  if (hasAny(norm, ["ne zaman elimde","nezaman elimde","kac gunde elime","kaç günde elime","ne zaman ulasir","ne zaman ulaşır"])) return R(TEXT.SHIPPING_TIME);

  // Arkalı önlü fiyat
  if (hasAny(norm, ["arkali onlu ne kadar","arkalı önlü ne kadar","arkali onlu fiyat","arkalı önlü fiyat","iki tarafli fiyat","iki taraflı fiyat","cift tarafli fiyat","çift taraflı fiyat"])) {
    return R("Arkalı önlü fotoğrafta fiyat farkı yoktur efendim 😊 EFT / havale fiyatımız 599 TL, kapıda ödeme fiyatımız 649 TL'dir.");
  }

  // Sitem
  if (hasAny(norm, ["donecektiniz","dönecektiniz","donus yapmadi","dönüş yapmadı","cevap vermediniz","cevap gelmiyor","donmadiniz","dönmedi"])) {
    return OP("Çok özür dileriz efendim, ekibimize hemen iletiyorum 😊");
  }

  // Beğeni + devam
  if (hasAny(norm, ["tatli duruyor","tatlı duruyor","cok tatli","çok tatlı"]) && stage) {
    const extra = stage === STAGE.WAITING_ADDRESS ? " Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz efendim?" :
                  stage === STAGE.WAITING_PAYMENT ? " Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?" : "";
    return FP("Çok teşekkür ederiz efendim 😊" + extra);
  }

  // İlettim
  if (hasAny(norm, ["ilettim","yenidenmi gondereyim","yeniden mi göndereyim","tekrar mi yazayim","tekrar mı yazayım"])) {
    return FP("Bilgilerinizi aldım efendim 😊 Eksik bilgi varsa ekibimiz sizinle iletişime geçecektir.");
  }

  // Bundan olacak
  if (hasAny(norm, ["bundan olacak","bundan istiyorum","bunu istiyorum","bu olacak"])) {
    const extra = stage === STAGE.WAITING_PHOTO ? " Fotoğrafı buradan gönderebilirsiniz efendim 😊" :
                  stage === STAGE.WAITING_PAYMENT ? " Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim? 😊" : " 😊";
    return FP("Tabi efendim, not aldım!" + extra);
  }

  return null;
}
