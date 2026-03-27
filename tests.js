console.log("TEST BASLADI 🔥");

import { processChat } from "./api/chat.js";

// Basit yardımcı fonksiyon
function createState(overrides = {}) {
  return {
    ilgilenilen_urun: "",
    conversation_stage: "",
    payment_method: "",
    address_status: "",
    phone_received: "",
    order_status: "",
    ...overrides,
  };
}

// Test senaryoları
const tests = [
  {
    id: "T1",
    name: "Lazer ürün seçimi",
    input: { message: "Resimli lazer kolye" },
    state: createState(),
    expect: {
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_photo",
    },
  },
  {
    id: "T2",
    name: "Ataç ürün seçimi",
    input: { message: "ataç kolye" },
    state: createState(),
    expect: {
      ilgilenilen_urun: "atac",
      conversation_stage: "waiting_letters",
    },
  },
  {
    id: "T3",
    name: "Foto sonrası back_text",
    input: { message: "foto attım" },
    state: createState({
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_photo",
    }),
    expect: {
      conversation_stage: "waiting_back_text",
    },
  },
  {
    id: "T4",
    name: "Back text skip",
    input: { message: "yok" },
    state: createState({
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_back_text",
    }),
    expect: {
      conversation_stage: "waiting_payment",
    },
  },
  {
    id: "T5",
    name: "EFT seçimi",
    input: { message: "eft olsun" },
    state: createState({
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_payment",
    }),
    expect: {
      payment_method: "eft",
      conversation_stage: "waiting_address",
    },
  },
  {
    id: "T6",
    name: "Tek mesajda adres + telefon",
    input: {
      message:
        "Cihan Nakipoğlu 05321234567 İstanbul Beykoz Kavacık Mahallesi",
    },
    state: createState({
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_address",
      payment_method: "eft",
    }),
    expect: {
      conversation_stage: "completed",
    },
  },
  {
    id: "T7",
    name: "Back photo price",
    input: { message: "arkasına foto koyarsak ücret var mı" },
    state: createState({
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_back_text",
    }),
    expect: {
      // stage değişmemeli
      conversation_stage: "waiting_back_text",
    },
  },
  {
    id: "T8",
    name: "Kargo ücreti sorusu",
    input: { message: "kargo ücreti var mı" },
    state: createState(),
    expect: {
      // state bozulmamalı
      conversation_stage: "",
    },
  },
];

// TEST ÇALIŞTIR
let failed = false;

for (const test of tests) {
  try {
    const result = processChat({
      message: test.input.message,
      state: test.state,
    });

    let localFail = false;

    if (
      test.expect.ilgilenilen_urun &&
      result.ilgilenilen_urun !== test.expect.ilgilenilen_urun
    ) {
      console.log(
        `❌ ${test.id} (${test.name}) - URUN HATA`,
        result.ilgilenilen_urun
      );
      localFail = true;
    }

    if (
      test.expect.conversation_stage &&
      result.conversation_stage !== test.expect.conversation_stage
    ) {
      console.log(
        `❌ ${test.id} (${test.name}) - STAGE HATA`,
        result.conversation_stage
      );
      localFail = true;
    }

    if (
      test.expect.payment_method &&
      result.payment_method !== test.expect.payment_method
    ) {
      console.log(
        `❌ ${test.id} (${test.name}) - PAYMENT HATA`,
        result.payment_method
      );
      localFail = true;
    }

    if (!localFail) {
      console.log(`✅ ${test.id} (${test.name})`);
    } else {
      failed = true;
    }
  } catch (err) {
    console.log(`❌ ${test.id} CRASH`, err.message);
    failed = true;
  }
}

// SONUÇ
if (failed) {
  console.log("TEST FAIL ❌");
  process.exit(1);
} else {
  console.log("TEST PASS ✅");
}
