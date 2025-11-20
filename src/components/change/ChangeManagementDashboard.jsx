import { useState, useEffect } from 'react';
import { FileEdit, AlertCircle, TrendingUp, CheckCircle, Clock, XCircle, BarChart3 } from 'lucide-react';
import { getChangeManagementStats } from '../../services/changeManagementService';

export default function ChangeManagementDashboard({ projectId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (projectId) {
      loadStats();
    }
  }, [projectId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getChangeManagementStats(projectId);
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
      title: 'Total Requests',
      value: stats.totalRequests,
      subtitle: `${stats.criticalPriority} critical`,
      icon: FileEdit,
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      title: 'Under Assessment',
      value: stats.underAssessment,
      subtitle: 'being analyzed',
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    {
      title: 'Pending Approval',
      value: stats.pendingApproval,
      subtitle: 'awaiting decision',
      icon: AlertCircle,
      color: 'orange',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      borderColor: 'border-orange-200 dark:border-orange-800'
    },
    {
      title: 'Approved',
      value: stats.approvedRequests,
      subtitle: 'ready to implement',
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      title: 'Implemented',
      value: stats.implementedRequests,
      subtitle: 'completed',
      icon: TrendingUp,
      color: 'purple',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      title: 'Rejected',
      value: stats.rejectedRequests,
      subtitle: 'not approved',
      icon: XCircle,
      color: 'red',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-800'
    }
  ];

  const categoryData = [
    { category: 'Scope', count: stats.byCategory.scope, color: 'bg-blue-500' },
    { category: 'Schedule', count: stats.byCategory.schedule, color: 'bg-green-500' },
    { category: 'Budget', count: stats.byCategory.budget, color: 'bg-yellow-500' },
    { category: 'Quality', count: stats.byCategory.quality, color: 'bg-purple-500' },
    { category: 'Resource', count: stats.byCategory.resource, color: 'bg-pink-500' },
    { category: 'Technical', count: stats.byCategory.technical, color: 'bg-indigo-500' }
  ];

  const maxCategoryCount = Math.max(...Object.values(stats.byCategory), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Change Management Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of change requests and approval status
          </p>
        </div>
        <button
          onClick={loadStats}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Change Board Status */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Change Board Status
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Board Status
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              stats.boardExists
                ? stats.boardStatus === 'active'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}>
              {stats.boardExists ? stats.boardStatus : 'Not configured'}
            </span>
          </div>
          {stats.boardExists && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Board Name
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {stats.boardName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Changes by Category
          </h3>
        </div>
        <div className="space-y-4">
          {categoryData.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.category}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.count}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className={`${item.color} h-2.5 rounded-full transition-all duration-300`}
                  style={{ width: `${(item.count / maxCategoryCount) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-3">
          Change Management Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-blue-800 dark:text-blue-400 mb-1">
              <span className="font-semibold">{stats.submittedRequests}</span> new submissions
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-500">
              Awaiting initial assessment
            </p>
          </div>
          <div>
            <p className="text-blue-800 dark:text-blue-400 mb-1">
              <span className="font-semibold">{stats.underAssessment + stats.pendingApproval}</span> in workflow
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-500">
              Being assessed or awaiting approval
            </p>
          </div>
          <div>
            <p className="text-blue-800 dark:text-blue-400 mb-1">
              <span className="font-semibold">
                {Math.round((stats.implementedRequests / Math.max(stats.totalRequests, 1)) * 100)}%
              </span> completion rate
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-500">
              Of all changes implemented
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
