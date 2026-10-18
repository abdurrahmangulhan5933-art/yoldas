import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/gundem')({
  head: () => ({ meta: [
    { title: 'Yol Gündemi | Yoldaş' },
    { name: 'description', content: 'Nakliye sektöründen haberler, akaryakıt ve takograf gündemi.' },
    { property: 'og:title', content: 'Yol Gündemi | Yoldaş' },
    { property: 'og:description', content: 'Nakliye sektöründen haberler, akaryakıt ve takograf gündemi.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return null; }
