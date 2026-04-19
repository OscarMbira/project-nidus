import { describe, it, expect } from 'vitest';
import { buildPmoOverviewMetricsFromSummaries } from '../dashboardService';

describe('v475 buildPmoOverviewMetricsFromSummaries extended merge', () => {
  const summary = {
    portfolios: { total: 1, active: 1, planning: 0, onHold: 0 },
    programmes: {
      total: 2,
      active: 1,
      planning: 0,
      onHold: 0,
      linkedToPortfolios: 1,
      unlinkedNoPortfolio: 1,
    },
    projects: {
      total: 3,
      active: 2,
      planned: 0,
      completed: 1,
      onHold: 0,
      linkedToProgrammes: 2,
      linkedToBothProgrammeAndPortfolio: 1,
      unlinkedNoProgrammeOrPortfolio: 0,
    },
  };
  const kpis = {
    projectHealth: { score: 90, healthy: 2, atRisk: 0, critical: 0 },
    onTimeDelivery: { percentage: 80, count: 1, total: 1 },
    budgetVariance: { percentage: 0, totalBudget: 100, totalSpent: 100 },
  };

  it('merges extended portfolio and project metrics when provided', () => {
    const extended = {
      portfolio: {
        budgetUtilizationPct: 50,
        healthIndex: 88,
        governanceCompliancePct: 92,
        benefitsRealizationPct: 40,
      },
      programmes: {
        healthIndex: 70,
        deliveryProgressPct: 45,
        scheduleVarianceCount: 1,
        budgetUtilizationPct: 50,
        benefitsProgressPct: 40,
        blockedDependencies: 2,
        milestoneAchievementPct: 80,
        resourceConflictCount: 1,
      },
      projects: {
        scheduleRag: { onTrack: 2, delayed: 1, critical: 0 },
        openRisksHighCritical: 1,
        openIssues: 3,
        overdueTasks: 4,
        changeRequestsPending: 0,
        documentCompliancePct: 92,
        avgTaskCompletionPct: 55,
      },
      evm: {
        portfolio: { bac: 100, ev: 10, pv: 10, ac: 10, cpi: 1, spi: 1 },
        programmes: { programmesCpiLt1: 0, programmesSpiLt1: 1 },
        projectsRollup: { projectsCpiLt085: 0, projectsSpiLt085: 1 },
      },
      criticalPath: { cpTasksTotal: 5 },
      riskIssue: {
        risks: { openTotal: 2 },
        issues: { openTotal: 3 },
        changeRequests: { totalOpen: 1 },
      },
    };

    const out = buildPmoOverviewMetricsFromSummaries(summary, kpis, extended);

    expect(out.portfolio.budgetUtilizationPct).toBe(50);
    expect(out.portfolio.governanceCompliancePct).toBe(92);
    expect(out.portfolio.evm?.bac).toBe(100);
    expect(out.programmes.blockedDependencies).toBe(2);
    expect(out.programmes.evm?.programmesSpiLt1).toBe(1);
    expect(out.projects.scheduleRag?.onTrack).toBe(2);
    expect(out.projects.evm?.projectsSpiLt085).toBe(1);
    expect(out.projects.criticalPath?.cpTasksTotal).toBe(5);
    expect(out.projects.riskBand?.openTotal).toBe(2);
  });
});
