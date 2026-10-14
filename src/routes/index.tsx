import { createFileRoute } from '@tanstack/react-router';
import { Platform } from '@/components/platform/platform';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Yoldaş — Yolun açık, telsizin açık' },
    { name: 'description', content: 'Tır ve ağır vasıta sürücüleri için telsiz kanalları, yol gündemi ve sürücü araçları.' },
    { property: 'og:title', content: 'Yoldaş — Yolun açık, telsizin açık' },
    { property: 'og:description', content: 'Tır ve ağır vasıta sürücüleri için telsiz kanalları, yol gündemi ve sürücü araçları.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return <Platform view="home" />; }
