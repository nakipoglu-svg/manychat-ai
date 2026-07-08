#!/usr/bin/env node
/**
 * Current vs v2 policy replay comparer.
 *
 * Safety:
 * - Calls the local engine only.
 * - Blocks fetch/network.
 * - Clears AI env vars before importing the engine.
 * - Does not call Kommo, Salesbot, Meta, Sheets, or OpenAI.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

delete process.env.OPENAI_API_KEY;
delete process.env.OPENAI_BASE_URL;
delete process.env.AI_REPLY_MODEL;
delete process.env.KOMMO_LONG_TOKEN;
delete process.env.META_PAGE_ACCESS_TOKEN;
delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
delete process.env.GOOGLE_PRIVATE_KEY;

globalThis.fetch = async () => {
  throw new Error("REPLAY_NETWORK_BLOCKED: Replay testinde ağ isteği yasaktır.");
};

const originalConsoleLog = console.log.bind(console);
console.log = (...args) => {
  const first = String(args[0] ?? "");
  if (first.startsWith("[V8]") || first.startsWith("[TOKEN]") || first.startsWith("[GUARD]")) return;
  originalConsoleLog(...args);
};

const require = createRequire(import.meta.url);

function loadXlsx() {
  try {
    return require("xlsx");
  } catch {
    return require("C:\\Users\\HP\\Downloads\\manychat-ai-main_REPLAY_EXCEL_KESIN\\manychat-ai-main\\scripts\\replay\\node_modules\\xlsx");
  }
}

const XLSX = loadXlsx();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_INPUT = "C:\\Users\\HP\\Downloads\\manychat-ai-main_REPLAY_EXCEL_KESIN\\manychat-ai-main\\logs.xlsx";
const { processChat } = await import("../../core/engine.js");

const REVIEW_CATEGORIES = new Set([
  "ambiguous_needs_review",
  "wrong_route_suspected",
  "engine_error",
]);

const BEHAVIOR_ORDER = [
  "slot_committed",
  "faq_answered",
  "contextual_ack",
  "expected_slot_reminder",
  "operational_handoff",
  "serious_complaint_handoff",
  "post_order_update_handoff",
  "recovered_context_handoff",
  "partial_slot_update",
  "product_context_recovered",
  "ambiguous_needs_review",
  "wrong_route_suspected",
  "engine_error",
];

function usage() {
  console.log(`
Kullanım:
  node scripts/replay/compare_policies.mjs --file "logs.xlsx" [--limit 1000] [--offset 0] [--sheet logs]

Varsayılan dosya:
  ${DEFAULT_INPUT}
`);
}

function parseArgs(argv) {
  const args = {
    file: DEFAULT_INPUT,
    limit: Infinity,
    offset: 0,
    sheet: "",
    outdir: path.join(PROJECT_ROOT, "outputs", "replay"),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--file") args.file = argv[++i];
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--offset") args.offset = Number(argv[++i]);
    else if (a === "--sheet") args.sheet = argv[++i];
    else if (a === "--outdir") args.outdir = argv[++i];
    else throw new Error(`Bilinmeyen parametre: ${a}`);
  }
  if (!Number.isFinite(args.limit) || args.limit < 1) args.limit = Infinity;
  if (!Number.isFinite(args.offset) || args.offset < 0) args.offset = 0;
  return args;
}

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function key(value) {
  return text(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const ALIASES = {
  message: ["customer_message", "customermessage", "message", "mesaj", "last_input_text", "last_user_message", "content", "text"],
  conversation_id: ["conversation_id", "conversationid", "conversation", "chat_id", "chatid"],
  message_id: ["message_id", "messageid", "id"],
  instagram_username: ["instagram_username", "instagramusername", "username", "kullanici", "customer"],
  ilgilenilen_urun: ["ilgilenilen_urun", "ilgilenilenurun", "product", "urun"],
  user_product: ["user_product", "userproduct"],
  conversation_stage: ["conversation_stage", "conversationstage", "stage", "asama"],
  payment_method: ["payment_method", "paymentmethod", "odeme_yontemi", "odemeyontemi"],
  photo_received: ["photo_received", "photoreceived", "foto_alindi", "fotoalindi"],
  back_text_status: ["back_text_status", "backtextstatus", "arka_yazi_durumu", "arkayazidurumu"],
  address_status: ["address_status", "addressstatus", "adres_durumu", "adresdurumu"],
  letters_received: ["letters_received", "lettersreceived", "harfler_alindi", "harfleralindi"],
  phone_received: ["phone_received", "phonereceived", "telefon_alindi", "telefonalindi"],
  name_received: ["name_received", "namereceived", "isim_alindi", "isimalindi"],
  order_status: ["order_status", "orderstatus", "siparis_durumu", "siparisdurumu"],
  reply_class: ["reply_class", "replyclass"],
  support_mode: ["support_mode", "supportmode"],
  support_mode_reason: ["support_mode_reason", "supportmodereason"],
  menu_gosterildi: ["menu_gosterildi", "menugosterildi", "menu_shown", "menushown"],
  context_lock: ["context_lock", "contextlock"],
  previous_reply: ["assistant_reply", "assistantreply", "bot_reply", "botreply", "ai_reply"],
  previous_intent: ["detected_intent", "detectedintent", "intent", "last_intent"],
};

function valueFrom(row, aliases) {
  for (const name of aliases) {
    if (Object.hasOwn(row, name) && text(row[name])) return text(row[name]);
  }
  return "";
}

function mapRow(raw) {
  const normalized = {};
  for (const [header, value] of Object.entries(raw)) normalized[key(header)] = value;
  const mapped = {};
  for (const [field, aliases] of Object.entries(ALIASES)) mapped[field] = valueFrom(normalized, aliases);
  return mapped;
}

function readRows(filePath, sheetName) {
  const workbook = XLSX.readFile(filePath, { raw: false, cellDates: false });
  const selected = sheetName || workbook.SheetNames[0];
  if (!selected || !workbook.Sheets[selected]) {
    throw new Error(`Sayfa bulunamadı: ${sheetName || "(ilk sayfa)"}. Bulunan sayfalar: ${workbook.SheetNames.join(", ")}`);
  }
  return XLSX.utils.sheet_to_json(workbook.Sheets[selected], { defval: "", raw: false });
}

function makePayload(r, policy = "current") {
  const payload = {
    message: r.message,
    ilgilenilen_urun: r.ilgilenilen_urun,
    user_product: r.user_product,
    conversation_stage: r.conversation_stage,
    payment_method: r.payment_method,
    photo_received: r.photo_received,
    back_text_status: r.back_text_status,
    address_status: r.address_status,
    letters_received: r.letters_received,
    phone_received: r.phone_received,
    name_received: r.name_received,
    order_status: r.order_status,
    reply_class: r.reply_class,
    support_mode: r.support_mode,
    support_mode_reason: r.support_mode_reason,
    menu_gosterildi: r.menu_gosterildi,
    context_lock: r.context_lock,
    ai_reply: r.previous_reply,
    last_intent: r.previous_intent,
  };
  if (policy === "v2") payload.policy_version = "v2";
  return payload;
}

function convKey(r, index) {
  return r.conversation_id || r.instagram_username || `row_${index}`;
}

function pushHistory(history, value) {
  if (!text(value)) return;
  history.push(text(value));
  while (history.length > 3) history.shift();
}

function normalizeMsg(s) {
  return text(s).toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

function increment(map, name, amount = 1) {
  const k = text(name) || "(bos)";
  map[k] = (map[k] || 0) + amount;
}

function topEntries(map, n = 20) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

function categoryOf(result, error = "") {
  if (error || result?.last_intent === "error") return "engine_error";
  return result?.behavior_category || "wrong_route_suspected";
}

function isReview(category) {
  return REVIEW_CATEGORIES.has(category);
}

function maskPII(value) {
  let s = text(value);
  if (!s) return "";
  s = s.replace(/\bTR\s*\d{2}(?:\s*[A-Z0-9]){20,30}\b/gi, "[IBAN]");
  s = s.replace(/(?:\+?90[\s.-]*)?(?:0[\s.-]*)?5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/g, "[PHONE]");
  if (s.includes("=")) return s.startsWith("=") ? `'${s}` : s;
  const addressLike =
    s.length > 30 &&
    /\b(mahalle|mahallesi|mah|sokak|sok|cadde|cad|bulvar|apt|apartman|daire|no:|no\s|kat|adres|ilçe|ilce)\b/i.test(s);
  if (addressLike) return "[ADDRESS_MASKED]";
  return s.startsWith("=") ? `'${s}` : s;
}

function stateSummary(payload) {
  return [
    ["urun", payload.ilgilenilen_urun || payload.user_product],
    ["stage", payload.conversation_stage],
    ["foto", payload.photo_received],
    ["odeme", payload.payment_method],
    ["adres", payload.address_status],
    ["telefon", payload.phone_received],
    ["isim", payload.name_received],
    ["harf", payload.letters_received],
    ["siparis", payload.order_status],
    ["support", payload.support_mode],
  ]
    .filter(([, value]) => text(value))
    .map(([label, value]) => `${label}=${text(value)}`)
    .join(" | ");
}

function traceValue(result, key) {
  const value = result?._trace?.[key];
  if (Array.isArray(value)) return value.join(" ; ");
  return text(value);
}

function missingSlots(result) {
  const value = result?._trace?.missing_slots;
  if (Array.isArray(value)) return value.join(", ");
  return text(value);
}

async function runEngine(payload) {
  const started = performance.now();
  try {
    const result = await processChat(payload);
    return {
      result,
      error: "",
      ms: Math.round((performance.now() - started) * 100) / 100,
    };
  } catch (error) {
    return {
      result: null,
      error: error?.stack || error?.message || String(error),
      ms: Math.round((performance.now() - started) * 100) / 100,
    };
  }
}

function resultBrief(run) {
  const r = run.result || {};
  const category = categoryOf(r, run.error);
  return {
    category,
    review: isReview(category),
    operational: category === "operational_handoff",
    serious: category === "serious_complaint_handoff",
    ai_reply: text(r.ai_reply),
    intent: text(r.last_intent || r._debug?.intent),
    source: text(r._debug?.source || r._meta?.replySource || r._trace?.selected_reply_source),
    stage: text(r.conversation_stage),
    product: text(r.ilgilenilen_urun || r.user_product || r._debug?.product),
    support_mode: text(r.support_mode),
    reply_class: text(r.reply_class),
    error: run.error,
    ms: run.ms,
  };
}

function makeExcelRow(entry) {
  const current = entry.current;
  const v2 = entry.v2;
  return {
    "Kaynak Satir": entry.row_number,
    "Konusma ID": maskPII(entry.conversation_id),
    "Mesaj ID": maskPII(entry.message_id),
    "Instagram": maskPII(entry.instagram_username),
    "Musteri Mesaji": maskPII(entry.input_message),
    "Onceki 3 Musteri Mesaji": maskPII(entry.previous_customer_messages.join(" || ")),
    "Onceki 3 Bot Cevabi": maskPII(entry.previous_bot_replies.join(" || ")),
    "Onceki Bot Cevabi": maskPII(entry.previous_live_reply),
    "Input State": maskPII(stateSummary(entry.payload)),
    "Current Kategori": current.category,
    "V2 Kategori": v2.category,
    "Current Inceleme": current.review ? "EVET" : "",
    "V2 Inceleme": v2.review ? "EVET" : "",
    "Current Intent": current.intent,
    "V2 Intent": v2.intent,
    "Current Source": current.source,
    "V2 Source": v2.source,
    "Current Stage": current.stage,
    "V2 Stage": v2.stage,
    "Current Cevap": maskPII(current.ai_reply),
    "V2 Cevap": maskPII(v2.ai_reply),
    "V2 Missing Slots": missingSlots(entry.v2Raw),
    "V2 State'e Giris Nedeni": traceValue(entry.v2Raw, "state_entry_reason"),
    "V2 Denenen Rule/Intentler": maskPII(traceValue(entry.v2Raw, "tried_rules")),
    "V2 Secilen Policy Karari": traceValue(entry.v2Raw, "selected_policy_decision"),
    "V2 Secilen Cevap Kaynagi": traceValue(entry.v2Raw, "selected_reply_source"),
    "V2 Slot Prompt Nedeni": traceValue(entry.v2Raw, "slot_prompt_reason"),
    "V2 Operator/Handoff Nedeni": traceValue(entry.v2Raw, "handoff_reason"),
    "Current Hata": maskPII(current.error),
    "V2 Hata": maskPII(v2.error),
    "Current ms": current.ms,
    "V2 ms": v2.ms,
    "CIHAN KARARI": "",
    "CIHAN NOTU": "",
  };
}

function applySheetLayout(ws, rows) {
  const headers = Object.keys(rows[0] || {});
  if (!headers.length) return;
  ws["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${Math.max(rows.length + 1, 1)}` };
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  ws["!cols"] = headers.map((h) => {
    if (/Cevap|Mesaji|Rule|State|NOTU/i.test(h)) return { wch: 48 };
    if (/Kategori|Intent|Source|Nedeni|Karari/i.test(h)) return { wch: 26 };
    return { wch: 16 };
  });
  ws["!rows"] = [{ hpt: 26 }, ...rows.map(() => ({ hpt: 42 }))];
}

function appendJsonSheet(wb, name, rows) {
  const safeRows = rows.length ? rows : [{ "Bilgi": "Veri yok" }];
  const ws = XLSX.utils.json_to_sheet(safeRows);
  applySheetLayout(ws, safeRows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

const inputFile = path.isAbsolute(args.file) ? args.file : path.resolve(process.cwd(), args.file);
if (!fs.existsSync(inputFile)) throw new Error(`Log dosyası bulunamadı: ${inputFile}`);

fs.mkdirSync(args.outdir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputExcel = path.join(args.outdir, `policy-current-vs-v2-${stamp}.xlsx`);
const outputSummary = path.join(args.outdir, `policy-current-vs-v2-${stamp}.json`);

const rawRows = readRows(inputFile, args.sheet);
const mappedRows = rawRows.map(mapRow).filter((r) => text(r.message));
const selectedRows = mappedRows.slice(args.offset, args.offset + args.limit);

console.log("\n🔒 REPLAY GÜVENLİ MOD");
console.log("   Kommo: kapalı | Müşteri mesajı: kapalı | Salesbot: kapalı | OpenAI: kapalı | Ağ: bloklu");
console.log(`   Dosya: ${path.basename(inputFile)}`);
console.log(`   Toplam mesaj: ${mappedRows.length} | Bu çalıştırma: ${selectedRows.length}`);
console.log("   Policy: current vs v2\n");

const histories = new Map();
const rows = [];
const stats = {
  input_rows: rawRows.length,
  usable_messages: mappedRows.length,
  processed: 0,
  current_review_needed: 0,
  v2_review_needed: 0,
  current_operational_handoff: 0,
  v2_operational_handoff: 0,
  current_wrong_route_suspected: 0,
  v2_wrong_route_suspected: 0,
  current_engine_error: 0,
  v2_engine_error: 0,
};
const currentCategoryCounts = {};
const v2CategoryCounts = {};
const stateDiffCounts = {};
const recurringV2ReviewMessages = {};

for (let index = 0; index < selectedRows.length; index++) {
  const r = selectedRows[index];
  const keyForHistory = convKey(r, index);
  const history = histories.get(keyForHistory) || { customers: [], bots: [] };
  const payload = makePayload(r, "current");

  const currentRun = await runEngine(payload);
  const v2Run = await runEngine(makePayload(r, "v2"));
  const current = resultBrief(currentRun);
  const v2 = resultBrief(v2Run);

  stats.processed++;
  if (current.review) stats.current_review_needed++;
  if (v2.review) stats.v2_review_needed++;
  if (current.operational) stats.current_operational_handoff++;
  if (v2.operational) stats.v2_operational_handoff++;
  if (current.category === "wrong_route_suspected") stats.current_wrong_route_suspected++;
  if (v2.category === "wrong_route_suspected") stats.v2_wrong_route_suspected++;
  if (current.category === "engine_error") stats.current_engine_error++;
  if (v2.category === "engine_error") stats.v2_engine_error++;
  increment(currentCategoryCounts, current.category);
  increment(v2CategoryCounts, v2.category);
  increment(stateDiffCounts, `${text(payload.conversation_stage) || "(bos)"} :: ${current.category} -> ${v2.category}`);
  if (v2.review) increment(recurringV2ReviewMessages, normalizeMsg(r.message));

  rows.push({
    row_number: args.offset + index + 2,
    conversation_id: r.conversation_id,
    message_id: r.message_id,
    instagram_username: r.instagram_username,
    input_message: r.message,
    previous_customer_messages: [...history.customers],
    previous_bot_replies: [...history.bots],
    previous_live_reply: r.previous_reply,
    payload,
    current,
    v2,
    currentRaw: currentRun.result,
    v2Raw: v2Run.result,
  });

  pushHistory(history.customers, r.message);
  pushHistory(history.bots, r.previous_reply);
  histories.set(keyForHistory, history);

  if ((index + 1) % 250 === 0 || index + 1 === selectedRows.length) {
    process.stdout.write(`\r   İşlenen: ${index + 1}/${selectedRows.length}`);
  }
}

const summary = {
  safety: {
    kommo_writes: false,
    customer_messages: false,
    salesbot_trigger: false,
    ai_api_calls: false,
    network: "blocked",
  },
  run: {
    input_file: inputFile,
    sheet: args.sheet || "first_sheet",
    offset: args.offset,
    limit: Number.isFinite(args.limit) ? args.limit : "all",
    started_at: stamp,
  },
  stats,
  behavior_categories: {
    current: Object.fromEntries(BEHAVIOR_ORDER.map((k) => [k, currentCategoryCounts[k] || 0])),
    v2: Object.fromEntries(BEHAVIOR_ORDER.map((k) => [k, v2CategoryCounts[k] || 0])),
  },
  top_state_differences: topEntries(stateDiffCounts, 40),
  recurring_v2_review_messages: topEntries(recurringV2ReviewMessages, 40),
  files: {
    excel: outputExcel,
    summary: outputSummary,
  },
};

fs.writeFileSync(outputSummary, JSON.stringify(summary, null, 2), "utf8");

const comparisonRows = rows.map(makeExcelRow);
const v2ReviewRows = comparisonRows.filter((r) => r["V2 Inceleme"] === "EVET");
const overviewRows = [
  { "Metrik": "İşlenen mesaj", "Current": stats.processed, "V2": stats.processed },
  { "Metrik": "Gerçek inceleme gereken", "Current": stats.current_review_needed, "V2": stats.v2_review_needed },
  { "Metrik": "wrong_route_suspected", "Current": stats.current_wrong_route_suspected, "V2": stats.v2_wrong_route_suspected },
  { "Metrik": "operational_handoff", "Current": stats.current_operational_handoff, "V2": stats.v2_operational_handoff },
  { "Metrik": "engine_error", "Current": stats.current_engine_error, "V2": stats.v2_engine_error },
  ...BEHAVIOR_ORDER.map((category) => ({
    "Metrik": category,
    "Current": currentCategoryCounts[category] || 0,
    "V2": v2CategoryCounts[category] || 0,
  })),
];
const stateDiffRows = topEntries(stateDiffCounts, 500).map((x) => ({
  "State / Kategori Farki": x.name,
  "Adet": x.count,
}));
const recurringRows = topEntries(recurringV2ReviewMessages, 500).map((x) => ({
  "V2 Inceleme Tekrar Eden Mesaj": maskPII(x.name),
  "Adet": x.count,
}));

const wb = XLSX.utils.book_new();
appendJsonSheet(wb, "Ozet", overviewRows);
appendJsonSheet(wb, "Karsilastirma", comparisonRows);
appendJsonSheet(wb, "V2 Inceleme Gereken", v2ReviewRows);
appendJsonSheet(wb, "State Farklari", stateDiffRows);
appendJsonSheet(wb, "Tekrar Eden V2", recurringRows);
XLSX.writeFile(wb, outputExcel, { compression: true });

console.log("\n\n✅ Bitti.");
console.log(`   Excel: ${outputExcel}`);
console.log(`   JSON:  ${outputSummary}`);
console.log(`   Current inceleme: ${stats.current_review_needed}`);
console.log(`   V2 inceleme: ${stats.v2_review_needed}`);
console.log(`   Current operational: ${stats.current_operational_handoff}`);
console.log(`   V2 operational: ${stats.v2_operational_handoff}\n`);
