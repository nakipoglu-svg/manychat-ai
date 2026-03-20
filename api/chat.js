import fs from "fs";
import path from "path";

function readKnowledgeFile(filename) {
  const filePath = path.join(process.cwd(), "knowledge", filename);
  return fs.readFileSync(filePath, "utf8");
}

function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .trim();
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function pickKnowledgeFiles(message, userProduct) {
  const msg = normalizeText(message);
  const product = normalizeText(userProduct);
  const files = ["core_system.txt"];

  // Önce ürün tag/custom field bilgisi
  if (product.includes("lazer")) {
    files.push("product_laser.txt");
  }

  if (product.includes("atac") || product.includes("ataç") || product.includes("harf")) {
    files.push("product_atac.txt");
  }

  // Sonra mesaj içeriği
  const laserKeywords = ["lazer","lazer kolye","lazerli kolye","lazer kolye nedir","lazer kolye nasil","lazer kolye nasıl","lazer kolye bilgi","lazer kolye detay","lazerli","laser","laser kolye","laser necklace","resimli","resimli kolye","resimli kolye nasil","resimli kolye nasıl","resimli kolye bilgi","resimli kolye detay","fotolu","fotolu kolye","foto kolye","fotograf kolye","fotoğraf kolye","resim kolye","resimle kolye","resim koyma","resim koyabiliyor muyuz","resim koyabilir miyim","resim koyulur mu","resim ekleniyor mu","resim ekleyebilir miyim","foto eklenir mi","foto ekleyebilir miyim","foto koyabilir miyim","foto koyulur mu","fotograf eklenir mi","fotoğraf eklenir mi","fotograf koyabilir miyim","fotoğraf koyabilir miyim","resim yukleme","resim yükleme","foto yukleme","foto yükleme","resim gonderme","resim gönderme","foto gonderme","foto gönderme","resim atma","foto atma","resim nasil atilir","resim nasıl atılır","foto nasil atilir","foto nasıl atılır","foto nereden gonderilir","foto nereden gönderilir","resim nereden gonderilir","resim nereden gönderilir","resim nasil gonderilir","resim nasıl gönderilir","foto nasil gonderilir","foto nasıl gönderilir","foto kalitesi","foto kalite","foto kaliteli mi","resim kaliteli mi","foto net mi","resim net mi","foto bulanık olur mu","resim bulanık olur mu","foto duzeltilir mi","resim duzeltilir mi","fotoğraf duzeltilir mi","arka plan siliniyor mu","arka plan silinir mi","arka plan temizlenir mi","arka plan kaldırılır mı","arka plan yok edilir mi","arka plan sifirlanir mi","arka plan silme","resim duzenleme","resim düzenleme","foto duzenleme","foto düzenleme","fotoğraf düzenleme","foto netlestirme","foto netleştirme","resim netlestirme","resim netleştirme","iki kisi","iki kişi","2 kisi","2 kişi","uc kisi","üç kişi","3 kisi","3 kişi","dort kisi","dört kişi","4 kisi","4 kişi","bes kisi","beş kişi","5 kisi","5 kişi","birden fazla kisi","birden fazla kişi","coklu kisi","coklu kişi","iki resim","2 resim","iki foto","2 foto","iki fotograf","iki fotoğraf","birden fazla resim","birden fazla foto","cift taraf","cift tarafli","çift taraf","çift taraflı","arka tarafa foto","arka tarafina foto","arka yuz","arka yüz","arka kismina foto","arka kısmına foto","arkali onlu","arkalı önlü","ön arka foto","on arka foto","onlu arkali","önlü arkalı","foto arkasi","foto arkası","foto arka taraf","foto arka tarafina","resim arkasi","resim arkası","resim arka taraf","resim arka tarafina","arkaya yazi","arkaya yazı","yazi yaziliyor mu","yazı yazılıyor mu","yazi eklenir mi","yazı eklenir mi","yazi koyulur mu","yazı koyulur mu","yazi basilir mi","yazı basılır mı","foto uzerine yazi","foto üzerine yazı","resim uzerine yazi","resim üzerine yazı","kolyeye foto","koleye foto koyma","kolyeye resim koyma","kolyeye foto ekleme","kolyeye resim ekleme"];
  if (includesAny(msg, laserKeywords)) {
    files.push("product_laser.txt");
  }

  const atacKeywords = ["atac","ataç","atac kolye","ataç kolye","atac kolye nedir","ataç kolye nedir","atac kolye nasil","ataç kolye nasıl","atac kolye bilgi","ataç kolye bilgi","atac kolye detay","ataç kolye detay","harf","harfli","harf kolye","harfli kolye","harf kolye nedir","harf kolye nasil","harf kolye nasıl","harfli kolye nasil","harfli kolye nasıl","isim","isim kolye","isimli kolye","isim kolye nedir","isim kolye nasil","isim kolye nasıl","isim yazili kolye","isim yazılı kolye","isim yazdirma","isim yazdırma","isim ekleme","isim koyma","isim yazilir mi","isim yazılır mı","isim basilir mi","isim basılır mı","isim kac harf","isim kaç harf","harf kac tane","harf kaç tane","harf siniri","harf sınırı","kac harf oluyor","kaç harf oluyor","harf eklenir mi","harf ekleme","harf koyma","harf yazma","harf yazilir mi","harf yazılır mı","bas harf","baş harf","ilk harf","tek harf","2 harf","iki harf","3 harf","uc harf","üç harf","4 harf","dort harf","dört harf","5 harf","bes harf","beş harf","harf sayisi","harf sayısı","harf ucreti","harf ücreti","harf fiyat","harf fiyatı","harf ek ucret","harf ek ücret","harf basina ucret","harf başına ücret","harf ekleme fiyat","harf ekleme fiyatı","zincir","zincir uzunluk","zincir uzunluğu","zincir boyu","zincir kac cm","zincir kaç cm","zincir uzun","zincir uzun mu","zincir kisaltilir mi","zincir kısaltılır mı","zincir uzatilir mi","zincir uzatılır mı","zincir degisir mi","zincir değişir mi","zincir farkli olur mu","zincir farklı olur mu","zincir secimi","zincir seçimi","kolye zinciri","kolye zinciri uzunluk","kolye zinciri uzunluğu","kolye boyu","kolye kac cm","kolye kaç cm","kolye uzunluk","kolye uzunluğu","kolye uzun mu","kolye kisa mi","kolye kısa mı","kolye boyu ayarlanir mi","kolye boyu ayarlanır mı"];
  if (includesAny(msg, atacKeywords)) {
    files.push("product_atac.txt");
  }

  const pricingKeywords = ["fiyat","fiyatt","fiyattı","fiyatı","fiyati","fiyatlar","fiyatlari","fiyatları","fiyati ne","fiyatı ne","fiyat ne","fiyat nedir","fiyat kac","fiyat kaç","fiyat kac tl","fiyat kaç tl","fiyat ne kadar","fiyat ne kadar?","fiyat ne kadar.","fiyat ne kadar!","fiyat bilgisi","fiyat ogrenmek","fiyat öğrenmek","fiyat soylermisiniz","fiyat söyler misiniz","fiyat atar misin","fiyat atar mısın","fiyat verir misin","fiyat verirmisin","ucret","ücret","ucrett","ucreti","ücreti","ucret ne","ucret nedir","ücret nedir","ucret kac","ücret kaç","ucret kac tl","ücret kaç tl","ucret ne kadar","ücret ne kadar","ucret bilgisi","ücret bilgisi","ucret soylermisin","ücret söyler misin","ne kadar","ne kadar?","nekadar","ne kadar bu","ne kadar bu?","ne kadar tutar","ne kadar tutuyor","ne kadar oluyor","ne kadar olur","ne kadar fiyat","ne kadar ücreti","bu ne kadar","bu kac tl","bu kaç tl","bu ne kadar","bu fiyat ne kadar","urun ne kadar","ürün ne kadar","urun kac tl","ürün kaç tl","kac tl","kaç tl","kac para","kaç para","kac lira","kaç lira","kac tl oluyor","kaç tl oluyor","kac tl tutar","kaç tl tutar","kac tl olur","kaç tl olur","kac para tutar","kaç para tutar","kapida odeme fiyat","kapıda ödeme fiyat","kapida odeme kac","kapıda ödeme kaç","kapida odeme ne kadar","kapıda ödeme ne kadar","kapida odeme kac tl","kapıda ödeme kaç tl","kapida odeme fiyat ne","kapıda ödeme fiyat ne","eft fiyat","eft ucret","eft ücret","eft kac","eft kaç","eft ne kadar","eft kac tl","eft kaç tl","eft fiyat ne","eft ile fiyat","eft ile ne kadar","indirim","indirim var mi","indirim var mı","indirim olur mu","indirim yapar misiniz","indirim yapar mısınız","indirim yaparmisin","indirim yaparmısın","pazarlik","pazarlık","pazarlik var mi","pazarlık var mı","pazarlik olur mu","pazarlık olur mu","son fiyat","son fiyat ne","son fiyat nedir","son fiyat kac","son fiyat kaç","son fiyat ne kadar","son fiyat ne kadar olur","biraz indirim","biraz indirim yap","biraz dusur","biraz düşür","uygun olur mu","uygun fiyat olur mu","fiyat dusurur musun","fiyat düşürür müsün"];
  if (includesAny(msg, pricingKeywords)) {
    files.push("pricing.txt");
  }

  const shippingKeywords = ["kargo","kargoo","kargooo","kargoooo","kargı","kargp","kagro","karog","kargo?","kargo!","kargo.","kargo nasil","kargo nasıl","kargo nasil geliyor","kargo nasıl geliyor","kargo nasil yapiliyor","kargo nasıl yapılıyor","kargo nasil gonderiliyor","kargo nasıl gönderiliyor","kargo nasil gonderim","kargo nasıl gönderim","kargo nasil yollaniyor","kargo nasıl yollanıyor","kargo hangi firma","kargo hangi firmayla","kargo hangi kargo","kargo hangi sirket","kargo hangi şirket","kargo firmasi","kargo firması","kargo sirketi","kargo şirketi","kargo ile mi","kargo ile geliyor mu","kargo ile mi geliyor","kargo ucretsiz mi","kargo ücretsiz mi","kargo parali mi","kargo paralı mı","kargo kac gun","kargo kaç gün","kargo kac gunde","kargo kaç günde","kargo ne kadar sure","kargo ne kadar süre","kargo ne zaman gelir","kargo ne zaman gelir","kargo ne zaman ulasir","kargo ne zaman ulaşır","kargo takibi","kargo takip","kargo takip var mi","kargo takip var mı","kargo sms","kargo mesaj geliyor mu","kargo mesaj","kargo bildirimi","kargo bilgilendirme","kargo bilgisi","kargo durumu","kargo sureci","kargo süreci","kargo teslim","kargo teslimat","kargo teslimat süresi","kargo teslim süresi","kargo ne kadar surer","kargo ne kadar sürer","kargo ne kadar zamanda gelir","kargo ne kadar zamanda gelir","gonderim","gönderim","gonderim nasil","gönderim nasıl","gonderim nasil oluyor","gönderim nasıl oluyor","gonderim nasil yapiliyor","gönderim nasıl yapılıyor","gonderim nasil yapıyorsunuz","gönderim nasıl yapıyorsunuz","gonderim nasil gonderiliyor","gönderim nasıl gönderiliyor","gonderim hangi kargo","gönderim hangi kargo","gonderim hangi firma","gönderim hangi firma","gonderim ne kadar","gönderim ne kadar","gonderim kac gunde","gönderim kaç günde","gonderim kac gun","gönderim kaç gün","gonderim ne zaman gelir","gönderim ne zaman gelir","gonderim sure","gönderim süre","gonderim suresi","gönderim süresi","gonderim takibi","gönderim takibi","gonderim takip","gönderim takip","gonderim sms","gönderim sms","gonderim bilgisi","gönderim bilgisi","nasil gonderiyorsunuz","nasıl gönderiyorsunuz","nasil yolluyorsunuz","nasıl yolluyorsunuz","nasil geliyor","nasıl geliyor","nasil ulasiyor","nasıl ulaşıyor","hangi kargo","hangi firmayla","hangi sirketle","hangi şirketle","ptt","ptt kargo","aras","aras kargo","kargo secimi","kargo seçimi","kargo degisir mi","kargo değişir mi","kargo farkli olabilir mi","kargo farklı olabilir mi","kargo degistirebilir miyim","kargo değiştirebilir miyim","kargo tercihi","kargo tercihi yapabilir miyim","kargo secilebilir mi","kargo seçilebilir mi"];
  if (includesAny(msg, shippingKeywords)) {
    files.push("shipping.txt");
  }

  const paymentKeywords = ["odeme","ödeme","odeme nasil","ödeme nasıl","odeme nasil yapilir","ödeme nasıl yapılır","odeme nasil yapiliyor","ödeme nasıl yapılıyor","odeme nasil yapiyorsunuz","ödeme nasıl yapıyorsunuz","odeme sekli","ödeme şekli","odeme secenekleri","ödeme seçenekleri","odeme yontemi","ödeme yöntemi","odeme turu","ödeme türü","nasil odeme yapicam","nasıl ödeme yapacağım","nasil odeme yapacagim","nasıl ödeme yapacağım","odeme yapicam","ödeme yapacağım","odeme nasil olacak","ödeme nasıl olacak","odeme nasil olur","ödeme nasıl olur","odeme nasil yapilir detay","ödeme nasıl yapılır detay","odeme bilgisi","ödeme bilgisi","odeme detay","ödeme detay","odeme detaylari","ödeme detayları","odeme anlatir misin","ödeme anlatır mısın","odeme aciklar misin","ödeme açıklar mısın","odeme konusunda bilgi","ödeme konusunda bilgi","odeme nasil gerceklesir","ödeme nasıl gerçekleşir","odeme nasil oluyor","ödeme nasıl oluyor","odeme islemi","ödeme işlemi","odeme islemi nasil","ödeme işlemi nasıl","iban","iban nedir","iban atar misin","iban atar mısın","iban gonder","iban gönder","iban ver","iban verir misin","iban verir misiniz","iban numarasi","iban numarası","iban bilgisi","iban bilgileri","iban lazim","iban lazım","iban at","iban yaz","iban atabilir misin","iban atabilir misiniz","hesap numarasi","hesap numarası","hesap bilgisi","hesap bilgileri","banka bilgisi","banka bilgileri","banka hesap","banka hesabi","banka hesabı","eft","eft nasil","eft nasıl","eft ile","eft ile odeme","eft ile ödeme","eft yapicam","eft yapacağım","eft yapacagim","eft nasil yapilir","eft nasıl yapılır","eft detay","eft bilgisi","eft kac","eft kaç","eft ucret","eft ücret","eft fiyat","havale","havale nasil","havale nasıl","havale ile","havale ile odeme","havale ile ödeme","havale yapicam","havale yapacağım","havale nasil yapilir","havale nasıl yapılır","havale detay","havale bilgisi","kapida odeme","kapıda ödeme","kapida odeme var mi","kapıda ödeme var mı","kapida odeme oluyor mu","kapıda ödeme oluyor mu","kapida odeme nasil","kapıda ödeme nasıl","kapida odeme nasil oluyor","kapıda ödeme nasıl oluyor","kapida odeme secenegi","kapıda ödeme seçeneği","kapida odeme ile","kapi da odeme","kapi da ödeme","kapida odeme kac","kapıda ödeme kaç","kapida odeme ucret","kapıda ödeme ücret","kapida odeme fark","kapıda ödeme fark","kapida odeme detay","kapıda ödeme detay","odeme yapmadan","ödeme yapmadan","once odeme","önce ödeme","sonra odeme","sonra ödeme","odeme aliyor musunuz","ödeme alıyor musunuz","odeme aliyor musun","ödeme alıyor musun"];
  if (includesAny(msg, paymentKeywords)) {
    files.push("payment.txt");
  }

  const orderFlowKeywords = ["siparis","sipariş","siparis ver","sipariş ver","siparis vermek istiyorum","sipariş vermek istiyorum","siparis vericem","sipariş vereceğim","siparis verecegim","sipariş vereceğim","siparis olustur","sipariş oluştur","siparis olusturalim","sipariş oluşturalım","siparis acalim","sipariş açalım","siparis baslatalim","sipariş başlatalım","satin al","satın al","satin almak istiyorum","satın almak istiyorum","satin alicam","satın alacağım","satin alacagim","satın alacağım","almak istiyorum","almak istiyorum","bunu alicam","bunu alacağım","bunu alacagim","bunu alacağım","hemen alayim","hemen alayım","bunu istiyorum","bunu istiyorum","bunu aliyorum","bunu alıyorum","almak istiyorum nasil","nasıl alirim","nasıl alırım","nasil siparis verilir","nasıl sipariş verilir","nasil siparis vericem","nasıl sipariş vereceğim","nasil satin alirim","nasıl satın alırım","nasil satin alicam","nasıl satın alacağım","adres vereyim","adres vereyim mi","adres atayim","adres atayım","adres bilgisi","adres bilgilerim","adres gonderiyim","adres göndereyim","adres yazayim","adres yazayım","adresimi atayim","adresimi atayım","telefon vereyim","telefon numarasi","telefon numarası","numara vereyim","numara atayim","numara atayım","iletisim bilgisi","iletişim bilgisi","isim vereyim","isim soyisim","isim soyad","bilgilerimi atayim","bilgilerimi atayım","bilgileri gonderiyorum","bilgileri gönderiyorum","siparis icin bilgiler","sipariş için bilgiler","siparis bilgisi","sipariş bilgisi","siparis olusturmak","sipariş oluşturmak","siparis kaydi","sipariş kaydı","siparis baslat","sipariş başlat","siparis sureci","sipariş süreci","siparis nasil ilerler","sipariş nasıl ilerler","siparis nasil olacak","sipariş nasıl olacak"];
  if (includesAny(msg, orderFlowKeywords)) {
    files.push("order_flow.txt");
  }

  const imageRulesKeywords = ["foto","fotograf","fotoğraf","fotolu","resim","resimli","gorsel","görsel","foto atsam","foto atabilir miyim","foto gondereyim","foto göndereyim","resim atsam","resim gondersem","resim göndersem","foto nasil gonderilir","foto nasıl gönderilir","resim nasil gonderilir","resim nasıl gönderilir","foto nereden gonderilir","foto nereden gönderilir","resim nereden gonderilir","resim nereden gönderilir","foto kalitesi","foto kalite","resim kalitesi","resim kalite","foto net mi","resim net mi","foto bulanik","foto bulanık","resim bulanık","resim bulanık mı","foto karanlik","foto karanlık","resim karanlık","resim uzak","foto uzak","yuz net mi","yüz net mi","yuz belli olur mu","yüz belli olur mu","arka plan","arka plan silinir mi","arka plan temizlenir mi","arka plan kalkar mi","arka plan kalkar mı","arka fon silinir mi","foto duzenleme","foto düzenleme","resim duzenleme","resim düzenleme","netlestirme","netleştirme","foto netlestirme","foto netleştirme","resim netlestirme","resim netleştirme","iki resim","2 resim","iki foto","2 foto","iki fotograf","iki fotoğraf","iki kisi","iki kişi","2 kisi","2 kişi","uc kisi","üç kişi","3 kisi","3 kişi","dort kisi","dört kişi","4 kisi","4 kişi","bes kisi","beş kişi","5 kisi","5 kişi","birlestirme","birleştirme","iki resmi birlestirme","iki resmi birleştirme","iki fotograf birlestirme","iki fotoğraf birleştirme","tek kare","tek kare foto","tek kare fotograf","tek kare fotoğraf","cift taraf","cift tarafli","çift taraf","çift taraflı","arkali onlu","arkalı önlü","arka tarafa foto","arka tarafa da foto","arka yuze foto","arka yüze foto","arka kisma foto","arka kısma foto","arkaya yazi","arkaya yazı","foto uygun mu","resim uygun mu","foto olur mu","resim olur mu"];
  if (includesAny(msg, imageRulesKeywords)) {
    files.push("image_rules.txt");
  }

  const smalltalkKeywords = ["tesekkur","teşekkür","tesekkurler","teşekkürler","tesekkur ederim","teşekkür ederim","tesekkur ederiz","teşekkür ederiz","sagol","sağol","sagolun","sağolun","cok sagol","çok sağol","cok tesekkurler","çok teşekkürler","tesekkurler sagolun","teşekkürler sağolun","rica ederim","rica ederiz","okey","tamam","ok","anladim","anladım","anlasildi","anlaşıldı","super","süper","harika","iyi","iyi oldu","iyiymis","iyiymiş","iyi aksamlar","iyi akşamlar","iyi geceler","iyi gunler","iyi günler","gunaydin","günaydın","selam","selamlar","merhaba","hello","hi","naber","nasılsın","nasılsınız","iyiyim","iyiyiz","tekrar yazicam","tekrar yazacağım","sonra yazicam","sonra yazacağım","donucem","döneceğim","donus yapicam","dönüş yapacağım","gorusuruz","görüşürüz","gorusmek uzere","görüşmek üzere","hayirli olsun","hayırlı olsun","hayırlı işler","hayırlı satışlar","hayırlı günler","hayırlı geceler","basiniz sag olsun","başınız sağ olsun","bassagligi","başsağlığı","babami kaybettim","babamı kaybettim","yeni kaybettim","allah rahmet eylesin","allah sabir versin","allah sabır versin","gecmis olsun","geçmiş olsun","acil sifalar","acil şifalar","dogumum var","doğumum var","bebek bekliyorum","bebegim olacak","bebeğim olacak","insallah saglikla gelsin","inşallah sağlıklı gelsin","tebrikler","tebrik ederim","tebrik ederiz"];
  if (includesAny(msg, smalltalkKeywords)) {
    files.push("smalltalk.txt");
  }

  const trustKeywords = ["guven","güven","guvenilir","güvenilir","guvenilir mi","güvenilir mi","guvenli mi","güvenli mi","guvenilir misiniz","güvenilir misiniz","guvenebilir miyim","güvenebilir miyim","size guvenebilir miyim","size güvenebilir miyim","guven sorunu","güven sorunu","guven var mi","güven var mı","guven problemi","güven problemi","dolandirici","dolandırıcı","dolandirici misiniz","dolandırıcı mısınız","dolandiricilik","dolandırıcılık","gercek mi","gerçek mi","orjinal mi","orijinal mi","urun gercek mi","ürün gerçek mi","urun orjinal mi","ürün orijinal mi","saglam mi","sağlam mı","kaliteli mi","kaliteli mi","kalite nasil","kalite nasıl","kalitesi nasil","kalitesi nasıl","urun kaliteli mi","ürün kaliteli mi","bozulur mu","bozulur mu","kararir mi","kararır mı","kararma yapar mi","kararma yapar mı","solma yapar mi","solma yapar mı","paslanir mi","paslanır mı","renk atar mi","renk atar mı","uzun omurlu mu","uzun ömürlü mü","dayanikli mi","dayanıklı mı","su gecirir mi","su geçirir mi","denize girilir mi","denize girilir mi","duşa girilir mi","duşa girilir mi","garanti var mi","garanti var mı","garanti veriyor musunuz","iade var mi","iade var mı","iade oluyor mu","iade oluyor mu","iade edebilir miyim","iade edebilir miyim","degisim var mi","değişim var mı","degisim olur mu","değişim olur mu","sorun olursa ne olur","sorun olursa ne yapilir","sorun olursa ne yapılır","memnun kalmazsam","memnun kalmazsam ne olur","once goren var mi","önce gören var mı","daha once alan var mi","daha önce alan var mı","yorum var mi","yorum var mı","referans var mi","referans var mı","insta sayfa gercek mi","instagram sayfa gerçek mi","bu sayfa gercek mi","bu sayfa gerçek mi","siz kimsiniz","nereden gonderiyorsunuz","nereden gönderiyorsunuz","gercek satici misiniz","gerçek satıcı mısınız","magaza var mi","mağaza var mı","yeriniz var mi","yeriniz var mı","fiziksel magaza","fiziksel mağaza","adresiniz var mi","adresiniz var mı"];
  if (includesAny(msg, trustKeywords)) {
    files.push("trust.txt");
  }

  const deliveryTimeKeywords = ["kac gunde", "teslim", "teslimat", "sure", "takip"];
  if (includesAny(msg, deliveryTimeKeywords)) {
    files.push("delivery_time.txt");
  }

  return [...new Set(files)];
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "" });
    }

    let message = "";
    let userProduct = "";

    try {
      if (typeof req.body === "string") {
        const parsed = JSON.parse(req.body);
        message = parsed.message || "";
        userProduct = parsed.user_product || "";
      } else {
        message = req.body?.message || "";
        userProduct = req.body?.user_product || "";
      }
    } catch (e) {
      message = "";
      userProduct = "";
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ reply: "" });
    }

    const selectedFiles = pickKnowledgeFiles(message, userProduct);

    const knowledgeText = selectedFiles
      .map((file) => {
        const content = readKnowledgeFile(file);
        return `### ${file}\n${content}`;
      })
      .join("\n\n");

    const systemPrompt = `
Sen Yudum Jewels için çalışan bir Instagram satış asistanısın.

KURALLAR:
- Sadece verilen bilgi dosyalarına göre cevap ver.
- Bilmediğin konuda asla uydurma.
- Bilgi yoksa şu cevabı ver:
"Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"
- Kısa, net, doğal ve satış odaklı yaz.
- Eğer user_product doluysa bunu öncelikli ürün bilgisi kabul et.
- Müşteri sormadan gizli tutulması gereken ek ücretli veya opsiyonel bilgileri kendin söyleme.
- Ürün belirtilmemişse ve user_product da boşsa, cevap ürüne göre değişiyorsa hangi model ile ilgilendiğini sor.
- Müşteri sormadıkça ek ücretli veya opsiyonel bilgileri söyleme.
- Örneğin zincir uzatma, ek harf, arka yüze ekleme gibi bilgiler müşteri özel olarak sormadıkça belirtilmez.
- Müşteri sadece zincir boyunu sorarsa sadece standart zincir boyunu söyle.
- Cevap verirken yalnızca sorulan şeyi cevapla.
- Ek açıklama, öneri veya alternatif sunma.
`;

    const userPrompt = `
KULLANICI MESAJI:
${message}

KULLANICI ÜRÜN BİLGİSİ:
${userProduct}

KULLANILACAK EĞİTİM DOSYALARI:
${knowledgeText}
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 250,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    const reply =
      data?.content?.map((block) => block?.text || "").join(" ").trim() || "";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(200).json({ reply: "" });
  }
}
