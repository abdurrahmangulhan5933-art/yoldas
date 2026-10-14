import { createFileRoute } from '@tanstack/react-router';
import { Platform } from '@/components/platform/platform';

export const Route = createFileRoute('/yol-durumu')({
  head: () => ({ meta: [
    { title: 'Yol ve Sınır Durumu | Yoldaş' },
    { name: 'description', content: 'Kapıkule, Hamzabeyli ve İpsala için örnek bekleme süreleri ve yol bildirimleri.' },
    { property: 'og:title', content: 'Yol ve Sınır Durumu | Yoldaş' },
    { property: 'og:description', content: 'Kapıkule, Hamzabeyli ve İpsala için örnek bekleme süreleri ve yol bildirimleri.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return <Platform view="roads" />; }
