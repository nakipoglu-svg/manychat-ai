// pre-handlers.js — Intent handler'lardan ÖNCE çalışan özel pattern'ler
import { REPLY_CLASS, SUPPORT_REASON, STAGE, PRODUCT, TEXT } from "../constants.js";
import { hasAny } from "../normalize.js";

const R = (t, c = REPLY_CLASS.FIXED_INFO, r = SUPPORT_REASON.NONE) => ({ text: t, reply_class: c, support_mode_reason: r });
const OP = (t) => R(t, REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_REASON.OPERATIONAL);
const FP = (t) => R(t, REPLY_CLASS.FLOW_PROGRESS);

export function preHandlers(ctx, state, nextStage) {
  const { norm, message, intent } = ctx;
  const raw = String(message || "").trim();
  const stage = state.conversation_stage || "";

  // ═══ POST_SALE / CANCEL → pre-handlers bypass, side-questions'a düşsün ═══
  if (intent === "post_sale" || intent === "cancel_order") return null;

  // ═══ FRUSTRATION / SİTEM — müşteri sinirlenmiş, menü gösterme! ═══
  if (hasAny(norm, ["okumuyorsunuz","okumuyor","anlamiyorsunuz","anlamıyorsunuz","dalga mi geciyorsunuz","dalga mı geçiyorsunuz","dalga geciyorsunuz","dalga geçiyorsunuz","cevap vermiyorsunuz","cevap vermiyor","aptal misiniz","aptal mısınız","robot musunuz","robot musun","otomatik mesaj istemiyorum","kendiniz cevap","bot musunuz","bot musun","soruma cevap","ne bicim","ne biçim","nasil bir isletme","nasıl bir işletme","bakacak misiniz","bakacak mısınız","artik yeter","artık yeter","sorunlu musunuz","sorunlu musun","bilgisayar cevap","bilgisayar veriyor","yapacaginiz ise","yapacağınız işe","baslarim","başlarım","ne bu ya","aloooo","alooo"])) {
    return { text: "Çok özür dileriz efendim, sizi dinliyorum. Size nasıl yardımcı olabilirim? 😊", reply_class: REPLY_CLASS.OPERATIONAL_REQUIRED, support_mode_reason: SUPPORT_REASON.OPERATIONAL };
  }

  // ═══ ÜRÜN KAPSAMI DIŞI — bileklik, yüzük, anahtarlık vb. ═══
  if (hasAny(norm, ["bileklik","bilezik","yuzuk","yüzük","anahtarlik","anahtarlık","kupe","küpe","piercing","saat","broş","bros","toka","kemer","cuzdan","cüzdan","bileklik isim","kunye","künye"])) {
    // Müşteri satılmayan ürün soruyor
    if (hasAny(norm, ["kunye","künye"])) {
      return R("Şu an künye modelimiz bulunmuyor efendim 😊 Resimli lazer kolye ve harfli ataç kolye modellerimiz mevcut. Yardımcı olabilir miyim?");
    }
    return R("Şu an sadece kolye modellerimiz mevcut efendim 😊 Resimli lazer kolye ve harfli ataç kolye yapıyoruz. Bu modeller hakkında bilgi almak ister misiniz?");
  }

  // ═══ FOTO GELDİ AMA ÜRÜN SEÇİLMEMİŞ → OTOMATİK LAZER ═══
  if (intent === "photo" && !ctx.product && !state.product) {
    // Foto gönderen müşteri %99 lazer istiyor, otomatik lazer seç
    ctx.product = PRODUCT.LAZER;
    return FP("Fotoğrafınız ulaştı efendim 😊 Resimli lazer kolye olarak devam ediyoruz.\n\nSiparişiniz bu fotoğraf üzerinden hazırlanacaktır. Farklı bir görsel kullanmak isterseniz belirtebilirsiniz.\n\nÖdeme tercihiniz EFT / Havale mi, kapıda ödeme mi olacak efendim?");
  }

  // ═══ ACK ENGINE — Kısa onay mesajları state-aware yönetimi ═══
  if (intent === "ack") {
    // WAITING_PRODUCT: müşteri "evet" derse menü göster
    if (stage === STAGE.WAITING_PRODUCT) {
      return { text: TEXT.MAIN_MENU, reply_class: REPLY_CLASS.MENU, support_mode_reason: "" };
    }
    // Aktif sipariş akışı varsa → flow devam etsin (null döndür, sıradaki rule halletsin)
    const activeFlowStages = [
      STAGE.WAITING_PHOTO, STAGE.WAITING_BACK_TEXT, STAGE.WAITING_PAYMENT,
      STAGE.WAITING_ADDRESS, STAGE.WAITING_LETTERS,
    ];
    if (stage && activeFlowStages.includes(stage)) {
      // Flow devam etsin — bu pre-handler cevap üretmez, flow rule'ları halletsin
      return null;
    }
    // Süreç bitti veya aktif süreç yok → sadece kısa onay cevabı ver
    return FP("Tabi efendim 😊");
  }

  // ═══ PAYMENT CONFIRMATION — "ücreti attım", "ödeme yaptım" ═══
  if (intent === "payment_confirmation") {
    return FP("Teşekkür ederiz efendim, ekibimiz kontrol edip size dönüş sağlayacaktır 😊");
  }

  // ═══ ARKA YAZI TALEBİ (sadece lazer — ataç'ta arka yazı yok) ═══
  const isBackTextQuestion = hasAny(norm, ["olur mu","olurmu","oluyor mu","yazilir mi","yazılır mı","yapilir mi","yapılır mı","ne yazalim","ne yazılır","ne yazılıyor","genelde","yazabilir mi","yazabilir miyiz","yazabiliriz","eklenebilir","ekleniyor mu","yazdirilir","yazdırılır","sigar mi","sığar mı","ne yazilir","ne yazdirabilir","yazamiyor","yazilmiyor","yazılmıyor","yazilamiyor","yazılamıyor","yaziyor mu","yaziyor musunuz","yaziyorsunuz","yazıyorsunuz","yaziyor muyuz","var mi","varmi","var mı"]);
  if (ctx.product !== PRODUCT.ATAC && hasAny(norm, ["arkasina","arkasına","arkaya","arka kisma","arka kısma","arka tarafina","arka tarafına"]) && hasAny(norm, ["yaz","yazalim","yazılsın","yazsın","ekle"])) {
    if (isBackTextQuestion) {
      // Soru → bilgi ver, state değiştirme. Intent'i INFO'ya çevir ki state.js received yapmasın.
      ctx.intent = "back_text_info";
      return FP("Evet efendim, arka tarafa ücretsiz bir şekilde yazı ekleyebiliyoruz. İsterseniz ne yazılmasını istediğinizi buradan iletebilirsiniz.");
    }
    // Net talep → yumuşak teyit
    const extra = stage === STAGE.WAITING_PAYMENT ? " Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?" :
                  stage === STAGE.WAITING_ADDRESS ? " Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz?" :
                  stage === STAGE.WAITING_PHOTO ? " Fotoğrafınızı buradan iletebilirsiniz." : "";
    return FP("Tamamdır efendim 😊" + extra);
  }

  // Fiyat pazarlık — rakam + TL/lira + pazarlık fiili
  if (/\d+\s*(tl|lira)/i.test(raw) && hasAny(norm, ["olur mu","olurmu","yapar misiniz","yaparmisiniz","yap","son fiyat","indirim"])) {
    return R("Fiyatlarımız sabit olup değişiklik yapılamamaktadır efendim 😊");
  }
  // Rakam + pazarlık fiili (TL olmadan — "600 olur mu", "500 e bırak", "550 yaparsan alayım")
  if (/\d{3}/.test(raw) && hasAny(norm, [
    "anlasalim","anlaşalım","anlas","yapalim","yapalım","verelim","versem",
    "gondersenize","göndersen","siz bana","bana yapin","bana yapın",
    "olur mu","olurmu","yapar mi","yapar mı","yaparsan","yaparsaniz",
    "birak","bırak","birakir","bırakır","birakin","bırakın",
    "yapin","yapın","yapsan","yapsaniz","yapsanız",
    "alayim","alayım","alirim","alırım",
    "atsaniz","atsanız","gondersem","göndersem","versem",
    "son fiyat","indirim",
  ])) {
    return R("Fiyatlarımız sabit olup değişiklik yapılamamaktadır efendim 😊");
  }
  // Rakam + "e/a" + fiil pattern ("400 e gönder", "bana 450 yap", "500 e ver")
  if (/\d{3}\s*(?:e|a|ye|ya|den|dan)\s+(?:gonder|gönder|yap|ver|birak|bırak|sat|at)/i.test(norm) ||
      /bana\s+\d{3}\s+(?:yap|gonder|gönder|ver|birak|bırak|sat)/i.test(norm)) {
    return R("Fiyatlarımız sabit olup değişiklik yapılamamaktadır efendim 😊");
  }
  if (/\d+\s*(tl|lira)/i.test(raw) && hasAny(norm, ["dimi","di mi","demi","de mi","degil mi","değil mi","dogrumu","doğrumu","miydi","miydi","midir","mudur"])) {
    if (state.product === PRODUCT.LAZER) return R("Resimli lazer kolye: EFT / havale 599 TL, kapıda ödeme 649 TL'dir efendim 😊");
    if (state.product === PRODUCT.ATAC) return R("Harfli ataç kolye: EFT / havale 499 TL, kapıda ödeme 549 TL'dir efendim 😊");
    return R("Resimli lazer kolye: EFT / havale 599 TL, kapıda ödeme 649 TL'dir efendim 😊");
  }
  // Pazarlık — "olmaz mı", "düz hesap", "kaça yaparsınız", "son fiyat ne olur", "indirin", "indirimli"
  if (hasAny(norm, ["olmaz mi","olmaz mı","duz hesap","düz hesap","kaca yaparsiniz","kaça yaparsınız","kaca olur","kaça olur","son fiyat ne olur","son fiyat nedir","indirin","indirimli olur","indirimli yapar"])) {
    return R("Fiyatlarımız sabit olup değişiklik yapılamamaktadır efendim 😊");
  }
  if (hasAny(norm, ["cok pahali","çok pahalı","pahali","pahalıymış","pahalıymıs","pahaliymiş","indirim yap","indirim olur mu","indirim var mi","indirim varmi","indirim sagliyor","indirim sağlıyor","toplu siparis","toplu sipariş","toplu alim","toplu alım"])) {
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
  if (hasAny(norm, ["hesaptan at","hesaptan yat","ucreti attim","ücreti attım","parayi gonderdim","parayı gönderdim","odemeyi yaptim","ödemeyi yaptım","parayı attim","parayı attım","odeme yaptim","ödeme yaptım","eft attim","havale yaptim","kontrol eder","kontrol ederm","dekont gonderdim","dekont gönderdim","dekont attim","dekont attım"])) {
    return OP("Tabi efendim, ekibimiz kontrol edip size dönüş sağlayacaktır 😊");
  }

  // Sitem / complaint / "yazdım zaten" / "neden tekrar"
  if (hasAny(norm, ["adresi yazdim zaten","adresi yazdım zaten","numarayi attim","numarayı attım","yazdim zaten","yazdım zaten","verdim zaten","gonderdim zaten","gönderdim zaten","yukarda var","yukarida var","yukarıda var"])) {
    return R("Özür dileriz efendim 😊 Bilgilerinizi kontrol ediyorum. Eksik bir bilgi varsa sizi bilgilendireceğim.");
  }
  if (hasAny(norm, ["neden cevap vermiyorsunuz","niye cevap vermiyorsunuz","neden cevap vermiyor","cevap vermiyorsunuz","cevap alamiyorum","donus yapmiyorsunuz","dönüş yapmıyorsunuz"])) {
    return OP("Çok özür dileriz efendim 😊 Hemen ekibimize iletiyorum, en kısa sürede dönüş sağlanacaktır.");
  }
  if (hasAny(norm, ["yeter artik","yeter artık","yeter ya","biktim","bıktım","sinirlendim","cildirdim","çıldırdım","kac kere yazdim","kaç kere yazdım"])) {
    return OP("Çok özür dileriz efendim 😔 Hemen ekibimize iletiyorum.");
  }
  if (hasAny(norm, ["niye ayni seyi","niye aynı şeyi","neden ayni seyi","neden aynı şeyi","neden tekrar","niye tekrar"])) {
    return R("Özür dileriz efendim 😊 Bilgilerinizi kontrol ediyorum.");
  }

  // Çoklu foto / birleştirme (Fix #15)
  if (hasAny(norm, ["kac resim","kaç resim","kac foto","kaç foto","3 resim","uc resim","üç resim","3 foto","3 lu","3 lü","uclu","üçlü","4 lu","4 lü","5 li","5 kisi","5 kişi","tek kolyeye uc","tek kolyeye üç","tek yuze","tek yüze","ayni karede","aynı karede","birlestirip","birleştirip","birlestirme","birleştirme","birlestir","birleştir","ayri ayri yollasak","ayrı ayrı yollasak","ayri ayri atsak","ayrı ayrı atsak","kac kisi","kaç kişi","kac kisilik","kaç kişilik","iki kisi","iki kisinin","iki cocuk","iki çocuk","kac yuz","kaç yüz","uc kisi","üç kişi","dort kisi","dört kişi","bes kisi","beş kişi","3 kisi","4 kisi"])) {
    if (hasAny(norm, ["ornek","örnek"])) return R("Örnek çalışmalarımızı buradan inceleyebilirsiniz efendim 😊\n\n📸 Örnek ürünler: instagram.com/stories/highlights/18391039714130558/\n📦 Sizden gelenler: instagram.com/stories/highlights/18079575341155587/");
    const extra = stage === STAGE.WAITING_PHOTO ? " Fotoğrafları buradan gönderebilirsiniz 😊" :
                  stage === STAGE.WAITING_PAYMENT ? " Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?" :
                  stage === STAGE.WAITING_ADDRESS ? " Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz?" : "";
    return FP("Evet efendim, tek yüze birden fazla fotoğraf koyabiliyoruz 😊 Profesyonelce birleştirip tek tasarım haline getiriyoruz." + extra);
  }

  // Özel tasarım talepleri — sonsuzluk, kalp, yıldız, ay vb.
  // Bunları kabul et, not al, akışı devam ettir (seller'a atma)
  if (hasAny(norm, ["sonsuzluk isareti","sonsuzluk işareti","sonsuzluk","infinity","kalp isareti","kalp işareti","kalp ekle","yildiz isareti","yıldız işareti","yildiz ekle","yıldız ekle","ay yildiz","ay yıldız","kelebek","melek","pati","kuyruklu yildiz"])) {
    const extra = stage === STAGE.WAITING_PHOTO ? " Fotoğrafı buradan gönderebilirsiniz efendim." :
                  stage === STAGE.WAITING_PAYMENT ? "" :
                  stage === STAGE.WAITING_PAYMENT ? " Ödeme yönteminiz EFT / Havale mi, kapıda ödeme mi olacak efendim?" :
                  stage === STAGE.WAITING_ADDRESS ? " Ad soyad, cep telefonu ve açık adresinizi iletebilir misiniz?" : "";
    return FP("Tabi efendim, not aldım 😊 Ekibimiz tasarıma ekleyecektir." + extra);
  }

  // Farklı zincir modeli → STANDART ZİNCİR (satıcıya bırakma YOK)
  if (ctx.product !== PRODUCT.ATAC && hasAny(norm, ["farkli zincir","farklı zincir","italyan zincir","kral zincir","gurmet zincir","halat zincir","bismark zincir","zincir model degistir","zincir model değiştir"])) {
    return R("Standart zincirimiz ile gönderiyoruz efendim 😊");
  }

  // Aksesuar
  if (hasAny(norm, ["aksesuar","pembe kalp","siyah kalp","nazar boncugu","nazar boncuğu","kalp var mi","kalp var mı","hangi kalp","kalp renk","kalp seceneg","kalp seçeneg"])) {
    if (hasAny(norm, ["nazar boncugu","nazar boncuğu"]) && !hasAny(norm, ["kalp","aksesuar"])) return R("Nazar boncuğumuz mevcut efendim 😊 Hepsi fiyata dahildir, ek ücret yok.");
    if (hasAny(norm, ["pembe kalp"]) && !hasAny(norm, ["siyah","nazar","aksesuar"])) return R("Pembe kalbimiz mevcut efendim 😊 Hepsi fiyata dahildir.");
    if (hasAny(norm, ["siyah kalp"]) && !hasAny(norm, ["pembe","nazar","aksesuar"])) return R("Siyah kalbimiz mevcut efendim 😊 Hepsi fiyata dahildir.");
    return R("Pembe kalp, siyah kalp ve nazar boncuğu seçeneklerimiz mevcut efendim 😊 Hepsi fiyata dahildir, ek ücret yok.");
  }

  // İade / değişim (Fix #7)
  if (hasAny(norm, ["iade","degisim","değişim","geri gonder","geri gönder","iade edebilir","iade yapilir","iade yapılır","geri yollayabilir","geri yolla"])) {
    if (hasAny(norm, ["garanti","kalite","bozuk","kirik","kırık","hatali","hatalı"])) return R("Kalite kaynaklı sorunlarda ürün değişimi sağlıyoruz efendim 😊");
    return R("Kişiye özel üretildiği için keyfi iade yapılmamaktadır efendim 😊 Fotoğrafın seçimi müşterinin sorumluluğundadır. Kalite kaynaklı sorunlarda ise ürün değiştirilir.");
  }

  // Renk seçenekleri sorusu — "renk atma" ve "solma" kararma demek, renk seçeneği değil
  if (hasAny(norm, ["renk secenek","renk seceneg","renk cesit","renk cesid","renkler neler","ne renk var","renk var mi","renk var mı","kac renk","kaç renk"]) && !hasAny(norm, ["renk atma","renk atar","solma","kararma","paslan"])) {
    return R("Altın kaplama (gold) ve gümüş kaplama seçeneğimiz mevcut efendim 😊 Ayrıca mat çelik (saf çelik) de bulunmaktadır. Hepsinde fiyat aynıdır.");
  }

  // Erkek (Fix #16)
  if (hasAny(norm, ["erkek icin","erkek için","erkek uygun","erkek takabilir","erkek takar","babam icin","babam için","esim icin","eşim için","oglum icin","oğlum için","erkek model"])) {
    if (hasAny(norm, ["zincir"])) return R("Tabi efendim, erkek için 50 cm gümüş zincirimiz mevcut 😊");
    return R("Tabi efendim, erkek için 50 cm gümüş zincirimiz mevcut 😊");
  }

  // Gümüş yap / metal
  if (hasAny(norm, ["gumus yap","gümüş yap","gumus model","gümüş model","gumus olsun","gümüş olsun"])) return R("Efendim gümüş kaplama çelik modelimiz bulunmaktadır 😊");
  if (norm === "metal" || norm === "metali ne" || norm === "malzemesi" || norm === "metal mi" || hasAny(norm, ["metal cinsi","metalin cinsi","metal nedir"])) return R("14 ayar altın kaplama paslanmaz çeliktir efendim 😊 Kararma, solma yapmaz.");

  // Yapım süreci / yapay zeka
  if (hasAny(norm, ["yapim asamasi","yapım aşaması","yapim asamaniz","yapım aşamanız","surec nasil","süreç nasıl","nasil yapiliyor","nasıl yapılıyor","yapim sureci","yapım süreci"])) {
    return R("Fotoğrafınızı alıyoruz, lazer kazıma yöntemiyle kolyeye işliyoruz ve kargo ile gönderiyoruz efendim 😊");
  }
  if (hasAny(norm, ["degisiklik olmaz","değişiklik olmaz","resimde degisiklik","resimde değişiklik","fotoda degisiklik","fotoda değişiklik","yapay zeka","ai ile"])) {
    return R("Fotoğraflarınız lazer baskıya uygun hale getirilir efendim 😊 Göz ile görülür bir değişiklik yapılmıyor.");
  }

  // WhatsApp
  if (hasAny(norm, ["tel alab","telefon alab","whatsapp","numara alab"]) || (hasAny(norm, ["numaraniz","numaranız"]) && !hasAny(norm, ["iban","hesap","banka"]))) return R(TEXT.WHATSAPP);

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

  // Kargo mesajı / SMS
  if (hasAny(norm, ["kargo mesaj","kargo bilgi","kargo takip"]) && hasAny(norm, ["atar mi","atar mı","atarmi","gelir mi","gelirmi"])) {
    return R("Ürününüz kargoya verildiğinde size SMS gelecektir, ayrıca şubenize ulaştığında da bir SMS daha alacaksınız efendim 😊");
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
