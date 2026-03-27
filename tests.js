console.log("TEST BASLADI 🔥");

import { processChat } from "./api/chat.js";

const tests = [
  {
    id: "T1",
    name: "Lazer ürün seçimi",
    input: { message: "Resimli lazer kolye" },
    expect: {
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_photo",
    },
  },
  {
    id: "T2",
    name: "Ataç ürün seçimi",
    input: { message: "Ataç kolye" },
    expect: {
      ilgilenilen_urun: "atac",
      conversation_stage: "waiting_letters",
    },
  },
  {
    id: "T3",
    name: "Lazer foto sonrası back stage",
    input: {
      message: "https://cdn.instagram.com/test.jpg",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      conversation_stage: "waiting_photo",
    },
    expect: {
      photo_received: "1",
      conversation_stage: "waiting_back_text",
    },
  },
  {
    id: "T4",
    name: "Back text skip",
    input: {
      message: "yok",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      conversation_stage: "waiting_back_text",
    },
    expect: {
      back_text_status: "skipped",
      conversation_stage: "waiting_payment",
    },
  },
  {
    id: "T5",
    name: "Back text info soru stage bozmasın",
    input: {
      message: "Arkasına yazı oluyor mu",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      conversation_stage: "waiting_back_text",
    },
    expect: {
      back_text_status: "",
      conversation_stage: "waiting_back_text",
    },
  },
  {
    id: "T6",
    name: "Back photo price soru stage bozmasın",
    input: {
      message: "Arka tarafına fotoğraf koymak istesek ne kadar olacak",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      conversation_stage: "waiting_back_text",
    },
    expect: {
      back_text_status: "",
      conversation_stage: "waiting_back_text",
    },
  },
  {
    id: "T7",
    name: "Kargo ücreti fiyat sorusu değil",
    input: {
      message: "Kargo ücreti ne kadar",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      conversation_stage: "waiting_back_text",
    },
    expectReplyIncludes: "Kargo ücreti fiyata dahildir",
    expect: {
      conversation_stage: "waiting_back_text",
    },
  },
  {
    id: "T8",
    name: "Trust sorusu stage bozmasın",
    input: {
      message: "Kararma yapar mı",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      conversation_stage: "waiting_back_text",
    },
    expectReplyIncludes: "Kararma",
    expect: {
      conversation_stage: "waiting_back_text",
    },
  },
  {
    id: "T9",
    name: "Ataç harf al",
    input: {
      message: "ABC",
      ilgilenilen_urun: "atac",
      user_product: "atac",
      conversation_stage: "waiting_letters",
    },
    expect: {
      letters_received: "1",
      conversation_stage: "waiting_payment",
    },
  },
  {
    id: "T10",
    name: "Ataç soru harf sanılmasın",
    input: {
      message: "Kaç tane seçeceğiz",
      ilgilenilen_urun: "atac",
      user_product: "atac",
      conversation_stage: "waiting_letters",
    },
    expect: {
      letters_received: "",
      conversation_stage: "waiting_letters",
    },
  },
  {
    id: "T11",
    name: "EFT seçimi",
    input: {
      message: "EFT olsun",
      ilgilenilen_urun: "atac",
      user_product: "atac",
      letters_received: "1",
      conversation_stage: "waiting_payment",
    },
    expect: {
      payment_method: "eft_havale",
      conversation_stage: "waiting_address",
    },
  },
  {
    id: "T12",
    name: "Kapıda ödeme seçimi",
    input: {
      message: "Kapıda ödeme olsun",
      ilgilenilen_urun: "atac",
      user_product: "atac",
      letters_received: "1",
      conversation_stage: "waiting_payment",
    },
    expect: {
      payment_method: "kapida_odeme",
      conversation_stage: "waiting_address",
    },
  },
  {
    id: "T13",
    name: "Sadece isim",
    input: {
      message: "Cihan Nakipoğlu",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      back_text_status: "skipped",
      payment_method: "eft_havale",
      conversation_stage: "waiting_address",
    },
    expect: {
      conversation_stage: "waiting_address",
    },
  },
  {
    id: "T14",
    name: "Sadece telefon",
    input: {
      message: "05321234567",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      back_text_status: "skipped",
      payment_method: "eft_havale",
      conversation_stage: "waiting_address",
    },
    expect: {
      phone_received: "1",
      conversation_stage: "waiting_address",
    },
  },
  {
    id: "T15",
    name: "Sadece adres",
    input: {
      message: "İstanbul Beykoz Kavacık Mahallesi Fatih Sokak No 12",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      back_text_status: "skipped",
      payment_method: "eft_havale",
      conversation_stage: "waiting_address",
    },
    expect: {
      address_status: "address_only",
      conversation_stage: "waiting_address",
    },
  },
  {
    id: "T16",
    name: "Tek mesajda isim telefon adres",
    input: {
      message: "Cihan Nakipoğlu 05321234567 İstanbul Beykoz Kavacık Mahallesi Fatih Sokak No 12",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      back_text_status: "skipped",
      payment_method: "eft_havale",
      conversation_stage: "waiting_address",
    },
    expect: {
      address_status: "received",
      phone_received: "1",
      conversation_stage: "order_completed",
      order_status: "completed",
    },
  },
  {
    id: "T17",
    name: "Completed sonrası yeni foto normal akışa dönmesin",
    input: {
      message: "https://cdn.instagram.com/newphoto.jpg",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      back_text_status: "skipped",
      payment_method: "eft_havale",
      address_status: "received",
      order_status: "completed",
      conversation_stage: "order_completed",
    },
    expectReplyIncludes: "fotoğraf değişikliği",
    expect: {
      conversation_stage: "order_completed",
    },
  },
  {
    id: "T18",
    name: "waiting_back_text içinde istemiyorum iptal sayılmasın",
    input: {
      message: "istemiyorum",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      conversation_stage: "waiting_back_text",
    },
    expect: {
      back_text_status: "skipped",
      order_status: "started",
      conversation_stage: "waiting_payment",
    },
  },
  {
    id: "T19",
    name: "Gerçek iptal",
    input: {
      message: "Siparişi iptal etmek istiyorum",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      conversation_stage: "waiting_payment",
    },
    expect: {
      order_status: "cancel_requested",
      conversation_stage: "human_support",
    },
  },
  {
    id: "T20",
    name: "Ürün switch lazer -> atac",
    input: {
      message: "Yok ben ataç alayım",
      ilgilenilen_urun: "lazer",
      user_product: "lazer",
      photo_received: "1",
      conversation_stage: "waiting_back_text",
    },
    expect: {
      ilgilenilen_urun: "atac",
      conversation_stage: "waiting_letters",
    },
  },
  {
    id: "T21",
    name: "Ürün switch atac -> lazer",
    input: {
      message: "Resimli olanı alayım",
      ilgilenilen_urun: "atac",
      user_product: "atac",
      letters_received: "1",
      conversation_stage: "waiting_payment",
    },
    expect: {
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_photo",
      letters_received: "",
    },
  },
];

function checkExpected(result, expect) {
  const failures = [];

  for (const [key, value] of Object.entries(expect || {})) {
    if (result[key] !== value) {
      failures.push(`${key}: expected=${JSON.stringify(value)} actual=${JSON.stringify(result[key])}`);
    }
  }

  return failures;
}

async function run() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await processChat(test.input, { skipKnowledgeCheck: true });

      const fieldFailures = checkExpected(result, test.expect);
      const replyFailures = [];

      if (test.expectReplyIncludes && !String(result.ai_reply || "").includes(test.expectReplyIncludes)) {
        replyFailures.push(`reply missing text: ${test.expectReplyIncludes}`);
      }

      const failures = [...fieldFailures, ...replyFailures];

      if (failures.length === 0) {
        passed += 1;
        console.log(`✅ ${test.id} - ${test.name}`);
      } else {
        failed += 1;
        console.log(`❌ ${test.id} - ${test.name}`);
        for (const f of failures) {
          console.log(`   ${f}`);
        }
        console.log(`   reply=${JSON.stringify(result.ai_reply)}`);
      }
    } catch (error) {
      failed += 1;
      console.log(`❌ ${test.id} - ${test.name}`);
      console.log(`   error=${error.message}`);
    }
  }

  console.log("\n-------------------------");
  console.log(`Toplam: ${tests.length}`);
  console.log(`Geçen: ${passed}`);
  console.log(`Kalan: ${failed}`);
  console.log("-------------------------\n");

  if (failed > 0) {
    process.exitCode = 1;
  }
}

run();
console.log("TEST BITTI ✅");
