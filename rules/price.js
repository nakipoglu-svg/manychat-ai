// price.js — Fiyat soruları
import { INTENT, PRODUCT, REPLY_CLASS, PRICE, TEXT } from "../constants.js";
import { hasAny, truthy } from "../normalize.js";

const R = (t) => ({ text: t, reply_class: REPLY_CLASS.FIXED_INFO, support_mode_reason: "" });

export function priceRule(ctx, state) {
  if (ctx.intent !== INTENT.PRICE) return null;
  const { norm } = ctx;

  // Cross-product
  if (state.product === PRODUCT.LAZER && hasAny(norm, ["atac","ataç","harfli"])) return R("Harfli ataç kolye: EFT / havale 499 TL, kapıda ödeme 549 TL'dir efendim 😊 3 harfe kadar standarttır, her ek harf +50 TL'dir.");
  if (state.product === PRODUCT.ATAC && hasAny(norm, ["resimli","lazer","fotografli"])) return R("Resimli lazer kolye: EFT / havale 599 TL, kapıda ödeme 649 TL'dir efendim 😊");

  // Ürün yok → menü
  if (!state.product) return { text: "Hemen yardımcı olayım efendim 😊\nHangi ürün için fiyat istersiniz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye", reply_class: REPLY_CLASS.MENU, support_mode_reason: "" };

  if (state.product === PRODUCT.LAZER) {
    const m = norm.match(/(\d+)\s*(tane|adet|tanesini|adedini)/);
    const qty = m ? parseInt(m[1]) : 0;
    if (qty >= 2) {
      const p = PRICE.MULTI_LAZER[qty] || PRICE.MULTI_LAZER[5];
      if (p.kapida) return R(`${qty} adet resimli lazer kolye: EFT / Havale ile ${p.eft} TL, kapıda ödeme ile ${p.kapida} TL'dir efendim 😊`);
      return R(`${qty} adet resimli lazer kolye: EFT / Havale ile ${p.eft} TL'dir efendim 😊 (${qty}+ adet sadece EFT ile mümkündür)`);
    }
    return R("EFT / havale fiyatımız 599 TL, kapıda ödeme fiyatımız 649 TL'dir efendim 😊");
  }
  if (state.product === PRODUCT.ATAC) return R("EFT / havale fiyatımız 499 TL, kapıda ödeme fiyatımız 549 TL'dir efendim 😊 3 harfe kadar standarttır, her ek harf +50 TL'dir.");

  return null;
}
