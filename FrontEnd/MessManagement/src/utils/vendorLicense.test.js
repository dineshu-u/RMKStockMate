import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import {
  parseValidityExpiry,
  getLicenseStatus,
  maskValidityInput,
  validateValidityRange,
  VALIDITY_FORMAT_MESSAGE,
} from './vendorLicense';

const at = (s) => dayjs(s);

describe('parseValidityExpiry (real vendor records)', () => {
  it('parses ISO ranges: 2021-12-10 to 2026-07-18', () => {
    expect(parseValidityExpiry('2021-12-10 to 2026-07-18')?.format('YYYY-MM-DD')).toBe('2026-07-18');
  });

  it('parses day-first dash ranges: 19-12-2025 to 25-12-2026', () => {
    expect(parseValidityExpiry('19-12-2025 to 25-12-2026')?.format('YYYY-MM-DD')).toBe('2026-12-25');
  });

  it('parses day-first dot ranges: 19.12.2025 to 26.12.2026', () => {
    expect(parseValidityExpiry('19.12.2025 to 26.12.2026')?.format('YYYY-MM-DD')).toBe('2026-12-26');
  });

  it('parses year-first slash ranges with uppercase TO: 2025/02/22 TO 2030/02/27', () => {
    expect(parseValidityExpiry('2025/02/22 TO 2030/02/27')?.format('YYYY-MM-DD')).toBe('2030-02-27');
  });

  it('parses the END date even when the start segment is malformed: 10-09.2024 to 21-10-2029', () => {
    expect(parseValidityExpiry('10-09.2024 to 21-10-2029')?.format('YYYY-MM-DD')).toBe('2029-10-21');
  });

  it('returns null for empty, missing, or separator-less values', () => {
    expect(parseValidityExpiry('')).toBeNull();
    expect(parseValidityExpiry(null)).toBeNull();
    expect(parseValidityExpiry(undefined)).toBeNull();
    expect(parseValidityExpiry('2026-10-06 - 2027-10-06')).toBeNull();
    expect(parseValidityExpiry('just text')).toBeNull();
  });

  it('returns null for impossible calendar dates (strict parsing)', () => {
    expect(parseValidityExpiry('2026-01-01 to 2026-02-30')).toBeNull();
    expect(parseValidityExpiry('2026-01-01 to 2026-13-05')).toBeNull();
  });
});

describe('getLicenseStatus boundaries (today = 2026-10-14)', () => {
  const today = at('2026-10-14');

  it('expired date -> red Expired with days-ago note', () => {
    const s = getLicenseStatus('2025-01-01 to 2026-10-11', today);
    expect(s).toMatchObject({ tone: 'red', label: 'Expired', note: 'Expired 3 days ago' });
  });

  it('yesterday -> Expired yesterday', () => {
    const s = getLicenseStatus('2026-10-01 to 2026-10-13', today);
    expect(s).toMatchObject({ tone: 'red', note: 'Expired yesterday' });
  });

  it('expiry exactly today -> amber Expiring Soon / Expires today', () => {
    const s = getLicenseStatus('2026-01-10 to 2026-10-14', today);
    expect(s).toMatchObject({ tone: 'amber', label: 'Expiring Soon', note: 'Expires today' });
  });

  it('expiry tomorrow -> Expires tomorrow', () => {
    const s = getLicenseStatus('2026-01-10 to 2026-10-15', today);
    expect(s).toMatchObject({ tone: 'amber', note: 'Expires tomorrow' });
  });

  it('expiry exactly 3 days out -> still Expiring Soon', () => {
    const s = getLicenseStatus('2026-01-10 to 2026-10-17', today);
    expect(s).toMatchObject({ tone: 'amber', note: 'Expires in 3 days' });
  });

  it('expiry 4 days out -> green Valid', () => {
    const s = getLicenseStatus('2026-01-10 to 2026-10-18', today);
    expect(s).toMatchObject({ tone: 'green', label: 'Valid', note: '' });
  });

  it('uses the real current date when today is not passed', () => {
    const future = dayjs().add(30, 'day').format('YYYY-MM-DD');
    const s = getLicenseStatus(`2025-01-01 to ${future}`);
    expect(s.tone).toBe('green');
  });

  it('unparseable validity -> gray Invalid Date, never throws', () => {
    ['', null, undefined, 'nonsense', '10-13.2024 to ???'].forEach((v) => {
      const s = getLicenseStatus(v, today);
      expect(s).toMatchObject({ tone: 'gray', label: 'Invalid Date', note: '' });
    });
  });
});

describe('maskValidityInput', () => {
  it('inserts hyphens progressively while typing', () => {
    expect(maskValidityInput('2')).toBe('2');
    expect(maskValidityInput('2026')).toBe('2026');
    expect(maskValidityInput('202610')).toBe('2026-10');
    expect(maskValidityInput('20261006')).toBe('2026-10-06');
  });

  it('inserts the exact " to " separator and the second date', () => {
    expect(maskValidityInput('202610062027')).toBe('2026-10-06 to 2027');
    expect(maskValidityInput('2026100620271006')).toBe('2026-10-06 to 2027-10-06');
  });

  it('ignores non-digit characters and caps at 16 digits', () => {
    expect(maskValidityInput('2026/10/06')).toBe('2026-10-06');
    expect(maskValidityInput('20261006202710069999')).toBe('2026-10-06 to 2027-10-06');
  });

  it('re-derives from partially deleted input (backspace-safe)', () => {
    expect(maskValidityInput('2026-10-06 to 2027-1')).toBe('2026-10-06 to 2027-1');
    expect(maskValidityInput('2026-10-06 ')).toBe('2026-10-06');
  });
});

describe('validateValidityRange (strict new-input rules)', () => {
  it('accepts a correct range', () => {
    expect(validateValidityRange('2026-10-06 to 2027-10-06')).toBe('');
  });

  it('requires the exact format and separator', () => {
    expect(validateValidityRange('')).toBe(VALIDITY_FORMAT_MESSAGE);
    expect(validateValidityRange(null)).toBe(VALIDITY_FORMAT_MESSAGE);
    expect(validateValidityRange('2026-10-06to2027-10-06')).toBe(VALIDITY_FORMAT_MESSAGE);
    expect(validateValidityRange('2026-10-06 - 2027-10-06')).toBe(VALIDITY_FORMAT_MESSAGE);
    expect(validateValidityRange('2026-10-06/2027-10-06')).toBe(VALIDITY_FORMAT_MESSAGE);
    expect(validateValidityRange('06-10-2026 to 07-10-2027')).toBe(VALIDITY_FORMAT_MESSAGE);
    expect(validateValidityRange('2026-10-6 to 2027-10-06')).toBe(VALIDITY_FORMAT_MESSAGE);
  });

  it('rejects impossible calendar dates', () => {
    expect(validateValidityRange('2026-13-05 to 2027-10-06')).toBe('Invalid start date.');
    expect(validateValidityRange('2026-00-10 to 2027-10-06')).toBe('Invalid start date.');
    expect(validateValidityRange('2026-10-06 to 2026-02-30')).toBe('Invalid end date.');
    expect(validateValidityRange('2026-10-06 to 2026-04-31')).toBe('Invalid end date.');
  });

  it('rejects an end date earlier than the start date', () => {
    expect(validateValidityRange('2026-10-06 to 2025-01-01')).toBe(
      'End date cannot be earlier than start date.'
    );
  });

  it('allows end date equal to start date', () => {
    expect(validateValidityRange('2026-10-06 to 2026-10-06')).toBe('');
  });
});
