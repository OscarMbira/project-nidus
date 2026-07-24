/**
 * Unit tests for amountShorthand utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parseShorthandAmount,
  hasShorthandSuffix,
  getShorthandSuffix,
  formatToShorthand,
  formatWithSeparators,
  formatCurrency,
  getCurrencySymbol,
  validateAmountRange,
  getConversionHint,
} from '../amountShorthand';

describe('parseShorthandAmount', () => {
  describe('thousand conversions (k/K)', () => {
    it('converts lowercase k to thousands', () => {
      const result = parseShorthandAmount('10k');
      expect(result.value).toBe(10000);
      expect(result.wasShorthand).toBe(true);
      expect(result.original).toBe('10k');
    });

    it('converts uppercase K to thousands', () => {
      const result = parseShorthandAmount('10K');
      expect(result.value).toBe(10000);
      expect(result.wasShorthand).toBe(true);
    });

    it('handles decimal thousands', () => {
      const result = parseShorthandAmount('1.5k');
      expect(result.value).toBe(1500);
      expect(result.wasShorthand).toBe(true);
    });

    it('handles large decimal thousands', () => {
      const result = parseShorthandAmount('25.75K');
      expect(result.value).toBe(25750);
    });
  });

  describe('thousand conversions (t/T)', () => {
    it('converts lowercase t to thousands', () => {
      const result = parseShorthandAmount('5t');
      expect(result.value).toBe(5000);
      expect(result.wasShorthand).toBe(true);
    });

    it('converts uppercase T to thousands', () => {
      const result = parseShorthandAmount('5T');
      expect(result.value).toBe(5000);
      expect(result.wasShorthand).toBe(true);
    });
  });

  describe('million conversions (m/M)', () => {
    it('converts lowercase m to millions', () => {
      const result = parseShorthandAmount('3m');
      expect(result.value).toBe(3000000);
      expect(result.wasShorthand).toBe(true);
    });

    it('converts uppercase M to millions', () => {
      const result = parseShorthandAmount('3M');
      expect(result.value).toBe(3000000);
      expect(result.wasShorthand).toBe(true);
    });

    it('handles decimal millions', () => {
      const result = parseShorthandAmount('2.5m');
      expect(result.value).toBe(2500000);
    });
  });

  describe('billion conversions (b/B)', () => {
    it('converts lowercase b to billions', () => {
      const result = parseShorthandAmount('2b');
      expect(result.value).toBe(2000000000);
      expect(result.wasShorthand).toBe(true);
    });

    it('converts uppercase B to billions', () => {
      const result = parseShorthandAmount('2B');
      expect(result.value).toBe(2000000000);
      expect(result.wasShorthand).toBe(true);
    });

    it('handles decimal billions', () => {
      const result = parseShorthandAmount('1.5b');
      expect(result.value).toBe(1500000000);
    });
  });

  describe('trillion conversions (tr/TR)', () => {
    it('converts lowercase tr to trillions', () => {
      const result = parseShorthandAmount('1tr');
      expect(result.value).toBe(1000000000000);
      expect(result.wasShorthand).toBe(true);
    });

    it('converts uppercase TR to trillions', () => {
      const result = parseShorthandAmount('1TR');
      expect(result.value).toBe(1000000000000);
      expect(result.wasShorthand).toBe(true);
    });
  });

  describe('negative values', () => {
    it('handles negative thousands', () => {
      const result = parseShorthandAmount('-10k');
      expect(result.value).toBe(-10000);
      expect(result.wasShorthand).toBe(true);
    });

    it('handles negative millions', () => {
      const result = parseShorthandAmount('-5m');
      expect(result.value).toBe(-5000000);
    });
  });

  describe('regular numbers', () => {
    it('parses regular integers', () => {
      const result = parseShorthandAmount('100');
      expect(result.value).toBe(100);
      expect(result.wasShorthand).toBe(false);
    });

    it('parses regular decimals', () => {
      const result = parseShorthandAmount('100.50');
      expect(result.value).toBe(100.50);
      expect(result.wasShorthand).toBe(false);
    });

    it('parses negative numbers', () => {
      const result = parseShorthandAmount('-500');
      expect(result.value).toBe(-500);
      expect(result.wasShorthand).toBe(false);
    });
  });

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      const result = parseShorthandAmount('');
      expect(result.value).toBeNull();
      expect(result.wasShorthand).toBe(false);
    });

    it('returns null for null input', () => {
      const result = parseShorthandAmount(null);
      expect(result.value).toBeNull();
    });

    it('returns null for undefined input', () => {
      const result = parseShorthandAmount(undefined);
      expect(result.value).toBeNull();
    });

    it('returns null for text only', () => {
      const result = parseShorthandAmount('abc');
      expect(result.value).toBeNull();
    });

    it('returns null for invalid suffix', () => {
      const result = parseShorthandAmount('10x');
      expect(result.value).toBeNull();
    });

    it('handles whitespace', () => {
      const result = parseShorthandAmount('  10k  ');
      expect(result.value).toBe(10000);
    });
  });
});

describe('hasShorthandSuffix', () => {
  it('returns true for valid shorthand', () => {
    expect(hasShorthandSuffix('10k')).toBe(true);
    expect(hasShorthandSuffix('5M')).toBe(true);
    expect(hasShorthandSuffix('2b')).toBe(true);
    expect(hasShorthandSuffix('1tr')).toBe(true);
  });

  it('returns false for regular numbers', () => {
    expect(hasShorthandSuffix('100')).toBe(false);
    expect(hasShorthandSuffix('100.50')).toBe(false);
  });

  it('returns false for invalid inputs', () => {
    expect(hasShorthandSuffix('')).toBe(false);
    expect(hasShorthandSuffix(null)).toBe(false);
    expect(hasShorthandSuffix('abc')).toBe(false);
  });
});

describe('getShorthandSuffix', () => {
  it('returns the suffix for valid shorthand', () => {
    expect(getShorthandSuffix('10k')).toBe('k');
    expect(getShorthandSuffix('5M')).toBe('M');
    expect(getShorthandSuffix('2b')).toBe('b');
    expect(getShorthandSuffix('1tr')).toBe('tr');
  });

  it('returns null for regular numbers', () => {
    expect(getShorthandSuffix('100')).toBeNull();
  });

  it('returns null for invalid inputs', () => {
    expect(getShorthandSuffix('')).toBeNull();
    expect(getShorthandSuffix(null)).toBeNull();
  });
});

describe('formatToShorthand', () => {
  it('formats thousands', () => {
    expect(formatToShorthand(10000)).toBe('10K');
    expect(formatToShorthand(25000)).toBe('25K');
  });

  it('formats millions', () => {
    expect(formatToShorthand(3000000)).toBe('3M');
    expect(formatToShorthand(3500000)).toBe('3.5M');
  });

  it('formats billions', () => {
    expect(formatToShorthand(2000000000)).toBe('2B');
  });

  it('formats trillions', () => {
    expect(formatToShorthand(1000000000000)).toBe('1TR');
  });

  it('returns raw value below threshold', () => {
    expect(formatToShorthand(500)).toBe('500');
    expect(formatToShorthand(999)).toBe('999');
  });

  it('respects lowercase option', () => {
    expect(formatToShorthand(10000, { lowercase: true })).toBe('10k');
    expect(formatToShorthand(3000000, { lowercase: true })).toBe('3m');
  });

  it('respects decimals option', () => {
    expect(formatToShorthand(3333333, { decimals: 2 })).toBe('3.33M');
  });

  it('handles negative values', () => {
    expect(formatToShorthand(-10000)).toBe('-10K');
    expect(formatToShorthand(-3000000)).toBe('-3M');
  });

  it('returns empty string for invalid values', () => {
    expect(formatToShorthand(null)).toBe('');
    expect(formatToShorthand(undefined)).toBe('');
    expect(formatToShorthand(NaN)).toBe('');
  });
});

describe('formatWithSeparators', () => {
  it('formats numbers with thousand separators', () => {
    expect(formatWithSeparators(10000)).toBe('10,000.00');
    expect(formatWithSeparators(3500000.5)).toBe('3,500,000.50');
  });

  it('respects decimals option', () => {
    expect(formatWithSeparators(10000, { decimals: 0 })).toBe('10,000');
    expect(formatWithSeparators(10000.123, { decimals: 3 })).toBe('10,000.123');
  });

  it('handles negative values', () => {
    expect(formatWithSeparators(-10000)).toBe('-10,000.00');
  });

  it('returns empty string for invalid values', () => {
    expect(formatWithSeparators(null)).toBe('');
    expect(formatWithSeparators(undefined)).toBe('');
    expect(formatWithSeparators(NaN)).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats USD currency', () => {
    const result = formatCurrency(1000, { currency: 'USD' });
    expect(result).toContain('1,000');
    expect(result).toContain('$');
  });

  it('formats with shorthand when enabled', () => {
    const result = formatCurrency(5000000, {
      currency: 'USD',
      useShorthand: true,
      shorthandThreshold: 1000000,
    });
    expect(result).toContain('5M');
    expect(result).toContain('$');
  });

  it('returns empty string for invalid values', () => {
    expect(formatCurrency(null)).toBe('');
    expect(formatCurrency(NaN)).toBe('');
  });
});

describe('getCurrencySymbol', () => {
  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns currency code for unknown currencies', () => {
    // The function uses Intl, so it should return the proper symbol
    const symbol = getCurrencySymbol('EUR');
    expect(symbol).toBeTruthy();
  });
});

describe('validateAmountRange', () => {
  it('returns valid for value within range', () => {
    const result = validateAmountRange(50, { min: 0, max: 100 });
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('returns error for value below min', () => {
    const result = validateAmountRange(-10, { min: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least');
  });

  it('returns error for value above max', () => {
    const result = validateAmountRange(200, { max: 100 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not exceed');
  });

  it('returns error for invalid values', () => {
    const result = validateAmountRange(NaN);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid number');
  });
});

describe('getConversionHint', () => {
  it('returns hint for shorthand input', () => {
    const hint = getConversionHint('10k');
    expect(hint).toContain('Press Enter');
    expect(hint).toContain('10k');
    expect(hint).toContain('10,000');
  });

  it('returns null for regular numbers', () => {
    expect(getConversionHint('100')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(getConversionHint('')).toBeNull();
    expect(getConversionHint(null)).toBeNull();
  });
});
