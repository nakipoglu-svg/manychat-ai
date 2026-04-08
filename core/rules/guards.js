// guards.js — Completed guard + Human support guard
import { INTENT, STAGE, REPLY_CLASS, SUPPORT_REASON, TEXT } from "../constants.js";
import { hasAny, truthy } from "../normalize.js";

const R = (t, c = REPLY_CLASS.FLOW_PROGRESS, r = SUPPORT_REASON.NONE) => ({ text: t, reply_class: c, support_mode_reason: r });
const OP = (t) => R(t, REPLY_CLASS.OPERATIONAL_REQUIRED, SUPPORT_REASON.OPERATIONAL);

export function guards(ctx, state, nextStage) {
  // ═══ ORDER COMPLETED GUARD ═══
  const isComp = state.order_status === "completed" || truthy(state.siparis_alindi);
  const wasComp = ctx.fields.conversation_stage === STAGE.ORDER_COMPLETED || state.conversation_stage === STAGE.ORDER_COMPLETED;

  if (isComp && wasComp) {
    const { intent, norm, message } = ctx;
    const raw = String(message || "").trim();

    // Pass-through intents (rule chain'e bırak)
    if ([INTENT.CANCEL, INTENT.NEW_ORDER, INTENT.ORDER_START].includes(intent)) return null;
    if (["trust","material_question","price","location","chain_question","shipping_price","payment_info_question","photo_sent_confirmation"].includes(intent)) return null;
    if (intent === INTENT.PAYMENT) return null; // post-completion payment handler'a

    // Ürün keyword → yeni sipariş yönlendir
    if (hasAny(norm, ["resimli","lazer","atac","ataç","harfli"])) {
      return R("Tabi efendim 😊 Yeni sipariş için ekibimiz size yardımcı olacaktır.", REPLY_CLASS.SELLER_REQUIRED, SUPPORT_REASON.SELLER);
    }

    // Smalltalk — operasyonel talep içeriyorsa engelle
    if (intent === INTENT.SMALLTALK) {
      if (raw.length > 30 && hasAny(norm, ["merhaba","selam","mrb"]) &&
          hasAny(norm, ["kolye","siparis","sipariş","kargo","fotograf","fotoğraf","yapinca","yapınca","hazir","hazır","ne zaman","atabilir","gonderebilir"])) {
        return OP("Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊");
      }
      return null; // pure smalltalk → smalltalk rule'a düşsün
    }

    // Sipariş onay (satıcı tarafından)
    if (hasAny(norm, ["siparisiniz olusturuldu","siparişiniz oluşturuldu","siparisiniz alindi","siparişiniz alındı","siparisiniz tamamlandi","siparişiniz tamamlandı"])) {
      return R("Siparişiniz onaylanmıştır efendim 😊 Ekibimiz en kısa sürede ürününüzü hazırlayacaktır.", REPLY_CLASS.ORDER_COMPLETE);
    }

    // Kargo — kişisel takip vs genel bilgi
    if (intent === INTENT.SHIPPING) {
      if (hasAny(norm, ["kargom","siparisim","siparişim","gelmedi","ulasmadi","ulaşmadı","verildi mi","verdiniz mi","yola cikti","yola çıktı","mesaj geldi","mesaj gelmedi","teslim olmadi","kargoya verilmis","dagitimda","dağıtımda","urunum","ürünüm","benim kargo","herkesin","hala gelmedi","cikti mi","çıktı mı","nerde kargo","nerede kargo","takip numara","gondermis","göndermiş"])) {
        return OP("Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊");
      }
      return null; // genel kargo → side-questions'a düşsün
    }

    if (intent === INTENT.POST_SALE) return OP("Ekibimize iletiyorum, kontrol edip hemen dönüş sağlıyorum efendim 😊");

    // Şikayet
    if (hasAny(norm, ["memnun kalmadim","memnun kalmadım","memnun degilim","memnun değilim","istedigim gibi degil","istediğim gibi değil","yanlis olmus","yanlış olmuş","sikayet","şikayet","begenmedi","beğenmedi","begenmedim","beğenmedim","kotu","kötü","berbat","fakat","siparisimle","siparişimle","cok kara","çok kara","net degil","net değil","anlasilmiyor","anlaşılmıyor","sinir oldum","hic hos degil","hiç hoş değil","iade","iptal","cevap vermiyorsunuz","cevap alamiyorum","donus yapmiyorsunuz","dönüş yapmıyorsunuz","magdur","mağdur"])) {
      return OP("Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊");
    }

    // Kısa onay
    if (norm.length < 20 && (hasAny(norm, ["tamam","olur","peki","tamamdir","anladim","anladım","evet","tm","tmm","ok","dogru","doğru"]) || raw.length <= 8)) {
      return R("Tabi efendim 😊", REPLY_CLASS.FIXED_INFO);
    }

    // Bekliyorum
    if (hasAny(norm, ["bekliyorum","haber bekliyorum","donus bekliyorum","dönüş bekliyorum","cvp bekliyorum"])) {
      return OP("Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊");
    }

    // Pass-through'lar
    if (hasAny(norm, ["bitince","hazir olunca","hazır olunca","gondermeden once","göndermeden önce","benimle paylas","benimle paylaş"])) return null;
    if (/\d+\s*(tl|lira)/i.test(raw) && hasAny(norm, ["dimi","di mi","degil mi","değil mi"])) return null;
    if (hasAny(norm, ["yapim asamasi","yapım aşaması","surec nasil","süreç nasıl"])) return null;

    // Default: ekibe yönlendir
    return OP("Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊");
  }

  // ═══ HUMAN SUPPORT GUARD ═══
  if (state.conversation_stage === STAGE.HUMAN_SUPPORT) {
    if (ctx.intent === INTENT.SMALLTALK) return null; // smalltalk rule'a düşsün
    return OP(TEXT.FALLBACK);
  }

  return null;
}
