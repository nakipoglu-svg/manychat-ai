// product-entry.js — Ürün ilk seçimi + switch
import { PRODUCT, STAGE, REPLY_CLASS, TEXT } from "../constants.js";

const PE = (t) => ({ text: t, reply_class: REPLY_CLASS.PRODUCT_ENTRY, support_mode_reason: "" });

export function productEntry(ctx, state) {
  const { product, previousProduct, fields } = ctx;
  if (!product) return null;

  // İlk seçim: akış henüz başlamamış
  const stage = fields.conversation_stage || "";
  const fresh = !state.photo_received && !state.letters_received &&
                !state.payment_method && !state.address_status && !state.back_text_status &&
                (!stage || stage === STAGE.WAITING_PRODUCT);

  if (fresh) {
    if (product === PRODUCT.LAZER) return PE(TEXT.LAZER_PRICE);
    if (product === PRODUCT.ATAC) return PE(TEXT.ATAC_PRICE);
    if (product === PRODUCT.ANAHTARLIK) return PE(TEXT.ANAHTARLIK_INFO);
    if (product === PRODUCT.MEZAR_TASI) return PE(TEXT.MEZAR_TASI_INFO);
    if (product === PRODUCT.BILEKLIK) return PE(TEXT.BILEKLIK_INFO);
    if (product === PRODUCT.OTHER) return { text: TEXT.OTHER_PRODUCT_REDIRECT, reply_class: REPLY_CLASS.SELLER_REQUIRED, support_mode_reason: "seller_required" };
  }

  // Ürün switch: önceki vardı, yenisi farklı
  if (previousProduct && product !== previousProduct) {
    if (product === PRODUCT.LAZER) return PE(TEXT.LAZER_PRICE);
    if (product === PRODUCT.ATAC) return PE(TEXT.ATAC_PRICE);
    if (product === PRODUCT.ANAHTARLIK) return PE(TEXT.ANAHTARLIK_INFO);
    if (product === PRODUCT.MEZAR_TASI) return PE(TEXT.MEZAR_TASI_INFO);
    if (product === PRODUCT.BILEKLIK) return PE(TEXT.BILEKLIK_INFO);
    if (product === PRODUCT.OTHER) return { text: TEXT.OTHER_PRODUCT_REDIRECT, reply_class: REPLY_CLASS.SELLER_REQUIRED, support_mode_reason: "seller_required" };
  }

  return null;
}
