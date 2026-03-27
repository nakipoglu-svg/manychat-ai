import { processChat } from "./api/chat.js";

(async () => {

console.log("🔥 TEST BAŞLADI");

// yardımcı state
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

const tests = [

{ id: "T1", name: "Lazer seçimi",
input: "resimli lazer kolye",
state: createState(),
expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" }
},

{ id: "T2", name: "Ataç seçimi",
input: "ataç kolye",
state: createState(),
expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" }
},

{ id: "T3", name: "Foto sonrası back",
input: "foto attım",
state: createState({ ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" }),
expect: { conversation_stage: "waiting_back_option" }
},

{ id: "T4", name: "Back text",
input: "yazı yazdırmak istiyorum",
state: createState({ ilgilenilen_urun: "lazer", conversation_stage: "waiting_back_option" }),
expect: { conversation_stage: "waiting_back_text" }
},

{ id: "T5", name: "Back photo",
input: "arkasına fotoğraf istiyorum",
state: createState({ ilgilenilen_urun: "lazer", conversation_stage: "waiting_back_option" }),
expect: { conversation_stage: "waiting_back_photo" }
},

{ id: "T6", name: "Back skip",
input: "istemiyorum",
state: createState({ ilgilenilen_urun: "lazer", conversation_stage: "waiting_back_option" }),
expect: { conversation_stage: "waiting_payment" }
},

{ id: "T7", name: "EFT seçimi",
input: "eft",
state: createState({ conversation_stage: "waiting_payment" }),
expect: { payment_method: "eft", conversation_stage: "waiting_address" }
},

{ id: "T8", name: "Kapıda ödeme",
input: "kapıda ödeme",
state: createState({ conversation_stage: "waiting_payment" }),
expect: { payment_method: "cod", conversation_stage: "waiting_address" }
},

{ id: "T9", name: "Adres",
input: "istanbul kadıköy moda sokak no 5",
state: createState({ conversation_stage: "waiting_address" }),
expect: { address_status: "alindi", conversation_stage: "waiting_phone" }
},

{ id: "T10", name: "Telefon",
input: "05554443322",
state: createState({ conversation_stage: "waiting_phone" }),
expect: { phone_received: "1", conversation_stage: "order_completed" }
},

{ id: "T11", name: "Foto sorusu sapmasın",
input: "olur mu bu fotoğraf",
state: createState({ ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" }),
expect: { conversation_stage: "waiting_photo" }
},

{ id: "T12", name: "Kargo sorusu bozmasın",
input: "kargo ücreti ne kadar",
state: createState({ conversation_stage: "waiting_payment" }),
expect: { conversation_stage: "waiting_payment" }
},

{ id: "T13", name: "Arka foto doğru yakala",
input: "arkasına fotoğraf olur mu",
state: createState({ ilgilenilen_urun: "lazer", conversation_stage: "waiting_back_option" }),
expect: { conversation_stage: "waiting_back_photo" }
},

];

let passed = 0;

for (const test of tests) {

let result;

try {
result = await processChat({
message: test.input,
state: test.state
});
} catch (e) {
console.log("💥 CRASH: ${test.id}", e.message);
continue;
}

let ok = true;

for (const key in test.expect) {
if (result[key] !== test.expect[key]) {
ok = false;
console.log("❌ ${test.id} - ${test.name}");
console.log("Beklenen: ${key} = ${test.expect[key]}");
console.log("Gelen: ${result[key]}");
}
}

if (ok) {
console.log("✅ ${test.id} - ${test.name}");
passed++;
}
}

console.log("\n🎯 SONUÇ: ${passed}/${tests.length}");

})();
