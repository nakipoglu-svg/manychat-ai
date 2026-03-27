console.log("🔥 TEST BAŞLADI");

import { processChat } from "./api/chat.js";

function createState(overrides = {}) {
  return {
    ilgilenilen_urun: "",
    conversation_stage: "",
    payment_method: "",
    address_status: "",
    phone_received: "",
    order_status: "",
    context_lock: "",
    ...overrides,
  };
}

const tests = [

  // 🟢 ÜRÜN SEÇİMİ
  {
    id: "T1",
    name: "Lazer ürün seçimi",
    input: { message: "resimli lazer kolye" },
    state: createState(),
    expect: { ilgilenilen_urun: "lazer" }
  },
  {
    id: "T2",
    name: "Ataç ürün seçimi",
    input: { message: "ataç kolye" },
    state: createState(),
    expect: { ilgilenilen_urun: "atac" }
  },

  // 🟢 FOTO AKIŞI
  {
    id: "T3",
    name: "Lazer → foto istemeli",
    input: { message: "resimli lazer kolye" },
    state: createState(),
    expect: { conversation_stage: "waiting_photo" }
  },

  // 🟢 HARF AKIŞI
  {
    id: "T4",
    name: "Ataç → harf istemeli",
    input: { message: "ataç kolye" },
    state: createState(),
    expect: { conversation_stage: "waiting_letters" }
  },

  // 🟢 HARF GİRİŞİ
  {
    id: "T5",
    name: "Harf girildi",
    input: { message: "ABC" },
    state: createState({
      ilgilenilen_urun: "atac",
      conversation_stage: "waiting_letters"
    }),
    expect: { conversation_stage: "waiting_payment" }
  },

  // 🟢 ÖDEME SEÇİMİ
  {
    id: "T6",
    name: "EFT seçimi",
    input: { message: "eft" },
    state: createState({
      conversation_stage: "waiting_payment"
    }),
    expect: { payment_method: "eft" }
  },

  {
    id: "T7",
    name: "Kapıda ödeme seçimi",
    input: { message: "kapıda ödeme" },
    state: createState({
      conversation_stage: "waiting_payment"
    }),
    expect: { payment_method: "ko" }
  },

  // 🟢 ADRES ALGILAMA (EN KRİTİK)
  {
    id: "T8",
    name: "Tek mesajda adres + telefon + isim",
    input: { message: "Ali 05551234567 İstanbul Kadıköy Moda" },
    state: createState({
      conversation_stage: "waiting_address"
    }),
    expect: { address_status: "alindi" }
  },

  // 🟢 ADRES TEKRAR SORMAMALI
  {
    id: "T9",
    name: "Adres varken tekrar sormamalı",
    input: { message: "tamam" },
    state: createState({
      address_status: "alindi"
    }),
    expect: { address_status: "alindi" }
  },

  // 🟢 CANCEL
  {
    id: "T10",
    name: "Sipariş iptal",
    input: { message: "iptal etmek istiyorum" },
    state: createState(),
    expect: { order_status: "cancelled" }
  },

  // ⚠️ İSTEMİYORUM BUG TESTİ
  {
    id: "T11",
    name: "Arka yazı istemiyorum (iptal olmamalı)",
    input: { message: "arka yazı istemiyorum" },
    state: createState({
      conversation_stage: "waiting_back_text"
    }),
    expect: { conversation_stage: "waiting_payment" }
  },

  // 🟢 SHIPPING
  {
    id: "T12",
    name: "Kargo süresi sorusu",
    input: { message: "kargo ne zaman gelir" },
    state: createState(),
    expect: { reply_contains: "iş günü" }
  },

  // 🟢 TRUST
  {
    id: "T13",
    name: "Güven sorusu",
    input: { message: "güvenilir misiniz" },
    state: createState(),
    expect: { reply_contains: "güven" }
  },

  // 🟢 LOCATION
  {
    id: "T14",
    name: "Konum sorusu",
    input: { message: "neredesiniz" },
    state: createState(),
    expect: { reply_contains: "istanbul" }
  },

  // 🟢 SMALLTALK
  {
    id: "T15",
    name: "Merhaba",
    input: { message: "merhaba" },
    state: createState(),
    expect: { reply_contains: "merhaba" }
  },

];

async function runTests() {
  let passed = 0;

  for (const test of tests) {
    try {
      const res = await processChat(test.input.message, test.state);

      let ok = true;

      for (const key in test.expect) {
        if (key === "reply_contains") {
          if (!res.ai_reply?.toLowerCase().includes(test.expect[key])) {
            ok = false;
          }
        } else {
          if (res[key] !== test.expect[key]) {
            ok = false;
          }
        }
      }

      if (ok) {
        console.log(`✅ ${test.id} - ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.id} - ${test.name}`);
        console.log("Beklenen:", test.expect);
        console.log("Gelen:", res);
      }

    } catch (err) {
      console.log(`💥 ${test.id} HATA`, err.message);
    }
  }

  console.log(`\n🎯 SONUÇ: ${passed}/${tests.length} geçti`);
}

runTests();
