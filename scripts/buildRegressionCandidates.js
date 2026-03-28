import fs from "fs";
import path from "path";

const APPS_SCRIPT_WEBHOOK_URL = process.env.GOOGLE_LOG_WEBHOOK_URL || "";
const APPS_SCRIPT_SECRET = process.env.GOOGLE_LOG_SECRET || "";

const OUTPUT_DIR = path.join(process.cwd(), "scripts", "generated");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "candidate_regressions.json");

function normalizeText(text = "") {
  return String(text)
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .trim();
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function fetchSheetRows() {
  if (!APPS_SCRIPT_WEBHOOK_URL) {
    throw new Error("GOOGLE_LOG_WEBHOOK_URL eksik.");
  }

  if (!APPS_SCRIPT_SECRET) {
    throw new Error("GOOGLE_LOG_SECRET eksik.");
  }

  const response = await fetch(APPS_SCRIPT_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret: APPS_SCRIPT_SECRET,
      action: "get_rows",
    }),
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Apps Script JSON dönmedi. Gelen cevap: ${text}`);
  }

  if (!response.ok) {
    throw new Error(`Apps Script HTTP hata: ${response.status} - ${text}`);
  }

  if (!data.success) {
    throw new Error(`Apps Script hata döndü: ${data.error || "Bilinmeyen hata"}`);
  }

  if (!Array.isArray(data.rows)) {
    throw new Error("Apps Script rows dizisi döndürmedi.");
  }

  return data.rows;
}

function mapRowToCandidate(row = {}, index = 0) {
  const hata = normalizeText(row.hata).toLowerCase();
  const correctReply = normalizeText(row.correct_reply);
  const customerMessage = normalizeText(row.customer_message);
  const assistantReply = normalizeText(row.assistant_reply);

  if (hata !== "hata") return null;
  if (!correctReply) return null;
  if (!customerMessage) return null;

  return {
    id: row.message_id || row.conversation_id || `cand_${index + 1}`,
    created_at: row.timestamp || "",
    conversation_id: row.conversation_id || "",
    message_id: row.message_id || "",
    source: "logs_sheet",
    input: {
      message: customerMessage,
      ilgilenilen_urun: row.ilgilenilen_urun || "",
      conversation_stage: row.conversation_stage || "",
      payment_method: row.payment_method || "",
      photo_received: row.photo_received || "",
      back_text_status: row.back_text_status || "",
      address_status: row.address_status || "",
      letters_received: row.letters_received || "",
      order_status: row.order_status || "",
    },
    observed_output: {
      ai_reply: assistantReply,
      detected_intent: row.detected_intent || "",
      reply_class: row.reply_class || "",
      support_mode: row.support_mode || "",
      support_mode_reason: row.support_mode_reason || "",
    },
    expected_output: {
      ai_reply: correctReply,
    },
    fix_layer: row.fix_layer || "unknown",
    notes: row.notes || "",
  };
}

function dedupeCandidates(candidates = []) {
  const seen = new Set();
  const output = [];

  for (const item of candidates) {
    const key = JSON.stringify({
      message: item.input.message,
      product: item.input.ilgilenilen_urun,
      stage: item.input.conversation_stage,
      expected: item.expected_output.ai_reply,
      fix_layer: item.fix_layer,
    });

    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

async function main() {
  console.log("Regression adayları sheet'ten çekiliyor...");

  const rows = await fetchSheetRows();

  console.log(`Toplam satır: ${rows.length}`);

  const candidates = rows
    .map((row, index) => mapRowToCandidate(row, index))
    .filter(Boolean);

  const uniqueCandidates = dedupeCandidates(candidates);

  ensureDir(OUTPUT_DIR);

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: "logs_sheet",
        total_rows: rows.length,
        total_candidates: uniqueCandidates.length,
        candidates: uniqueCandidates,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Tamamlandı. Aday dosyası oluşturuldu: ${OUTPUT_FILE}`);
  console.log(`Toplam aday: ${uniqueCandidates.length}`);
}

main().catch((error) => {
  console.error("buildRegressionCandidates hata:", error.message || error);
  process.exit(1);
});
