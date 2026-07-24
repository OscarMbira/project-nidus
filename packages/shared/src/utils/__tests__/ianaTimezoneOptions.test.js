import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildIanaTimezoneSelectOptions } from '../ianaTimezoneOptions';

describe('buildIanaTimezoneSelectOptions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('always includes UTC', () => {
    vi.stubGlobal('Intl', { supportedValuesOf: () => [] });
    const opts = buildIanaTimezoneSelectOptions();
    expect(opts.some((o) => o.value === 'UTC')).toBe(true);
  });

  it('maps supported timezones to value/label pairs sorted', () => {
    vi.stubGlobal('Intl', {
      supportedValuesOf: (key) => (key === 'timeZone' ? ['Zeta/A', 'Alpha/B'] : []),
    });
    const opts = buildIanaTimezoneSelectOptions();
    expect(opts.map((o) => o.value)).toEqual(['Alpha/B', 'UTC', 'Zeta/A']);
    expect(opts.every((o) => o.value === o.label)).toBe(true);
  });
});
