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
  "Cihan Nakipoğlu 0505 471 35 45 Beykoz mahallesi örnek sokak no 12 daire 3 İstanbul";

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

const flows = [
  {
    name: "Lazer normal siparis akisi",
    steps: [
      {
        message: "resimli lazer kolye",
        expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo", order_status: "started" },
        includes: ["649", "Fotoğraf"],
      },
      {
        message: "https://example.com/photo.jpg",
        expect: { photo_received: "1", conversation_stage: "waiting_payment" },
        includes: ["Fotoğrafınız ulaştı", "Ödeme tercihiniz"],
      },
      {
        message: "kapıda ödeme olsun",
        expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" },
        includes: ["Ad soyad", "cep telefonu", "açık adres"],
      },
      {
        message: fullAddress,
        expect: {
          conversation_stage: "order_completed",
          order_status: "completed",
          siparis_alindi: "1",
          address_status: "received",
          phone_received: "1",
          name_received: "1",
        },
        includes: ["Siparişiniz oluşturulmuştur", "SMS"],
        notIncludes: ["profilimizde", "www.yudumjewels.com"],
      },
    ],
  },
  {
    name: "Yan soru akisi stage atlatmaz",
    steps: [
      {
        message: "resimli lazer kolye",
        expect: { ilgilenilen_urun: "lazer", conversation_stage: "waiting_photo" },
      },
      {
        message: "Zincir kaç cm?",
        expect: { conversation_stage: "waiting_photo", photo_received: "" },
        includes: ["60 cm", "55 cm"],
      },
      {
        message: "https://example.com/photo.jpg",
        expect: { photo_received: "1", conversation_stage: "waiting_payment" },
      },
      {
        message: "Kapıda kart olur mu?",
        expect: { payment_method: "", conversation_stage: "waiting_payment" },
        includes: ["kredi kartı geçerli değildir", "yalnızca nakit"],
      },
      {
        message: "Kapıda ödeme olsun",
        expect: { payment_method: "kapida_odeme", conversation_stage: "waiting_address" },
      },
    ],
  },
  {
    name: "Atac harf odeme adres akisi",
    steps: [
      {
        message: "harfli ataç kolye",
        expect: { ilgilenilen_urun: "atac", conversation_stage: "waiting_letters" },
        includes: ["549", "harf"],
      },
      {
        message: "A C N",
        expect: { letters_received: "1", conversation_stage: "waiting_payment" },
        includes: ["Harflerinizi aldım", "Ödeme tercihiniz"],
      },
      {
        message: "EFT ile ödeyeceğim",
        expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" },
        includes: ["IBAN"],
      },
      {
        message: fullAddress,
        expect: {
          conversation_stage: "order_completed",
          order_status: "completed",
          siparis_alindi: "1",
          letters_received: "1",
        },
        includes: ["Siparişiniz oluşturulmuştur"],
        notIncludes: ["profilimizde", "Fotoğraf"],
      },
    ],
  },
  {
    name: "Bileklik foto odeme adres akisi",
    steps: [
      {
        message: "resimli bileklik",
        expect: { ilgilenilen_urun: "resimli_lazer_bileklik", conversation_stage: "waiting_photo" },
      },
      {
        message: "https://example.com/photo.jpg",
        expect: { photo_received: "1", conversation_stage: "waiting_payment" },
      },
      {
        message: "EFT olsun",
        expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" },
      },
      {
        message: fullAddress,
        expect: {
          conversation_stage: "order_completed",
          order_status: "completed",
          siparis_alindi: "1",
        },
        includes: ["Siparişiniz oluşturulmuştur"],
        notIncludes: ["profilimizde"],
      },
    ],
  },
  {
    name: "Mezar tasi kapida odeme kabul etmez",
    steps: [
      {
        message: "evcil hayvan mezar taşı",
        expect: { ilgilenilen_urun: "evcil_hayvan_mezar_tasi", conversation_stage: "waiting_photo" },
      },
      {
        message: "https://example.com/photo.jpg",
        expect: { photo_received: "1", conversation_stage: "waiting_payment" },
        includes: ["Kapıda ödeme bulunmamaktadır"],
        notIncludes: ["kapıda ödeme mi olacak"],
      },
      {
        message: "kapıda ödeme olsun",
        expect: { payment_method: "", conversation_stage: "waiting_payment" },
        includes: ["kapıda ödeme bulunmamaktadır"],
      },
      {
        message: "EFT ile ödeyeceğim",
        expect: { payment_method: "eft_havale", conversation_stage: "waiting_address" },
      },
      {
        message: fullAddress,
        expect: {
          conversation_stage: "waiting_address",
          address_status: "received",
          phone_received: "1",
          name_received: "1",
          support_mode: "1",
        },
        includes: ["tasarım sürecini başlatacaktır"],
        notIncludes: ["Siparişiniz oluşturulmuştur"],
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
