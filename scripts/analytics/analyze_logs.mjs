#!/usr/bin/env node
/**
 * LOG ANALİTİĞİ — Yudum Jewels
 * Gerçek konuşma loglarını (logs.xlsx) okuyup iş-diliyle rapor çıkarır.
 *
 * Güvenlik: sadece OKUR. Ağ yok, Kommo/OpenAI/Meta yok, production'a dokunmaz.
 *
 * Kullanım:
 *   node scripts/analytics/analyze_logs.mjs
 *   node scripts/analytics/analyze_logs.mjs --file "logs.xlsx"
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
function loadXlsx() {
  try { return require("xlsx"); }
  catch { return require("C:/Users/HP/Downloads/manychat-ai-main_REPLAY_EXCEL_KESIN/manychat-ai-main/scripts/replay/node_modules/xlsx"); }
}
const XLSX = loadXlsx();

// ── args ──
const argv = process.argv.slice(2);
let file = "logs.xlsx";
for (let i = 0; i < argv.length; i++) if (argv[i] === "--file") file = argv[++i];
const inputFile = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
if (!fs.existsSync(inputFile)) { console.error("Log dosyası bulunamadı:", inputFile); process.exit(1); }

// ── oku ──
const wb = XLSX.readFile(inputFile, { raw: false });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
const t = (v) => String(v ?? "").trim();

// ── yardımcılar ──
function tally(arr, keyFn) {
  const m = {};
  for (const r of arr) { const k = keyFn(r) || "(boş)"; m[k] = (m[k] || 0) + 1; }
  return m;
}
function top(map, n = 12) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);
}
function pct(part, whole) { return whole ? ((part / whole) * 100).toFixed(1) + "%" : "0%"; }
function bar(count, max, width = 24) {
  const len = max ? Math.round((count / max) * width) : 0;
  return "█".repeat(len) + "░".repeat(width - len);
}
function printTable(title, entries, total) {
  console.log(`\n${title}`);
  const max = entries.length ? entries[0][1] : 0;
  for (const [name, count] of entries) {
    console.log(`  ${String(name).padEnd(26).slice(0, 26)} ${bar(count, max)} ${String(count).padStart(6)}  ${pct(count, total)}`);
  }
}

// ── metrikler ──
const totalMsgs = rows.length;
const withMsg = rows.filter((r) => t(r.customer_message));
const conversations = new Set(rows.map((r) => t(r.conversation_id)).filter(Boolean));
const customers = new Set(rows.map((r) => t(r.instagram_username)).filter(Boolean));

// insana devir: support_mode="1" VEYA reply_class operational/fallback
const escalated = rows.filter((r) => t(r.support_mode) === "1" ||
  /operational|fallback/i.test(t(r.reply_class)) || t(r.support_mode_reason));
const handled = totalMsgs - escalated.length;

// funnel: konuşma bazında en ileri aşama
const byConv = {};
for (const r of rows) {
  const c = t(r.conversation_id); if (!c) continue;
  (byConv[c] ||= []).push(r);
}
const STAGE_RANK = { "": 0, waiting_product: 1, waiting_photo: 2, waiting_letters: 2, waiting_payment: 3, waiting_address: 4, order_completed: 5 };
let reachedCompleted = 0, reachedPayment = 0, reachedPhoto = 0;
for (const c in byConv) {
  const maxRank = Math.max(...byConv[c].map((r) => STAGE_RANK[t(r.conversation_stage)] ?? 0),
    ...byConv[c].map((r) => (t(r.order_status) === "completed" ? 5 : 0)));
  if (maxRank >= 5) reachedCompleted++;
  if (maxRank >= 3) reachedPayment++;
  if (maxRank >= 2) reachedPhoto++;
}

// ── RAPOR ──
console.log("\n" + "═".repeat(64));
console.log("  YUDUM JEWELS — LOG ANALİTİĞİ");
console.log("  Kaynak: " + path.basename(inputFile));
console.log("═".repeat(64));

console.log("\n📊 GENEL HACİM");
console.log(`  Toplam mesaj        : ${totalMsgs}`);
console.log(`  Benzersiz konuşma   : ${conversations.size}`);
console.log(`  Benzersiz müşteri   : ${customers.size}`);
console.log(`  Konuşma başı mesaj  : ${(totalMsgs / (conversations.size || 1)).toFixed(1)}`);

console.log("\n🤖 OTOMASYON (bot vs insan)");
console.log(`  Bot kendi çözdü     : ${handled}  (${pct(handled, totalMsgs)})`);
console.log(`  İnsana devredildi   : ${escalated.length}  (${pct(escalated.length, totalMsgs)})`);
console.log(`  → Bot her 100 mesajın ${Math.round(handled / totalMsgs * 100)}'ini insana gerek kalmadan yanıtlıyor.`);

console.log("\n🛒 HUNİ (konuşma bazında en ileri aşama)");
const cv = conversations.size || 1;
console.log(`  Fotoğraf/ürün aşamasına ulaşan : ${reachedPhoto}  (${pct(reachedPhoto, cv)})`);
console.log(`  Ödeme aşamasına ulaşan         : ${reachedPayment}  (${pct(reachedPayment, cv)})`);
console.log(`  Sipariş TAMAMLANAN             : ${reachedCompleted}  (${pct(reachedCompleted, cv)})`);
console.log(`  → Kabaca dönüşüm: her 100 konuşmadan ${Math.round(reachedCompleted / cv * 100)}'i siparişe ulaşıyor.`);

printTable("❓ EN SIK MÜŞTERİ SORULARI (intent)", top(tally(withMsg, (r) => t(r.detected_intent)), 12), withMsg.length);
printTable("💍 ÜRÜN İLGİSİ (ilgilenilen_urun)", top(tally(rows.filter((r) => t(r.ilgilenilen_urun)), (r) => t(r.ilgilenilen_urun)), 8), rows.filter((r) => t(r.ilgilenilen_urun)).length);
printTable("📞 İNSANA DEVİR SEBEPLERİ", top(tally(escalated, (r) => t(r.support_mode_reason) || t(r.reply_class) || "(belirtilmemiş)"), 10), escalated.length);
printTable("💳 ÖDEME TERCİHİ (belirtilenler)", top(tally(rows.filter((r) => t(r.payment_method)), (r) => t(r.payment_method)), 6), rows.filter((r) => t(r.payment_method)).length);

// en sık insana giden mesajlar (elle bakılacaklar)
const escMsgs = tally(escalated.filter((r) => t(r.customer_message)), (r) => t(r.customer_message).toLowerCase().replace(/\s+/g, " ").slice(0, 45));
console.log("\n🔍 EN SIK İNSANA GİDEN MESAJLAR (iyileştirme fırsatı)");
for (const [msg, count] of top(escMsgs, 15)) console.log(`  ${String(count).padStart(4)} ×  ${msg}`);

console.log("\n" + "═".repeat(64));
console.log("  Not: Bu rapor gerçek loglardan üretildi, salt-okunur. Hiçbir şey değişmedi.");
console.log("═".repeat(64) + "\n");
