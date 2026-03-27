// ==========================
// HELPER
// ==========================

function body(message, extra = {}) {
  return {
    message,
    ilgilenilen_urun: "",
    user_product: "",
    last_intent: "",
    conversation_stage: "",
    photo_received: "",
    payment_method: "",
    menu_gosterildi: "",
    order_status: "",
    back_text_status: "",
    address_status: "",
    support_mode: "",
    siparis_alindi: "",
    cancel_reason: "",
    context_lock: "1",
    ...extra
  };
}

// ==========================
// TEST LIST
// ==========================

const tests = [

  // ======================
  // CORE (örnek birkaç)
  // ======================

  {
    id: "T01",
    name: "Lazer seçimi",
    input: body("resimli kolye"),
    expect: { conversation_stage: "waiting_photo" }
  },

  {
    id: "T02",
    name: "Ataç seçimi",
    input: body("ataç kolye"),
    expect: { conversation_stage: "waiting_letters" }
  },

  {
    id: "T03",
    name: "Foto URL algılama",
    input: body("https://lookaside.fbsbx.com/photo.jpg", {
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_photo"
    }),
    expect: { photo_received: "1" }
  },

  // ======================
  // PARSE
  // ======================

  {
    id: "P01",
    name: "Telefon 05",
    input: body("05551234567"),
    expect: { phone_received: "1" }
  },

  {
    id: "P02",
    name: "Telefon +90",
    input: body("+905551234567"),
    expect: { phone_received: "1" }
  },

  {
    id: "P03",
    name: "Adres",
    input: body("İstanbul Kadıköy moda sokak no 5"),
    expect: { address_status: "address_only" }
  },

  {
    id: "P04",
    name: "Adres + telefon",
    input: body("Ahmet 05551234567 İstanbul Kadıköy moda sokak no 5"),
    expect: { address_status: "received", phone_received: "1" }
  },

  // ======================
  // STATE
  // ======================

  {
    id: "S01",
    name: "Lazer → foto bekliyor",
    input: body("resimli kolye"),
    expect: { conversation_stage: "waiting_photo" }
  },

  {
    id: "S02",
    name: "Ataç → harf bekliyor",
    input: body("ataç"),
    expect: { conversation_stage: "waiting_letters" }
  },

  // ======================
  // VARIATION
  // ======================

  {
    id: "V01",
    name: "Foto kolye varyasyon",
    input: body("foto kolye"),
    expect: { ilgilenilen_urun: "lazer" }
  },

  {
    id: "V02",
    name: "Harf kolye varyasyon",
    input: body("3 harf kolye"),
    expect: { ilgilenilen_urun: "atac" }
  },

  // ======================
  // MODEL SAFETY (EN KRİTİK)
  // ======================

  {
    id: "MS01",
    name: "Konum deterministic",
    input: body("neredesiniz"),
    expectReplyIncludes: "eminonu",
    expectReplyNotIncludes: "ekibimize iletiyorum"
  },

  {
    id: "MS02",
    name: "Kargo deterministic",
    input: body("kargo ne zaman gelir"),
    expectReplyIncludes: "is gunu",
    expectReplyNotIncludes: "ekibimize iletiyorum"
  },

  {
    id: "MS03",
    name: "Fiyat fallback olmamalı",
    input: body("fiyat nedir"),
    expectReplyIncludes: "tl",
    expectReplyNotIncludes: "ekibimize iletiyorum"
  },

  {
    id: "MS04",
    name: "Ataç fiyat fallback olmamalı",
    input: body("ataç kolye fiyat"),
    expectReplyIncludes: "tl",
    expectReplyNotIncludes: "ekibimize iletiyorum"
  },

  {
    id: "MS05",
    name: "Kargo ücreti deterministic",
    input: body("kargo ücreti var mı"),
    expectReplyIncludes: "dahil",
    expectReplyNotIncludes: "ekibimize iletiyorum"
  },

  {
    id: "MS06",
    name: "Güven deterministic",
    input: body("dolandırıcı mısınız"),
    expectReplyIncludes: "guven",
    expectReplyNotIncludes: "ekibimize iletiyorum"
  },

  {
    id: "MS07",
    name: "Foto URL fallbacke düşmemeli",
    input: body("https://lookaside.fbsbx.com/photo123.jpg", {
      ilgilenilen_urun: "lazer",
      conversation_stage: "waiting_photo"
    }),
    expect: {
      photo_received: "1",
      conversation_stage: "waiting_back_text"
    },
    expectReplyNotIncludes: "ekibimize iletiyorum"
  },

  {
    id: "MS08",
    name: "Alakasız fallback",
    input: body("uzaylı kolye yapıyor musunuz"),
    expectReplyIncludes: "ekibimize iletiyorum"
  },

  {
    id: "MS09",
    name: "Saçma soru fallback",
    input: body("bitcoin ne olur"),
    expectReplyIncludes: "ekibimize iletiyorum"
  }

];

// ==========================
// TEST RUNNER
// ==========================

async function runTest(test) {
  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(test.input)
  });

  const data = await res.json();

  if (test.expect) {
    for (let key in test.expect) {
      if (data[key] !== test.expect[key]) {
        throw new Error(`${test.id} FAIL → ${key}`);
      }
    }
  }

  if (test.expectReplyIncludes) {
    if (!data.ai_reply.toLowerCase().includes(test.expectReplyIncludes)) {
      throw new Error(`${test.id} FAIL → include`);
    }
  }

  if (test.expectReplyNotIncludes) {
    if (data.ai_reply.toLowerCase().includes(test.expectReplyNotIncludes)) {
      throw new Error(`${test.id} FAIL → not include`);
    }
  }

  console.log("✅", test.id);
}

// ==========================
// RUN ALL
// ==========================

(async () => {
  console.log("🔥 TEST BAŞLADI");

  for (const t of tests) {
    await runTest(t);
  }

  console.log("🎯 ALL TESTS PASSED");
})();
