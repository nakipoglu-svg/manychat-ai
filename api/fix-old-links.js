import { isAuthorized } from "../lib/auth.js";

const T = process.env.KOMMO_TOKEN || "";
const API = process.env.KOMMO_API_BASE || "https://nakipoglu.kommo.com";
const HDR = { "Authorization": `Bearer ${T}`, "Content-Type": "application/json" };
const ORDER_WEBHOOK_URL = process.env.GOOGLE_ORDER_WEBHOOK_URL || "";

async function kGet(path) {
  try {
    const r = await fetch(API + path, { method: "GET", headers: HDR });
    if (r.status === 200) return await r.json();
    return { error: r.status };
  } catch (e) {
    return { error: e.message };
  }
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: "unauthorized" });
  if (!T) return res.status(200).json({ error: "KOMMO_TOKEN yok" });

  const leadsData = await kGet("/api/v4/leads?limit=10&with=contacts");
  if (!leadsData?._embedded?.leads) {
    return res.status(200).json({ error: "Lead bulunamadi", debug: JSON.stringify(leadsData).substring(0, 300) });
  }

  const leads = leadsData._embedded.leads;
  const results = [];

  for (const lead of leads.slice(0, 5)) {
    const lid = lead.id;
    const talkData = await kGet("/api/v4/talks?filter[entity_id]=" + lid + "&filter[entity_type]=leads");
    let chatId = "";

    if (talkData?._embedded?.talks) {
      for (const talk of talkData._embedded.talks) {
        if (talk.chat_id) { chatId = String(talk.chat_id); break; }
      }
    }

    results.push({
      lead_id: lid,
      contact: lead._embedded?.contacts?.[0]?.name || "",
      chat_id: chatId,
      dm_link: chatId ? "https://www.instagram.com/direct/t/" + chatId + "/" : "no_chat_id"
    });

    await new Promise(r => setTimeout(r, 200));
  }

  return res.status(200).json({ success: true, total: leads.length, results });
}
