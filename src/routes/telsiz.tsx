import { createFileRoute } from '@tanstack/react-router';
import { Platform } from '@/components/platform/platform';

export const Route = createFileRoute('/telsiz')({
  head: () => ({ meta: [
    { title: 'Canlı Telsiz | Yoldaş' },
    { name: 'description', content: 'Bölgesel telsiz kanallarını keşfet. E-5, Kapıkule, Avrupa ve gece sürüşü odaları.' },
    { property: 'og:title', content: 'Canlı Telsiz | Yoldaş' },
    { property: 'og:description', content: 'Bölgesel telsiz kanallarını keşfet. E-5, Kapıkule, Avrupa ve gece sürüşü odaları.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return <Platform view="radio" />; }
