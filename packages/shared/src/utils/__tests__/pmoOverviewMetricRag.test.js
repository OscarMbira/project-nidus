import { describe, it, expect } from 'vitest';
import {
  worstRagFromList,
  ragPctHigherIsBetter,
  ragCountPositiveWarning,
  ragCountPositiveDanger,
  ragCountThreshold,
  ragBudgetUtilizationPct,
  ragBudgetVariancePct,
  ragEvmIndex,
  executiveAlertRagFromRow,
  isMetricValueMissing,
  resolveMetricTileRag,
} from '../pmoOverviewMetricRag';

describe('worstRagFromList', () => {
  it('picks red over amber and green', () => {
    expect(worstRagFromList(['green', 'amber', 'red'])).toBe('red');
  });
  it('picks amber when no red', () => {
    expect(worstRagFromList(['green', 'amber'])).toBe('amber');
  });
});

describe('ragPctHigherIsBetter', () => {
  it('green when high', () => {
    expect(ragPctHigherIsBetter(90)).toBe('green');
  });
  it('amber in middle band', () => {
    expect(ragPctHigherIsBetter(60)).toBe('amber');
  });
  it('red when low', () => {
    expect(ragPctHigherIsBetter(40)).toBe('red');
  });
});

describe('ragBudgetUtilizationPct', () => {
  it('red when over 100%', () => {
    expect(ragBudgetUtilizationPct(105)).toBe('red');
  });
  it('green in 80–100', () => {
    expect(ragBudgetUtilizationPct(90)).toBe('green');
  });
});

describe('ragBudgetVariancePct', () => {
  it('green near zero', () => {
    expect(ragBudgetVariancePct(3)).toBe('green');
  });
  it('red when large swing', () => {
    expect(ragBudgetVariancePct(20)).toBe('red');
  });
});

describe('ragEvmIndex', () => {
  it('red below 0.85', () => {
    expect(ragEvmIndex(0.8)).toBe('red');
  });
  it('amber below 1', () => {
    expect(ragEvmIndex(0.92)).toBe('amber');
  });
  it('green at or above 1', () => {
    expect(ragEvmIndex(1.02)).toBe('green');
  });
});

describe('ragCountThreshold', () => {
  it('escalates to red at threshold', () => {
    expect(ragCountThreshold(10, 10)).toBe('red');
  });
});

describe('isMetricValueMissing', () => {
  it('treats em dash and empty as missing', () => {
    expect(isMetricValueMissing('—')).toBe(true);
    expect(isMetricValueMissing('  —  ')).toBe(true);
    expect(isMetricValueMissing('')).toBe(true);
  });
  it('treats zero and formatted values as present', () => {
    expect(isMetricValueMissing(0)).toBe(false);
    expect(isMetricValueMissing('0%')).toBe(false);
    expect(isMetricValueMissing('$0')).toBe(false);
  });
});

describe('resolveMetricTileRag', () => {
  it('forces red when missing', () => {
    expect(resolveMetricTileRag('green', { missing: true })).toBe('red');
  });
  it('uses rag when not missing', () => {
    expect(resolveMetricTileRag('amber', { missing: false })).toBe('amber');
  });
  it('defaults to green when not missing and no rag', () => {
    expect(resolveMetricTileRag(undefined, { missing: false })).toBe('green');
  });
});

describe('executiveAlertRagFromRow', () => {
  const ctx = { totalProjects: 30, totalProgrammes: 18 };

  it('maps danger to red', () => {
    expect(
      executiveAlertRagFromRow({ id: 'budget_over', count: 1, severity: 'danger' }, ctx)
    ).toBe('red');
  });

  it('escalates project-scoped warning to red when half or more of projects', () => {
    expect(
      executiveAlertRagFromRow({ id: 'no_baseline', count: 17, severity: 'warning' }, ctx)
    ).toBe('red');
    expect(
      executiveAlertRagFromRow({ id: 'gov_missing', count: 30, severity: 'warning' }, ctx)
    ).toBe('red');
  });

  it('keeps project-scoped warning as amber when penetration is low', () => {
    expect(
      executiveAlertRagFromRow({ id: 'no_baseline', count: 3, severity: 'warning' }, ctx)
    ).toBe('amber');
  });

  it('escalates programme-scoped warning by penetration', () => {
    expect(
      executiveAlertRagFromRow({ id: 'unlinked_programmes', count: 1, severity: 'warning' }, ctx)
    ).toBe('amber');
    expect(
      executiveAlertRagFromRow({ id: 'stale_programmes', count: 10, severity: 'warning' }, ctx)
    ).toBe('red');
  });
});
