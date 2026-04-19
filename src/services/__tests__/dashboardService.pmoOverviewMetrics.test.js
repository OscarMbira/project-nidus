import { describe, it, expect } from 'vitest';
import { buildPmoOverviewMetricsFromSummaries } from '../dashboardService';

describe('buildPmoOverviewMetricsFromSummaries', () => {
  it('maps executive summary and KPI payloads into three scope objects', () => {
    const summary = {
      portfolios: {
        total: 4,
        active: 2,
        planning: 1,
        onHold: 0,
      },
      programmes: {
        total: 10,
        active: 5,
        planning: 2,
        onHold: 1,
        linkedToPortfolios: 7,
        unlinkedNoPortfolio: 3,
      },
      projects: {
        total: 20,
        active: 8,
        planned: 4,
        completed: 6,
        onHold: 2,
        linkedToProgrammes: 12,
        linkedToBothProgrammeAndPortfolio: 5,
        unlinkedNoProgrammeOrPortfolio: 3,
      },
    };
    const kpis = {
      projectHealth: { score: 88, healthy: 6, atRisk: 2, critical: 0 },
      onTimeDelivery: { percentage: 75, count: 3, total: 4 },
      budgetVariance: { percentage: -5, totalBudget: 100000, totalSpent: 95000 },
    };

    const out = buildPmoOverviewMetricsFromSummaries(summary, kpis, null);

    expect(out.portfolio.coveragePercent).toBe(70);
    expect(out.portfolio.programmesWithPortfolioParent).toBe(7);
    expect(out.programmes.distinctProjectsOnProgrammes).toBe(12);
    expect(out.projects.healthScore).toBe(88);
    expect(out.projects.onTimeDeliveryPct).toBe(75);
    expect(out.projects.budgetVariancePct).toBe(-5);
    expect(out.projects.totalBudget).toBe(100000);
    expect(out.projects.unlinkedNoProgrammeOrPortfolio).toBe(3);
  });

  it('returns empty-ish objects when summary is null', () => {
    const out = buildPmoOverviewMetricsFromSummaries(null, {});
    expect(out.portfolio).toEqual({});
    expect(out.programmes).toEqual({});
    expect(out.projects).toEqual({});
  });
});
