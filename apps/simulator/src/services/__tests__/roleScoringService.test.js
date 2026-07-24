import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabase/supabaseClient', () => ({
  simDb: { from: vi.fn() },
}));

import { calculateWeightedScore } from '../sim/roleScoringService.js';

describe('roleScoringService', () => {
  it('calculates weighted competency score', () => {
    const score = calculateWeightedScore(
      { planning_scheduling: 80, risk_management: 60 },
      [
        { competency_key: 'planning_scheduling', weight: 2 },
        { competency_key: 'risk_management', weight: 1 },
      ],
    );
    expect(score).toBeCloseTo((80 * 2 + 60) / 3, 1);
  });

  it('averages when no competencies provided', () => {
    expect(calculateWeightedScore({ a: 70, b: 90 }, [])).toBe(80);
  });
});
