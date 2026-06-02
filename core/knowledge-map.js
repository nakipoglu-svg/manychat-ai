// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// KNOWLEDGE MAP — Tek harita: intent + product → hangi dosya(lar)
// Hiçbir yerde dağınık if-else yok. Burası tek kaynak.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import fs from "fs";
import path from "path";

const cache = {};

function read(filename) {
  if (cache[filename] !== undefined) return cache[filename];
  try {
    const fp = path.join(process.cwd(), "knowledge", filename);
    cache[filename] = fs.readFileSync(fp, "utf8") || "";
  } catch { cache[filename] = ""; }
  return cache[filename];
}

// ─── FACT BLOCKS — kısa, dar, tek konu ──────────────────────
// AI promptuna doğrudan gider. Full dosya DEĞİL.

const FACT = {
  chain_lazer: `ZİNCİR (LAZER KOLYE):
60 cm standart. Herkese aynı. Erkek/kadın farkı yok.
Uzatma YOK. Kısaltma YOK. Farklı model YOK.
"50 cm", "45 cm", "kısa zincir" ASLA yazma.
Görmek isteyen → highlight linkleri ver:
📸 https://www.instagram.com/stories/highlights/18084971893996144/
📦 https://www.instagram.com/stories/highlights/18079575341155587/`,

  chain_atac: `ZİNCİR (ATAÇ KOLYE):
50 cm standart. Uzatma var: max 70 cm, +50 TL.
Tek model.`,

  material: `MATERYAL:
14 ayar altın kaplama paslanmaz çelik.
Kararma, solma yapmaz. Suya dayanıklı.
Altın kaplama ve gümüş kaplama renk seçeneği var.
Gerçek altın veya gümüş DEĞİL.`,

  shipping: `KARGO:
PTT Kargo, ÜCRETSİZ.
İstanbul: 1-2 iş günü. Diğer: 2-3 iş günü.
Kesin tarih verme. "Genellikle" kullan.`,

  payment: `ÖDEME:
EFT/Havale veya kapıda ödeme.
Kapıda SADECE NAKİT. Kredi kartı YOK.
Taksit YOK.
IBAN sadece müşteri EFT seçip isterse ver.`,

  trust: `GÜVEN:
Garanti: kararma, solma, kaplama atma → değişim.
Kapıda ödeme seçeneği var.
Kişiye özel üretim → keyfi iade yok.`,

  photo: `FOTOĞRAF:
Vesikalık şart değil. Her fotoğraf olur.
Tek kolyeye birden fazla foto yapılır (ücret farkı yok).
Ön + arka farklı foto yapılır (ücret farkı yok).`,

  back_text: `ARKA YÜZ:
Yazı veya foto eklenebilir, ÜCRETSİZ.
İsim, tarih, dua, not yazılabilir.
Bot arka yazı SORMAZ. Müşteri isterse yapılır.`,

  example: `ÖRNEK GÖRMEK İSTEYENE:
📸 Örnek çalışmalar: https://www.instagram.com/stories/highlights/18084971893996144/
📦 Sizden gelenler: https://www.instagram.com/stories/highlights/18079575341155587/`,

  pricing_lazer: `FİYAT (LAZER):
EFT 599 TL, kapıda 649 TL.
Kişi sayısı fiyatı değiştirmez.
2 kolye: EFT 1000, kapıda 1100.
3 kolye: EFT 1400, kapıda 1500.`,

  pricing_atac: `FİYAT (ATAÇ):
3 harf standart: EFT 499 TL, kapıda 549 TL.
Her ek harf +50 TL.`,
};

// ─── INTENT → FACT BLOCK mapping ────────────────────────────

function getFactBlock(intent, product) {
  const map = {
    chain_question:     product === "lazer" ? "chain_lazer" : "chain_atac",
    material_question:  "material",
    trust:              "trust",
    shipping:           "shipping",
    shipping_price:     "shipping",
    payment:            "payment",
    payment_info_question: "payment",
    photo_question:     "photo",
    photo_suitability_question: "photo",
    back_text_info:     "back_text",
    back_text_examples: "back_text",
    back_text:          "back_text",
    example_request:    "example",
    price:              product === "lazer" ? "pricing_lazer" : product === "atac" ? "pricing_atac" : "pricing_lazer",
    location:           null,
  };
  const key = map[intent];
  return key ? FACT[key] : null;
}

// ─── INTENT → KNOWLEDGE FILES (sadece AI'ye giden full dosya) ─

function getKnowledgeFiles(intent, product) {
  // Hard-fact: fact block yeterli, full dosya gönderme
  const hardFact = ["chain_question","material_question","trust","shipping","shipping_price",
    "payment","payment_info_question","example_request","price"];
  if (hardFact.includes(intent)) return [];

  // Diğer konularda minimal dosya seti
  const files = [];

  // Genel konularda kısa core rules
  if (["general","smalltalk","complaint","clarification","meta"].includes(intent)) {
    files.push("CORE_SYSTEM.txt");
  }

  // Ürün dosyası sadece genel/belirsiz konularda
  if (!hardFact.includes(intent)) {
    if (product === "lazer") files.push("PRODUCT_LASER.txt");
    if (product === "atac") files.push("PRODUCT_ATAC.txt");
    if (product === "anahtarlik") files.push("PRODUCT_PHOTO_KEYCHAIN.txt");
    if (product === "evcil_hayvan_mezar_tasi") files.push("PRODUCT_PET_MEMORIAL.txt");
    if (product === "resimli_lazer_bileklik") files.push("PRODUCT_LASER_BRACELET.txt");
  }

  // Fotoğraf konusunda IMAGE_RULES
  if (["photo_question","photo_suitability_question","photo"].includes(intent)) {
    files.push("IMAGE_RULES.txt");
  }

  // Back text konusunda PRODUCT dosyası (arka yazı bilgisi orada)
  if (["back_text","back_text_info","back_text_examples"].includes(intent)) {
    if (product === "lazer") files.push("PRODUCT_LASER.txt");
  }

  return [...new Set(files)]; // deduplicate
}

// ─── PUBLIC API ──────────────────────────────────────────────

export function selectKnowledge(intent, product) {
  const factBlock = getFactBlock(intent, product) || "";
  const files = getKnowledgeFiles(intent, product);
  const fileContents = files.map(f => read(f)).filter(Boolean);

  // Token budget: max 3000 chars for knowledge
  let knowledge = fileContents.join("\n\n");
  if (knowledge.length > 3000) knowledge = knowledge.substring(0, 3000);

  return { factBlock, knowledge };
}
