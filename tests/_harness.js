import { processChat } from "../core/engine.js";

// Common test harness — used by all regression-F*.js suites
export async function runSuite(suiteName, cases) {
  console.log(`\n🧪 ${suiteName} — ${cases.length} tests\n`);
  let pass = 0, fail = 0;
  const failures = [];

  function norm(s) {
    return String(s || "").toLowerCase()
      .replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u")
      .replace(/[^\w\s]/g," ").replace(/\s+/g," ").trim();
  }

  for (const t of cases) {
    const res = await processChat(t.input);
    const reply = res.ai_reply || "";
    const replyN = norm(reply);
    let ok = true;
    const errs = [];

    if (t.includes) {
      for (const s of [].concat(t.includes)) {
        if (!replyN.includes(norm(s))) { ok = false; errs.push(`missing: "${s}"`); }
      }
    }
    if (t.notIncludes) {
      for (const s of [].concat(t.notIncludes)) {
        if (replyN.includes(norm(s))) { ok = false; errs.push(`forbidden: "${s}"`); }
      }
    }
    if (t.expect) {
      for (const [k, v] of Object.entries(t.expect)) {
        if (res[k] !== v) { ok = false; errs.push(`${k}: exp="${v}" got="${res[k]}"`); }
      }
    }
    if (t.intentIn) {
      if (!t.intentIn.includes(res.last_intent)) { ok = false; errs.push(`intent: got="${res.last_intent}" not in [${t.intentIn.join(",")}]`); }
    }

    if (ok) {
      pass++;
      console.log(`  ✓ ${t.name}`);
    } else {
      fail++;
      failures.push({ name: t.name, reply, errs });
      console.log(`  ✗ ${t.name}`);
      errs.forEach(e => console.log(`     ${e}`));
      console.log(`     reply: "${reply.slice(0, 100)}"`);
    }
  }

  console.log(`\n  ▶ ${pass}/${pass + fail} passed\n`);
  return { pass, fail, failures };
}
