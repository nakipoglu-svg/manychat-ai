// Knowledge map — intent/product -> new numbered knowledge files.
// Keep this narrow: deterministic handlers answer first, AI gets only the relevant files.

import fs from "fs";
import path from "path";

const cache = {};

function read(filename) {
  if (cache[filename] !== undefined) return cache[filename];
  try {
    const fp = path.join(process.cwd(), "knowledge", filename);
    cache[filename] = fs.readFileSync(fp, "utf8") || "";
  } catch {
    cache[filename] = "";
  }
  return cache[filename];
}

const K = {
  common: "01 - Ortak Urun Bilgileri.txt",
  pricing: "02 - Fiyat Listesi.txt",
  dimensions: "03 - Urun Olculeri.txt",
  colors: "04 - Renk Secenekleri.txt",
  shipping: "05 - Kargo.txt",
  payment: "06 - Odeme.txt",
  photo: "07 - Fotograf.txt",
  order: "08 - Siparis.txt",
  address: "09 - Adres Isteme.txt",
  backText: "10 - Arka Yuz Islemi.txt",
  backPhoto: "11 - Arka Yuze Ikinci Fotograf.txt",
  chain: "12 - Zincir Bilgileri.txt",
  accessories: "13 - Aksesuarlar.txt",
  warranty: "14 - Garanti ve Iade.txt",
  mergePhoto: "15 - Fotograf Birlestirme.txt",
  transparentShipping: "16 - Seffaf Kargo.txt",
  payAfterSeeing: "17 - Urunu Gormeden Odeme.txt",
  preview: "18 - Prova ve On Izleme.txt",
  finishedPhoto: "19 - Bitmis Urun Fotografi.txt",
  iban: "20 - IBAN Bilgileri.txt",
  yonca: "21 - Isimli Yonca Kolye Bilgileri.txt",
  memorial: "22 - Evcil Hayvan Mezar Tasi Bilgileri.txt",
  atac: "23 - Harfli Atac Kolye Bilgileri.txt",
  laserVsPrint: "24 - Renkli Baski ve Lazer Islemi.txt",
  whatsapp: "25 - WhatsApp Iletisim.txt",
  store: "26 - Magaza ve Satis Kanallari.txt",
  examples: "27 - Urun Ornekleri.txt",
  pendant: "28 - Zincir Dahil ve Tek Uc.txt",
  metal: "29 - Altin Gumus Celik Bilgisi.txt",
  twoPendants: "30 - Iki Uc ve Iki Plaka.txt",
};

function productFiles(product) {
  if (product === "atac") return [K.atac];
  if (product === "yonca") return [K.yonca];
  if (product === "evcil_hayvan_mezar_tasi") return [K.memorial];
  if (product === "resimli_lazer_bileklik") return [K.photo, K.dimensions];
  if (product === "anahtarlik") return [K.photo, K.dimensions, K.colors];
  return [];
}

function getKnowledgeFiles(intent, product) {
  const files = [];

  const add = (...names) => files.push(...names.filter(Boolean));

  switch (intent) {
    case "price":
    case "price_confirmation":
      add(K.pricing);
      break;
    case "shipping":
    case "shipping_price":
      add(K.transparentShipping, K.shipping);
      break;
    case "payment":
    case "payment_info_question":
      add(K.iban, K.payAfterSeeing, K.payment);
      break;
    case "photo":
    case "photo_question":
    case "photo_suitability_question":
    case "photo_acceptance_question":
      add(K.mergePhoto, K.photo);
      break;
    case "preview_request":
      add(K.finishedPhoto, K.preview, K.payAfterSeeing);
      break;
    case "completed_photo_share_request":
      add(K.finishedPhoto);
      break;
    case "back_text":
    case "back_text_info":
    case "back_text_question":
    case "back_text_content":
    case "back_text_examples":
    case "back_text_fit_question":
      add(K.backText);
      break;
    case "back_photo_info":
    case "back_photo_upload":
    case "composition_question":
      add(K.twoPendants, K.mergePhoto, K.backPhoto);
      break;
    case "chain_question":
    case "chain_structure_request":
      add(K.pendant, K.chain);
      break;
    case "single_pendant_request":
    case "product_structure_request":
      add(K.twoPendants, K.pendant);
      break;
    case "material_question":
      add(K.metal, K.common);
      break;
    case "trust":
      add(K.warranty, K.common);
      break;
    case "location":
    case "store_pickup":
      add(K.store);
      break;
    case "example_request":
      add(K.examples);
      break;
    case "order_start":
    case "new_order":
      add(K.order);
      break;
    case "address":
    case "address_claim":
    case "address_provide_full":
    case "address_provide_partial":
      add(K.address);
      break;
    default:
      add(K.common, ...productFiles(product));
  }

  add(...productFiles(product));

  return [...new Set(files)];
}

export function selectKnowledge(intent, product) {
  const files = getKnowledgeFiles(intent, product);
  const fileContents = files.map(read).filter(Boolean);
  let knowledge = fileContents.join("\n\n");
  if (knowledge.length > 5000) knowledge = knowledge.substring(0, 5000);
  return { factBlock: "", knowledge };
}
