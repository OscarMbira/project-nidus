/**
 * PMO scope overview — practice-based metrics for Portfolio, Programmes, and Projects.
 * Replaces legacy Quick Actions, KPI strip, chart grid, and activity block on the Platform dashboard.
 */
import { useEffect, useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Layers, FolderKanban, ChevronRight } from 'lucide-react';
import {
  buildPmoOverviewMetricsFromSummaries,
  getPmoOverviewMetrics,
} from '../../../services/dashboardService';
import RagStatusBadge from '../../ui/RagStatusBadge';
import {
  worstRagFromList,
  ragPctHigherIsBetter,
  ragCountPositiveWarning,
  ragCountPositiveDanger,
  ragCountThreshold,
  ragBudgetUtilizationPct,
  ragBudgetVariancePct,
  ragEvmIndex,
  isMetricValueMissing,
  resolveMetricTileRag,
} from '../../../utils/pmoOverviewMetricRag';

/** Visual distinction per pillar — light + dark */
const SECTION_THEME = {
  portfolio: {
    panel:
      'border-emerald-200 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/35 shadow-sm shadow-emerald-900/10 dark:shadow-emerald-950/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-950 dark:text-emerald-100',
    link: 'text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200',
    blurb: 'text-emerald-900/85 dark:text-emerald-200/90',
    tile: 'border-emerald-200/90 bg-white/85 dark:border-emerald-800/55 dark:bg-emerald-950/25',
    tileEm:
      'border-emerald-500 bg-emerald-100/95 dark:border-emerald-400 dark:bg-emerald-900/45 ring-1 ring-emerald-500/25 dark:ring-emerald-400/20',
  },
  programmes: {
    panel:
      'border-sky-200 dark:border-sky-800 bg-sky-50/90 dark:bg-sky-950/35 shadow-sm shadow-sky-900/10 dark:shadow-sky-950/20',
    icon: 'text-sky-600 dark:text-sky-400',
    title: 'text-sky-950 dark:text-sky-100',
    link: 'text-sky-700 dark:text-sky-300 hover:text-sky-800 dark:hover:text-sky-200',
    blurb: 'text-sky-900/85 dark:text-sky-200/90',
    tile: 'border-sky-200/90 bg-white/85 dark:border-sky-800/55 dark:bg-sky-950/25',
    tileEm:
      'border-sky-500 bg-sky-100/95 dark:border-sky-400 dark:bg-sky-900/45 ring-1 ring-sky-500/25 dark:ring-sky-400/20',
  },
  projects: {
    panel:
      'border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/35 shadow-sm shadow-slate-900/10 dark:shadow-slate-950/20',
    icon: 'text-slate-600 dark:text-slate-400',
    title: 'text-slate-950 dark:text-slate-100',
    link: 'text-slate-700 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200',
    blurb: 'text-slate-900/85 dark:text-slate-200/90',
    tile: 'border-slate-200/90 bg-white/85 dark:border-slate-800/55 dark:bg-slate-950/25',
    tileEm:
      'border-slate-500 bg-slate-100/95 dark:border-slate-400 dark:bg-slate-900/45 ring-1 ring-slate-500/25 dark:ring-slate-400/20',
  },
};

/**
 * Nested bands inside the Projects pillar — each group gets a distinct border/background tint
 * so volume, health, finance, linkage, schedule, ops, and compliance scan as separate blocks.
 */
const PROJECTS_SUBSECTION = {
  volume:
    'border-slate-500/40 bg-slate-100/80 dark:border-slate-600/50 dark:bg-slate-900/55',
  health:
    'border-emerald-600/35 bg-emerald-50/90 dark:border-emerald-700/45 dark:bg-emerald-950/45',
  finance:
    'border-amber-500/35 bg-amber-50/85 dark:border-amber-700/40 dark:bg-amber-950/40',
  linkage:
    'border-cyan-600/30 bg-cyan-50/80 dark:border-cyan-700/40 dark:bg-cyan-950/35',
  scheduleRag:
    'border-violet-500/35 bg-violet-50/85 dark:border-violet-700/40 dark:bg-violet-950/35',
  operations:
    'border-rose-500/35 bg-rose-50/85 dark:border-rose-700/40 dark:bg-rose-950/35',
  compliance:
    'border-teal-500/35 bg-teal-50/85 dark:border-teal-700/40 dark:bg-teal-950/35',
  evm:
    'border-indigo-500/45 bg-indigo-50/90 dark:border-indigo-600/50 dark:bg-indigo-950/50 ring-1 ring-indigo-500/15 dark:ring-indigo-400/20',
  criticalPath:
    'border-orange-500/45 bg-orange-50/90 dark:border-orange-600/50 dark:bg-orange-950/50 ring-1 ring-orange-500/15 dark:ring-orange-400/20',
  riskBand:
    'border-rose-500/40 bg-rose-50/90 dark:border-rose-600/45 dark:bg-rose-950/45',
  issueBand:
    'border-sky-500/40 bg-sky-50/90 dark:border-sky-600/45 dark:bg-sky-950/45',
  changeBand:
    'border-fuchsia-500/40 bg-fuchsia-50/90 dark:border-fuchsia-600/45 dark:bg-fuchsia-950/40',
};

function ProjectsSubsectionLabel({ children, tone = 'slate' }) {
  const toneCls = {
    slate: 'text-slate-600 dark:text-slate-400',
    emerald: 'text-emerald-700 dark:text-emerald-400/95',
    amber: 'text-amber-800 dark:text-amber-400/95',
    cyan: 'text-cyan-800 dark:text-cyan-400/95',
    violet: 'text-violet-800 dark:text-violet-400/95',
    rose: 'text-rose-800 dark:text-rose-400/95',
    teal: 'text-teal-800 dark:text-teal-400/95',
  };
  const cls = toneCls[tone] || toneCls.slate;
  return (
    <div className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${cls}`}>{children}</div>
  );
}

/** Loading placeholders aligned to section colours */
const SKELETON_BY_SCOPE = {
  all: [
    'border-emerald-200/70 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/25',
    'border-sky-200/70 dark:border-sky-800/60 bg-sky-50/60 dark:bg-sky-950/25',
    'border-slate-200/70 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-950/25',
  ],
  portfolio: ['border-emerald-200/70 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/25'],
  programmes: ['border-sky-200/70 dark:border-sky-800/60 bg-sky-50/60 dark:bg-sky-950/25'],
  projects: ['border-slate-200/70 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-950/25'],
};

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(n));
  } catch {
    return `$${Number(n).toLocaleString()}`;
  }
}

function fmtPct(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Number(n)}%`;
}

function fmtIdx(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Number(n)}%`;
}

function MetricTile({ label, value, hint, emphasize, themeKey, rag, dataMissing }) {
  const t = SECTION_THEME[themeKey] || SECTION_THEME.portfolio;
  const missing = dataMissing !== undefined ? dataMissing : isMetricValueMissing(value);
  const effectiveRag = resolveMetricTileRag(rag, { missing });
  return (
    <div
      className={`rounded-lg border px-3 py-3 text-center sm:text-left ${
        emphasize ? t.tileEm : t.tile
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400 min-w-0 flex-1 text-left">
          {label}
        </div>
        <RagStatusBadge
          rag={effectiveRag}
          size="sm"
          className="shrink-0 scale-90 origin-top-right"
        />
      </div>
      <div className="mt-1 text-lg sm:text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[10px] sm:text-xs text-gray-600 dark:text-gray-500">{hint}</div>
      ) : null}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, to, linkLabel, themeKey, overallRag }) {
  const t = SECTION_THEME[themeKey] || SECTION_THEME.portfolio;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <Icon className={`h-5 w-5 shrink-0 ${t.icon}`} aria-hidden />
        <h3 className={`text-base font-semibold ${t.title}`}>{title}</h3>
        {overallRag ? <RagStatusBadge rag={overallRag} size="sm" className="shrink-0" /> : null}
      </div>
      {to ? (
        <Link
          to={to}
          className={`inline-flex items-center gap-1 text-sm font-medium hover:underline ${t.link}`}
        >
          {linkLabel} <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

/** `all` = three bands on Overview; single pillar on Portfolio / Programmes / Projects tabs */
const PMOScopeOverviewMetrics = memo(function PMOScopeOverviewMetrics({
  organizationId,
  analyticsBundle,
  analyticsStatus = 'idle',
  scope = 'all',
  extendedLoadError = null,
}) {
  const [fallbackData, setFallbackData] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const fromBundle = useMemo(() => {
    if (analyticsBundle?.executive != null && analyticsBundle?.kpis != null) {
      return buildPmoOverviewMetricsFromSummaries(
        analyticsBundle.executive,
        analyticsBundle.kpis,
        analyticsBundle.extended || null
      );
    }
    return null;
  }, [analyticsBundle]);

  useEffect(() => {
    setFallbackData(null);
    setFetchError(null);
    if (analyticsStatus !== 'error' || !organizationId) return;
    let cancelled = false;
    (async () => {
      const res = await getPmoOverviewMetrics(organizationId);
      if (cancelled) return;
      if (res.success) {
        setFallbackData(res.data);
      } else {
        setFetchError(res.error || 'Failed to load overview metrics');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [analyticsStatus, organizationId]);

  const data = fromBundle || fallbackData;

  const skeletonCount = scope === 'all' ? 3 : 1;
  const skeletonClasses =
    scope === 'all'
      ? SKELETON_BY_SCOPE.all
      : SKELETON_BY_SCOPE[scope] || SKELETON_BY_SCOPE.portfolio;

  if (analyticsStatus === 'loading' || analyticsStatus === 'idle') {
    return (
      <div className="space-y-6 animate-pulse">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div
            key={i}
            className={`rounded-xl border p-4 h-40 ${skeletonClasses[scope === 'all' ? i : 0]}`}
          />
        ))}
      </div>
    );
  }

  if (analyticsStatus === 'error' && !data) {
    if (!fetchError) {
      return (
        <div className="space-y-6 animate-pulse">
          {Array.from({ length: skeletonCount }, (_, i) => (
            <div
              key={i}
              className={`rounded-xl border p-4 h-40 ${skeletonClasses[scope === 'all' ? i : 0]}`}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200">
        {fetchError}
      </div>
    );
  }

  if (!data) return null;

  const { portfolio: po, programmes: pr, projects: pj } = data;

  /** Worst RAG for each pillar (for section header), aligned with tile rules below. */
  const portfolioOverallRag = worstRagFromList([
    ragCountPositiveWarning(po.programmesWithoutPortfolio),
    po.coveragePercent != null ? ragPctHigherIsBetter(po.coveragePercent) : 'red',
    po.healthIndex != null ? ragPctHigherIsBetter(po.healthIndex) : 'red',
    po.governanceCompliancePct != null
      ? ragPctHigherIsBetter(po.governanceCompliancePct, { good: 85, warn: 60 })
      : 'red',
    po.benefitsRealizationPct != null ? ragPctHigherIsBetter(po.benefitsRealizationPct) : 'red',
    po.budgetUtilizationPct != null ? ragBudgetUtilizationPct(po.budgetUtilizationPct) : 'red',
    po.evm?.cpi != null ? ragEvmIndex(po.evm.cpi) : 'red',
    po.evm?.spi != null ? ragEvmIndex(po.evm.spi) : 'red',
  ]);

  const programmesOverallRag = worstRagFromList([
    ragCountPositiveWarning(pr.unlinkedNoPortfolio),
    pr.healthIndex != null ? ragPctHigherIsBetter(pr.healthIndex) : 'red',
    pr.deliveryProgressPct != null ? ragPctHigherIsBetter(pr.deliveryProgressPct) : 'red',
    pr.scheduleVarianceCount != null ? ragCountPositiveWarning(pr.scheduleVarianceCount) : 'red',
    pr.budgetUtilizationPct != null ? ragBudgetUtilizationPct(pr.budgetUtilizationPct) : 'red',
    pr.benefitsProgressPct != null ? ragPctHigherIsBetter(pr.benefitsProgressPct) : 'red',
    pr.blockedDependencies != null ? ragCountPositiveWarning(pr.blockedDependencies) : 'red',
    pr.milestoneAchievementPct != null ? ragPctHigherIsBetter(pr.milestoneAchievementPct) : 'red',
    pr.resourceConflictCount != null ? ragCountPositiveWarning(pr.resourceConflictCount) : 'red',
    pr.evm != null && (Number(pr.evm.programmesCpiLt1) > 0 || Number(pr.evm.programmesSpiLt1) > 0)
      ? 'amber'
      : 'green',
  ]);

  const projectsOverallRag = worstRagFromList([
    pj.healthScore != null ? ragPctHigherIsBetter(pj.healthScore) : 'red',
    Number(pj.atRisk) > 0 ? 'amber' : 'green',
    Number(pj.critical) > 0 ? 'red' : 'green',
    Number(pj.onTimeTotal) > 0 && pj.onTimeDeliveryPct != null
      ? ragPctHigherIsBetter(pj.onTimeDeliveryPct)
      : 'red',
    pj.budgetVariancePct != null ? ragBudgetVariancePct(pj.budgetVariancePct) : 'red',
    ragCountPositiveWarning(pj.unlinkedNoProgrammeOrPortfolio),
    pj.scheduleRag?.delayed > 0 ? 'amber' : 'green',
    pj.scheduleRag?.critical > 0 ? 'red' : 'green',
    pj.openRisksHighCritical != null ? ragCountThreshold(pj.openRisksHighCritical, 5) : 'red',
    pj.openIssues != null ? ragCountPositiveWarning(pj.openIssues) : 'red',
    pj.overdueTasks != null ? (Number(pj.overdueTasks) > 0 ? 'amber' : 'green') : 'red',
    pj.changeRequestsPending != null ? ragCountPositiveWarning(pj.changeRequestsPending) : 'red',
    pj.documentCompliancePct != null
      ? ragPctHigherIsBetter(pj.documentCompliancePct, { good: 85, warn: 65 })
      : 'red',
    pj.avgTaskCompletionPct != null ? ragPctHigherIsBetter(pj.avgTaskCompletionPct) : 'red',
    Number(pj.evm?.projectsCpiLt085) > 0 || Number(pj.evm?.projectsSpiLt085) > 0 ? 'amber' : 'green',
    Number(pj.criticalPath?.projectsWithCpDelay) > 0 ? 'amber' : 'green',
    Number(pj.criticalPath?.cpMilestonesAtRisk) > 0 ? 'red' : 'green',
    pj.total > 0 && Number(pj.healthy) === 0 ? 'amber' : 'green',
  ]);

  const showPortfolio = scope === 'all' || scope === 'portfolio';
  const showProgrammes = scope === 'all' || scope === 'programmes';
  const showProjects = scope === 'all' || scope === 'projects';

  const aria =
    scope === 'all'
      ? 'PMO scope overview metrics'
      : `${scope} dashboard details`;

  return (
    <section className="space-y-8" aria-label={aria}>
      {extendedLoadError && scope === 'all' && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-950/20 px-4 py-2 text-sm text-amber-100 dark:text-amber-200">
          Extended dashboard metrics (EVM, critical path, governance %) did not load: {extendedLoadError}
        </div>
      )}
      {showPortfolio && (
        <div
          className={`rounded-xl border p-4 sm:p-5 ${SECTION_THEME.portfolio.panel}`}
        >
          <SectionHeader
            icon={Briefcase}
            title={scope === 'portfolio' ? 'Portfolio dashboard details' : 'Portfolio overview'}
            to="/platform/portfolio"
            linkLabel="Open module"
            themeKey="portfolio"
            overallRag={portfolioOverallRag}
          />
          <p className={`text-xs mb-4 ${SECTION_THEME.portfolio.blurb}`}>
            Snapshot of portfolio entities and how programmes are aligned to portfolio hierarchy.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <MetricTile themeKey="portfolio" label="Total portfolios" value={po.total} />
            <MetricTile themeKey="portfolio" label="Active" value={po.active} />
            <MetricTile
              themeKey="portfolio"
              label="Programmes with portfolio"
              value={po.programmesWithPortfolioParent}
              hint="Parent portfolio assigned"
            />
            <MetricTile
              themeKey="portfolio"
              label="Programmes without portfolio"
              value={po.programmesWithoutPortfolio}
              hint="Needs alignment"
              emphasize={po.programmesWithoutPortfolio > 0}
              rag={ragCountPositiveWarning(po.programmesWithoutPortfolio)}
            />
            <MetricTile
              themeKey="portfolio"
              label="Programme coverage"
              value={po.coveragePercent != null ? `${po.coveragePercent}%` : '—'}
              hint="% of programmes under a portfolio"
              rag={po.coveragePercent != null ? ragPctHigherIsBetter(po.coveragePercent) : undefined}
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <MetricTile
              themeKey="portfolio"
              label="Budget utilization"
              value={fmtPct(po.budgetUtilizationPct)}
              hint="Spend vs total budget (org projects)"
              rag={po.budgetUtilizationPct != null ? ragBudgetUtilizationPct(po.budgetUtilizationPct) : undefined}
            />
            <MetricTile
              themeKey="portfolio"
              label="Portfolio health index"
              value={fmtIdx(po.healthIndex)}
              hint="RAG blend of project health"
              rag={po.healthIndex != null ? ragPctHigherIsBetter(po.healthIndex) : undefined}
            />
            <MetricTile
              themeKey="portfolio"
              label="Governance compliance"
              value={fmtPct(po.governanceCompliancePct)}
              hint="Avg mandatory doc compliance"
              rag={
                po.governanceCompliancePct != null
                  ? ragPctHigherIsBetter(po.governanceCompliancePct, { good: 85, warn: 60 })
                  : undefined
              }
            />
            <MetricTile
              themeKey="portfolio"
              label="Benefits realization"
              value={fmtPct(po.benefitsRealizationPct)}
              hint="Programme benefits vs target"
              rag={po.benefitsRealizationPct != null ? ragPctHigherIsBetter(po.benefitsRealizationPct) : undefined}
            />
          </div>
          {po.evm && (
            <div className="mt-4 rounded-lg border border-emerald-800/40 bg-emerald-950/20 px-3 py-3 dark:bg-emerald-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-200/90 mb-2">
                EVM rollup (org)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-sm">
                <div className="text-gray-800 dark:text-gray-200">
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">BAC</span>
                  <div className="font-semibold tabular-nums">{fmtMoney(po.evm.bac)}</div>
                </div>
                <div className="text-gray-800 dark:text-gray-200">
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">EV</span>
                  <div className="font-semibold tabular-nums">{fmtMoney(po.evm.ev)}</div>
                </div>
                <div className="text-gray-800 dark:text-gray-200">
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">PV</span>
                  <div className="font-semibold tabular-nums">{fmtMoney(po.evm.pv)}</div>
                </div>
                <div className="text-gray-800 dark:text-gray-200">
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">AC</span>
                  <div className="font-semibold tabular-nums">{fmtMoney(po.evm.ac)}</div>
                </div>
                <div className="text-gray-800 dark:text-gray-200">
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">CPI</span>
                  <div className="font-semibold tabular-nums">{po.evm.cpi != null ? po.evm.cpi.toFixed(2) : '—'}</div>
                </div>
                <div className="text-gray-800 dark:text-gray-200">
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">SPI</span>
                  <div className="font-semibold tabular-nums">{po.evm.spi != null ? po.evm.spi.toFixed(2) : '—'}</div>
                </div>
              </div>
              <p className="mt-2 text-xs">
                <Link
                  to="/platform/portfolio/evm"
                  className={`font-medium hover:underline ${SECTION_THEME.portfolio.link}`}
                >
                  Open portfolio EVM drill-down
                </Link>
              </p>
            </div>
          )}
          {scope === 'portfolio' && (
            <p className={`mt-4 text-sm ${SECTION_THEME.portfolio.blurb}`}>
              Full searchable list:{' '}
              <Link
                to="/platform/portfolio"
                className={`font-medium hover:underline ${SECTION_THEME.portfolio.link}`}
              >
                Portfolio register
              </Link>
            </p>
          )}
        </div>
      )}

      {showProgrammes && (
        <div
          className={`rounded-xl border p-4 sm:p-5 ${SECTION_THEME.programmes.panel}`}
        >
          <SectionHeader
            icon={Layers}
            title={scope === 'programmes' ? 'Programmes dashboard details' : 'Programmes overview'}
            to="/platform/programme"
            linkLabel="Open module"
            themeKey="programmes"
            overallRag={programmesOverallRag}
          />
          <p className={`text-xs mb-4 ${SECTION_THEME.programmes.blurb}`}>
            Programme throughput and linkage to portfolios and projects.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <MetricTile themeKey="programmes" label="Total programmes" value={pr.total} />
            <MetricTile themeKey="programmes" label="Active" value={pr.active} />
            <MetricTile themeKey="programmes" label="Planning" value={pr.planning} />
            <MetricTile themeKey="programmes" label="On hold" value={pr.onHold} />
            <MetricTile
              themeKey="programmes"
              label="Linked to portfolio"
              value={pr.linkedToPortfolio}
              hint="Has portfolio parent"
            />
            <MetricTile
              themeKey="programmes"
              label="Unlinked (no portfolio)"
              value={pr.unlinkedNoPortfolio}
              emphasize={pr.unlinkedNoPortfolio > 0}
              rag={ragCountPositiveWarning(pr.unlinkedNoPortfolio)}
            />
            <MetricTile
              themeKey="programmes"
              label="Projects on programmes"
              value={pr.distinctProjectsOnProgrammes}
              hint="Distinct projects with programme link"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
            <MetricTile
              themeKey="programmes"
              label="Programme health index"
              value={fmtIdx(pr.healthIndex)}
              hint="From programme records"
              rag={pr.healthIndex != null ? ragPctHigherIsBetter(pr.healthIndex) : undefined}
            />
            <MetricTile
              themeKey="programmes"
              label="Delivery progress"
              value={pr.deliveryProgressPct != null ? `${pr.deliveryProgressPct}%` : '—'}
              hint="Avg project % complete"
              rag={pr.deliveryProgressPct != null ? ragPctHigherIsBetter(pr.deliveryProgressPct) : undefined}
            />
            <MetricTile
              themeKey="programmes"
              label="Projects behind end date"
              value={pr.scheduleVarianceCount ?? '—'}
              hint="Schedule variance proxy"
              rag={
                pr.scheduleVarianceCount != null ? ragCountPositiveWarning(pr.scheduleVarianceCount) : undefined
              }
            />
            <MetricTile
              themeKey="programmes"
              label="Budget utilization"
              value={fmtPct(pr.budgetUtilizationPct)}
              rag={pr.budgetUtilizationPct != null ? ragBudgetUtilizationPct(pr.budgetUtilizationPct) : undefined}
            />
            <MetricTile
              themeKey="programmes"
              label="Benefits progress"
              value={fmtPct(pr.benefitsProgressPct)}
              rag={pr.benefitsProgressPct != null ? ragPctHigherIsBetter(pr.benefitsProgressPct) : undefined}
            />
            <MetricTile
              themeKey="programmes"
              label="Blocked dependencies"
              value={pr.blockedDependencies ?? '—'}
              hint="High/critical programme dependencies"
              rag={pr.blockedDependencies != null ? ragCountPositiveWarning(pr.blockedDependencies) : undefined}
            />
            <MetricTile
              themeKey="programmes"
              label="Milestone achievement"
              value={pr.milestoneAchievementPct != null ? `${pr.milestoneAchievementPct}%` : '—'}
              rag={
                pr.milestoneAchievementPct != null ? ragPctHigherIsBetter(pr.milestoneAchievementPct) : undefined
              }
            />
            <MetricTile
              themeKey="programmes"
              label="Resource conflicts"
              value={pr.resourceConflictCount ?? '—'}
              hint="Resources over 100% allocated"
              rag={pr.resourceConflictCount != null ? ragCountPositiveWarning(pr.resourceConflictCount) : undefined}
            />
          </div>
          {pr.evm != null && (
            <div className="mt-4 rounded-lg border border-sky-800/40 bg-sky-950/20 px-3 py-3 dark:bg-sky-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-sky-200/90 mb-2">
                EVM — programmes behind (CPI/SPI &lt; 1)
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-800 dark:text-gray-200">
                <div>
                  Programmes CPI &lt; 1:{' '}
                  <span className="font-semibold tabular-nums">{pr.evm.programmesCpiLt1}</span>
                </div>
                <div>
                  Programmes SPI &lt; 1:{' '}
                  <span className="font-semibold tabular-nums">{pr.evm.programmesSpiLt1}</span>
                </div>
              </div>
            </div>
          )}
          {scope === 'programmes' && (
            <p className={`mt-4 text-sm ${SECTION_THEME.programmes.blurb}`}>
              Full searchable list:{' '}
              <Link
                to="/platform/programme"
                className={`font-medium hover:underline ${SECTION_THEME.programmes.link}`}
              >
                Programme register
              </Link>
            </p>
          )}
        </div>
      )}

      {showProjects && (
        <div
          className={`rounded-xl border p-4 sm:p-5 ${SECTION_THEME.projects.panel}`}
        >
          <SectionHeader
            icon={FolderKanban}
            title={scope === 'projects' ? 'Projects dashboard details' : 'Projects overview'}
            to="/platform/projects"
            linkLabel="Open module"
            themeKey="projects"
            overallRag={projectsOverallRag}
          />
          <p className={`text-xs mb-4 ${SECTION_THEME.projects.blurb}`}>
            Delivery health, schedule, budget, and governance linkage for the project portfolio.
          </p>
          <div className="space-y-4">
            <div className={`rounded-xl border p-3 sm:p-4 ${PROJECTS_SUBSECTION.volume}`}>
              <ProjectsSubsectionLabel tone="slate">Volume &amp; lifecycle</ProjectsSubsectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <MetricTile themeKey="projects" label="Total projects" value={pj.total} />
                <MetricTile themeKey="projects" label="Active" value={pj.active} />
                <MetricTile themeKey="projects" label="Planned / draft" value={pj.planned} />
                <MetricTile themeKey="projects" label="Completed" value={pj.completed} />
              </div>
            </div>
            <div className={`rounded-xl border p-3 sm:p-4 ${PROJECTS_SUBSECTION.health}`}>
              <ProjectsSubsectionLabel tone="emerald">Health &amp; RAG</ProjectsSubsectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <MetricTile
                  themeKey="projects"
                  label="Health index"
                  value={pj.healthScore != null ? `${pj.healthScore}%` : '—'}
                  hint={
                    pj.healthScore != null
                      ? 'In-flight (active) projects only'
                      : 'No in-flight projects — set status to Active when delivery starts'
                  }
                  rag={pj.healthScore != null ? ragPctHigherIsBetter(pj.healthScore) : undefined}
                />
                <MetricTile
                  themeKey="projects"
                  label="Healthy"
                  value={pj.healthy}
                  rag={pj.total > 0 && Number(pj.healthy) === 0 ? 'amber' : 'green'}
                />
                <MetricTile
                  themeKey="projects"
                  label="At risk"
                  value={pj.atRisk}
                  emphasize={pj.atRisk > 0}
                  rag={Number(pj.atRisk) > 0 ? 'amber' : 'green'}
                />
                <MetricTile
                  themeKey="projects"
                  label="Critical"
                  value={pj.critical}
                  emphasize={pj.critical > 0}
                  rag={ragCountPositiveDanger(pj.critical)}
                />
              </div>
            </div>
            <div className={`rounded-xl border p-3 sm:p-4 ${PROJECTS_SUBSECTION.finance}`}>
              <ProjectsSubsectionLabel tone="amber">Schedule &amp; finance</ProjectsSubsectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <MetricTile
                  themeKey="projects"
                  label="On-time delivery"
                  value={`${pj.onTimeDeliveryPct ?? 0}%`}
                  hint={
                    Number(pj.onTimeTotal) > 0
                      ? `${pj.onTimeCount ?? 0} of ${pj.onTimeTotal} completed`
                      : 'No completed baseline'
                  }
                  dataMissing={!(Number(pj.onTimeTotal) > 0)}
                  rag={
                    Number(pj.onTimeTotal) > 0
                      ? ragPctHigherIsBetter(pj.onTimeDeliveryPct ?? 0, { good: 75, warn: 50 })
                      : undefined
                  }
                />
                <MetricTile
                  themeKey="projects"
                  label="Budget variance"
                  value={pj.budgetVariancePct != null ? `${pj.budgetVariancePct}%` : '—'}
                  hint="Spend vs budget (aggregate)"
                  rag={pj.budgetVariancePct != null ? ragBudgetVariancePct(pj.budgetVariancePct) : undefined}
                />
                <MetricTile themeKey="projects" label="Total budget" value={fmtMoney(pj.totalBudget)} />
                <MetricTile themeKey="projects" label="Actual spend" value={fmtMoney(pj.totalSpent)} />
              </div>
            </div>
            <div className={`rounded-xl border p-3 sm:p-4 ${PROJECTS_SUBSECTION.linkage}`}>
              <ProjectsSubsectionLabel tone="cyan">Programme / portfolio linkage</ProjectsSubsectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricTile
                  themeKey="projects"
                  label="Unlinked (no prog. / portfolio)"
                  value={pj.unlinkedNoProgrammeOrPortfolio}
                  hint="No programme or portfolio link"
                  emphasize={pj.unlinkedNoProgrammeOrPortfolio > 0}
                  rag={ragCountPositiveWarning(pj.unlinkedNoProgrammeOrPortfolio)}
                />
                <MetricTile
                  themeKey="projects"
                  label="Linked to both"
                  value={pj.linkedToBothProgrammeAndPortfolio ?? 0}
                  hint="Programme and portfolio"
                />
              </div>
            </div>
            {pj.scheduleRag && (
              <div className={`rounded-xl border p-3 sm:p-4 ${PROJECTS_SUBSECTION.scheduleRag}`}>
                <ProjectsSubsectionLabel tone="violet">Schedule health (RAG)</ProjectsSubsectionLabel>
                <div className="grid grid-cols-3 gap-3">
                  <MetricTile
                    themeKey="projects"
                    label="On track (RAG)"
                    value={pj.scheduleRag.onTrack}
                    rag="green"
                  />
                  <MetricTile
                    themeKey="projects"
                    label="Delayed / at risk"
                    value={pj.scheduleRag.delayed}
                    rag={Number(pj.scheduleRag.delayed) > 0 ? 'amber' : 'green'}
                  />
                  <MetricTile
                    themeKey="projects"
                    label="Critical"
                    value={pj.scheduleRag.critical}
                    emphasize={pj.scheduleRag.critical > 0}
                    rag={ragCountPositiveDanger(pj.scheduleRag.critical)}
                  />
                </div>
              </div>
            )}
            <div className={`rounded-xl border p-3 sm:p-4 ${PROJECTS_SUBSECTION.operations}`}>
              <ProjectsSubsectionLabel tone="rose">Risks, issues &amp; delivery</ProjectsSubsectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <MetricTile
                  themeKey="projects"
                  label="Open high/critical risks"
                  value={pj.openRisksHighCritical ?? '—'}
                  rag={
                    pj.openRisksHighCritical != null ? ragCountThreshold(pj.openRisksHighCritical, 5) : undefined
                  }
                />
                <MetricTile
                  themeKey="projects"
                  label="Open issues"
                  value={pj.openIssues ?? '—'}
                  rag={pj.openIssues != null ? ragCountPositiveWarning(pj.openIssues) : undefined}
                />
                <MetricTile
                  themeKey="projects"
                  label="Overdue tasks"
                  value={pj.overdueTasks ?? '—'}
                  emphasize={(pj.overdueTasks || 0) > 0}
                  rag={pj.overdueTasks != null ? (Number(pj.overdueTasks) > 0 ? 'amber' : 'green') : undefined}
                />
                <MetricTile
                  themeKey="projects"
                  label="CRs pending approval"
                  value={pj.changeRequestsPending ?? '—'}
                  rag={pj.changeRequestsPending != null ? ragCountPositiveWarning(pj.changeRequestsPending) : undefined}
                />
              </div>
            </div>
            <div className={`rounded-xl border p-3 sm:p-4 ${PROJECTS_SUBSECTION.compliance}`}>
              <ProjectsSubsectionLabel tone="teal">Governance &amp; tasks</ProjectsSubsectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricTile
                  themeKey="projects"
                  label="Document compliance"
                  value={fmtPct(pj.documentCompliancePct)}
                  rag={
                    pj.documentCompliancePct != null
                      ? ragPctHigherIsBetter(pj.documentCompliancePct, { good: 85, warn: 65 })
                      : undefined
                  }
                />
                <MetricTile
                  themeKey="projects"
                  label="Avg task completion"
                  value={pj.avgTaskCompletionPct != null ? `${pj.avgTaskCompletionPct}%` : '—'}
                  rag={pj.avgTaskCompletionPct != null ? ragPctHigherIsBetter(pj.avgTaskCompletionPct) : undefined}
                />
              </div>
            </div>
          </div>
          {pj.evm && (
            <div className={`mt-4 rounded-xl border px-3 py-3 sm:px-4 sm:py-4 ${PROJECTS_SUBSECTION.evm}`}>
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-300 mb-2">
                EVM rollup (projects)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-sm text-gray-800 dark:text-gray-200">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">BAC</span>
                  <div className="font-semibold tabular-nums">{fmtMoney(pj.evm.bac)}</div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">EV</span>
                  <div className="font-semibold tabular-nums">{fmtMoney(pj.evm.ev)}</div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">PV</span>
                  <div className="font-semibold tabular-nums">{fmtMoney(pj.evm.pv)}</div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">AC</span>
                  <div className="font-semibold tabular-nums">{fmtMoney(pj.evm.ac)}</div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">CPI &lt; 0.85</span>
                  <div className="font-semibold tabular-nums text-amber-600 dark:text-amber-300">
                    {pj.evm.projectsCpiLt085 ?? 0}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 text-[10px] uppercase">SPI &lt; 0.85</span>
                  <div className="font-semibold tabular-nums text-amber-600 dark:text-amber-300">
                    {pj.evm.projectsSpiLt085 ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}
          {pj.criticalPath && (
            <div className={`mt-4 rounded-xl border px-3 py-3 sm:px-4 sm:py-4 ${PROJECTS_SUBSECTION.criticalPath}`}>
              <div className="text-xs font-semibold uppercase tracking-wide text-orange-800 dark:text-orange-300 mb-2">
                Critical path (lightweight)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-800 dark:text-gray-200">
                <div>CP tasks: {pj.criticalPath.cpTasksTotal}</div>
                <div>CP overdue: {pj.criticalPath.cpTasksOverdue}</div>
                <div>CP blocked: {pj.criticalPath.cpTasksBlocked}</div>
                <div>Projects w/ CP delay: {pj.criticalPath.projectsWithCpDelay}</div>
                <div>Avg CP delay (d): {pj.criticalPath.avgCpDelayDays ?? '—'}</div>
                <div>CP milestones at risk: {pj.criticalPath.cpMilestonesAtRisk}</div>
              </div>
            </div>
          )}
          {(pj.riskBand || pj.issueBand || pj.changeBand) && (
            <div className="mt-4 space-y-3">
              {pj.riskBand && (
                <div
                  className={`rounded-xl border px-3 py-3 sm:px-4 text-sm text-gray-800 dark:text-gray-200 ${PROJECTS_SUBSECTION.riskBand}`}
                >
                  <div className="font-semibold text-rose-800 dark:text-rose-300 mb-2">Risk band</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <span>Open: {pj.riskBand.openTotal}</span>
                    <span>Critical open: {pj.riskBand.criticalOpen}</span>
                    <span>Imminent: {pj.riskBand.imminent}</span>
                    <span>Unmitigated crit.: {pj.riskBand.unmitigatedCritical}</span>
                  </div>
                </div>
              )}
              {pj.issueBand && (
                <div
                  className={`rounded-xl border px-3 py-3 sm:px-4 text-sm text-gray-800 dark:text-gray-200 ${PROJECTS_SUBSECTION.issueBand}`}
                >
                  <div className="font-semibold text-sky-800 dark:text-sky-300 mb-2">Issues band</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <span>Open: {pj.issueBand.openTotal}</span>
                    <span>Critical: {pj.issueBand.criticalOpen}</span>
                    <span>Overdue actions: {pj.issueBand.overdueActions}</span>
                    <span>High age: {pj.issueBand.highAgeOpen}</span>
                  </div>
                </div>
              )}
              {pj.changeBand && (
                <div
                  className={`rounded-xl border px-3 py-3 sm:px-4 text-sm text-gray-800 dark:text-gray-200 ${PROJECTS_SUBSECTION.changeBand}`}
                >
                  <div className="font-semibold text-fuchsia-800 dark:text-fuchsia-300 mb-2">Change requests</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <span>Pending approval: {pj.changeBand.pendingApproval}</span>
                    <span>Under assessment: {pj.changeBand.underAssessment}</span>
                    <span>Critical / urgent: {pj.changeBand.criticalUrgent}</span>
                    <span>Total open: {pj.changeBand.totalOpen}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {scope === 'projects' && (
            <p className={`mt-4 text-sm ${SECTION_THEME.projects.blurb}`}>
              Full searchable list:{' '}
              <Link
                to="/platform/projects"
                className={`font-medium hover:underline ${SECTION_THEME.projects.link}`}
              >
                All projects
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
});

PMOScopeOverviewMetrics.displayName = 'PMOScopeOverviewMetrics';

export default PMOScopeOverviewMetrics;
