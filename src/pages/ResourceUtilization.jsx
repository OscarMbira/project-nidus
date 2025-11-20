import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Calendar, Users, Activity, Search, Download } from 'lucide-react';
import { getCrossProjectUtilization, getResourceUtilizationSummary } from '../services/crossResourceService';
import ResourceUtilizationList from '../components/resources/ResourceUtilizationList';

export default function ResourceUtilization() {
  const navigate = useNavigate();
  const [utilization, setUtilization] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    resource_id: '',
    start_date: '',
    end_date: '',
    period_type: 'week',
    status: '',
    search: '',
  });
  const [selectedPeriod, setSelectedPeriod] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchUtilization();
  }, [filters, selectedPeriod]);

  const fetchUtilization = async () => {
    try {
      setLoading(true);
      const filterData = {
        ...filters,
        start_date: selectedPeriod.start || filters.start_date,
        end_date: selectedPeriod.end || filters.end_date,
      };
      const data = await getCrossProjectUtilization(filterData);
      setUtilization(data || []);
    } catch (error) {
      console.error('Error fetching utilization data:', error);
      alert('Error loading utilization: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: utilization.length,
    overUtilized: utilization.filter(u => u.utilization_status === 'over-utilized').length,
    underUtilized: utilization.filter(u => u.utilization_status === 'under-utilized').length,
    optimal: utilization.filter(u => u.utilization_status === 'optimal').length,
    overAllocated: utilization.filter(u => u.total_allocated_hours > u.total_capacity_hours).length,
    averageUtilization: utilization.length > 0
      ? utilization.reduce((sum, u) => sum + (u.actual_utilization_percentage || 0), 0) / utilization.length
      : 0,
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/resources/cross-project')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Resource Utilization
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Track resource utilization across multiple projects, portfolios, and programmes
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Periods</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Optimal</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.optimal}</p>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Over-Utilized</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overUtilized}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Under-Utilized</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.underUtilized}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Utilization</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Math.round(stats.averageUtilization)}%
              </p>
            </div>
            <Users className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date:</label>
            <input
              type="date"
              value={selectedPeriod.start}
              onChange={(e) => setSelectedPeriod({ ...selectedPeriod, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date:</label>
            <input
              type="date"
              value={selectedPeriod.end}
              onChange={(e) => setSelectedPeriod({ ...selectedPeriod, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.period_type}
            onChange={(e) => setFilters({ ...filters, period_type: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
          </select>
          {filters.status && (
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Status</option>
              <option value="under-utilized">Under-Utilized</option>
              <option value="optimal">Optimal</option>
              <option value="over-utilized">Over-Utilized</option>
              <option value="over-allocated">Over-Allocated</option>
            </select>
          )}
        </div>
      </div>

      {/* Utilization List */}
      <ResourceUtilizationList utilization={utilization} onRefresh={fetchUtilization} />
    </div>
  );
}

