import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowDownUp, ArrowRight, Bell, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Coffee, Compass, Fuel, Headphones, LayoutGrid, MapPin, Menu, MessageSquare, Mic, MicOff, Moon, MoreHorizontal, Navigation, Newspaper, Pause, Play, Radio, Search, Send, Settings2, ShieldCheck, Signal, Siren, Truck, Users, Volume2, VolumeX, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import truckImage from '@/assets/truck-road.jpg';
import { calculateFuelCost, formatCountdown } from '@/lib/driver-tools';
import { supabase } from '@/supabase';

export type View = 'home' | 'radio' | 'messages' | 'news' | 'roads' | 'tools';
const navigation = [
  { to: '/', label: 'Genel Bakış', icon: LayoutGrid, view: 'home' },
  { to: '/telsiz', label: 'Canlı Telsiz', icon: Radio, view: 'radio' },
  { to: '/mesajlar', label: 'Mesajlar', icon: MessageSquare, view: 'messages' },
  { to: '/gundem', label: 'Yol Gündemi', icon: Newspaper, view: 'news' },
  { to: '/yol-durumu', label: 'Yol & Sınır Durumu', icon: MapPin, view: 'roads' },
  { to: '/araclar', label: 'Pratik Araçlar', icon: Wrench, view: 'tools' },
] as const;
const channels = [
  { name: 'E-5 / TEM Hattı', subtitle: 'Yolun nabzı burada atıyor.', count: 128, icon: Navigation, tone: '', initials: ['MK', 'AY', 'HD'] },
  { name: 'Kapıkule Sınır Kapısı', subtitle: 'Sınırdan en güncel bilgiler.', count: 84, icon: Truck, tone: 'green', initials: ['İK', 'SA', 'MT'] },
  { name: 'Avrupa Rotaları', subtitle: 'Uzak yollar, yakın dostluklar.', count: 63, icon: Compass, tone: '', initials: ['AK', 'BD', 'EY'] },
  { name: 'Gece Sürüşü', subtitle: 'Geceye birlikte yol alıyoruz.', count: 42, icon: Moon, tone: 'amber', initials: ['YS', 'ÖK', 'TA'] },
  { name: 'Anadolu Yolları', subtitle: 'Memleketin dört bir yanından.', count: 36, icon: MapPin, tone: 'green', initials: ['AB', 'FK', 'HD'] },
  { name: 'Mola Yeri Sohbetleri', subtitle: 'Çaylar hazır, sohbet koyu.', count: 27, icon: Coffee, tone: 'amber', initials: ['KT', 'GA', 'SK'] },
];
const news = [
  { category: 'AKARYAKIT', title: 'Motorinde fiyat hareketliliği: sürücülerin gözü pompa fiyatlarında', time: '25 dk önce', image: true, body: 'Akaryakıt maliyetleri nakliye planlamasının önemli bir parçası. Yola çıkmadan önce güzergâhınızdaki güncel pompa fiyatlarını kontrol edin. Bu içerik örnek haber verisidir; güncel fiyat bildirimi değildir.' },
  { category: 'SEKTÖRDEN', title: 'Avrupa yollarında yeni dönem: dijital takograf gündemi', time: '1 saat önce', image: false, body: 'Uluslararası taşımacılıkta dijital takograf uygulamaları gündemde. Aracınıza ve rotanıza uygulanacak kuralları yetkili makamların güncel duyurularından kontrol edin. Bu içerik örnek haber verisidir.' },
];
const pageTitles: Record<View, [string, string]> = {
  home: ['Yolun açık olsun, Ahmet', 'Yolun gündemi, telsizin sesi, dostların burada.'],
  radio: ['Canlı Telsiz', 'Aynı yolda, aynı frekanstayız.'],
  messages: ['Mesajlar', 'Yoldaki dostlarından haber var.'],
  news: ['Yol Gündemi', 'Sektörden ve yollardan öne çıkanlar.'],
  roads: ['Yol & Sınır Durumu', 'Rotanı planla, yolun açık olsun.'],
  tools: ['Pratik Araçlar', 'Yol hesabın her zaman yanında.'],
};

function Avatar({ children, className = '' }: { children: ReactNode; className?: string }) { return <span className={`avatar ${className}`}>{children}</span>; }
function SectionHeading({ icon, title, count, to, action = 'Tümünü gör' }: { icon: ReactNode; title: string; count?: string; to?: '/' | '/telsiz' | '/gundem' | '/yol-durumu'; action?: string }) { return <div className="section-heading"><h2>{icon}{title}{count && <span className="count">{count}</span>}</h2>{to && <Link to={to} className="text-action">{action}<ArrowRight /></Link>}</div>; }

export function Platform({ view = 'home' }: { view?: View }) {
  const [channel, setChannel] = useState(0);
  const [joined, setJoined] = useState(true);
  const [talking, setTalking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<'help' | 'notifications' | 'profile' | 'radio' | 'support' | null>(null);
  const [article, setArticle] = useState<number | null>(null);
  const [helpSent, setHelpSent] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  const selectChannel = (index: number) => { setChannel(index); setJoined(true); setTalking(false); };
  const channelCards = (all = false) => <div className="channel-grid">{channels.slice(0, all ? channels.length : 4).map((item, index) => ({ item, index })).filter(({ item }) => item.name.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr'))).map(({ item, index }) => <article className={`channel-card ${joined && channel === index ? 'selected' : ''}`} key={item.name}><div className="channel-top"><div className={`channel-icon ${item.tone}`}><item.icon size={17} /></div><span className="live-tag"><i className="live-dot" />CANLI</span></div><h3>{item.name}</h3><p>{item.subtitle}</p><div className="channel-footer"><div className="avatars">{item.initials.map(initial => <Avatar key={initial}>{initial}</Avatar>)}<span><Users size={10} className="inline mr-1" />{item.count}</span></div><Button variant="outline" className={`join-button ${joined && channel === index ? 'joined' : ''}`} onClick={() => selectChannel(index)}>{joined && channel === index ? <><Signal size={12} /> Bağlısın</> : <><Headphones size={12} /> Kanala katıl</>}</Button></div></article>)}</div>;
  const newsCards = <div className="news-grid">{news.map((item, index) => <article className="news-card" key={item.title}><div className={`news-cover ${index ? 'second' : ''}`}><img src={truckImage} alt={index ? 'Avrupa güzergâhında ağır vasıta' : 'Uzun yolda nakliye tırı'} width={1600} height={640} loading="lazy" /><span className="news-category">{item.category}</span></div><div className="news-copy"><Button variant="ghost" className="h-auto p-0 whitespace-normal text-left justify-start" onClick={() => setArticle(index)}><h3>{item.title}</h3></Button><div className="news-meta"><Clock3 size={10} />{item.time}<span className="ml-auto">Yoldaş Editör</span></div></div></article>)}</div>;

  return <div className="app-shell">
    <aside className="sidebar"><Link to="/" className="brand"><span className="brand-mark"><Truck size={24} /></span><span className="brand-name">yoldaş<small>YOLUN AÇIK, TELSİZİN AÇIK.</small></span></Link><nav aria-label="Ana menü"><div className="nav-label">YOL ARKADAŞIN</div>{navigation.map(item => <Link key={item.to} to={item.to} className={`nav-link ${view === item.view ? 'active' : ''}`}><item.icon /><span>{item.label}</span>{item.view === 'messages' && <span className="nav-count">3</span>}</Link>)}</nav><div className="nav-label">FAVORİ KANALLARIN</div><Link to="/telsiz" className="room-shortcut" onClick={() => selectChannel(0)}><i className="live-dot" />E-5 / TEM Hattı</Link><Link to="/telsiz" className="room-shortcut" onClick={() => selectChannel(1)}><i className="live-dot" />Kapıkule Sınır Kapısı</Link><Link to="/telsiz" className="room-shortcut" onClick={() => selectChannel(3)}><i className="live-dot" />Gece Sürüşü</Link><div className="sidebar-bottom"><div className="help-box"><strong className="flex gap-2 items-center"><Siren size={16} className="text-warning" />Yolda yalnız değilsin.</strong><p>Bir el uzakta, binlerce yoldaş yanında.</p><Button variant="outline" className="w-full h-8 text-[10px]" onClick={() => { setHelpSent(''); setDialog('help'); }}>Dayanışma çağrısı<ArrowRight size={12} /></Button></div><Button variant="ghost" className="w-full text-muted-foreground justify-start text-[11px]" onClick={() => setDialog('support')}><CircleHelp size={15} /> Yardım & Destek</Button><div className="profile"><Avatar>AY</Avatar><div><strong className="text-[11px]">Ahmet Yılmaz</strong><small className="flex items-center gap-1"><ShieldCheck size={10} /> Onaylı sürücü</small></div><Button variant="ghost" size="icon" aria-label="Profil seçenekleri" onClick={() => setDialog('profile')}><ChevronDown size={14} /></Button></div></div></aside>
    <header className="topbar"><div className="breadcrumb"><Truck size={14} /><ChevronRight size={11} /><strong>{view === 'home' ? 'Genel Bakış' : pageTitles[view][0]}</strong></div><div className="top-actions"><label className="search-box"><Search size={14} className="text-muted-foreground" /><input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Kanal, konu veya yol arkadaşı ara..." aria-label="Kanal ara" /><kbd>⌘ K</kbd></label><span className="connection"><i className="live-dot" />1.248 sürücü yolda</span><Button variant="ghost" size="icon" className="notification" aria-label="Bildirimler" onClick={() => setDialog('notifications')}><Bell size={17} /></Button></div></header>
    <main className="page-content content-page" key={view}><div className="page-heading"><div><h1>{pageTitles[view][0]}</h1><p>{pageTitles[view][1]}</p></div><span className="date-label"><CalendarDays size={13} />15 Ekim 2026, Perşembe</span></div>
    {view === 'home' ? <div className="content-grid"><div className="main-column"><section className="hero"><img src={truckImage} width={1600} height={640} alt="Dağ yolunda ilerleyen ağır vasıta" fetchPriority="high" /><div className="hero-copy"><div className="eyebrow"><i className="live-dot" />YOLLAR UZUN, DOSTLUK YAKIN.</div><h2>Yolun her kilometresinde<br />bir yoldaşın var.</h2><p>Aynı yolu paylaşanlarla buluş. Telsize bağlan,<br />haberdar ol, güvenle yol al.</p><Button asChild className="hero-action"><Link to="/telsiz"><Radio size={13} />Telsize bağlan<ArrowRight size={12} /></Link></Button></div><div className="hero-pager"><i /><i /><i /></div></section><section><SectionHeading icon={<Radio />} title="Canlı telsiz kanalları" count="24 aktif kanal" to="/telsiz" />{channelCards()}</section><section className="news-section"><SectionHeading icon={<Newspaper />} title="Yolun gündemi" to="/gundem" />{newsCards}</section></div><aside className="right-column"><BorderPanel /><TimerPanel /><ChatPanel compact /></aside></div> : <div className="module-content">{view === 'radio' && <><SectionHeading icon={<Radio />} title="Frekansını bul" count="Örnek kanallar" />{channelCards(true)}</>}{view === 'messages' && <ChatPanel />}{view === 'news' && newsCards}{view === 'roads' && <div className="tools-grid"><BorderPanel expanded /><div className="panel"><h2 className="text-base font-semibold flex items-center gap-2"><Navigation size={18} /> Yol bildirimleri</h2><p className="modal-copy">Bolu Tüneli · İstanbul yönü</p><p>Trafik akıcı, yol açık.</p><p className="modal-copy">TEM · Gebze gişeleri</p><p>Yoğunluk nedeniyle yavaş ilerliyor.</p><div className="demo-label">Örnek sürücü bildirimleri · Canlı veri değildir</div></div></div>}{view === 'tools' && <div className="tools-grid"><TimerPanel /><FuelCalculator /></div>}</div>}
    </main>
    <footer className="radio-dock"><div className="radio-station"><div className="radio-station-icon"><Radio size={23} /></div><div><strong>{channels[channel]?.name}</strong><small><i className="live-dot" />{joined ? 'Kanala bağlısın' : 'Bağlantı kapalı'}<span className="text-muted-foreground"> · Önizleme</span></small></div></div><div className="divider" /><div className="radio-center"><Avatar className="speaker-avatar">{talking ? 'AY' : 'MK'}</Avatar><div className={`waveform ${joined ? 'is-speaking' : ''}`} aria-hidden="true">{Array.from({ length: 42 }, (_, i) => <i key={i} />)}</div><div className="speaker-info">{talking ? 'Ahmet Y. · Sen' : 'Mehmet K.'}<small>{talking ? 'Mikrofon önizlemesi' : 'Örnek ses hareketi'}</small></div></div><div className="radio-controls"><Button variant="ghost" size="icon" className="dock-icon sound-button" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'} onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</Button><input type="range" min="0" max="100" defaultValue="65" aria-label="Ses seviyesi" className="volume-control" /><Button className={`ptt-button ${talking ? 'talking' : ''}`} disabled={!joined} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setTalking(true); }} onPointerUp={() => setTalking(false)} onPointerCancel={() => setTalking(false)} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') setTalking(true); }} onKeyUp={() => setTalking(false)} onBlur={() => setTalking(false)}><Mic size={16} />{talking ? 'Konuşuyorsun' : 'Basılı tut, konuş'}</Button><Button variant="ghost" size="icon" className="dock-icon" aria-label="Telsiz seçenekleri" onClick={() => setDialog('radio')}><MoreHorizontal /></Button></div></footer>
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open) setDialog(null); }}><DialogContent><DialogHeader><DialogTitle>{dialog === 'help' ? 'Yoldaş dayanışması' : dialog === 'notifications' ? 'Bildirimler' : dialog === 'profile' ? 'Sürücü profili' : dialog === 'radio' ? 'Telsiz bağlantısı' : 'Yardım & Destek'}</DialogTitle><DialogDescription>{dialog === 'help' ? 'Güvenli bir noktada durduktan sonra çağrı oluştur.' : 'Yoldaş · Etkileşimli önizleme'}</DialogDescription></DialogHeader>{dialog === 'help' ? helpSent ? <div className="modal-copy"><Check className="text-live mb-3" /><strong>{helpSent}</strong><p>Örnek çağrın hazırlandı. Bu önizleme diğer sürücülere bildirim göndermez. Gerçek acil durumlarda 112’yi ara.</p></div> : <div className="modal-options">{['Yolda kaldım', 'Çekici lazım', 'Mola yeri tavsiyesi'].map((item, i) => <Button key={item} variant="outline" className="modal-option" onClick={() => setHelpSent(item)}>{i === 2 ? <Coffee /> : <Truck />}{item}<ArrowRight className="ml-auto" /></Button>)}<p className="modal-copy">Acil durumlarda 112’yi ara. Araç kullanırken ekranla etkileşim kurma.</p></div> : dialog === 'notifications' ? <div className="modal-copy"><p>🟢 Kapıkule kanalında yeni yol bildirimleri var.</p><p>💬 Ahmet Y. genel sohbette bir mesaj paylaştı.</p><p>☕ Mola zamanını planlamayı unutma.</p><small>Bildirimler örnek veridir.</small></div> : dialog === 'profile' ? <div className="flex items-center gap-4 py-4"><Avatar>AY</Avatar><div><strong>Ahmet Yılmaz</strong><p className="modal-copy">Uluslararası nakliye · Örnek sürücü profili</p></div></div> : dialog === 'radio' ? <><p className="modal-copy">{channels[channel]?.name} · Gerçek ses aktarımı bağlı değildir. Bas-konuş ve dalga hareketleri önizleme amaçlıdır.</p><Button variant="outline" onClick={() => { setJoined(!joined); setTalking(false); setDialog(null); }}>{joined ? <><X />Kanaldan ayrıl</> : <><Radio />Yeniden katıl</>}</Button></> : <p className="modal-copy">Bu sürümde kanalları gezebilir, örnek sohbete mesaj ekleyebilir ve sürücü araçlarını kullanabilirsin. Canlı ses, ortak mesajlaşma ve güncel yol verileri henüz bağlı değil. Güvenliğin için yalnızca park halindeyken kullan.</p>}</DialogContent></Dialog>
    <Dialog open={article !== null} onOpenChange={open => { if (!open) setArticle(null); }}><DialogContent><DialogHeader><DialogTitle>{article !== null ? news[article]?.title : ''}</DialogTitle><DialogDescription>Yoldaş Editör · Örnek gündem</DialogDescription></DialogHeader><img src={truckImage} alt="Uzun yol taşımacılığı" width={1600} height={640} className="rounded-md" /><p className="modal-copy">{article !== null ? news[article]?.body : ''}</p></DialogContent></Dialog>
  </div>;
}

function BorderPanel({ expanded = false }: { expanded?: boolean }) {
  const [borders, setBorders] = useState<any[]>([]);

  useEffect(() => {
    fetchBorders();

    const channel = supabase
      .channel('public:border_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'border_status' }, () => {
        fetchBorders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBorders = async () => {
    const { data, error } = await supabase
      .from('border_status')
      .select('*');
    
    if (!error && data && data.length > 0) {
      setBorders(data);
    } else {
      setBorders([
        { gate_name: 'Kapıkule', country: 'Türkiye → Bulgaristan', wait_time: '3–4 saat', queue_length: 'Yoğun', clear: false },
        { gate_name: 'Hamzabeyli', country: 'Türkiye → Bulgaristan', wait_time: '1–2 saat', queue_length: 'Orta yoğun', clear: false },
        { gate_name: 'İpsala', country: 'Türkiye → Yunanistan', wait_time: '30 dk', queue_length: 'Akıcı', clear: true },
        ...(expanded ? [{ gate_name: 'Sarp', country: 'Türkiye → Gürcistan', wait_time: '1 saat', queue_length: 'Akıcı', clear: true }] : [])
      ]);
    }
  };

  return (
    <section className="panel">
      <div className="panel-title">
        <h2><MapPin className="text-blue" />Sınır kapıları</h2>
        <span className="subtle-label flex items-center gap-1"><i className="live-dot" />Canlı Durum</span>
      </div>
      {borders.slice(0, expanded ? borders.length : 3).map(border => (
        <div className="border-row" key={border.gate_name || border.id}>
          <div>
            <strong>{border.gate_name}</strong>
            <small>{border.country || 'Sınır Kapısı'}</small>
          </div>
          <div className={`border-time ${border.clear || border.queue_length === 'Akıcı' ? 'clear' : ''}`}>
            {border.wait_time}
            <small>● {border.queue_length}</small>
          </div>
        </div>
      ))}
      <p className="panel-note"><Clock3 size={9} />Sürücü bildirimlerine göre güncellenir</p>
      {!expanded && <Link to="/yol-durumu" className="panel-bottom-link">Tüm yol ve sınır durumları<ArrowRight size={11} /></Link>}
    </section>
  );
}

function TimerPanel() {
  const [remaining, setRemaining] = useState(2 * 3600 + 14 * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => { if (!running) return; const id = window.setInterval(() => setRemaining(s => Math.max(0, s - 1)), 1000); return () => clearInterval(id); }, [running]);
  useEffect(() => { if (remaining === 0) setRunning(false); }, [remaining]);
  const time = formatCountdown(remaining);
  return <section className="panel timer-panel"><div className="panel-title"><h2><Clock3 className="text-primary" />Sürüş asistanı</h2><span className="subtle-label">Örnek sayaç</span></div><div className="timer-display">{time.hours}<span>:</span>{time.minutes}<span>:</span>{time.seconds}</div><span className="timer-caption">Planlanan kalan sürüş süresi</span><div className="progress-track" /><div className="timer-scale"><span>00:00</span><span>04:30</span></div><div className="break-note"><Coffee size={12} />Sıradaki molan: <strong>45 dakika</strong></div><Button variant="outline" className="timer-button" onClick={() => setRunning(!running)}>{running ? <Pause size={12} /> : <Play size={12} />}{running ? 'Sayacı duraklat' : 'Sayacı başlat'}</Button><div className="demo-label">Resmî takograf yerine geçmez.</div></section>;
}

function ChatPanel({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState('');
  const [audioMessages, setAudioMessages] = useState<string[]>([]);
  const recorder = useRef<MediaRecorder | null>(null);
  const urls = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('public:radio_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'radio_messages' }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('radio_messages')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setMessages(data);
    }
  };

  useEffect(() => () => { 
    if (timer.current) clearTimeout(timer.current); 
    recorder.current?.stream.getTracks().forEach(t => t.stop()); 
    urls.current.forEach(url => URL.revokeObjectURL(url)); 
  }, []);

  const record = async () => {
    if (recording) { recorder.current?.stop(); if (timer.current) clearTimeout(timer.current); return; }
    setRecordError('');
    try { 
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); 
      const media = new MediaRecorder(stream); 
      recorder.current = media; 
      const chunks: BlobPart[] = []; 
      media.ondataavailable = event => { if (event.data.size) chunks.push(event.data); }; 
      media.onstop = () => { 
        stream.getTracks().forEach(t => t.stop()); 
        setRecording(false); 
        const url = URL.createObjectURL(new Blob(chunks, { type: media.mimeType })); 
        urls.current.push(url); 
        setAudioMessages(previous => [...previous, url]); 
      }; 
      media.start(); 
      setRecording(true); 
      timer.current = setTimeout(() => { if (media.state === 'recording') media.stop(); }, 10000); 
    } catch { 
      setRecording(false); 
      setRecordError('Mikrofon açılamadı. Tarayıcının mikrofon iznini kontrol et.'); 
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage = {
      channel_name: 'E-5 / TEM Hattı',
      sender_name: 'Ahmet Yılmaz',
      sender_plate: '42 ABC 34',
      message: message.trim()
    };

    const { error } = await supabase.from('radio_messages').insert([newMessage]);

    if (!error) {
      setMessage('');
      setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } else {
      console.error('Mesaj gönderilemedi:', error.message);
    }
  };

  return (
    <section className="panel chat-panel">
      <div className="chat-title">
        <h2><MessageSquare className="text-blue" />Genel sohbet</h2>
        <span>● Canlı Bağlı</span>
      </div>
      <div className="chat-messages">
        {messages.map((item, index) => {
          const timeString = new Date(item.created_at || Date.now()).toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' });
          return (
            <div className="chat-message" key={item.id || index}>
              <Avatar>AY</Avatar>
              <div className="message-body">
                <div className="message-author">
                  <strong>{item.sender_name} {item.sender_plate ? `(${item.sender_plate})` : ''}</strong>
                  <time>{timeString}</time>
                </div>
                <p>{item.message}</p>
              </div>
            </div>
          );
        })}
        {audioMessages.map(url => (
          <div className="chat-message" key={url}>
            <Avatar>AY</Avatar>
            <div className="message-body">
              <div className="message-author"><strong>Ahmet Y. · Sen</strong></div>
              <audio controls src={url} className="w-full h-9 mt-2" aria-label="Sesli mesajın" />
            </div>
          </div>
        ))}
        <div ref={chatEnd} />
      </div>
      <form className="chat-form" onSubmit={sendMessage}>
        <input 
          placeholder={recording ? 'Kaydediliyor… en fazla 10 sn' : 'Yoldaşlarına bir şeyler yaz...'} 
          value={message} 
          onChange={event => setMessage(event.target.value)} 
          aria-label="Mesajın" 
        />
        <Button type="button" variant="ghost" aria-label={recording ? 'Kaydı durdur' : 'Sesli mesaj kaydet'} onClick={record} className={recording ? 'text-destructive' : 'text-muted-foreground'}>
          <Mic size={13} />
        </Button>
        <Button type="submit" variant="ghost" className="text-primary" aria-label="Mesaj gönder">
          <Send size={13} />
        </Button>
      </form>
      {recordError && <p role="alert" className="text-destructive text-[10px] mt-2">{recordError}</p>}
      <div className="demo-label">{compact ? 'Canlı tır sohbet hattı' : 'Tüm yoldaşlarla ortak frekans'}</div>
    </section>
  );
}

function FuelCalculator() {
  const [distance, setDistance] = useState('750');
  const [consumption, setConsumption] = useState('30');
  const [price, setPrice] = useState('54');
  const result = calculateFuelCost(Number(distance), Number(consumption), Number(price));
  return <section className="panel"><div className="panel-title"><h2><Fuel className="text-warning" />Yakıt & rota maliyeti</h2></div><label className="field-label">Mesafe (km)<input type="number" min="0" value={distance} onChange={e => setDistance(e.target.value)} /></label><label className="field-label">Ortalama tüketim (L / 100 km)<input type="number" min="0" step="0.1" value={consumption} onChange={e => setConsumption(e.target.value)} /></label><label className="field-label">Motorin litre fiyatı (₺)<input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></label><div className="result-box"><small>Tahmini yakıt maliyeti · {result?.liters.toLocaleString('tr-TR')} litre</small>{result ? result.cost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : 'Geçerli değerler girin'}</div><p className="demo-label">Geçiş ücretleri hariçtir. Fiyat örnektir, güncel pompa fiyatını gir.</p></section>;
}
