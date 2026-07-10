#!/usr/bin/env node
/**
 * LLM-HAKEM — Yudum Jewels cevap doğruluğu değerlendirmesi
 *
 * Ne yapar: Gerçek loglardaki müşteri mesajlarını motordan geçirir, her
 * (mesaj → bot cevabı) çiftini bir LLM'e "bu cevap doğru/uygun mu?" diye
 * sordurur. Çıktı: gerçek DOĞRULUK YÜZDESİ + yanlış/kısmen cevapların Excel'i.
 *
 * NEDEN: Replay "yönlendirmeyi" ölçüyor, bu araç "cevabın DOĞRULUĞUNU" ölçer.
 *
 * ⚠️ ÇALIŞMASI İÇİN OPENAI_API_KEY GEREKİR (hakem LLM çağrısı için).
 *    Yerelde:  set OPENAI_API_KEY=sk-...   (Windows)  ya da  $env:OPENAI_API_KEY="sk-..."
 *
 * Kullanım:
 *   node scripts/eval/llm_judge.mjs                 (en sık 200 benzersiz mesaj)
 *   node scripts/eval/llm_judge.mjs --limit 500
 *   node scripts/eval/llm_judge.mjs --model gpt-5   (daha güçlü hakem)
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
let file = "logs.xlsx", limit = 200, model = process.env.JUDGE_MODEL || "gpt-5-mini";
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--file") file = argv[++i];
  else if (argv[i] === "--limit") limit = Number(argv[++i]);
  else if (argv[i] === "--model") model = argv[++i];
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("\n❌ OPENAI_API_KEY tanımlı değil — hakem LLM çağrısı yapılamaz.");
  console.error("   PowerShell: $env:OPENAI_API_KEY=\"sk-...\"  sonra tekrar çalıştır.\n");
  process.exit(1);
}
const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

// Bot cevabı üretilirken kendi AI fallback'i de aynı key'le çalışır — yani hakem,
// botu GERÇEK production davranışıyla (AI dahil) ölçer. Doğru olan budur.
const { processChat } = await import("../../core/engine.js");
const { FACTS } = await import("../../core/constants.js");

const t = (v) => String(v ?? "").trim();

// ── iş gerçeği (hakem promptuna gömülür — neyin "doğru" olduğunu bilsin) ──
const BUSINESS_TRUTH = `YUDUM JEWELS — DOĞRU CEVAP STANDARDI (hakem bu bilgilere göre değerlendirir):
ÜRÜNLER ve FİYAT: Resimli Lazer Kolye ${FACTS.fiyat.lazer} TL, Resimli Bileklik ${FACTS.fiyat.bileklik} TL, İsimli Yonca Kolye ${FACTS.fiyat.yonca} TL, Anahtarlık ${FACTS.fiyat.anahtarlik} TL, Harfli Ataç Kolye + Bileklik Hediye ${FACTS.fiyat.atac} TL, Evcil Hayvan Mezar Taşı ${FACTS.fiyat.mezar} TL.
ÖDEME: EFT/havale veya sitemizden kart; kapıda ödeme sadece nakit ve +${FACTS.kapidaEk} TL kargo tahsilat ücreti (mezar taşında kapıda YOK). IBAN: ${FACTS.iban}.
İNDİRİM: Sitede sepete 2+ ürün → toplam tutara otomatik %15. Tek üründe sabit fiyat.
MALZEME: 316L paslanmaz çelik (altın/gümüş DEĞİL, o renk seçeneği). Kararma/solma yapmaz.
KARGO: Ücretsiz (PTT). İstanbul 1-2, diğer 2-3 iş günü. Kesin tarih verilmez.
ZİNCİR: Kadın kolye ${FACTS.zincir.kadin} cm, erkek ${FACTS.zincir.erkek} cm, ataç ${FACTS.zincir.atac} cm.
İADE: Kişiye özel üretim → keyfi iade/değişim YOK; üretim kaynaklı sorunda ekip ilgilenir.
SİTE: ${FACTS.site}. Atölye: ${FACTS.adres}, fiziki mağaza/elden teslim yok.
İNSANA YÖNLENDİRME DOĞRUDUR şu durumlarda: sipariş takibi ("kargom nerede/ne zaman gelir" tamamlanmış siparişte), ödeme teyidi ("ödedim kontrol edin"), şikayet/hakaret, bayilik talebi, çözemediği özel durum.
"Fotoğrafınızı bekliyoruz / buradan iletebilirsiniz" waiting_photo aşamasında DOĞRUDUR.`;

const JUDGE_SYSTEM = `Sen Yudum Jewels müşteri hizmetleri cevaplarını denetleyen titiz bir kalite hakemisin. SADECE JSON döndür.
${BUSINESS_TRUTH}
GÖREV: Sana (MÜŞTERİ mesajı, aşama, BOT cevabı) verilir. Botun cevabı, müşterinin GERÇEK sorusuna/niyetine UYGUN ve DOĞRU mu değerlendir.
Notlar:
- Cevap müşterinin sorduğu şeyi cevaplıyorsa ve yukarıdaki gerçeklerle çelişmiyorsa → DOGRU.
- Soruyu kısmen cevaplıyor ya da eksik/gereksiz ekleme varsa → KISMEN.
- Tamamen alakasız, yanlış bilgi, soruyu görmezden gelme, ya da müşteriyi gereksiz yere insana atma → YANLIS.
- Ton/emoji fazlalığını takma; ANLAM doğruluğuna bak.
- Kısa onay/selam/teşekküre kısa nazik cevap DOGRU'dur.
ÇIKTI: {"verdict":"DOGRU|KISMEN|YANLIS","reason":"tek cümle gerekçe"}`;

async function judge(msg, stage, reply) {
  const userPrompt = `MÜŞTERİ: "${msg}"\nAŞAMA: ${stage || "yeni"}\nBOT CEVABI: "${reply}"\nDeğerlendir. JSON:`;
  try {
    const c = new AbortController(); const to = setTimeout(() => c.abort(), 30000);
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: c.signal,
      body: JSON.stringify({ model, max_completion_tokens: 300, messages: [{ role: "system", content: JUDGE_SYSTEM }, { role: "user", content: userPrompt }] }),
    });
    clearTimeout(to);
    if (!r.ok) return { verdict: "HATA", reason: `api ${r.status}` };
    const d = await r.json();
    const txt = (d.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
    let p; try { p = JSON.parse(txt); } catch { const m = txt.match(/"verdict"\s*:\s*"(\w+)"/); p = m ? { verdict: m[1], reason: txt.slice(0, 80) } : null; }
    if (!p?.verdict) return { verdict: "HATA", reason: "parse" };
    return { verdict: String(p.verdict).toUpperCase(), reason: p.reason || "" };
  } catch (e) { return { verdict: "HATA", reason: String(e).slice(0, 60) }; }
}

// ── logları oku, benzersizleştir, sıklığa göre sırala ──
const inputFile = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
const rows = XLSX.utils.sheet_to_json(XLSX.readFile(inputFile).Sheets[XLSX.readFile(inputFile).SheetNames[0]], { defval: "" });
const seen = new Map();
for (const r of rows) {
  const m = t(r.customer_message); if (!m || m.length < 3) continue;
  if (/^https?:\/\//.test(m) || /message could not be displayed/i.test(m)) continue;
  const key = m.toLocaleLowerCase("tr-TR");
  if (!seen.has(key)) seen.set(key, { msg: m, urun: t(r.ilgilenilen_urun), stage: t(r.conversation_stage), photo: t(r.photo_received), order: t(r.order_status), count: 0 });
  seen.get(key).count++;
}
const uniq = [...seen.values()].sort((a, b) => b.count - a.count).slice(0, limit);

console.log(`\n⚖️  LLM-HAKEM — ${uniq.length} benzersiz mesaj | hakem modeli: ${model}\n`);

const results = [];
const tally = { DOGRU: 0, KISMEN: 0, YANLIS: 0, HATA: 0 };
let weightedOk = 0, weightedTotal = 0;

for (let i = 0; i < uniq.length; i++) {
  const u = uniq[i];
  let reply = "";
  try {
    const res = await processChat({ message: u.msg, ilgilenilen_urun: u.urun, user_product: u.urun, conversation_stage: u.stage, photo_received: u.photo, order_status: u.order, context_lock: "1" });
    reply = t(res.ai_reply);
  } catch { reply = "(motor hatası)"; }
  const g = reply ? await judge(u.msg, u.stage, reply) : { verdict: "YANLIS", reason: "boş cevap" };
  tally[g.verdict] = (tally[g.verdict] || 0) + 1;
  weightedTotal += u.count;
  if (g.verdict === "DOGRU") weightedOk += u.count;
  else if (g.verdict === "KISMEN") weightedOk += u.count * 0.5;
  results.push({ "Sıklık": u.count, "Aşama": u.stage || "yeni", "Müşteri Mesajı": u.msg, "Bot Cevabı": reply, "Hakem": g.verdict, "Gerekçe": g.reason, "CIHAN NOTU": "" });
  if ((i + 1) % 25 === 0 || i + 1 === uniq.length) process.stdout.write(`\r  ${i + 1}/${uniq.length} | ✅${tally.DOGRU} ⚠️${tally.KISMEN} ❌${tally.YANLIS}`);
}
process.stdout.write("\n");

const graded = tally.DOGRU + tally.KISMEN + tally.YANLIS;
const accuracyByMsg = graded ? (((tally.DOGRU + tally.KISMEN * 0.5) / graded) * 100).toFixed(1) : "0";
const accuracyByTraffic = weightedTotal ? ((weightedOk / weightedTotal) * 100).toFixed(1) : "0";

// ── Excel: en kötüler üstte ──
const order = { YANLIS: 0, KISMEN: 1, HATA: 2, DOGRU: 3 };
results.sort((a, b) => (order[a.Hakem] - order[b.Hakem]) || (b["Sıklık"] - a["Sıklık"]));
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outdir = path.join(path.dirname(inputFile), "outputs", "eval");
fs.mkdirSync(outdir, { recursive: true });
const outFile = path.join(outdir, `llm-hakem-${stamp}.xlsx`);
const wb = XLSX.utils.book_new();
const ozet = [
  { "Metrik": "Değerlendirilen benzersiz mesaj", "Değer": graded },
  { "Metrik": "DOĞRU", "Değer": tally.DOGRU },
  { "Metrik": "KISMEN", "Değer": tally.KISMEN },
  { "Metrik": "YANLIŞ", "Değer": tally.YANLIS },
  { "Metrik": "Hakem hatası", "Değer": tally.HATA },
  { "Metrik": "", "Değer": "" },
  { "Metrik": "DOĞRULUK (mesaj bazlı, kısmen=0.5)", "Değer": "%" + accuracyByMsg },
  { "Metrik": "DOĞRULUK (trafik ağırlıklı)", "Değer": "%" + accuracyByTraffic },
];
const ws1 = XLSX.utils.json_to_sheet(ozet); ws1["!cols"] = [{ wch: 38 }, { wch: 12 }];
XLSX.utils.book_append_sheet(wb, ws1, "Ozet");
const ws2 = XLSX.utils.json_to_sheet(results);
ws2["!cols"] = [{ wch: 8 }, { wch: 14 }, { wch: 45 }, { wch: 55 }, { wch: 10 }, { wch: 50 }, { wch: 30 }];
ws2["!autofilter"] = { ref: `A1:G${results.length + 1}` };
ws2["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
XLSX.utils.book_append_sheet(wb, ws2, "Detay");
XLSX.writeFile(wb, outFile, { compression: true });

console.log(`\n═══ SONUÇ ═══`);
console.log(`DOĞRU: ${tally.DOGRU} | KISMEN: ${tally.KISMEN} | YANLIŞ: ${tally.YANLIS} | Hakem hatası: ${tally.HATA}`);
console.log(`\n🎯 DOĞRULUK (mesaj bazlı): %${accuracyByMsg}`);
console.log(`🎯 DOĞRULUK (trafik ağırlıklı): %${accuracyByTraffic}`);
console.log(`\n📄 Excel: ${outFile}`);
console.log(`   "Detay" sayfası — YANLIŞ/KISMEN üstte, gerekçeleriyle. İncele, CIHAN NOTU'na yaz.`);
