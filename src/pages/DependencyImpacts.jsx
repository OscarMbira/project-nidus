import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, TrendingDown, Search, Filter } from 'lucide-react';
import { getDependencyImpacts } from '../services/dependencyService';

export default function DependencyImpacts() {
  const navigate = useNavigate();
  const [impacts, setImpacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dependency_id: '',
    impact_type: '',
    impact_severity: '',
    impact_status: '',
    search: '',
  });

  useEffect(() => {
    fetchImpacts();
  }, [filters]);

  const fetchImpacts = async () => {
    try {
      setLoading(true);
      const data = await getDependencyImpacts(filters.dependency_id ? filters.dependency_id : null, filters);
      setImpacts(data || []);
    } catch (error) {
      console.error('Error fetching dependency impacts:', error);
      alert('Error loading impacts: ' + error.message);
    } finally {
      setLoading(false);
    }
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

  const stats = {
    total: impacts.length,
    potential: impacts.filter(i => i.impact_status === 'potential').length,
    realized: impacts.filter(i => i.impact_status === 'realized').length,
    mitigated: impacts.filter(i => i.impact_status === 'mitigated').length,
    critical: impacts.filter(i => i.impact_severity === 'critical').length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/dependencies')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingDown className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              Dependency Impact Analysis
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Analyze and track the impacts of inter-project dependencies
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Impacts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-gray-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Potential</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.potential}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Realized</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.realized}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mitigated</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.mitigated}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
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
              placeholder="Search impacts..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.impact_type || ''}
            onChange={(e) => setFilters({ ...filters, impact_type: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="schedule">Schedule</option>
            <option value="cost">Cost</option>
            <option value="resource">Resource</option>
            <option value="quality">Quality</option>
            <option value="scope">Scope</option>
            <option value="risk">Risk</option>
          </select>
          <select
            value={filters.impact_severity || ''}
            onChange={(e) => setFilters({ ...filters, impact_severity: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filters.impact_status || ''}
            onChange={(e) => setFilters({ ...filters, impact_status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Status</option>
            <option value="potential">Potential</option>
            <option value="realized">Realized</option>
            <option value="mitigated">Mitigated</option>
            <option value="avoided">Avoided</option>
          </select>
        </div>
      </div>

      {/* Impacts List */}
      {impacts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Dependency Impacts yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Impact analysis records will appear here when impacts are assessed for dependencies
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {impacts.map((impact) => (
            <div
              key={impact.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {impact.dependency?.dependency_name || 'Unknown Dependency'}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      impact.impact_severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                      impact.impact_severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                      impact.impact_severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {impact.impact_severity}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {impact.impact_type}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {impact.impact_description}
                  </p>
                  {impact.schedule_impact_days && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Schedule Impact: {impact.schedule_impact_days} days
                    </div>
                  )}
                  {impact.cost_impact_amount && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Cost Impact: {impact.cost_impact_currency || 'USD'} {impact.cost_impact_amount.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

