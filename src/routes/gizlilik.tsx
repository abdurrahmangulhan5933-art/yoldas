import { Link, createFileRoute } from '@tanstack/react-router';
import { CONTACT_EMAIL, OWNER_NAME, POLICY_UPDATED } from '@/lib/site';

export const Route = createFileRoute('/gizlilik')({
  head: () => ({ meta: [
    { title: 'Gizlilik Politikası ve Kullanım Şartları | Yoldaş' },
    { name: 'description', content: 'Yoldaş uygulamasının hangi verileri nasıl işlediği, topluluk kuralları ve kullanım şartları.' },
    { property: 'og:title', content: 'Gizlilik Politikası | Yoldaş' },
    { property: 'og:type', content: 'website' },
  ] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-foreground" style={{ lineHeight: 1.7 }}>
      <Link to="/" className="text-sm underline text-muted-foreground">← Yoldaş’a dön</Link>
      <h1 className="mt-4 text-2xl font-bold">Gizlilik Politikası ve Kullanım Şartları</h1>
      <p className="text-sm text-muted-foreground">Son güncelleme: {POLICY_UPDATED}</p>

      <h2 className="mt-6 text-lg font-semibold">Kimiz?</h2>
      <p>Yoldaş, tır ve ağır vasıta sürücüleri için sesli telsiz odaları, sohbet, yol ve sınır bilgileri ile sürücü araçları sunan bir uygulamadır. Veri sorumlusu: {OWNER_NAME}. İletişim: <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>

      <h2 className="mt-6 text-lg font-semibold">Hangi verileri işliyoruz?</h2>
      <ul className="list-disc pl-5">
        <li><strong>Ad ve plaka:</strong> Profilinde girdiğin ad ve plaka bu cihazda saklanır. Sohbete ve sesli odaya yalnızca adın ile plakanın orta harfleri gizlenmiş hali (ör. 42 A•• 34) gönderilir.</li>
        <li><strong>Mesajlar:</strong> Sohbet kanallarına yazdığın mesajlar, adın ve maskeli plakanla birlikte sunucuda saklanır ve aynı kanaldaki sürücülere gösterilir.</li>
        <li><strong>Konum:</strong> Yalnızca “Dayanışma çağrısı” gönderirken ve izin verirsen, haritada açılan bir bağlantı olarak çağrı mesajına eklenir. “Yakınımda” aramasında konumun yalnızca harita bağlantısını oluşturmak için kullanılır, sunucumuza gönderilmez.</li>
        <li><strong>Yol bildirimleri:</strong> Gönderdiğin yer, durum ve not bilgisi herkese açık listelenir.</li>
        <li><strong>Sesli odalar:</strong> Ses canlı olarak LiveKit altyapısı üzerinden iletilir; Yoldaş sesi kaydetmez.</li>
        <li><strong>Bildirimler (şikâyet):</strong> Bir mesajı bildirirsen mesaj metni ve kanal adı moderasyon için kaydedilir.</li>
        <li><strong>Cihazda saklananlar:</strong> Belge bitiş tarihleri, evrak listesi, sefer hesaplayıcı varsayılanları ve engellediğin sürücüler yalnızca bu cihazın tarayıcı depolamasındadır; sunucuya gönderilmez.</li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold">Verileri kimlerle paylaşıyoruz?</h2>
      <p>Verilerin satılmaz, reklam amacıyla kullanılmaz. Hizmetin çalışması için şu hizmet sağlayıcıları kullanılır: Supabase (veritabanı ve anlık güncelleme), LiveKit (canlı ses), uygulamanın yayınlandığı barındırma sağlayıcısı ve harita bağlantılarını açtığında Google Haritalar.</p>

      <h2 className="mt-6 text-lg font-semibold">Saklama ve silme</h2>
      <p>Mesajlar ve yol bildirimleri hizmetin işleyişi için saklanır. Verilerinin silinmesini veya düzeltilmesini {CONTACT_EMAIL} adresinden talep edebilirsin; talebinde adını ve mesajlarındaki maskeli plakanı yaz. Cihazdaki verileri tarayıcı/uygulama verilerini temizleyerek kendin silebilirsin. Haklarını 6698 sayılı KVKK kapsamında da bu adres üzerinden kullanabilirsin.</p>

      <h2 className="mt-6 text-lg font-semibold">Sürüş güvenliği</h2>
      <p>Araç hareket halindeyken telefonu elinize almayın. Konuşmak, yazmak ve uygulamayı kullanmak için aracı güvenli bir yerde durdurun. Trafik kurallarına uymak sizin sorumluluğunuzdadır.</p>

      <h2 className="mt-6 text-lg font-semibold">Topluluk kuralları</h2>
      <p>Hakaret, tehdit, nefret söylemi, taciz, spam, reklam ve yanıltıcı ihbar yasaktır. Uygunsuz bir mesajı mesajın yanındaki bayrak simgesiyle bildirebilir, bir sürücüyü engelleyebilirsin. Kurallara uymayan içerik kaldırılabilir, kullanıcı hizmetten çıkarılabilir.</p>

      <h2 className="mt-6 text-lg font-semibold">Bilgilendirme</h2>
      <p>Haber, yol ve sınır bilgileri sürücü bildirimlerine dayanır; doğruluğu garanti edilmez ve resmî kaynakların yerine geçmez. Sefer maliyeti, belge takibi ve evrak listesi yalnızca yardımcı araçlardır; resmî belge ve mevzuat kontrolünün yerine geçmez. Acil durumlarda 112’yi arayın.</p>

      <h2 className="mt-6 text-lg font-semibold">Değişiklikler</h2>
      <p>Bu metin güncellenebilir; güncel hali bu sayfada yayınlanır.</p>
    </main>
  );
}
