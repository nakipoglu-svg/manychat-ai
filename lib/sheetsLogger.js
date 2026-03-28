import { redactText } from "./redact.js";

const LOG_WEBHOOK_URL = process.env.GOOGLE_LOG_WEBHOOK_URL || "";
const LOG_SECRET = process.env.GOOGLE_LOG_SECRET || "";

function buildConversationId(body = {}, result = {}) {
  return (
    body.conversation_id ||
    body.subscriber_id ||
    body.contact_id ||
    body.user_id ||
    body.ig_user_id ||
    result.conversation_id ||
    ""
  );
}

function buildMessageId(body = {}) {
  return (
    body.message_id ||
    body.last_message_id ||
    body.instagram_message_id ||
    `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
}

function shouldSkipLogging(body = {}, options = {}) {
  if (options?.disableLogging) return true;
  if (options?.skipKnowledgeCheck) return true;

  const msg = String(
    body.message || body.last_input_text || body.last_user_message || ""
  ).trim();

  if (!msg) return true;

  return false;
}

export async function logConversationRow({ body = {}, result = {}, options = {} }) {
  if (shouldSkipLogging(body, options)) return;
  if (!LOG_WEBHOOK_URL || !LOG_SECRET) return;

  const payload = {
    secret: LOG_SECRET,
    conversation_id: buildConversationId(body, result),
    message_id: buildMessageId(body),
    customer_message: redactText(
      body.message || body.last_input_text || body.last_user_message || ""
    ),
    assistant_reply: redactText(result.ai_reply || ""),
    response_source: "bot",
    detected_intent: result.last_intent || "",
    conversation_stage: result.conversation_stage || "",
    reply_class: result.reply_class || "",
    support_mode: result.support_mode || "",
    support_mode_reason: result.support_mode_reason || "",
    ilgilenilen_urun: result.ilgilenilen_urun || "",
    payment_method: result.payment_method || "",
    photo_received: result.photo_received || "",
    back_text_status: result.back_text_status || "",
    address_status: result.address_status || "",
    letters_received: result.letters_received || "",
    order_status: result.order_status || "",
    hata: "",
    correct_reply: "",
    fix_layer: "",
    notes: ""
  };

  try {
    await fetch(LOG_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Sheets logging error:", error.message || error);
  }
}
