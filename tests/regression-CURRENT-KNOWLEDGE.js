import { runSuite } from "./_harness.js";

const lazer = (message, extra = {}) => ({
  message,
  ilgilenilen_urun: "lazer",
  user_product: "lazer",
  context_lock: "1",
  conversation_stage: "waiting_photo",
  order_status: "started",
  ...extra,
});

const completedLazer = (message) => lazer(message, {
  conversation_stage: "order_completed",
  order_status: "completed",
  siparis_alindi: "1",
});

const atac = (message, extra = {}) => ({
  message,
  ilgilenilen_urun: "atac",
  user_product: "atac",
  context_lock: "1",
  conversation_stage: "waiting_letters",
  order_status: "started",
  ...extra,
});

const cases = [
  {
    name: "Fiyat listesi yeni fiyatları verir",
    input: { message: "fiyat nedir" },
    includes: ["649", "549", "2 999"],
    notIncludes: ["Eminönü", "14 ayar"],
  },
  {
    name: "Fiyat listesi kapıda ödemenin sitede aktif olduğunu söyler",
    input: { message: "fiyat nedir" },
    includes: ["Kapıda Ödeme seçeneği web sitemizde de aktiftir", "ödeme adımında Kapıda Ödeme"],
  },
  {
    name: "Genel ödeme bilgisi siteye yönlendirir",
    input: { message: "Ödeme nasıl oluyor?" },
    includes: ["web sitemiz üzerinden kolayca", "kredi kartı, EFT/Havale ve Kapıda Ödeme", "ödeme adımında Kapıda Ödeme"],
  },
  {
    name: "Kapıda ödeme bilgisi sitede aktif olduğunu söyler",
    input: { message: "Kapıda ödeme var mı?" },
    includes: ["Kapıda Ödeme seçeneğimiz web sitemizde de aktif", "ödeme adımında Kapıda Ödeme", "yalnızca nakit"],
  },
  {
    name: "Nasıl sipariş verilir siteyi kolay yol olarak anlatır",
    input: { message: "Nasıl sipariş verebilirim?" },
    includes: ["web sitemiz üzerinden çok kolay", "Kapıda Ödeme seçeneği de web sitemizde aktif", "www.yudumjewels.com"],
  },
  {
    name: "Nasıl sipariş veririm siteyi kolay yol olarak anlatır",
    input: { message: "Nasıl sipariş veririm?" },
    includes: ["web sitemiz üzerinden çok kolay", "Kapıda Ödeme seçeneği de web sitemizde aktif", "www.yudumjewels.com"],
  },
  {
    name: "IBAN isteyen müşteriye site yönlendirmesi yapılmaz",
    input: { message: "IBAN alabilir miyim?" },
    includes: ["IBAN:", "Alıcı:"],
    notIncludes: ["www.yudumjewels.com", "kartla"],
  },
  {
    name: "Mezar fiyat sorusu fiyat cevabına düşer",
    input: {
      message: "Evcil hayvan mezar taşı fiyatı nedir?",
      ilgilenilen_urun: "evcil_hayvan_mezar_tasi",
      user_product: "evcil_hayvan_mezar_tasi",
      context_lock: "1",
    },
    includes: ["Evcil Hayvan Mezar Taşı", "2 999", "kapıda ödeme seçeneği bulunmamaktadır"],
    notIncludes: ["0505", "Tabi efendim"],
  },
  {
    name: "Şeffaf kargo yok",
    input: { message: "Şeffaf kargo var mı?" },
    includes: ["şeffaf kargo", "bulunmamaktadır", "teslim alınmadan"],
    notIncludes: ["Aras", "fotoğrafını çekip atabiliriz"],
  },
  {
    name: "Kargom nerede operasyonel takibe düşer",
    input: completedLazer("Kargom nerede?"),
    includes: "ekibimize iletiyorum",
  },
  {
    name: "Türkiye geneli kargo cevabı",
    input: { message: "Her yere kargo var mı?" },
    includes: ["Türkiye", "kargo"],
    notIncludes: "Aras",
  },
  {
    name: "Ürünü görmeden ödeme yok",
    input: { message: "Ürünü görmeden ödeme yapmam" },
    includes: ["Üretim sonrası fotoğraf", "ödeme alma uygulamamız bulunmamaktadır"],
    notIncludes: ["ön izleme hazırlayalım", "paylaşabiliriz"],
  },
  {
    name: "Sipariş öncesi ön izleme yok",
    input: lazer("Ön izleme atar mısınız?"),
    includes: ["onay bekleyebileceğimiz", "yürütemiyoruz"],
    notIncludes: ["hazırlayalım", "göndeririz"],
  },
  {
    name: "Bitmiş ürün fotoğrafı paylaşılmaz",
    input: completedLazer("Bitince foto atar mısınız?"),
    includes: ["onay bekleyebileceğimiz", "yürütemiyoruz"],
    notIncludes: "paylaşabiliyoruz",
  },
  {
    name: "Lokasyon Beykoz ve mağaza yok",
    input: { message: "Yeriniz nerede mağazanız var mı?" },
    includes: ["Beykoz", "atölye", "mağazamız", "bulunmamaktadır"],
    notIncludes: "Eminönü",
  },
  {
    name: "Trendyol ve pazar yeri yok",
    input: { message: "Trendyol mağazanız var mı?" },
    includes: ["Instagram", "web"],
    notIncludes: ["Trendyol'dan alabilirsiniz", "mağazamız var"],
  },
  {
    name: "Altın/gümüş materyal değil renk",
    input: { message: "Altın mı gümüş mü?" },
    includes: ["altın veya gümüş değildir", "316L", "renk seçeneği"],
    notIncludes: ["14 ayar", "gümüş kaplama"],
  },
  {
    name: "Alerji sorusunda 316L ve alerji geçer",
    input: lazer("Alerjim var çelik mi?"),
    includes: ["316L", "Alerji"],
  },
  {
    name: "Zincir dahildir ama tek uç gönderilmez",
    input: lazer("Zincir dahil mi? Sadece kolye ucu olur mu?"),
    includes: ["zinciriyle birlikte", "Sadece kolye ucu", "gönderim yapmıyoruz"],
  },
  {
    name: "Plaka boyutu 3 cm",
    input: lazer("Boyutu ne kadar?"),
    includes: "3 cm",
  },
  {
    name: "İki plaka aynı zincirde olmaz",
    input: lazer("İki plaka aynı zincirde olur mu?"),
    includes: ["iki ayrı plaka", "yapmıyoruz", "çizebilir"],
    notIncludes: ["takılabiliyor", "farklı uzunlukta"],
  },
  {
    name: "İki kişi tek kolyeye olabilir",
    input: lazer("İki kişinin fotoğrafını tek kolyeye basar mısınız?"),
    includes: ["birden fazla kişi", "Fotoğraf"],
  },
  {
    name: "Fotoğraf birleştirme yok",
    input: lazer("İki ayrı fotoğrafı birleştirir misiniz?"),
    includes: ["Fotoğraf birleştirme", "bulunmamaktadır"],
  },
  {
    name: "WhatsApp sadece sorulursa numara verilir",
    input: { message: "WhatsApp var mı?" },
    includes: "0505 471 35 45",
  },
  {
    name: "WhatsApp sorulmadığında numara sızmaz",
    input: { message: "merhaba" },
    notIncludes: "0505 471 35 45",
  },
  {
    name: "Çoklu adet fiyat uydurmaz",
    input: lazer("2 tane istiyorum fiyat ne olur?"),
    includes: ["çoklu adet", "ekibimize iletiyorum"],
    notIncludes: ["1298", "1398", "1000"],
  },
  {
    name: "Ataç zincir uzatma yok",
    input: {
      message: "Ataç zincir 70 cm uzatılır mı?",
      ilgilenilen_urun: "atac",
      user_product: "atac",
      context_lock: "1",
      conversation_stage: "waiting_letters",
    },
    includes: ["50 cm", "tek zincir", "uzatma yapılmamaktadır"],
    notIncludes: ["70 cm", "ek ücret"],
  },
  {
    name: "Erkek kolye zinciri 55 cm",
    input: lazer("Erkek için zincir kaç cm?"),
    includes: ["erkek", "55 cm"],
    notIncludes: ["50 cm gümüş", "60 cm standarttır"],
  },
  {
    name: "Mezar taşında kapıda ödeme yok",
    input: {
      message: "Mezar taşı kapıda ödeme var mı?",
      ilgilenilen_urun: "evcil_hayvan_mezar_tasi",
      user_product: "evcil_hayvan_mezar_tasi",
      context_lock: "1",
    },
    includes: ["kapıda ödeme", "bulunmamaktadır"],
    notIncludes: ["Tabi efendim", "0505"],
  },
  {
    name: "Ürün örnekleri site ve profil cevabına düşer",
    input: { message: "Ürün örnekleri var mı?" },
    includes: ["profilimizde", "www.yudumjewels.com"],
    notIncludes: "Hangi model",
  },
  {
    name: "Elden teslim yok",
    input: { message: "Elden teslim alabilir miyim?" },
    includes: ["atölye", "elden teslim", "bulunmamaktadır"],
  },
  {
    name: "Hediye notu arka yazıya karışmaz",
    input: lazer("Hediye notu ekler misiniz?"),
    includes: ["Paket içine", "not ekleme", "bulunmamaktadır"],
    notIncludes: ["arka yüze", "dua"],
  },
  {
    name: "Kapıda kartta adres istemez",
    input: {
      message: "Kapıda kartla ödeme var mı?",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      context_lock: "1",
      conversation_stage: "waiting_payment",
    },
    includes: ["kredi kartı geçerli değildir", "yalnızca nakit"],
    notIncludes: ["adres", "Ad soyad"],
  },
  {
    name: "Arka yüze ikinci fotoğraf arka yazıya karışmaz",
    input: lazer("Arkasına başka resim olabilir mi?", {
      conversation_stage: "waiting_payment",
    }),
    includes: ["arka yüze", "ikinci bir fotoğraf", "ek ücret alınmamaktadır"],
    notIncludes: ["arka yazı notu", "Ödeme tercihinizi"],
  },
  {
    name: "Düzenleyince görebilir miyim ön izleme reddine düşer",
    input: lazer("Düzenleyince görebilir miyim?", {
      conversation_stage: "waiting_address",
    }),
    includes: ["onay bekleyebileceğimiz", "yürütemiyoruz"],
    notIncludes: ["www.yudumjewels.com"],
  },
  {
    name: "Fotoğraf netliği cevabı kırpılmaz",
    input: lazer("Tam net çıkar mı fotoğraf kalitesi?", {
      conversation_stage: "waiting_payment",
    }),
    includes: ["Gerekli netleştirmeyi", "net fotoğraf göndermeniz yeterlidir"],
  },
  {
    name: "Havale seçimi adres cümlesini kırpmaz",
    input: lazer("Ücreti havale ödeyeceğim", {
      conversation_stage: "waiting_address",
    }),
    includes: ["EFT ile ilerleyebiliriz", "açık adresinizi iletebilirsiniz"],
  },
  {
    name: "Aksesuar fiyat farkı yok",
    input: lazer("Yanına figür koydurunca fiyat değişiyor mu?"),
    includes: ["fiyat değişmiyor", "ücretsizdir"],
    notIncludes: "Güncel Fiyat Listemiz",
  },
  {
    name: "İki kişi aynı kolyede fiyat değiştirmez",
    input: lazer("Oğlumla kızım beraber olsa fiyat değişir mi?"),
    includes: ["fiyat değişmiyor", "Aynı fotoğrafta"],
    notIncludes: "Güncel Fiyat Listemiz",
  },
  {
    name: "İkisi ön yüzde ayrı fotoğraf birleştirmez",
    input: lazer("İkisi de ön yüzde olacak"),
    includes: ["tek fotoğrafta", "İki ayrı fotoğrafı birleştirme hizmetimiz bulunmamaktadır"],
  },
  {
    name: "Aksesuar sorusu adres akışına ezilmez",
    input: lazer("Kolyenin yanına böyle boncuk da koyma şansınız var mı", {
      conversation_stage: "waiting_address",
    }),
    includes: ["nazar boncuğu", "ücretsizdir"],
    notIncludes: ["Ad soyad", "açık adres"],
  },
  {
    name: "Ataç isimli harf açıklaması",
    input: {
      message: "Harfli modelinizi isimli olarak yapıyor musunuz peki",
      ilgilenilen_urun: "atac",
      user_product: "atac",
      context_lock: "1",
      conversation_stage: "waiting_letters",
    },
    includes: ["3 harf", "her ek harf", "+50"],
  },
  {
    name: "İki resim ön arka fotoğrafa düşer",
    input: lazer("Peki ben 1 tane zincire 2 tane resim bastırsam olur mu"),
    includes: ["ön ve arka yüze", "farklı fotoğraf", "ek ücret alınmamaktadır"],
    notIncludes: ["Güncel Fiyat Listemiz", "Kapıda Ödeme: 699"],
  },
  {
    name: "İsimsiz hazırlanabilir",
    input: lazer("İsimsiz mi yapılır"),
    includes: ["isimsiz", "zorunlu değildir"],
  },
  {
    name: "Son olarak sorusunda fotoğraf istemez",
    input: lazer("Peki son olarak"),
    includes: "buyurun",
    notIncludes: "Fotoğrafınızı",
  },
  {
    name: "Henüz sipariş vermeyeceğim sakin kapanır",
    input: lazer("Henüz sipariş vermeyeceğim"),
    includes: ["ne zaman isterseniz", "yazabilirsiniz"],
    notIncludes: "Fotoğrafınızı",
  },
  {
    name: "Bekliyorum müşteriye fotoğraf göndermeyi teklif etmez",
    input: lazer("Bekliyorum"),
    includes: "Tabii efendim",
    notIncludes: ["Fotoğraf göndereyim", "Fotoğrafınızı"],
  },
  {
    name: "Tarih içeren kısa metin arka yazıdır",
    input: lazer("Metehan 13 01 2026"),
    // Yeni davranış: arka yazı sessizce kabul edilir ("aldım" DENMEZ), fotoğrafa yönlendirilir.
    includes: "Tabi efendim",
    notIncludes: ["aldım", "Fallback"],
  },
  {
    name: "Silinme sorusunda silinmez cevabı",
    input: lazer("Zamanla silinme ihtimali var mı"),
    includes: ["silinmez", "316L"],
    notIncludes: "14 ayar",
  },
  {
    name: "Otomatik mesaj sorusuna menü eklenmez",
    input: { message: "Cevap mı veriyorsunuz yoksa otomatik mi anlamadım" },
    includes: ["otomatik mesajla", "Ekibimiz"],
    notIncludes: "Hangi model",
  },
  {
    name: "Tamamlanmış siparişte bitince fotoğraf paylaşılmaz",
    input: completedLazer("Bitince fotoğrafını atar mısınız?"),
    includes: ["onay bekleyebileceğimiz", "yürütemiyoruz"],
    notIncludes: "Ekibimize iletiyorum",
  },
  {
    name: "Ataç modelinde fotoğraf yok",
    input: {
      message: "Ataç kolyeye fotoğraf olur mu?",
      ilgilenilen_urun: "atac",
      user_product: "atac",
      context_lock: "1",
      conversation_stage: "waiting_letters",
    },
    includes: ["Harfli Ataç Kolye", "fotoğraf kullanılmamaktadır", "sadece harf"],
    notIncludes: "Yapılmasını istediğiniz harfleri",
    expect: { ilgilenilen_urun: "atac" },
  },
  {
    name: "PTT ve SMS kargo bilgisi korunur",
    input: { message: "PTT ile mi geliyor, kargoya verilince SMS gelir mi?" },
    includes: ["PTT Kargo", "SMS", "kargo ücretsizdir"],
    notIncludes: ["Aras", "şeffaf kargo"],
  },
  {
    name: "Kapıda ödeme sadece nakit, kart yok",
    input: { message: "Kapıda ödeme nakit mi kart olur mu?" },
    includes: ["kredi kartı geçerli değildir", "yalnızca nakit"],
    notIncludes: ["Ad soyad", "açık adres"],
  },
  {
    name: "Renkli baskı değil lazer işleme",
    input: lazer("Fotoğraf renkli mi basılıyor?"),
    includes: ["renkli baskı değildir", "lazer işleme", "metal yüzeye"],
    notIncludes: ["renkli farketmez", "Fotoğrafınızı buradan"],
  },
  {
    name: "Sticker/boya/çıkartma sorusu lazer işleme cevabına düşer",
    input: lazer("Bu baskı mı sticker mı?"),
    includes: ["baskı, sticker, boya", "çıkartma değildir"],
    notIncludes: "Fotoğrafınızı buradan iletebilirsiniz",
  },
  {
    name: "Ataç arka yazı kabul etmez",
    input: atac("Harfli ataçta arka yüze yazı olur mu?"),
    includes: ["Ataç kolyede", "arka yazı bulunmamaktadır"],
    notIncludes: ["arka yüze isim", "ücretsizdir"],
    expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" },
  },
  {
    name: "Ataç bileklik hediyesi ürün state'ini bilekliğe kaydırmaz",
    input: atac("Harfli ataç bileklik hediyeli mi?"),
    includes: ["aynı model bileklik", "hediye"],
    expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" },
  },
  {
    name: "Harfli model görsel talebi site/profil örneklerine gider",
    input: atac("Harfli modeli görebilir miyim?"),
    includes: ["profilimizde", "www.yudumjewels.com"],
    notIncludes: ["ön izleme", "hazırlayamıyoruz"],
    expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" },
  },
  {
    name: "Zincir kalınlığı sorusu standart model ve plaka kalınlığına düşer",
    input: lazer("Zincir kalınlığı ne kadar?"),
    includes: ["tek standart model", "0,8 mm", "paslanmaz çeliktir"],
    notIncludes: ["14 ayar", "gümüş kaplama"],
  },
  {
    name: "Uzun zincir isteği özel ölçü yapılmaz cevabına düşer",
    input: lazer("Kısa istemiyorum göğse kadar uzun olsun"),
    includes: ["60 cm", "55 cm", "Özel ölçüde", "uzatma"],
    notIncludes: ["yapabiliriz", "ek ücret"],
  },
  {
    name: "Attığım zincir sayfada yok sorusu fotoğraf istemez",
    input: lazer("Attığım zinciri sayfanızda bulamadım"),
    includes: ["standart zincir", "Farklı zincir modeli", "bulunmamaktadır"],
    notIncludes: "Fotoğrafınızı buradan",
  },
  {
    name: "Net değil fotoğraf sorusu düzenleme cevabına düşer",
    input: lazer("Bu resim net değil sanki olur mu?"),
    includes: ["Gerekli netleştirmeyi", "arka plan temizliği", "net fotoğraf"],
    notIncludes: "Ad soyad",
  },
  {
    name: "Fotoğrafı buradan mı sorusu WhatsApp sızdırmaz",
    input: lazer("Fotoğrafı buradan mı göndereceğim?"),
    includes: ["Buradan direkt iletebilirsiniz"],
    notIncludes: ["0505 471 35 45", "WhatsApp"],
  },
  {
    name: "Kişi sayısı sorusu sınırsız kişi cevabına düşer",
    input: lazer("Kaç kişilik resim olur diye soruyorum"),
    includes: ["kişi sayısında", "sınır yoktur"],
    notIncludes: ["Ekibimize iletiyorum", "Ad soyad"],
  },
  {
    name: "Soruma cevap alamadım operatöre düşer",
    input: lazer("Soruma cevap alamadım"),
    includes: "Ekibimize iletiyorum",
    expect: { support_mode: "1", reply_class: "operational_required" },
  },
  {
    name: "Kargo gecikmesi operatöre düşer",
    input: completedLazer("1 hafta oldu kargom gelmedi"),
    includes: "Ekibimize iletiyorum",
    expect: { support_mode: "1", reply_class: "operational_required" },
  },
  {
    name: "Tek kolyeye iki uç talebi iki plaka kuralına düşer",
    input: lazer("Tek kolyeye iki uç takar mısınız?"),
    includes: ["iki ayrı plaka", "yapmıyoruz", "çizebilir"],
    notIncludes: ["takabiliriz", "iki uç olur"],
  },
  {
    name: "Yapılmış resimler örnek/site cevabına düşer",
    input: lazer("Yapılmış resimleriniz var mı bakabilir miyim?"),
    includes: ["profilimizde", "www.yudumjewels.com"],
    notIncludes: ["ön izleme", "hazırlayamıyoruz"],
  },
  {
    name: "Beykoz atölye bilgisi elden teslim vaadi vermez",
    input: { message: "Beykoz'da mağazanız var mı elden alabilir miyim?" },
    includes: ["Beykoz", "atölye", "elden teslim", "bulunmamaktadır"],
    notIncludes: ["gelebilirsiniz", "mağazamız var"],
  },
  {
    name: "Sadece tek uç fiyatı istenince zincirsiz satış açılmaz",
    input: lazer("Tek uç fiyatı nedir zincirsiz alabilir miyim?"),
    includes: ["zinciriyle birlikte", "Sadece kolye ucu", "gönderim yapmıyoruz"],
    notIncludes: ["tek uç fiyatı", "zincirsiz gönderebiliriz"],
  },
  {
    name: "Ürün altın zincir değil renk seçeneğidir",
    input: lazer("Kolye zincir altın değil mi sordum"),
    includes: ["altın veya gümüş değildir", "316L", "renk seçeneği"],
    notIncludes: ["14 ayar", "altın kaplama"],
  },
  {
    name: "Mezar taşı kapıda ödeme seçeneğini açmaz",
    input: {
      message: "Mezar taşı için kapıda nakit ödeyebilir miyim?",
      ilgilenilen_urun: "evcil_hayvan_mezar_tasi",
      user_product: "evcil_hayvan_mezar_tasi",
      context_lock: "1",
    },
    includes: ["Evcil Hayvan Mezar Taşı", "kapıda ödeme", "bulunmamaktadır"],
    notIncludes: ["Kapıda ödeme ile ilerleyebiliriz", "Ad soyad"],
  },
  {
    name: "Fotoğrafımı aldınız mı sorusu fotoğraf status cevabına düşer",
    input: lazer("Fotoğrafımı aldınız mı almadınız mı"),
    includes: ["Henüz fotoğrafınız ulaşmadı"],
    notIncludes: ["Fotoğrafınızı buradan iletebilirsiniz", "Ödeme tercihinizi"],
  },
  {
    name: "Siparişim alındı mı sorusu teşekkür cevabına düşmez",
    input: lazer("Teşekkürler. Siparisim alindi mi yani", {
      conversation_stage: "waiting_address",
    }),
    includes: ["Siparişinizi tamamlamak", "ad soyad", "cep telefonu", "açık adres"],
    notIncludes: ["Rica ederiz", "siparişiniz alınmıştır"],
  },
  {
    name: "Siteye giremiyorum sorusu ödeme/adres akışına ezilmez",
    input: lazer("Sitenize giriş yapamiyorum", {
      conversation_stage: "waiting_payment",
    }),
    includes: ["www.yudumjewels.com", "Instagram üzerinden"],
    notIncludes: ["Ödeme tercihinizi", "Ad soyad"],
  },
  {
    name: "Görseli görme şansı sipariş öncesi ön izleme reddine düşer",
    input: lazer("Görseli görme şanşım var mı acana", {
      conversation_stage: "waiting_payment",
    }),
    includes: ["onay bekleyebileceğimiz", "yürütemiyoruz"],
    notIncludes: ["Ödeme tercihinizi", "Ad soyad"],
  },
  {
    name: "Harfli olanlar nasıl sorusu örnek/site cevabına düşer",
    input: atac("Harfli olanlr nasillar"),
    includes: ["profilimizde", "www.yudumjewels.com"],
    notIncludes: ["Yapılmasını istediğiniz harfleri", "EFT"],
    expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" },
  },
  {
    name: "Ataç bağlamında resim atacağım ürünü lazere kaydırmaz",
    input: atac("En yakın zamanda resim atacağım"),
    includes: ["fotoğraf kullanılmamaktadır", "sadece harf"],
    expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" },
  },
  {
    name: "Fotoğraf birleştirme talebi arka foto cevabına kaçmaz",
    input: lazer("Bir size fotoğraf atarsak siz birleştirip yaparmisiniz"),
    includes: ["Fotoğraf birleştirme", "bulunmamaktadır"],
    notIncludes: ["arka yüzüne ikinci bir fotoğraf", "Bir yüzeyde aynı anda"],
  },
  {
    name: "Replay: yazım hatalı eski sipariş menüye dönmez",
    input: { message: "Bnm siparşim vardi zatn", conversation_stage: "waiting_product" },
    includes: "Ekibimize iletiyorum",
    notIncludes: "Hangi ürün ile ilgileniyorsunuz",
    expect: { support_mode: "1", reply_class: "operational_required" },
  },
  {
    name: "Replay: waiting_product sipariş durumu menüye dönmez",
    input: { message: "Siparişim daha hazirlanmadi mi", conversation_stage: "waiting_product" },
    includes: "Ekibimize iletiyorum",
    notIncludes: "Hangi ürün ile ilgileniyorsunuz",
    expect: { support_mode: "1", reply_class: "operational_required" },
  },
  {
    name: "Replay: mesajlarımı okur musunuz operatöre düşer",
    input: { message: "Lütfen mesajlrımı okurmusunuz", conversation_stage: "waiting_product" },
    includes: "Ekibimize iletiyorum",
    notIncludes: "Hangi ürün ile ilgileniyorsunuz",
    expect: { support_mode: "1", reply_class: "operational_required" },
  },
  {
    name: "Replay: fyt kısaltması fiyat listesine düşer",
    input: { message: "Fyt rica etsem", conversation_stage: "waiting_product" },
    includes: ["649", "549", "2 999"],
    notIncludes: "Merhaba efendim",
  },
  {
    name: "Replay: hukuki tehdit ödeme promptuna düşmez",
    input: lazer("Tamam hocam ben simdi savciliga gidecegim oraya anlatirsiniz artik", {
      conversation_stage: "waiting_payment",
      photo_received: "1",
    }),
    includes: ["insan temsilcimize", "yönlendiriyorum"],
    notIncludes: "Ödeme tercihinizi",
    expect: { support_mode: "1", reply_class: "operational_required" },
  },
  {
    name: "Replay: bozuk yazılmış cevap şikayeti adres promptuna düşmez",
    input: lazer("Yahuu saana ne ssorruyoreum sen ne cxcevao vertiyyorsun", {
      conversation_stage: "waiting_address",
      photo_received: "1",
      payment_method: "kapida_odeme",
    }),
    includes: "Ekibimize iletiyorum",
    notIncludes: "Ad soyad",
    expect: { support_mode: "1", reply_class: "operational_required" },
  },
  {
    name: "Replay: fotoğraf talimatındaki kemer ürünü akışı bozmaz",
    input: lazer("Kemerler gorunmicek sekilde yapabilirmisiniz", {
      conversation_stage: "waiting_payment",
      photo_received: "1",
    }),
    includes: "Ödeme tercihinizi",
    notIncludes: ["www.yudumjewels.com", "çok daha fazla ürün çeşidimiz"],
    expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_payment" },
  },
];

const result = await runSuite("CURRENT_KNOWLEDGE", cases);
process.exit(result.fail > 0 ? 1 : 0);
