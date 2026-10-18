import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Yoldaş — Yolun açık, telsizin açık' },
    { name: 'description', content: 'Tır ve ağır vasıta sürücüleri için telsiz kanalları, yol gündemi ve sınır kapısı durumu.' },
    { property: 'og:title', content: 'Yoldaş — Yolun açık, telsizin açık' },
    { property: 'og:description', content: 'Tır ve ağır vasıta sürücüleri için telsiz kanalları, yol gündemi ve sınır kapısı durumu.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return null; }
