// Bu dosyayı api/fix-old-links.js olarak ekle
// Çalıştırmak için: GET https://manychat-ai.vercel.app/api/fix-old-links
// Tek seferlik çalıştır, sonra sil.

const KOMMO_TOKEN = process.env.KOMMO_API_TOKEN;
const KOMMO_DOMAIN = process.env.KOMMO_DOMAIN || "nakipoglu";
const API = `https://${KOMMO_DOMAIN}.kommo.com`;
const HDR = { "Authorization": `Bearer ${KOMMO_TOKEN}`, "Content-Type": "application/json" };
const ORDER_WEBHOOK_URL = process.env.GOOGLE_ORDER_WEBHOOK_URL || "";

async function kApi(method, path) {
  const r = await fetch(API + path, { method, headers: HDR });
  const t = await r.text();
  try { return { s: r.status, d: JSON.parse(t) }; } catch { return { s: r.status, d: t }; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(200).json({ error: "GET only" });
  
  try {
    // Kommo'dan tüm aktif lead'leri çek
    const results = [];
    let page = 1;
    let allLeads = [];
    
    while (page <= 10) { // Max 10 sayfa (250 lead)
      const r = await kApi("GET", `/api/v4/leads?limit=25&page=${page}&with=contacts`);
      if (r.s !== 200 || !r.d?._embedded?.leads) break;
      allLeads = allLeads.concat(r.d._embedded.leads);
      if (r.d._embedded.leads.length < 25) break;
      page++;
      await new Promise(r => setTimeout(r, 500)); // Rate limit
    }
    
    console.log(`Found ${allLeads.length} leads`);
    
    for (const lead of allLeads) {
      const leadId = lead.id;
      const contactId = lead._embedded?.contacts?.[0]?.id;
      
      if (!contactId) continue;
      
      // Contact'ın chat bilgisini çek
      try {
        const talkR = await kApi("GET", `/api/v4/talks?filter[entity_id]=${leadId}&filter[entity_type]=leads`);
        
        let chatId = "";
        if (talkR.s === 200 && talkR.d?._embedded?.talks) {
          for (const talk of talkR.d._embedded.talks) {
            if (talk.chat_id) {
              chatId = String(talk.chat_id);
              break;
            }
          }
        }
        
        if (chatId) {
          const dmLink = `https://www.instagram.com/direct/t/${chatId}/`;
          results.push({
            lead_id: leadId,
            chat_id: chatId,
            dm_link: dmLink,
            contact_name: lead._embedded?.contacts?.[0]?.name || ""
          });
          
          // Google Sheets'e güncelleme gönder
          if (ORDER_WEBHOOK_URL) {
            await fetch(ORDER_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "fix_dm_link",
                operation: "update",
                data: {
                  order_id: `open_${leadId}_lazer`,
                  customer_id: String(leadId),
                  dm_link: dmLink
                }
              })
            });
          }
        }
        
        await new Promise(r => setTimeout(r, 300)); // Rate limit
      } catch (e) {
        console.error(`Error for lead ${leadId}:`, e.message);
      }
    }
    
    return res.status(200).json({
      success: true,
      total_leads: allLeads.length,
      fixed: results.length,
      results: results.slice(0, 20) // İlk 20'yi göster
    });
    
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
