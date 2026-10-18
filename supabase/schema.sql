-- Yoldaş için Supabase tabloları ve erişim kuralları.
-- Supabase panelinde SQL Editor'e yapıştırıp bir kez çalıştırın.
-- Yönetici: Authentication > Users bölümünden bir kullanıcı (e-posta + şifre) oluşturun;
-- uygulamada "Profil > Yönetici girişi" ile bu hesapla giriş yapılır.

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  body text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.border_status (
  id uuid primary key default gen_random_uuid(),
  gate_name text not null,
  country text,
  wait_time text not null,
  queue_length text not null,
  clear boolean not null default false
);

create table if not exists public.radio_messages (
  id uuid primary key default gen_random_uuid(),
  channel_name text not null,
  sender_name text,
  sender_plate text,
  message text,
  audio_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.road_reports (
  id uuid primary key default gen_random_uuid(),
  location text not null check (char_length(location) <= 80),
  status text not null,
  note text check (note is null or char_length(note) <= 160),
  created_at timestamptz not null default now()
);

alter table public.news enable row level security;
alter table public.border_status enable row level security;
alter table public.radio_messages enable row level security;
alter table public.road_reports enable row level security;

-- Herkes okuyabilir
drop policy if exists "news_read" on public.news;
create policy "news_read" on public.news for select using (true);
drop policy if exists "border_read" on public.border_status;
create policy "border_read" on public.border_status for select using (true);
drop policy if exists "msg_read" on public.radio_messages;
create policy "msg_read" on public.radio_messages for select using (true);
drop policy if exists "road_read" on public.road_reports;
create policy "road_read" on public.road_reports for select using (true);

-- Yönetici listesi. ÖNEMLİ: Supabase'de herkes kayıt olabiliyorsa "giriş yapmış herkes" yönetici olurdu.
-- Bu yüzden yalnızca aşağıdaki tabloya eklenen kullanıcılar yönetici sayılır.
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security; -- politika yok: tabloya API'den erişilemez

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- Yönetici hesabını yetkilendir (e-postayı kendi yönetici e-postanla değiştirip ayrıca bir kez çalıştır):
--   insert into public.admins (user_id) select id from auth.users where email = 'SENIN_EPOSTAN@ornek.com' on conflict do nothing;
-- Ayrıca Supabase > Authentication > Sign In / Providers bölümünde "Allow new users to sign up" seçeneğini kapat.

-- Haber ve sınır durumunu yalnızca yönetici değiştirebilir
drop policy if exists "news_admin_write" on public.news;
create policy "news_admin_write" on public.news for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "border_admin_write" on public.border_status;
create policy "border_admin_write" on public.border_status for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Yönetici uygunsuz mesajı silebilir (moderasyon)
drop policy if exists "msg_admin_delete" on public.radio_messages;
create policy "msg_admin_delete" on public.radio_messages for delete to authenticated using (public.is_admin());

-- Mesaj bildirimleri (Google Play kullanıcı içeriği kuralı): herkes bildirebilir, yalnızca yönetici okur/siler
create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id text,
  channel_name text,
  message_text text check (message_text is null or char_length(message_text) <= 600),
  reason text not null default 'uygunsuz' check (char_length(reason) <= 60),
  created_at timestamptz not null default now()
);
alter table public.message_reports enable row level security;
drop policy if exists "report_insert" on public.message_reports;
create policy "report_insert" on public.message_reports for insert with check (true);
drop policy if exists "report_admin_read" on public.message_reports;
create policy "report_admin_read" on public.message_reports for select to authenticated using (public.is_admin());
drop policy if exists "report_admin_delete" on public.message_reports;
create policy "report_admin_delete" on public.message_reports for delete to authenticated using (public.is_admin());

-- Sürücüler mesaj ve yol bildirimi ekleyebilir (uzunluk sınırlı)
drop policy if exists "msg_insert" on public.radio_messages;
create policy "msg_insert" on public.radio_messages for insert with check (char_length(coalesce(message, '')) <= 600 and char_length(channel_name) <= 80 and char_length(coalesce(sender_name, '')) <= 80 and char_length(coalesce(sender_plate, '')) <= 20);
drop policy if exists "road_insert" on public.road_reports;
create policy "road_insert" on public.road_reports for insert with check (char_length(status) <= 30);

-- Anlık güncellemeler (Realtime)
alter publication supabase_realtime add table public.news;
alter publication supabase_realtime add table public.border_status;
alter publication supabase_realtime add table public.radio_messages;
alter publication supabase_realtime add table public.road_reports;

-- Hız için dizinler (çok mesaj biriktiğinde sohbet yüklemesi yavaşlamasın)
create index if not exists radio_messages_channel_created_idx on public.radio_messages (channel_name, created_at desc);
create index if not exists news_created_idx on public.news (created_at desc);
create index if not exists road_reports_created_idx on public.road_reports (created_at desc);

-- İsteğe bağlı: eski mesajları otomatik temizle (Supabase > Database > Extensions'tan pg_cron açılırsa):
--   select cron.schedule('mesaj-temizlik', '0 4 * * *', $$ delete from public.radio_messages where created_at < now() - interval '30 days' $$);
