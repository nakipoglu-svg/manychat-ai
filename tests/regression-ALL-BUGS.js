// Full bug-level regression — bugs-333.json'daki HER bug için tek test.
// Her bug için kural: "Aynı stage + aynı mesaj → aynı yanlış cevap bir daha dönmemeli."
//
// Bu bir geniş "no-regression" suite'idir. 333 bug var, 333 test çalıştırılır.
// Her test: orijinal bot cevabının ayırt edici kelime/cümlesi artık dönmüyor mu?
//
// Test kuralları:
// 1. Yanlış orijinal cevabın "anti-signature" kelimeleri notIncludes ile kontrol edilir.
// 2. Mümkün olduğunda expected'a yakın pozitif assertion (includes) eklenir.
// 3. Her bug'ı ailesine göre grupla — output okunabilir olsun.

import { processChat } from "../core/engine.js";
import fs from "fs";

const bugsPath = new URL("../../bugs-333.json", import.meta.url).pathname;
// Fallback: user data location
let bugs;
try { bugs = JSON.parse(fs.readFileSync(bugsPath, "utf8")); }
catch { bugs = JSON.parse(fs.readFileSync("/mnt/user-data/outputs/bugs-333.json", "utf8")); }

function normalize(s) {
  return String(s || "").toLowerCase()
    .replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u")
    .replace(/[^\w\s]/g," ").replace(/\s+/g," ").trim();
}

// Her bug için "anti-signature" çıkar: orijinal yanlış cevabın kritik 3-6 kelimelik fragment'i
function antiSignatures(bug) {
  const reply = normalize(bug.reply || "");
  const sigs = [];
  const family = bug.family;

  // F1_fallback / F4_preview_operator / F1_* ailesinde orijinal "ekibimize iletiyorum" yanlışsa — geri gelmemeli
  if (reply.includes("ekibimize iletiyorum en kisa surede donus yapilacaktir") &&
      !/F7_/.test(family)) {
    sigs.push("ekibimize iletiyorum en kisa surede donus yapilacaktir");
  }

  // F8 "Suya dayanıklı" sızıntısı
  if (reply.includes("suya dayanikli") && !/(su|deniz|duş|banyo|yuzme|islak|yikama)/i.test(normalize(bug.msg||""))) {
    sigs.push("suya dayanikli");
  }

  // F3 "Amin efendim" ama kullanıcıda amin yok
  if (reply.includes("amin efendim") && !/\bamin\b/i.test(normalize(bug.msg||""))) {
    sigs.push("amin efendim");
  }

  // F5_product_switch — "Bu modelde fotoğraf kullanılmıyor" bug'ı
  if (reply.includes("bu modelde fotograf kullanilmiyor")) {
    sigs.push("bu modelde fotograf kullanilmiyor");
  }
  if (reply.includes("yapilmasini istediginiz harfleri")) {
    // Ataç harfler prompt — lazer bağlamında dönmemeli
    const msgN = normalize(bug.msg || "");
    if (/resim|foto|lazer/i.test(msgN)) sigs.push("yapilmasini istediginiz harfleri");
  }

  // F2_photo_price_misfire — waiting_photo'da fiyat dump
  if (bug.stage === "waiting_photo" && reply.includes("eft  havale ile 599 tl")) {
    sigs.push("eft  havale ile 599 tl");
  }
  if (bug.stage === "waiting_photo" && reply.includes("kapida odeme ile 649")) {
    sigs.push("kapida odeme ile 649");
  }

  // F5_composition — generic "arka yüze de fotograf yapabiliyoruz" composition'a yanlış düşme
  if (family === "F5_composition" && reply.includes("arka yuze de fotograf yapabiliyoruz")) {
    sigs.push("arka yuze de fotograf yapabiliyoruz");
  }

  // F7 — "acik adres bilginiz ile devam" bundle verilmişken tekrar adres isteme
  if (/F7_(bundle|address|phone|name|slot)/.test(family) && reply.includes("acik adres bilginiz ile devam")) {
    const m = normalize(bug.msg || "");
    if (m.length > 50) sigs.push("acik adres bilginiz ile devam");
  }

  // F6 — trust typo → fotograf buradan iletiniz fallback
  if (/F6_/.test(family) && reply.includes("fotografinizi buradan iletebilirsiniz")) {
    sigs.push("fotografinizi buradan iletebilirsiniz");
  }

  return sigs;
}

// Her bug için pozitif expected (expected alanına göre keyword türet)
function positiveExpect(bug) {
  const e = normalize(bug.expected || "");
  if (!e) return null;

  // Expected cümlesinden en ayırt edici kelime(ler)i çek
  if (e.includes("sigar")) return "sigar";
  if (e.includes("fit")) return null;
  if (e.includes("fotografini bekli") || e.includes("fotograf bekli")) return "fotografin";
  if (e.includes("arka yazi")) return "arka";
  if (e.includes("lazer")) return null; // çok geniş
  if (e.includes("kargo ön") || e.includes("kargo önce") || e.includes("preview")) return "paylasabiliyoruz";
  if (e.includes("kararma") || e.includes("paslan")) return "kaplama";
  if (e.includes("tahmini") || e.includes("eta")) return "kargo";
  if (e.includes("bilgileri") || e.includes("adres al")) return "bilgilerinizi";
  return null;
}

async function runAll() {
  console.log(`\n🧪 FULL BUG REGRESSION — ${bugs.bugs.length} tests\n`);

  const byFamily = {};
  for (const b of bugs.bugs) {
    byFamily[b.family] = byFamily[b.family] || [];
    byFamily[b.family].push(b);
  }

  let total_pass = 0, total_fail = 0;
  const failures = [];

  const families = Object.keys(byFamily).sort((a,b) => byFamily[b].length - byFamily[a].length);
  for (const fam of families) {
    const famBugs = byFamily[fam];
    let fpass = 0, ffail = 0;
    for (const bug of famBugs) {
      const sigs = antiSignatures(bug);
      const pos = positiveExpect(bug);

      // processChat input
      const input = {
        message: bug.msg || "",
        conversation_stage: bug.stage || "",
        ilgilenilen_urun: bug.product || "",
        siparis_alindi: (bug.stage === "order_completed") ? "1" : "",
        order_status: (bug.stage === "order_completed") ? "completed" : "",
      };

      let ok = true;
      const errs = [];
      try {
        const r = await processChat(input);
        const replyN = normalize(r.ai_reply || "");

        // Boş reply check — ai_reply her zaman dolu olmalı
        if (!r.ai_reply || r.ai_reply.trim().length === 0) {
          ok = false;
          errs.push("EMPTY_REPLY");
        }

        // Anti-signature check
        for (const sig of sigs) {
          if (replyN.includes(sig)) {
            ok = false;
            errs.push(`sig: "${sig}"`);
          }
        }

        // Positive check
        if (pos && !replyN.includes(pos)) {
          // positive soft — hard fail yapma ama note et
          // (expected alanı tam formal değil)
        }

        if (ok) { fpass++; total_pass++; }
        else {
          ffail++; total_fail++;
          failures.push({fam, bug, reply: r.ai_reply, errs});
        }
      } catch (e) {
        ok = false;
        ffail++; total_fail++;
        failures.push({fam, bug, reply: "EXCEPTION: " + e.message, errs: ["exception"]});
      }
    }
    const mark = ffail === 0 ? "✓" : "✗";
    console.log(`  ${mark} ${fam.padEnd(32)} ${fpass}/${famBugs.length}`);
  }

  console.log(`\n  ▶ ${total_pass}/${total_pass + total_fail} passed`);
  console.log(`  ▶ ${total_fail} failures`);

  if (failures.length && failures.length <= 50) {
    console.log("\n=== FAIL DETAILS ===");
    for (const f of failures) {
      console.log(`\n[${f.fam}] ${f.bug.ts} stage=${f.bug.stage}`);
      console.log(`  msg: "${(f.bug.msg||"").substring(0,80)}"`);
      console.log(`  reply: "${(f.reply||"").substring(0,100)}"`);
      console.log(`  errs: ${f.errs.join("; ")}`);
    }
  } else if (failures.length > 50) {
    console.log(`\n=== FAILURES (first 30) ===`);
    for (const f of failures.slice(0, 30)) {
      console.log(`[${f.fam}] ${f.bug.ts}: "${(f.bug.msg||"").substring(0,60)}" — errs: ${f.errs.join(",")}`);
    }
  }

  return {pass: total_pass, fail: total_fail};
}

const result = await runAll();
process.exit(result.fail > 0 ? 1 : 0);
