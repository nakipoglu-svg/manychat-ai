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
  }

  // Ürün switch: önceki vardı, yenisi farklı
  if (previousProduct && product !== previousProduct) {
    if (product === PRODUCT.LAZER) return PE(TEXT.LAZER_PRICE);
    if (product === PRODUCT.ATAC) return PE(TEXT.ATAC_PRICE);
  }

  return null;
}
