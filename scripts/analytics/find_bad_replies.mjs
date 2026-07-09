#!/usr/bin/env node
/**
 * HATALI CEVAP AVCISI — Yudum Jewels
 * Tüm logları ŞU ANKİ (V2) motordan geçirir, şüpheli/hatalı cevapları
 * sezgisel kurallarla yakalar ve "Claude notu" ile Excel'e yazar.
 *
 * Amaç: Cihan'ın gözle yaptığı incelemeyi otomatikleştirmek — hataları bulmak.
 * Güvenlik: sadece OKUR. Ağ yok, Kommo/OpenAI/Meta yok, production'a dokunmaz.
 *
 * Kullanım: node scripts/analytics/find_bad_replies.mjs [--file logs.xlsx] [--limit N]
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

delete process.env.OPENAI_API_KEY;
globalThis.fetch = async () => { throw new Error("REPLAY_NETWORK_BLOCKED"); };
const _log = console.log.bind(console);
console.log = (...a) => { const f = String(a[0] ?? ""); if (f.startsWith("[V8]") || f.startsWith("[TOKEN]") || f.startsWith("[GUARD]")) return; _log(...a); };

const require = createRequire(import.meta.url);
function loadXlsx() {
  try { return require("xlsx"); }
  catch { return require("C:/Users/HP/Downloads/manychat-ai-main_REPLAY_EXCEL_KESIN/manychat-ai-main/scripts/replay/node_modules/xlsx"); }
}
const XLSX = loadXlsx();
const { processChat } = await import("../../core/engine.js");

// ── args ──
const argv = process.argv.slice(2);
let file = "logs.xlsx", limit = Infinity;
for (let i = 0; i < argv.length; i++) { if (argv[i] === "--file") file = argv[++i]; else if (argv[i] === "--limit") limit = Number(argv[++i]); }
const inputFile = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);

const t = (v) => String(v ?? "").trim();
function norm(s) {
  return String(s ?? "").toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
const has = (s, arr) => arr.some((k) => s.includes(k));

// ── Şüphe dedektörleri ──
const GENERIC = ["tabi efendim", "tabii efendim", "rica ederiz efendim", "memnuniyetle efendim", "iyiyiz efendim"];
const HANDOFF = ["ekibimize iletiyorum", "bilginizi ekibimize", "ekibimize ilettim", "hemen bir insan", "insan temsilci", "kontrol edip hemen donus", "kontrol edip size donus"];
const PHOTO_WAIT = ["fotografinizi bekliyorum", "fotografinizi buradan iletebilir", "kullanmak istediginiz fotografi buradan", "hazir oldugunuzda fotografinizi", "fotografinizi buradan gonderebilir", "fotografi buradan gonderebilir"];
const SPECIFIC = ["vesikalik", "ucret", "ucretli", "fiyat", "ne kadar", "renk", "kac kisi", "kac kişi", "boyut", "ebat", "kargo", "teslimat", "garanti", "iade", "kac gun", "ne zaman gel", "malzeme", "celik", "altin", "gumus", "zincir", "beden", "olcu", "taksit", "indirim"];

function isGeneric(r) { return GENERIC.some((g) => r === g || (r.startsWith(g) && r.length < g.length + 8)); }
function isHandoff(r) { return has(r, HANDOFF); }
function isPhotoWait(r) { return has(r, PHOTO_WAIT); }
function isQuestion(msgN, raw) {
  return /\?/.test(raw) || /\b(mi|mı|mu|mü)\b/.test(raw.toLocaleLowerCase("tr-TR")) ||
    has(msgN, ["nasil", "neden", "niye", "hangi", "nerede", "ne zaman", "kac", "ne kadar", "olur mu", "var mi", "musunuz", "mudur", "nedir", "mi acaba", "mumkun mu", "yapiyor mu", "oluyor mu"]);
}
function wordCount(s) { return s.split(" ").filter(Boolean).length; }

// Bir satır için şüphe kategorisi + not döndür (yoksa null)
function diagnose(msg, replyN, prevReplyN) {
  const raw = t(msg);
  const msgN = norm(msg);
  if (!replyN) return null;            // sessizlik (boş cevap) = kasıtlı, hata değil
  if (msgN.length < 2) return null;

  // 1) Aynı cevabı tekrar (döngü)
  if (prevReplyN && replyN === prevReplyN && msgN !== norm(prevReplyN)) {
    return { kat: "tekrar_dongu", guven: "yuksek", not: "Bir önceki cevabın AYNISINI veriyor. Müşteri farklı bir şey söylüyor ama bot aynı cevabı tekrarlıyor (döngü). Bağlamı takip etmiyor." };
  }
  // 2) Spesifik soruya alakasız foto-bekleme cevabı
  if (has(msgN, SPECIFIC) && isPhotoWait(replyN)) {
    const konu = SPECIFIC.find((k) => msgN.includes(k)) || "spesifik";
    return { kat: "spesifik_soru_alakasiz", guven: "yuksek", not: `Müşteri '${konu}' hakkında SPESİFİK bir şey soruyor ama bot genel foto-bekleme cevabı veriyor. Soru cevaplanmamış.` };
  }
  // 3) Soruya genel-geçer içeriksiz cevap
  if (isQuestion(msgN, raw) && isGeneric(replyN)) {
    return { kat: "genel_gecer_cevap", guven: "yuksek", not: "Müşteri soru soruyor ama bot 'Tabi efendim' gibi içeriksiz cevap veriyor. Soruyu anlamamış/cevaplamamış." };
  }
  // 4) Serbest/bağlamsal cümleyi anlamama (AI gerekebilir)
  if (wordCount(msgN) >= 3 && msgN.length > 15 && (isGeneric(replyN) || isPhotoWait(replyN)) && !isQuestion(msgN, raw)) {
    return { kat: "anlamadi_ai_gerekli", guven: "orta", not: "Müşteri serbest/bağlamsal bir cümle kuruyor; bot genel cevap veriyor. Anlamıyor. Bu grup deterministik kuralla çözülemez — AI gerekebilir." };
  }
  // 5) Basit soruyu/mesajı gereksiz insana atma
  if (isHandoff(replyN) && raw.length < 50 && isQuestion(msgN, raw) &&
      !has(msgN, ["kargom", "siparisim", "odedim", "odemeyi yaptim", "iade", "iptal", "gelmedi", "nerede kaldi", "takip"])) {
    return { kat: "gereksiz_insana", guven: "orta", not: "Kısa/basit bir soru ama bot insana atıyor. Cevabı sistemde olabilir; gereksiz operatör yönlendirmesi." };
  }
  return null;
}

// ── oku + işle ──
const ALIAS = { message: ["customer_message", "message", "mesaj"], conv: ["conversation_id", "conversation"], stage: ["conversation_stage", "stage"], urun: ["ilgilenilen_urun", "product"], payment: ["payment_method"], photo: ["photo_received"], back: ["back_text_status"], addr: ["address_status"], letters: ["letters_received"], order: ["order_status"], prevReply: ["assistant_reply", "ai_reply"] };
function pick(row, keys) { for (const k of keys) { for (const rk of Object.keys(row)) { if (norm(rk).replace(/\s/g, "_") === k || rk === k) { const v = t(row[rk]); if (v) return v; } } } return ""; }

const wb = XLSX.readFile(inputFile, { raw: false });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }).slice(0, limit);

console.log(`\n🔎 HATALI CEVAP TARAMASI — ${rows.length} log, şu anki V2 motor\n`);

const prevBotByConv = {};
const prevMsgsByConv = {};
const flagged = [];
const katCount = {};
let processed = 0;

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const msg = pick(r, ALIAS.message);
  if (!msg) continue;
  const conv = pick(r, ALIAS.conv) || `row_${i}`;
  const payload = {
    policy_version: "v2", message: msg,
    ilgilenilen_urun: pick(r, ALIAS.urun), user_product: pick(r, ALIAS.urun),
    conversation_stage: pick(r, ALIAS.stage), payment_method: pick(r, ALIAS.payment),
    photo_received: pick(r, ALIAS.photo), back_text_status: pick(r, ALIAS.back),
    address_status: pick(r, ALIAS.addr), letters_received: pick(r, ALIAS.letters),
    order_status: pick(r, ALIAS.order), context_lock: "1",
  };
  let reply = "";
  try { const res = await processChat(payload); reply = t(res.ai_reply); } catch { reply = "__ENGINE_ERROR__"; }
  processed++;

  const replyN = norm(reply);
  const prevReplyN = prevBotByConv[conv] || "";
  const d = reply === "__ENGINE_ERROR__"
    ? { kat: "motor_hatasi", guven: "yuksek", not: "Motor bu mesajda hata verdi (exception)." }
    : diagnose(msg, replyN, prevReplyN);

  if (d) {
    katCount[d.kat] = (katCount[d.kat] || 0) + 1;
    flagged.push({
      "Kaynak Satir": i + 2,
      "Konusma": conv,
      "Musteri Mesaji": msg,
      "Onceki 2 Musteri Mesaji": (prevMsgsByConv[conv] || []).slice(-2).join(" || "),
      "Bot Cevabi (V2)": reply || "(BOŞ/sessiz)",
      "CLAUDE NOTU": d.not,
      "Kategori": d.kat,
      "Guven": d.guven,
      "Durum": payload.conversation_stage || "boş",
      "Urun": payload.ilgilenilen_urun || "-",
      "CIHAN ONAY (Dogru/Yanlis)": "",
      "CIHAN NOTU": "",
    });
  }
  prevBotByConv[conv] = replyN;
  (prevMsgsByConv[conv] ||= []).push(msg);
  if (processed % 2000 === 0) process.stdout.write(`\r  işlenen: ${processed}/${rows.length} | şüpheli: ${flagged.length}`);
}
process.stdout.write(`\r  işlenen: ${processed}/${rows.length} | şüpheli: ${flagged.length}\n`);

// ── Excel yaz ──
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outdir = path.join(path.dirname(inputFile), "outputs", "analiz");
fs.mkdirSync(outdir, { recursive: true });
const outFile = path.join(outdir, `hatali-cevaplar-${stamp}.xlsx`);

// öncelik sırası: en net hatalar üstte
const katOrder = ["motor_hatasi", "tekrar_dongu", "spesifik_soru_alakasiz", "genel_gecer_cevap", "gereksiz_insana", "anlamadi_ai_gerekli"];
flagged.sort((a, b) => katOrder.indexOf(a.Kategori) - katOrder.indexOf(b.Kategori));

const KAT_ACIKLAMA = {
  motor_hatasi: "Motor exception verdi",
  tekrar_dongu: "Aynı cevabı tekrar veriyor (bağlam takibi yok)",
  spesifik_soru_alakasiz: "Spesifik soruya alakasız/genel cevap",
  genel_gecer_cevap: "Soruya 'Tabi efendim' gibi içeriksiz cevap",
  gereksiz_insana: "Basit soruyu gereksiz yere insana atıyor",
  anlamadi_ai_gerekli: "Serbest cümleyi anlamıyor — AI gerekebilir",
};
const ozet = [
  { "Metrik": "İşlenen log", "Deger": processed },
  { "Metrik": "Şüpheli/hatalı bulunan", "Deger": flagged.length },
  { "Metrik": "Hata oranı (%)", "Deger": ((flagged.length / processed) * 100).toFixed(1) },
  { "Metrik": "", "Deger": "" },
  ...katOrder.filter((k) => katCount[k]).map((k) => ({ "Metrik": `${k} — ${KAT_ACIKLAMA[k]}`, "Deger": katCount[k] })),
];

const wbOut = XLSX.utils.book_new();
const wsOzet = XLSX.utils.json_to_sheet(ozet);
wsOzet["!cols"] = [{ wch: 55 }, { wch: 12 }];
XLSX.utils.book_append_sheet(wbOut, wsOzet, "Ozet");

const wsFlag = XLSX.utils.json_to_sheet(flagged.length ? flagged : [{ "Bilgi": "Şüpheli bulunamadı" }]);
wsFlag["!autofilter"] = { ref: `A1:L${Math.max(flagged.length + 1, 1)}` };
wsFlag["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
wsFlag["!cols"] = [{ wch: 11 }, { wch: 14 }, { wch: 42 }, { wch: 40 }, { wch: 54 }, { wch: 60 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wbOut, wsFlag, "Hatali Cevaplar");
XLSX.writeFile(wbOut, outFile, { compression: true });

console.log(`\n✅ Bitti.`);
console.log(`   Excel: ${outFile}`);
console.log(`   Şüpheli: ${flagged.length}/${processed} (%${((flagged.length / processed) * 100).toFixed(1)})`);
for (const k of katOrder) if (katCount[k]) console.log(`   - ${k}: ${katCount[k]}`);
