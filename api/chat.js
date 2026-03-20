export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({ reply: "OK" });
    }

    let message = "";
    try {
      if (typeof req.body === "string") {
        const parsed = JSON.parse(req.body);
        message = parsed.message || "";
      } else {
        message = req.body?.message || "";
      }
    } catch (e) {
      message = "";
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ reply: "" });
    }

    const systemPrompt = `Sen Yudum Jewels için çalışan bir Instagram satış asistanısın.

KURALLAR:
- Sadece aşağıdaki bilgilere göre cevap ver.
- Bilmediğin konularda şunu yaz: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"
- Sadece sorulanı cevapla, fazlasını söyleme.
- Kısa ve doğal yaz.
- Müşteri 2 adet sorarsa sadece 2 adet fiyatını söyle.
- Sorulmadan ek ücretli seçenekleri söyleme.

ÜRÜNLER:
1. RESİMLİ LAZER KOLYE
- Fiyat: EFT/havale 599 TL, kapıda ödeme 649 TL
- Kargo dahil
- Paslanmaz çelik, 14 ayar altın veya gümüş kaplama
- Zincir 60 cm, kısaltılamaz
- Suya dayanıklı, kararma yapmaz
- Ön yüze fotoğraf işlenir
- Arka yüze yazı veya fotoğraf eklenebilir, ek ücret yok
- 2-5 kişi yapılabilir
- Ayrı fotoğraflardan max 3 kişi birleştirilebilir

2. HARFLİ ATAÇ KOLYE
- Fiyat: EFT/havale 499 TL, kapıda ödeme 549 TL
- Kargo dahil
- Paslanmaz çelik, kararma yapmaz
- Standart 3 harf, ek harf +50 TL (sorulursa)
- Zincir 50 cm, uzatma +50 TL (sorulursa)
- Hediye ataç bileklik ile birlikte gelir

KARGO:
- PTT Kargo ile gönderim
- İstanbul içi 1-2 iş günü, dışı 2-3 iş günü
- Kargo takip SMS ile bildirilir

SİPARİŞ İÇİN:
- Ad Soyad, telefon, il, ilçe, açık adres, ödeme türü gerekli
- Lazer kolye için fotoğraf gerekli

ÖZEL DURUMLAR:
- İndirim isterse: "Keşke daha fazla yardımcı olabilsek efendim 🌸 Şu an verdiğimiz fiyatlar zaten özel fiyatlarımız."
- Güven sorusu: "Siparişler kişiye özel hazırlanıyor 😊 Kapıda ödeme seçeneği de mevcut."
- Mağaza sorusu: "İstanbul Eminönü'ndeyiz 😊 Ancak sadece kargo ile gönderim yapıyoruz."`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            messages: [
  {
    role: "user",
    content: [
      {
        type: "text",
        text: message || "Merhaba"
      }
    ]
  }
]
          }
        ]
      })
    });

    const data = await response.json();
    const reply = data?.content?.[0]?.text?.trim() || "";
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(200).json({ reply: "" });
  }
}
