import { describe, it, expect } from 'vitest';
import { sanitizeProjectSearchTerm } from '../projectService';

describe('sanitizeProjectSearchTerm', () => {
  it('trims and removes ilike metacharacters', () => {
    expect(sanitizeProjectSearchTerm('  te%st_one\\  ')).toBe('test one');
  });

  it('removes commas that break PostgREST or()', () => {
    expect(sanitizeProjectSearchTerm('a,b')).toBe('a b');
  });

  it('handles null/undefined', () => {
    expect(sanitizeProjectSearchTerm(null)).toBe('');
    expect(sanitizeProjectSearchTerm(undefined)).toBe('');
  });
});
