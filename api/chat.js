import fs from "fs";
import path from "path";

function readKnowledgeFile(filename) {
  const filePath = path.join(process.cwd(), "knowledge", filename);
  return fs.readFileSync(filePath, "utf8");
}

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

function includesAny(text, keywords) {
  return keywords.some((k) => text.includes(k));
}

const SHIPPING_KEYWORDS = [
  "kargo",
  "gonderim",
  "gonderimi",
  "nasil gonder",
  "nasil gonderiyorsunuz",
  "hangi kargo",
  "hangi firmayla",
  "ptt",
  "aras",
  "teslim",
  "teslimat",
  "kac gun",
  "kac gunde",
  "ne zaman gelir",
  "takip",
  "sms"
];

const PRICING_KEYWORDS = [
  "fiyat",
  "fiyati",
  "ucret",
  "ne kadar",
  "nekadar",
  "kac tl",
  "kaç tl",
  "kac para",
  "kaç para",
  "bu ne kadar",
  "urun ne kadar",
  "kapida odeme fiyat",
  "eft fiyat",
  "indirim",
  "pazarlik",
  "son fiyat"
];

const PAYMENT_KEYWORDS = [
  "odeme",
  "ödeme",
  "iban",
  "hesap numarasi",
  "hesap numarası",
  "banka bilgisi",
  "eft",
  "havale",
  "kapida odeme",
  "kapıda ödeme",
  "odeme nasil",
  "ödeme nasıl"
];

const LASER_KEYWORDS = [
  "lazer",
  "lazer kolye",
  "lazerli",
  "resimli",
  "resimli kolye",
  "foto",
  "fotograf",
  "fotoğraf",
  "fotolu",
  "resim",
  "cift taraf",
  "cift tarafli",
  "arka tarafa foto",
  "arkali onlu",
  "iki resim",
  "2 resim",
  "iki foto",
  "2 foto",
  "iki kisi",
  "2 kisi",
  "uc kisi",
  "3 kisi",
  "dort kisi",
  "4 kisi",
  "bes kisi",
  "5 kisi",
  "birlestirme"
];

const ATAC_KEYWORDS = [
  "atac",
  "ataç",
  "atac kolye",
  "ataç kolye",
  "harf",
  "harfli",
  "harf kolye",
  "harfli kolye",
  "isim",
  "isim kolye",
  "isimli kolye",
  "bas harf",
  "baş harf",
  "kac harf",
  "kaç harf",
  "zincir",
  "zincir boyu",
  "zincir uzunlugu",
  "zincir uzunluğu",
  "zincir uzat"
];

const IMAGE_KEYWORDS = [
  "foto uygun mu",
  "resim uygun mu",
  "foto olur mu",
  "resim olur mu",
  "arka plan silinir mi",
  "arka plan temizlenir mi",
  "foto net mi",
  "resim net mi",
  "bulanik",
  "bulanık",
  "karanlik",
  "karanlık",
  "tek kare",
  "arka yuze foto",
  "arka yüze foto",
  "arkaya yazi",
  "arkaya yazı"
];

const ORDER_KEYWORDS = [
  "siparis",
  "sipariş",
  "siparis ver",
  "sipariş ver",
  "siparis vermek istiyorum",
  "sipariş vermek istiyorum",
  "satin al",
  "satın al",
  "almak istiyorum",
  "adres vereyim",
  "adres atayim",
  "adres atayım",
  "telefon vereyim",
  "numara vereyim",
  "bilgilerimi atayim",
  "bilgilerimi atayım",
  "siparis olustur",
  "sipariş oluştur"
];

const TRUST_KEYWORDS = [
  "guven",
  "güven",
  "guvenilir",
  "güvenilir",
  "dolandirici",
  "dolandırıcı",
  "gercek mi",
  "gerçek mi",
  "kaliteli mi",
  "kararma yapar mi",
  "kararma yapar mı",
  "paslanir mi",
  "paslanır mı",
  "iade var mi",
  "iade var mı",
  "degisim var mi",
  "değişim var mı",
  "magaza var mi",
  "mağaza var mı"
];

const SMALLTALK_KEYWORDS = [
  "tesekkur",
  "teşekkür",
  "tesekkurler",
  "teşekkürler",
  "sagol",
  "sağol",
  "sagolun",
  "sağolun",
  "merhaba",
  "selam",
  "iyi aksamlar",
  "iyi akşamlar",
  "iyi geceler",
  "iyi gunler",
  "iyi günler",
  "hayirli olsun",
  "hayırlı olsun",
  "basiniz sag olsun",
  "başınız sağ olsun",
  "babami kaybettim",
  "babamı kaybettim",
  "yeni kaybettim",
  "dogumum var",
  "doğumum var",
  "bebek bekliyorum"
];

function pickKnowledgeFiles(message, userProduct = "") {
  const msg = normalize(`${message} ${userProduct}`);
  const files = ["core_system.txt"];

  if (includesAny(msg, SHIPPING_KEYWORDS)) {
    files.push("shipping.txt", "delivery_time.txt");
  }

  if (includesAny(msg, PRICING_KEYWORDS)) {
    files.push("pricing.txt");
  }

  if (includesAny(msg, PAYMENT_KEYWORDS)) {
    files.push("payment.txt");
  }

  if (includesAny(msg, LASER_KEYWORDS)) {
    files.push("product_laser.txt", "image_rules.txt");
  }

  if (includesAny(msg, ATAC_KEYWORDS)) {
    files.push("product_atac.txt");
  }

  if (includesAny(msg, IMAGE_KEYWORDS)) {
    files.push("image_rules.txt");
  }

  if (includesAny(msg, ORDER_KEYWORDS)) {
    files.push("order_flow.txt");
  }

  if (includesAny(msg, TRUST_KEYWORDS)) {
    files.push("trust.txt");
  }

  if (includesAny(msg, SMALLTALK_KEYWORDS)) {
    files.push("smalltalk.txt");
  }

  return [...new Set(files)];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ reply: "çalışıyor" });
  }

  try {
    const message = req.body?.message || "";
    const userProduct = req.body?.user_product || "";
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ reply: "API KEY YOK" });
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

Kurallar:
- Sadece verilen bilgi dosyalarına göre konuş.
- Bilgi yoksa asla uydurma.
- Kısa, net ve doğal konuş.
- İnsan gibi yaz.
- Müşteri ürün belirtmemişse ve cevap ürün bilgisine bağlıysa önce ürünü netleştir.
- Müşteri sormadıkça gizli tutulması gereken bilgileri kendin sunma.
- Gereksiz uzun açıklama yapma.
- Satış dilin sıcak, kibar ve profesyonel olsun.
`;

    const finalPrompt = `
KULLANICI MESAJI:
${message}

KULLANICI ETİKETİ:
${userProduct}

BİLGİ DOSYALARI:
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
        model: "claude-3-haiku-20240307",
        max_tokens: 350,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: finalPrompt
          }
        ]
      })
    });

    const data = await response.json();
    const reply = data?.content?.[0]?.text?.trim() || "";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(200).json({ reply: "Hata oluştu." });
  }
}
