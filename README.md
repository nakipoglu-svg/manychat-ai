# Yudum Jewels Bot

ManyChat / Kommo / Vercel satis asistani.

## Aktif Bilgi Sistemi

Canli bilgi kaynagi `knowledge/01-30` dosyalaridir. Eski knowledge ve eski regression dosyalari proje disina arsivlenmistir.

Aktif cevap akisi:

- `api/*` endpointleri
- `core/engine.js`
- `core/answer-engine.js`
- `core/guard-engine.js`

Eski motor/rule mimarisi proje disinda `work/archive-unused/manychat-ai-main-legacy-engine-unused` altina tasinmistir.

## Test

```bash
npm test
```

Bu komut guncel knowledge regression testlerini calistirir.

Ek smoke test:

```bash
node tests/smoke.js
```

## Vercel

Ana endpointler:

- `/api/kommo-webhook`
- `/api/chat`
- `/api/test-chat`
- `/api/meta-webhook`
- `/api/operator-sync`
- `/api/fix-old-links`

Gerekli environment degiskenleri icin `.env.example` dosyasina bak.

## Notlar

- WhatsApp numarasi sadece musteri sorarsa verilir.
- Siparis oncesi on izleme yoktur.
- Bitmis urun fotografi paylasilmaz.
- Kargo PTT ile gider; kargoya verilince SMS gelir.
- Urunler altin/gumus degil, 316L kalite celiktir.
