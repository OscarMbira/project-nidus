/**
 * Unit tests for localeFormat utilities
 */

import { describe, it, expect } from 'vitest';
import { formatLocaleDate, formatLocaleNumber } from '../localeFormat';

describe('formatLocaleDate', () => {
  it('formats an ISO date string in en-US', () => {
    expect(formatLocaleDate('2026-03-05', 'en-US')).toBe('Mar 5, 2026');
  });

  it('formats the same date differently in fr-FR', () => {
    const result = formatLocaleDate('2026-03-05', 'fr-FR');
    expect(result).toContain('2026');
    expect(result).not.toBe(formatLocaleDate('2026-03-05', 'en-US'));
  });

  it('falls back to en-US default when no locale is given', () => {
    expect(formatLocaleDate('2026-03-05')).toBe('Mar 5, 2026');
  });

  it('returns empty string for empty/null/undefined input', () => {
    expect(formatLocaleDate('')).toBe('');
    expect(formatLocaleDate(null)).toBe('');
    expect(formatLocaleDate(undefined)).toBe('');
  });

  it('returns the raw string for an invalid date', () => {
    expect(formatLocaleDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatLocaleNumber', () => {
  it('formats a number with en-US thousands separators', () => {
    expect(formatLocaleNumber(1234567, 'en-US')).toBe('1,234,567');
  });

  it('formats a number with de-DE separators (period for thousands)', () => {
    expect(formatLocaleNumber(1234567, 'de-DE')).toBe('1.234.567');
  });

  it('accepts numeric strings', () => {
    expect(formatLocaleNumber('1000', 'en-US')).toBe('1,000');
  });

  it('returns empty string for empty/null/undefined/invalid input', () => {
    expect(formatLocaleNumber('')).toBe('');
    expect(formatLocaleNumber(null)).toBe('');
    expect(formatLocaleNumber(undefined)).toBe('');
    expect(formatLocaleNumber('abc')).toBe('');
  });
});
