import fs from "fs";
import path from "path";

const fileCache = {};

function readKnowledgeFile(filename) {
  if (fileCache[filename]) return fileCache[filename];
  const filePath = path.join(process.cwd(), "knowledge", filename);
  const content = fs.readFileSync(filePath, "utf8");
  fileCache[filename] = content;
  return content;
}

function unwrapManychatValue(value) {
  if (value === null || value === undefined) return "";

  let str = String(value).trim();

  str = str.replace(/^\{\{\{?/, "").replace(/\}\}\}?$/, "").trim();

  if (/^\{[^}]+\}$/.test(str)) {
    return "";
  }

  if (
    !str ||
    str.toLowerCase() === "no field selected" ||
    str.toLowerCase() === "undefined" ||
    str.toLowerCase() === "null"
  ) {
    return "";
  }

  return str;
}

function extractJsonText(rawText) {
  if (!rawText) return "";

  let text = String(rawText).trim();

  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  text = text.replace(/\s*```$/, "").trim();

  return text;
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

function normalizeStageName(stage) {
  const s = normalizeText(stage);
  if (!s) return "";

  if (s.includes("photo_wait")) return "photo_waiting";
  if (s.includes("photo_receive")) return "photo_received";
  if (s.includes("letter_wait")) return "letter_waiting";
  if (s.includes("address_receive")) return "address_received";
  if (s.includes("address_wait")) return "address_waiting";
  if (s.includes("payment_selected")) return "payment_selected";
  if (s.includes("payment_wait")) return "payment_waiting";

  return s;
}

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function hasPhoneNumber(text) {
  const cleaned = String(text || "").replace(/\s+/g, " ");
  return /(\+?\d[\d\s]{8,}\d)/.test(cleaned);
}

function looksLikeAddressMessage(text) {
  const msg = normalizeText(text);

  const addressKeywords = [
    "mahalle", "mah", "sokak", "sk", "cadde", "cd", "no", "daire", "kat",
    "apartman", "apt", "site", "blok", "ilce", "ilçe", "semt",
    "istanbul", "ankara", "izmir", "turkiye", "türkiye",
    "sisli", "şişli", "umraniye", "ümraniye", "beykoz", "kadikoy", "kadıköy"
  ];

  const hitCount = addressKeywords.filter((k) => msg.includes(k)).length;
  const lineCount = String(text || "")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean).length;

  return hasPhoneNumber(text) && (hitCount >= 2 || lineCount >= 3);
}

// ── YENİ: Ödeme yöntemi algılama ──────────────────────────────────────────
function detectPaymentMethod(text) {
  const msg = normalizeText(text);
  if (includesAny(msg, ["kapida", "kapi", "kapıda", "kapı"])) return "kapida_odeme";
  if (includesAny(msg, ["eft", "havale", "iban", "transfer"])) return "eft";
  return "";
}

function pickKnowledgeFiles(message, userProduct, conversationStage = "") {
  const msg = normalizeText(message);
  const product = normalizeText(userProduct);
  const stage = normalizeText(conversationStage);

  const files = ["core_system.txt"];
  let productFile = null;
  let topicFile = null;

  if (product.includes("lazer")) {
    productFile = "product_laser.txt";
  } else if (product.includes("atac") || product.includes("harf")) {
    productFile = "product_atac.txt";
  } else {
    const laserKeywords = [
      "lazer", "lazer kolye", "lazerli", "resimli", "resimli kolye",
      "foto kolye", "fotolu", "fotograf kolye", "fotografli", "fotoğraf kolye"
    ];

    const atacKeywords = [
      "atac", "ataç", "harf", "harfli", "harf kolye", "isim kolye", "isimli kolye"
    ];

    if (includesAny(msg, laserKeywords)) {
      productFile = "product_laser.txt";
    } else if (includesAny(msg, atacKeywords)) {
      productFile = "product_atac.txt";
    }
  }

  if (stage.includes("photo_waiting") || stage.includes("photo_received")) {
    topicFile = "image_rules.txt";
  } else if (stage.includes("letter_waiting") || stage.includes("letter_received")) {
    topicFile = "order_flow.txt";
  } else if (stage.includes("payment")) {
    topicFile = "payment.txt";
  } else if (stage.includes("address")) {
    topicFile = "order_flow.txt";
  }

  if (!topicFile) {
    if (includesAny(msg, ["fiyat", "ucret", "ücret", "indirim", "ne kadar", "kaç tl", "kac tl", "son fiyat"])) {
      topicFile = "pricing.txt";
    } else if (includesAny(msg, ["kargo", "teslim", "teslimat", "kaç günde", "kac gunde", "takip"])) {
      topicFile = "shipping.txt";
    } else if (includesAny(msg, ["odeme", "ödeme", "iban", "eft", "havale", "kapida odeme", "kapıda ödeme"])) {
      topicFile = "payment.txt";
    } else if (includesAny(msg, ["kararma", "kararir", "kararır", "paslanir", "paslanır", "guven", "güven", "iade", "degisim", "değişim", "garanti"])) {
      topicFile = "trust.txt";
    } else if (includesAny(msg, ["foto", "fotograf", "fotoğraf", "resim", "kaç kişi", "kac kisi", "iki kisi", "iki kişi", "arka plan", "netlestirme", "netleştirme"])) {
      topicFile = "image_rules.txt";
    } else if (includesAny(msg, ["siparis", "sipariş", "adres", "telefon", "numara", "satin al", "satın al"])) {
      topicFile = "order_flow.txt";
    } else if (includesAny(msg, ["tesekkur", "teşekkür", "sağol", "sagol", "memnun"])) {
      topicFile = "smalltalk.txt";
    }
  }

  if (productFile) files.push(productFile);
  if (topicFile) files.push(topicFile);

  return [...new Set(files)];
}

function getFieldFromFullContact(fullContactData, key) {
  if (!fullContactData || typeof fullContactData !== "object") return "";
  const customFields = fullContactData.custom_fields || {};
  return unwrapManychatValue(customFields[key] || "");
}

function buildCurrentContext({
  message, userProduct, conversationStage, photoReceived,
  paymentMethod, menuGosterildi, aiReply, fullContactData
}) {
  return {
    message: unwrapManychatValue(message || ""),
    userProduct:
      unwrapManychatValue(userProduct || "") ||
      getFieldFromFullContact(fullContactData, "ilgilenilen_urun"),
    conversationStage: normalizeStageName(
      unwrapManychatValue(conversationStage || "") ||
      getFieldFromFullContact(fullContactData, "conversation_stage")
    ),
    photoReceived:
      unwrapManychatValue(photoReceived || "") ||
      getFieldFromFullContact(fullContactData, "photo_received"),
    paymentMethod:
      unwrapManychatValue(paymentMethod || "") ||
      getFieldFromFullContact(fullContactData, "payment_method"),
    menuGosterildi:
      unwrapManychatValue(menuGosterildi || "") ||
      getFieldFromFullContact(fullContactData, "menu_gosterildi"),
    aiReply:
      unwrapManychatValue(aiReply || "") ||
      getFieldFromFullContact(fullContactData, "ai_reply")
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "" });
    }

    let message = "";
    let userProduct = "";
    let conversationStage = "";
    let photoReceived = "";
    let paymentMethod = "";
    let menuGosterildi = "";
    let aiReply = "";
    let fullContactData = null;

    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      message = body?.message || "";
      userProduct = body?.user_product || body?.ilgilenilen_urun || "";
      conversationStage = body?.conversation_stage || "";
      photoReceived = body?.photo_received || "";
      paymentMethod = body?.payment_method || "";
      menuGosterildi = body?.menu_gosterildi || "";
      aiReply = body?.ai_reply || "";
      fullContactData = body?.full_contact_data || null;
    } catch {
      message = "";
      userProduct = "";
      conversationStage = "";
      photoReceived = "";
      paymentMethod = "";
      menuGosterildi = "";
      aiReply = "";
      fullContactData = null;
    }

    const ctx = buildCurrentContext({
      message, userProduct, conversationStage, photoReceived,
      paymentMethod, menuGosterildi, aiReply, fullContactData
    });

    console.log("MANYCHAT BODY:", JSON.stringify({
      message: ctx.message,
      userProduct: ctx.userProduct,
      conversationStage: ctx.conversationStage,
      photoReceived: ctx.photoReceived,
      paymentMethod: ctx.paymentMethod,
      menuGosterildi: ctx.menuGosterildi,
      aiReply: ctx.aiReply,
      fullContactDataId: fullContactData?.id || "",
      fullContactDataIgId: fullContactData?.ig_id || ""
    }, null, 2));

    if (!ctx.message) {
      return res.status(200).json({
        reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
        set_conversation_stage: "",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    // ── ADRES_WAITING → telefon gelince adres kaydedildi + odeme sor ───────
    if (ctx.conversationStage === "address_waiting") {
      if (hasPhoneNumber(ctx.message)) {
        return res.status(200).json({
          reply: "Tabi efendim 😊 Adresiniz kaydedildi, teşekkürler. Ödemeniz nasıl olacak efendim? EFT / havale veya kapıda ödeme seçeneklerimiz mevcut.",
          set_conversation_stage: "address_received",
          set_photo_received: "",
          set_payment_method: "",
          set_menu_gosterildi: ""
        });
      }
      // Telefon henuz gelmedi - sessiz kal
      return res.status(200).json({
        reply: "__SKIP__",
        set_conversation_stage: "address_waiting",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    // ── PHOTO_RECEIVED → arka yazi netlestiyse back_text_waiting set et ────
    if (ctx.conversationStage === "photo_received") {
      const msg = normalizeText(ctx.message);
      const backTextKeywords = [
        "arkaya", "arkasina", "arka tarafa", "arka yuze", "arka yüze",
        "yazalim", "yazsin", "yazsın", "yazin", "yazın",
        "yaz ", "koy ", "koysun", "koyalim", "koyalım"
      ];
      const hasBackText = backTextKeywords.some(k => msg.includes(k));
      if (hasBackText) {
        return res.status(200).json({
          reply: "Tabi efendim \U0001f60a Siparis icin su bilgileri alabilir miyiz?\n\n- Isim Soyisim\n- Acik Adres\n- Cep Telefonu",
          set_conversation_stage: "address_waiting",
          set_photo_received: "yes",
          set_payment_method: "",
          set_menu_gosterildi: ""
        });
      }
    }

    // ── YENİ: ADDRESS_RECEIVED → ödeme algılama, Claude'a gitmeden yakala ──
    if (ctx.conversationStage === "address_received") {
      const payment = detectPaymentMethod(ctx.message);
      if (payment) {
        return res.status(200).json({
          reply: payment === "eft"
            ? "Tamamdır efendim 😊 IBAN bilgimiz:\nTR34 0015 7000 0000 0076 2524 67\nAlıcı: Servet Cihan Nakipoğlu"
            : "Tamamdır efendim 😊 Kapıda ödeme ile siparişiniz hazırlanacaktır.",
          set_conversation_stage: "payment_selected",
          set_photo_received: "",
          set_payment_method: payment,
          set_menu_gosterildi: ""
        });
      }
    }

    // BACKEND TABANLI ADRES ALGILAMA
    const isAddressMessage = looksLikeAddressMessage(ctx.message);
    const isAddressStage =
      ctx.conversationStage === "address_waiting" ||
      ctx.conversationStage === "address_received";

    if (isAddressMessage && isAddressStage) {
      if (ctx.paymentMethod === "eft") {
        return res.status(200).json({
          reply: "Tamamdır efendim 😊 Adresiniz kaydedildi. Siparişiniz hazırlanıyor.",
          set_conversation_stage: "address_received",
          set_photo_received: "",
          set_payment_method: "",
          set_menu_gosterildi: ""
        });
      }

      if (ctx.paymentMethod === "kapida_odeme") {
        return res.status(200).json({
          reply: "Tamamdır efendim 😊 Adresiniz kaydedildi. Siparişiniz hazırlanıyor.",
          set_conversation_stage: "address_received",
          set_photo_received: "",
          set_payment_method: "",
          set_menu_gosterildi: ""
        });
      }

      return res.status(200).json({
        reply: "Tamamdır efendim 😊 Adresiniz kaydedildi.",
        set_conversation_stage: "address_received",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
        set_conversation_stage: "",
        set_photo_received: "",
        set_payment_method: "",
        set_menu_gosterildi: ""
      });
    }

    const selectedFiles = pickKnowledgeFiles(ctx.message, ctx.userProduct, ctx.conversationStage);

    const knowledgeText = selectedFiles
      .map((file) => {
        try {
          const content = readKnowledgeFile(file);
          return `### ${file}\n${content}`;
        } catch {
          return "";
        }
      })
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = `
Sen Yudum Jewels için çalışan bir Instagram satış asistanısın.

GÖREVİN:
- Kısa, net, doğal ve satış odaklı cevap vermek.
- Gerekirse state/field değişikliği önermek.
- Sadece verilen bilgi dosyalarına göre cevap vermek.
- Bilmediğin konuda asla uydurmamak.

GENEL KURALLAR:
- Bilgi yoksa şu cevabı ver:
Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊
- Eğer user_product doluysa bunu öncelikli ürün bilgisi kabul et.
- Ürün belirtilmemişse ve user_product da boşsa, cevap ürüne göre değişiyorsa hangi model ile ilgilendiğini sor.
- Müşteri sormadıkça ek ücretli veya opsiyonel bilgileri söyleme.
- Cevap verirken yalnızca sorulan şeyi cevapla.
- Ek açıklama, öneri veya alternatif sunma.
- Ürünleri birbirine karıştırma.
- Belirsiz ifadelerde tahmin yapma; gerekirse kısa netleştirme sorusu sor.
- Müşteri daha önce hangi aşamadaysa, tekrar merhaba diyerek başa dönme.
- Kısa cevapları bağlama göre yorumla.
- "evet", "tamam", "olur", "amin", isim, tarih gibi kısa mesajları son aktif aşamaya göre değerlendir.

BAĞLAM KURALLARI:
- conversation_stage çok önemlidir.
- photo_received=yes ise tekrar fotoğraf isteyemezsin.
- conversation_stage=photo_waiting ise müşteri fotoğraf, fotoğraf düzeni, kişi sayısı, ön/arka yüz düzeni gibi sipariş detaylarını yazıyor olabilir.
- conversation_stage=photo_received ise müşterinin kısa mesajlarını sipariş detayı olarak yorumla.
- conversation_stage=photo_received iken müşteri arka yüze yazı veya fotoğraf koyulacağını net söylerse (örnek: "arkaya X yaz", "arkasına X yazalım", "arkasına şu fotoğrafı koy", "arka tarafa X") MUTLAKA set_conversation_stage="back_text_waiting" set et ve adres sor: "Sipariş için şu bilgileri alabilir miyiz? İsim Soyisim, Açık Adres, Cep Telefonu" Boş bırakma.
- conversation_stage=photo_received iken müşteri arka yüz istemiyorsa set_conversation_stage="address_waiting" set et ve adres sor.
- conversation_stage=letter_waiting ise kısa metinleri seçilen harfler olarak yorumla.
- conversation_stage=address_received ise müşteri adresini zaten vermiş kabul et.
- conversation_stage=address_received veya conversation_stage=payment_selected ise tekrar adres isteme.
- Müşteri adresi zaten verildikten sonra "eft olsun", "havale yapayım", "o zaman ben eft yapayım", "iban", "hesap bilgisi", "ödeme yapayım" gibi mesajlar yazarsa bunu ödeme adımı olarak yorumla, adres eksikliği olarak yorumlama.
- Adres alınmış bir konuşmada ödeme tercihi netleşirse IBAN / ödeme yönlendirmesi ver; yeniden adres sorma.
- conversation_stage=payment_selected olduktan sonra aynı konuşmada tekrar adres istemek yasaktır.
- conversation_stage=address_received ise artık başa dönme, ürün tanıtımı yapma.
- Daha önce alınmış bilgileri tekrar isteme. Özellikle address_received, photo_received ve payment_selected aşamalarında önceki bilgiler korunmalıdır.
- Müşteri tek mesajda ad soyad, telefon numarası ve açık adres benzeri bilgiler yazdıysa bunu adres bilgisi olarak kabul et.
- Mesaj içinde kişi adı, telefon numarası ve il/ilçe/mahalle/sokak/no/daire/apartman/kat/daire/Türkiye gibi adres öğeleri birlikte geçiyorsa yeniden adres isteme.
- Telefon numarası kart olarak algılansa bile, aynı mesajdaki metni adres teslim bilgisi olarak yorumla.
- Müşteri adres bilgisini verdikten sonra aynı adres istemini tekrar etme.
- Aşağıdaki tür mesajlar adres mesajı sayılır:
  ad soyad + telefon + il/ilçe/mahalle/sokak/no/daire içeren tek mesajlar.
- conversation_stage address beklerken müşteri tam teslimat bilgisi yazdıysa bunu başarıyla alınmış adres olarak yorumla.
- "Evet geldim" gibi kısa geçiş mesajlarından sonra gelen uzun teslimat mesajını adres olarak kabul et.

STATE GÜNCELLEME KURALLARI:
- Müşteri ödeme yöntemini seçtiği anda set_payment_method mutlaka doldur.
- Müşteri "eft", "havale", "iban'a atayım", "kapıda ödeme", "kapida odeme" gibi net bir ödeme tercihi belirttiyse set_conversation_stage="payment_selected" yap.
- payment_method doluyken stage hâlâ address_received kalmamalı.
- Ödeme tercihi netleştiyse set_payment_method ve set_conversation_stage birlikte dönmelidir.
- EFT seçildiyse set_payment_method="eft", kapıda ödeme seçildiyse set_payment_method="kapida_odeme" döndür.
- conversation_stage=address_received iken müşteri EFT / havale seçerse set_payment_method="eft" ve set_conversation_stage="payment_selected" döndür.
- conversation_stage=address_received iken müşteri kapıda ödeme seçerse set_payment_method="kapida_odeme" ve set_conversation_stage="payment_selected" döndür.
- conversation_stage=address_received veya payment_selected durumunda ödeme ile ilgili net mesajlarda adres isteme.
- Adres zaten alınmışsa ödeme mesajlarına karşılık IBAN / ödeme yönlendirmesi ver veya ödemenin tamamlanmasını bekle.
- Müşteri ad soyad + telefon + açık adres bilgilerini tek mesajda verdiyse set_conversation_stage="address_received" döndür.
- Adres bilgisi net şekilde alınmışsa tekrar adres isteme.
- conversation_stage address beklerken müşteri tam teslimat bilgisi yazdıysa bir sonraki mantıklı aşamaya geç.
- Eğer ödeme yöntemi daha önce seçilmişse ve adres de bu mesajda geldiyse siparişi tamamlanmış kabul eden cevap ver.
- Senden aşağıdaki alanlar için öneri istiyoruz:
  - set_conversation_stage
  - set_photo_received
  - set_payment_method
  - set_menu_gosterildi
- Stage güncellemesi gerekiyorsa boş bırakma.
- Özellikle address_received aşamasından sonraki net ödeme seçimlerinde stage mutlaka ilerletilmelidir.

Kurallar:
- Emin değilsen alanları boş bırak.
- Sadece gerçekten gerekiyorsa değişiklik öner.
- Müşteri EFT seçtiyse set_payment_method="eft"
- Müşteri kapıda ödeme seçtiyse set_payment_method="kapida_odeme"
- Müşteri ürün seçiminden sonra sipariş detayına ilerlediyse uygun stage öner.
- Fotoğraf geldiğini kesin anlayamıyorsan set_photo_received boş kalsın.
- Eğer fotoğrafın geldiğine dair net sistemsel kanıt yoksa sırf tahminle photo_received=yes deme.

ÇIKIŞ FORMATI:
YALNIZCA geçerli JSON döndür.
Asla açıklama yazma.
Asla markdown kullanma.
Format tam olarak şöyle olsun:

{
  "reply": "müşteriye verilecek cevap",
  "set_conversation_stage": "",
  "set_photo_received": "",
  "set_payment_method": "",
  "set_menu_gosterildi": ""
}
`;

    const userPrompt = `
KULLANICI MESAJI:
${ctx.message}

KULLANICI ÜRÜN BİLGİSİ:
${ctx.userProduct || "-"}

KONUŞMA AŞAMASI:
${ctx.conversationStage || "-"}

FOTOĞRAF GELDİ Mİ:
${ctx.photoReceived || "-"}

ÖDEME YÖNTEMİ:
${ctx.paymentMethod || "-"}

MENÜ GÖSTERİLDİ Mİ:
${ctx.menuGosterildi || "-"}

ÖNCEKİ AI CEVABI:
${ctx.aiReply || "-"}

EK TEMAS VERİSİ:
${JSON.stringify({
  id: fullContactData?.id || "",
  ig_id: fullContactData?.ig_id || "",
  ig_username: fullContactData?.ig_username || "",
  last_input_text: fullContactData?.last_input_text || "",
  custom_fields: fullContactData?.custom_fields || {}
}, null, 2)}
`;

    const payload = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral", ttl: "1h" }
        },
        {
          type: "text",
          text: knowledgeText,
          cache_control: { type: "ephemeral", ttl: "1h" }
        }
      ],
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
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("CLAUDE RESPONSE:", JSON.stringify(data, null, 2));

    const rawText =
      data?.content?.map((block) => block?.text || "").join(" ").trim() || "";

    const cleanedText = extractJsonText(rawText);

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      parsed = null;
    }

    const reply =
      parsed?.reply?.trim() ||
      "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊";

    const setConversationStage = normalizeStageName(
      unwrapManychatValue(parsed?.set_conversation_stage || "")
    );
    const setPhotoReceived = unwrapManychatValue(parsed?.set_photo_received || "");
    const setPaymentMethod = unwrapManychatValue(parsed?.set_payment_method || "");
    const setMenuGosterildi = unwrapManychatValue(parsed?.set_menu_gosterildi || "");

    return res.status(200).json({
      reply,
      set_conversation_stage: setConversationStage,
      set_photo_received: setPhotoReceived,
      set_payment_method: setPaymentMethod,
      set_menu_gosterildi: setMenuGosterildi
    });
  } catch (err) {
    console.error("chat.js error:", err);
    return res.status(200).json({
      reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
      set_conversation_stage: "",
      set_photo_received: "",
      set_payment_method: "",
      set_menu_gosterildi: ""
    });
  }
}
