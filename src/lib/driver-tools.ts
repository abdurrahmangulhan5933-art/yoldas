export function calculateFuelCost(distance: number, consumption: number, price: number) {
  if (![distance, consumption, price].every(Number.isFinite) || Math.min(distance, consumption, price) < 0) return null;
  return { liters: distance * consumption / 100, cost: distance * consumption / 100 * price };
}

/** Sefer maliyeti: yakıt + ek giderler (köprü/otoyol, yemek, konaklama...). Navlun verilirse net kazanç da hesaplanır. */
export function calculateTrip(distance: number, consumption: number, price: number, extra = 0, freight = 0) {
  const fuel = calculateFuelCost(distance, consumption, price);
  if (!fuel || ![extra, freight].every(Number.isFinite) || Math.min(extra, freight) < 0) return null;
  const total = fuel.cost + extra;
  return {
    liters: fuel.liters,
    fuelCost: fuel.cost,
    totalCost: total,
    perKm: distance > 0 ? total / distance : 0,
    net: freight > 0 ? freight - total : null,
  };
}

export function linkify(text: string): Array<{ text: string; href?: string }> {
  const parts: Array<{ text: string; href?: string }> = [];
  const re = /https?:\/\/[^\s<>"]+/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: m[0], href: m[0] });
    last = start + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** "YYYY-MM-DD" tarihine bugünden kaç gün kaldığı (geçmişse negatif). Geçersiz tarihte null. */
export function daysUntil(dateStr: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number) as [number, number, number];
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null; // 31 Şubat gibi tarihler
  const target = check.getTime();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export type DocStatus = 'expired' | 'soon' | 'ok';
/** 30 gün ve altı "yaklaşıyor", 0'ın altı "süresi geçti". */
export function docStatus(days: number): DocStatus {
  return days < 0 ? 'expired' : days <= 30 ? 'soon' : 'ok';
}

/** Konum varsa harita o noktada açılır; yoksa Google Haritalar kullanıcının konumunu kullanır. */
export function nearbyUrl(query: string, coords?: { lat: number; lng: number } | null) {
  const q = encodeURIComponent(query);
  return coords
    ? `https://www.google.com/maps/search/${q}/@${coords.lat.toFixed(5)},${coords.lng.toFixed(5)},14z`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}
