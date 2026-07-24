/**
 * Resource Allocation Chart Component
 *
 * Displays resource allocation across projects
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import { useEffect, useState, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Users, AlertTriangle } from 'lucide-react';
import { getResourceAllocationData } from '../../../services/dashboardService';

const ResourceAllocationChart = memo(function ResourceAllocationChart({ organizationId, filterProjectIds = null }) {
  const [allocationData, setAllocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filterKey = filterProjectIds?.length ? filterProjectIds.join(',') : '';

  useEffect(() => {
    loadAllocationData();
  }, [organizationId, filterKey]);

  const loadAllocationData = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    const opts =
      Array.isArray(filterProjectIds) && filterProjectIds.length
        ? { projectIds: filterProjectIds }
        : {};
    const result = await getResourceAllocationData(organizationId, opts);

    if (result.success) {
      setAllocationData(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Resource Allocation</h3>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Resource Allocation</h3>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
          Error loading resource allocation: {error}
        </div>
      </div>
    );
  }

  if (!allocationData || allocationData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Resource Allocation</h3>
        <div className="h-80 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No resource allocation data</p>
          </div>
        </div>
      </div>
    );
  }

  // Format data for chart - show top 10 resources
  const chartData = allocationData
    .sort((a, b) => b.totalAllocation - a.totalAllocation)
    .slice(0, 10)
    .map(resource => ({
      name: resource.name.length > 20 ? resource.name.substring(0, 20) + '...' : resource.name,
      allocation: resource.totalAllocation,
      projects: resource.projects.length,
    }));

  // Get color based on allocation level
  const getBarColor = (allocation) => {
    if (allocation > 100) return '#ef4444'; // red - over-allocated
    if (allocation >= 80) return '#f59e0b'; // yellow - high allocation
    if (allocation >= 50) return '#10b981'; // green - optimal
    return '#6b7280'; // gray - under-utilized
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const resource = allocationData.find(r =>
        (r.name.length > 20 ? r.name.substring(0, 20) + '...' : r.name) === label
      );

      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg max-w-xs">
          <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">{resource?.name || label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-300">
              Total Allocation: <span className="font-semibold">{payload[0]?.value}%</span>
            </p>
            <p className="text-gray-300">
              Projects: <span className="font-semibold">{payload[1]?.value}</span>
            </p>
            {resource && resource.projects.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <p className="text-gray-400 text-xs mb-1">Project Allocations:</p>
                {resource.projects.map((project, idx) => (
                  <p key={idx} className="text-gray-300 text-xs">
                    • {project.projectName}: {project.allocation}%
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate statistics
  const overAllocated = allocationData.filter(r => r.totalAllocation > 100).length;
  const optimallyAllocated = allocationData.filter(r => r.totalAllocation >= 50 && r.totalAllocation <= 100).length;
  const underUtilized = allocationData.filter(r => r.totalAllocation < 50).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Resource Allocation
        </h3>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{allocationData.length} Resources</div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-red-900/20 rounded-lg border border-red-500/30">
          <div className="text-2xl font-bold text-red-400">{overAllocated}</div>
          <div className="text-xs text-gray-400 mt-1">Over-allocated (&gt;100%)</div>
        </div>
        <div className="text-center p-3 bg-green-900/20 rounded-lg border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{optimallyAllocated}</div>
          <div className="text-xs text-gray-400 mt-1">Optimal (50-100%)</div>
        </div>
        <div className="text-center p-3 bg-gray-700/50 rounded-lg border border-gray-600">
          <div className="text-2xl font-bold text-gray-400">{underUtilized}</div>
          <div className="text-xs text-gray-400 mt-1">Under-utilized (&lt;50%)</div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="name"
            stroke="#9ca3af"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#9ca3af"
            label={{ value: 'Allocation %', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="allocation" name="Total Allocation (%)">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.allocation)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Over-allocated Warning */}
      {overAllocated > 0 && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">
            <p className="font-semibold">Over-allocation detected!</p>
            <p className="text-xs mt-1">
              {overAllocated} team member{overAllocated > 1 ? 's are' : ' is'} allocated to more than 100% capacity.
              Consider redistributing workload.
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-gray-400">Over-allocated (&gt;100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500"></div>
          <span className="text-gray-400">High (80-100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-gray-400">Optimal (50-80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-500"></div>
          <span className="text-gray-400">Under-utilized (&lt;50%)</span>
        </div>
      </div>
    </div>
  );
});

ResourceAllocationChart.displayName = 'ResourceAllocationChart';

export default ResourceAllocationChart;
