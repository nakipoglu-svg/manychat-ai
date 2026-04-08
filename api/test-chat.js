// /api/test-chat.js — Tarayıcıdan test endpoint'i
// GET ile açınca form gösterir, POST ile chat engine'i çağırır

import { processChat } from "../core/engine.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(`<!DOCTYPE html>
<html><head><title>Chat V2 Test</title>
<style>
  body { font-family: system-ui; max-width: 700px; margin: 40px auto; padding: 0 20px; background: #111; color: #eee; }
  input, select, button { padding: 8px 12px; border-radius: 6px; border: 1px solid #444; background: #222; color: #eee; font-size: 14px; }
  input[type=text] { width: 100%; margin: 4px 0; }
  button { background: #2563eb; border: none; color: white; cursor: pointer; font-weight: bold; }
  button:hover { background: #1d4ed8; }
  pre { background: #1a1a2e; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; white-space: pre-wrap; }
  .row { display: flex; gap: 8px; align-items: center; margin: 4px 0; }
  .row label { min-width: 140px; font-size: 13px; color: #aaa; }
  h3 { color: #60a5fa; margin-top: 24px; }
  .reply { background: #1a2e1a; padding: 12px; border-radius: 8px; font-size: 15px; margin: 8px 0; border-left: 3px solid #22c55e; }
  .meta { font-size: 12px; color: #888; }
</style>
</head><body>
<h2>Chat V2 Test</h2>
<div>
  <div class="row"><label>Mesaj:</label><input type="text" id="msg" value="merhaba" autofocus></div>
  <div class="row"><label>Ürün:</label><select id="prod"><option value="">Yok</option><option value="lazer">Lazer</option><option value="atac">Ataç</option></select></div>
  <div class="row"><label>Stage:</label><select id="stage"><option value="">Yok</option><option value="waiting_photo">waiting_photo</option><option value="waiting_back_text">waiting_back_text</option><option value="waiting_letters">waiting_letters</option><option value="waiting_payment">waiting_payment</option><option value="waiting_address">waiting_address</option><option value="order_completed">order_completed</option></select></div>
  <div class="row"><label>photo_received:</label><select id="photo"><option value="">Hayır</option><option value="1">Evet</option></select></div>
  <div class="row"><label>back_text_status:</label><select id="bt"><option value="">Yok</option><option value="received">received</option><option value="skipped">skipped</option></select></div>
  <div class="row"><label>payment_method:</label><select id="pay"><option value="">Yok</option><option value="eft_havale">EFT</option><option value="kapida_odeme">Kapıda</option></select></div>
  <div class="row"><label>letters_received:</label><select id="let"><option value="">Hayır</option><option value="1">Evet</option></select></div>
  <div class="row"><label>order_status:</label><select id="os"><option value="">Yok</option><option value="started">started</option><option value="completed">completed</option></select></div>
  <div class="row"><label>siparis_alindi:</label><select id="sa"><option value="">Hayır</option><option value="1">Evet</option></select></div>
  <div class="row"><label>address_status:</label><select id="addr"><option value="">Yok</option><option value="address_only">address_only</option><option value="received">received</option></select></div>
  <div class="row"><label>phone_received:</label><select id="ph"><option value="">Hayır</option><option value="1">Evet</option></select></div>
  <div class="row"><label>menu_gosterildi:</label><select id="menu"><option value="">Hayır</option><option value="evet">Evet</option></select></div>
  <br>
  <button onclick="send()">Gönder</button>
</div>
<div id="out"></div>
<script>
async function send() {
  const body = {
    message: document.getElementById('msg').value,
    ilgilenilen_urun: document.getElementById('prod').value,
    conversation_stage: document.getElementById('stage').value,
    photo_received: document.getElementById('photo').value,
    back_text_status: document.getElementById('bt').value,
    payment_method: document.getElementById('pay').value,
    letters_received: document.getElementById('let').value,
    order_status: document.getElementById('os').value,
    siparis_alindi: document.getElementById('sa').value,
    address_status: document.getElementById('addr').value,
    phone_received: document.getElementById('ph').value,
    menu_gosterildi: document.getElementById('menu').value,
    context_lock: document.getElementById('prod').value ? "1" : "",
  };
  document.getElementById('out').innerHTML = '<p style="color:#888">Gönderiliyor...</p>';
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const d = await r.json();
    const meta = d._meta || {};
    document.getElementById('out').innerHTML = 
      '<h3>Cevap</h3>' +
      '<div class="reply">' + (d.ai_reply || '(boş)') + '</div>' +
      '<div class="meta">Rule: ' + (meta.selectedRule||'?') + ' | Intent: ' + (d.last_intent||'?') + ' | Source: ' + (meta.replySource||'?') + '</div>' +
      '<h3>State</h3><pre>' + JSON.stringify({
        ilgilenilen_urun: d.ilgilenilen_urun,
        conversation_stage: d.conversation_stage,
        order_status: d.order_status,
        photo_received: d.photo_received,
        back_text_status: d.back_text_status,
        payment_method: d.payment_method,
        address_status: d.address_status,
        letters_received: d.letters_received,
        phone_received: d.phone_received,
        siparis_alindi: d.siparis_alindi,
        reply_class: d.reply_class,
        support_mode: d.support_mode,
      }, null, 2) + '</pre>' +
      '<h3>Full Response</h3><pre>' + JSON.stringify(d, null, 2) + '</pre>';
  } catch(e) {
    document.getElementById('out').innerHTML = '<pre style="color:red">' + e.message + '</pre>';
  }
}
document.getElementById('msg').addEventListener('keydown', e => { if(e.key==='Enter') send(); });
</script>
</body></html>`);
  }

  // POST — normal chat
  if (req.method === "POST") {
    const result = await processChat(req.body || {});
    return res.status(200).json(result);
  }

  return res.status(200).json({ error: "Use GET for test UI or POST for API" });
}
