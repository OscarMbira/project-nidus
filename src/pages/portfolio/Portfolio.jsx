import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, TrendingUp, AlertTriangle, DollarSign, Search } from 'lucide-react';
import { getPortfolios } from '../../services/portfolioService';
import PortfolioList from '../../components/portfolio/PortfolioList';
import PortfolioForm from '../../components/portfolio/PortfolioForm';

export default function Portfolio() {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    owner_id: '',
    search: '',
  });

  useEffect(() => {
    fetchPortfolios();
  }, [filters]);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const data = await getPortfolios(filters);
      setPortfolios(data || []);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
      alert('Error loading portfolios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = () => {
    setSelectedPortfolio(null);
    setShowPortfolioForm(true);
  };

  const handleEditPortfolio = (portfolio) => {
    navigate(`/portfolio/${portfolio.id}/edit`);
  };

  const handlePortfolioSaved = () => {
    setShowPortfolioForm(false);
    setSelectedPortfolio(null);
    fetchPortfolios();
  };

  const stats = {
    total: portfolios.length,
    active: portfolios.filter(p => p.portfolio_status === 'active').length,
    planning: portfolios.filter(p => p.portfolio_status === 'planning').length,
    completed: portfolios.filter(p => p.portfolio_status === 'completed').length,
    totalProjects: portfolios.reduce((sum, p) => sum + (p.total_projects_count || 0), 0),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Portfolio Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage strategic portfolios and coordinate multiple projects
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Portfolios</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <FolderKanban className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Planning</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.planning}</p>
            </div>
            <FolderKanban className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Projects</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalProjects}</p>
            </div>
            <FolderKanban className="h-8 w-8 text-purple-500" />
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
              placeholder="Search portfolios..."
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
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filters.type || ''}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="strategic">Strategic</option>
            <option value="operational">Operational</option>
            <option value="innovation">Innovation</option>
            <option value="compliance">Compliance</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Portfolios ({stats.total})
        </h2>
        <button
          onClick={handleCreatePortfolio}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Portfolio
        </button>
      </div>

      {/* Portfolios List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading portfolios...</p>
          </div>
        </div>
      ) : (
        <PortfolioList
          portfolios={portfolios}
          onRefresh={fetchPortfolios}
        />
      )}

      {/* Portfolio Form Modal */}
      {showPortfolioForm && (
        <PortfolioForm
          portfolio={selectedPortfolio}
          onSave={handlePortfolioSaved}
          onCancel={() => {
            setShowPortfolioForm(false);
            setSelectedPortfolio(null);
          }}
        />
      )}
    </div>
  );
}

