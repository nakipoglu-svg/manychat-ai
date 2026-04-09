// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SINGLE SOURCE CONFIG — Tüm sabit bilgiler tek yerde
// Reply'ler, knowledge dosyaları ve constants buradan beslenir
// Çakışma yasak: bu dosya her zaman doğrudur
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const CONFIG = {
  // ─── İLETİŞİM ───────────────────────────────────────────
  contact: {
    whatsapp: "0505 471 35 45",
    whatsapp_full: "WhatsApp iletişim numaramız: 0505 471 35 45 😊",
    location: "İstanbul Eminönü",
    location_detail: "Satışlarımız online üzerinden yapılmaktadır, Türkiye'nin her yerine kargo ile gönderim yapıyoruz.",
  },

  // ─── FİYATLANDIRMA ─────────────────────────────────────
  pricing: {
    lazer: { eft: 599, kapida: 649 },
    atac: { eft: 499, kapida: 549 },
    atac_extra_letter: 50,
    multi_lazer: {
      2: { eft: 1000, kapida: 1100 },
      3: { eft: 1400, kapida: 1500 },
      4: { eft: 1750, kapida: null },
      5: { eft: 2000, kapida: null },
    },
    chain_extension: 50,     // 70cm uzatma ücreti
    aras_kargo_extra: 25,    // Aras Kargo farkı
  },

  // ─── ÖDEME ──────────────────────────────────────────────
  payment: {
    iban: "TR34 0015 7000 0000 0076 2524 67",
    iban_holder: "Servet Cihan Nakipoğlu",
    methods: ["eft_havale", "kapida_odeme"],
    kapida_note: "Kapıda ödemede sadece nakit geçerlidir, kredi kartı kullanılamamaktadır.",
  },

  // ─── KARGO ──────────────────────────────────────────────
  shipping: {
    carrier: "PTT Kargo",
    istanbul_days: "1-2 iş günü",
    other_days: "2-3 iş günü",
    prep_time: "1 gün içinde",
    free: true,
    aras_available: true,
    aras_condition: "EFT/Havale siparişlerinde",
  },

  // ─── ÜRÜN ───────────────────────────────────────────────
  product: {
    material: "14 ayar altın kaplama paslanmaz çelik",
    material_short: "Kararma, solma yapmaz",
    lazer_chain_cm: 60,
    atac_chain_cm: 50,
    max_chain_cm: 70,
    plaka_cm: 3,
    colors: ["altın kaplama (gold)", "gümüş kaplama", "mat çelik"],
    accessories: ["pembe kalp", "lacivert kalp", "nazar boncuğu"],
  },

  // ─── IBAN TEMPLATESİ ───────────────────────────────────
  get eftInfoText() {
    return `IBAN: ${this.payment.iban}\nAlıcı: ${this.payment.iban_holder}`;
  },

  // ─── SİPARİŞ BİLGİ TEMPLATESİ ─────────────────────────
  orderDetailsText: "📌 Sipariş için lütfen şu 3 bilgiyi mümkünse tek mesajda paylaşın:\n\n👤 Ad soyad\n📱 Cep telefonu\n📍 Açık adres",
};
