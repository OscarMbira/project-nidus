import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, AlertTriangle, Calendar, Target, Plus, Search } from 'lucide-react';
import { getResourceForecasts, saveResourceForecast, deleteResourceForecast } from '../services/crossResourceService';
import ResourceForecastList from '../components/resources/ResourceForecastList';
import ResourceForecastForm from '../components/resources/ResourceForecastForm';

export default function ResourceForecasts() {
  const navigate = useNavigate();
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForecastForm, setShowForecastForm] = useState(false);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [filters, setFilters] = useState({
    portfolio_id: '',
    programme_id: '',
    resource_category: '',
    resource_type: '',
    search: '',
  });

  useEffect(() => {
    fetchForecasts();
  }, [filters]);

  const fetchForecasts = async () => {
    try {
      setLoading(true);
      const data = await getResourceForecasts(filters);
      setForecasts(data || []);
    } catch (error) {
      console.error('Error fetching resource forecasts:', error);
      alert('Error loading forecasts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForecast = () => {
    setSelectedForecast(null);
    setShowForecastForm(true);
  };

  const handleEditForecast = (forecast) => {
    setSelectedForecast(forecast);
    setShowForecastForm(true);
  };

  const handleForecastSaved = () => {
    setShowForecastForm(false);
    setSelectedForecast(null);
    fetchForecasts();
  };

  const stats = {
    total: forecasts.length,
    withGaps: forecasts.filter(f => f.demand_supply_gap_count > 0).length,
    byCategory: forecasts.reduce((acc, f) => {
      const cat = f.resource_category || 'Unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {}),
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
              Resource Forecasts
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Forecast resource demand and plan capacity across projects, portfolios, and programmes
            </p>
          </div>
          <button
            onClick={handleCreateForecast}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Forecast
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Forecasts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">With Demand Gaps</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.withGaps}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Requiring attention
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No Gaps</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.total - stats.withGaps}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Balanced supply/demand
              </p>
            </div>
            <Target className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search forecasts..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.resource_category || ''}
            onChange={(e) => setFilters({ ...filters, resource_category: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Categories</option>
            <option value="developer">Developer</option>
            <option value="designer">Designer</option>
            <option value="manager">Manager</option>
            <option value="analyst">Analyst</option>
            <option value="tester">Tester</option>
          </select>
          <select
            value={filters.resource_type || ''}
            onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="human">Human</option>
            <option value="equipment">Equipment</option>
            <option value="facility">Facility</option>
          </select>
        </div>
      </div>

      {/* Forecasts List */}
      <ResourceForecastList
        forecasts={forecasts}
        onEdit={handleEditForecast}
        onRefresh={fetchForecasts}
      />

      {/* Forecast Form Modal */}
      {showForecastForm && (
        <ResourceForecastForm
          forecast={selectedForecast}
          onSave={handleForecastSaved}
          onCancel={() => {
            setShowForecastForm(false);
            setSelectedForecast(null);
          }}
        />
      )}
    </div>
  );
}

