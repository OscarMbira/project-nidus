import { useState, useEffect } from 'react';
import { FileText, AlertTriangle, CheckCircle, Target, TrendingUp, ArrowRight } from 'lucide-react';
import { getStageBoundariesStats } from '../../../services/stageBoundariesService';

export default function StageBoundaryDashboard({ projectId }) {
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
      const data = await getStageBoundariesStats(projectId);
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
          <AlertTriangle className="h-5 w-5" />
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
      title: 'Total Stages',
      value: stats.totalStages,
      subtitle: `${stats.completedStages} completed`,
      icon: Target,
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'End Stage Reports',
      value: stats.totalEndStageReports,
      subtitle: `${stats.approvedReports} approved`,
      icon: FileText,
      color: 'green',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Exception Plans',
      value: stats.totalExceptionPlans,
      subtitle: `${stats.activeExceptions} active`,
      icon: AlertTriangle,
      color: 'orange',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-800'
    },
    {
      title: 'Next Stage Plans',
      value: stats.totalNextStagePlans,
      subtitle: `${stats.approvedNextStagePlans} approved`,
      icon: ArrowRight,
      color: 'purple',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Stage Boundaries Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of stage transitions and governance
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
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Summary */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Stage Progress Summary
        </h3>
        <div className="space-y-3">
          {stats.activeStages > 0 && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {stats.activeStages} {stats.activeStages === 1 ? 'stage' : 'stages'} currently in progress
              </span>
            </div>
          )}
          {stats.totalExceptionPlans > 0 && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {stats.totalExceptionPlans} exception {stats.totalExceptionPlans === 1 ? 'plan' : 'plans'} requiring attention
              </span>
            </div>
          )}
          {stats.approvedReports > 0 && (
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {stats.approvedReports} end stage {stats.approvedReports === 1 ? 'report' : 'reports'} approved
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
