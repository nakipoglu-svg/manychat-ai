import { runSuite } from "./_harness.js";

const base = (message, extra = {}) => ({
  message,
  policy_version: "v2",
  ilgilenilen_urun: "lazer",
  user_product: "lazer",
  context_lock: "1",
  order_status: "started",
  ...extra,
});

const waitingPhoto = (message, extra = {}) => base(message, {
  conversation_stage: "waiting_photo",
  ...extra,
});

const waitingPayment = (message, extra = {}) => base(message, {
  conversation_stage: "waiting_payment",
  photo_received: "1",
  ...extra,
});

const waitingAddress = (message, extra = {}) => base(message, {
  conversation_stage: "waiting_address",
  photo_received: "1",
  payment_method: "kapida_odeme",
  ...extra,
});

const completed = (message, extra = {}) => base(message, {
  conversation_stage: "order_completed",
  order_status: "completed",
  siparis_alindi: "1",
  photo_received: "1",
  payment_method: "kapida_odeme",
  address_status: "received",
  phone_received: "1",
  ...extra,
});

const emptyV2 = (message, extra = {}) => ({
  message,
  policy_version: "v2",
  ...extra,
});

const addressPrompt = "Ad soyad, cep telefonu ve açık adres bilgilerinizi yazabilirsiniz efendim 😊";

const cases = [
  {
    name: "V2 reklam varsayımı ürün yokken lazer kolye bağlamı verir",
    input: emptyV2("Nasıl sipariş verebilirim?"),
    includes: ["web sitemiz", "lazer-resimli-kolye"],
    notIncludes: ["Hangi ürün ile ilgileniyorsunuz", "Hangi model ile ilgileniyorsunuz"],
    expect: { policy_version: "v2", ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
  },
  {
    name: "V2 fiyat listesi isteyen müşteriye genel liste kalır",
    input: emptyV2("Fiyat listesi var mı?"),
    includes: ["Güncel Fiyat Listemiz", "Resimli Bileklik", "Evcil Hayvan Mezar Taşı"],
    expect: { policy_version: "v2", ilgilenilen_urun: "" },
  },
  {
    name: "V2 lazer varsayımından açık bileklik isteğine geçer",
    input: emptyV2("Bileklik istiyorum"),
    includes: ["Resimli Bileklik", "499", "lazer-resimli-bileklik"],
    notIncludes: ["Resimli Lazer Kolye fiyatımız 649"],
    expect: { policy_version: "v2", ilgilenilen_urun: "resimli_lazer_bileklik" },
  },
  {
    name: "V2 lazer bağlamındayken bileklik fiyatı açık ürün değiştirir",
    input: emptyV2("bileklik fiyatı nedir", { ilgilenilen_urun: "lazer", user_product: "lazer", conversation_stage: "waiting_photo" }),
    includes: ["Resimli Bileklik", "499"],
    notIncludes: "Resimli Lazer Kolye fiyatımız 649",
    expect: { policy_version: "v2", ilgilenilen_urun: "resimli_lazer_bileklik" },
  },
  {
    name: "V2 waiting_photo FAQ sadece materyal cevabı verir",
    input: waitingPhoto("Gümüş var mı?"),
    includes: ["altın veya gümüş değildir", "316L"],
    notIncludes: ["Fotoğrafınızı", "buradan iletebilirsiniz"],
    expect: { behavior_category: "faq_answered", conversation_stage: "waiting_photo" },
  },
  {
    name: "V2 waiting_photo kısa bağlam foto slotu commit etmez",
    input: waitingPhoto("tamam"),
    includes: "Tabi efendim",
    notIncludes: ["Fotoğrafınızı", "Ödeme tercihinizi"],
    expect: { behavior_category: "contextual_ack", conversation_stage: "waiting_photo", photo_received: "" },
  },
  {
    name: "V2 waiting_photo foto siteye yönlenir",
    input: waitingPhoto("https://example.com/photo.jpg"),
    includes: ["Fotoğrafınız için teşekkürler", "yudumjewels.com"],
  },
  {
    name: "V2 waiting_payment ödeme zamanı FAQ adres promptu eklemez",
    input: waitingPayment("Ne zaman atayım parayı?"),
    includes: "Ödeme seçeneklerimiz",
    notIncludes: ["Ad soyad", "açık adres"],
    expect: { behavior_category: "faq_answered", conversation_stage: "waiting_payment" },
  },
  {
    name: "V2 waiting_payment kapıda ödeme slot commit eder",
    input: waitingPayment("Kapıda olsun"),
    includes: "Kapıda ödeme",
    expect: { behavior_category: "slot_committed", conversation_stage: "waiting_address", payment_method: "kapida_odeme" },
  },
  {
    name: "V2 waiting_address fiyat FAQ adres promptu eklemez",
    input: waitingAddress("Toplam tutar nedir?"),
    includes: ["649", "549", "kapıda ödeme", "+50"],
    notIncludes: ["Ad soyad", "cep telefonu", "açık adres"],
    expect: { behavior_category: "faq_answered", conversation_stage: "waiting_address" },
  },
  {
    name: "V2 waiting_address adres siteye yönlenir",
    input: waitingAddress("Ayşe Yılmaz 0505 111 22 33 İstanbul Kadıköy Caferağa Mahallesi Moda Caddesi No 10 Daire 3"),
    includes: ["web sitemiz üzerinden", "yudumjewels.com"],
  },
  {
    name: "V2 order_completed aksesuar FAQ knowledge cevabı verir",
    input: completed("Nazar boncuğu olur mu?"),
    includes: ["nazar boncuğu", "fiyata dahildir", "ek ücret alınmaz"],
    notIncludes: "Ekibimize iletiyorum",
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 order_completed kargo takip operasyona düşer",
    input: completed("Kargom nerede?"),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed fotoğraf güncellemesi post-order handoff olur",
    input: completed("fotoğrafı gönderdim"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed ödeme bilgisi post-order handoff olur",
    input: completed("ödemeyi yaptım"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed yukarıda adres post-order handoff olur",
    input: completed("yukarıda adresimi yazdım"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed arka yazı güncellemesi post-order handoff olur",
    input: completed("arkasına 29.03.2022 yazılsın"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed haber verilmedi operational handoff olur",
    input: completed("haber vermediniz"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed renk zincir güncellemesi post-order handoff olur",
    input: completed("gümüş plaka siyah zincir olsun"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 ciddi şikayet insan desteğine düşer",
    input: waitingPayment("Savcılığa gideceğim artık"),
    includes: "insan temsilcimize",
    notIncludes: "Ödeme tercihinizi",
    expect: { behavior_category: "serious_complaint_handoff", support_mode: "1" },
  },
  {
    name: "V2 kısa bağlam istiyorum slot commit etmez",
    input: waitingPhoto("istiyorum"),
    includes: "Tabi efendim",
    notIncludes: "Fotoğrafınızı",
    expect: { behavior_category: "contextual_ack", conversation_stage: "waiting_photo", photo_received: "" },
  },
  {
    name: "V2 kısa bağlam ona göre slot commit etmez (siteye yönlenir)",
    input: waitingPayment("ona göre"),
    includes: "web sitemiz üzerinden",
    notIncludes: ["Ödeme tercihinizi belirt", "Fotoğrafınız ulaştı"],
  },
  {
    name: "V2 kısa bağlam gönderiyorum slot commit etmez",
    input: waitingPhoto("gönderiyorum"),
    includes: "Tabi efendim",
    notIncludes: "Fotoğrafınız ulaştı",
    expect: { behavior_category: "contextual_ack", conversation_stage: "waiting_photo", photo_received: "" },
  },
  {
    name: "V2 boş state ürün linkinden anahtarlık context recover eder",
    input: emptyV2("https://www.yudumjewels.com/kisiye-ozel-fotografli-lazer-anahtarlik"),
    includes: "Anahtarlık",
    expect: { behavior_category: "product_context_recovered" },
  },
  {
    name: "V2 boş state tek ürün adı resimli bileklik recover eder",
    input: emptyV2("resimli bileklik"),
    includes: "Bileklik",
    expect: { behavior_category: "product_context_recovered" },
  },
  {
    name: "V2 boş state önceki adres promptunda telefon partial update olur",
    input: emptyV2("0505 111 22 33", { ai_reply: addressPrompt }),
    includes: "Bilginizi aldım",
    expect: { behavior_category: "partial_slot_update" },
  },
  {
    name: "V2 boş state önceki adres promptunda adres parçası partial update olur",
    input: emptyV2("Kadıköy Caferağa Mahallesi Moda Caddesi", { ai_reply: addressPrompt }),
    includes: "Bilginizi aldım",
    expect: { behavior_category: "partial_slot_update" },
  },
  {
    name: "V2 boş state sipariş takibi operasyona düşer",
    input: emptyV2("sipariş takibimi nereden yapacağım"),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 boş state ürün bağlamında renk plaka zincir recovery handoff olur",
    input: emptyV2("altın rengi plaka altın rengi zincir olsun", {
      ilgilenilen_urun: "anahtarlik",
      user_product: "anahtarlik",
    }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "recovered_context_handoff", support_mode: "1" },
  },
  {
    name: "V2 reklam varsayımında tek gümüş renk/malzeme bilgisi verir",
    input: emptyV2("gümüş"),
    includes: ["altın veya gümüş değildir", "316L"],
    expect: { behavior_category: "faq_answered", ilgilenilen_urun: "lazer" },
  },
  {
    name: "V2 order_completed adresim sizde post-order handoff olur",
    input: completed("adresim sizde olması lazım"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed fotoğrafı atmıştım post-order handoff olur",
    input: completed("fotoğrafı atmıştım"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed gold olacak post-order handoff olur",
    input: completed("gold olacak"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed ne yazacaksınız post-order handoff olur",
    input: completed("ne yazacaksınız"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed 1 hafta oldu operational handoff olur",
    input: completed("1 hafta oldu"),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed sipariş vermiştim operational handoff olur",
    input: completed("sipariş vermiştim"),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed soru işareti ambiguous kalır",
    input: completed("?"),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "ambiguous_needs_review" },
  },
  {
    name: "V2 waiting_payment siteden üye olmadan alışveriş operational handoff olur",
    input: waitingPayment("siteden üye olmadan alışveriş yaptım"),
    includes: "Sipariş bilginiz kontrol edilip",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_payment üye olmadan yaptım operational handoff olur",
    input: waitingPayment("üye olmadan yaptım"),
    includes: "Sipariş bilginiz kontrol edilip",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_letters ataç değil anahtarlık post-order handoff olur",
    input: base("ataç değil anahtarlık", { conversation_stage: "waiting_letters" }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_letters harf boyu küçük post-order handoff olur",
    input: base("harflerin boyunu küçük yapabiliyor musunuz", { conversation_stage: "waiting_letters" }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed gevşek adres satırı post-order handoff olur",
    input: completed("Ortadoğu Caddesi Şahin İşhanı No 12"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed isim tarih satırı post-order handoff olur",
    input: completed("Fatih Ekberim 21.09.2024"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed kalp ekleme post-order handoff olur",
    input: completed("Fatih Ekberin yanına kalp koyun"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed sipariş bilgi talebi operational handoff olur",
    input: completed("Ben siparişim için bilgi alacaktım"),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 boş state önceki ürün bağlamında EFT detayı siteye yönlenir",
    input: emptyV2("Eft yaparım siz iban gönderin", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: ["web sitemiz üzerinden", "yudumjewels.com"],
  },
  {
    name: "V2 boş state önceki ürün bağlamında arka yazı recovery handoff olur",
    input: emptyV2("arkasına dünyanın en iyi babası yazılsın", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "recovered_context_handoff", support_mode: "1" },
  },
  {
    name: "V2 boş state babalar gününe yetişir mi operational handoff olur",
    input: emptyV2("Babalar gününe yetişir mi?", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_product foto link siteye yönlenir",
    input: base("https://amojo.kommo.com/v2/demo/attachments/image-123.jpe", {
      conversation_stage: "waiting_product",
      ilgilenilen_urun: "",
      user_product: "",
      ai_reply: "Resimli lazer bileklik modelimiz için yardımcı olalım efendim 😊 Fotoğraf ön yüze işlenir.",
    }),
    includes: ["Fotoğrafınız için teşekkürler", "yudumjewels.com"],
  },
  {
    name: "V2 waiting_product ödeme detayı siteye yönlenir",
    input: base("eft olsun", {
      conversation_stage: "waiting_product",
      ilgilenilen_urun: "",
      user_product: "",
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: ["web sitemiz üzerinden", "yudumjewels.com"],
  },
  {
    name: "V2 waiting_photo karar verip döneyim contextual ack olur",
    input: waitingPhoto("Ben karar verip size döneyim"),
    includes: "Tabi efendim",
    expect: { behavior_category: "contextual_ack", conversation_stage: "waiting_photo" },
  },
  {
    name: "V2 order_completed sadece emoji ambiguous kalır",
    input: completed("🥰"),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "ambiguous_needs_review" },
  },
  {
    name: "V2 order_completed bilgi vermediniz operational handoff olur",
    input: completed("Siz yine bana bir bilgi vermediniz ama"),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed aynı şeyi deyip duruyorsunuz operational handoff olur",
    input: completed("Sürekli aynı şeyi deyip duruyorsunuz"),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed verdiğim sipariş bilgi talebi operational handoff olur",
    input: completed("Ben verdiğim siparişimle ilgili bilgi almak istiyorum"),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_product önceki ürün bağlamında başka sayfa görseli recovery handoff olur",
    input: base("Başka sayfadan alıp attım ben", {
      conversation_stage: "waiting_product",
      ilgilenilen_urun: "",
      user_product: "",
      ai_reply: "Resimli lazer bileklik modelimiz için yardımcı olalım efendim 😊 Fotoğraf ön yüze işlenir.",
    }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "recovered_context_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_product önceki ürün bağlamında görüntü kalitesi recovery handoff olur",
    input: base("Büyüttüm ama sanki görüntü kalitesi düştü gibi", {
      conversation_stage: "waiting_product",
      ilgilenilen_urun: "",
      user_product: "",
      ai_reply: "Resimli lazer bileklik modelimiz için yardımcı olalım efendim 😊 Fotoğraf ön yüze işlenir.",
    }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "recovered_context_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed siparişim geliyor mu operational handoff olur",
    input: completed("Siparişim geliyor mu"),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed hazırlanınca paylaşır mısınız FAQ olur",
    input: completed("Hazırlandığında benimle paylaşır mısınız"),
    includes: "maalesef her ürünün fotoğrafını ayrıca çekip",
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 order_completed başka foto atabilirim post-order handoff olur",
    input: completed("Başka fotoda ata bilirim"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed nazar boncuğu olsun post-order handoff olur",
    input: completed("Yanında nazar boncuğu olsun ama"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 boş state önceki ürün bağlamında isim tarih recovery handoff olur",
    input: emptyV2("Yazı 04.06.2026 Annem", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "recovered_context_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_product önceki ürün bağlamında gümüş olsun recovery handoff olur",
    input: base("Gümüş olsun", {
      conversation_stage: "waiting_product",
      ilgilenilen_urun: "",
      user_product: "",
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "recovered_context_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_product cvp vermiyorsunuz operational handoff olur",
    input: base("Cvp vermiyor sunuz", {
      conversation_stage: "waiting_product",
      ilgilenilen_urun: "",
      user_product: "",
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "Ekibimize iletiyorum",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_product önceki ürün bağlamında IBAN isteği FAQ olur",
    input: base("İban alayım sizden", {
      conversation_stage: "waiting_product",
      ilgilenilen_urun: "",
      user_product: "",
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "IBAN",
    notIncludes: ["www.yudumjewels.com", "kartla"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 mezar taşı kapıda ödeme istisnası korunur",
    input: base("Mezar taşı kapıda ödeme var mı?", {
      ilgilenilen_urun: "evcil_hayvan_mezar_tasi",
      user_product: "evcil_hayvan_mezar_tasi",
    }),
    includes: ["Evcil Hayvan Mezar Taşı", "kapıda ödeme", "bulunmamaktadır"],
    notIncludes: "ekibimize iletiyorum",
    expect: { support_mode: "" },
  },
  {
    name: "V2 order_completed teslim kişi notu post-order handoff olur",
    input: completed("Ben alırım eğer ben olmazsam Songül hanım alacak"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed il ilçe teslim notu post-order handoff olur",
    input: completed("MERSİN/TARSUS"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 boş state önceki ürün bağlamında tek renk recovery handoff olur",
    input: emptyV2("Gümüş", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "recovered_context_handoff", support_mode: "1" },
  },
  {
    name: "V2 boş state önceki ürün bağlamında site siparişi operational olur",
    input: emptyV2("Ben ürünü sitenizden aldım", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "Sipariş bilginiz kontrol edilip",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_product ürün linki context recovered olur",
    input: base("https://yudumjewels.com/kisiye-ozel-fotografli-lazer-anahtarlik", {
      conversation_stage: "waiting_product",
      ilgilenilen_urun: "",
      user_product: "",
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "Anahtarlık",
    expect: { behavior_category: "product_context_recovered" },
  },
  {
    name: "V2 waiting_product ürün bağlamında isim recovery handoff olur",
    input: base("Gözde Koçak Yiğit", {
      conversation_stage: "waiting_product",
      ilgilenilen_urun: "",
      user_product: "",
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "recovered_context_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_product dönüş yapılacak mı operational handoff olur",
    input: base("Dönüş yapıcakmısınız", {
      conversation_stage: "waiting_product",
      ilgilenilen_urun: "",
      user_product: "",
      ai_reply: "Resimli lazer bileklik modelimiz için yardımcı olalım efendim 😊 Fotoğraf ön yüze işlenir.",
    }),
    includes: "Sipariş bilginiz kontrol edilip",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_product ürün sorunu operational handoff olur",
    input: base("Tamam, siz gelince ürün anlayacaksınız, tırnak takılıyor", {
      conversation_stage: "waiting_product",
      ilgilenilen_urun: "",
      user_product: "",
      ai_reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
    }),
    includes: "Ekibimize",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed yapay zeka şikayeti operational handoff olur",
    input: completed("Yapay zekayla konuşuyor gibiyim kısım kısım"),
    includes: "Ekibimize",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed sonsuzluk işareti isimleri post-order handoff olur",
    input: completed("Elisanur sonsuzluk işareti Araz Utku"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed biliyorum contextual ack olur",
    input: completed("biliyorum"),
    includes: "Tabi efendim",
    expect: { behavior_category: "contextual_ack", support_mode: "" },
  },
  {
    name: "V2 order_completed kolyenin resmi varsa FAQ olur",
    input: completed("Elinizde kolyenin resmi varsa bana atar mısınız"),
    includes: ["Atölyemizden çıkmış ürün fotoğraflarını", "https://yudumjewels.com/lazer-resimli-kolye?renk=altin-kaplama"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 boş state önceki ürün bağlamında sipariş edeceğim recovery olur",
    input: emptyV2("Giresun için sipariş edicem", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "recovered_context_handoff", support_mode: "1" },
  },
  {
    name: "V2 boş state önceki ürün bağlamında tüm bilgileri gönderdim recovery olur",
    input: emptyV2("Çok teşekkür ederim tüm bilgileri eksiksiz gönderdim sanırım", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "recovered_context_handoff", support_mode: "1" },
  },
  {
    name: "V2 boş state önceki ürün bağlamında teslim tarihi operational olur",
    input: emptyV2("Cumaya yetişir mi?", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "Ekibimize",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 waiting_photo açıklayıcı oldu uzun cümle contextual ack olur",
    input: waitingPhoto("Bu saate iletiim de iyi oldu açıklayıcı oldu herşey"),
    includes: "Tabi efendim",
    expect: { behavior_category: "contextual_ack", conversation_stage: "waiting_photo" },
  },
  {
    name: "V2 order_completed memnun kalırsam contextual ack olur",
    input: completed("Memnun kalırsam çevremdekilere de önericem"),
    includes: "Tabi efendim",
    expect: { behavior_category: "contextual_ack", support_mode: "" },
  },
  {
    name: "V2 order_completed sembollü isim post-order handoff olur",
    input: completed("♾Mustafa ♾"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed ne zaman elimize ulaşır operational olur",
    input: completed("Ne zaman elimize ulaşır"),
    includes: "Ekibimize",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 boş state önceki ürün bağlamında görme şansı recovery olur",
    input: emptyV2("Ürün nasıl görünücek görme şansım var mı", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "recovered_context_handoff", support_mode: "1" },
  },
  {
    name: "V2 boş state önceki ürün bağlamında WhatsApp sorusu FAQ olur",
    input: emptyV2("Watsapp hattınız yok mu", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "0505 471 35 45",
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 boş state linkten açamadım operational olur",
    input: emptyV2("Link den açtım fakat oluşturamadım sabah buradan atayım", {
      ai_reply: "Bu ürün için sizi ekibimize yönlendiriyorum efendim 😊 Ekibimiz mevcut seçenekler ve detaylar için yardımcı olacaktır.",
    }),
    includes: "Ekibimize",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed ne zaman ulaşır operational olur",
    input: completed("Ne zaman ulasır elime"),
    includes: "Ekibimize",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed robotla muhatap şikayeti operational olur",
    input: completed("Yav hocam robotla muhattap etmeyin insanları"),
    includes: "Ekibimize",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed iade prosedürü FAQ olur",
    input: completed("İade prosedürünüz nasıl işliyor"),
    includes: "kişiye özel",
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 order_completed taslak görme isteği FAQ olur",
    input: completed("Gönder olmadan önce taslak halini görme şansım olur mu"),
    includes: "ön izleme",
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 order_completed şube teslim sorunu operational olur",
    input: completed("Ürün şubede ptt tekrar dağıtıma çıkarabilir misiniz"),
    includes: "Ekibimize",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed Beyoğlu adres eklemesi post-order olur",
    input: completed("Beyoğlu İstanbul yazmayı unutmuşum"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 order_completed nazar boncuklu notu post-order olur",
    input: completed("Ve nazar boncuklu"),
    includes: "ekibimize iletiyorum",
    expect: { behavior_category: "post_order_update_handoff", support_mode: "1" },
  },
  {
    name: "V2 boş state PTT bilgi sorusu FAQ kalır",
    input: emptyV2("PTT ile mi geliyor?", {
      ai_reply: "Kişiye özel anahtarlık modelimiz için yardımcı olalım efendim 😊 Fotoğraf / yazı detayınızı buradan iletebilirsiniz.",
    }),
    includes: "PTT Kargo",
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 foto kompozisyon tek resim aile resmi doğru bilgi verir",
    input: completed("Tek resim mi yapıyorsunuz aile resmi de yapıyor musunuz"),
    includes: ["Aynı fotoğrafta kaç kişi varsa", "Fotoğraf birleştirme hizmetimiz bulunmamaktadır", "ön ve arka yüze farklı fotoğraf"],
    notIncludes: ["En fazla 3 fotoğraf", "en fazla 3 fotoğraf", "birleştirebiliyoruz", "Birleştirme veya ön-arka"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 foto kompozisyon toplu resim kişi sınırı yok",
    input: completed("Toplu resim olursa peki en fazla kaça kadar"),
    includes: ["Aynı fotoğrafta kaç kişi varsa", "Fotoğraf birleştirme hizmetimiz bulunmamaktadır"],
    notIncludes: ["En fazla 3 fotoğraf", "en fazla 3 fotoğraf", "birleştirebiliyoruz", "Birleştirme veya ön-arka"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 foto kompozisyon bir tarafa kaç fotoğraf eski limit vermez",
    input: completed("Bir de bir tarafa kaç fotoğraf en fazla sığdırabiliyorsunuz"),
    includes: ["Aynı fotoğrafta kaç kişi varsa", "Ayrı fotoğraflar için uygun ürünlerde"],
    notIncludes: ["En fazla 3 fotoğraf", "en fazla 3 fotoğraf", "birleştirebiliyoruz", "Birleştirme veya ön-arka"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 foto kompozisyon en son kaç fotoğraf eski limit vermez",
    input: completed("peki en son kaç fotoğraf olur"),
    includes: ["Aynı fotoğrafta kaç kişi varsa", "Fotoğraf birleştirme hizmetimiz bulunmamaktadır"],
    notIncludes: ["En fazla 3 fotoğraf", "en fazla 3 fotoğraf", "birleştirebiliyoruz", "Birleştirme veya ön-arka"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 foto kompozisyon iki ayrı fotoğraf birleştirme yok",
    input: completed("iki ayrı fotoğrafı birleştirir misiniz"),
    includes: ["Fotoğraf birleştirme hizmetimiz bulunmamaktadır", "ön ve arka yüze farklı fotoğraf"],
    notIncludes: ["En fazla 3 fotoğraf", "en fazla 3 fotoğraf", "birleştirebiliyoruz", "Birleştirme veya ön-arka"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 foto kompozisyon aile fotoğrafı olur",
    input: completed("aile fotoğrafı olur mu"),
    includes: ["Aynı fotoğrafta kaç kişi varsa", "Fotoğraf birleştirme hizmetimiz bulunmamaktadır"],
    notIncludes: ["En fazla 3 fotoğraf", "en fazla 3 fotoğraf", "birleştirebiliyoruz", "Birleştirme veya ön-arka"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 foto kompozisyon aynı fotoğrafta beş kişi olur",
    input: completed("aynı fotoğrafta 5 kişi var olur mu"),
    includes: ["Aynı fotoğrafta kaç kişi varsa", "Fotoğraf birleştirme hizmetimiz bulunmamaktadır"],
    notIncludes: ["En fazla 3 fotoğraf", "en fazla 3 fotoğraf", "birleştirebiliyoruz", "Birleştirme veya ön-arka"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 örnek isteyen lazer örnek linkini alır",
    input: waitingPhoto("Örnek atar mısınız"),
    includes: ["Atölyemizden çıkmış ürün fotoğraflarını", "https://yudumjewels.com/lazer-resimli-kolye?renk=altin-kaplama"],
    notIncludes: ["Tüm ürünlerimizin örnekleri profilimizde", "www.yudumjewels.com"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 fotoğrafı nereden yükleyeceğim site yükleme alanına gider",
    input: waitingPhoto("Fotoğrafı buradan mı atıyoruz kolye için"),
    includes: ["fotoğrafınızı ürün sayfasındaki fotoğraf yükleme alanından", "https://www.yudumjewels.com/lazer-resimli-kolye"],
    notIncludes: "Evet, kolye için",
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 arka yüze ikinci fotoğraf +25 TL kalır",
    input: waitingPayment("İki foto bir kolyede olsun"),
    includes: ["Arka yüze ikinci fotoğraf", "+25 TL"],
    notIncludes: ["Ek ücret alınmaz", "Fiyat farkı olmuyor", "Aynı fiyattan"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 sipariş sonrası yapım aşaması sorusu operasyona gider",
    input: completed("Merhaba siparişim yapım aşamasına girdi mi"),
    includes: "Sipariş bilginiz kontrol edilip size dönüş sağlanacaktır",
    expect: { behavior_category: "operational_handoff", support_mode: "1" },
  },
  {
    name: "V2 teslim sonrası teşekkür insana düşmez",
    input: completed("Merhaba kargom geldi çok beğendim teşekkür ederim"),
    includes: ["Çok teşekkür ederiz", "güle güle kullanın"],
    notIncludes: "Ekibimize iletiyorum",
    expect: { behavior_category: "contextual_ack", support_mode: "" },
  },
  {
    name: "V2 sistem mesajı sessiz kalır",
    input: waitingPhoto("The message could not be displayed due to API restrictions"),
    expect: { ai_reply: "", reply_class: "silent", support_mode: "" },
  },
  {
    name: "V2 baş harfli ataç sorusu 50 cm kalır",
    input: waitingPhoto("Baş harfinin olduğu kolye yapıyor msnz peki"),
    includes: ["Harfli Ataç Kolye", "50 cm", "harfli-atac-kolye-bileklik-hediye"],
    notIncludes: "60 cm",
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 Instagram model linki hangi model döngüsüne girmez",
    input: emptyV2("https://www.instagram.com/reel/ABC", { conversation_stage: "waiting_product" }),
    includes: ["Resimli Lazer Kolye", "https://www.yudumjewels.com/lazer-resimli-kolye"],
    notIncludes: ["Hangi model ile ilgileniyorsunuz", "ekibimize iletiyorum"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },  {
    name: "V2 aynı model olsun lazer linki verir",
    input: emptyV2("Aynı model olsun", { conversation_stage: "waiting_product" }),
    includes: ["Resimli Lazer Kolye", "https://www.yudumjewels.com/lazer-resimli-kolye"],
    notIncludes: ["Hangi model ile ilgileniyorsunuz", "ekibimize iletiyorum"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },
  {
    name: "V2 ikinci ürüne indirim sorusu sepet yüzde 15 cevabı verir",
    input: emptyV2("ikinci ürüne indirim var mı?"),
    includes: ["ikinci ürünü eklediğinizde", "sepete toplam %15 indirim"],
    expect: { behavior_category: "faq_answered", support_mode: "" },
  },];

const result = await runSuite("POLICY_V2_CURRENT_KNOWLEDGE", cases);
process.exit(result.fail > 0 ? 1 : 0);






