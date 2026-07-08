import { processChat } from "../core/engine.js";

const original = {
  POLICY_VERSION: process.env.POLICY_VERSION,
  POLICY_V2_TEST_LEAD_IDS: process.env.POLICY_V2_TEST_LEAD_IDS,
  POLICY_V2_TEST_CONTACT_IDS: process.env.POLICY_V2_TEST_CONTACT_IDS,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function setEnv(values) {
  restoreEnv();
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
}

const cases = [
  {
    name: "POLICY_VERSION=v2 allowlist bosken tum trafik V2 olur",
    env: { POLICY_VERSION: "v2", POLICY_V2_TEST_LEAD_IDS: "", POLICY_V2_TEST_CONTACT_IDS: "" },
    input: { message: "Gümüş var mı?", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    expect: "v2",
  },
  {
    name: "POLICY_VERSION=current rollback eski hatta doner",
    env: { POLICY_VERSION: "current", POLICY_V2_TEST_LEAD_IDS: "", POLICY_V2_TEST_CONTACT_IDS: "" },
    input: { message: "Gümüş var mı?", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    expect: "current",
  },
  {
    name: "V2 allowlist doluysa listede olmayan lead current kalir",
    env: { POLICY_VERSION: "v2", POLICY_V2_TEST_LEAD_IDS: "111", POLICY_V2_TEST_CONTACT_IDS: "" },
    input: { message: "Gümüş var mı?", lead_id: "222", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    expect: "current",
  },
  {
    name: "V2 allowlist doluysa listedeki lead V2 olur",
    env: { POLICY_VERSION: "v2", POLICY_V2_TEST_LEAD_IDS: "111", POLICY_V2_TEST_CONTACT_IDS: "" },
    input: { message: "Gümüş var mı?", lead_id: "111", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    expect: "v2",
  },
  {
    name: "Explicit policy_version replay/test icin env current uzerine yazabilir",
    env: { POLICY_VERSION: "current", POLICY_V2_TEST_LEAD_IDS: "", POLICY_V2_TEST_CONTACT_IDS: "" },
    input: { message: "Gümüş var mı?", policy_version: "v2", conversation_stage: "waiting_photo", ilgilenilen_urun: "lazer" },
    expect: "v2",
  },
];

console.log(`\n🧪 POLICY_ENV_CURRENT_KNOWLEDGE — ${cases.length} tests\n`);
let pass = 0;
let fail = 0;

try {
  for (const t of cases) {
    setEnv(t.env);
    const res = await processChat(t.input);
    if (res.policy_version === t.expect) {
      pass++;
      console.log(`  ✓ ${t.name}`);
    } else {
      fail++;
      console.log(`  ✗ ${t.name}`);
      console.log(`     policy_version: exp="${t.expect}" got="${res.policy_version}"`);
    }
  }
} finally {
  restoreEnv();
}

console.log(`\n  ▶ ${pass}/${pass + fail} passed\n`);
if (fail) process.exit(1);
