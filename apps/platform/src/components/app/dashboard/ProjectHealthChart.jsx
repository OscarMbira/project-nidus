/**
 * Project Health Chart Component
 *
 * Displays project health distribution using pie chart
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import { useEffect, useState, memo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Heart, TrendingUp } from 'lucide-react';
import { getProjectHealthData } from '../../../services/dashboardService';

const COLORS = {
  healthy: '#10b981', // green-500
  atRisk: '#f59e0b', // yellow-500
  critical: '#ef4444', // red-500
};

const ProjectHealthChart = memo(function ProjectHealthChart({ organizationId }) {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHealthData();
  }, [organizationId]);

  const loadHealthData = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    const result = await getProjectHealthData(organizationId);

    if (result.success) {
      setHealthData(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Health Distribution</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Health Distribution</h3>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
          Error loading project health data: {error}
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  const chartData = [
    { name: 'Healthy', value: healthData.distribution.healthy, color: COLORS.healthy },
    { name: 'At Risk', value: healthData.distribution.atRisk, color: COLORS.atRisk },
    { name: 'Critical', value: healthData.distribution.critical, color: COLORS.critical },
  ].filter(item => item.value > 0);

  const totalProjects = healthData.distribution.healthy + healthData.distribution.atRisk + healthData.distribution.critical;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-900 dark:text-gray-100 font-semibold">{payload[0].name}</p>
          <p className="text-gray-300">
            {payload[0].value} projects ({Math.round((payload[0].value / totalProjects) * 100)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          Project Health Distribution
        </h3>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalProjects} Projects</div>
      </div>

      {totalProjects === 0 ? (
        <div className="h-80 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Heart className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No active projects</p>
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-500/30">
              <div className="text-2xl font-bold text-green-400">{healthData.distribution.healthy}</div>
              <div className="text-xs text-gray-400 mt-1">Healthy</div>
            </div>
            <div className="text-center p-3 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
              <div className="text-2xl font-bold text-yellow-400">{healthData.distribution.atRisk}</div>
              <div className="text-xs text-gray-400 mt-1">At Risk</div>
            </div>
            <div className="text-center p-3 bg-red-900/20 rounded-lg border border-red-500/30">
              <div className="text-2xl font-bold text-red-400">{healthData.distribution.critical}</div>
              <div className="text-xs text-gray-400 mt-1">Critical</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

ProjectHealthChart.displayName = 'ProjectHealthChart';

export default ProjectHealthChart;
