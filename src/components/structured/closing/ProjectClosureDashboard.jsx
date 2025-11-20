import { useState, useEffect } from 'react';
import { CheckCircle, FileText, Lightbulb, ArrowRight, AlertCircle, TrendingUp } from 'lucide-react';
import { getClosureDashboardStats } from '../../../services/closingProjectService';

export default function ProjectClosureDashboard({ projectId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (projectId) {
      loadDashboardStats();
    }
  }, [projectId]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClosureDashboardStats(projectId);
      setStats(data);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Error loading dashboard: {error}</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: 'Closure Status',
      value: stats.closureStatus.replace('-', ' '),
      subtitle: stats.closurePhase.replace('-', ' '),
      icon: CheckCircle,
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Checklist Progress',
      value: `${stats.checklistCompletion.toFixed(0)}%`,
      subtitle: 'completion',
      icon: TrendingUp,
      color: 'green',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Lessons Learned',
      value: stats.totalLessons,
      subtitle: `${stats.positiveLessons} positive`,
      icon: Lightbulb,
      color: 'purple',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      title: 'Follow-on Actions',
      value: stats.totalActions,
      subtitle: `${stats.completedActions} completed`,
      icon: ArrowRight,
      color: 'orange',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-800'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Closure Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of project closure activities and progress
          </p>
        </div>
        <button
          onClick={loadDashboardStats}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className={`${card.bgColor} border ${card.borderColor} rounded-lg p-6 transition-all hover:shadow-md`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.iconColor} bg-white dark:bg-gray-800`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1 capitalize">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Summary */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Closure Progress
        </h3>
        <div className="space-y-3">
          {!stats.closureExists && (
            <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Project closure not yet initiated
              </span>
            </div>
          )}

          {stats.totalLessons > 0 && (
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Lightbulb className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {stats.totalLessons} lessons learned documented
              </span>
            </div>
          )}

          {stats.totalActions > 0 && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <ArrowRight className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {stats.completedActions} of {stats.totalActions} follow-on actions completed
              </span>
            </div>
          )}

          {stats.handoverExists && (
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Handover documentation in progress: {stats.handoverStatus.replace('-', ' ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
