/**
 * Executive Summary Component
 *
 * Displays high-level summary of organization's projects, tasks, and teams
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import { useEffect, useState, memo } from 'react';
import { LayoutDashboard, FolderKanban, ListChecks, Users } from 'lucide-react';
import { getExecutiveSummary } from '../../../services/dashboardService';

const ExecutiveSummary = memo(function ExecutiveSummary({ organizationId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSummary();
  }, [organizationId]);

  const loadSummary = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    const result = await getExecutiveSummary(organizationId);

    if (result.success) {
      setSummary(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
        Error loading executive summary: {error}
      </div>
    );
  }

  if (!summary) return null;

  const summaryCards = [
    {
      title: 'Projects',
      icon: FolderKanban,
      total: summary.projects.total,
      stats: [
        { label: 'Active', value: summary.projects.active, color: 'text-green-400' },
        { label: 'Completed', value: summary.projects.completed, color: 'text-blue-400' },
        { label: 'On Hold', value: summary.projects.onHold, color: 'text-yellow-400' },
        { label: 'Planned', value: summary.projects.planned, color: 'text-gray-400' },
      ],
    },
    {
      title: 'Tasks',
      icon: ListChecks,
      total: summary.tasks.total,
      stats: [
        { label: 'To Do', value: summary.tasks.todo, color: 'text-gray-400' },
        { label: 'In Progress', value: summary.tasks.inProgress, color: 'text-blue-400' },
        { label: 'Completed', value: summary.tasks.completed, color: 'text-green-400' },
        { label: 'Blocked', value: summary.tasks.blocked, color: 'text-red-400' },
      ],
    },
    {
      title: 'Teams',
      icon: Users,
      total: summary.teams.total,
      stats: [
        { label: 'Total Teams', value: summary.teams.total, color: 'text-blue-400' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6" />
          Executive Summary
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-100">{card.title}</h3>
              <card.icon className="w-8 h-8 text-blue-400" />
            </div>

            <div className="mb-4">
              <div className="text-4xl font-bold text-gray-100">{card.total}</div>
              <div className="text-sm text-gray-400">Total {card.title}</div>
            </div>

            <div className="space-y-2 border-t border-gray-700 pt-4">
              {card.stats.map((stat, statIndex) => (
                <div key={statIndex} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{stat.label}</span>
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
