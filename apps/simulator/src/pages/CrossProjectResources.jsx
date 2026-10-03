import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, AlertTriangle, TrendingUp, Calendar, Target, Link2, Search } from 'lucide-react';
import DashboardStatCard from '../components/ui/DashboardStatCard';
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
      <button
        onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Cross-Project Resource Management
          </h1>
          {!showAllocationForm && (
            <button
              onClick={handleCreateAllocation}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Users className="h-5 w-5" />
              Allocate Resource
            </button>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Manage resource allocations across multiple projects, portfolios, and programmes
        </p>
      </div>

      {/* Stats Cards */}
      {!showAllocationForm && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <DashboardStatCard
            label="Total Allocations"
            value={stats.allocations?.total || 0}
            description={`${stats.allocations?.active || 0} active`}
            icon={Users}
            iconClassName="text-blue-500"
          />
          <DashboardStatCard
            label="Over Capacity"
            value={stats.capacityPlans?.overCapacity || 0}
            description={`${stats.capacityPlans?.total || 0} total plans`}
            icon={AlertTriangle}
            accentClassName="text-yellow-600 dark:text-yellow-400"
            iconClassName="text-yellow-500"
            borderClassName="border-yellow-200 dark:border-yellow-800"
          />
          <DashboardStatCard
            label="Demand Gaps"
            value={stats.forecasts?.withGaps || 0}
            description={`${stats.forecasts?.total || 0} forecasts`}
            icon={Target}
            accentClassName="text-orange-600 dark:text-orange-400"
            iconClassName="text-orange-500"
            borderClassName="border-orange-200 dark:border-orange-800"
          />
          <DashboardStatCard
            label="Optimal Utilization"
            value={stats.utilization?.optimal || 0}
            description={`${stats.utilization?.overUtilized || 0} over, ${stats.utilization?.underUtilized || 0} under`}
            icon={TrendingUp}
            accentClassName="text-green-600 dark:text-green-400"
            iconClassName="text-green-500"
            borderClassName="border-green-200 dark:border-green-800"
          />
          <DashboardStatCard
            label="Unresolved Conflicts"
            value={stats.conflicts?.unresolved || 0}
            description={`${stats.conflicts?.critical || 0} critical`}
            icon={AlertTriangle}
            accentClassName="text-red-600 dark:text-red-400"
            iconClassName="text-red-500"
            borderClassName="border-red-200 dark:border-red-800"
          />
        </div>
      )}

      {!showAllocationForm && (
      <>
      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => navigate('/simulator/resources/capacity')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Capacity Planning</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">View capacity plans</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/simulator/resources/conflicts')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Resource Conflicts</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Resolve conflicts</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/simulator/resources/plan')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Resource Forecasts</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">View forecasts</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/simulator/resources/utilization')}
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
      </>
      )}

      {/* Allocations List / Allocation Form — non-modal, in-page panel (rule 65) */}
      {showAllocationForm ? (
        <CrossProjectAllocationForm
          variant="page"
          backLabel="Cross-Project Resources"
          allocation={selectedAllocation}
          onSave={handleAllocationSaved}
          onCancel={() => {
            setShowAllocationForm(false);
            setSelectedAllocation(null);
          }}
        />
      ) : (
        <CrossProjectAllocationList
          allocations={allocations}
          onEdit={handleEditAllocation}
          onRefresh={fetchDashboardData}
        />
      )}
    </div>
  );
}

