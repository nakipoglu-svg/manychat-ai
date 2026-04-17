# ManyChat v8 — Son Durum

## Hızlı Başlangıç
```bash
npm install
node tests/tests.js          # Main suite (13332/13494)
node tests/regression-AILE-M.js  # AILE-M 45/45
# ... diğer regression dosyaları
```

## Değişen Dosyalar
- `core/intent-engine.js` — AILE J gate + Türkçe Unicode fix
- `core/answer-engine.js` — AILE M/O+S/N completed/ack/smalltalk handler'ları
- `core/guard-engine.js` — Flow reminder + WhatsApp guard exempt

## Yeni Test Dosyaları
- `tests/regression-AILE-M.js` (45 test)
- `tests/regression-AILE-O-S.js` (30 test)
- `tests/regression-AILE-N.js` (20 test)
- `tests/regression-AILE-B.js` (15 test)
- `tests/regression-AILE-J.js` (55 test)
- `tests/regression-AILE-YZ.js` (13 test)

**Toplam:** 178 yeni regression test, 698/698 tüm regression ✓

## Ana Metrikler
- Kat2 (heuristic-kesin) düzelme: **77/156 (%49)**
- Yeni regresyon: **0**
- Main: 13332/13494 (3 düşüş legacy mismatch)

Detaylı rapor: `FINAL_TURNOVER_RAPORU.md`
