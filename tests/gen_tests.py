# Bu script, tests.js'in tüm test array'ini ve runner'ını oluşturur
# Test array'i document 4'ten birebir kopyalanmıştır

header = '''// tests.js — chat_v2 master test suite (750+ test)
// Import: yeni engine
import { processChat } from "../core/engine.js";

console.log("🔥 TEST BAŞLADI (750+ test)");

function body(message, state = {}) {
  return {
    message,
    ilgilenilen_urun: state.ilgilenilen_urun || "",
    user_product: state.user_product || state.ilgilenilen_urun || "",
    conversation_stage: state.conversation_stage || "",
    payment_method: state.payment_method || "",
    address_status: state.address_status || "",
    phone_received: state.phone_received || "",
    order_status: state.order_status || "",
    photo_received: state.photo_received || "",
    back_text_status: state.back_text_status || "",
    menu_gosterildi: state.menu_gosterildi || "",
    context_lock: state.context_lock || "",
    letters_received: state.letters_received || "",
    support_mode: state.support_mode || "",
    siparis_alindi: state.siparis_alindi || "",
    cancel_reason: state.cancel_reason || "",
  };
}

function lazer(o = {}) { return { ilgilenilen_urun: "lazer", user_product: "lazer", context_lock: "1", order_status: "started", ...o }; }
function atac(o = {}) { return { ilgilenilen_urun: "atac", user_product: "atac", context_lock: "1", order_status: "started", ...o }; }
function lazerWaitingPayment(o = {}) { return lazer({ photo_received: "1", back_text_status: "skipped", conversation_stage: "waiting_payment", ...o }); }
function lazerWaitingAddress(o = {}) { return lazer({ photo_received: "1", back_text_status: "skipped", payment_method: "eft_havale", conversation_stage: "waiting_address", ...o }); }
function atacWaitingPayment(o = {}) { return atac({ letters_received: "1", conversation_stage: "waiting_payment", ...o }); }
function atacWaitingAddress(o = {}) { return atac({ letters_received: "1", payment_method: "eft_havale", conversation_stage: "waiting_address", ...o }); }
function lazerCompleted(o = {}) { return lazer({ photo_received: "1", back_text_status: "skipped", payment_method: "eft_havale", address_status: "received", phone_received: "1", conversation_stage: "order_completed", order_status: "completed", siparis_alindi: "1", ...o }); }
function atacCompleted(o = {}) { return atac({ letters_received: "1", payment_method: "eft_havale", address_status: "received", phone_received: "1", conversation_stage: "order_completed", order_status: "completed", siparis_alindi: "1", ...o }); }

function normalizeForTest(text = "") {
  return String(text).toLowerCase().replace(/i̇/g, "i").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/[^\\w\\s]/g, " ").replace(/\\s+/g, " ").trim();
}
'''

print(header)
print("// Test array will be appended by the main file")
