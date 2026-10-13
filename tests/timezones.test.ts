import { describe, expect, it } from 'vitest';
import { convertNewYorkToMumbai, validatePuzzle } from '../src/game/validators';

describe('October 26, 2025 EDT to IST conversion', () => {
  it('converts 11:15 EDT to 20:45 IST on the same date', () => {
    expect(convertNewYorkToMumbai('2025-10-26', '11:15')).toEqual({ date: '2025-10-26', time: '20:45' });
  });
  it('accepts exact clocks and rejects one-hour errors', () => {
    const correct = { nyDate: '2025-10-26', nyTime: '11:15', nyPeriod: 'AM' as const, mumDate: '2025-10-26', mumTime: '8:45', mumPeriod: 'PM' as const };
    expect(validatePuzzle('clocks', correct).ok).toBe(true);
    expect(validatePuzzle('clocks', { ...correct, mumTime: '7:45' }).ok).toBe(false);
    expect(validatePuzzle('clocks', { ...correct, mumTime: '9:45' }).ok).toBe(false);
  });
});
