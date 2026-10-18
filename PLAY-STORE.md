# Yoldaş — Google Play'e yayın rehberi

Yoldaş bir web uygulaması (TanStack Start + Supabase + LiveKit). Play Store'a doğrudan web sitesi yüklenmez; en kolay yol **TWA (Trusted Web Activity)** ile siteyi bir Android paketine (.aab) sarmaktır. Kod tarafında yapılabilen hazırlıklar bu pakette yapıldı; aşağıdaki adımlar senin hesabın/alan adın gerektirdiği için sende kalıyor.

## Kod tarafında hazır olanlar
- Gizlilik politikası ve kullanım şartları sayfası: `/gizlilik`
- Mesajlarda bildirme (bayrak) ve sürücü engelleme (kullanıcı içeriği kuralı); bildirimler `message_reports` tablosuna düşer
- Yönetici yetkisi `admins` tablosuna bağlandı (eskiden giriş yapan herkes haber yayınlayabilirdi)
- Manifest: açıklama, kategori, kısayollar, ayrı "maskable" ikonlar
- Alan uzunluğu sınırları, moderasyon için yönetici silme yetkisi

## Yayından önce senin yapacakların
1. **Alan adı**: Uygulamayı kendi alan adında HTTPS ile yayınla (Lovable > Publish, ardından özel alan adı). TWA sitenin kalıcı adresine bağlanır.
2. **Ortam**: `LIVEKIT_API_KEY` ve `LIVEKIT_API_SECRET` tanımlı olsun; `supabase/schema.sql` çalıştırılsın; `admins` satırı kendi e-postanla eklensin; Supabase'de yeni kayıtlar kapatılsın.
3. **`src/lib/site.ts`**: ad ve iletişim e-postasını gerçek bilgilerinle değiştir. Play Console'daki iletişim ve gizlilik alanlarıyla aynı olmalı.
4. **Geliştirici hesabı**: Play Console hesabı (tek seferlik ücret + kimlik doğrulama). Kişisel hesapsa yayından önce belirli sayıda test kullanıcısıyla kapalı test şartı olabilir; güncel şartı Play Console'da kontrol et.
5. **Paket üretme**: [pwabuilder.com](https://www.pwabuilder.com) veya Bubblewrap ile alan adını gir → Android paketi (.aab) oluştur. İmza anahtarını (keystore) yedekle; kaybedersen güncelleme yayınlayamazsın.
6. **Digital Asset Links**: Play Console > Uygulama bütünlüğü bölümündeki SHA-256 parmak izini `public/.well-known/assetlinks.json` dosyasına koy (PWABuilder şablonunu verir). Yoksa uygulama üstte adres çubuğuyla açılır.
7. **Mağaza girişi**: 512×512 ikon (`public/icon-512.png`), 1024×500 öne çıkan görsel, en az 2 telefon ekran görüntüsü, kısa (80 karakter) ve uzun açıklama, gizlilik politikası adresi (`https://ALANADIN/gizlilik`).
8. **Formlar**:
   - Hedef kitle: 18+, çocuklara yönelik değil.
   - İçerik derecelendirme: kullanıcılar arası sohbet/ses var, bunu doğru işaretle.
   - Veri güvenliği: ad, maskeli plaka, mesajlar, isteğe bağlı konum (dayanışma çağrısında), canlı ses iletimi; aktarım şifreli (HTTPS/WSS); silme talebi e-posta ile. Hizmet sağlayıcılar: Supabase, LiveKit. Ses kaydı yapılmıyor; formda ses verisini nasıl işaretleyeceğinden emin değilsen Play'in tanımlarını oku, kuşkuda "paylaşılıyor" olarak açıkla.
9. **Mağaza açıklamasına** "Sürüş sırasında telefonu elinize almayın" uyarısını ekle.

## Bilinen riskler
- Uygulama internetsiz çalışmaz (AGENTS.md gereği servis çalışanı yok). TWA'da bağlantı yokken tarayıcı hata sayfası görünür; basit bir çevrimdışı sayfa eklemek kalite açısından iyi olur.
- Moderasyon elle yapılıyor: `message_reports` tablosunu düzenli kontrol et, gerekirse mesajı sil. Kullanıcı içeriği olan uygulamalarda Google bu süreci sorabilir.
- LiveKit jeton adresi herkese açık; kötüye kullanım olursa LiveKit faturası artabilir. İleride giriş sistemi ve hız sınırı ekle.
- Arayüzdeki bazı yazılar çok küçük (8–10 px). Sürücü kitlesi için okunabilirlik sorunu; yayından önce büyütmek iyi olur.
- Bu pakette `npm install` ve derleme çalıştırılamadı (ortamda ağ yok). Yayından önce yerelde `npm i && npm run lint && npm test && npm run build` çalıştır.
