/**
 * Budget Burn Rate Chart Component
 *
 * Displays budget burn rate across projects
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import { useEffect, useState, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingDown } from 'lucide-react';
import { getBudgetBurnRate } from '../../../services/dashboardService';

const BudgetBurnRate = memo(function BudgetBurnRate({ organizationId, projectId = null }) {
  const [burnRateData, setBurnRateData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBurnRateData();
  }, [organizationId, projectId]);

  const loadBurnRateData = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    const result = await getBudgetBurnRate(organizationId, projectId);

    if (result.success) {
      setBurnRateData(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Budget Burn Rate</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Budget Burn Rate</h3>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
          Error loading budget burn rate: {error}
        </div>
      </div>
    );
  }

  if (!burnRateData || burnRateData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Budget Burn Rate</h3>
        <div className="h-80 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No budget data available</p>
          </div>
        </div>
      </div>
    );
  }

  // Format data for chart
  const chartData = burnRateData.slice(0, 10).map(project => ({
    name: project.name.length > 15 ? project.name.substring(0, 15) + '...' : project.name,
    Budget: project.budget,
    'Planned Spend': project.plannedSpend,
    'Actual Spend': project.actualSpend,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const project = burnRateData.find(p =>
        (p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name) === label
      );

      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg">
          <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">{project?.name || label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-400">Budget: ${payload[0]?.value.toLocaleString()}</p>
            <p className="text-yellow-400">Planned: ${payload[1]?.value.toLocaleString()}</p>
            <p className="text-green-400">Actual: ${payload[2]?.value.toLocaleString()}</p>
            {project && (
              <p className={`font-semibold ${project.variance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                Variance: ${Math.abs(project.variance).toLocaleString()}
                {project.variance >= 0 ? ' over' : ' under'}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate totals
  const totalBudget = burnRateData.reduce((sum, p) => sum + p.budget, 0);
  const totalActual = burnRateData.reduce((sum, p) => sum + p.actualSpend, 0);
  const totalVariance = totalActual - totalBudget;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          Budget Burn Rate
        </h3>
        <div className="text-right">
          <div className="text-sm text-gray-400">Total Budget</div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">${totalBudget.toLocaleString()}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="name"
            stroke="#9ca3af"
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            stroke="#9ca3af"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="Budget" fill="#3b82f6" />
          <Bar dataKey="Planned Spend" fill="#f59e0b" />
          <Bar dataKey="Actual Spend" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <div className="text-xl font-bold text-blue-400">${totalBudget.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Total Budget</div>
        </div>
        <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-500/30">
          <div className="text-xl font-bold text-green-400">${totalActual.toLocaleString()}</div>
          <div className="text-xs text-gray-400 mt-1">Actual Spend</div>
        </div>
        <div className={`text-center p-3 rounded-lg border ${
          totalVariance >= 0
            ? 'bg-red-900/20 border-red-500/30'
            : 'bg-green-900/20 border-green-500/30'
        }`}>
          <div className={`text-xl font-bold ${totalVariance >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            ${Math.abs(totalVariance).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {totalVariance >= 0 ? 'Over Budget' : 'Under Budget'}
          </div>
        </div>
      </div>
    </div>
  );
});

BudgetBurnRate.displayName = 'BudgetBurnRate';

export default BudgetBurnRate;
