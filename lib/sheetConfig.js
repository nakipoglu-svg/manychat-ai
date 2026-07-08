export const SHEET_CONFIG = {
  spreadsheetId: process.env.GOOGLE_SHEET_ID,
  sheetName: process.env.GOOGLE_SHEET_NAME || "logs",
};

export const SHEET_HEADERS = [
  "timestamp",
  "conversation_id",
  "message_id",
  "customer_message",
  "assistant_reply",
  "response_source",
  "detected_intent",
  "conversation_stage",
  "reply_class",
  "support_mode",
  "support_mode_reason",
  "ilgilenilen_urun",
  "payment_method",
  "photo_received",
  "back_text_status",
  "address_status",
  "letters_received",
  "order_status",
  "hata",
  "correct_reply",
  "fix_layer",
  "notes",
];

export function buildSheetRow(data = {}) {
  return [
    new Date().toISOString(),
    data.conversation_id || "",
    data.message_id || "",
    data.customer_message || "",
    data.assistant_reply || "",
    data.response_source || "bot",
    data.detected_intent || "",
    data.conversation_stage || "",
    data.reply_class || "",
    data.support_mode || "",
    data.support_mode_reason || "",
    data.ilgilenilen_urun || "",
    data.payment_method || "",
    data.photo_received || "",
    data.back_text_status || "",
    data.address_status || "",
    data.letters_received || "",
    data.order_status || "",
    "", // hata (manuel doldurulacak)
    "", // correct_reply
    "", // fix_layer
    "", // notes
  ];
}
