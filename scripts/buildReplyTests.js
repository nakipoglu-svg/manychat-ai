import fs from "fs";
import path from "path";

const INPUT_FILE = path.join(
  process.cwd(),
  "scripts",
  "generated",
  "candidate_regressions.json"
);

const OUTPUT_DIR = path.join(process.cwd(), "tests", "generated");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "replay.generated.tests.js");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function escapeForJs(text = "") {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function normalizeText(text = "") {
  return String(text).trim();
}

function buildTestCase(candidate, index) {
  const input = candidate.input || {};
  const expected = candidate.expected_output || {};
  const observed = candidate.observed_output || {};

  const safeName =
    normalizeText(input.message).slice(0, 60).replace(/\s+/g, " ") ||
    `generated_case_${index + 1}`;

  return `{
    name: \`${escapeForJs(safeName)}\`,
    body: {
      message: \`${escapeForJs(input.message || "")}\`,
      ilgilenilen_urun: \`${escapeForJs(input.ilgilenilen_urun || "")}\`,
      user_product: \`${escapeForJs(input.ilgilenilen_urun || "")}\`,
      conversation_stage: \`${escapeForJs(input.conversation_stage || "")}\`,
      payment_method: \`${escapeForJs(input.payment_method || "")}\`,
      photo_received: \`${escapeForJs(input.photo_received || "")}\`,
      back_text_status: \`${escapeForJs(input.back_text_status || "")}\`,
      address_status: \`${escapeForJs(input.address_status || "")}\`,
      letters_received: \`${escapeForJs(input.letters_received || "")}\`,
      order_status: \`${escapeForJs(input.order_status || "")}\`
    },
    expectedReplyIncludes: \`${escapeForJs(expected.ai_reply || "")}\`,
    meta: {
      fix_layer: \`${escapeForJs(candidate.fix_layer || "")}\`,
      notes: \`${escapeForJs(candidate.notes || "")}\`,
      observed_reply: \`${escapeForJs(observed.ai_reply || "")}\`,
      observed_intent: \`${escapeForJs(observed.detected_intent || "")}\`
    }
  }`;
}

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Girdi dosyası bulunamadı: ${INPUT_FILE}`);
  }

  const raw = fs.readFileSync(INPUT_FILE, "utf8");
  const parsed = JSON.parse(raw);

  const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];

  ensureDir(OUTPUT_DIR);

  const content = `import { processChat } from "../../api/chat.js";

const replayCases = [
${candidates.map((c, i) => buildTestCase(c, i)).join(",\n")}
];

function normalize(text = "") {
  return String(text).replace(/\\s+/g, " ").trim();
}

async function run() {
  let passed = 0;
  let failed = 0;

  for (const testCase of replayCases) {
    const result = await processChat(testCase.body, {
      isTest: true,
      skipKnowledgeCheck: true,
      disableLogging: true
    });

    const actual = normalize(result.ai_reply || "");
    const expected = normalize(testCase.expectedReplyIncludes || "");

    const ok = actual.includes(expected);

    if (ok) {
      passed++;
      console.log(\`✅ PASS: \${testCase.name}\`);
    } else {
      failed++;
      console.log(\`❌ FAIL: \${testCase.name}\`);
      console.log("   Expected to include:", expected);
      console.log("   Actual:", actual);
      console.log("   Meta:", testCase.meta);
    }
  }

  console.log("");
  console.log(\`Replay generated tests finished. Passed: \${passed}, Failed: \${failed}\`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("replay.generated.tests error:", err.message || err);
  process.exit(1);
});
`;

  fs.writeFileSync(OUTPUT_FILE, content, "utf8");

  console.log(`Replay test dosyası oluşturuldu: ${OUTPUT_FILE}`);
  console.log(`Toplam case: ${candidates.length}`);
}

main();
