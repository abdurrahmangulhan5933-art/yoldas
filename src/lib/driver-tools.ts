export function calculateFuelCost(distance: number, consumption: number, price: number) {
  if (![distance, consumption, price].every(Number.isFinite) || Math.min(distance, consumption, price) < 0) return null;
  return { liters: distance * consumption / 100, cost: distance * consumption / 100 * price };
}
export function formatCountdown(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return { hours: String(Math.floor(safe / 3600)).padStart(2, '0'), minutes: String(Math.floor(safe / 60) % 60).padStart(2, '0'), seconds: String(safe % 60).padStart(2, '0') };
}