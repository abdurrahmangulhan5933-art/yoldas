# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS


## Kurulum notları (Yoldaş)

1. `npm i` ardından `npm run dev`.
2. Supabase panelinde `supabase/schema.sql` dosyasını SQL Editor'de çalıştırın (tablolar, erişim kuralları, anlık güncelleme).
3. Yönetici hesabı için Supabase > Authentication > Users'tan bir kullanıcı oluşturun, ardından `supabase/schema.sql` içindeki `insert into public.admins ...` satırını kendi e-postanla bir kez çalıştırın (aksi halde haber ekleyemezsiniz). Authentication ayarlarında yeni kayıtları kapatın. Uygulamada Profil > "Yönetici girişi" ile giriş yapın.
4. Sesli odalar için sunucu ortam değişkenlerine `LIVEKIT_API_KEY` ve `LIVEKIT_API_SECRET` ekleyin (Cloudflare/Lovable yayın ayarlarında).
5. Mikrofon ve konum özellikleri yalnızca HTTPS (veya localhost) üzerinde çalışır.
6. `src/lib/site.ts` içindeki ad ve iletişim e-postasını kendi bilgilerinizle değiştirin (gizlilik politikası sayfasında görünür).
7. Google Play'e yayın için `PLAY-STORE.md` dosyasına bakın.
