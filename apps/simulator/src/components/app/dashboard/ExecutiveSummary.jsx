/**
 * Executive Summary Component
 *
 * Displays high-level summary of organization's projects, tasks, and teams
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import { useEffect, useState, memo } from 'react';
import { LayoutDashboard, Briefcase, Layers, FolderKanban, ListChecks, Users } from 'lucide-react';
import { getExecutiveSummary } from '../../../services/dashboardService';

const ExecutiveSummary = memo(function ExecutiveSummary({
  organizationId,
  initialSummary = null,
  /** When false, only the section title is shown (no entity cards or data fetch). */
  showEntityCards = true,
}) {
  const [summary, setSummary] = useState(initialSummary ?? null);
  const [loading, setLoading] = useState(showEntityCards && !initialSummary);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!showEntityCards) {
      setLoading(false);
      setError(null);
      return;
    }
    if (initialSummary != null) {
      setSummary(initialSummary);
      setLoading(false);
      setError(null);
      return;
    }
    if (!organizationId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const result = await getExecutiveSummary(organizationId);
      if (cancelled) return;
      if (result.success) {
        setSummary(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, initialSummary, showEntityCards]);

  if (!showEntityCards) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            Executive Summary
          </h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-500/30 rounded-lg p-4 text-red-700 dark:text-red-400">
        Error loading executive summary: {error}
      </div>
    );
  }

  if (!summary) return null;

  const summaryCards = [
    {
      title: 'Portfolios',
      icon: Briefcase,
      total: summary.portfolios.total,
      stats: [
        { label: 'Active', value: summary.portfolios.active, color: 'text-green-600 dark:text-green-400' },
        { label: 'Completed', value: summary.portfolios.completed, color: 'text-blue-600 dark:text-blue-400' },
        { label: 'On Hold', value: summary.portfolios.onHold, color: 'text-amber-600 dark:text-yellow-400' },
        { label: 'Planning', value: summary.portfolios.planning, color: 'text-gray-600 dark:text-gray-400' },
        { label: 'Cancelled', value: summary.portfolios.cancelled, color: 'text-red-600 dark:text-red-400/80' },
      ],
    },
    {
      title: 'Programmes',
      icon: Layers,
      total: summary.programmes.total,
      stats: [
        { label: 'Active', value: summary.programmes.active, color: 'text-green-600 dark:text-green-400' },
        { label: 'Completed', value: summary.programmes.completed, color: 'text-blue-600 dark:text-blue-400' },
        { label: 'On Hold', value: summary.programmes.onHold, color: 'text-amber-600 dark:text-yellow-400' },
        { label: 'Planning', value: summary.programmes.planning, color: 'text-gray-600 dark:text-gray-400' },
        { label: 'Cancelled', value: summary.programmes.cancelled, color: 'text-red-600 dark:text-red-400/80' },
        {
          label: 'Linked to portfolios',
          value: summary.programmes.linkedToPortfolios ?? 0,
          color: 'text-cyan-700 dark:text-cyan-400/90',
          dividerBefore: true,
        },
        {
          label: 'Unlinked (no portfolio)',
          value: summary.programmes.unlinkedNoPortfolio ?? 0,
          color: 'text-amber-700 dark:text-amber-400/90',
        },
      ],
    },
    {
      title: 'Projects',
      icon: FolderKanban,
      total: summary.projects.total,
      stats: [
        { label: 'Active', value: summary.projects.active, color: 'text-green-600 dark:text-green-400' },
        { label: 'Completed', value: summary.projects.completed, color: 'text-blue-600 dark:text-blue-400' },
        { label: 'On Hold', value: summary.projects.onHold, color: 'text-amber-600 dark:text-yellow-400' },
        { label: 'Draft / Planning', value: summary.projects.planned, color: 'text-gray-600 dark:text-gray-400' },
        {
          label: 'Linked to both',
          value: summary.projects.linkedToBothProgrammeAndPortfolio ?? 0,
          color: 'text-emerald-700 dark:text-emerald-400/90',
          dividerBefore: true,
        },
        {
          label: 'Programme link only',
          value: summary.projects.linkedToProgrammesOnly ?? 0,
          color: 'text-gray-600 dark:text-gray-400',
        },
        {
          label: 'Portfolio link only',
          value: summary.projects.linkedToPortfoliosOnly ?? 0,
          color: 'text-gray-600 dark:text-gray-400',
        },
        {
          label: 'Unlinked (no programme / portfolio)',
          value: summary.projects.unlinkedNoProgrammeOrPortfolio ?? 0,
          color: 'text-amber-700 dark:text-amber-400/90',
        },
      ],
    },
    {
      title: 'Tasks',
      icon: ListChecks,
      total: summary.tasks.total,
      stats: [
        { label: 'To Do', value: summary.tasks.todo, color: 'text-gray-600 dark:text-gray-400' },
        { label: 'In Progress', value: summary.tasks.inProgress, color: 'text-blue-600 dark:text-blue-400' },
        { label: 'Completed', value: summary.tasks.completed, color: 'text-green-600 dark:text-green-400' },
        { label: 'Blocked', value: summary.tasks.blocked, color: 'text-red-600 dark:text-red-400' },
      ],
    },
    {
      title: 'Teams',
      icon: Users,
      total: summary.teams.total,
      stats: [
        { label: 'Total Teams', value: summary.teams.total, color: 'text-blue-600 dark:text-blue-400' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          Executive Summary
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm dark:shadow-none"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{card.title}</h3>
              <card.icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="mb-4">
              <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">{card.total}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total {card.title}</div>
            </div>

            <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
              {card.stats.map((stat, statIndex) => (
                <div
                  key={statIndex}
                  className={`flex items-center justify-between ${stat.dividerBefore ? 'pt-2 mt-1 border-t border-gray-300 dark:border-gray-600/80' : ''}`}
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
                  <span className={`text-sm font-semibold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

ExecutiveSummary.displayName = 'ExecutiveSummary';

export default ExecutiveSummary;
