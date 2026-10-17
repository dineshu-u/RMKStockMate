import { describe, it, expect } from 'vitest';
import { parseEventDateInfo } from './EventDetail';

describe('parseEventDateInfo', () => {
  it('formats YYYY-MM-DD date and calculates weekday without timezone shift', () => {
    const result = parseEventDateInfo('2026-11-30', '');
    expect(result.formattedDate).toBe('30 NOV 2026');
    expect(result.weekday).toBe('Monday');
  });

  it('handles other dates accurately', () => {
    const result = parseEventDateInfo('2026-10-17', '');
    expect(result.formattedDate).toBe('17 OCT 2026');
    expect(result.weekday).toBe('Saturday');
  });

  it('falls back to provided day if date is empty', () => {
    const result = parseEventDateInfo('', 'Wednesday');
    expect(result.formattedDate).toBe('');
    expect(result.weekday).toBe('Wednesday');
  });
});
