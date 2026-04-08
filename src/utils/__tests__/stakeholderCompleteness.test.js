/**
 * Unit tests for stakeholder completeness utility
 */

import { describe, it, expect } from 'vitest';
import { getCompletenessPercent } from '../stakeholderCompleteness';

describe('getCompletenessPercent', () => {
  it('returns 0 for null or undefined', () => {
    expect(getCompletenessPercent(null)).toBe(0);
    expect(getCompletenessPercent(undefined)).toBe(0);
  });

  it('returns 0 for empty object', () => {
    expect(getCompletenessPercent({})).toBe(0);
  });

  it('scores expectations only as 1/8', () => {
    expect(getCompletenessPercent({ expectations: 'wants weekly updates' })).toBe(13); // 1/8 * 100 ≈ 12.5 → 13
  });

  it('scores contact from email', () => {
    expect(getCompletenessPercent({ email: 'a@b.com' })).toBe(13);
  });

  it('scores contact from phones array', () => {
    expect(getCompletenessPercent({ phones: ['+123'] })).toBe(13);
  });

  it('scores contact from mobiles array', () => {
    expect(getCompletenessPercent({ mobiles: ['+456'] })).toBe(13);
  });

  it('scores all 8 fields as 100', () => {
    const full = {
      expectations: 'x',
      special_requirements: 'y',
      stakeholder_type: 'internal',
      stakeholder_category: 'individual',
      email: 'a@b.com',
      identification_source: 'workshop',
      project_role: 'Sponsor',
      notes: 'some notes',
    };
    expect(getCompletenessPercent(full)).toBe(100);
  });

  it('rounds to integer', () => {
    // 3/8 = 37.5 → 38
    expect(getCompletenessPercent({
      expectations: 'x',
      special_requirements: 'y',
      stakeholder_type: 'internal',
    })).toBe(38);
  });

  it('ignores whitespace-only values', () => {
    expect(getCompletenessPercent({
      expectations: '   ',
      notes: '',
    })).toBe(0);
  });
});
