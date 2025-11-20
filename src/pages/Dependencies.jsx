import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, AlertTriangle, CheckCircle, Target, TrendingUp, FolderKanban, Search, Plus, Network } from 'lucide-react';
import { getInterProjectDependencies, getDependencyDashboardStats } from '../services/dependencyService';
import DependencyList from '../components/dependencies/DependencyList';
import DependencyForm from '../components/dependencies/DependencyForm';

export default function Dependencies() {
  const navigate = useNavigate();
  const [dependencies, setDependencies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDependencyForm, setShowDependencyForm] = useState(false);
  const [selectedDependency, setSelectedDependency] = useState(null);
  const [filters, setFilters] = useState({
    source_project_id: '',
    target_project_id: '',
    portfolio_id: '',
    programme_id: '',
    dependency_type: '',
    dependency_status: '',
    dependency_criticality: '',
    is_critical_path: '',
    search: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [depsData, statsData] = await Promise.all([
        getInterProjectDependencies(filters),
        getDependencyDashboardStats(filters),
      ]);
      setDependencies(depsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching dependency data:', error);
      alert('Error loading dependencies: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDependency = () => {
    setSelectedDependency(null);
    setShowDependencyForm(true);
  };

  const handleEditDependency = (dependency) => {
    setSelectedDependency(dependency);
    setShowDependencyForm(true);
  };

  const handleDependencySaved = () => {
    setShowDependencyForm(false);
    setSelectedDependency(null);
    fetchData();
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Network className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Inter-Project Dependencies
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dependencies/map')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <Network className="h-4 w-4" />
              Dependency Map
            </button>
            <button
              onClick={handleCreateDependency}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Dependency
            </button>
          </div>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage and track dependencies between projects across portfolios and programmes
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Dependencies</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total || 0}</p>
              </div>
              <Link2 className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.identified || 0} identified
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">At Risk</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.atRisk || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.blocked || 0} blocked
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.onCriticalPath || 0} on critical path
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resolved || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => navigate('/dependencies/map')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <Network className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Dependency Map</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Visualize dependency network</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/dependencies/impacts')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Impact Analysis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Analyze dependency impacts</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/programme')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Programme Dependencies</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">View programme dependencies</p>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search dependencies..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <select
              value={filters.dependency_status || ''}
              onChange={(e) => setFilters({ ...filters, dependency_status: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Status</option>
              <option value="identified">Identified</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="at_risk">At Risk</option>
              <option value="blocked">Blocked</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filters.dependency_type || ''}
              onChange={(e) => setFilters({ ...filters, dependency_type: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Types</option>
              <option value="finish-to-start">Finish-to-Start (FS)</option>
              <option value="start-to-start">Start-to-Start (SS)</option>
              <option value="finish-to-finish">Finish-to-Finish (FF)</option>
              <option value="start-to-finish">Start-to-Finish (SF)</option>
              <option value="logical">Logical</option>
              <option value="resource">Resource</option>
              <option value="benefit">Benefit</option>
              <option value="deliverable">Deliverable</option>
            </select>
            <select
              value={filters.dependency_criticality || ''}
              onChange={(e) => setFilters({ ...filters, dependency_criticality: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Criticality</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-center gap-4 flex-wrap border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="critical_path_only"
                checked={filters.is_critical_path === true}
                onChange={(e) => setFilters({ ...filters, is_critical_path: e.target.checked || '' })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="critical_path_only" className="text-sm text-gray-700 dark:text-gray-300">
                Show Critical Path Only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Dependencies List */}
      <DependencyList
        dependencies={dependencies}
        onEdit={handleEditDependency}
        onRefresh={fetchData}
      />

      {/* Dependency Form Modal */}
      {showDependencyForm && (
        <DependencyForm
          dependency={selectedDependency}
          onSave={handleDependencySaved}
          onCancel={() => {
            setShowDependencyForm(false);
            setSelectedDependency(null);
          }}
        />
      )}
    </div>
  );
}

