import { describe, expect, it } from 'vitest';
import { calculateFuelCost, calculateTrip, daysUntil, docStatus, linkify, nearbyUrl } from './driver-tools';
describe('Driver tools', () => {
 it('calculates fuel per 100 km and total cost', () => { expect(calculateFuelCost(750, 30, 54)).toEqual({ liters: 225, cost: 12150 }); });
 it('rejects negative costs', () => { expect(calculateFuelCost(-1, 30, 54)).toBeNull(); });
 it('adds extra costs and computes net profit', () => {
  const t = calculateTrip(1000, 30, 50, 2000, 20000);
  expect(t).toEqual({ liters: 300, fuelCost: 15000, totalCost: 17000, perKm: 17, net: 3000 });
 });
 it('omits net when no freight is given and rejects bad input', () => {
  expect(calculateTrip(100, 30, 50, 0, 0)?.net).toBeNull();
  expect(calculateTrip(100, 30, 50, -5, 0)).toBeNull();
  expect(calculateTrip(Number.NaN, 30, 50)).toBeNull();
 });
 it('turns urls in chat text into links', () => { expect(linkify('yer https://a.co/x tamam')).toEqual([{ text: 'yer ' }, { text: 'https://a.co/x', href: 'https://a.co/x' }, { text: ' tamam' }]); });
 it('counts days until a date, negative when past, null when invalid', () => {
  const now = new Date(2026, 9, 18, 15, 30);
  expect(daysUntil('2026-10-18', now)).toBe(0);
  expect(daysUntil('2026-11-17', now)).toBe(30);
  expect(daysUntil('2026-10-10', now)).toBe(-8);
  expect(daysUntil('', now)).toBeNull();
  expect(daysUntil('18.10.2026', now)).toBeNull();
  expect(daysUntil('2026-02-31', now)).toBeNull();
 });
 it('classifies document status', () => {
  expect(docStatus(-1)).toBe('expired'); expect(docStatus(0)).toBe('soon'); expect(docStatus(30)).toBe('soon'); expect(docStatus(31)).toBe('ok');
 });
 it('builds nearby map links with and without a position', () => {
  expect(nearbyUrl('akaryakıt', null)).toBe('https://www.google.com/maps/search/?api=1&query=akaryak%C4%B1t');
  expect(nearbyUrl('tır parkı', { lat: 41.0123456, lng: 28.9 })).toContain('/@41.01235,28.90000,14z');
 });
});
