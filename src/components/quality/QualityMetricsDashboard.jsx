import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Target, BarChart3, PieChart } from 'lucide-react';
import { getQualityManagementStats } from '../../services/qualityManagementService';

export default function QualityMetricsDashboard({ projectId = null }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [projectId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (projectId) filters.project_id = projectId;

      const data = await getQualityManagementStats(filters);
      setStats(data);
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
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

  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Quality Metrics Available
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Quality metrics will appear here once quality register items are created
        </p>
      </div>
    );
  }

  const passRate = stats.totalRegisterItems > 0
    ? (stats.passedItems / stats.totalRegisterItems) * 100
    : 0;

  const defectRate = stats.totalInspections > 0
    ? (stats.totalDefects / stats.totalInspections) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Average Quality Score</p>
              <p className={`text-3xl font-bold ${
                stats.averageQualityScore >= 90 ? 'text-green-600 dark:text-green-400' :
                stats.averageQualityScore >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {Math.round(stats.averageQualityScore || 0)}
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pass Rate</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {Math.round(passRate)}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.passedItems} / {stats.totalRegisterItems} passed
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Quality Reviews</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalReviews || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.completedReviews || 0} completed
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Open Defects</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {stats.openDefects || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.criticalDefects || 0} critical
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Quality Status Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Quality Status Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.passedItems || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Passed/Approved
            </div>
          </div>

          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.pendingItems || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Pending/In Review
            </div>
          </div>

          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.failedItems || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Failed/Rejected
            </div>
          </div>

          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalInspections || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Inspections
            </div>
          </div>
        </div>
      </div>

      {/* Defects Summary */}
      {stats.totalDefects > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Defects Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalDefects || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Defects
              </div>
            </div>

            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.criticalDefects || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Critical
              </div>
            </div>

            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {(stats.totalDefects - stats.criticalDefects - (stats.minorDefects || 0)) || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Major
              </div>
            </div>

            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.minorDefects || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Minor
              </div>
            </div>
          </div>
          {stats.totalInspections > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Average Defects per Inspection:
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {(stats.totalDefects / stats.totalInspections).toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

