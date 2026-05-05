# Architecture Notes

Bu dosya; proje yapısını daha detaylı hatırlamak için kısa “teknik not” olarak tutulur.

## Ekranlar (yüksek seviye)

- Landing: `/`
- User:
  - Kayıtlı Araçlar: `/app`
  - Araç Ekle: `/vehicles/new` (ve `/register-vehicle`)
  - Araç Güncelle: `/vehicles/:vehicleId/edit`
  - İstasyon Haritası: `/station-map`
  - Rezervasyon: `/reservation`
  - Charging Session: `/charging-session`
  - Charging History: `/charging-history`
- Admin:
  - Login: `/admin`
  - Layout altında:
    - Dashboard: `/admin/dashboard`
    - Raporlar: `/admin/reports`
    - Gelir: `/admin/revenue`
    - İstasyon İstatistikleri: `/admin/stations`
    - İstasyon/Charger Yönetimi: `/admin/manage`

## Firestore Koleksiyonları (özet)

- `stations`
  - `name, address, latitude, longitude, status`
  - `chargerIds: string[]` (station → charger ilişkisi)
- `chargers`
  - `stationId, type, powerOutput, connectorType, pricePerKwh, status`
- `vehicles`
  - `userId` + araç alanları (brand/model/battery/connector/plate/location…)
- `reservations`
  - `stationId, chargerId, vehicleId, reservationDate/reservationTime` …
- `chargingSessions`
  - `reservationId, vehicleId, stationId, chargerId`
  - `startBatteryPercentage, endBatteryPercentage`
  - `consumedKwh, pricePerKwh, totalCost`
  - `status: completed`, `createdAt`
- `reports`
  - `stationId, chargerId|null, issueType, description, createdAt`

## İlişkiler

- Station ↔ Charger:
  - Station doc’unda `chargerIds` tutulur.
  - Charger doc’unda `stationId` tutulur.
  - Uygulama tarafında `getStationsWithChargers()` ile join yapılır (önce `chargerIds`, yoksa `stationId` fallback).

## Hesaplama (Charging Session)

- `consumedKwh = batteryCapacity * (end-start) / 100`
- `totalCost = consumedKwh * pricePerKwh`

