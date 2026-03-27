import fs from "fs";
import path from "path";

const fileCache = {};

function readKnowledgeFile(filename) {
  if (fileCache[filename]) return fileCache[filename];
  const filePath = path.join(process.cwd(), "knowledge", filename);
  const content = fs.readFileSync(filePath, "utf8");
  fileCache[filename] = content;
  return content;
}

function cleanValue(value) {
  if (value === null || value === undefined) return "";
  let str = String(value).trim();

  str = str.replace(/^\{\{\{?/, "").replace(/\}\}\}?$/, "").trim();

  if (/^\{[^}]+\}$/.test(str)) return "";
  if (/^cuf_\d+$/i.test(str)) return "";
  if (["undefined", "null", "none"].includes(str.toLowerCase())) return "";

  return str;
}

function normalizeText(value) {
  return cleanValue(value)
    .toLowerCase()
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .trim();
}

function normalizeProduct(value) {
  const v = normalizeText(value);
  if (!v) return "";
  if (v.includes("lazer")) return "lazer";
  if (v.includes("ataç") || v.includes("atac")) return "atac";
  return v;
}

function getSession(body = {}) {
  const currentProduct = normalizeProduct(body.ilgilenilen_urun || body.user_product || body.current_product);
  const flowStage = normalizeText(body.conversation_stage || body.flow_stage);
  const orderStatus = normalizeText(body.order_status);
  const photoReceived = cleanValue(body.photo_received);
  const paymentMethod = normalizeText(body.payment_method);
  const menuGosterildi = cleanValue(body.menu_gosterildi);
  const backTextStatus = cleanValue(body.back_text_status);
  const addressStatus = cleanValue(body.address_status);
  const supportMode = cleanValue(body.support_mode);
  const siparisAlindi = cleanValue(body.siparis_alindi);
  const lastIntent = normalizeText(body.last_intent);
  const cancelReason = cleanValue(body.cancel_reason);
  const contextLock = cleanValue(body.context_lock);

  return {
    currentProduct,
    flowStage,
    orderStatus,
    photoReceived,
    paymentMethod,
    menuGosterildi,
    backTextStatus,
    addressStatus,
    supportMode,
    siparisAlindi,
    lastIntent,
    cancelReason,
    contextLock
  };
}

function detectGreeting(message) {
  const msg = normalizeText(message);
  const greetings = [
    "merhaba",
    "selam",
    "slm",
    "sa",
    "selamün aleyküm",
    "selamun aleykum",
    "iyi akşamlar",
    "iyi aksamlar",
    "iyi günler",
    "iyi gunler",
    "günaydın",
    "gunaydin",
    "hey",
    "naber"
  ];
  return greetings.some((g) => msg === g || msg.startsWith(g + " "));
}

function detectLaserIntent(message) {
  const msg = normalizeText(message);
  return (
    msg.includes("resimli") ||
    msg.includes("lazer kolye") ||
    msg.includes("lazer") ||
    msg.includes("fotoğraflı") ||
    msg.includes("fotoğrafli") ||
    msg.includes("fotograflı") ||
    msg.includes("fotografli")
  );
}

function detectAtacIntent(message) {
  const msg = normalizeText(message);
  return (
    msg.includes("ataç") ||
    msg.includes("atac") ||
    msg.includes("harfli")
  );
}

function detectProductSwitch(message, currentProduct) {
  if (!currentProduct) return "";

  const wantsLaser = detectLaserIntent(message);
  const wantsAtac = detectAtacIntent(message);
  const msg = normalizeText(message);

  const switchSignals =
    msg.includes("yok ben") ||
    msg.includes("vazgeçtim") ||
    msg.includes("vazgectim") ||
    msg.includes("onu değil") ||
    msg.includes("onu degil") ||
    msg.includes("değiştireyim") ||
    msg.includes("degistireyim") ||
    msg.includes("diğerini") ||
    msg.includes("digerini");

  if (currentProduct === "lazer" && wantsAtac) return "atac";
  if (currentProduct === "atac" && wantsLaser) return "lazer";

  if (switchSignals) {
    if (wantsLaser) return "lazer";
    if (wantsAtac) return "atac";
  }

  return "";
}

function isRealPhotoUrl(message) {
  const msg = cleanValue(message);
  if (!msg) return false;
  if (!/^https?:\/\/\S+$/i.test(msg)) return false;

  return (
    msg.includes("lookaside.fbsbx.com") ||
    msg.includes("scontent") ||
    msg.includes(".jpg") ||
    msg.includes(".jpeg") ||
    msg.includes(".png") ||
    msg.includes(".webp")
  );
}

function isPhotoStatement(message) {
  const msg = normalizeText(message);

  const phrases = [
    "fotoğrafı gönderiyorum",
    "fotoğraf gönderiyorum",
    "fotografi gonderiyorum",
    "foto gönderiyorum",
    "foto gonderiyorum",
    "foto atıyorum",
    "foto atiyorum",
    "resmi gönderiyorum",
    "resmi gonderiyorum",
    "atıyorum şimdi",
    "atıyorum",
    "gönderiyorum",
    "gonderiyorum"
  ];

  return phrases.some((p) => msg === p || msg.includes(p));
}

function isCOD(message) {
  const msg = normalizeText(message);
  return (
    msg.includes("kapıda ödeme") ||
    msg.includes("kapida odeme") ||
    msg === "kapıda" ||
    msg === "kapida" ||
    msg === "ko"
  );
}

function isEFT(message) {
  const msg = normalizeText(message);
  return (
    msg.includes("eft") ||
    msg.includes("havale") ||
    msg.includes("ibana") ||
    msg.includes("banka")
  );
}

function looksLikeAddress(message) {
  const raw = cleanValue(message);
  const msg = normalizeText(message);
  if (!raw) return false;
  if (raw.length < 18) return false;
  if (isRealPhotoUrl(raw)) return false;

  const keywords = [
    "mah",
    "mahalle",
    "sokak",
    "sk",
    "cadde",
    "cd",
    "no",
    "numara",
    "daire",
    "daire:",
    "kat",
    "apartman",
    "apt",
    "site",
    "blok",
    "ilçe",
    "ilce",
    "adres",
    "istanbul",
    "ankara",
    "izmir",
    "bursa",
    "kocaeli",
    "şişli",
    "sisli",
    "beykoz",
    "üsküdar",
    "uskudar",
    "kadıköy",
    "kadikoy"
  ];

  let hit = 0;
  for (const k of keywords) {
    if (msg.includes(k)) hit++;
  }

  const hasNumber = /\d/.test(raw);
  return (hit >= 2 && hasNumber) || hit >= 3;
}

function looksLikeLetters(message) {
  const raw = cleanValue(message);
  const msg = normalizeText(message);

  if (!raw) return false;
  if (raw.length > 40) return false;
  if (looksLikeAddress(raw)) return false;
  if (isCOD(raw) || isEFT(raw)) return false;
  if (detectGreeting(raw)) return false;
  if (detectLaserIntent(raw) || detectAtacIntent(raw)) return false;
  if (isPhotoStatement(raw) || isRealPhotoUrl(raw)) return false;

  return /^[a-zA-ZçğıöşüÇĞİÖŞÜ\s]+$/.test(raw) && msg.split(/\s+/).length <= 4;
}

function buildResponse(session, patch = {}) {
  const next = { ...session, ...patch };

  return {
    success: true,
    ai_reply: next.ai_reply || "",
    ilgilenilen_urun: next.currentProduct || "",
    user_product: next.currentProduct || "",
    last_intent: next.lastIntent || "",
    conversation_stage: next.flowStage || "",
    flow_stage: next.flowStage || "",
    order_status: next.orderStatus || "",
    photo_received: next.photoReceived || "",
    payment_method: next.paymentMethod || "",
    menu_gosterildi: next.menuGosterildi || "",
    back_text_status: next.backTextStatus || "",
    address_status: next.addressStatus || "",
    support_mode: next.supportMode || "",
    siparis_alindi: next.siparisAlindi || "",
    cancel_reason: next.cancelReason || "",
    context_lock: next.contextLock || ""
  };
}

function showMenu(session) {
  return buildResponse(session, {
    ai_reply:
      "Merhaba efendim 😊\nHangi model ile ilgileniyorsunuz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye",
    flowStage: "waiting_product",
    menuGosterildi: "evet",
    lastIntent: "menu"
  });
}

function startLaserFlow(session) {
  return buildResponse(session, {
    currentProduct: "lazer",
    flowStage: "waiting_photo",
    orderStatus: "started",
    lastIntent: "product_select",
    menuGosterildi: session.menuGosterildi || "evet",
    ai_reply: "Resimli lazer kolye için fotoğrafınızı buradan gönderebilirsiniz efendim 😊"
  });
}

function startAtacFlow(session) {
  return buildResponse(session, {
    currentProduct: "atac",
    flowStage: "waiting_letters",
    orderStatus: "started",
    lastIntent: "product_select",
    menuGosterildi: session.menuGosterildi || "evet",
    ai_reply: "Harfli ataç kolye için istediğiniz harfleri yazabilirsiniz efendim 😊"
  });
}

function switchProduct(session, newProduct) {
  if (newProduct === "lazer") {
    return buildResponse(session, {
      currentProduct: "lazer",
      flowStage: "waiting_photo",
      orderStatus: "started",
      photoReceived: "",
      paymentMethod: "",
      lastIntent: "product_switch",
      ai_reply: "Tabii efendim 😊 Resimli lazer kolye için fotoğrafınızı buradan gönderebilirsiniz."
    });
  }

  if (newProduct === "atac") {
    return buildResponse(session, {
      currentProduct: "atac",
      flowStage: "waiting_letters",
      orderStatus: "started",
      photoReceived: "",
      paymentMethod: "",
      lastIntent: "product_switch",
      ai_reply: "Tabii efendim 😊 Harfli ataç kolye için istediğiniz harfleri yazabilirsiniz."
    });
  }

  return showMenu(session);
}

function handleIdleOrWaitingProduct(session, message) {
  if (detectLaserIntent(message)) return startLaserFlow(session);
  if (detectAtacIntent(message)) return startAtacFlow(session);

  if (looksLikeAddress(message)) {
    return buildResponse(session, {
      flowStage: "waiting_product",
      menuGosterildi: "evet",
      lastIntent: "address",
      ai_reply:
        "Adresinizi aldım efendim 😊 Önce hangi model ile ilgilendiğinizi yazabilir misiniz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye"
    });
  }

  if (isCOD(message) || isEFT(message)) {
    return buildResponse(session, {
      flowStage: "waiting_product",
      menuGosterildi: "evet",
      lastIntent: "payment",
      ai_reply:
        "Ödeme yönteminizi not aldım efendim 😊 Önce hangi model ile ilgilendiğinizi yazabilir misiniz?\n\n• Resimli Lazer Kolye\n• Harfli Ataç Kolye"
    });
  }

  if (detectGreeting(message) || !cleanValue(message)) {
    return showMenu(session);
  }

  return showMenu(session);
}

function handleWaitingPhoto(session, message) {
  const switchTo = detectProductSwitch(message, session.currentProduct);
  if (switchTo) return switchProduct(session, switchTo);

  if (isRealPhotoUrl(message)) {
    return buildResponse(session, {
      flowStage: "waiting_payment",
      photoReceived: "1",
      lastIntent: "photo",
      ai_reply: "Fotoğrafınız alındı efendim 😊 Ödeme yöntemi olarak EFT / havale mi, kapıda ödeme mi tercih edersiniz?"
    });
  }

  if (isPhotoStatement(message)) {
    return buildResponse(session, {
      flowStage: "waiting_photo",
      photoReceived: session.photoReceived || "",
      lastIntent: "photo_statement",
      ai_reply: "Tabii efendim 😊 Fotoğrafınızı buradan gönderebilirsiniz."
    });
  }

  if (isCOD(message)) {
    return buildResponse(session, {
      flowStage: "waiting_photo",
      paymentMethod: "cod",
      lastIntent: "payment",
      ai_reply: "Ödeme tercihinizi not aldım efendim 😊 Siparişe devam edebilmemiz için önce fotoğrafınızı göndermeniz gerekiyor."
    });
  }

  if (isEFT(message)) {
    return buildResponse(session, {
      flowStage: "waiting_photo",
      paymentMethod: "eft",
      lastIntent: "payment",
      ai_reply: "Ödeme tercihinizi not aldım efendim 😊 Siparişe devam edebilmemiz için önce fotoğrafınızı göndermeniz gerekiyor."
    });
  }

  if (looksLikeAddress(message)) {
    return buildResponse(session, {
      flowStage: "waiting_photo",
      addressStatus: "1",
      lastIntent: "address",
      ai_reply: "Adresinizi not aldım efendim 😊 Siparişe devam edebilmemiz için önce fotoğrafınızı göndermeniz gerekiyor."
    });
  }

  return buildResponse(session, {
    flowStage: "waiting_photo",
    lastIntent: "general",
    ai_reply: "Resimli lazer kolye için fotoğrafınızı buradan gönderebilirsiniz efendim 😊"
  });
}

function handleWaitingLetters(session, message) {
  const switchTo = detectProductSwitch(message, session.currentProduct);
  if (switchTo) return switchProduct(session, switchTo);

  if (looksLikeLetters(message)) {
    return buildResponse(session, {
      flowStage: "waiting_payment",
      lastIntent: "letters",
      ai_reply: "Harflerinizi aldım efendim 😊 Ödeme yöntemi olarak EFT / havale mi, kapıda ödeme mi tercih edersiniz?"
    });
  }

  if (isCOD(message)) {
    return buildResponse(session, {
      flowStage: "waiting_letters",
      paymentMethod: "cod",
      lastIntent: "payment",
      ai_reply: "Ödeme tercihinizi not aldım efendim 😊 Önce istediğiniz harfleri yazar mısınız?"
    });
  }

  if (isEFT(message)) {
    return buildResponse(session, {
      flowStage: "waiting_letters",
      paymentMethod: "eft",
      lastIntent: "payment",
      ai_reply: "Ödeme tercihinizi not aldım efendim 😊 Önce istediğiniz harfleri yazar mısınız?"
    });
  }

  if (looksLikeAddress(message)) {
    return buildResponse(session, {
      flowStage: "waiting_letters",
      addressStatus: "1",
      lastIntent: "address",
      ai_reply: "Adresinizi not aldım efendim 😊 Önce istediğiniz harfleri yazar mısınız?"
    });
  }

  return buildResponse(session, {
    flowStage: "waiting_letters",
    lastIntent: "general",
    ai_reply: "Harfli ataç kolye için istediğiniz harfleri yazabilirsiniz efendim 😊"
  });
}

function handleWaitingPayment(session, message) {
  const switchTo = detectProductSwitch(message, session.currentProduct);
  if (switchTo) return switchProduct(session, switchTo);

  if (isCOD(message)) {
    return buildResponse(session, {
      flowStage: "waiting_address",
      paymentMethod: "cod",
      lastIntent: "payment",
      ai_reply:
        "Kapıda ödeme seçeneğini not aldım efendim 😊\nAd soyad, cep telefonu ve açık adresinizi tek mesajda yazabilirsiniz."
    });
  }

  if (isEFT(message)) {
    return buildResponse(session, {
      flowStage: "waiting_address",
      paymentMethod: "eft",
      lastIntent: "payment",
      ai_reply:
        "EFT / havale seçeneğini not aldım efendim 😊\nAd soyad, cep telefonu ve açık adresinizi tek mesajda yazabilirsiniz."
    });
  }

  if (looksLikeAddress(message)) {
    return buildResponse(session, {
      flowStage: "waiting_payment",
      addressStatus: "1",
      lastIntent: "address",
      ai_reply: "Adresinizi not aldım efendim 😊 Siparişi tamamlayabilmemiz için ödeme yönteminizi de yazar mısınız? EFT / havale veya kapıda ödeme"
    });
  }

  return buildResponse(session, {
    flowStage: "waiting_payment",
    lastIntent: "general",
    ai_reply: "Ödeme yöntemi olarak EFT / havale mi, kapıda ödeme mi tercih edersiniz efendim 😊"
  });
}

function handleWaitingAddress(session, message) {
  const switchTo = detectProductSwitch(message, session.currentProduct);
  if (switchTo) return switchProduct(session, switchTo);

  if (looksLikeAddress(message)) {
    return buildResponse(session, {
      flowStage: "order_completed",
      orderStatus: "completed",
      addressStatus: "1",
      siparisAlindi: "1",
      lastIntent: "address",
      ai_reply: "Siparişinizi aldım efendim 😊 En kısa sürede işlem başlatılacaktır."
    });
  }

  return buildResponse(session, {
    flowStage: "waiting_address",
    lastIntent: "general",
    ai_reply:
      "Siparişi tamamlayabilmemiz için ad soyad, cep telefonu ve açık adresinizi tek mesajda yazabilir misiniz efendim 😊"
  });
}

function handleCompleted(session, message) {
  if (detectLaserIntent(message)) return startLaserFlow(session);
  if (detectAtacIntent(message)) return startAtacFlow(session);

  return buildResponse(session, {
    flowStage: "order_completed",
    orderStatus: "completed",
    siparisAlindi: session.siparisAlindi || "1",
    lastIntent: detectGreeting(message) ? "greeting" : "general",
    ai_reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊"
  });
}

function routeConversation(session, message) {
  const switchTo = detectProductSwitch(message, session.currentProduct);
  if (switchTo) return switchProduct(session, switchTo);

  const stage = session.flowStage || "idle";

  if (!session.currentProduct || stage === "idle" || stage === "waiting_product") {
    if (!session.currentProduct || stage === "idle" || stage === "waiting_product") {
      if (
        stage === "idle" ||
        stage === "waiting_product" ||
        !session.currentProduct
      ) {
        if (!session.currentProduct && (stage === "idle" || stage === "waiting_product")) {
          return handleIdleOrWaitingProduct(session, message);
        }
      }
    }
  }

  switch (stage) {
    case "waiting_photo":
      return handleWaitingPhoto(session, message);

    case "waiting_letters":
      return handleWaitingLetters(session, message);

    case "waiting_payment":
      return handleWaitingPayment(session, message);

    case "waiting_address":
      return handleWaitingAddress(session, message);

    case "order_completed":
    case "completed":
      return handleCompleted(session, message);

    case "idle":
    case "waiting_product":
    default:
      return handleIdleOrWaitingProduct(session, message);
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(200).json({
        success: false,
        ai_reply: "Method not allowed"
      });
    }

    const body = req.body || {};
    const message = cleanValue(body.message || body.last_user_message || "");
    const session = getSession(body);

    // Knowledge dosyalarını warm etmek için okuyalım ama routing’i knowledge belirlemesin
    try {
      readKnowledgeFile("SYSTEM_MASTER.txt");
      readKnowledgeFile("CORE_SYSTEM.txt");
      readKnowledgeFile("ROUTING_RULES.txt");
      readKnowledgeFile("ORDER_FLOW.txt");
      readKnowledgeFile("PRODUCT_LASER.txt");
      readKnowledgeFile("PRODUCT_ATAC.txt");
      readKnowledgeFile("PRICING.txt");
      readKnowledgeFile("PAYMENT.txt");
      readKnowledgeFile("SHIPPING.txt");
      readKnowledgeFile("TRUST.txt");
      readKnowledgeFile("SMALLTALK.txt");
      readKnowledgeFile("EDGE_CASES.txt");
      readKnowledgeFile("FEW_SHOT_EXAMPLES.txt");
      readKnowledgeFile("IMAGE_RULES.txt");
    } catch (e) {
      // knowledge okunamazsa routing yine çalışsın
      console.error("Knowledge read warning:", e?.message || e);
    }

    const response = routeConversation(session, message);
    return res.status(200).json(response);
  } catch (error) {
    console.error("chat.js error:", error);

    return res.status(200).json({
      success: true,
      ai_reply: "Ekibimize iletiyorum, en kısa sürede dönüş yapılacaktır 😊",
      ilgilenilen_urun: "",
      user_product: "",
      last_intent: "general",
      conversation_stage: "",
      flow_stage: "",
      order_status: "",
      photo_received: "",
      payment_method: "",
      menu_gosterildi: "",
      back_text_status: "",
      address_status: "",
      support_mode: "",
      siparis_alindi: "",
      cancel_reason: "",
      context_lock: ""
    });
  }
}
