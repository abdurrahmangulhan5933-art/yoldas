import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowDownUp, ArrowRight, Bell, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Coffee, Compass, Fuel, Headphones, LayoutGrid, Lock, MapPin, Menu, MessageSquare, Mic, MicOff, Moon, MoreHorizontal, Navigation, Newspaper, Pause, Play, Plus, Radio, Search, Send, Settings2, ShieldCheck, Signal, Siren, Trash2, Truck, Users, Volume2, VolumeX, Wrench, X } from 'lucide-react';
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

const pageTitles: Record<View, [string, string]> = {
  home: ['Yolun açık olsun, Yoldaş', 'Yolun gündemi, telsizin sesi, dostların burada.'],
  radio: ['Canlı Telsiz', 'Aynı yolda, aynı frekanstayız.'],
  messages: ['Mesajlar', 'Yoldaki dostlarından haber var.'],
  news: ['Yol Gündemi', 'Sektörden ve yollardan öne çıkanlar.'],
  roads: ['Yol & Sınır Durumu', 'Rotanı planla, yolun açık olsun.'],
  tools: ['Pratik Araçlar', 'Yol hesabın her zaman yanında.'],
};

function Avatar({ children, className = '' }: { children: ReactNode; className?: string }) { return <span className={`avatar ${className}`}>{children}</span>; }
function SectionHeading({ icon, title, count, to, action = 'Tümünü gör' }: { icon: ReactNode; title: string; count?: string; to?: '/' | '/telsiz' | '/gundem' | '/yol-durumu'; action?: string }) { return <div className="section-heading"><h2>{icon}{title}{count && <span className="count">{count}</span>}</h2>{to && <Link to={to} className="text-action">{action}<ArrowRight /></Link>}</div>; }

// Süre Yazıları Tamamen Kaldırılmış Modern Telsiz Ses Oynatıcı
function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', width: '100%', maxWidth: '240px' }}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={() => {
          if (audioRef.current && isFinite(audioRef.current.duration)) {
            const current = audioRef.current.currentTime;
            const total = audioRef.current.duration;
            setProgress((current / total) * 100);
          }
        }}
        onEnded={() => setIsPlaying(false)}
      />
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#2563eb', color: '#fff', flexShrink: 0 }}
      >
        {isPlaying ? <Pause size={13} /> : <Play size={13} />}
      </Button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ width: '100%', background: '#cbd5e1', height: '5px', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: `${progress}%`, background: '#2563eb', height: '100%', transition: 'width 0.1s linear' }} />
        </div>
      </div>
    </div>
  );
}

export function Platform({ view = 'home' }: { view?: View }) {
  const [channel, setChannel] = useState(0);
  const [joined, setJoined] = useState(true);
  const [talking, setTalking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<'help' | 'notifications' | 'profile' | 'radio' | 'support' | null>(null);
  const [article, setArticle] = useState<any | null>(null);
  const [newsList, setNewsList] = useState<any[]>([]);
  
  // Gizli Yönetici (Admin) Durumları
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminError, setAdminError] = useState('');
  const [secretClickCount, setSecretClickCount] = useState(0);

  // Haber Ekleme Durumları
  const [showAddNewsModal, setShowAddNewsModal] = useState(false);
  const [newNewsCategory, setNewNewsCategory] = useState('AKARYAKIT');
  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsBody, setNewNewsBody] = useState('');
  const [newNewsImageUrl, setNewNewsImageUrl] = useState('');
  const [newsSubmitError, setNewsSubmitError] = useState('');
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);

  // Telsiz Kayıt Durumları
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [helpSent, setHelpSent] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedAdmin = localStorage.getItem('yoldas_is_admin');
    if (savedAdmin === 'true') {
      setIsAdmin(true);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setShowAdminLoginModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchNews();
    const newsChannel = supabase
      .channel('public:news')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => {
        fetchNews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(newsChannel);
    };
  }, []);

  const fetchNews = async () => {
    const { data, error } = await supabase.from('news').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setNewsList(data);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === 'yoldas123') {
      setIsAdmin(true);
      localStorage.setItem('yoldas_is_admin', 'true');
      setShowAdminLoginModal(false);
      setAdminPasswordInput('');
      setAdminError('');
    } else {
      setAdminError('Hatalı yönetici şifresi!');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('yoldas_is_admin');
  };

  const handleSecretClick = () => {
    const nextCount = secretClickCount + 1;
    if (nextCount >= 3) {
      setShowAdminLoginModal(true);
      setSecretClickCount(0);
    } else {
      setSecretClickCount(nextCount);
    }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle.trim() || !newNewsBody.trim()) return;

    setIsSubmittingNews(true);
    setNewsSubmitError('');

    const payload: any = {
      category: newNewsCategory,
      title: newNewsTitle.trim(),
      body: newNewsBody.trim(),
    };

    if (newNewsImageUrl.trim()) {
      payload.image_url = newNewsImageUrl.trim();
    }

    const { error } = await supabase.from('news').insert([payload]);

    setIsSubmittingNews(false);

    if (error) {
      setNewsSubmitError(`Haber yayınlanamadı: ${error.message}`);
    } else {
      setNewNewsTitle('');
      setNewNewsBody('');
      setNewNewsImageUrl('');
      setShowAddNewsModal(false);
      fetchNews();
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('Bu haberi silmek istediğinize emin misiniz?')) return;
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (!error) {
      fetchNews();
    }
  };

  // Telsiz Sesli Kayıt Başlat (Çift tetikleme korumalı)
  const startRecording = async () => {
    if (recording || (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording')) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 1000) return; // Çok kısa tıklamaları yoksay

        const savedName = localStorage.getItem('yoldas_user_name') || 'Sürücü';
        const savedPlate = localStorage.getItem('yoldas_user_plate') || '34 YLD 01';
        
        const fileName = `telsiz_${Date.now()}.webm`;
        
        const { error: uploadError } = await supabase.storage
          .from('radio-audio')
          .upload(fileName, audioBlob);

        if (uploadError) {
          console.error('Ses yüklenemedi:', uploadError.message);
          return;
        }

        const { data: publicURLData } = supabase.storage
          .from('radio-audio')
          .getPublicUrl(fileName);

        await supabase.from('radio_messages').insert([
          {
            channel_name: channels[channel].name,
            sender_name: savedName,
            sender_plate: savedPlate,
            message: `🎙️ Sesli Telsiz Mesajı`,
            audio_url: publicURLData.publicUrl,
          },
        ]);
      };

      mediaRecorderRef.current.start();
      setTalking(true);
      setRecording(true);
    } catch (err) {
      console.error('Mikrofon erişim hatası:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setTalking(false);
    setRecording(false);
  };

  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  
  const selectChannel = (index: number) => {
    setChannel(index);
    setJoined(true);
  };

  const channelCards = (all = false) => (
    <div className="channel-grid">
      {channels
        .slice(0, all ? channels.length : 4)
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.name.toLocaleLowerCase('tr').includes(search.toLocaleLowerCase('tr')))
        .map(({ item, index }) => (
          <article className={`channel-card ${joined && channel === index ? 'selected' : ''}`} key={item.name}>
            <div className="channel-top">
              <div className={`channel-icon ${item.tone}`}><item.icon size={17} /></div>
              <span className="live-tag"><i className="live-dot" />CANLI</span>
            </div>
            <h3>{item.name}</h3>
            <p>{item.subtitle}</p>
            <div className="channel-footer">
              <div className="avatars">
                {item.initials.map(initial => <Avatar key={initial}>{initial}</Avatar>)}
                <span><Users size={10} className="inline mr-1" />{item.count}</span>
              </div>
              <Button
                variant="outline"
                className={`join-button ${joined && channel === index ? 'joined' : ''}`}
                onClick={() => selectChannel(index)}
              >
                {joined && channel === index ? <><Signal size={12} /> Bağlısın</> : <><Headphones size={12} /> Kanala katıl</>}
              </Button>
            </div>
          </article>
        ))}
    </div>
  );

  const renderNewsCards = (
    <div className="news-grid">
      {newsList.length === 0 ? (
        <p className="text-xs text-muted-foreground p-4">Henüz yayınlanmış bir gündem haberi yok.</p>
      ) : (
        newsList.map((item, index) => (
          <article className="news-card" key={item.id || index} style={{ position: 'relative' }}>
            <div className={`news-cover ${index % 2 !== 0 ? 'second' : ''}`}>
              <img src={item.image_url || truckImage} alt="Yoldaş Haber" width={1600} height={640} loading="lazy" style={{ objectFit: 'cover' }} />
              <span className="news-category">{item.category}</span>
            </div>
            <div className="news-copy">
              <Button variant="ghost" className="h-auto p-0 whitespace-normal text-left justify-start" onClick={() => setArticle(item)}>
                <h3>{item.title}</h3>
              </Button>
              <div className="news-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock3 size={10} />
                  {item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : 'Şimdi'}
                </span>
                <span className="ml-auto">Yoldaş Editör</span>
                
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteNews(item.id)}
                    style={{ color: '#ef4444', marginLeft: '8px', padding: '2px 6px' }}
                  >
                    <Trash2 size={13} />
                  </Button>
                )}
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );

  return <div className="app-shell">
    <aside className="sidebar"><Link to="/" className="brand"><span className="brand-mark"><Truck size={24} /></span><span className="brand-name">yoldaş<small>YOLUN AÇIK, TELSİZİN AÇIK.</small></span></Link><nav aria-label="Ana menü"><div className="nav-label">YOL ARKADAŞIN</div>{navigation.map(item => <Link key={item.to} to={item.to} className={`nav-link ${view === item.view ? 'active' : ''}`}><item.icon /><span>{item.label}</span>{item.view === 'messages' && <span className="nav-count">3</span>}</Link>)}</nav><div className="nav-label">FAVORİ KANALLARIN</div><Link to="/telsiz" className="room-shortcut" onClick={() => selectChannel(0)}><i className="live-dot" />E-5 / TEM Hattı</Link><Link to="/telsiz" className="room-shortcut" onClick={() => selectChannel(1)}><i className="live-dot" />Kapıkule Sınır Kapısı</Link><Link to="/telsiz" className="room-shortcut" onClick={() => selectChannel(3)}><i className="live-dot" />Gece Sürüşü</Link><div className="sidebar-bottom"><div className="help-box"><strong className="flex gap-2 items-center"><Siren size={16} className="text-warning" />Yolda yalnız değilsin.</strong><p>Bir el uzakta, binlerce yoldaş yanında.</p><Button variant="outline" className="w-full h-8 text-[10px]" onClick={() => { setHelpSent(''); setDialog('help'); }}>Dayanışma çağrısı<ArrowRight size={12} /></Button></div><Button variant="ghost" className="w-full text-muted-foreground justify-start text-[11px]" onClick={() => setDialog('support')}><CircleHelp size={15} /> Yardım & Destek</Button><div className="profile"><Avatar>YD</Avatar><div><strong className="text-[11px]">Sürücü Profili</strong><small className="flex items-center gap-1"><ShieldCheck size={10} /> Onaylı sürücü</small></div><Button variant="ghost" size="icon" aria-label="Profil seçenekleri" onClick={() => setDialog('profile')}><ChevronDown size={14} /></Button></div></div></aside>
    <header className="topbar"><div className="breadcrumb"><Truck size={14} /><ChevronRight size={11} /><strong>{view === 'home' ? 'Genel Bakış' : pageTitles[view][0]}</strong></div><div className="top-actions"><label className="search-box"><Search size={14} className="text-muted-foreground" /><input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Kanal, konu veya yol arkadaşı ara..." aria-label="Kanal ara" /><kbd>⌘ K</kbd></label><span className="connection"><i className="live-dot" />1.248 sürücü yolda</span><Button variant="ghost" size="icon" className="notification" aria-label="Bildirimler" onClick={() => setDialog('notifications')}><Bell size={17} /></Button></div></header>
    <main className="page-content content-page" key={view}><div className="page-heading"><div><h1>{pageTitles[view][0]}</h1><p>{pageTitles[view][1]}</p></div><span className="date-label" onClick={handleSecretClick} style={{ cursor: 'pointer', userSelect: 'none' }} title="Yoldaş v1.0"><CalendarDays size={13} />16 Ekim 2026, Cuma</span></div>
    {view === 'home' ? <div className="content-grid"><div className="main-column"><section className="hero"><img src={truckImage} width={1600} height={640} alt="Dağ yolunda ilerleyen ağır vasıta" fetchPriority="high" /><div className="hero-copy"><div className="eyebrow"><i className="live-dot" />YOLLAR UZUN, DOSTLUK YAKIN.</div><h2>Yolun her kilometresinde<br />bir yoldaşın var.</h2><p>Aynı yolu paylaşanlarla buluş. Telsize bağlan,<br />haberdar ol, güvenle yol al.</p><Button asChild className="hero-action"><Link to="/telsiz"><Radio size={13} />Telsize bağlan<ArrowRight size={12} /></Link></Button></div><div className="hero-pager"><i /><i /><i /></div></section><section><SectionHeading icon={<Radio />} title="Canlı telsiz kanalları" count="24 aktif kanal" to="/telsiz" />{channelCards()}</section><section className="news-section"><SectionHeading icon={<Newspaper />} title="Yolun gündemi" to="/gundem" />{renderNewsCards}</section></div><aside className="right-column"><BorderPanel /><TimerPanel /><ChatPanel compact channelName={channels[channel]?.name} /></aside></div> : <div className="module-content">{view === 'radio' && <><SectionHeading icon={<Radio />} title="Frekansını bul" count="Aktif Kanallar" />{channelCards(true)}</>}{view === 'messages' && <ChatPanel channelName={channels[channel]?.name} />}{view === 'news' && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <SectionHeading icon={<Newspaper />} title="Yol Gündemi & İndirimler" />
          {isAdmin && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={() => setShowAddNewsModal(true)} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <Plus size={16} /> Haber / Duyuru Ekle
              </Button>
              <Button variant="outline" onClick={handleAdminLogout} style={{ fontSize: '11px' }}>
                Yönetici Çıkışı
              </Button>
            </div>
          )}
        </div>
        {renderNewsCards}
      </div>
    )}{view === 'roads' && <div className="tools-grid"><BorderPanel expanded /><div className="panel"><h2 className="text-base font-semibold flex items-center gap-2"><Navigation size={18} /> Yol bildirimleri</h2><p className="modal-copy">Bolu Tüneli · İstanbul yönü</p><p>Trafik akıcı, yol açık.</p><p className="modal-copy">TEM · Gebze gişeleri</p><p>Yoğunluk nedeniyle yavaş ilerliyor.</p><div className="demo-label">Örnek sürücü bildirimleri</div></div></div>}{view === 'tools' && <div className="tools-grid"><TimerPanel /><FuelCalculator /></div>}</div>}
    </main>
    <footer className="radio-dock"><div className="radio-station"><div className="radio-station-icon"><Radio size={23} /></div><div><strong>{channels[channel]?.name}</strong><small><i className="live-dot" />{joined ? 'Kanala bağlısın' : 'Bağlantı kapalı'}</small></div></div><div className="divider" /><div className="radio-center"><Avatar className="speaker-avatar">YD</Avatar><div className={`waveform ${talking ? 'is-speaking' : ''}`} aria-hidden="true">{Array.from({ length: 42 }, (_, i) => <i key={i} />)}</div><div className="speaker-info">{'Sürücü Telsizi'}<small>{talking ? 'Mikrofon Açık (Konuşuyorsun)' : 'Dinlemede'}</small></div></div><div className="radio-controls"><Button variant="ghost" size="icon" className="dock-icon sound-button" aria-label={muted ? 'Sesi aç' : 'Sesi kapat'} onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</Button><input type="range" min="0" max="100" defaultValue="65" aria-label="Ses seviyesi" className="volume-control" /><Button className={`ptt-button ${talking ? 'talking' : ''}`} disabled={!joined} onMouseDown={(e) => { e.preventDefault(); startRecording(); }} onMouseUp={(e) => { e.preventDefault(); stopRecording(); }} onTouchStart={(e) => { e.preventDefault(); startRecording(); }} onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}><Mic size={16} />{talking ? 'Konuşuyorsun...' : 'Basılı tut, konuş'}</Button><Button variant="ghost" size="icon" className="dock-icon" aria-label="Telsiz seçenekleri" onClick={() => setDialog('radio')}><MoreHorizontal /></Button></div></footer>
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open) setDialog(null); }}><DialogContent><DialogHeader><DialogTitle>{dialog === 'help' ? 'Yoldaş dayanışması' : dialog === 'notifications' ? 'Bildirimler' : dialog === 'profile' ? 'Sürücü profili' : dialog === 'radio' ? 'Telsiz bağlantısı' : 'Yardım & Destek'}</DialogTitle><DialogDescription>{dialog === 'help' ? 'Güvenli bir noktada durduktan sonra çağrı oluştur.' : 'Yoldaş · Etkileşimli önizleme'}</DialogDescription></DialogHeader>{dialog === 'help' ? helpSent ? <div className="modal-copy"><Check className="text-live mb-3" /><strong>{helpSent}</strong><p>Örnek çağrın hazırlandı. Gerçek acil durumlarda 112’yi ara.</p></div> : <div className="modal-options">{['Yolda kaldım', 'Çekici lazım', 'Mola yeri tavsiyesi'].map((item, i) => <Button key={item} variant="outline" className="modal-option" onClick={() => setHelpSent(item)}>{i === 2 ? <Coffee /> : <Truck />}{item}<ArrowRight className="ml-auto" /></Button>)}<p className="modal-copy">Acil durumlarda 112’yi ara.</p></div> : dialog === 'notifications' ? <div className="modal-copy"><p>🟢 Kapıkule kanalında yeni yol bildirimleri var.</p></div> : dialog === 'profile' ? <div className="flex flex-col gap-3 py-2"><p className="text-xs text-muted-foreground">Kayıtlı sürücü kimliğinizi sohbet başlığından düzenleyebilirsiniz.</p></div> : dialog === 'radio' ? <><p className="modal-copy">{channels[channel]?.name} · Telsiz kanalındasınız.</p><Button variant="outline" onClick={() => { setJoined(!joined); setTalking(false); setDialog(null); }}>{joined ? <><X />Kanaldan ayrıl</> : <><Radio />Yeniden katıl</>}</Button></> : <p className="modal-copy">Yoldaş nakliye ve iletişim platformu.</p>}</DialogContent></Dialog>
    
    <Dialog open={article !== null} onOpenChange={open => { if (!open) setArticle(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{article?.title}</DialogTitle>
          <DialogDescription>{article?.category} · Yoldaş Editör</DialogDescription>
        </DialogHeader>
        <img src={article?.image_url || truckImage} alt="Uzun yol taşımacılığı" width={1600} height={640} className="rounded-md" style={{ maxHeight: '250px', objectFit: 'cover' }} />
        <p className="modal-copy" style={{ marginTop: '12px', lineHeight: '1.6' }}>{article?.body}</p>
      </DialogContent>
    </Dialog>

    <Dialog open={showAdminLoginModal} onOpenChange={setShowAdminLoginModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yönetici Panel Girişi</DialogTitle>
          <DialogDescription>Yol gündemine içerik eklemek için yönetici şifrenizi girin.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Yönetici Şifresi:</label>
            <input
              type="password"
              required
              placeholder="Şifrenizi girin"
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' }}
            />
          </div>
          {adminError && <p style={{ color: 'red', fontSize: '11px' }}>{adminError}</p>}
          <Button type="submit" className="w-full mt-2">
            Giriş Yap
          </Button>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={showAddNewsModal} onOpenChange={setShowAddNewsModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Yol Gündemi / Haber Ekle</DialogTitle>
          <DialogDescription>
            Sürücülere aktarmak istediğin haber, mazot indirimi veya yol uyarısını paylaş.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateNews} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Kategori:</label>
            <select
              value={newNewsCategory}
              onChange={(e) => setNewNewsCategory(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' }}
            >
              <option value="AKARYAKIT">AKARYAKIT / MAZOT İNDİRİMİ</option>
              <option value="SEKTÖRDEN">SEKTÖRDEN HABERLER</option>
              <option value="YOL DURUMU">YOL & TRAFİK UYARISI</option>
              <option value="TAKOGRAF">TAKOGRAF & MEVZUAT</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Başlık:</label>
            <input
              type="text"
              required
              placeholder="Örn: Motorine 1.5 TL İndirim Geliyor!"
              value={newNewsTitle}
              onChange={(e) => setNewNewsTitle(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Kapak Resmi Bağlantısı (İsteğe Bağlı URL):</label>
            <input
              type="url"
              placeholder="https://örnek.com/resim.jpg (Boş bırakırsanız varsayılan resim kullanılır)"
              value={newNewsImageUrl}
              onChange={(e) => setNewNewsImageUrl(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Açıklama / Detay:</label>
            <textarea
              required
              rows={4}
              placeholder="Haber veya duyurunun detaylarını buraya yazabilirsiniz..."
              value={newNewsBody}
              onChange={(e) => setNewNewsBody(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' }}
            />
          </div>

          {newsSubmitError && (
            <p style={{ color: 'red', fontSize: '11px', marginTop: '4px' }}>{newsSubmitError}</p>
          )}

          <Button type="submit" disabled={isSubmittingNews} className="w-full mt-2">
            {isSubmittingNews ? 'Yayınlanıyor...' : 'Gündemi Yayınla'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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
  return <section className="panel timer-panel"><div className="panel-title"><h2><Clock3 className="text-primary" />Sürüş asistanı</h2><span className="subtle-label">Sayaç</span></div><div className="timer-display">{time.hours}<span>:</span>{time.minutes}<span>:</span>{time.seconds}</div><span className="timer-caption">Planlanan kalan sürüş süresi</span><div className="progress-track" /><div className="timer-scale"><span>00:00</span><span>04:30</span></div><div className="break-note"><Coffee size={12} />Sıradaki molan: <strong>45 dakika</strong></div><Button variant="outline" className="timer-button" onClick={() => setRunning(!running)}>{running ? <Pause size={12} /> : <Play size={12} />}{running ? 'Sayacı duraklat' : 'Sayacı başlat'}</Button><div className="demo-label">Resmî takograf yerine geçmez.</div></section>;
}

function ChatPanel({ compact = false, channelName = 'E-5 / TEM Hattı' }: { compact?: boolean; channelName?: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [userPlate, setUserPlate] = useState('');
  const [isProfileSet, setIsProfileSet] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('yoldas_user_name');
    const savedPlate = localStorage.getItem('yoldas_user_plate');
    if (savedName && savedPlate) {
      setUserName(savedName);
      setUserPlate(savedPlate);
      setIsProfileSet(true);
    } else {
      setShowProfileModal(true);
    }
    fetchMessages();

    const messageChannel = supabase
      .channel(`room_${channelName}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'radio_messages',
        },
        (payload) => {
          if (payload.new.channel_name === channelName) {
            setMessages((prev) => {
              if (prev.some((msg) => msg.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
            setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [channelName]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('radio_messages')
      .select('*')
      .eq('channel_name', channelName)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userPlate.trim()) return;
    localStorage.setItem('yoldas_user_name', userName.trim());
    localStorage.setItem('yoldas_user_plate', userPlate.trim().toUpperCase());
    setIsProfileSet(true);
    setShowProfileModal(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!isProfileSet) {
      setShowProfileModal(true);
      return;
    }

    const msgText = message.trim();
    setMessage('');

    const { error } = await supabase.from('radio_messages').insert([
      {
        channel_name: channelName,
        sender_name: userName,
        sender_plate: userPlate,
        message: msgText,
      },
    ]);

    if (error) {
      console.error('Mesaj gönderilemedi:', error.message);
    }
  };

  return (
    <section className="panel chat-panel">
      <div className="chat-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>
          <MessageSquare className="text-blue" />
          {channelName} Sohbeti
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>● Canlı ({messages.length})</span>
          {isProfileSet && (
            <button
              onClick={() => setShowProfileModal(true)}
              style={{ fontSize: '10px', background: '#e2e8f0', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
            >
              {userPlate} (Düzenle)
            </button>
          )}
        </div>
      </div>
      
      <div className="chat-messages" style={{ minHeight: '200px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px 0' }}>
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Henüz mesaj yok. İlk mesajı sen yaz!</p>
        ) : (
          messages.map((item, index) => {
            const timeString = item.created_at
              ? new Date(item.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
              : '';
            return (
              <div className="chat-message" key={item.id || index} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Avatar>
                  {item.sender_name
                    ? item.sender_name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'YD'}
                </Avatar>
                <div className="message-body" style={{ flex: 1 }}>
                  <div className="message-author" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>
                      {item.sender_name} {item.sender_plate ? `(${item.sender_plate})` : ''}
                    </strong>
                    <time style={{ fontSize: '10px', opacity: 0.6 }}>{timeString}</time>
                  </div>
                  {item.audio_url ? (
                    <AudioPlayer src={item.audio_url} />
                  ) : (
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{item.message}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEnd} />
      </div>

      <form className="chat-form" onSubmit={sendMessage}>
        <input
          placeholder={isProfileSet ? `${userName} olarak ${channelName} kanalına yaz...` : 'Mesaj yazmak için profilini oluştur...'}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-label="Mesajın"
        />
        <Button type="submit" variant="ghost" className="text-primary" aria-label="Mesaj gönder">
          <Send size={13} />
        </Button>
      </form>

      <div className="demo-label">{compact ? 'Canlı tır sohbet hattı' : `${channelName} ortak frekansı`}</div>

      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sürücü Kimliğinizi Belirleyin</DialogTitle>
            <DialogDescription>
              Yoldaşlara doğru plaka ve adla mesaj gönderebilmek için bilgilerinizi girin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Adınız Soyadınız:</label>
              <input
                type="text"
                required
                placeholder="Örn: Ahmet Yılmaz"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Araç Plakanız:</label>
              <input
                type="text"
                required
                placeholder="Örn: 42 ABC 34"
                value={userPlate}
                onChange={(e) => setUserPlate(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginTop: '4px' }}
              />
            </div>
            <Button type="submit" className="w-full mt-2">
              Kaydet ve Sohbete Başla
            </Button>
          </form>
        </DialogContent>
      </Dialog>
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
