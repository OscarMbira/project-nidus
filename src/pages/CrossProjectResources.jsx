import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, TrendingUp, Calendar, Target, Link2, Search } from 'lucide-react';
import { getCrossProjectResourceDashboardStats, getCrossProjectAllocations } from '../services/crossResourceService';
import CrossProjectAllocationList from '../components/resources/CrossProjectAllocationList';
import CrossProjectAllocationForm from '../components/resources/CrossProjectAllocationForm';

export default function CrossProjectResources() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [filters, setFilters] = useState({
    resource_id: '',
    project_id: '',
    portfolio_id: '',
    programme_id: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, allocationsData] = await Promise.all([
        getCrossProjectResourceDashboardStats(filters),
        getCrossProjectAllocations(filters),
      ]);
      setStats(statsData);
      setAllocations(allocationsData || []);
    } catch (error) {
      console.error('Error fetching cross-project resource data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAllocation = () => {
    setSelectedAllocation(null);
    setShowAllocationForm(true);
  };

  const handleEditAllocation = (allocation) => {
    setSelectedAllocation(allocation);
    setShowAllocationForm(true);
  };

  const handleAllocationSaved = () => {
    setShowAllocationForm(false);
    setSelectedAllocation(null);
    fetchDashboardData();
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
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Cross-Project Resource Management
          </h1>
          <button
            onClick={handleCreateAllocation}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Users className="h-5 w-5" />
            Allocate Resource
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Manage resource allocations across multiple projects, portfolios, and programmes
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Allocations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.allocations?.total || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.allocations?.active || 0} active
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Over Capacity</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.capacityPlans?.overCapacity || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.capacityPlans?.total || 0} total plans
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Demand Gaps</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.forecasts?.withGaps || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.forecasts?.total || 0} forecasts
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Optimal Utilization</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.utilization?.optimal || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.utilization?.overUtilized || 0} over, {stats.utilization?.underUtilized || 0} under
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Unresolved Conflicts</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.conflicts?.unresolved || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.conflicts?.critical || 0} critical
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => navigate('/resources/capacity')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Capacity Planning</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">View capacity plans</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/resources/conflicts')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Resource Conflicts</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Resolve conflicts</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/resources/forecast')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Resource Forecasts</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">View forecasts</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/resources/utilization')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <Link2 className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Utilization</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track utilization</p>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search allocations..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Status</option>
            <option value="planned">Planned</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Allocations List */}
      <CrossProjectAllocationList
        allocations={allocations}
        onEdit={handleEditAllocation}
        onRefresh={fetchDashboardData}
      />

      {/* Allocation Form Modal */}
      {showAllocationForm && (
        <CrossProjectAllocationForm
          allocation={selectedAllocation}
          onSave={handleAllocationSaved}
          onCancel={() => {
            setShowAllocationForm(false);
            setSelectedAllocation(null);
          }}
        />
      )}
    </div>
  );
}

