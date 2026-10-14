import { createFileRoute } from '@tanstack/react-router';
import { Platform } from '@/components/platform/platform';

export const Route = createFileRoute('/mesajlar')({
  head: () => ({ meta: [
    { title: 'Sürücü Sohbeti | Yoldaş' },
    { name: 'description', content: 'Yoldaki dostlarınla genel sohbette buluş, yazılı ve sesli mesajlar oluştur.' },
    { property: 'og:title', content: 'Sürücü Sohbeti | Yoldaş' },
    { property: 'og:description', content: 'Yoldaki dostlarınla genel sohbette buluş, yazılı ve sesli mesajlar oluştur.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Page,
});
function Page() { return <Platform view="messages" />; }
