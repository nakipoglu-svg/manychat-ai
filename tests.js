import { processChat } from "./api/chat.js";

console.log("🔥 TEST BAŞLADI");

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

const tests = [
  {
    id: "T1",
    name: "Lazer ürün seçimi",
    input: body("resimli lazer kolye"),
    expect: {
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_photo",
    },
  },
  {
    id: "T2",
    name: "Ataç ürün seçimi",
    input: body("ataç kolye"),
    expect: {
      ilgilenilen_urun: "atac",
      conversation_stage: "waiting_letters",
    },
  },
  {
    id: "T3",
    name: "Lazer seçimi foto bekletmeli",
    input: body("lazer istiyorum"),
    expect: {
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_photo",
    },
  },
  {
    id: "T4",
    name: "Ataç seçimi harf bekletmeli",
    input: body("harfli ataç kolye"),
    expect: {
      ilgilenilen_urun: "atac",
      conversation_stage: "waiting_letters",
    },
  },
  {
    id: "T5",
    name: "Ataç harf girdisi ödeme aşamasına geçmeli",
    input: body("ABC", {
      ilgilenilen_urun: "atac",
      user_product: "atac",
      conversation_stage: "waiting_letters",
    }),
    expect: {
      letters_received: "1",
      conversation_stage: "waiting_payment",
    },
  },
  {
    id: "T6",
    name: "EFT seçimi",
    input: body("eft", {
      ilgilenilen_urun: "atac",
      user_product: "atac",
      letters_received: "1",
      conversation_stage: "waiting_payment",
    }),
    expect: {
      payment_method: "eft_havale",
      conversation_stage: "waiting_address",
    },
  },
  {
    id: "T7",
    name: "Kapıda ödeme seçimi",
    input: body("kapıda ödeme", {
      ilgilenilen_urun: "atac",
      user_product: "atac",
      letters_received: "1",
      conversation_stage: "waiting_payment",
    }),
    expect: {
      payment_method: "kapida_odeme",
      conversation_stage: "waiting_address",
    },
  },
  {
    id: "T8",
    name: "Tek mesajda isim telefon adres",
    input: body("Ali 05551234567 İstanbul Kadıköy Moda", {
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      back_text_status: "skipped",
      payment_method: "eft_havale",
      conversation_stage: "waiting_address",
    }),
    expect: {
      address_status: "received",
      phone_received: "1",
      conversation_stage: "order_completed",
      order_status: "completed",
    },
  },
  {
    id: "T9",
    name: "Adres alınmışken bozulmamalı",
    input: body("tamam", {
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      address_status: "received",
      phone_received: "1",
      payment_method: "eft_havale",
      photo_received: "1",
      back_text_status: "skipped",
      conversation_stage: "order_completed",
      order_status: "completed",
    }),
    expect: {
      address_status: "received",
      conversation_stage: "order_completed",
    },
  },
  {
    id: "T10",
    name: "Sipariş iptal",
    input: body("iptal etmek istiyorum", {
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      conversation_stage: "waiting_payment",
    }),
    expect: {
      order_status: "cancel_requested",
      conversation_stage: "human_support",
    },
  },
  {
    id: "T11",
    name: "Arka yazı istemiyorum iptal sayılmamalı",
    input: body("istemiyorum", {
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      conversation_stage: "waiting_back_text",
    }),
    expect: {
      back_text_status: "skipped",
      conversation_stage: "waiting_payment",
    },
  },
  {
    id: "T12",
    name: "Kargo süresi sorusu",
    input: body("kargo ne zaman gelir"),
    expectReplyIncludes: "iş günü",
  },
  {
    id: "T13",
    name: "Güven sorusu",
    input: body("güvenilir misiniz"),
    expectReplyIncludes: "güven",
  },
  {
    id: "T14",
    name: "Konum sorusu",
    input: body("neredesiniz"),
    expectReplyIncludes: "istanbul",
  },
  {
    id: "T15",
    name: "Merhaba",
    input: body("merhaba"),
    expectReplyIncludes: "merhaba",
  },
];

async function runTests() {
  let passed = 0;

  for (const test of tests) {
    try {
      const res = await processChat(test.input, { skipKnowledgeCheck: true });

      let ok = true;

      if (test.expect) {
        for (const key of Object.keys(test.expect)) {
          if (res[key] !== test.expect[key]) {
            ok = false;
          }
        }
      }

      if (test.expectReplyIncludes) {
        const reply = String(res.ai_reply || "").toLowerCase();
        if (!reply.includes(test.expectReplyIncludes.toLowerCase())) {
          ok = false;
        }
      }

      if (ok) {
        console.log(`✅ ${test.id} - ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.id} - ${test.name}`);
        if (test.expect) console.log("Beklenen:", test.expect);
        if (test.expectReplyIncludes) console.log("Beklenen reply içinde:", test.expectReplyIncludes);
        console.log("Gelen:", res);
      }
    } catch (err) {
      console.log(`💥 ${test.id} - ${test.name}`);
      console.log(err);
    }
  }

  console.log(`\n🎯 SONUÇ: ${passed}/${tests.length} geçti`);

  if (passed !== tests.length) {
    process.exit(1);
  }
}

runTests();
