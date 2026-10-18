import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Calculator, CalendarClock, ClipboardCheck, Fuel, Hospital, LocateFixed, ParkingCircle, Phone, Pill, RotateCcw, Utensils, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateTrip, daysUntil, docStatus, nearbyUrl } from '@/lib/driver-tools';

/** Tarayıcıda saklanan basit durum. Sunucu/istemci uyuşmazlığı olmasın diye değer efektte okunur. */
function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setValue(JSON.parse(raw) as T); } catch { /* özel mod / bozuk veri */ }
  }, [key]);
  const update = (next: T) => {
    setValue(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* özel mod */ }
  };
  return [value, update] as const;
}

/** "54,5" ve "54.5" yazımlarını kabul eder; boş alan NaN döner. */
function num(text: string) { return text.trim() === '' ? Number.NaN : Number(text.replace(',', '.')); }
const money = (n: number) => `${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺`;
const dec = (n: number, d = 1) => n.toLocaleString('tr-TR', { maximumFractionDigits: d });

/* ---------- Yakınımda ---------- */
const NEARBY = [
  { label: 'Akaryakıt', query: 'akaryakıt istasyonu', icon: Fuel },
  { label: 'TIR parkı', query: 'tır parkı', icon: ParkingCircle },
  { label: 'Lastik / tamir', query: 'tır lastikçi oto sanayi', icon: Wrench },
  { label: 'Yemek / mola', query: 'restoran', icon: Utensils },
  { label: 'Eczane', query: 'eczane', icon: Pill },
  { label: 'Hastane', query: 'hastane acil servis', icon: Hospital },
];

export function NearbyPanel({ compact = false }: { compact?: boolean }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'denied'>('idle');
  const locate = () => {
    if (!('geolocation' in navigator)) { setState('denied'); return; }
    setState('busy');
    navigator.geolocation.getCurrentPosition(
      pos => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setState('idle'); },
      () => setState('denied'),
      { timeout: 8000, maximumAge: 60000 },
    );
  };
  return (
    <section className="panel">
      <div className="panel-title"><h2><LocateFixed />Yakınımda</h2><span className="subtle-label">Haritada aç</span></div>
      <div className={`nearby-grid ${compact ? 'compact' : ''}`}>
        {NEARBY.map(item => (
          <a key={item.label} className="nearby-item" href={nearbyUrl(item.query, coords)} target="_blank" rel="noopener noreferrer"><item.icon size={18} /><span>{item.label}</span></a>
        ))}
      </div>
      <Button type="button" variant="outline" className="tool-btn" onClick={locate} disabled={state === 'busy'}><LocateFixed size={14} />{coords ? 'Konum alındı, yenile' : state === 'busy' ? 'Konum alınıyor…' : 'Konumumu kullan'}</Button>
      {state === 'denied' && <p className="msg-error">Konum alınamadı. Harita yine de cihazının konumuna göre arama yapar.</p>}
      {compact && <Link to="/araclar" className="panel-bottom-link">Tüm sürücü araçları<ArrowRight size={11} /></Link>}
    </section>
  );
}

/* ---------- Sefer maliyeti ---------- */
function TripCalculator() {
  const [saved, setSaved] = useStored('yoldas_trip_defaults', { consumption: '', price: '' });
  const [distance, setDistance] = useState('');
  const [extra, setExtra] = useState('');
  const [freight, setFreight] = useState('');
  const result = calculateTrip(num(distance), num(saved.consumption), num(saved.price), extra.trim() ? num(extra) : 0, freight.trim() ? num(freight) : 0);
  const valid = result !== null && num(distance) > 0;
  return (
    <section className="panel">
      <div className="panel-title"><h2><Calculator />Sefer maliyeti</h2><span className="subtle-label">Yakıt + giderler</span></div>
      <div className="dlg-form tool-form">
        <label>Mesafe (km)<input inputMode="decimal" placeholder="Örn: 1200" value={distance} onChange={e => setDistance(e.target.value)} /></label>
        <label>Tüketim (litre / 100 km)<input inputMode="decimal" placeholder="Örn: 30" value={saved.consumption} onChange={e => setSaved({ ...saved, consumption: e.target.value })} /></label>
        <label>Mazot fiyatı (₺ / litre)<input inputMode="decimal" placeholder="Örn: 54,50" value={saved.price} onChange={e => setSaved({ ...saved, price: e.target.value })} /></label>
        <label>Diğer giderler (köprü, otoyol, yemek…) ₺<input inputMode="decimal" placeholder="İsteğe bağlı" value={extra} onChange={e => setExtra(e.target.value)} /></label>
        <label>Navlun / sefer ücreti ₺<input inputMode="decimal" placeholder="İsteğe bağlı" value={freight} onChange={e => setFreight(e.target.value)} /></label>
      </div>
      {valid ? (
        <div className="tool-result">
          <div><small>Yakıt</small><strong>{dec(result.liters, 0)} L</strong></div>
          <div><small>Yakıt maliyeti</small><strong>{money(result.fuelCost)}</strong></div>
          <div><small>Toplam gider</small><strong>{money(result.totalCost)}</strong></div>
          <div><small>Km başına</small><strong>{dec(result.perKm, 2)} ₺</strong></div>
          {result.net !== null && <div className={`wide ${result.net >= 0 ? 'good' : 'bad'}`}><small>{result.net >= 0 ? 'Net kazanç (şoför maaşı, bakım, lastik vb. hariç)' : 'Zarar (şoför maaşı, bakım, lastik vb. hariç)'}</small><strong>{money(result.net)}</strong></div>}
        </div>
      ) : <p className="modal-copy">Mesafe, tüketim ve mazot fiyatını gir; sonuç burada görünür. Tüketim ve fiyat bir sonraki sefer için kayıtlı kalır.</p>}
    </section>
  );
}

/* ---------- Belge ve muayene takibi ---------- */
const DOCS = [
  { id: 'ehliyet', label: 'Ehliyet' },
  { id: 'src', label: 'SRC belgesi' },
  { id: 'psikoteknik', label: 'Psikoteknik' },
  { id: 'surucu-karti', label: 'Sürücü kartı' },
  { id: 'muayene', label: 'Araç muayenesi' },
  { id: 'sigorta', label: 'Trafik sigortası' },
  { id: 'kasko', label: 'Kasko' },
  { id: 'yetki', label: 'Yetki belgesi' },
];

function DocumentTracker() {
  const [dates, setDates] = useStored<Record<string, string>>('yoldas_docs', {});
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => { setToday(new Date()); }, []);
  return (
    <section className="panel">
      <div className="panel-title"><h2><CalendarClock />Belge takibi</h2><span className="subtle-label">Bitiş tarihleri</span></div>
      <p className="modal-copy">Bitiş tarihini seç; 30 gün kala uyarı rengi görürsün. Bilgiler yalnızca bu cihazda saklanır.</p>
      {DOCS.map(doc => {
        const value = dates[doc.id] ?? '';
        const days = today && value ? daysUntil(value, today) : null;
        const status = days === null ? null : docStatus(days);
        return (
          <div className="doc-row" key={doc.id}>
            <label htmlFor={`doc-${doc.id}`}>{doc.label}</label>
            <input id={`doc-${doc.id}`} type="date" value={value} onChange={e => setDates({ ...dates, [doc.id]: e.target.value })} />
            <span className={`doc-badge ${status ?? 'none'}`}>{days === null ? '—' : status === 'expired' ? `${Math.abs(days)} gün geçti` : days === 0 ? 'Bugün bitiyor' : `${days} gün kaldı`}</span>
          </div>
        );
      })}
    </section>
  );
}

/* ---------- Sınır evrak listesi ---------- */
const CHECKLIST = [
  'Pasaport (geçerlilik süresi yeterli mi?)',
  'Ehliyet ve SRC belgesi',
  'Araç ruhsatı (çekici ve dorse)',
  'Yetki belgesi / ikili geçiş izni (gereken ülkelerde)',
  'CMR ve sevk irsaliyesi / fatura',
  'Gümrük evrakı (TIR karnesi veya T1 / ihracat beyannamesi)',
  'Zorunlu sigorta (yeşil kart) ve kasko',
  'Sürücü kartı ve takograf çıktıları',
  'ADR belgesi (tehlikeli madde taşıyorsan)',
  'Vize veya seyahat izni (gereken ülkelerde)',
];

function BorderChecklist() {
  const [done, setDone] = useStored<string[]>('yoldas_checklist', []);
  const toggle = (item: string) => setDone(done.includes(item) ? done.filter(x => x !== item) : [...done, item]);
  const count = CHECKLIST.filter(i => done.includes(i)).length;
  return (
    <section className="panel">
      <div className="panel-title"><h2><ClipboardCheck />Sınır evrak listesi</h2><span className="subtle-label">{count}/{CHECKLIST.length}</span></div>
      {CHECKLIST.map(item => (
        <label className="check-row" key={item}><input type="checkbox" checked={done.includes(item)} onChange={() => toggle(item)} /><span>{item}</span></label>
      ))}
      <Button type="button" variant="outline" className="tool-btn" onClick={() => setDone([])}><RotateCcw size={13} />Listeyi sıfırla</Button>
      <p className="panel-note">Genel hatırlatma listesidir. Gerekli evrak ülkeye ve yüke göre değişir; güncel şartları ilgili kurumlardan doğrula.</p>
    </section>
  );
}

/* ---------- Acil numaralar ---------- */
const EMERGENCY = [
  { number: '112', label: 'Acil çağrı (ambulans, itfaiye, polis, jandarma)' },
  { number: '155', label: 'Polis imdat' },
  { number: '156', label: 'Jandarma imdat' },
  { number: '159', label: 'Karayolları yol durumu hattı' },
];

function EmergencyNumbers() {
  return (
    <section className="panel">
      <div className="panel-title"><h2><Phone />Acil numaralar</h2><span className="subtle-label">Dokun, ara</span></div>
      {EMERGENCY.map(item => (
        <a className="emergency-row" href={`tel:${item.number}`} key={item.number}><strong>{item.number}</strong><span>{item.label}</span><Phone size={16} /></a>
      ))}
      <p className="panel-note">Sürüş sırasında telefonu elinize almayın; aramak için güvenli bir yerde durun.</p>
    </section>
  );
}

export function ToolsPage() {
  return (
    <div className="driver-tools">
      <NearbyPanel />
      <EmergencyNumbers />
      <TripCalculator />
      <DocumentTracker />
      <BorderChecklist />
    </div>
  );
}
