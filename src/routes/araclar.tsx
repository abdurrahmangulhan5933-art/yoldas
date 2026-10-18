import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/araclar')({
  head: () => ({ meta: [
    { title: 'Sürücü Araçları | Yoldaş' },
    { name: 'description', content: 'Yakınımda akaryakıt ve TIR parkı ara, sefer maliyeti hesapla, belge bitiş tarihlerini ve sınır evraklarını takip et.' },
    { property: 'og:title', content: 'Sürücü Araçları | Yoldaş' },
    { property: 'og:description', content: 'Yakınımda ara, sefer maliyeti hesapla, belge ve evrak takibi yap.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return null; }
