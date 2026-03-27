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
...overrides,
};
}

const tests = [

// 🔹 ÜRÜN SEÇİMİ
{
id: "T1",
name: "Lazer seçimi",
input: { message: "resimli lazer kolye" },
state: createState(),
expect: {
ilgilenilen_urun: "lazer",
conversation_stage: "waiting_photo",
},
},

{
id: "T2",
name: "Ataç seçimi",
input: { message: "ataç kolye" },
state: createState(),
expect: {
ilgilenilen_urun: "atac",
conversation_stage: "waiting_letters",
},
},

// 🔹 FOTO → BACK FLOW
{
id: "T3",
name: "Foto sonrası back text",
input: { message: "fotoğraf attım" },
state: createState({
ilgilenilen_urun: "lazer",
conversation_stage: "waiting_photo",
}),
expect: {
conversation_stage: "waiting_back_option",
},
},

{
id: "T4",
name: "Back text seçimi",
input: { message: "yazı yazdırmak istiyorum" },
state: createState({
ilgilenilen_urun: "lazer",
conversation_stage: "waiting_back_option",
}),
expect: {
conversation_stage: "waiting_back_text",
},
},

{
id: "T5",
name: "Back photo seçimi",
input: { message: "arkasına fotoğraf istiyorum" },
state: createState({
ilgilenilen_urun: "lazer",
conversation_stage: "waiting_back_option",
}),
expect: {
conversation_stage: "waiting_back_photo",
},
},

// 🔹 BACK TEXT SKIP
{
id: "T6",
name: "Back text istemiyorum",
input: { message: "istemiyorum" },
state: createState({
ilgilenilen_urun: "lazer",
conversation_stage: "waiting_back_option",
}),
expect: {
conversation_stage: "waiting_payment",
},
},

// 🔹 PAYMENT FLOW
{
id: "T7",
name: "EFT seçimi",
input: { message: "eft" },
state: createState({
conversation_stage: "waiting_payment",
}),
expect: {
payment_method: "eft",
conversation_stage: "waiting_address",
},
},

{
id: "T8",
name: "Kapıda ödeme",
input: { message: "kapıda ödeme" },
state: createState({
conversation_stage: "waiting_payment",
}),
expect: {
payment_method: "cod",
conversation_stage: "waiting_address",
},
},

// 🔹 ADRES + TELEFON
{
id: "T9",
name: "Adres girildi",
input: { message: "istanbul kadıköy moda sokak no 5" },
state: createState({
conversation_stage: "waiting_address",
}),
expect: {
address_status: "alindi",
conversation_stage: "waiting_phone",
},
},

{
id: "T10",
name: "Telefon girildi",
input: { message: "05554443322" },
state: createState({
conversation_stage: "waiting_phone",
}),
expect: {
phone_received: "1",
conversation_stage: "order_completed",
},
},

// 🔹 KRİTİK BUG TESTLERİ
{
id: "T11",
name: "Foto sorusu payment’a atlamasın",
input: { message: "olur mu bu fotoğraf" },
state: createState({
ilgilenilen_urun: "lazer",
conversation_stage: "waiting_photo",
}),
expect: {
conversation_stage: "waiting_photo",
},
},

{
id: "T12",
name: "Kargo sorusu payment bozmasın",
input: { message: "kargo ücreti ne kadar" },
state: createState({
conversation_stage: "waiting_payment",
}),
expect: {
conversation_stage: "waiting_payment",
},
},

{
id: "T13",
name: "Arka foto sorusu doğru stage",
input: { message: "arkasına fotoğraf olur mu" },
state: createState({
ilgilenilen_urun: "lazer",
conversation_stage: "waiting_back_option",
}),
expect: {
conversation_stage: "waiting_back_photo",
},
},

];

// 🚀 RUNNER
let passed = 0;

for (const test of tests) {
const result = await processChat({
message: test.input.message,
state: test.state,
});

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
