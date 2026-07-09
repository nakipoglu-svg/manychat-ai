// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INTENT ENGINE v8.3 — Kapsamlı intent algılama
// Sıra: system → slot_commit → sensitivity → complaint → claim →
//       info (specific→generic) → product_flow → ack/smalltalk → back_text → general
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { KW, INTENT, STAGE, PRODUCT, SLOT_CLAIM_SIGNALS, FUTURE_INTENT_SIGNALS, CLAIM_TARGET_PHOTO, CLAIM_TARGET_ADDRESS, CLAIM_TARGET_PHONE, CLAIM_TARGET_ALL, PARTIAL_ADDRESS_SIGNALS, PHONE_REGEX, COMPLETED_NEUTRAL_ACK, COMPLETED_GRATITUDE, COMPLETED_PHOTO_SHARE_REQ, COMPLETED_CHANGE_REQ } from "./constants.js";
import { hasAny, looksLikePhotoUrl, extractPhone, looksLikeAddress, looksLikeName, extractLetters, parsePaymentFromMessage } from "./normalize.js";

function isChainDimensionIntent(norm) {
  const chainSubject = hasAny(norm, ["zincir","zinciri","zincirin","kolye boyu","kolye zinciri","bileklik boyu","bileklik uzunlugu","bileklik uzunluğu"]);
  const dimensionWord = hasAny(norm, ["uzun","kisa","kısa","kalin","kalın","ince","boy","cm","santim","model","secenek","seçenek","uzat","kisalt","kısalt"]);
  const customerLengthPreference = hasAny(norm, ["kisa istemiyorum","kısa istemiyorum","gogse kadar","göğse kadar","gogus hizasi","göğüs hizası","gogus hizasında","göğüs hizasında"]);
  const bareThicknessQuestion = hasAny(norm, ["ne kadar kalin","ne kadar kalın","kalinligi ne","kalınlığı ne","kalinlik ne","kalınlık ne"]);
  const chainModelReference = chainSubject && hasAny(norm, [
    "hangisi","olcak","olacak","bu zincir","su zincir","şu zincir","attigim zincir","attığım zincir",
    "zincirden var", "zinciri sayfanizda", "zinciri sayfanızda", "sayfanizda bulamadim", "sayfanızda bulamadım",
    "zinciri bulamadim", "zinciri bulamadım", "zinciri istiyorum"
  ]);
  const bareChainQuestion = ["zincir", "zinciri", "zincir?"].includes(norm.trim());

  return (chainSubject && dimensionWord) || chainModelReference || bareChainQuestion || customerLengthPreference || bareThicknessQuestion || hasAny(norm, KW.chain);
}

function isPhotoQualityIntent(norm, stage) {
  const photoSubject = hasAny(norm, ["foto","fotograf","fotoğraf","resim","gorsel","görsel"]);
  const qualityWord = hasAny(norm, ["olur","uygun","net","bulanik","bulanık","kalite","duzgun","düzgün","yeterli","kullanilabilir","kullanılabilir"]);
  const compositionContext =
    hasAny(norm, ["iki foto","2 foto","iki resim","2 resim","arka","arkasi","arkası","arkaya","on yuz","ön yüz","iki yuz","iki yüz","birleştir","birlestir","resim bas","foto bas","fotoğraf bas"]) ||
    (hasAny(norm, ["iki","2","1 tane","bir tane","zincire","kolyeye"]) && photoSubject);
  const standaloneQualityInPhotoStage =
    stage === STAGE.WAITING_PHOTO &&
    hasAny(norm, ["net degil","net değil","cok net degil","çok net değil","bulanik sanki","bulanık sanki","net degil sanki","net değil sanki"]);

  if (compositionContext) return false;
  return (photoSubject && qualityWord) || standaloneQualityInPhotoStage || hasAny(norm, KW.photo_question);
}

function isUnansweredComplaint(norm) {
  return hasAny(norm, [
    "cvp yok", "cvp yok mu", "cevap yok", "cevap yok mu", "cevap alamadim", "cevap alamıyorum",
    "soruma cevap", "bir sey soruyorum", "bir şey soruyorum",
    "ne cevap veriyorsunuz", "ne cevap veriyorsun", "cevap vermiyorsunuz",
    "neden cevap", "hala cevap", "neden donus", "neden dönüş", "hala donus", "hala dönüş",
    "donus yapmiyorsunuz", "dönüş yapmıyorsunuz", "donus yapılmadi", "dönüş yapılmadı",
    "mesajlarimi okur", "mesajlarımı okur", "mesajlarimi kontrol", "mesajlarımı kontrol",
    "mesajimi okur", "mesajımı okur", "yazdiklarimi oku", "yazdıklarımı oku",
    "ilgilene bilir misiniz", "ilgilenebilir misiniz", "bir bakar misiniz", "bir bakar mısınız"
  ]);
}

export function detectIntent(ctx) {
  const { message, norm, product, stage, extracted } = ctx;
  const raw = String(message || "").trim();

  // ═══ 0. EMPTY / SYSTEM ═══
  if (!raw || raw.length <= 1) return "general";
  const backTextDone = ctx.fields?.back_text_status === "received" || ctx.fields?.back_text_status === "skipped";
  if (/^(liked a message|reacted)/.test(norm)) return "smalltalk";
  if (hasAny(norm, ["the message could not be displayed","api restrictions","dosya eki gonderdi","bir dosya eki gönderdi","started an audio call","missed an audio call","started a video chat","reacted to your message",
    "instagram kisitlama","instagram kısıtlama","kisitlamalari nedeniyle","kısıtlamaları nedeniyle","bu mesaji goruntuleye","bu mesajı görüntüleye","goruntuleyemiyoruz","görüntüleyemiyoruz","mesaji goruntuleyemedik","mesajı görüntüleyemedik"])) return "system_message";

  if (isUnansweredComplaint(norm)) return "post_sale";

  // ═══════════════════════════════════════════════════════════════════════
  // SIRA 7 — COMPLETED EDGE-CASE POLICY
  // Completed stage'de özel intent hiyerarşisi — normal stage'den önce çalışır
  // ═══════════════════════════════════════════════════════════════════════
  if (stage === STAGE.ORDER_COMPLETED || stage === "order_completed") {
    // C1: completed_change_request — değişiklik/iptal
    if (hasAny(norm, COMPLETED_CHANGE_REQ)) return "completed_change_request";
    // C2: arka yazı ek içerik — "arkasına doğum tarihi de olsun"
    // Note: "olsun" jussive modifier olduğu için tek başına write-verb olarak sayılmaz;
    // arkasina/arkaya explicit back marker + gerçek write verb bekliyoruz.
    if (hasAny(norm, ["arkasina","arkasına","arka yuzune","arka yüzüne","arka tarafa","arkaya"]) &&
        hasAny(norm, ["yazalim","yazalım","yazsin","yazsın","ekleyelim","ekle","eklensin","yazilsin","yazılsın","de olsun","da olsun"])) return "completed_back_text_content";
    // C3: foto paylaşım isteği
    if (hasAny(norm, COMPLETED_PHOTO_SHARE_REQ)) return "completed_photo_share_request";
    // C4: teşekkür / memnuniyet
    if (hasAny(norm, COMPLETED_GRATITUDE)) return "completed_gratitude";
    // C5: kısa nötr ack — sadece exact match, uzunluk tabanlı değil
    if (hasAny(norm, COMPLETED_NEUTRAL_ACK)) return "completed_neutral_ack";
  }

  // ═══ BİTMİŞ ÜRÜN FOTOĞRAFI İSTEĞİ (order-flow aşamalarında da) ═══
  // "yapınca/bitince/hazırlanınca ... fotoğrafını atar mısınız" = müşteri BİTMİŞ ürünün
  // fotoğrafını istiyor (kendi fotoğrafını gönderme DEĞİL). Güncel kural: paylaşmıyoruz.
  // Üretim-zamanı kelimesi ŞART — "sen foto gönder" ile karışmasın.
  if ([STAGE.WAITING_PHOTO,"waiting_photo",STAGE.WAITING_PAYMENT,"waiting_payment",STAGE.WAITING_ADDRESS,"waiting_address",STAGE.WAITING_LETTERS,"waiting_letters"].includes(stage)) {
    const finishTiming = hasAny(norm, ["yapinca","yapılınca","yapilinca","yaptiginizda","yaptığınızda","bitince","bittiginde","bittiğinde","hazirlaninca","hazırlanınca","hazirlandiginda","hazırlandığında","hazir olunca","hazır olunca","tamamlaninca","tamamlanınca","uretilince","üretilince","urun bitince","ürün bitince","gondermeden once","göndermeden önce","kargoya vermeden","kargodan once","kargodan önce","urun hazir olunca","ürün hazır olunca","hazir olunca","hazır olunca"]);
    const seeOrSend = hasAny(norm, ["foto","fotograf","fotoğraf","gorsel","görsel","resim","goster","göster","gorebilir","görebilir","paylas","paylaş","atar","gonder","gönder"]);
    if (finishTiming && seeOrSend) return "completed_photo_share_request";
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AILE J FIX — Soru sorulmuş ama stage-prompt dönüyor
  // Info-question gate: mesajda ? veya "mi/mı/mu/mü" varsa spesifik intent'e yönlendir
  // DAR pattern'lar — sadece regresyon üretmeyen SAĞLAM alt-aileler burada
  // ═══════════════════════════════════════════════════════════════════════
  if ((stage === STAGE.WAITING_PHOTO || stage === "waiting_photo" ||
       stage === STAGE.WAITING_PAYMENT || stage === "waiting_payment" ||
       stage === STAGE.WAITING_ADDRESS || stage === "waiting_address" ||
       stage === STAGE.WAITING_LETTERS || stage === "waiting_letters") && !backTextDone) {
    
    const rawTrim = raw.trim();
    // Türkçe unicode sorunu: "Mİ" lowercase "i̇" oluyor, "mı" word boundary kaçırıyor.
    // Çözüm: hasQ'yu NORMALIZED string üzerinde test et (tüm Türkçe karakterler ASCII).
    // Ayrıca yapışık suffix'leri de yakala: "degisirmi", "olurmu" → "mi/mu" suffix'li
    const hasQ = /\?/.test(raw) || 
                 /(^|\s)(mi|mu|musun|musunuz|miyim|miyiz|misiniz)(\s|$|\?)/i.test(norm) ||
                 /(irmi|urmu|armi|ermi|ormu|ormi|ilirmi|ulurmu|iyormu|uyormu)(\s|$|\?)/i.test(norm);
    
    // ─── J1: Price confirmation (sayı+mi, dar) ───
    // norm = "600 tl mi" (ASCII), büyük/küçük + Türkçe karakter sorunu olmaz
    if (/^\s*\d{3}\s*(tl|lira)?\s*(dimi|demi|di mi|de mi|degil mi|mi|miydi|degilmi)\s*\??\s*$/i.test(norm)) {
      return "price_confirmation";
    }
    if (/\d{3}\s*(tl|lira)?\s*(dimi|degil mi)\s*\??\s*$/i.test(norm) && raw.length < 50) {
      return "price_confirmation";
    }
    
    // ─── J2: Kararma/renk/solma soru (dar başlangıç) ───
    if (hasQ && /^(karatma|kararma|renk deg|renk değ|renk atar|solma|paslan|solar|bozul)/i.test(rawTrim) && raw.length < 40) {
      return "trust";
    }
    // "Renk degişirmi" - tek kelimeye sıkışık
    if (hasQ && /renk\s*degis|renk\s*değiş|renkdegis|renkdeğiş/i.test(norm) && raw.length < 30) {
      return "trust";
    }
    // "karatma var mı" - orta yerde
    if (hasQ && /\b(karatma|kararma|solma|paslanma|karatmi|kararir|kararır)\b/i.test(norm) && raw.length < 30) {
      return "trust";
    }
    
    // ─── J9: Autopilot / bot / yapay zeka ───
    // Not: "yapay zeka ile mi yapıyorsunuz" → lazer yapım sorusu, autopilot değil
    if (hasQ && /(otomatik.*mi|otomatik mesaj|robot mu|bot mu)/i.test(norm)) {
      return "autopilot_question";
    }
    // "Yapay zeka" — yalnızca "yapıyor/üret" içermezse autopilot
    if (hasQ && /(yapay zeka|yapay zekâ)/i.test(norm) && !/(yapiyor|yapıyor|uret|üret|imal|hazirl|hazırl|basiyor|basıyor)/i.test(norm)) {
      return "autopilot_question";
    }
    
    // ─── J13: WhatsApp ───
    if (hasQ && /(watsap|whatsapp|whatssap|whatsap)/i.test(norm)) {
      return "contact_channel_question";
    }
    
    // ─── J14: Photo format / vesikalık ───
    // "Vesikalık mı olmalı", "Vesikalık gerekiyor mu", "Vesikalık olması lazım mı" vb.
    // "vesikalık" geçen her mesaj (olumsuzlama hariç) → vesikalık cevabı ("gerekmez").
    // Soru işareti/"mı" şartı KALDIRILDI — müşteri çoğu zaman ? koymuyor.
    if (/(vesikalik|vesikalık)/i.test(norm) && !/(yok|yokk|olmaz|olması gerekmez|gerek yok)/i.test(norm)) {
      return "photo_format_question";
    }
    
    // ─── J6: Human help (dar) ───
    if (/^\s*(yardimci|yardımcı)\s*(ol|olur)/i.test(rawTrim) && 
        /\b(musun|musunuz|olabil|edebil)/i.test(raw) && raw.length < 50) {
      return "human_request";
    }
    if (/^(lutfen|lütfen|artik|artık)?\s*(soru.*cevap|cevap ver).*\b(mi|mı|musun|musunuz)/i.test(rawTrim)) {
      return "human_request";
    }
    // bayi/ortaklık = gerçek bayilik talebi → insana. "toptan" ise retail çoklu alım
    // sinyali (müşteri "toptan alsam indirim?" diyor) → aşağıda multi_order'a düşer, %15 alır.
    if (/\b(ortakl[ıi]k|bayi)\b/i.test(norm) && hasQ) {
      return "human_request";
    }
    // "Ya artık biri yardımcı olabilir mi"
    if (/biri.*(yardim|yardım).*(olabil|edebil|eder)/i.test(norm) && hasQ) {
      return "human_request";
    }
    
    // ─── J3: Back_text question waiting_payment ───
    if ((stage === STAGE.WAITING_PAYMENT || stage === "waiting_payment") &&
        hasAny(norm, ["arkasina","arkasına","arka yuze","arka yüze","arka yuz","arka yüz","arkaya"]) &&
        hasAny(norm, ["yaz","yazi","yazı","isim","tarih"]) &&
        /\b(mi|mı|mu|mü|musun|musunuz|miyim|miyiz|yazalim|yazalım|yaziliyor|yazılıyor|oluyor)\s*\??\s*$/i.test(rawTrim) &&
        raw.length < 50) {
      return "back_text_info";
    }
    
    // ─── J5: Zincir "var mı" sorgusu (uzunluk + soru) ───
    // "Bu zincirden var mi" / "Zincir uzunluğu sorabilir miyim"
    const hasTrustKw = /kararma|karariyor|kararıyor|kararir|kararır|karalm|karaliyor|karalıyor|solma|solar|paslan|bozul|renk atar|renk degis|renk değiş|\bcelik\b|\bçelik\b/i.test(norm);
    const hasShortLen = /\b(50|60|70)\s*cm\b/i.test(norm);  // "60 cm olmaz mı" zincir cevabı zaten çalışıyor
    if (hasQ && !hasTrustKw && !hasShortLen) {
      // "Zincir uzunluğunu sorabilir miyim" 
      if (/zincir.*(sorabilir|sorabilirm|sorabilmi)/i.test(norm)) {
        return "chain_question";
      }
      // "Bu zincirden var mı" / "Bı zincirden var mi" (dar: 'zincirden' formu)
      if (/^(bu|bı|şu|bi) zincirden/i.test(rawTrim) && /var m/i.test(norm) && raw.length < 40) {
        return "chain_question";
      }
    }
    
    // ─── J15: Preview (SİLİNDİ — mevcut example_request/preview_request intent'leri yeterli) ───
    
    // ─── J21: Çoklu kişi composition (waiting_photo'da kişi sorusu) ───
    if (hasQ && (stage === STAGE.WAITING_PHOTO || stage === "waiting_photo") &&
        /\b(kiz|kız|oglum|oğlum|kizim|kızım|annem|babam|esim|eşim|bebek|cocugum|çocuğum|torun|kardesim|kardeşim)\b/i.test(norm) &&
        /(ve|ile|birlikte|beraber|cekilm|çekilm|bakacak)/i.test(norm)) {
      return "composition_question";
    }
    
    // ─── J16: Order start sorusu (waiting_product veya flow) ───
    // "Ürün satın alabilir miyim?" - intent-engine zaten ctx.intent = order_start üretir mi?
    if (hasQ && /(satin al|satın al|urun satin|ürün satın|siparis vermek|sipariş vermek|siparis verebilir|sipariş verebilir)/i.test(norm)) {
      return "order_start";
    }
    // "İsimli kolyeye bakabilir miyim" / "Ilgilene bilir misiniz"
    if (hasQ && /^(isimli|harfli|atac|ataç|lazer|resimli).*(kolye|kolyeye|model)/i.test(rawTrim) && /bakab|bakabil/i.test(norm)) {
      return "order_start";
    }
    if (hasQ && /^(ilgilene bilir|ilgilenir)/i.test(rawTrim)) {
      return "order_start";
    }
    
    // ─── J_OTHER tail: spesifik prod pattern'ları ───
    
    // "Bir de buradan mi gonderiyorhz" / "buradan mı göndereyim" → photo_format
    if (hasQ && /(buradan|buraya).*(gonder|gönder|iletec|ilet m|mi gon|mi ilet)/i.test(norm)) {
      return "photo_format_question";
    }

    // "Nasıl göndereceğim / hangi yolla göndereyim / nereden yükleyeyim" → foto gönderme yöntemi.
    // Bu blok yalnızca bekleme aşamalarında çalışır → foto bağlamı. Ödeme verbleri yok, karışmaz.
    if (/(nasil|nasıl|hangi yol|hangi yoldan|nereden|ne sekilde|ne şekilde)/i.test(norm) &&
        /(gonder|gönder|ilet|yolla|at[iı]yor|atar|atac|atıc|paylas|paylaş|yukle|yükle)/i.test(norm)) {
      return "photo_format_question";
    }
    
    // "Rakamlar yazılıyor mu" / "Harfler yazılıyor mu" — back_text info
    if (hasQ && /(rakam|harf|simge|emoji).*yaz(iliyor|ılıyor|il|ıl)/i.test(norm)) {
      return "back_text_info";
    }
    
    // "Kontrol ettiniz mi" / "Aldınız mı" → photo_status
    if (hasQ && /(kontrol et|fotoyu aldi|fotoyu aldiniz|foto aldiniz|foto aldın|fotografi aldiniz|fotoğrafı aldınız|fotoğrafı aldı|fotografimi aldiniz|fotoğrafımı aldınız|resmi aldı|resmi aldi|resmi aldiniz|resmi aldınız)/i.test(norm)) {
      return "photo_status_check";
    }
    
    // "Neler yazıyorsun fikir alabilir miyim" → back_text examples
    if (hasQ && /(neler yaz|ne yaz|nasil yaz|nasıl yaz|fikir.*al|ornek.*yaz|örnek.*yaz)/i.test(norm)) {
      return "back_text_examples";
    }
    
    // "Fotoğrafı var mı" (sizde örnek foto) / "Örnek foto var mı" → preview
    // DAR: "sizde/sayfanızda/bir örnek + foto var mı"
    if (hasQ && /^(sizde|bir ornek|bir örnek|ornek foto|örnek foto|sayfanizda|sayfanızda|orneğiniz|örneğiniz)/i.test(rawTrim) && 
        /(fotograf|fotoğraf|foto|resim).*(var m|gorebilir|görebilir|gosterebil|gösterebil)/i.test(norm) && raw.length < 50) {
      return "preview_request";
    }
    
    // "Öncesınde görmez mıyız" / "Önceden görebilir miyiz" → preview
    if (hasQ && /(once|öncesinde|öncede).*(gor|gör|bak)/i.test(norm)) {
      return "preview_request";
    }
    
    // "Gümüş renkli var mı" / "Altın renkli var mı" — mevcut material handler zaten kapsıyor, ekstra gerek yok
    
    // "Bu fotograg olur mu" / "Bu foto uygun mu" / "Bu resim uygun mu" → photo_acceptance
    if (hasQ && /^(bu|şu|su)\s+(foto|fotog|fotoğ|resim|fotoğraf)/i.test(rawTrim) &&
        /(olur m|uygun m|guzel m|güzel m|basil|basıl|yeterli m|iyi m)/i.test(norm) && raw.length < 40) {
      return "photo_acceptance_question";
    }
    
    // "Soru sorabilir miyim" / "Alabilirmiyim" / "Mümkün mü" → general_question
    // DAR: belirli kısa öznesi belirsiz ifadeler — composition/trust/vs'yi kapma
    if (hasQ && raw.length < 25 && 
        /^(soru sor|mumkun mu|mümkün mü|alabilirm|alabilir mi|bilgi al.*mi|bilgi al.*m$)/i.test(rawTrim)) {
      return "general_question";
    }
    
    // "Siparişim daha hazırlanmadı mı" / "Siparişim ne durumda" → order_status
    if (hasQ && /(siparisim|siparişim).*(hazir|hazır|durum|gelm|ulast|ulaşt|cikti|çıktı|geliyor|hazirlanm|hazırlanm)/i.test(norm)) {
      return "order_status_question";
    }
    
    // ─── AILE Y: Renk sorusu ("Gumus renkli var mi", "Altın renginde mi daha mı sarı") ───
    // Not: "kırmızı/mavi/yeşil" out-of-scope renkler → bu pattern'de YAKALAMA
    // "Zincirin rengi" → chain handler'a bırak
    if (hasQ && 
        !/(kirmiz|mavi|yesil|yeşil|sari mi olur|sarı mı olur|zincirin rengi)/i.test(norm) &&
        /(gumus renkli|gümüş renkli|altin renkli|altın renkli|altin renginde|altın renginde|rose gold|gumus mu|gümüş mü|altin mi|altın mı|daha mi sari|daha mı sarı)/i.test(norm)) {
      return "material_question";
    }
    
    // ─── AILE Z: Gelecek zaman sipariş ("Yarın X yapacağım olur mu") ───
    if (hasQ && /(yarin|yarın|sonra|ileride|daha sonra|biraz sonra|ileri tarih|onumuzdeki|önümüzdeki|bu aksam|bu akşam|gun icinde|gün içinde)/i.test(norm) &&
        /(siparis|sipariş|foto|resim|alicam|alıcam|alacag|alacağ|atic|atıc|gonderec|gönderec|verecek|verece|yapacag|yapacağ|secic|seçic|hazirla|hazırla)/i.test(norm)) {
      return "future_order_intent";
    }
    
    // ─── J_FINAL tail: son kalan prod pattern'ları (residual) ───
    
    // "Kart olmuyor mu" / "Karttan mi atiyoruz" / "Kartla olur mu" → payment info
    if (hasQ && /\bkart(tan|la|a|i|ı)?\b/i.test(norm) && /(olmuyor|olmaz|atiyoruz|atıyoruz|oluyor mu|olur mu|olabilir|gecer|geçer|cekiliyor)/i.test(norm)) {
      return "payment_info_question";
    }
    
    // "Kolye boyu/zinciri ... mi" → chain
    if (hasQ && /(kolye boyu|kolye boy|kolye zinciri.*ayni|kolye zinciri.*aynı|zinciri ayni|zinciri aynı)/i.test(norm)) {
      return "chain_question";
    }
    
    // "Oğlumla kızımın fotosunu" / "Anne baba resimleri basılabılıyor Muş" — composition
    if (hasQ && (stage === STAGE.WAITING_PHOTO || stage === "waiting_photo") &&
        /(oglumla|oğlumla|kizimla|kızımla|annemle|annesiyle|babamla|babasıyla|aile|anne baba|anne.*baba|esiyle|eşiyle|bebegiyle|bebeğiyle|cocugumla|çocuğumla|torunumla|kardesimle|kardeşimle|birlikte)/i.test(norm) &&
        /(foto|resim|basil|basıl)/i.test(norm)) {
      return "composition_question";
    }
    
    // "Görseli var mı rica etsem atar mısınız" → preview
    // Not: "bitince görsel atar mısınız" (kargo öncesi) farklı handler'a git
    if (hasQ && /(gorsel|görsel|ornek|örnek).*atar m/i.test(norm) &&
        !/(bitin|bit i|bittiğinde|bitiğinde|bitirince|hazirlan|hazırlan|kargo once|kargo önce|kargodan once|kargodan önce)/i.test(norm)) {
      return "preview_request";
    }
    
    // "Bu olabilir mi" / "Bu uygun mu" kısa photo_acceptance (address/payment dahil)
    if (hasQ && /^(bu|şu|su)\s+(olabilir|uygun|olur|gecer|geçer|yeterli)\s*(mi|m[uü])?\s*\??\s*$/i.test(rawTrim)) {
      return "photo_acceptance_question";
    }
    
    // "Bu resimdeki gibi mi geliyor" → preview (örnek resim gibi)
    if (hasQ && /^(bu|şu)\s+(resimdeki|resmin|fotoğraftaki|fotograftaki|resimde|fotoğrafta|fotografta)\s+gibi/i.test(rawTrim)) {
      return "preview_request";
    }
    
    // "Ben onu görüp hemen kararımi verebilirim" / "Önce görüp karar veririm" → preview (karar)
    if (hasQ && /(gorup|görüp|gorduk|görüp).*(karar|karar ver)/i.test(norm)) {
      return "preview_request";
    }
    
    // "Diğer modellere de bakabilir miyim" / "Sayfanızda mevcut mu" → detail/model list
    if (hasQ && /(diger model|diğer model|baska model|başka model|sayfaniz.*mevcut|sayfanız.*mevcut|sayfada var|model.*bakab)/i.test(norm)) {
      return "detail_request";
    }
    
    // "Nasıl yapıyor uz resimleri size mi gönderiyoruz" / "Beyefendi fotoğrafı biz mi atıyoruz" → photo_format
    if (hasQ && (
         /(nasil yap|nasıl yap).*(foto|resim)/i.test(norm) ||
         /(foto|resim).*(biz mi at|biz mi gonder|biz mi gönder|size mi gonder|size mi gönder)/i.test(norm) ||
         /(biz mi at|biz mi gonder|biz mi gönder|size mi gonder|size mi gönder).*(foto|resim)/i.test(norm)
        )) {
      return "photo_format_question";
    }
    
    // Age-year price confirmation: "Ayın 9 da alicam yine aynı olur değil mi"
    if (hasQ && /\byine (ayni|aynı)\s*(olur|fiyat|ücret)/i.test(norm)) {
      return "price_confirmation";
    }
    
    // "Kolye boyu/uzunluğu" direkt (soru olmasa da) → chain
  }

  if (isChainDimensionIntent(norm)) return "chain_question";
  if (isPhotoQualityIntent(norm, stage)) return "photo_acceptance_question";

  // ═══ 1. SLOT COMMITS (highest priority) ═══
  if (looksLikePhotoUrl(message)) {
    // URL + "bu model" / referans → photo_reference, gerçek fotoğraf commit değil
    if (hasAny(norm, ["bu model olsun","bu modelden olsun","bundan olsun","bundan olacak"])) return "photo_reference";
    if (stage === STAGE.WAITING_PAYMENT) return "back_photo_upload";
    return "photo";
  }

  // ━━━ H4 F7 HARDENING: bundle detection before phone/address (Özge/Tülay bug) ━━━
  // Önce tam bundle kontrolü; phone intent'ten önce yakalasın
  // Prod logs fix: PII redaction sonrası [PHONE], [ADDRESS] token'ları da sinyal sayılır
  // (production'da raw'da bu tokenlar görülüyor — kullanıcı aslında vermiş ama redact edilmiş)
  if ([STAGE.WAITING_ADDRESS, STAGE.WAITING_PAYMENT, STAGE.ORDER_COMPLETED, "order_completed"].includes(stage)) {
    const _hasRedactedPhone = /\[PHONE\]/i.test(raw);
    const _hasRedactedAddr = /\[ADDRESS\]/i.test(raw);
    const _hasPhoneEarly = extracted.phone || /\b0?5\d{2}[\s.\-]?\d{3}[\s.\-]?\d{2}[\s.\-]?\d{2}\b/.test(raw) || _hasRedactedPhone;
    const _hasAddressEarly = extracted.hasAddress || hasAny(norm, ["mahalle","mah ","cadde","cad ","sokak","sok ","bulvar","apt","daire","kat "]) || _hasRedactedAddr;
    const _hasNameEarly = extracted.hasName || (/[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}\s+[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}/.test(raw) && raw.trim().length < 120);
    // Sohbet bağlamı varsa bundle DEĞİL (false positive engelle)
    const _isChatty = hasAny(norm, ["cunku","çünkü","icin","için","daha once","daha önce","esnaf","hediye ettim","musterilerim","müşterilerim","yonlendirmem","yönlendirmem","yaptirmistim","yaptırmıştım","soruyorlar","gormek icin","görmek için"]);
    // ━━━ EXTRA-15 E11: Tam bundle = name + phone + address (üçü birden). 2'li kısmi farklı ele alınsın. ━━━
    if (_hasPhoneEarly && _hasAddressEarly && _hasNameEarly && !_isChatty) return "full_contact_bundle";
    // Kısmi: name + phone var ama adres yok → "partial_name_phone"
    if (_hasPhoneEarly && _hasNameEarly && !_hasAddressEarly && !_isChatty) return "partial_name_phone";
    // Kısmi: phone + adres var ama isim yok → yine bundle (yaygın kullanım)
    if (_hasPhoneEarly && _hasAddressEarly && !_isChatty) return "full_contact_bundle";
    // Solo redacted: sadece [PHONE] veya sadece [ADDRESS] → slot commit
    if (_hasRedactedPhone && !_hasAddressEarly && !_hasNameEarly && raw.trim().length < 30) return "phone";
    if (_hasRedactedAddr && !_hasPhoneEarly && !_hasNameEarly && raw.trim().length < 60) return "address";
  }

  if (extracted.phone && stage === STAGE.WAITING_ADDRESS) return "phone";
  if (stage === STAGE.WAITING_ADDRESS && extracted.hasAddress) return "address";
  if (stage === STAGE.WAITING_ADDRESS && extracted.hasName && raw.length < 40) return "name_only";
  if (stage === STAGE.WAITING_LETTERS && extracted.letters) {
    // Smalltalk/complaint/sensitivity/info soruları w_letters'da letters olarak algılanmasın
    if (hasAny(norm, KW.smalltalk) || hasAny(norm, ["tesekkur","teşekkür","sagol","sağol","rica"])) return "smalltalk";
    if (hasAny(norm, ["iptal","vazgec","vazgeç"])) return "cancel_order";
    // Info soruları — keyword check
    if (hasAny(norm, KW.trust) || hasAny(norm, ["guvenilir","güvenilir","guven","güven","dolandirici","dolandırıcı","nasil guven","nasıl güven"])) return "trust";
    if (hasAny(norm, KW.location) || hasAny(norm, ["neredesiniz","nerede"])) return "location";
    if (hasAny(norm, KW.shipping) || hasAny(norm, KW.shipping_price) || hasAny(norm, ["kargo","seffaf","şeffaf"])) return "shipping";
    if (hasAny(norm, KW.chain) || hasAny(norm, ["italyan","halat","burgulu"])) return "chain_question";
    if (hasAny(norm, KW.material_question)) return "material_question";
    return "letters";
  }

  // Payment commit
  // Prod logs fix: "odemeli", "odeyecegim", "ile olsun", "yaparim", "olacak", "ile" suffix commit ifadeleri
  const paymentVerb = /seceyim|seçeyim|olsun|istiyorum|sectim|seçtim|seciyorum|seçiyorum|yapacagim|yapacağım|yapicam|yapıcam|yapayim|yapayım|yapalim|yapalım|odemeli|ödemeli|odeyecegim|ödeyeceğim|ile olsun|yaparim|yaparım|olacak/.test(norm);
  // Price confirmation (dimi/miydi) payment commit değil, price_confirmation'a düşsün
  const isPriceConfirm = /\d{3}\s*(tl|lira)?\s*.{0,30}\b(dimi|di mi|değil mi|degil mi|miydi|mıydı)\b/i.test(norm);
  // "Kapıda ödeme ile" / "eft ile" — yalnız başına "ile" commit sinyali (kısa mesajda)
  const paymentPureCommit = /^(kapida|kapıda|kapida odeme|kapıda ödeme|eft|havale|eft havale|nakit)\s*(ile)?\s*$/i.test(norm.trim());
  // Payment confirmation (dekont, ödeme yaptım) — payment commit'ten ÖNCE
  if (hasAny(norm, ["dekont attim","dekont attım","dekont gonderdim","dekont gönderdim","eft attim","eft attım","eft gonderdim","eft gönderdim","havale gonderdim","havale gönderdim","havale attim","havale attım","odeme yaptim","ödeme yaptım","odemeyi yaptim","ödemeyi yaptım","odeme gonderdim","ödeme gönderdim","hesaba attim","hesaba attım","ekran goruntusu","ekran görüntüsü","dekont atayim","dekont atayım","ucreti attim","ücreti attım"])) return "payment_confirmation";
  // Payment commit: verb varsa her yerde, w_payment'ta verb olmadan da kabul et
  // Fiyat teyidi (650 tl kapıda dimi) commit değil → price_confirmation'a kalsın
  if (extracted.payment && !isPriceConfirm && (paymentVerb || paymentPureCommit || stage === STAGE.WAITING_PAYMENT)) return "payment";

  // ═══ 2. SENSITIVITY ═══
  if (hasAny(norm, ["vefat","kaybettik","kaybettim","rahmetli","merhum","babami kaybettim","babamı kaybettim","annemi kaybettim","esimi kaybettim","eşimi kaybettim","vefat etti","annem vefat","babam vefat","hayatini kaybetti","hayatını kaybetti","olum yildonumu","ölüm yıldönümü"])) return "sensitivity";

  // ═══ 3. FRUSTRATION HARD STOP ═══
  if (hasAny(norm, ["otomatik mesaj istemiyorum","robot musunuz","aptal misiniz","salak misiniz","dalga geciyor","dalga geçiyor","dava ediyorum","dava ederim","rezalet","rezilsiniz","insan baglayın","insan bağlayın","gercek insan","gerçek insan","canli destek","canlı destek","yetkili baglayın","yetkili bağlayın","ne bilgisi aldin","ne bilgisi aldın","dalga mi geciyorsunuz","dalga mı geçiyorsunuz",
    "savciliga gidecegim","savcılığa gideceğim","savciliga gideceğim","savcılığa gidecegim",
    "savciliga verecegim","savcılığa vereceğim","savciya verecegim","savcıya vereceğim",
    "avukatim","avukatım","nitelikli dolandiricilik","nitelikli dolandırıcılık",
    "sana ne soruyorum sen ne cevap veriyorsun","ne soruyorum sen ne cevap veriyorsun",
    "ayni mesaj","aynı mesaj","ayni seyi yaziyor","aynı şeyi yazıyor","ayni seyleri yaziyor","aynı şeyleri yazıyor",
    "ayni seyi yazip","aynı şeyi yazıp","yazip duruyor","yazıp duruyor","ayni cevap","aynı cevap",
    "surekli ayni","sürekli aynı","ayni seyi tekrar","aynı şeyi tekrar","kopya mesaj","robot gibi"
  ])) return "frustration";

  // ═══════════════════════════════════════════════════════════════════════
  // 3.5. BACK_TEXT SUPREMACY — 3 subtype, tüm kritik stage'lerde override
  // Sırası: back_text_fit_question → back_text_question → back_text_content
  // Bu blok; payment / general / fallback / short-ack cevaplarını ezer.
  // ═══════════════════════════════════════════════════════════════════════

  const BACK_TEXT_STAGES = [STAGE.WAITING_PAYMENT, STAGE.WAITING_ADDRESS, STAGE.ORDER_COMPLETED, "order_completed", STAGE.WAITING_PHOTO];

  // ── A) back_text_fit_question: sığma / uzunluk soruları ──
  // waiting_photo'da "uzun olmaz mi" → zincir sorusu olabilir; arka yazı için değil
  if (hasAny(norm, KW.back_text_fit_question)) {
    // Composition guard: "5 kişi sıgarmi", "2 çocuk sığar" → back_text değil composition
    const isPersonFit = hasAny(norm, ["kisi","kişi","cocuk","çocuk","aile","oglum","oğlum","kizim","kızım","birden fazla","hepsi","ikisi","ucu","üçü"]);
    if (isPersonFit) {
      // composition_question'a bırak
    }
    // "uzun olmaz mi" waiting_photo'da + zincir bağlamı varsa → back_text_fit değil
    else if (stage === STAGE.WAITING_PHOTO && hasAny(norm, ["uzun olmaz","daha uzun","uzun mu","uzun degil","uzun değil"]) && !hasAny(norm, ["yazi","yazı","dua","isim","harf","arka"])) {
      // chain_question'a bırak, burada return etme
    } else {
      return "back_text_fit_question";
    }
  }
  if (/sığar|sigar|s[iı]gar/.test(norm) && !hasAny(norm, ["zincir","fotograf","fotoğraf","resim","kolyemi","kisi","kişi","cocuk","çocuk","aile"])) return "back_text_fit_question";

  // ── B) back_text_question: arka yüze yazı/dua/tarih/isim yapılabilir mi soruları ──
  if (hasAny(norm, KW.back_text_question_explicit)) return "back_text_question";
  if (hasAny(norm, ["arkasina","arka kismina","arka kısmına","arka yuze","arka yüze","arka tarafa","arkaya"]) &&
      hasAny(norm, ["yazilir mi","yazılır mı","yazabilir misiniz","yazabilir mısınız","basabilir misiniz","basabilir mısınız","olur mu","oluyor mu","yapiliyor mu","yapılıyor mu","eklenebilir mi","yazabiliyor musunuz","yazdir","yazdır","yazalim","yazalım"])) return "back_text_question";
  if (hasAny(norm, ["dua","ayet","sure","ayetel","kursi","fatiha","nazar duasi","ihlas"]) &&
      hasAny(norm, ["basabilir","yazilir","yazılır","yazabilir","olur mu","eklenebilir","yapilir","yapılır"])) return "back_text_question";
  if (hasAny(norm, ["yazabilir misiniz","yazabilir mısınız","basabilir misiniz","basabilir mısınız"]) &&
      BACK_TEXT_STAGES.includes(stage)) return "back_text_question";

  // ── C) back_text_content: müşteri direkt içerik veriyor ──
  // SADECE back_text için anlamlı stage'lerde çalış — waiting_product ve boş stage'de çalışma
  const BACK_TEXT_CONTENT_STAGES = [STAGE.WAITING_PAYMENT, STAGE.WAITING_ADDRESS, STAGE.ORDER_COMPLETED, "order_completed"];
  const isBackTextStage = BACK_TEXT_CONTENT_STAGES.includes(stage);

  // C1: "canım" + akrabalık/isim → sadece back_text stage'lerinde
  const CANIM_BLACKLIST = ["cok guzel","çok güzel","tesekkur","teşekkür","sagol","sağol","rica","birazdan","ileride","yazarim","yazarım","donerim","dönerim","bakayim","bakayım"];
  if (hasAny(norm, ["canim"]) && !hasAny(norm, CANIM_BLACKLIST) && isBackTextStage) {
    if (hasAny(norm, ["oglum","oğlum","kizim","kızım","annem","babam","esim","eşim","kardesim","kardeşim","torunum","yeğenim","yegenim"]) ||
        /[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}/.test(raw)) return "back_text_content";
    if ([STAGE.WAITING_PAYMENT, STAGE.WAITING_ADDRESS, STAGE.ORDER_COMPLETED, "order_completed"].includes(stage)) return "back_text_content";
  }

  // C2: isim + tarih pattern → back_text_content (sadece back_text stage'lerinde)
  if (isBackTextStage && (/\d{2}[.\-\/]\d{2}[.\-\/]\d{2,4}/.test(raw) || /\b(20\d{2}|19\d{2})\b/.test(raw))) {
    const hasName = /[A-ZÇĞİÖŞÜa-zçğıöşü]{3,}/.test(raw);
    // ══ AILE B FIX: "İl X İlçe Y Mahalle Z" adres paterni ══
    const isAddressStructure = hasAny(norm, ["mahalle","mahallesi","sokak","cadde","caddesi","apt","daire","kat","no ","il ","ilce","ilçe","bulvar","sk ","mh "]) ||
                               /\bi?l\s+[a-zçğıöşüâ]+\s+ilce|ilçe\s+/i.test(norm) ||
                               /\[ADDRESS\]/i.test(raw);
    const isDateOnly = /^[\d\s.\-\/]+$/.test(raw.trim());
    const isShippingCtx = hasAny(norm, ["kargoya","kargoda","teslim","ne zaman gelir","kac gunde","kaç günde","siparis verdim","sipariş verdim"]);
    if (!isAddressStructure && !isShippingCtx && !hasAny(norm, ["adres","telefon","kargo","odeme","ödeme","dekont","whatsapp"])) {
      if (hasName) return "back_text_content";
      if (isDateOnly && [STAGE.ORDER_COMPLETED, "order_completed"].includes(stage)) return "back_text_content";
    }
  }

  // C3: Dua/ayet/sure direkt içerik (soru fiili YOK)
  // Not: "yasin" 5 karakter; "yaşında" normalize olunca "yasinda" oluyor ve false match'e
  // sebep veriyordu. Word-boundary ile spesifik sure adı match'e sıkıştırdık.
  const _ayetRegex = /\b(nazar duasi|ayetel kursi|ayetel kürsî|fatiha|ihlas|kalem suresi|yasin( suresi| süresi|i yazalim|i yazalım|i yazin|i yazın|i ekleyin|olsun|i olsun|suresi)?|besmele)\b/i;
  if (_ayetRegex.test(norm) &&
      !hasAny(norm, ["var mi","var mı","olur mu","yazilir mi","yazılır mı","oluyor mu","eklenebilir","yapiliyor","yasinda","yaşında","yasin da","yaşın da","yasin de","yaşın de"]) &&
      !/\d+\s*yasin/i.test(norm)) return "back_text_content";

  // C4: Arapça / Kuran ayeti direkt metin
  if (/[\u0600-\u06FF]/.test(raw) && raw.length > 10) return "back_text_content";

  // C5: "yazılsın / yazılcak / yazsın" + payment/address/completed → back_text_content (soru değilse)
  if (hasAny(norm, ["yazilsin","yazılsın","yazilcak","yazılcak","yazilacak","yazılacak","yazsin","yazsın","ekleyin"]) &&
      isBackTextStage &&
      !hasAny(norm, ["ucret","ücret","fiyat","para","ekstra","bedava","ucretsiz","ücretsiz","bir ucret","bir ücret"])) return "back_text_content";

  // C6: dua/ayet + EXPLICIT write verb veya back_text_status=received → back_text_content
  // "olsun" jussive modifier olduğu için tek başına write verb sayılmaz
  if (hasAny(norm, ["dua","ayet","sure","ayetel","kursi","fatiha","ihlas"]) &&
      (ctx.fields?.back_text_status === "received" || hasAny(norm, ["yazalim","yazalım","yazsin","yazsın","eklensin","yazilsin","yazılsın"])) &&
      !hasAny(norm, ["istemiyorum","istemem","olmamali","olmamalı"])) return "back_text_content";

  // ━━━ FIX F3: back_text içerik genişletme ━━━
  // C7: "YAZARSANIZ / YAZARMISINIZ / YAZSIN / YAZALIM + isim/tarih/cümle" → back_text_content
  // Not: "olsun" BAĞIMSIZ olarak write verb DEĞİLDİR — Türkçe'de jussive/dilek modifier'dır
  // ("sağ olsun", "geçmiş olsun" = blessing; "[X] olsun" = yazma fiili değil).
  // Gerçek write verb'ler: yaz-, ekle-, bas-.
  if (isBackTextStage) {
    const hasWriteVerb = hasAny(norm, [
      "yazarsaniz","yazarsanız","yazarmisiniz","yazar misiniz","yazarmısınız","yazar mısınız",
      "yazin","yazın","yazalim","yazalım","yazsin","yazsın","eklensin",
      "basabilir","basin","basın"
    ]);
    const hasNameOrDate = /[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}/.test(raw) || /\d{2}[.\-\/]\d{2}[.\-\/]\d{2,4}/.test(raw) || /\b20\d{2}\b/.test(raw) || /\b19\d{2}\b/.test(raw);
    const hasQuoteOrEmoji = /["'❤️💫♾️🤍💜❤💫⭐]/.test(raw);
    const isQuestionFormat = hasAny(norm, ["var mi","var mı","olur mu","oluyor mu","yapiliyor mu","yapılıyor mu","mumkun mu","mümkün mü"]);
    // Prod logs fix: "basın" (5-char) substring'i "basiniz sagolsun" içinde yanlış match ediyordu.
    // Blessing/condolence guard — bu ifadeler back_text DEĞİL.
    const isBlessingHere = hasAny(norm, [
      "basiniz sagolsun","başınız sağolsun","basiniz sag olsun","başınız sağ olsun",
      "gecmis olsun","geçmiş olsun","allah rahmet","allah kabul","allah razi olsun","allah razı olsun",
      "saglikla kullan","sağlıkla kullan","gule gule kullan","güle güle kullan",
    ]);
    if (hasWriteVerb && (hasNameOrDate || hasQuoteOrEmoji) && !isQuestionFormat && !isBlessingHere) return "back_text_content";
  }

  // C8: Multi-line mesajda her satırı ayrı kontrol — bir satır tarih/isim ise content
  if (isBackTextStage && raw.includes("\n")) {
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    const hasDateLine = lines.some(l => /\d{2}[.\-\/]\d{2}[.\-\/]\d{2,4}/.test(l) || /^\d{4}$/.test(l));
    const hasShortNameLine = lines.some(l => /^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(\s+[A-ZÇĞİÖŞÜa-zçğıöşü]+)*$/.test(l) && l.length < 40 && l.split(/\s+/).length <= 4);
    const hasNoQuestion = !/\?/.test(raw) && !hasAny(norm, ["olur mu","var mi","yapiliyor"]);
    if ((hasDateLine || hasShortNameLine) && hasNoQuestion) return "back_text_content";
  }

  // C9: Tek satır kısa isim+akrabalık ("Annem Kevokamın", "Ediz Metem ve Erol'um", "Canım Kızım Meyram")
  if (isBackTextStage && raw.length < 80 && !/\?/.test(raw)) {
    const wordCount = raw.trim().split(/\s+/).length;
    // Word-boundary ile akrabalık (resim içinde esim bulma gibi false match'leri önle)
    // Prefix'li suffix varyantları (kevokamin, annemin, canımın vs) word-boundary'de kaçırmasın:
    const relationRegex = /\b(annem|annemin|annemi|babam|babamin|babami|esim|eşim|esimin|eşimin|oglum|oğlum|oglumun|oğlumun|kizim|kızım|kizimin|kızımın|kardesim|kardeşim|torunum|torunumun|yegenim|yeğenim|canim|canım|canimin|canımın|amcam|dayim|dayım|teyzem|halam|dedem|ninem|anneannem|babaannem|kevokam|kevokamin|hayatim|hayatım|hayatimin|sevgilim|melegim|meleğim|birtanem|prensesim|aslanim|aslanım)\b/i;
    const hasRelation = relationRegex.test(norm);
    const hasCapitalName = /[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}/.test(raw);
    // Ayrıca mesajda "resim", "foto", "kolye" gibi composition keyword'leri varsa bu back_text DEĞİL
    const hasPhotoContext = hasAny(norm, ["resim","resmi","foto","fotograf","fotoğraf","kolye","cizebilir","çizebilir","yapabilir","basabilir","koyabilir"]);
    if (hasRelation && hasCapitalName && wordCount <= 8 && !hasPhotoContext) return "back_text_content";
  }

  // C10: Tek satır tarih + emoji (completed/address/payment) → back_text_content
  if ([STAGE.ORDER_COMPLETED, "order_completed", STAGE.WAITING_ADDRESS, STAGE.WAITING_PAYMENT].includes(stage) &&
      /^\s*\d{2}[.\-\/]\d{2}[.\-\/]\d{2,4}\s*[❤️💫♾🤍💜⭐]*\s*$/.test(raw.trim())) {
    return "back_text_content";
  }

  // C11: sevgi/duygu sözcükleri + cümle → back_text_content (uzun metin de olabilir)
  if (isBackTextStage && !/\?/.test(raw)) {
    // ══ AILE B FIX: explain/heyecan/açıklama pattern'ları hariç tut ══
    const isExplainPattern = hasAny(norm, [
      "yok yok","heyecandan","merak rttim","merak ettim","gormek istedim","görmek istedim",
      "yasinda","yaşında","yasin da","yaşın da",
      "rahatsiz","rahatsız","emar","hastane","doktor","ameliyat",
      "cunku","çünkü","o yuzden","o yüzden","sebebi","neden",
    ]);
    if (!isExplainPattern && hasAny(norm, [
      "seni cok seviyorum","seni çok seviyorum","en cok sen","en çok sen",
      "hosgeldin","hoşgeldin","iyi ki","nefesim","canim ailem","canım ailem",
      "kabul olmus","kabul olmuş","en guzel duam","en güzel duam",
      "gozlerimin","gözlerimin","kalbimin","güneşim","gunesim","papatyam",
      // Uzun duygusal cümleler
      "annenin oglu","annenin oğlu","bebegim","bebeğim",
      "yazamadiklarim","yazamadıklarım","kolyeyle anlat","kolye ile anlat",
      "sevgimi anlat","sevgisini anlat","bu kolye ile",
      "dunyalar kadar","dünyalar kadar","kalbimde ozel","kalbimde özel",
      "bir tanem","birtanem","canimsin","canımsın"
    ])) return "back_text_content";
  }

  // C12: "Arkasına" + ne-ise içerik (completed/waiting_payment/waiting_address) → back_text_content
  // Soru değil, direkt içerik verdiği zaman
  if (isBackTextStage && hasAny(norm, ["arkasina","arkasına","arkaya","arka yuze","arka yüze","arka tarafa"]) &&
      !hasAny(norm, ["olur mu","yazilir mi","yazılır mı","yazabilir mi","basabilir mi","yapiliyor mu","yapılıyor mu","eklenebilir","var mi","var mı"])) {
    // Negation exception: "yazı DEĞİL DE resim" / "yazı yerine resim" → composition
    const isNegatingText = hasAny(norm, ["yazi degil","yazı değil","yazi yerine","yazı yerine","yazi olmasin","yazı olmasın"]) &&
                           hasAny(norm, ["resim","foto","fotograf","fotoğraf"]);
    if (isNegatingText) {
      return "composition_question";
    } else {
      // İçerik barındırıyor mu?
      const hasContent = /[A-ZÇĞİÖŞÜ][a-zçğıöşü]/.test(raw) || /\d{2}/.test(raw) || hasAny(norm, ["yazi","yazı","dua","isim","tarih","not"]);
      if (hasContent) return "back_text_content";
    }
  }

  // ═══ 4. COMPLAINT / CLAIM ═══
  if (hasAny(norm, ["verdim ya","yazdim ya","yazdım ya","soyledim ya","söyledim ya","yazdim zaten","yazdım zaten","verdim zaten","attim zaten","attım zaten","gonderdim zaten","gönderdim zaten","adresimi yazdim","adresimi yazdım","hepsini verdim","bilgi verdim","belirttim","belirtmistim","belirtmiştim","daha once yazdim","daha önce yazdım","niye ayni seyi","niye aynı şeyi","neden tekrar","yine mi","yeter artik","yeter artık","yanlis anladiniz","yanlış anladınız","cevap vermiyorsunuz","cevap alamiyorum","neden cevap","ayni seyi sorma","aynı şeyi sorma","tekrar sorma","cevap yok mu","cevap yok","cevap yokmu"])) return "complaint";

  // ═══ 5. SIRA 6 — SLOT CLAIM / PARTIAL SLOT / FULL BUNDLE ═══

  // 5a. Photo reference ("üstteki olsun")
  if (hasAny(norm, ["ustteki olsun","üstteki olsun","bundan olsun","bundan olacak","bu model olsun","bu modelden olsun"])) return "photo_reference";

  // 5b. Future-intent guard — sadece claim context'te (genel mesajları block etme)
  // "atacağım" tek başına genel → block etme; "adresi atacağım" gibi claim bağlamı → block et
  // Kaldırıldı - çok agresif, normal mesajları da blokluyordu

  // 5c. Full contact bundle: name + phone + address tek mesajda (address/payment stages only)
  const hasPhone = PHONE_REGEX.test(raw);
  const hasAddress = hasAny(norm, ["mahalle","mah ","cadde","cad ","sokak","sok ","bulvar","apt","daire","kat "]) ||
    (hasAny(norm, PARTIAL_ADDRESS_SIGNALS) && norm.length > 40 && hasAny(norm, ["mahalle","sokak","cadde","bulvar","mah ","no:","no "]));
  const hasName = /[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,}(\s+[A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,})+/.test(raw);
  const BUNDLE_STAGES = [STAGE.WAITING_ADDRESS, STAGE.WAITING_PAYMENT];
  if (BUNDLE_STAGES.includes(stage) && hasPhone && hasAddress) return "full_contact_bundle";

  // 5d. Claim target tespiti
  const CLAIM_ACTIVE_STAGES = [STAGE.WAITING_PHOTO, STAGE.WAITING_PAYMENT, STAGE.WAITING_ADDRESS, STAGE.ORDER_COMPLETED, "order_completed", STAGE.WAITING_LETTERS];
  // waiting_product'ta: claim sinyali varsa general_claim ver (slot collection yok)
  if (hasAny(norm, SLOT_CLAIM_SIGNALS) && !CLAIM_ACTIVE_STAGES.includes(stage)) return "general_claim";
  if (hasAny(norm, SLOT_CLAIM_SIGNALS) && CLAIM_ACTIVE_STAGES.includes(stage)) {
    if (hasAny(norm, CLAIM_TARGET_PHOTO))   return "photo_claim";
    if (hasAny(norm, CLAIM_TARGET_ADDRESS)) return "address_claim";
    if (hasAny(norm, CLAIM_TARGET_PHONE))   return "phone_claim";
    if (hasAny(norm, CLAIM_TARGET_ALL))     return "slot_claim";
    // Genel claim — stage'e göre
    if (stage === STAGE.WAITING_PHOTO)    return "photo_claim";
    if (stage === STAGE.WAITING_ADDRESS)  return "address_claim";
    if (stage === STAGE.WAITING_PAYMENT)  return "slot_claim";
    return "slot_claim";
  }

  // 5e. phone_provide: sadece telefon numarası (waiting_address veya waiting_payment stage'de)
  const PHONE_PROVIDE_STAGES = [STAGE.WAITING_ADDRESS, STAGE.WAITING_PAYMENT, STAGE.WAITING_PHOTO];
  if (hasPhone && !hasAddress && PHONE_PROVIDE_STAGES.includes(stage)) return "phone_provide";

  // 5f. address_provide_full: açık adres var (mahalle+cadde ya da yeterli uzunluk, waiting_address stage'de)
  if (hasAddress && norm.length > 40 && !hasPhone && stage === STAGE.WAITING_ADDRESS) {
    if (hasAny(norm, ["mahalle","mah ","cadde","cad ","sokak","sok "])) return "address_provide_full";
  }

  // 5g. address_provide_partial: şehir/ilçe düzeyinde, tam adres değil (sadece waiting_address)
  if (hasAny(norm, PARTIAL_ADDRESS_SIGNALS) && !hasPhone && norm.length < 40 && stage === STAGE.WAITING_ADDRESS && !hasAny(norm, ["ne kadar","fiyat","kargo","odeme","siparis","kolye","lazer","atac"])) return "address_provide_partial";

  // 5h. identity_provide: isim soyad geldi, başka slot yok
  if (hasName && !hasPhone && !hasAddress && stage === STAGE.WAITING_ADDRESS && norm.length < 30) return "identity_provide";

  // ═══ 6. CANCEL ═══
  if (hasAny(norm, KW.cancel)) return "cancel_order";

  // ═══ 7. INFO INTENTS (specific → generic) ═══
  // Dönüş/bekleme — shipping'den ÖNCE (birkaç gün → "kac gun" false match engeli)
  if (hasAny(norm, ["donus yapacagim","dönüş yapacağım","donus yapicam","dönüş yapıcam","tekrar donecegim","tekrar döneceğim","dusunup","düşünüp","dusuneyim","düşüneyim","dusunuyorum","düşünüyorum","sonra yazacagim","sonra yazacağım"])) return "general";
  
  // Arka yazı ÜCRET/DAHİL sorusu → back_text_info (shipping_price ve price'tan ÖNCE).
  // "arka yazı fiyata dahil mi / ücretli mi / ekstra para mı" → cevap: ücretsiz.
  if (hasAny(norm, ["arka yazi","arka yazı","arkaya yazi","arkaya yazı","arkasina yazi","arkasına yazı","arka yuze yazi","arka yüze yazı","arka yuz yazi","arka taraf yazi","arkaya isim","arkasina isim","arka yuze isim"]) &&
      hasAny(norm, ["ucret","ücret","ucretli","ücretli","para mi","para mı","ek ucret","ek ücret","ekstra","fark var","dahil mi","fiyata dahil","ucreti var","ücreti var","parali","paralı"])) return "back_text_info";

  if (hasAny(norm, KW.shipping_price)) return "shipping_price";
  // Shipping BEFORE trust — only explicit delivery questions
  if (hasAny(norm, ["kargo","teslimat","takip no","kargom nerede","teslim","sms gelir","mesaj gelir","bilgi gelir","haber verir"])) return "shipping";
  if (hasAny(norm, ["ne zaman gelir","kac gunde","kaç günde","ne zaman elimde","elime ulasir","elime ulaşır","ne kadar surede gelir","ne kadar sürede gelir","ne kadar surede ulasir","ne kadar sürede ulaşır","ne kadar surede elime","ne kadar sürede elime"])) return "shipping";
  if (hasAny(norm, KW.chain)) return "chain_question";
  if (hasAny(norm, KW.material_question)) return "material_question";
  // Sağlam malzeme yakalama (typo/serbest ifade): "malzeme/materyal" + soru/eylem bağlamı → material.
  // "Malzeme olarok ne kullanılıyor" gibi typo'ları da yakalar (AI wall-of-text'e düşmesin).
  if ((norm.includes("malzeme") || norm.includes("materyal")) &&
      hasAny(norm, ["ne ", " ne", "nedir", "kullan", "olar", "hangi", "mi", "mı", "neden", "yapi", "yapı", "uret", "üret", "imal"])) return "material_question";
  if (hasAny(norm, KW.trust)) return "trust";
  if (hasAny(norm, KW.location)) return "location";
  // Şubeden teslim
  if (hasAny(norm, ["subeden alacag","şubeden alacağ","subeden teslim","şubeden teslim","elden alacag","elden alacağ","gelip alacag","gelip alacağ","dukkanin","dükkânın","dukkandan","dükkandan","magazadan","mağazadan","subeden alma","şubeden alma","elden alma","gelip alma","yerinden alma"])) return "store_pickup";
  // ════════════════════════════════════════════════════════════════
  // PREVIEW / KARAR DESTEĞİ AİLESİ — 3 subtype
  // Öncelik: decision_support > preview_request > composition_question
  // Bu aile price / back_photo_info / general tarafından ezilmemeli.
  // Aktif stage'ler: waiting_photo, waiting_payment, waiting_address, order_completed
  // ════════════════════════════════════════════════════════════════

  // Negatif bağlam: payment/shipping/material soruları preview'a çekilmesin
  const PREVIEW_NEG = ["kararma","solma","fiyat","kargo","odeme","ödeme","kapida","kapıda","eft","havale","paketleme","kutu","zincir boyu","zincir uzunlugu"];

  // ── A) decision_support ──
  // Explicit KW array
  if (hasAny(norm, KW.decision_support) && !hasAny(norm, ["odeme","ödeme","kapida","kapıda","eft","havale"])) return "decision_support";
  // "karar veremedim/kararsız" + resim/foto/seçim bağlamı
  if (hasAny(norm, ["karar veremedim","karar veremiyorum","kararsiz","kararsız","arasinda kaldim","arasında kaldım","arasinda karar"]) &&
      hasAny(norm, ["resim","foto","fotoğraf","fotograf","uc","üç","3","secim","seçim","hangisi","tasarim","tasarım"])) return "decision_support";
  // "sizce hangisi / siz seçin" tek başına da yeterli
  if (hasAny(norm, ["sizce hangisi","sizce hangi","siz secebilir","siz seçebilir","siz secin","siz seçin","hangini begendirsiniz","hangini beğendirsiniz"])) return "decision_support";

  // ── B) preview_request ──
  if (hasAny(norm, KW.preview_request) && !hasAny(norm, PREVIEW_NEG)) return "preview_request";
  // "nasıl olur/durur/olacak" + foto/resim/görsel/kolye/model bağlamı
  if (hasAny(norm, ["nasil olur","nasıl olur","nasil olacag","nasıl olacağ","nasil gorunur","nasıl görünür","nasil durur","nasıl durur"]) &&
      hasAny(norm, ["foto","resim","gorsel","görsel","kolye","tasarim","tasarım","modeli","model olarak","model","gormek","görmek"]) &&
      !hasAny(norm, PREVIEW_NEG) &&
      !hasAny(norm, ["birlestir","birleştir","arkali onlu","arkalı önlü","iki foto","iki resim","ayni kare","aynı kare"])) return "preview_request";
  // "nasıl olur/durur" tek başına + waiting_photo bağlamı (composition sinyali yoksa)
  if (hasAny(norm, ["nasil olur","nasıl olur","nasil durur","nasıl durur"]) &&
      stage === STAGE.WAITING_PHOTO &&
      !hasAny(norm, PREVIEW_NEG) &&
      !hasAny(norm, ["birlestir","birleştir","arkali onlu","arkalı önlü","iki foto","iki resim","ayni kare","aynı kare","tek kolyede","birden fazla"])) return "preview_request";
  // "görüp karar / bakıp karar" tek başına
  if (hasAny(norm, ["gorup karar","görüp karar","bakip karar","bakıp karar","gormeden siparis","görmeden sipariş"])) return "preview_request";
  // "ön izleme" her bağlamda
  if (hasAny(norm, ["on izleme","ön izleme","onizleme","önizleme"])) return "preview_request";
  // "beğenip beğenmemek için / fikir için" + görsel bağlam
  if (hasAny(norm, ["begenip begenme","beğenip beğenme","fikir icin","fikir için"]) &&
      hasAny(norm, ["resim","foto","gorsel","görsel","kolye","atsam","atarsam"])) return "preview_request";
  if (hasAny(norm, ["foto atsam","fotoğraf atsam","fotograf atsam","resim atsam","foto gondersem","foto göndersem","fotograf gondersem","fotoğraf göndersem"]) &&
      hasAny(norm, ["ornek yap","örnek yap","taslak","nasil dur","nasıl dur","gorebilir","görebilir"])) return "preview_request";

    // Composition signals that overlap with photo_question — catch BEFORE photo_question
  // "arkalı önlü nasıl", "birleştirseniz", "tek kolyede iki foto" → composition not photo_question
  if (hasAny(norm, ["arkali onlu nasil","arkalı önlü nasıl","onlu arkali nasil","önlü arkalı nasıl",
      "birlestirseniz","birleştirseniz","birlestirerek","birleştirerek",
      "iki foto tek kolyede","tek kolyede iki foto","iki tarafli nasil","iki taraflı nasıl"])) return "composition_question";
  // "aynı karede" + "nasıl olur" veya çok kişi bağlamı → composition
  if (hasAny(norm, ["ayni karede","aynı karede","ayni kareye","aynı kareye"]) &&
      (hasAny(norm, ["nasil olur","nasıl olur","nasil goz","nasıl gör","olur mu"]) ||
       /\d/.test(norm) || hasAny(norm, ["dort","dört","4","bes","beş","5"]))) return "composition_question";

    if (hasAny(norm, KW.photo_question)) return "photo_question";
  if (hasAny(norm, KW.example_request)) return "example_request";
  if ((hasAny(norm, ["yapilmis","yapılmış","yaptiginiz","yaptığınız","daha once yap","daha önce yap"]) &&
       hasAny(norm, ["resim","foto","fotograf","fotoğraf","urun","ürün","kolye","model"])) ||
      hasAny(norm, ["modeli gorebilir","modeli görebilir","modelini gorebilir","modelini görebilir","model gorebilir","model görebilir","modeli gormek","modeli görmek"])) {
    return "example_request";
  }
  if (hasAny(norm, ["iban","hesap no","hesap numarasi","hesap numarası","eft bilgi","havale bilgi"])) {
    if (hasAny(norm, ["indirim","indirimli","uygun","ucuz"])) {} // bargain'a düşsün
    else return "iban_request";
  }
  // Remaining shipping (after trust took garanti/süre questions)
  if (hasAny(norm, KW.shipping)) return "shipping";
  if (hasAny(norm, KW.payment)) {
    if (/\d{3}/.test(norm) && hasAny(norm, ["olmaz","olur mu","yapar mi","yapar mı"])) {} // bargain'a düşsün
    else return "payment_info_question";
  }
  // Prod logs fix: "arka + resim/foto" combo composition; "arka + yazı" back_text
  // "Arkasına da farklı bir resim", "Arka yüz de de foto olacak" → composition_question
  // Fiyat/ücret sorusu varsa composition'a gitme (back_photo_info'da özel fiyat branch'ı var)
  // waiting_payment'ta composition'a gitme — orada back_photo_info default cevabı kasıtlı (legacy R88_4747)
  const hasBackMarker = hasAny(norm, ["arkasina","arkasında","arka kismina","arka kısmına","arka yuze","arka yüze","arka yuz","arka yüz","arkaya","arka taraf"]);
  const hasPhotoWord = hasAny(norm, ["resim","resmi","resimli","foto","fotograf","fotoğraf","fotografli","fotoğraflı"]);
  const hasTextWord = hasAny(norm, ["yazi","yazı","yazacak","yazılır","yazabiliyor","yazılsin","yazılsın","not","isim","tarih","dua"]);
  const hasPriceWord = hasAny(norm, ["fiyat","ucret","ücret","ne kadar","ekstra","bedava","dahil"]);
  if (hasBackMarker && hasPhotoWord && !hasTextWord && !hasPriceWord &&
      stage !== STAGE.WAITING_PAYMENT && stage !== "waiting_payment") return "composition_question";

  if (hasAny(norm, KW.back_text_info)) return "back_text_info";
  // Ek back_text_info: "arkasına" + soru kalıbı (tarih/isim/yazı atiyor mu vs)
  if (hasAny(norm, ["arkasina","arka kismina","arka kısmına","arka yuze","arka yüze"]) && hasAny(norm, ["atiyor","atıyor","yaziyor","yazıyor","olur mu","oluyor mu","yapiliyor","yapılıyor","yazilir","yazılır","eklenebilir","yazabilir","yazabiliyor","koyabiliyor","yazdir","yazdır","olabilir","yazalim","yazalım","basabilir","koyabilir"])) return "back_text_info";
  // Arka yazı ÜCRET sorusu → back_text_info (price'a düşmesin; cevap: ücretsiz)
  if (hasAny(norm, ["arkasina","arkasına","arka yuze","arka yüze","arka yuz","arka yüz","arkaya","arka taraf","arka yazi","arka yazı","arka yazinin","arka yazının"]) &&
      hasAny(norm, ["ucret","ücret","ucretli","ücretli","para mi","para mı","ek ucret","ek ücret","ekstra","fark var","dahil mi","fiyata dahil","ucreti var","ücreti var","parali","paralı"])) return "back_text_info";

  // ━━━ FIX F5: composition_question back_photo_info'dan ÖNCE ━━━
  // KW.composition_question genişletilmiş olduğundan artık geniş yakalıyor
  if (hasAny(norm, KW.composition_question)) return "composition_question";

  // Structural catch: Türkçe'de "2 tane resim", "iki tane kızım", "3 tane çocuğun" gibi
  // araya "tane" kelimesi girdiğinde keyword-list match'lemiyor. Regex ile pattern tespiti:
  //   (sayı/harf karşılığı) + tane? + (resim/foto/fotoğraf/çocuk/kızım/oğlum/ailem/bebeğin)
  // Bu sayısal composition sinyali; composition_question intent'ine yönlendirir.
  const _numWord = "(2|3|4|5|iki|üç|uc|dort|dört|bes|beş|cift|çift)";
  const _compNoun = "(resim|resmi|resme|resmin|foto|fotograf|fotoğraf|cocuk|çocuk|cocugun|çocuğun|kizim|kızım|oglum|oğlum|torunum|bebegin|bebeğin|ailem|aile)";
  const compCountRegex = new RegExp(`\\b${_numWord}\\s+(tane\\s+)?${_compNoun}`);
  if (compCountRegex.test(norm)) return "composition_question";
  // "bir kolye + birleş" / "bir kolyeye + iki/üç/...resim" → composition
  if (hasAny(norm, ["bir kolye","tek kolye","bi kolye"]) && hasAny(norm, ["birlesin","birleşsin","birlesi","birleşi"])) return "composition_question";

  // Kişi/resim sayısı soruları → photo_question (back_photo_info'dan ÖNCE)
  if (hasAny(norm, ["kac kisi","kaç kişi","kac kisilik","kaç kişilik","iki kisi","iki kişi","2 kisi","2 kişi","birden fazla kisi","birden fazla kişi","ikisini","3 kisi","3 kişi","5 kisi","5 kişi","aile foto","3 kisilik","3 kişilik"])) return "photo_question";
  if (hasAny(norm, ["ikili resim","ikili foto","ayni kare","aynı kare","tek kare","yan yana"])) return "photo_question";
  if (hasAny(norm, ["kac resim koyabil","kaç resim koyabil","kac fotograf koyabil","kaç fotoğraf koyabil","kac adet foto","kaç adet foto","kac adet resim","kaç adet resim","kac adet gorsel","kaç adet görsel","3 lu yapiy","3 lü yapıy","3lu yapiy","3lü yapıy"])) return "photo_question";
  if (hasAny(norm, KW.back_photo_info) && !hasAny(norm, ["siparis","siparış","sipariş","kargo","teslimat","iade"])) return "back_photo_info";
  if (hasAny(norm, KW.back_text_skip) && !norm.includes("zincir")) return "back_text_skip";


  // ════════════════════════════════════════════════════════════════
  // PRODUCT STRUCTURE vs QUANTITY AİLESİ (Sıra 4)
  // ÖNCE yapı intenti — composition'dan önce gelmeli (plaka/uç/tek kolye)
  // ════════════════════════════════════════════════════════════════

  // ── A) single_pendant_request: zincirsiz / sadece uç ──
  if (hasAny(norm, KW.single_pendant_signals)) return "single_pendant_request";
  if (hasAny(norm, ["sadece uc","sadece uç","sadece kolye ucu","zincirsiz"]) && !hasAny(norm, ["zincir dahil","zincir fiyat","zincir boyu","zincir uzunlug"])) return "single_pendant_request";

  // ── B) product_structure_request: tek kolye / çift uç / yapı soruları ──
  if (hasAny(norm, KW.product_structure_signals)) return "product_structure_request";
  if (hasAny(norm, ["tek olacak","kolye tek","tek kolye"]) && hasAny(norm, ["ucu","uç","uc","tane","plaka"])) return "product_structure_request";
  if (hasAny(norm, ["ust uste","üst üste"])) return "product_structure_request";
  // "tek kolyede iki plaka / tek kolyede iki uç" — composition'dan önce yakala
  if (hasAny(norm, ["tek kolyede","tek kolyeye","bir kolyeye","bir kolyede"]) && hasAny(norm, ["plaka","uc","uç","iki uc","iki plaka","iki uç"])) return "product_structure_request";

  // ── C) chain_structure_request: zincir yapısı ──
  if (hasAny(norm, KW.chain_structure_signals)) return "chain_structure_request";

  // ── D) composition_question ──
  if (hasAny(norm, KW.composition_question)) return "composition_question";
  // "birleştirmek" + foto/resim bağlamı
  if (hasAny(norm, ["birlestirmek","birleştirmek","birlestirerek","birleştirerek"]) &&
      hasAny(norm, ["foto","resim","fotograf","fotoğraf"]) &&
      !hasAny(norm, ["siparis","siparış","kargo","alim","alım"])) return "composition_question";
  // "aynı karede / tek kolyede" + kişi/foto (plaka/uç değil — o yukarıda yakalandı)
  if (hasAny(norm, ["ayni karede","aynı karede","tek kolyede","tek kolyeye","ayni kareye","aynı kareye"]) &&
      hasAny(norm, ["iki","2","uc","üç","3","dort","dört","4","cocuk","çocuk","kisi","kişi","foto","resim"]) &&
      !hasAny(norm, ["plaka","uç iki","iki uç","ust uste","üst üste"])) return "composition_question";

  // new_order: yeni sipariş isteği — quantity_order'dan ÖNCE kontrol et
  if (hasAny(norm, KW.new_order)) return "new_order";

  // ━━━ FIX F5: multi_order composition guard ━━━
  // "3 çocuk", "iki oğlumun", "3 cocugumun fotograf" → multi_order DEĞİL composition
  // "3 çocuğumun fotoğrafı" → 3 kolye değil, tek kolyede 3 kişi
  const hasPersonContext = hasAny(norm, [
    "cocuk","çocuk","cocugumun","çocuğumun","cocuklarim","çocuklarım",
    "oglum","oğlum","oglumun","oğlumun","kizim","kızım","kizimin","kızımın",
    "kisi","kişi","yuz","yüz","taraf","cocuklarimin","çocuklarımın",
    "resim","resmi","resmini","foto","fotograf","fotoğraf","fotograflari","fotoğrafları",
    "aile","ailem","ailemi","kardes","kardeş"
  ]);
  const hasKolyeQuantityKW = hasAny(norm, [
    "kolye","adet","tane kolye","urun","ürün",
    "toplu","coklu","çoklu","siparis","sipariş"
  ]);
  const hasCompositionNumber = hasAny(norm, [
    "iki","2","uc","üç","3","dort","dört","4","bes","beş","5","iki tane","3 tane","4 tane"
  ]);
  if (hasPersonContext && hasCompositionNumber && !hasKolyeQuantityKW) {
    return "composition_question";
  }

  // ── D) quantity_order / multi_order: gerçek adet siparişi ──
  // Önce negatif kontrol: structure sinyali varsa multi_order'a gitme
  const hasStructureSignal = hasAny(norm, ["kolye tek","tek olacak","ucu iki","iki tane uc","iki tane uç","ust uste","üst üste","bir kolyeye","ayni kolyeye","aynı kolyeye","tek kolyede","tek kolyeye","tek kolye ama","tek kolye ucu"]);
  if (!hasStructureSignal) {
    if (hasAny(norm, KW.quantity_signals)) return "quantity_order";
    // "kolye ucu" / "tek kolye ucu" → product_structure değil multi_order — structure'a bırak
    // Ama "kolye ucunda 2 tane resim" gibi adet soruları → multi_order kalmalı
    if (hasAny(norm, ["2 tane","iki tane","3 tane","uc tane","üç tane","4 tane","dort tane","dört tane","5 tane","bes tane","beş tane","2li","2'li","3lu","3'lü","uclu","üçlü","toplu alim","toplu alım","iki kolye","2 kolye","3 kolye","4 kolye","5 kolye","ikisinin fiyati","ikisinin fiyatı","toplu siparis","toplu sipariş","coklu alim","çoklu alım","2 urun","2 ürün","3 urun","3 ürün","3 adet","4 adet","5 adet","20 adet"]) &&
        !hasAny(norm, ["tek kolye ucu","sadece kolye ucu","sadece ucu","zincirsiz ucu"]) &&
        !hasPersonContext) return "multi_order";
    if (/\d\s*(li|lü|lu|lı)\s*(alim|alım|siparis|sipariş)/i.test(norm)) return "multi_order";
    if (hasAny(norm, ["toplu","coklu","çoklu"]) && hasAny(norm, ["indirim","fiyat"])) return "multi_order";
    // "Toptan alabilir miyim" (toptan=her zaman çoklu) + "birden fazla alırsam" (satın-alma fiiliyle,
    // 'birden fazla kişi/fotoğraf' kompozisyonu ile karışmasın diye).
    if (hasAny(norm, ["toptan"]) && !hasPersonContext) return "multi_order";
    if (norm.includes("birden fazla") && hasAny(norm, ["alir","alır","alsa","alsam","alsak","alacak","alacag","alabilir","siparis","sipariş","urun alir","ürün alır","adet"]) && !hasPersonContext) return "multi_order";
  }

  // Price confirmation (fiyat teyidi — pazarlık DEĞİL)
  if (/\d{3}\s*(tl|lira)?\s*(miydi|mıydı|demi|degil mi|değil mi|gonderecegim|göndereceğim|gonderiyorum|gönderiyorum|atacagim|atacağım|yatircam|yatırcam|yatıracağım)/i.test(norm)) return "price";

  // Bargain
  if (hasAny(norm, ["indirim","indirin","son fiyat","yardimci olun","yardımcı olun","anlasalim","anlaşalım","pazarlik","pazarlık","kaca yaparsiniz","kaça yaparsınız","birakir misiniz","bırakır mısınız","indirimli","uygun fiyat","son fiyati","son fiyatı","duz hesap","düz hesap","indirim var mi","indirim var mı","indirim yapar","indirim olur","biraz daha uygun","biraz indirim","ucuza","daha ucuz","cok pahali","çok pahalı"])) return "bargain";
  if (/\d+\s*(tl|lira)?\s*(olur|yapar|yap\b|yapalim|yapalım|birak|bırak|anlas|anlaş|yapin|yapın|gonder|gönder|olmaz|atsam|indirin|indır)/i.test(norm)) return "bargain";
  if (/\d{3}\s*(e |a |ye |ya )(birak|bırak|gonder|gönder|yapar|yapın|yapin)/i.test(norm)) return "bargain";
  if (/\d{3}\s*(tl)?\s*(olmaz|olur)\s*(mi|mı|mu|mü)/i.test(norm)) return "bargain";

  // Prod logs fix: "Halat kolyeyle mi bu fiyat" → chain_question (halat spesifik keyword)
  if (hasAny(norm, ["halat kolye","halat zincir","halatla","halat model","halat mi","halat mı","halat var"]) && !hasAny(norm, ["fotograf","fotoğraf","resim"])) {
    return "chain_question";
  }

  // TESLİMAT SÜRESİ — "ne kadar sürede/kaç günde/ne zaman gelir/ulaşır" → kargo (price'tan ÖNCE).
  // "ne kadar" fiyat kelimesi olduğu için price'a düşüyordu; teslimat bağlamında kargo olmalı.
  if (hasAny(norm, ["ne kadar sure","ne kadar süre","kac gunde","kaç günde","kac gune","kaç güne","ne zaman gel","ne zaman ulas","ne zaman ulaş","surede gel","sürede gel","kacta gel","kaçta gel","kac gun sur","kaç gün sür","gun icinde gel","gün içinde gel","ne zaman kargo","kac gunde gel","kaç günde gel","elime ne zaman","elime kac","kargoya ne zaman"])) return "shipping";

  if (hasAny(norm, KW.price)) return "price";

  // ═══ 8. BACK TEXT (waiting_payment, explicit signal) ═══
  if (stage === STAGE.WAITING_PAYMENT && !backTextDone) {
    if (hasAny(norm, KW.back_text_direct)) return "back_text";
    if (hasAny(norm, ["arkasina","arkasına","arka yuze","arka yüze","arkaya yazi","arkaya yazı"])) return "back_text";
  }

  // ═══ 9. PHOTO REFERENCE / CHANGE (order_start'tan ÖNCE — "foto" keyword çakışması) ═══
  if (hasAny(norm, ["bundan olacak","bundan olsun","son attigim","son attığım","ustteki","üstteki","ustteki olsun","üstteki olsun","bu olsun","bu foto olsun","bu resim olsun","bu model olsun","bu modelden olsun","bu fotograf olacak","bu fotoğraf olacak","bu foto olacak","bu resim olacak"])) return "photo_reference";
  if (hasAny(norm, ["baska resim","başka resim","farkli foto","farklı foto","fotografi degistir","fotoğrafı değiştir","resim degistir","resim değiştir","baska foto","başka foto","degistireyim","değiştireyim","baska resim bakayim","başka resim bakayım","farkli foto atayim","farklı foto atayım","bu fotograf degil","bu fotoğraf değil","bu foto degil","bu foto değil","yanlis foto","yanlış foto","yanlis resim","yanlış resim","o fotograf degil","o fotoğraf değil"])) return "photo_change_request";

  // ═══ 10. PRODUCT FLOW ═══
  // "atacaktınız" hatırlatma → order_start değil
  if (hasAny(norm, ["atacaktiniz","atacaktınız","atacaksiniz","atacaksınız","atacaginizi","atacağınızı","atacaktiniz ama","gorsel atacak","görsel atacak","resim atacak","foto atacak"])) return "general";
  // future-tense resim/foto gönderim → general (order_start değil)
  if (hasAny(norm, ["resim atacagim","resim atacağım","foto atacagim","foto atacağım","resim atcam","foto atcam","resim yollarim","foto yollarim","resim gondericegim","foto gondericegim"]) &&
      !hasAny(norm, ["hadi","haydi","simdi","şimdi","hazir","hazır"])) return "general";
  // Prod logs fix (FIX E): waiting_product'ta past-tense sipariş referansı veya dönüş şikayeti → post_sale
  // "ben sipariş verdim" / "siparişim var" / "oluşturmuştum" / "dönüş yapmıyorsunuz" — menu DEĞİL, operator'a
  const isPastOrderRef = hasAny(norm, [
    "siparis verdim","sipariş verdim","siparis vermistim","sipariş vermiştim",
    "siparisim var","siparişim var","siparisim vardi","siparişim vardı",
    "olusturmustum","oluşturmuştum","siparis olusturmustum","sipariş oluşturmuştum",
    "size siparis","size sipariş","verdigim siparis","verdiğim sipariş",
    "biraz once siparis","biraz önce sipariş","az once siparis","az önce sipariş",
  ]);
  const isWaitingProductOrderStatus =
    hasAny(norm, ["siparisim","siparişim","siparis","sipariş","kargom","kargo"]) &&
    hasAny(norm, ["hazirlanmadi","hazırlanmadı","hazirlanmadimi","hazırlanmadı mı","hazir mi","hazır mı","hazirlandi mi","hazırlandı mı","ne durumda","gelmedi","nerede","nerde","cikti mi","çıktı mı","verildi mi"]);
  const isReturnComplaint = hasAny(norm, [
    "donus yapmiy","dönüş yapmıy","donus yapılmı","dönüş yapılmı","neden donus","neden dönüş",
    "hala donus yok","hala dönüş yok","donus gelmedi","dönüş gelmedi","cevap vermiyor",
    "neden cevap","hala cevap yok","donus olmadi","dönüş olmadı",
  ]);
  // waiting_product stage (normal veya completed sonrası) — ilk mesaj değilse past-tense sipariş post_sale
  const stageForPostSale = stage === STAGE.WAITING_PRODUCT || stage === "waiting_product";
  if ((isPastOrderRef || isReturnComplaint || isWaitingProductOrderStatus) && stageForPostSale) {
    return "post_sale";
  }

  if (raw.length <= 30 && (hasAny(norm, KW.product_lazer) || hasAny(norm, KW.product_atac) || hasAny(norm, KW.product_yonca) || hasAny(norm, KW.product_anahtarlik) || hasAny(norm, KW.product_bileklik) || hasAny(norm, KW.product_mezar_tasi))) return "order_start";
  if (hasAny(norm, KW.order_start)) {
    if (hasAny(norm, ["ama suan degil","ama henuz degil","ama simdi degil","dusunuyorum","düşünüyorum","daha sonra","henuz","henüz","vermeyeceg","istemiyorum","vazgec","vazgeç"])) return "general";
    return "order_start";
  }
  if (hasAny(norm, KW.post_sale)) return "post_sale";
  if (hasAny(norm, KW.detail_request)) return "detail_request";

  // ═══ 10. ACK / SMALLTALK ═══
  const ACK_WORDS = ["tamam","tamamdir","tamamdır","tmm","olur","peki","evet","ok","okey","oldu","anladim","anladım","he","hee","tm","tabi","tabii","elbette","olmuş"];
  if (raw.length <= 15 && ACK_WORDS.includes(norm)) return "ack";
  if (hasAny(norm, KW.smalltalk)) return "smalltalk";

  // ═══ 11. WAITING_PAYMENT short messages → back_text (very strict) ═══
  if (stage === STAGE.WAITING_PAYMENT && raw.length <= 40 && !backTextDone) {
    const isQuestion = /[?]/.test(raw) || /\b(mi|mı|mu|mü|misiniz|mısınız)\b/i.test(raw);
    const isPhone = /0\d{3}\s?\d{3}\s?\d{2}\s?\d{2}/.test(raw) || /05\d{2}/.test(raw);
    const isUndecided = hasAny(norm, ["bilemedim","karar veremedim","kararsiz","kararsız","ne yazsak","emin degilim","emin değilim"]);
    // ══ AILE B FIX: İnitials / tek harfler back_text DEĞİL ══
    // "B k olcak", "B K", "F Y Z" gibi — gerçek metin değil, kısaltma
    const isInitials = /^[A-ZÇĞİÖŞÜ]\s/.test(raw.trim()) && raw.trim().length < 15 && raw.split(/\s+/).every(w => w.length <= 3);
    // Sadece A-Z harflerden oluşan 2-3 tek harf birlikte
    const isJustLetters = /^([A-ZÇĞİÖŞÜ]\s*){2,4}$/i.test(raw.trim().replace(/\n/g, ' '));
    // "B k olcak" - tek harf + küçük-harfli kelime + fiil yardımcısı
    const isInitialsWithFiller = /^[A-ZÇĞİÖŞÜ]\s+[a-zçğıöşü]\s+(olcak|olacak|olsun|olsa)/i.test(raw.trim());
    const isBlessingOrCondolence = hasAny(norm, [
      "basiniz sagolsun","başınız sağolsun","basiniz sag olsun","başınız sağ olsun",
      "gecmis olsun","geçmiş olsun","allah rahmet","allah kabul","allah razi olsun","allah razı olsun",
      "hayirli olsun","hayırlı olsun","mubarek olsun","mübarek olsun","sihhatle kullan","sıhhatle kullan",
      "saglikla kullan","sağlıkla kullan","gule gule kullan","güle güle kullan",
      "tesekkur ederim","teşekkür ederim","tesekkurler","teşekkürler","cok sagolun","çok sağolun"
    ]);
    const isBlocked = hasAny(norm, [
      "bekliyorum","neden","niye","hala","hâlâ","tekrar","yine","sorun","sikayet","şikayet","memnun",
      "yanlis","yanlış","yeter","yazdim","yazdım","verdim","attim","attım","gonderdim","gönderdim",
      "zincir","kolye","renk","gumus","gümüş","gold","altin","altın","fiyat","kargo",
      "materyal","celik","çelik","garanti","iade","iptal","taksit","eft","havale","kapida","kapıda",
      "adres","telefon","numara","whatsapp",
      "tamam","olur","peki","evet","hayir","hayır","yok","istemiyorum","gerek yok",
      "gormek","görmek","gormeden","görmeden","gorsel","görsel","paylasir","paylaşır",
      "kalite","net","fotograf","fotoğraf","resim","kopma","silinme","dayanikli",
      // ══ AILE B FIX: operasyonel/age/complaint ══
      "kargolam","iletisim","iletişim","bebegim","bebeğim","rahatsiz","rahatsız","emar","hastane",
      "yasinda","yaşında","yasin da","yaşın da","yasin de","yaşın de",
      "surekli","sürekli","hep ayni","hep aynı","duruyor","deyip",
    ]);
    // "İl Balıkesir İlçe ivrindi mah..." — kısa adres
    const isShortAddressStructure = /\b(il|ilce|ilçe|mah|mahalle|mahallesi|sokak|cadde|caddesi|apt|daire|kat|no)\b/i.test(norm) ||
                                    /\[ADDRESS\]/i.test(raw);
    if (!isQuestion && !isBlocked && !isPhone && !isUndecided && !isBlessingOrCondolence && !isInitials && !isJustLetters && !isInitialsWithFiller && !isShortAddressStructure && !hasAny(norm, ACK_WORDS)) return "back_text";
  }

  // ═══ DEFAULT ═══
  return "general";
}

export function extractEntities(message, norm, product, stage) {
  return {
    phone: extractPhone(message),
    hasAddress: looksLikeAddress(norm, message, stage),
    hasName: looksLikeName(message, norm, stage),
    payment: parsePaymentFromMessage(norm, ""),
    photoLink: looksLikePhotoUrl(message),
    letters: extractLetters(message, norm, product, stage),
  };
}

// ══════════════════════════════════════════════════════════════════
// SECONDARY INTENT DETECTION (Sıra 5 — Multi-Question desteği)
// Desteklenen kombinasyonlar (primary → secondary):
//   shipping_carrier+eta, material+trust, chain+composition,
//   back_text_question+fit, price+chain, price+shipping,
//   preview+decision, payment+shipping, single_pendant+price
// ══════════════════════════════════════════════════════════════════

// Birden fazla soru belirteci — geniş tanımlama
const MULTI_Q_MARKERS = ["bide","bir de","bide ","bir de ","de bir","ayrıca","ayrica","hem de","peki bide","peki bir de","bunun yaninda","bunun yanında","ya da ","yada "];

function hasMultiQuestionSignal(norm) {
  if (MULTI_Q_MARKERS.some(m => norm.includes(m))) return true;
  // Virgülle ayrılmış iki farklı soru
  if (norm.includes(",") && norm.split(",").length >= 2) return true;
  // "ne kadar" birden fazla kez
  if (norm.split("ne kadar").length > 2) return true;
  // "olur mu" birden fazla kez
  if (norm.split("olur mu").length > 2) return true;
  // "mi" + farklı konu sinyali (material+trust, shipping+eta gibi klasik çiftler)
  // Soru + soru — "X mi Y olur mu" pattern
  if (/\w+\s+mi\b.+\w+\s+olur\s+mu\b/i.test(norm)) return true;
  // Kargo/teslim sorusu → ikisi de shipping ailesi içinde birleştir
  if (norm.includes("kargo") && (norm.includes("kac gun") || norm.includes("kac is gunu") || norm.includes("ne zaman"))) return true;
  // Zincir dahil mi → chain + price birleşimi
  if (norm.includes("zincir") && norm.includes("dahil")) return true;
  // Malzeme + güven → "çelik mi kararma"
  if ((norm.includes("celik") || norm.includes("gumus") || norm.includes("malzeme")) && (norm.includes("kararma") || norm.includes("solma") || norm.includes("paslanma"))) return true;
  // Arka yazı + sığar
  if ((norm.includes("arkasina") || norm.includes("arka yuze") || norm.includes("arkaya")) && (norm.includes("sigar") || norm.includes("sığar"))) return true;
  // Uzunluk + renk/model
  if ((norm.includes("uzunluk") || norm.includes("kac cm") || norm.includes("zincir")) && (norm.includes("renk") || norm.includes("cesit") || norm.includes("secenegi"))) return true;
  return false;
}

// Hangi intent ailesine giriyor
function intentFamily(intent) {
  if (["shipping","shipping_price"].includes(intent)) return "shipping";
  if (["material_question"].includes(intent)) return "material";
  if (["trust"].includes(intent)) return "trust";
  if (["chain_question","chain_structure_request"].includes(intent)) return "chain";
  if (["price"].includes(intent)) return "price";
  if (["back_text_question","back_text_info"].includes(intent)) return "back_text_q";
  if (["back_text_fit_question"].includes(intent)) return "back_text_fit";
  if (["composition_question","photo_question","back_photo_info"].includes(intent)) return "composition";
  if (["preview_request"].includes(intent)) return "preview";
  if (["decision_support"].includes(intent)) return "decision";
  if (["payment_info_question","payment"].includes(intent)) return "payment";
  if (["single_pendant_request","product_structure_request"].includes(intent)) return "structure";
  return "other";
}

// Kombine edilebilir çiftler tablosu (primary_family → secondary_family → secondary_intent_hint)
const COMBINE_TABLE = {
  "shipping":    { "shipping": "shipping_eta", "payment": "payment_info_question" },
  "material":    { "trust": "trust" },
  "chain":       { "composition": "composition_question", "price": "price", "structure": "product_structure_request" },
  "price":       { "chain": "chain_question", "shipping": "shipping", "structure": "single_pendant_request" },
  "back_text_q": { "back_text_fit": "back_text_fit_question" },
  "preview":     { "decision": "decision_support", "composition": "composition_question" },
  "trust":       { "material": "material_question", "shipping": "shipping" },
  "payment":     { "shipping": "shipping" },
};

export function detectSecondaryIntent(norm, primaryIntent, ctx) {
  // Çok soru belirteci yoksa secondary çıkarma
  if (!hasMultiQuestionSignal(norm)) return null;

  const pFamily = intentFamily(primaryIntent);
  const candidates = COMBINE_TABLE[pFamily];
  if (!candidates) return null;

  // Her candidate için norm'da sinyal ara
  for (const [secFamily, secHint] of Object.entries(candidates)) {
    let found = false;
    if (secFamily === "shipping" && hasAny(norm, ["kac gun","kaç gün","kac is gunu","kaç iş günü","ne zaman gelir","kac gunde","kaç günde","teslim","ptt","kargo"])) found = true;
    if (secFamily === "trust" && hasAny(norm, ["kararma","solma","paslanma","dayanikli","dayanıklı","silinme","garanti"])) found = true;
    if (secFamily === "material" && hasAny(norm, ["celik","çelik","gumus","gümüş","altin","altın","malzeme","kaplama"])) found = true;
    if (secFamily === "chain" && hasAny(norm, ["zincir","zinciri","zincir boyu","60 cm","zincir uzunlug"])) found = true;
    if (secFamily === "composition" && hasAny(norm, ["iki kisi","iki kişi","iki cocuk","iki çocuk","ayni kare","aynı kare","birden fazla","iki foto","iki resim","kac kisi","kaç kişi"])) found = true;
    if (secFamily === "price" && hasAny(norm, ["fiyat","ne kadar","ucret","ücret","tl","lira"])) found = true;
    if (secFamily === "back_text_fit" && hasAny(norm, ["sigar","sığar","sigdirir","sığdırır","olur mu","uzun olmaz","yazar mi","yazılır mı"])) found = true;
    if (secFamily === "decision" && hasAny(norm, ["karar veremedim","kararsiz","hangisi","sizce"])) found = true;
    if (secFamily === "structure" && hasAny(norm, ["sadece uc","zincirsiz","sadece uç","kolye ucu"])) found = true;
    if (secFamily === "payment" && hasAny(norm, ["kapida","kapıda","eft","havale","odeme","ödeme","kart"])) found = true;

    if (found) return secHint;
  }
  return null;
}
