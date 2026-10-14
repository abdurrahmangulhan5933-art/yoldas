import { describe, expect, it } from 'vitest';
import { calculateFuelCost, formatCountdown } from './driver-tools';
describe('Driver tools', () => {
 it('calculates fuel per 100 km and total cost', () => { expect(calculateFuelCost(750, 30, 54)).toEqual({ liters: 225, cost: 12150 }); });
 it('rejects negative costs', () => { expect(calculateFuelCost(-1, 30, 54)).toBeNull(); });
 it('formats remaining duration and clamps at zero', () => { expect(formatCountdown(8040)).toEqual({ hours: '02', minutes: '14', seconds: '00' }); expect(formatCountdown(-5)).toEqual({ hours: '00', minutes: '00', seconds: '00' }); });
});
