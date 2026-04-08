/**
 * Unit tests for aiInsightsService (Phase 6 — Proactive Dashboard Insights)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCachedInsights,
  getOrgInsightsEnabled,
  getOrGenerateInsights,
  refreshInsights,
} from '../aiInsightsService';

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(),
  },
}));

const { platformDb } = await import('../supabase/supabaseClient');

function mockChain(rows, single = false) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: single ? vi.fn().mockResolvedValue({ data: rows, error: null }) : vi.fn(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
  if (!single) chain.limit.mockResolvedValue({ data: rows, error: null });
  return chain;
}

describe('getCachedInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no cache row', async () => {
    platformDb.from.mockReturnValue(
      mockChain(null, true).maybeSingle.mockResolvedValue({ data: null, error: null })
    );
    const result = await getCachedInsights('user-1');
    expect(result).toBeNull();
  });

  it('returns null when cache expired', async () => {
    const past = new Date(Date.now() - 86400000 * 2).toISOString();
    platformDb.from.mockReturnValue(
      mockChain({ insights: [], expires_at: past }, true)
    );
    const result = await getCachedInsights('user-1');
    expect(result).toBeNull();
  });

  it('returns insights when cache valid', async () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    const insights = [{ text: 'Test', severity: 'info', module: 'risks' }];
    platformDb.from.mockReturnValue(
      mockChain({ insights, expires_at: future }, true)
    );
    const result = await getCachedInsights('user-1');
    expect(result).toEqual(insights);
  });
});

describe('getOrgInsightsEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when orgId is null (default)', async () => {
    const result = await getOrgInsightsEnabled(null);
    expect(result).toBe(true);
  });

  it('returns false when org has insights_enabled false', async () => {
    platformDb.from.mockReturnValue(
      mockChain({ insights_enabled: false }, true)
    );
    const result = await getOrgInsightsEnabled('org-1');
    expect(result).toBe(false);
  });

  it('returns true when org has insights_enabled true or missing', async () => {
    platformDb.from.mockReturnValue(
      mockChain({ insights_enabled: true }, true)
    );
    const result = await getOrgInsightsEnabled('org-1');
    expect(result).toBe(true);
  });
});

describe('getOrGenerateInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached insights when cache hit', async () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    const cached = [{ text: 'Cached', severity: 'info', module: 'general' }];
    let callCount = 0;
    platformDb.from.mockImplementation((table) => {
      callCount++;
      if (table === 'ai_insights_cache') {
        return mockChain({ insights: cached, expires_at: future }, true);
      }
      return mockChain([], false);
    });
    const result = await getOrGenerateInsights('user-1', 'org-1');
    expect(result).toEqual(cached);
  });
});

describe('refreshInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const emptyDataChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      neq: vi.fn().mockReturnThis(),
    };
    const aiSettingsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { insights_mode: 'template' }, error: null }),
    };
    const cacheChain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    platformDb.from.mockImplementation((table) => {
      if (table === 'ai_settings') return aiSettingsChain;
      if (table === 'ai_insights_cache') return cacheChain;
      return emptyDataChain;
    });
  });

  it('returns array of insights (rule-based) and writes cache', async () => {
    const result = await refreshInsights('user-1', 'org-1');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toHaveProperty('text');
    expect(result[0]).toHaveProperty('severity');
    expect(result[0]).toHaveProperty('module');
  });
});
