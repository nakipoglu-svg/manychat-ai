import { processChat } from "../core/engine.js";

const KEEP_FIELDS = [
  "ilgilenilen_urun",
  "user_product",
  "context_lock",
  "conversation_stage",
  "photo_received",
  "payment_method",
  "order_status",
  "back_text_status",
  "address_status",
  "support_mode",
  "support_mode_reason",
  "siparis_alindi",
  "letters_received",
  "phone_received",
  "name_received",
  "reply_class",
];

const fullAddress =
  "Cihan Nakipoğlu 0505 471 35 45 Beykoz mahallesi çınar sokak no 12 daire 3 İstanbul";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickState(out) {
  const next = {};
  for (const key of KEEP_FIELDS) next[key] = out[key] || "";
  return next;
}

async function runFlow(name, steps) {
  let state = {};
  const failures = [];

  for (const [index, step] of steps.entries()) {
    const res = await processChat({ ...state, message: step.message });
    const reply = res.ai_reply || "";
    const replyN = norm(reply);
    const prefix = `${name} #${index + 1} "${step.message}"`;

    if (step.expect) {
      for (const [key, value] of Object.entries(step.expect)) {
        if ((res[key] || "") !== value) {
          failures.push(`${prefix}: ${key} exp="${value}" got="${res[key] || ""}"`);
        }
      }
    }

    if (step.includes) {
      for (const text of [].concat(step.includes)) {
        if (!replyN.includes(norm(text))) {
          failures.push(`${prefix}: missing "${text}" in "${reply.slice(0, 120)}"`);
        }
      }
    }

    if (step.notIncludes) {
      for (const text of [].concat(step.notIncludes)) {
        if (replyN.includes(norm(text))) {
          failures.push(`${prefix}: forbidden "${text}" in "${reply.slice(0, 120)}"`);
        }
      }
    }

    state = pickState(res);
  }

  return failures;
}

// ── DM→SİTE PİVOTU: bot artık DM'den sipariş ALMAZ. Her sipariş adımı siteye yönlenir;
//    "Fotoğrafınız ulaştı / Ad soyad / Siparişiniz oluşturuldu / Adres alındı" ARTIK YOK. ──
const flows = [
  {
    name: "Ürün ilgisi ve sipariş adımları siteye yönlenir",
    steps: [
      {
        message: "resimli lazer kolye",
        includes: ["web sitemiz üzerinden", "üyelik gerektirmeden", "yudumjewels.com"],
      },
      {
        message: "https://example.com/photo.jpg",
        includes: ["Fotoğrafınız için teşekkürler", "üyelik gerektirmeden", "yudumjewels.com"],
        notIncludes: ["Fotoğrafınız ulaştı", "Ödeme tercihiniz"],
      },
      {
        message: "kapıda ödeme olsun",
        includes: ["web sitemiz üzerinden", "üyelik gerektirmeden"],
        notIncludes: ["Ad soyad", "açık adres bilgilerinizi"],
      },
      {
        message: fullAddress,
        includes: ["web sitemiz üzerinden", "üyelik gerektirmeden"],
        notIncludes: ["Bilgilerinizi aldım", "Siparişiniz oluşturulmuştur", "Adres bilginizi aldım"],
      },
    ],
  },
  {
    name: "Yan sorular eskisi gibi cevaplanir (siteye ezilmez)",
    steps: [
      { message: "resimli lazer kolye", includes: ["yudumjewels.com"] },
      { message: "Zincir kaç cm?", includes: ["60 cm"], notIncludes: ["üyelik gerektirmeden"] },
      { message: "Kararma yapar mı?", includes: ["316L", "paslanmaz çelik"], notIncludes: ["üyelik gerektirmeden"] },
      { message: "Arkalı önlü olur mu?", includes: ["arka yüz"], notIncludes: ["üyelik gerektirmeden"] },
      { message: "Ne kadar sürede gelir?", includes: ["iş günü"], notIncludes: ["üyelik gerektirmeden"] },
    ],
  },
  {
    name: "Foto atinca slot cevabi degil site yonlendirme",
    steps: [
      {
        message: "https://example.com/photo.jpg",
        includes: ["Fotoğrafınız için teşekkürler", "yudumjewels.com"],
        notIncludes: ["Fotoğrafınız ulaştı", "Hangi ürünümüz", "Ödeme tercihiniz"],
      },
    ],
  },
  {
    name: "Adres/telefon yazinca alindi demez siteye yonlendirir",
    steps: [
      {
        message: fullAddress,
        includes: ["web sitemiz üzerinden", "yudumjewels.com"],
        notIncludes: ["Bilgilerinizi aldım", "Adres bilginizi aldım", "Telefon numaranızı", "Siparişiniz oluşturulmuştur"],
      },
    ],
  },
  {
    name: "Siteden yapamiyorum insana gider (siteye degil)",
    steps: [
      { message: "resimli lazer kolye", includes: ["yudumjewels.com"] },
      {
        message: "Ben siteden yapamıyorum yardım eder misiniz",
        includes: ["ekibimize iletiyorum"],
        notIncludes: ["üyelik gerektirmeden"],
      },
    ],
  },
];

console.log(`\n🧪 CURRENT_KNOWLEDGE_FLOWS — ${flows.length} flows\n`);

let failed = [];
let failedFlows = 0;
for (const flow of flows) {
  const failures = await runFlow(flow.name, flow.steps);
  if (failures.length) {
    console.log(`  ✗ ${flow.name}`);
    failedFlows++;
    failed = failed.concat(failures);
  } else {
    console.log(`  ✓ ${flow.name}`);
  }
}

console.log(`\n  ▶ ${flows.length - failedFlows}/${flows.length} flows passed\n`);

if (failed.length) {
  for (const failure of failed) console.log(`     ${failure}`);
  process.exit(1);
}
