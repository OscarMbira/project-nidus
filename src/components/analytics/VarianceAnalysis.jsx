import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { calculateTrend } from '../../services/metricsCalculator';
import MetricCard from './MetricCard';

export default function VarianceAnalysis({ projectId, dataPoints = [] }) {
  const [variances, setVariances] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dataPoints && dataPoints.length > 0) {
      calculateVariances();
    }
  }, [dataPoints]);

  const calculateVariances = () => {
    if (!dataPoints || dataPoints.length < 2) {
      setVariances([]);
      return;
    }

    const calculated = [];

    // Calculate variances between consecutive data points
    for (let i = 1; i < dataPoints.length; i++) {
      const current = dataPoints[i];
      const previous = dataPoints[i - 1];

      // Schedule variance
      if (current.actualDuration && previous.plannedDuration) {
        const scheduleVariance = current.actualDuration - previous.plannedDuration;
        const scheduleVariancePercent = previous.plannedDuration > 0
          ? (scheduleVariance / previous.plannedDuration) * 100
          : 0;

        calculated.push({
          type: 'schedule',
          period: current.period || `Period ${i}`,
          planned: previous.plannedDuration,
          actual: current.actualDuration,
          variance: scheduleVariance,
          variancePercent: scheduleVariancePercent,
          trend: scheduleVariance > 0 ? 'negative' : 'positive',
        });
      }

      // Cost variance
      if (current.actualCost && previous.plannedCost) {
        const costVariance = current.actualCost - previous.plannedCost;
        const costVariancePercent = previous.plannedCost > 0
          ? (costVariance / previous.plannedCost) * 100
          : 0;

        calculated.push({
          type: 'cost',
          period: current.period || `Period ${i}`,
          planned: previous.plannedCost,
          actual: current.actualCost,
          variance: costVariance,
          variancePercent: costVariancePercent,
          trend: costVariance > 0 ? 'negative' : 'positive',
        });
      }

      // Scope variance
      if (current.actualDeliverables && previous.plannedDeliverables) {
        const scopeVariance = current.actualDeliverables - previous.plannedDeliverables;
        const scopeVariancePercent = previous.plannedDeliverables > 0
          ? (scopeVariance / previous.plannedDeliverables) * 100
          : 0;

        calculated.push({
          type: 'scope',
          period: current.period || `Period ${i}`,
          planned: previous.plannedDeliverables,
          actual: current.actualDeliverables,
          variance: scopeVariance,
          variancePercent: scopeVariancePercent,
          trend: scopeVariance > 0 ? 'positive' : 'negative',
        });
      }
    }

    setVariances(calculated);
  };

  const scheduleVariances = variances.filter(v => v.type === 'schedule');
  const costVariances = variances.filter(v => v.type === 'cost');
  const scopeVariances = variances.filter(v => v.type === 'scope');

  const averageScheduleVariance = scheduleVariances.length > 0
    ? scheduleVariances.reduce((sum, v) => sum + v.variancePercent, 0) / scheduleVariances.length
    : 0;

  const averageCostVariance = costVariances.length > 0
    ? costVariances.reduce((sum, v) => sum + v.variancePercent, 0) / costVariances.length
    : 0;

  const averageScopeVariance = scopeVariances.length > 0
    ? scopeVariances.reduce((sum, v) => sum + v.variancePercent, 0) / scopeVariances.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (variances.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Variance Data
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Variance analysis requires multiple data points to compare
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Average Schedule Variance"
          value={averageScheduleVariance}
          displayFormat="percentage"
          status={Math.abs(averageScheduleVariance) <= 5 ? 'good' : Math.abs(averageScheduleVariance) <= 10 ? 'warning' : 'critical'}
          targetValue={0}
          trend={averageScheduleVariance > 0 ? 'down' : 'up'}
        />
        <MetricCard
          title="Average Cost Variance"
          value={averageCostVariance}
          displayFormat="percentage"
          status={Math.abs(averageCostVariance) <= 5 ? 'good' : Math.abs(averageCostVariance) <= 10 ? 'warning' : 'critical'}
          targetValue={0}
          trend={averageCostVariance > 0 ? 'down' : 'up'}
        />
        <MetricCard
          title="Average Scope Variance"
          value={averageScopeVariance}
          displayFormat="percentage"
          status={Math.abs(averageScopeVariance) <= 5 ? 'good' : Math.abs(averageScopeVariance) <= 10 ? 'warning' : 'critical'}
          targetValue={0}
          trend={averageScopeVariance > 0 ? 'up' : 'down'}
        />
      </div>

      {/* Schedule Variance Details */}
      {scheduleVariances.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Schedule Variance Analysis
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Planned</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actual</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Variance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">% Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {scheduleVariances.map((variance, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{variance.period}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{variance.planned.toFixed(1)} days</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{variance.actual.toFixed(1)} days</td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      variance.variance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {variance.variance > 0 ? '+' : ''}{variance.variance.toFixed(1)} days
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      variance.variancePercent > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {variance.variancePercent > 0 ? '+' : ''}{variance.variancePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cost Variance Details */}
      {costVariances.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            Cost Variance Analysis
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Planned</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actual</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Variance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">% Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {costVariances.map((variance, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{variance.period}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      ${variance.planned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                      ${variance.actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      variance.variance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {variance.variance > 0 ? '+' : ''}${Math.abs(variance.variance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      variance.variancePercent > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {variance.variancePercent > 0 ? '+' : ''}{variance.variancePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scope Variance Details */}
      {scopeVariances.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Scope Variance Analysis
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Planned</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actual</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Variance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">% Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {scopeVariances.map((variance, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{variance.period}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{variance.planned}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{variance.actual}</td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      variance.variance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {variance.variance > 0 ? '+' : ''}{variance.variance}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      variance.variancePercent > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {variance.variancePercent > 0 ? '+' : ''}{variance.variancePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

