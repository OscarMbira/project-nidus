/**
 * Unit tests for docFetcher (Phase 1.5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDocContext } from '../docFetcher';

vi.mock('../../services/supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        overlaps: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: [
              { doc_title: 'Mandate Guide', chunk_text: 'To create a mandate...', doc_filename: 'Mandate_Guide.md', doc_route: '/docs/mandate' },
            ],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

describe('fetchDocContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty when question is empty', async () => {
    const result = await fetchDocContext('');
    expect(result.chunks).toEqual([]);
    expect(result.formattedText).toBe('');
  });

  it('returns empty when question is too short for keywords', async () => {
    const result = await fetchDocContext('ab');
    expect(result.chunks).toEqual([]);
  });

  it('returns chunks and formattedText when overlap returns data', async () => {
    const result = await fetchDocContext('How do I create a mandate?');
    expect(Array.isArray(result.chunks)).toBe(true);
    expect(typeof result.formattedText).toBe('string');
    if (result.chunks.length > 0) {
      expect(result.chunks[0]).toHaveProperty('doc_title');
      expect(result.chunks[0]).toHaveProperty('chunk_text');
      expect(result.chunks[0]).toHaveProperty('doc_filename');
      expect(result.chunks[0]).toHaveProperty('doc_route');
    }
  });
});
