import { createFileRoute } from '@tanstack/react-router';
import { Platform } from '@/components/platform/platform';

export const Route = createFileRoute('/araclar')({
  head: () => ({ meta: [
    { title: 'Pratik Sürücü Araçları | Yoldaş' },
    { name: 'description', content: 'Sürüş süresi sayacı ve yakıt maliyeti hesaplayıcısı.' },
    { property: 'og:title', content: 'Pratik Sürücü Araçları | Yoldaş' },
    { property: 'og:description', content: 'Sürüş süresi sayacı ve yakıt maliyeti hesaplayıcısı.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return <Platform view="tools" />; }
