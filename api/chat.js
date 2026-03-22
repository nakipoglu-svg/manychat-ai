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

  // "{{deger}}" veya "{{{deger}}}" temizle
  str = str.replace(/^\{\{\{?/, "").replace(/\}\}\}?$/, "").trim();

  // "{cuf_123456}" veya "{anything}" gibi placeholderları boş say
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

  // ```json ... ``` veya ``` ... ``` bloklarını temizle
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

function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
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
      "lazer",
      "lazer kolye",
      "lazerli",
      "resimli",
      "resimli kolye",
      "foto kolye",
      "fotolu",
      "fotograf kolye",
      "fotografli",
      "fotoğraf kolye"
    ];

    const atacKeywords = [
      "atac",
      "ataç",
      "harf",
      "harfli",
      "harf kolye",
      "isim kolye",
      "isimli kolye"
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
    if (
      includesAny(msg, [
        "fiyat",
        "ucret",
        "ücret",
        "indirim",
        "ne kadar",
        "kaç tl",
        "kac tl",
        "son fiyat"
      ])
    ) {
      topicFile = "pricing.txt";
    } else if (
      includesAny(msg, [
        "kargo",
        "teslim",
        "teslimat",
        "kaç günde",
        "kac gunde",
        "takip"
      ])
    ) {
      topicFile = "shipping.txt";
    } else if (
      includesAny(msg, [
        "odeme",
        "ödeme",
        "iban",
        "eft",
        "havale",
        "kapida odeme",
        "kapıda ödeme"
      ])
    ) {
      topicFile = "payment.txt";
    } else if (
      includesAny(msg, [
        "kararma",
        "kararir",
        "kararır",
        "paslanir",
        "paslanır",
        "guven",
        "güven",
        "iade",
        "degisim",
        "değişim",
        "garanti"
      ])
    ) {
      topicFile = "trust.txt";
    } else if (
      includesAny(msg, [
        "foto",
        "fotograf",
        "fotoğraf",
        "resim",
        "kaç kişi",
        "kac kisi",
        "iki kisi",
        "iki kişi",
        "arka plan",
        "netlestirme",
        "netleştirme"
      ])
    ) {
      topicFile = "image_rules.txt";
    } else if (
      includesAny(msg, [
        "siparis",
        "sipariş",
        "adres",
        "telefon",
        "numara",
        "satin al",
        "satın al"
      ])
    ) {
      topicFile = "order_flow.txt";
    } else if (
      includesAny(msg, [
        "tesekkur",
        "teşekkür",
        "sağol",
        "sagol",
        "memnun"
      ])
    ) {
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
  message,
  userProduct,
  conversationStage,
  photoReceived,
  paymentMethod,
  menuGosterildi,
  aiReply,
  fullContactData
}) {
  return {
    message: unwrapManychatValue(message || ""),
    userProduct:
      unwrapManychatValue(userProduct || "") ||
      getFieldFromFullContact(fullContactData, "ilgilenilen_urun"),
    conversationStage:
      unwrapManychatValue(conversationStage || "") ||
      getFieldFromFullContact(fullContactData, "conversation_stage"),
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
      message,
      userProduct,
      conversationStage,
      photoReceived,
      paymentMethod,
      menuGosterildi,
      aiReply,
      fullContactData
    });

    console.log(
      "MANYCHAT BODY:",
      JSON.stringify(
        {
          message: ctx.message,
          userProduct: ctx.userProduct,
          conversationStage: ctx.conversationStage,
          photoReceived: ctx.photoReceived,
          paymentMethod: ctx.paymentMethod,
          menuGosterildi: ctx.menuGosterildi,
          aiReply: ctx.aiReply,
          fullContactDataId: fullContactData?.id || "",
          fullContactDataIgId: fullContactData?.ig_id || ""
        },
        null,
        2
      )
    );

    if (!ctx.message) {
      return res.status(200).json({
        reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
        set_conversation_stage: "",
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

    const selectedFiles = pickKnowledgeFiles(
      ctx.message,
      ctx.userProduct,
      ctx.conversationStage
    );

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
- conversation_stage=letter_waiting ise kısa metinleri seçilen harfler olarak yorumla.
- conversation_stage=address_received ise artık başa dönme, ürün tanıtımı yapma.

STATE GÜNCELLEME KURALLARI:
- Müşteri ödeme yöntemini seçtiği anda set_payment_method mutlaka doldur.
- Müşteri "eft", "havale", "iban'a atayım", "kapıda ödeme", "kapida odeme" gibi net bir ödeme tercihi belirttiyse set_conversation_stage="payment_selected" yap.
- payment_method doluyken stage hâlâ address_received kalmamalı.
- Ödeme tercihi netleştiyse set_payment_method ve set_conversation_stage birlikte dönmelidir.
- EFT seçildiyse set_payment_method="eft", kapıda ödeme seçildiyse set_payment_method="kapida_odeme" döndür.
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
${JSON.stringify(
  {
    id: fullContactData?.id || "",
    ig_id: fullContactData?.ig_id || "",
    ig_username: fullContactData?.ig_username || "",
    last_input_text: fullContactData?.last_input_text || "",
    custom_fields: fullContactData?.custom_fields || {}
  },
  null,
  2
)}
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

    const setConversationStage = unwrapManychatValue(
      parsed?.set_conversation_stage || ""
    );
    const setPhotoReceived = unwrapManychatValue(
      parsed?.set_photo_received || ""
    );
    const setPaymentMethod = unwrapManychatValue(
      parsed?.set_payment_method || ""
    );
    const setMenuGosterildi = unwrapManychatValue(
      parsed?.set_menu_gosterildi || ""
    );

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
