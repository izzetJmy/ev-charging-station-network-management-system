# EV Charging Station Network Management System

Bu proje; elektrikli araç kullanıcılarının **araç profili** oluşturup, **istasyon/charger** seçerek **rezervasyon** yapmasını, **şarj oturumunu** tamamlayıp **maliyet** hesaplamasını ve **geçmiş** kayıtlarını görmesini sağlar. Admin tarafında ise istasyon/charger yönetimi ve raporlama ekranları bulunur.

## Kısaca Mantık

- Kullanıcıya cihaz bazlı yerel bir `userId` üretilir; araçlar Firestore’da `vehicles` içinde `userId` ile ilişkilidir (kullanıcı sadece kendi araçlarını görür).
- İstasyon verisi Firestore’dan gelir: `stations` + `chargers` koleksiyonları uygulamada birleştirilir (station → `chargerIds` / charger → `stationId`).
- Akış: **Araç seç → Haritada istasyon seç → Rezervasyon → Charging Session → Charging History**.
- Sorun bildirimi: İstasyon/charger için `reports` koleksiyonuna kayıt atılır.
- Admin panel: özet/raporlar/istatistikler + istasyon/charger ekleme-düzenleme (konum seçimi harita/arama ile, koordinat gösterilmez).

## Çalıştırma

```bash
npm install
npm run dev
```

## Geliştiriciler

Arda Ferad, Ecesu Kocaerler, İsmail Varol, İzzet Jumaev

