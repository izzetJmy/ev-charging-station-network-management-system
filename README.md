# EV Charging Station Network Management System

Bu proje; elektrikli araç kullanıcılarının **araç profili oluşturup**, **istasyon/charger seçerek rezervasyon yapmasını**, **şarj oturumunu başlatıp maliyetini hesaplamasını** ve **geçmişini görüntülemesini** sağlar. Ayrıca bir **Admin Panel** ile istasyon/charger yönetimi ve raporlama yapılır.

## Uygulama Akışı (Kullanıcı)

- **Landing** (`/`) → uygulama tanıtım sayfası.
- **Kayıtlı Araçlar / Araç Profili** (`/app`, `/vehicles/...`)
  - Kullanıcı için yerel bir `userId` üretilir (local storage).
  - Araçlar Firestore’da `vehicles` içinde `userId` ile tutulur; kullanıcı girince sadece kendi araçları gelir.
- **İstasyon Haritası** (`/station-map`)
  - İstasyonlar Firestore’dan `stations` + `chargers` koleksiyonlarından çekilir ve birleştirilir.
  - İstasyona tıklayınca detay kartı açılır; **konum koordinat yerine adres/semt** olarak gösterilir.
  - İstasyon/charger için **Sorun Bildir** ile `reports` koleksiyonuna kayıt atılır.
- **Rezervasyon** (`/reservation`)
  - Seçilen station + charger + vehicle ile `reservations` koleksiyonuna kayıt yapılır.
- **Charging Session** (`/charging-session`)
  - Start/End batarya yüzdesi alınır (0–100, end > start).
  - Tüketim/maliyet: `consumedKwh = batteryCapacity * (end-start)/100`, `totalCost = consumedKwh * pricePerKwh`.
  - Sonuç `chargingSessions` koleksiyonuna `status: completed` ile kaydedilir.
- **Charging History** (`/charging-history`)
  - `chargingSessions` sadece seçili aracın `vehicleId`’si ile filtrelenerek listelenir.

## Firestore Veri Modeli (Özet)

- `stations`
  - `name, address, latitude, longitude, status`
  - `chargerIds: string[]` (station → charger ilişkisi)
- `chargers`
  - `stationId, type, powerOutput, connectorType, pricePerKwh, status`
- `vehicles`
  - `userId` + araç bilgileri (brand/model/battery/connector/plate/location…)
- `reservations`
  - `stationId, chargerId, vehicleId, date/time` …
- `chargingSessions`
  - `reservationId, vehicleId, stationId, chargerId, start/end %, consumedKwh, pricePerKwh, totalCost, status, createdAt`
- `reports`
  - `stationId, chargerId|null, issueType, description, createdAt`

## Admin Panel

- **Giriş**: `/admin`
- **Genel Özet / Gelir / İstasyon İstatistikleri / Raporlar**: `/admin/*`
- **İstasyon & Charger Yönetimi**: `/admin/manage`
  - İstasyon ekle/düzenle
  - Charger ekle/düzenle (Firestore’a yazar)
  - Konum seçimi: **harita veya arama ile adres/semt seçimi** (koordinat gösterilmez)
- Sol menü **sürükle-bırak** ile kişiselleştirilebilir (localStorage).

## Çalıştırma

```bash
npm install
npm run dev
```

