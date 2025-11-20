import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Edit2, Trash2, TrendingUp, AlertTriangle, DollarSign, Users, Eye } from 'lucide-react';
import { deletePortfolio } from '../../services/portfolioService';

export default function PortfolioList({ portfolios, onRefresh }) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleDelete = async (portfolio) => {
    if (!window.confirm(`Are you sure you want to delete "${portfolio.portfolio_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(portfolio.id);
      await deletePortfolio(portfolio.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      alert('Error deleting portfolio: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'planning':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'strategic':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'operational':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'innovation':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'compliance':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const filteredPortfolios = portfolios.filter((portfolio) => {
    const matchesSearch = 
      portfolio.portfolio_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      portfolio.portfolio_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      portfolio.portfolio_description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || portfolio.portfolio_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (portfolios.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <FolderKanban className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Portfolios yet
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create your first portfolio to start managing multiple projects strategically
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search portfolios by name, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        {searchTerm || statusFilter !== 'all' ? (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredPortfolios.length} of {portfolios.length} portfolios
          </div>
        ) : null}
      </div>

      {/* Portfolio Cards */}
      {filteredPortfolios.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FolderKanban className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No portfolios match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPortfolios.map((portfolio) => (
            <div
              key={portfolio.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/portfolio/${portfolio.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {portfolio.portfolio_name}
                    </h3>
                  </div>
                  {portfolio.portfolio_code && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-2">
                      {portfolio.portfolio_code}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(portfolio.portfolio_status)}`}>
                      {portfolio.portfolio_status?.replace('-', ' ')}
                    </span>
                    {portfolio.portfolio_type && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(portfolio.portfolio_type)}`}>
                        {portfolio.portfolio_type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/portfolio/${portfolio.id}`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    title="View Portfolio"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/portfolio/${portfolio.id}/edit`)}
                    className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                    title="Edit Portfolio"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(portfolio)}
                    disabled={deleting === portfolio.id}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                    title="Delete Portfolio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Description */}
              {portfolio.portfolio_description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {portfolio.portfolio_description}
                </p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>Health</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (portfolio.overall_health_score || 0) >= 80
                            ? 'bg-green-600'
                            : (portfolio.overall_health_score || 0) >= 60
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.min(portfolio.overall_health_score || 0, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {Math.round(portfolio.overall_health_score || 0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <FolderKanban className="h-4 w-4" />
                    <span>Projects</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {portfolio.total_projects_count || 0}
                  </p>
                </div>
                {portfolio.total_budget && (
                  <div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <DollarSign className="h-4 w-4" />
                      <span>Budget</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ${(portfolio.total_budget || 0).toLocaleString()}
                    </p>
                  </div>
                )}
                {portfolio.portfolio_owner && (
                  <div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <Users className="h-4 w-4" />
                      <span>Owner</span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                      {portfolio.portfolio_owner.full_name || portfolio.portfolio_owner.email}
                    </p>
                  </div>
                )}
              </div>

              {/* Risks Alert */}
              {portfolio.high_risks_count > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{portfolio.high_risks_count} high/critical risks</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

