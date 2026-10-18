import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Bell, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Coffee, Compass, Headphones, LayoutGrid, Loader2, MapPin, MessageSquare, Mic, MicOff, Moon, MoreHorizontal, Navigation, Newspaper, Pause, Play, Plus, Radio, Search, Send, ShieldCheck, Signal, Siren, Trash2, Truck, User, Users, Volume2, VolumeX, Wrench, X, Flag, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import truckImage from '@/assets/truck-road.jpg';
import { linkify } from '@/lib/driver-tools';
import { NearbyPanel, ToolsPage } from './tools';
import { supabase } from '../../supabase';
import { getLiveKitToken } from '../../lib/livekit-actions';
import { Room, RoomEvent, type RemoteTrack } from 'livekit-client';

export type View = 'home' | 'radio' | 'messages' | 'news' | 'roads' | 'tools';
type NewsItem = { id: string; category: string; title: string; body: string; image_url?: string | null; created_at?: string };
type ChatMessage = { id?: string | number; channel_name: string; sender_name?: string | null; sender_plate?: string | null; message?: string | null; audio_url?: string | null; created_at?: string };
type Border = { id?: string | number; gate_name: string; country?: string | null; wait_time: string; queue_length: string; clear?: boolean };
type RoadReport = { id?: string | number; location: string; status: string; note?: string | null; created_at?: string };
type Dlg = 'help' | 'notifications' | 'profile' | 'radio' | 'support' | 'terms' | null;

const LIVEKIT_URL = 'wss://yoldas-cf6u5588.livekit.cloud';

const navigation = [
  { to: '/', label: 'Genel Bakış', icon: LayoutGrid, view: 'home' },
  { to: '/telsiz', label: 'Canlı Telsiz', icon: Radio, view: 'radio' },
  { to: '/mesajlar', label: 'Mesajlar', icon: MessageSquare, view: 'messages' },
  { to: '/gundem', label: 'Yol Gündemi', icon: Newspaper, view: 'news' },
  { to: '/yol-durumu', label: 'Yol & Sınır', icon: MapPin, view: 'roads' },
  { to: '/araclar', label: 'Sürücü Araçları', icon: Wrench, view: 'tools' },
] as const;

const initialChannels = [
  { id: 'e5', name: 'E-5 / TEM Hattı', subtitle: 'Yolun nabzı burada atıyor.', icon: Navigation, tone: '' },
  { id: 'kapikule', name: 'Kapıkule Sınır Kapısı', subtitle: 'Sınırdan en güncel bilgiler.', icon: Truck, tone: 'green' },
  { id: 'avrupa', name: 'Avrupa Rotaları', subtitle: 'Uzak yollar, yakın dostluklar.', icon: Compass, tone: '' },
  { id: 'gece', name: 'Gece Sürüşü', subtitle: 'Geceye birlikte yol alıyoruz.', icon: Moon, tone: 'amber' },
  { id: 'anadolu', name: 'Anadolu Yolları', subtitle: 'Memleketin dört bir yanından.', icon: MapPin, tone: 'green' },
  { id: 'mola', name: 'Mola Yeri Sohbetleri', subtitle: 'Çaylar hazır, sohbet koyu.', icon: Coffee, tone: 'amber' },
];

const pageTitles: Record<View, [string, string]> = {
  home: ['Yolun açık olsun, Yoldaş', 'Yolun gündemi, telsizin sesi, dostların burada.'],
  radio: ['Canlı Telsiz', 'Aynı yolda, aynı frekanstayız.'],
  messages: ['Mesajlar', 'Yoldaki dostlarından haber var.'],
  news: ['Yol Gündemi', 'Sektörden ve yollardan öne çıkanlar.'],
  roads: ['Yol & Sınır Durumu', 'Rotanı planla, yolun açık olsun.'],
  tools: ['Sürücü Araçları', 'Yakınımda ara, sefer maliyetini hesapla, belgelerini takip et.'],
};

/** Plakanın ortasını gizler: "42 ABC 34" -> "42 A•• 34". Veritabanına ve odaya yalnızca bu hali gider. */
function maskPlate(plate: string) {
  const parts = plate.trim().toUpperCase().split(/\s+/);
  if (parts.length === 3 && parts[1] && parts[1].length > 1) return `${parts[0]} ${parts[1].slice(0, 1)}${'•'.repeat(parts[1].length - 1)} ${parts[2]}`;
  return plate.trim().toUpperCase();
}

/* ---------- profil (ad + plaka) ---------- */
type Profile = { name: string; plate: string };
function readProfile(): Profile {
  if (typeof window === 'undefined') return { name: '', plate: '' };
  try { return { name: localStorage.getItem('yoldas_user_name') ?? '', plate: localStorage.getItem('yoldas_user_plate') ?? '' }; } catch { return { name: '', plate: '' }; }
}
function useProfile() {
  const [profile, setProfile] = useState<Profile>({ name: '', plate: '' });
  useEffect(() => {
    const sync = () => setProfile(readProfile());
    sync();
    window.addEventListener('yoldas-profile', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('yoldas-profile', sync); window.removeEventListener('storage', sync); };
  }, []);
  const save = (name: string, plate: string) => {
    try { localStorage.setItem('yoldas_user_name', name.trim()); localStorage.setItem('yoldas_user_plate', plate.trim().toUpperCase()); } catch { /* özel mod */ }
    window.dispatchEvent(new Event('yoldas-profile'));
  };
  return { profile, save };
}

function Avatar({ children, className = '' }: { children: ReactNode; className?: string }) { return <span className={`avatar ${className}`}>{children}</span>; }
function SectionHeading({ icon, title, count, to, action = 'Tümünü gör' }: { icon: ReactNode; title: string; count?: string; to?: '/' | '/telsiz' | '/gundem' | '/yol-durumu'; action?: string }) {
  return <div className="section-heading"><h2>{icon}{title}{count && <span className="count">{count}</span>}</h2>{to && <Link to={to} className="text-action">{action}<ArrowRight /></Link>}</div>;
}
function initials(name?: string | null) { return name ? name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase() : 'YD'; }

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) { a.pause(); setIsPlaying(false); } else { a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false)); }
  };
  return (
    <div className="audio-player">
      <audio ref={audioRef} src={src} preload="metadata" onTimeUpdate={() => { const a = audioRef.current; if (a && isFinite(a.duration) && a.duration > 0) setProgress((a.currentTime / a.duration) * 100); }} onEnded={() => { setIsPlaying(false); setProgress(0); }} />
      <Button type="button" variant="ghost" size="icon" aria-label={isPlaying ? 'Duraklat' : 'Oynat'} onClick={togglePlay} className="audio-play">{isPlaying ? <Pause size={13} /> : <Play size={13} />}</Button>
      <div className="audio-bar"><div style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

export function Platform({ view = 'home' }: { view?: View }) {
  const [channel, setChannel] = useState(0);
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [talking, setTalking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(65);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<Dlg>(null);
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [remoteCount, setRemoteCount] = useState(0);
  const [notice, setNotice] = useState('');
  const [todayLabel, setTodayLabel] = useState('');
  const [seenNews, setSeenNews] = useState('');
  const [consent, setConsent] = useState(true);
  const pendingAction = useRef<(() => void) | null>(null);

  const roomRef = useRef<Room | null>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef(65);
  const mutedRef = useRef(false);
  const noticeTimer = useRef<number | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);
  const { profile, save: saveProfile } = useProfile();

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [secretClicks, setSecretClicks] = useState(0);

  const [showAddNews, setShowAddNews] = useState(false);
  const [newsCategory, setNewsCategory] = useState('AKARYAKIT');
  const [newsTitle, setNewsTitle] = useState('');
  const [newsBody, setNewsBody] = useState('');
  const [newsImage, setNewsImage] = useState('');
  const [newsError, setNewsError] = useState('');
  const [newsBusy, setNewsBusy] = useState(false);

  const [pName, setPName] = useState('');
  const [pPlate, setPPlate] = useState('');
  const [helpState, setHelpState] = useState<{ busy: boolean; done: string; error: string }>({ busy: false, done: '', error: '' });

  const flash = (msg: string) => {
    setNotice(msg);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 5000);
  };
  const channelName = initialChannels[channel]?.name ?? 'E-5 / TEM Hattı';

  /* tarih (sunucu/istemci uyuşmazlığı olmasın diye efektte) */
  useEffect(() => { setTodayLabel(new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })); }, []);

  useEffect(() => {
    try { setSeenNews(localStorage.getItem('yoldas_news_seen') ?? ''); setConsent(localStorage.getItem('yoldas_terms') === '1'); } catch { /* özel mod */ }
  }, []);
  const latestNews = newsList[0]?.created_at ?? '';
  const hasUnread = !!latestNews && latestNews > seenNews;
  const openNotifications = () => {
    setDialog('notifications');
    if (latestNews) { setSeenNews(latestNews); try { localStorage.setItem('yoldas_news_seen', latestNews); } catch { /* özel mod */ } }
  };
  /** Sesli oda, sohbet ve çağrıdan önce kullanım şartları bir kez onaylatılır. */
  const requireConsent = (action: () => void) => {
    if (consent) return true;
    pendingAction.current = action; setDialog('terms'); return false;
  };
  const acceptTerms = () => {
    try { localStorage.setItem('yoldas_terms', '1'); } catch { /* özel mod */ }
    setConsent(true); setDialog(null);
    const run = pendingAction.current; pendingAction.current = null; if (run) run();
  };

  /* yönetici: Supabase Auth oturumu */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAdmin(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setIsAdmin(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* klavye kısayolları */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); setShowAdminLogin(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  /* haberler */
  const fetchNews = async () => {
    const { data, error } = await supabase.from('news').select('*').order('created_at', { ascending: false }).limit(40);
    if (!error && data) setNewsList(data as NewsItem[]);
  };
  useEffect(() => {
    void fetchNews();
    const ch = supabase.channel('public:news').on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => { void fetchNews(); }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  /* ses seviyesi / sessize alma gerçekten uygulanır */
  useEffect(() => {
    volumeRef.current = volume; mutedRef.current = muted;
    audioContainerRef.current?.querySelectorAll('audio').forEach(a => { a.volume = volume / 100; a.muted = muted; });
  }, [volume, muted]);

  /* sayfadan çıkınca odadan ayrıl */
  useEffect(() => () => { void roomRef.current?.disconnect(); }, []);

  const resetRoomState = () => { setJoined(false); setTalking(false); setRemoteCount(0); setConnecting(false); if (audioContainerRef.current) audioContainerRef.current.innerHTML = ''; };

  const leaveRoom = async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (room) { try { await room.disconnect(); } catch { /* zaten kopmuş */ } }
    resetRoomState();
  };

  const joinRoom = async (index: number) => {
    const ch = initialChannels[index];
    if (!ch) return;
    setConnecting(true);
    try {
      const display = profile.name ? `${profile.name}${profile.plate ? ` (${maskPlate(profile.plate)})` : ''}` : 'Misafir sürücü';
      const identity = `${maskPlate(profile.plate) || 'misafir'}-${Math.random().toString(36).slice(2, 10)}`;
      const token = await getLiveKitToken({ data: { roomName: ch.id, participantName: display, identity } });
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== 'audio') return;
        const el = track.attach();
        el.volume = volumeRef.current / 100; el.muted = mutedRef.current;
        audioContainerRef.current?.appendChild(el);
      });
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => { track.detach().forEach(el => el.remove()); });
      room.on(RoomEvent.ParticipantConnected, () => setRemoteCount(room.remoteParticipants.size));
      room.on(RoomEvent.ParticipantDisconnected, () => setRemoteCount(room.remoteParticipants.size));
      room.on(RoomEvent.Disconnected, () => { if (roomRef.current === room) { roomRef.current = null; resetRoomState(); flash('Ses odası bağlantısı koptu. Tekrar bağlanabilirsin.'); } });
      await room.connect(LIVEKIT_URL, token);
      await room.startAudio().catch(() => undefined);
      setRemoteCount(room.remoteParticipants.size);
      setJoined(true); setTalking(false); setConnecting(false);
    } catch (err) {
      console.error('Canlı ses odasına bağlanılamadı:', err);
      roomRef.current = null; resetRoomState();
      flash('Ses odasına bağlanılamadı. İnternetini kontrol edip tekrar dene.');
    }
  };

  /** Odaya gir; başka odadaysan önce oradan çık. Aynı odadaysan "ayrıl" olarak çalışır. */
  const toggleLiveVoiceRoom = async (index: number) => {
    if (connecting) return;
    if (joined && index === channel) { await leaveRoom(); return; }
    if (!requireConsent(() => { void toggleLiveVoiceRoom(index); })) return;
    if (joined) await leaveRoom();
    setChannel(index);
    await joinRoom(index);
  };
  const goToChannel = (index: number) => { if (!(joined && index === channel)) void toggleLiveVoiceRoom(index); };

  const toggleMicrophone = async () => {
    if (connecting) return;
    const room = roomRef.current;
    if (!joined || !room) { await toggleLiveVoiceRoom(channel); return; }
    try {
      const next = !talking;
      await room.localParticipant.setMicrophoneEnabled(next);
      setTalking(next);
    } catch {
      flash('Mikrofona erişilemedi. Tarayıcıda bu site için mikrofon iznini aç.');
    }
  };

  /* yönetici girişi / haber ekle-sil */
  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAdminError('');
    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail.trim(), password: adminPassword });
    if (error) { setAdminError('E-posta veya şifre hatalı.'); return; }
    setShowAdminLogin(false); setAdminPassword('');
  };
  const handleAdminLogout = async () => { await supabase.auth.signOut(); setDialog(null); };
  const handleSecretClick = () => { const n = secretClicks + 1; if (n >= 3) { setShowAdminLogin(true); setSecretClicks(0); } else setSecretClicks(n); };

  const handleCreateNews = async (e: FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsBody.trim()) return;
    setNewsBusy(true); setNewsError('');
    const payload: Record<string, string> = { category: newsCategory, title: newsTitle.trim(), body: newsBody.trim() };
    if (newsImage.trim()) payload['image_url'] = newsImage.trim();
    const { error } = await supabase.from('news').insert([payload]);
    setNewsBusy(false);
    if (error) { setNewsError(`Haber yayınlanamadı: ${error.message}`); return; }
    setNewsTitle(''); setNewsBody(''); setNewsImage(''); setShowAddNews(false);
    void fetchNews();
  };
  const handleDeleteNews = async (id: string) => {
    if (!confirm('Bu haberi silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) flash(`Silinemedi: ${error.message}`); else void fetchNews();
  };

  /* dayanışma çağrısı: seçili kanala gerçek mesaj olarak gider */
  const sendHelpCall = async (kind: string) => {
    if (!requireConsent(() => { void sendHelpCall(kind); })) return;
    setHelpState({ busy: true, done: '', error: '' });
    let where = '';
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000, maximumAge: 60000 }));
      where = ` 📍 https://maps.google.com/?q=${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
    } catch { /* konum izni yok: konumsuz gönderilir */ }
    const { error } = await supabase.from('radio_messages').insert([{ channel_name: channelName, sender_name: profile.name || 'Misafir sürücü', sender_plate: maskPlate(profile.plate), message: `🆘 ${kind}${where}` }]);
    if (error) setHelpState({ busy: false, done: '', error: 'Çağrı gönderilemedi. İnternetini kontrol edip tekrar dene.' });
    else setHelpState({ busy: false, done: kind, error: '' });
  };

  const openProfile = () => { setPName(profile.name); setPPlate(profile.plate); setDialog('profile'); };
  const submitProfile = (e: FormEvent) => { e.preventDefault(); if (!pName.trim() || !pPlate.trim()) return; saveProfile(pName, pPlate); setDialog(null); flash('Profilin kaydedildi.'); };

  const shownChannels = (all: boolean) => initialChannels
    .slice(0, all ? initialChannels.length : 4)
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.name.toLocaleLowerCase('tr').includes(search.trim().toLocaleLowerCase('tr')));

  const channelCards = (all = false) => {
    const list = shownChannels(all || search.trim() !== '');
    if (list.length === 0) return <p className="empty-note">“{search}” ile eşleşen kanal yok.</p>;
    return (
      <div className="channel-grid">
        {list.map(({ item, index }) => {
          const isCurrent = joined && channel === index;
          const isBusy = connecting && channel === index;
          return (
            <article className={`channel-card ${isCurrent ? 'selected' : ''}`} key={item.id}>
              <div className="channel-top"><div className={`channel-icon ${item.tone}`}><item.icon size={17} /></div><span className="live-tag"><i className="live-dot" />SESLİ ODA</span></div>
              <h3>{item.name}</h3>
              <p>{item.subtitle}</p>
              <div className="channel-footer">
                <div className="avatars"><Avatar>YD</Avatar><span><Users size={10} className="inline mr-1" />{isCurrent ? (remoteCount === 0 ? 'Odada yalnızsın' : `${remoteCount} başka sürücü odada`) : 'Katılmak için bağlan'}</span></div>
                <Button variant="outline" disabled={connecting} className={`join-button ${isCurrent ? 'joined' : ''}`} onClick={() => void toggleLiveVoiceRoom(index)}>
                  {isBusy ? <><Loader2 size={12} className="animate-spin" /> Bağlanıyor…</> : isCurrent ? <><Signal size={12} /> Odadan Ayrıl</> : <><Headphones size={12} /> Odaya Bağlan</>}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const newsCards = (limit?: number) => {
    const list = limit ? newsList.slice(0, limit) : newsList;
    return (
      <div className="news-grid">
        {list.length === 0 ? <p className="empty-note">Henüz yayınlanmış bir gündem haberi yok.</p> : list.map((item, index) => (
          <article className="news-card" key={item.id || index} style={{ position: 'relative' }}>
            <div className={`news-cover ${index % 2 !== 0 ? 'second' : ''}`}>
              <img src={item.image_url || truckImage} alt="" width={1600} height={640} loading="lazy" style={{ objectFit: 'cover' }} onError={e => { const t = e.currentTarget; if (t.src !== truckImage) t.src = truckImage; }} />
              <span className="news-category">{item.category}</span>
            </div>
            <div className="news-copy">
              <Button variant="ghost" className="h-auto p-0 whitespace-normal text-left justify-start" onClick={() => setArticle(item)}><h3>{item.title}</h3></Button>
              <div className="news-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock3 size={10} />{item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : 'Şimdi'}</span>
                <span className="ml-auto">Yoldaş Editör</span>
                {isAdmin && <Button variant="ghost" size="sm" aria-label="Haberi sil" onClick={() => void handleDeleteNews(item.id)} style={{ color: '#ef4444', marginLeft: '8px', padding: '2px 6px' }}><Trash2 size={13} /></Button>}
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  };

  const dlgTitle = dialog === 'help' ? 'Yoldaş dayanışması' : dialog === 'notifications' ? 'Bildirimler' : dialog === 'profile' ? 'Sürücü profili' : dialog === 'radio' ? 'Ses odası' : dialog === 'terms' ? 'Kullanım şartları ve gizlilik' : 'Yardım & Destek';
  const dlgDesc = dialog === 'terms' ? 'Devam etmeden önce kısaca oku.' : dialog === 'help' ? `Çağrı “${channelName}” kanalına yazılır. Önce güvenli bir yerde dur.` : dialog === 'profile' ? 'Sohbette ve sesli odada bu adla görünürsün.' : 'Yoldaş · Canlı Ses Odası';

  return <div className="app-shell">
    <div ref={audioContainerRef} style={{ display: 'none' }} />
    <aside className="sidebar">
      <Link to="/" className="brand"><span className="brand-mark"><Truck size={24} /></span><span className="brand-name">yoldaş<small>YOLUN AÇIK, SESİN AÇIK.</small></span></Link>
      <nav aria-label="Ana menü">
        <div className="nav-label">YOL ARKADAŞIN</div>
        {navigation.map(item => <Link key={item.to} to={item.to} className={`nav-link ${view === item.view ? 'active' : ''}`}><item.icon /><span>{item.label}</span></Link>)}
      </nav>
      <div className="nav-label">FAVORİ KANALLARIN</div>
      {[0, 1, 3].map(i => <Link key={i} to="/telsiz" className="room-shortcut" onClick={() => goToChannel(i)}><i className="live-dot" />{initialChannels[i]?.name}</Link>)}
      <div className="sidebar-bottom">
        <div className="help-box">
          <strong className="flex gap-2 items-center"><Siren size={16} className="text-warning" />Yolda yalnız değilsin.</strong>
          <p>Bir el uzakta, binlerce yoldaş yanında.</p>
          <Button variant="outline" className="w-full h-8 text-[10px]" onClick={() => { setHelpState({ busy: false, done: '', error: '' }); setDialog('help'); }}>Dayanışma çağrısı<ArrowRight size={12} /></Button>
        </div>
        <Button variant="ghost" className="w-full text-muted-foreground justify-start text-[11px]" onClick={() => setDialog('support')}><CircleHelp size={15} /> Yardım & Destek</Button>
        <div className="profile">
          <Avatar>{initials(profile.name)}</Avatar>
          <div><strong className="text-[11px]">{profile.name || 'Profilini oluştur'}</strong><small className="flex items-center gap-1"><ShieldCheck size={10} />{profile.plate || 'Plaka eklenmedi'}</small></div>
          <Button variant="ghost" size="icon" aria-label="Profili düzenle" onClick={openProfile}><ChevronDown size={14} /></Button>
        </div>
      </div>
    </aside>

    <header className="topbar">
      <div className="breadcrumb"><Truck size={14} /><ChevronRight size={11} /><strong>{view === 'home' ? 'Genel Bakış' : pageTitles[view][0]}</strong></div>
      <div className="top-actions">
        <label className="search-box"><Search size={14} className="text-muted-foreground" /><input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Kanal ara…" aria-label="Kanal ara" /><kbd>⌘ K</kbd></label>
        <span className="connection"><i className="live-dot" />{joined ? 'Odaya bağlısın' : 'Odaya bağlı değilsin'}</span>
        <div className="mobile-actions">
          <Button variant="ghost" size="icon" aria-label="Dayanışma çağrısı" onClick={() => { setHelpState({ busy: false, done: '', error: '' }); setDialog('help'); }}><Siren size={18} /></Button>
          <Button variant="ghost" size="icon" aria-label="Profil" onClick={openProfile}><User size={18} /></Button>
        </div>
        <Button variant="ghost" size="icon" className={`notification ${hasUnread ? 'has-unread' : ''}`} aria-label={hasUnread ? 'Bildirimler (yeni haber var)' : 'Bildirimler'} onClick={openNotifications}><Bell size={17} /></Button>
      </div>
    </header>

    <main className="page-content content-page" key={view}>
      <div className="page-heading">
        <div><h1>{pageTitles[view][0]}</h1><p>{pageTitles[view][1]}</p></div>
        <span className="date-label" onClick={handleSecretClick} style={{ userSelect: 'none' }}><CalendarDays size={13} />{todayLabel}</span>
      </div>
      {view === 'home' ? <div className="content-grid">
        <div className="main-column">
          <section className="hero"><img src={truckImage} width={1600} height={640} alt="Dağ yolunda ilerleyen ağır vasıta" fetchPriority="high" />
            <div className="hero-copy"><div className="eyebrow"><i className="live-dot" />YOLLAR UZUN, DOSTLUK YAKIN.</div><h2>Yolun her kilometresinde<br />bir yoldaşın var.</h2><p>Aynı yolu paylaşanlarla buluş. Telsize bağlan,<br />haberdar ol, güvenle yol al.</p>
              <Button asChild className="hero-action"><Link to="/telsiz"><Radio size={13} />Canlı Odaya Bağlan<ArrowRight size={12} /></Link></Button></div>
          </section>
          <section><SectionHeading icon={<Radio />} title="Sesli odalar" count="Kanallar" to="/telsiz" />{channelCards()}</section>
          <section className="news-section"><SectionHeading icon={<Newspaper />} title="Yolun gündemi" to="/gundem" />{newsCards(4)}</section>
        </div>
        <aside className="right-column"><BorderPanel /><NearbyPanel compact /><ChatPanel compact channelName={channelName} profile={profile} onEditProfile={openProfile} requireConsent={requireConsent} /></aside>
      </div> : <div className="module-content">
        {view === 'radio' && <><SectionHeading icon={<Radio />} title="Frekansını bul" count="Kanallar" />{channelCards(true)}</>}
        {view === 'messages' && <ChatPanel channelName={channelName} profile={profile} onEditProfile={openProfile} requireConsent={requireConsent} channels={initialChannels.map(c => c.name)} onChannelChange={name => { const i = initialChannels.findIndex(c => c.name === name); if (i >= 0 && !joined) setChannel(i); }} locked={joined} />}
        {view === 'news' && <div>
          <div className="news-admin-bar">
            <SectionHeading icon={<Newspaper />} title="Yol Gündemi & İndirimler" />
            {isAdmin && <div style={{ display: 'flex', gap: '8px' }}><Button onClick={() => setShowAddNews(true)} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Plus size={16} /> Haber / Duyuru Ekle</Button><Button variant="outline" onClick={() => void handleAdminLogout()} style={{ fontSize: '11px' }}>Yönetici Çıkışı</Button></div>}
          </div>
          {newsCards()}
        </div>}
        {view === 'roads' && <div className="tools-grid"><BorderPanel expanded /><RoadReports /></div>}
        {view === 'tools' && <ToolsPage />}
      </div>}
    </main>

    {notice && <div className="app-notice" role="status">{notice}</div>}

    <footer className="radio-dock">
      <div className="radio-station">
        <div className="radio-station-icon"><Radio size={23} /></div>
        <div><strong>{channelName}</strong><small><i className="live-dot" />{connecting ? 'Bağlanıyor…' : joined ? (remoteCount === 0 ? 'Odada yalnızsın' : `${remoteCount} sürücü odada`) : 'Odaya bağlı değilsin'}</small></div>
      </div>
      <div className="divider" />
      <div className="radio-center">
        <Avatar className="speaker-avatar">{initials(profile.name)}</Avatar>
        <div className={`waveform ${talking ? 'is-speaking' : ''}`} aria-hidden="true">{Array.from({ length: 42 }, (_, i) => <i key={i} />)}</div>
        <div className="speaker-info">Telsiz bağlantısı<small style={{ color: talking ? '#16a34a' : '#b45309' }}>{joined ? (talking ? 'Mikrofon açık: konuşuyorsun' : 'Dinleme modunda') : 'Bağlı değilsin'}</small></div>
      </div>
      <div className="radio-controls">
        <Button variant="ghost" size="icon" className="dock-icon sound-button" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'} onClick={() => setMuted(m => !m)}>{muted ? <VolumeX /> : <Volume2 />}</Button>
        <input type="range" min="0" max="100" value={volume} onChange={e => { setVolume(Number(e.target.value)); if (muted) setMuted(false); }} aria-label="Ses seviyesi" className="volume-control" />
        <Button className={`ptt-button ${talking ? 'talking' : ''}`} disabled={connecting} style={{ background: joined ? (talking ? '#16a34a' : '#d97706') : '#64748b' }} onClick={() => void toggleMicrophone()}>
          {connecting ? <Loader2 size={16} className="animate-spin" /> : talking ? <Mic size={16} /> : <MicOff size={16} />}
          {connecting ? 'Bağlanıyor…' : joined ? (talking ? 'Konuşmayı Bitir' : 'Konuşmak İçin Dokun') : 'Odaya Katıl'}
        </Button>
        <Button variant="ghost" size="icon" className="dock-icon" aria-label="Oda seçenekleri" onClick={() => setDialog('radio')}><MoreHorizontal /></Button>
      </div>
    </footer>

    <Dialog open={dialog !== null} onOpenChange={open => { if (!open) { if (dialog === 'terms') pendingAction.current = null; setDialog(null); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{dlgTitle}</DialogTitle><DialogDescription>{dlgDesc}</DialogDescription></DialogHeader>
        {dialog === 'help' && (helpState.done
          ? <div className="modal-copy"><Check className="text-live mb-3" /><strong>Çağrın gönderildi: {helpState.done}</strong><p>“{channelName}” kanalındaki sürücüler mesajını görecek. Can güvenliği söz konusuysa hemen 112’yi ara.</p></div>
          : <div className="modal-options">
            {['Yolda kaldım', 'Çekici lazım', 'Mola yeri tavsiyesi'].map((item, i) => <Button key={item} variant="outline" disabled={helpState.busy} className="modal-option" onClick={() => void sendHelpCall(item)}>{i === 2 ? <Coffee /> : <Truck />}{item}<ArrowRight className="ml-auto" /></Button>)}
            {helpState.busy && <p className="modal-copy">Gönderiliyor…</p>}
            {helpState.error && <p className="msg-error">{helpState.error}</p>}
            <p className="modal-copy">İzin verirsen konumun haritada açılan bir bağlantı olarak eklenir. Acil durumlarda 112’yi ara.</p>
          </div>)}
        {dialog === 'notifications' && <div className="modal-options">
          {newsList.length === 0 ? <p className="modal-copy">Yeni bildirim yok.</p> : newsList.slice(0, 3).map(n => <Button key={n.id} variant="outline" className="modal-option" onClick={() => { setDialog(null); setArticle(n); }}><Newspaper /><span style={{ textAlign: 'left', whiteSpace: 'normal' }}>{n.title}</span></Button>)}
          {joined && <p className="modal-copy">🟢 {channelName} odasına bağlısın.</p>}
        </div>}
        {dialog === 'profile' && <form className="dlg-form" onSubmit={submitProfile}>
          <label>Ad soyad<input required maxLength={40} placeholder="Örn: Ahmet Yılmaz" value={pName} onChange={e => setPName(e.target.value)} /></label>
          <label>Araç plakası (başkalarına kısmen gizli görünür)<input required maxLength={14} placeholder="Örn: 42 ABC 34" value={pPlate} onChange={e => setPPlate(e.target.value)} /></label>
          <Button type="submit" className="w-full">Kaydet</Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => setDialog('support')}><CircleHelp size={14} /> Yardım & Destek</Button>
          <Button type="button" variant="ghost" className="w-full text-[11px]" onClick={() => { setDialog(null); if (isAdmin) void handleAdminLogout(); else setShowAdminLogin(true); }}>{isAdmin ? 'Yönetici çıkışı' : 'Yönetici girişi'}</Button>
        </form>}
        {dialog === 'radio' && <>
          <p className="modal-copy">{joined ? `${channelName} odasındasın.` : `${channelName} odasına bağlı değilsin.`}</p>
          <Button variant="outline" disabled={connecting} onClick={() => { void toggleLiveVoiceRoom(channel); setDialog(null); }}>{joined ? <><X />Odadan Ayrıl</> : <><Radio />Odaya Katıl</>}</Button>
        </>}
        {dialog === 'support' && <div className="modal-copy support-copy">
          <p><strong>Nasıl kullanılır?</strong></p>
          <p>1. “Telsiz” sayfasından bir odaya bağlan. 2. Alttaki turuncu düğmeye dokunarak konuş, tekrar dokunarak dinlemeye dön. 3. Yazışmak için “Mesajlar” sayfasını kullan.</p>
          <p>Mikrofon sorun çıkarırsa tarayıcı adres çubuğundaki kilit simgesinden mikrofon iznini aç.</p>
          <p>Uygulama resmî trafik veya sınır bilgisi yerine geçmez. Acil durumlarda 112’yi ara.</p>
          <Button variant="outline" className="w-full" onClick={() => setDialog('terms')}>Kullanım şartları ve gizlilik</Button>
          <Button asChild variant="outline" className="w-full"><Link to="/gizlilik" onClick={() => setDialog(null)}>Gizlilik politikası (tam metin)</Link></Button>
        </div>}
        {dialog === 'terms' && <div className="modal-copy support-copy">
          <p><strong>Sürüş güvenliği:</strong> Araç hareket halindeyken telefonu elinize almayın. Konuşmak ve yazmak için aracı güvenli bir yerde durdurun. Trafik kurallarına uymak sizin sorumluluğunuzdadır.</p>
          <p><strong>Topluluk kuralları:</strong> Hakaret, tehdit, nefret söylemi, spam, reklam ve yanıltıcı ihbar yasaktır. Kurallara uymayan içerik kaldırılabilir, kullanıcı engellenebilir.</p>
          <p><strong>Verileriniz:</strong> Ad, plaka (başkalarına kısmen gizli gösterilir), yazdığınız mesajlar ve isteğe bağlı konumunuz işlenir. Konum yalnızca dayanışma çağrısı gönderirken, izin verirseniz eklenir. Sesli odalar kaydedilmez. Bilgilerinizin silinmesini uygulama sahibinden isteyebilirsiniz.</p>
          <p><strong>Bilgilendirme:</strong> Haber, yol ve sınır bilgileri sürücü bildirimlerine dayanır; doğruluğu garanti edilmez ve resmî kaynakların yerine geçmez. Acil durumlarda 112’yi arayın.</p>
          <p><Link to="/gizlilik" onClick={() => setDialog(null)} style={{ textDecoration: 'underline' }}>Gizlilik politikasının tam metni</Link></p>
          {!consent && <Button className="w-full" onClick={acceptTerms}>Okudum, kabul ediyorum</Button>}
        </div>}
      </DialogContent>
    </Dialog>

    <Dialog open={article !== null} onOpenChange={open => { if (!open) setArticle(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{article?.title}</DialogTitle><DialogDescription>{article?.category} · Yoldaş Editör</DialogDescription></DialogHeader>
        <img src={article?.image_url || truckImage} alt="" width={1600} height={640} className="rounded-md" style={{ maxHeight: '250px', objectFit: 'cover' }} onError={e => { const t = e.currentTarget; if (t.src !== truckImage) t.src = truckImage; }} />
        <p className="modal-copy" style={{ marginTop: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{article?.body}</p>
      </DialogContent>
    </Dialog>

    <Dialog open={showAdminLogin} onOpenChange={setShowAdminLogin}>
      <DialogContent>
        <DialogHeader><DialogTitle>Yönetici Girişi</DialogTitle><DialogDescription>Yol gündemine içerik eklemek için yönetici hesabınla giriş yap.</DialogDescription></DialogHeader>
        <form className="dlg-form" onSubmit={e => void handleAdminLogin(e)}>
          <label>E-posta<input type="email" required autoComplete="username" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} /></label>
          <label>Şifre<input type="password" required autoComplete="current-password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} /></label>
          {adminError && <p className="msg-error">{adminError}</p>}
          <Button type="submit" className="w-full">Giriş Yap</Button>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={showAddNews} onOpenChange={setShowAddNews}>
      <DialogContent>
        <DialogHeader><DialogTitle>Yeni Haber / Duyuru</DialogTitle><DialogDescription>Sürücülere haber, mazot indirimi veya yol uyarısı paylaş.</DialogDescription></DialogHeader>
        <form className="dlg-form" onSubmit={e => void handleCreateNews(e)}>
          <label>Kategori<select value={newsCategory} onChange={e => setNewsCategory(e.target.value)}><option value="AKARYAKIT">AKARYAKIT / MAZOT İNDİRİMİ</option><option value="SEKTÖRDEN">SEKTÖRDEN HABERLER</option><option value="YOL DURUMU">YOL & TRAFİK UYARISI</option><option value="TAKOGRAF">TAKOGRAF & MEVZUAT</option></select></label>
          <label>Başlık<input required maxLength={120} placeholder="Örn: Motorine indirim geliyor" value={newsTitle} onChange={e => setNewsTitle(e.target.value)} /></label>
          <label>Kapak resmi bağlantısı (isteğe bağlı)<input type="url" placeholder="https://…/resim.jpg" value={newsImage} onChange={e => setNewsImage(e.target.value)} /></label>
          <label>Detay<textarea required rows={4} value={newsBody} onChange={e => setNewsBody(e.target.value)} /></label>
          {newsError && <p className="msg-error">{newsError}</p>}
          <Button type="submit" disabled={newsBusy} className="w-full">{newsBusy ? 'Yayınlanıyor…' : 'Yayınla'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}

const SAMPLE_BORDERS: Border[] = [
  { gate_name: 'Kapıkule', country: 'Türkiye → Bulgaristan', wait_time: '—', queue_length: 'Örnek', clear: false },
  { gate_name: 'Hamzabeyli', country: 'Türkiye → Bulgaristan', wait_time: '—', queue_length: 'Örnek', clear: false },
  { gate_name: 'İpsala', country: 'Türkiye → Yunanistan', wait_time: '—', queue_length: 'Örnek', clear: true },
  { gate_name: 'Sarp', country: 'Türkiye → Gürcistan', wait_time: '—', queue_length: 'Örnek', clear: true },
];

function BorderPanel({ expanded = false }: { expanded?: boolean }) {
  const [borders, setBorders] = useState<Border[]>([]);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const fetchBorders = async () => {
      const { data, error } = await supabase.from('border_status').select('*');
      if (!error && data && data.length > 0) { setBorders(data as Border[]); setLive(true); } else { setBorders(SAMPLE_BORDERS); setLive(false); }
    };
    void fetchBorders();
    const ch = supabase.channel('public:border_status').on('postgres_changes', { event: '*', schema: 'public', table: 'border_status' }, () => { void fetchBorders(); }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);
  return (
    <section className="panel">
      <div className="panel-title"><h2><MapPin className="text-blue" />Sınır kapıları</h2><span className="subtle-label flex items-center gap-1">{live ? <><i className="live-dot" />Güncel</> : 'Örnek veri'}</span></div>
      {borders.slice(0, expanded ? borders.length : 3).map(b => (
        <div className="border-row" key={b.id ?? b.gate_name}>
          <div><strong>{b.gate_name}</strong><small>{b.country || 'Sınır Kapısı'}</small></div>
          <div className={`border-time ${b.clear || b.queue_length === 'Akıcı' ? 'clear' : ''}`}>{b.wait_time}<small>● {b.queue_length}</small></div>
        </div>
      ))}
      <p className="panel-note"><Clock3 size={9} />{live ? 'Yönetici ve sürücü bildirimlerine göre güncellenir' : 'Henüz kapı verisi girilmedi; gösterilenler örnektir'}</p>
      {!expanded && <Link to="/yol-durumu" className="panel-bottom-link">Tüm yol ve sınır durumları<ArrowRight size={11} /></Link>}
    </section>
  );
}

function RoadReports() {
  const [reports, setReports] = useState<RoadReport[]>([]);
  const [available, setAvailable] = useState(true);
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('Akıcı');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    const { data, error: err } = await supabase.from('road_reports').select('*').order('created_at', { ascending: false }).limit(15);
    if (err) { setAvailable(false); return; }
    setAvailable(true); setReports((data ?? []) as RoadReport[]);
  };
  useEffect(() => {
    void load();
    const ch = supabase.channel('public:road_reports').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'road_reports' }, () => { void load(); }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;
    setBusy(true); setError('');
    const { error: err } = await supabase.from('road_reports').insert([{ location: location.trim(), status, note: note.trim() || null }]);
    setBusy(false);
    if (err) { setError('Bildirim gönderilemedi. Daha sonra tekrar dene.'); return; }
    setLocation(''); setNote(''); void load();
  };
  return (
    <section className="panel">
      <h2 className="text-base font-semibold flex items-center gap-2"><Navigation size={18} /> Yol bildirimleri</h2>
      {!available ? <p className="modal-copy">Yol bildirimleri henüz etkinleştirilmedi (supabase/schema.sql dosyasını çalıştır).</p> : <>
        <form className="dlg-form" onSubmit={e => void submit(e)}>
          <label>Yer<input required maxLength={80} placeholder="Örn: Bolu Tüneli, İstanbul yönü" value={location} onChange={e => setLocation(e.target.value)} /></label>
          <label>Durum<select value={status} onChange={e => setStatus(e.target.value)}>{['Akıcı', 'Yoğun', 'Kaza', 'Yol çalışması', 'Yol kapalı', 'Buzlanma / sis'].map(s => <option key={s}>{s}</option>)}</select></label>
          <label>Not (isteğe bağlı)<input maxLength={160} value={note} onChange={e => setNote(e.target.value)} /></label>
          {error && <p className="msg-error">{error}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Gönderiliyor…' : 'Bildirim ekle'}</Button>
        </form>
        {reports.length === 0 ? <p className="modal-copy">Henüz bildirim yok. İlk bildirimi sen ekle.</p> : reports.map((r, i) => (
          <div className="border-row" key={r.id ?? i}><div><strong>{r.location}</strong><small>{r.note || ''}{r.created_at ? ` ${new Date(r.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : ''}</small></div><div className="border-time">{r.status}</div></div>
        ))}
      </>}
      <div className="demo-label">Bildirimler sürücülerden gelir, doğrulanmamıştır.</div>
    </section>
  );
}

function ChatPanel({ compact = false, channelName = 'E-5 / TEM Hattı', profile, onEditProfile, requireConsent, channels, onChannelChange, locked = false }: { compact?: boolean; channelName?: string; profile: Profile; onEditProfile: () => void; requireConsent: (action: () => void) => boolean; channels?: string[]; onChannelChange?: (name: string) => void; locked?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [reported, setReported] = useState<string[]>([]);
  const [info, setInfo] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { try { setBlocked(JSON.parse(localStorage.getItem('yoldas_blocked') ?? '[]') as string[]); } catch { /* özel mod */ } }, []);
  const senderKey = (m: ChatMessage) => `${m.sender_name ?? ''}|${m.sender_plate ?? ''}`;
  const isOwn = (m: ChatMessage) => !!profile.name && m.sender_name === profile.name && m.sender_plate === maskPlate(profile.plate);
  const blockSender = (m: ChatMessage) => {
    if (!confirm(`${m.sender_name ?? 'Bu sürücü'} engellensin mi? Mesajlarını bu cihazda artık görmezsin.`)) return;
    const next = [...blocked, senderKey(m)];
    setBlocked(next);
    try { localStorage.setItem('yoldas_blocked', JSON.stringify(next)); } catch { /* özel mod */ }
    setInfo('Sürücü engellendi.');
  };
  const reportMessage = async (m: ChatMessage) => {
    if (m.id === undefined || !confirm('Bu mesaj uygunsuz içerik olarak bildirilsin mi?')) return;
    const { error } = await supabase.from('message_reports').insert([{ message_id: String(m.id), channel_name: m.channel_name, message_text: (m.message ?? '').slice(0, 600), reason: 'uygunsuz' }]);
    if (error) { setInfo('Bildirim gönderilemedi. Daha sonra tekrar dene.'); return; }
    setReported(prev => [...prev, String(m.id)]);
    setInfo('Bildirildi, teşekkürler. Mesaj incelenecek.');
  };
  const visibleMessages = messages.filter(m => !blocked.includes(senderKey(m)) && !reported.includes(String(m.id)));
  const scrollDown = () => window.setTimeout(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight; }, 60);

  useEffect(() => {
    let active = true;
    setMessages([]);
    (async () => {
      const { data, error } = await supabase.from('radio_messages').select('*').eq('channel_name', channelName).order('created_at', { ascending: false }).limit(100);
      if (active && !error && data) { setMessages((data as ChatMessage[]).reverse()); scrollDown(); }
    })();
    const ch = supabase.channel(`room_${channelName}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radio_messages' }, payload => {
      const row = payload.new as ChatMessage;
      if (row.channel_name !== channelName) return;
      setMessages(prev => (prev.some(m => m.id !== undefined && m.id === row.id) ? prev : [...prev, row]));
      scrollDown();
    }).subscribe();
    return () => { active = false; void supabase.removeChannel(ch); };
  }, [channelName]);

  const lastSent = useRef(0);
  const doSend = async () => {
    const text = message.trim();
    if (!text || sending) return;
    if (!profile.name || !profile.plate) { onEditProfile(); return; }
    const wait = 3000 - (Date.now() - lastSent.current);
    if (wait > 0) { setSendError(`Çok hızlı yazıyorsun. ${Math.ceil(wait / 1000)} saniye sonra tekrar dene.`); return; }
    setSending(true); setSendError('');
    const { error } = await supabase.from('radio_messages').insert([{ channel_name: channelName, sender_name: profile.name, sender_plate: maskPlate(profile.plate), message: text }]);
    setSending(false);
    if (error) { setSendError('Mesaj gönderilemedi. İnternetini kontrol edip tekrar dene.'); return; }
    lastSent.current = Date.now();
    setMessage('');
  };
  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!requireConsent(() => { void doSend(); })) return;
    void doSend();
  };

  const hasProfile = !!(profile.name && profile.plate);
  return (
    <section className="panel chat-panel">
      <div className="chat-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <h2><MessageSquare className="text-blue" />{channelName}</h2>
        <button type="button" className="chat-profile-btn" onClick={onEditProfile}>{hasProfile ? `${profile.plate} · düzenle` : 'Profil oluştur'}</button>
      </div>
      {channels && <label className="dlg-form" style={{ marginTop: 0 }}><select aria-label="Sohbet kanalı" value={channelName} disabled={locked} onChange={e => onChannelChange?.(e.target.value)}>{channels.map(c => <option key={c}>{c}</option>)}</select>{locked && <small>Odadayken kanal değiştirmek için önce odadan ayrıl.</small>}</label>}
      <div className="chat-messages" ref={listRef} style={{ minHeight: '200px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
        {visibleMessages.length === 0 ? <p className="empty-note">Henüz mesaj yok. İlk mesajı sen yaz!</p> : visibleMessages.map((item, index) => (
          <div className="chat-message" key={item.id ?? index} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Avatar>{initials(item.sender_name)}</Avatar>
            <div className="message-body" style={{ flex: 1, minWidth: 0 }}>
              <div className="message-author" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <strong>{item.sender_name} {item.sender_plate ? `(${item.sender_plate})` : ''}</strong>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <time style={{ fontSize: '10px', opacity: 0.6 }}>{item.created_at ? new Date(item.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</time>
                  {!isOwn(item) && <>
                    <button type="button" className="msg-action" aria-label="Mesajı bildir" title="Uygunsuz içerik bildir" onClick={() => void reportMessage(item)}><Flag size={13} /></button>
                    <button type="button" className="msg-action" aria-label="Sürücüyü engelle" title="Sürücüyü engelle" onClick={() => blockSender(item)}><Ban size={13} /></button>
                  </>}
                </span>
              </div>
              {item.audio_url ? <AudioPlayer src={item.audio_url} /> : <p style={{ margin: '4px 0 0', fontSize: '13px', overflowWrap: 'anywhere' }}>{linkify(item.message ?? '').map((p, i) => p.href ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>{p.text}</a> : <span key={i}>{p.text}</span>)}</p>}
            </div>
          </div>
        ))}
      </div>
      <form className="chat-form" onSubmit={sendMessage}>
        <input maxLength={500} placeholder={hasProfile ? `${profile.name} olarak yaz…` : 'Yazmak için önce profilini oluştur'} value={message} onChange={e => setMessage(e.target.value)} aria-label="Mesajın" />
        <Button type="submit" variant="ghost" disabled={sending} className="text-primary" aria-label="Mesaj gönder"><Send size={13} /></Button>
      </form>
      {sendError && <p className="msg-error">{sendError}</p>}
      {info && <p className="modal-copy" role="status">{info}</p>}
      <div className="demo-label">{compact ? 'Tır sohbet hattı' : `${channelName} ortak sohbeti`}</div>
    </section>
  );
}
