console.log("🔥 TEST BAŞLADI");

const processChat = require("./api/chat.js").processChat;

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

async function run() {

const tests = [
{
id: "T1",
input: "resimli lazer kolye",
state: createState(),
expect: { ilgilenilen_urun: "lazer" }
},
{
id: "T2",
input: "ataç kolye",
state: createState(),
expect: { ilgilenilen_urun: "atac" }
}
];

let passed = 0;

for (const test of tests) {
try {
const result = await processChat({
message: test.input,
state: test.state
});

  let ok = true;

  for (const key in test.expect) {
    if (result[key] !== test.expect[key]) {
      ok = false;
      console.log(`❌ ${test.id}`);
      console.log("Beklenen:", test.expect[key]);
      console.log("Gelen:", result[key]);
    }
  }

  if (ok) {
    console.log(`✅ ${test.id}`);
    passed++;
  }

} catch (e) {
  console.log(`💥 CRASH: ${test.id}`);
  console.log(e.message);
}

}

console.log("🎯 SONUÇ: ${passed}/${tests.length}");
}

run();
