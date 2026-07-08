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
    location: "Beykoz İstanbul",
    location_detail: "Satışlarımız online üzerinden yapılmaktadır, Türkiye'nin her yerine kargo ile gönderim yapıyoruz.",
  },

  // ─── FİYATLANDIRMA ─────────────────────────────────────
  pricing: {
    lazer: { eft: 649, kapida: 699 },
    atac: { eft: 549, kapida: 599 },
    atac_extra_letter: 50,
    chain_extension: 0,      // Özel zincir uzatma/kısaltma yok
    aras_kargo_extra: 0,     // Farklı kargo seçeneği yok
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
    aras_available: false,
    aras_condition: "",
  },

  // ─── ÜRÜN ───────────────────────────────────────────────
  product: {
    material: "316L kalite paslanmaz çelik",
    material_short: "Kararma, solma yapmaz",
    lazer_chain_cm: 60,
    atac_chain_cm: 50,
    max_chain_cm: 60,
    plaka_cm: 2.5,
    colors: ["altın renk", "gümüş renk"],
    accessories: ["pembe kalp", "nazar boncuğu"],
  },

  // ─── IBAN TEMPLATESİ ───────────────────────────────────
  get eftInfoText() {
    return `IBAN: ${this.payment.iban}\nAlıcı: ${this.payment.iban_holder}`;
  },

  // ─── SİPARİŞ BİLGİ TEMPLATESİ ─────────────────────────
  orderDetailsText: "📌 Sipariş için lütfen şu 3 bilgiyi mümkünse tek mesajda paylaşın:\n\n👤 Ad soyad\n📱 Cep telefonu\n📍 Açık adres",
};
