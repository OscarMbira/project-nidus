import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Settings, FolderKanban, Users, Target, DollarSign, AlertTriangle, Activity } from 'lucide-react';
import { getPortfolio } from '../../services/portfolioService';
import PortfolioDashboard from '../../components/portfolio/PortfolioDashboard';

export default function PortfolioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'projects', 'resources', 'financial', 'risks', 'reports'

  useEffect(() => {
    if (id) {
      fetchPortfolio();
    }
  }, [id]);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPortfolio(id);
      setPortfolio(data);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading portfolio...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error loading portfolio: {error}</span>
          </div>
          <button
            onClick={() => navigate('/portfolio')}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
          >
            Back to Portfolios
          </button>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'resources', label: 'Resources', icon: Users },
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'risks', label: 'Risks', icon: AlertTriangle },
    { id: 'objectives', label: 'Objectives', icon: Target },
    { id: 'reports', label: 'Reports', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/portfolio')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <FolderKanban className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {portfolio.portfolio_name}
                </h1>
                {portfolio.portfolio_code && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Code: {portfolio.portfolio_code}
                  </p>
                )}
              </div>
            </div>
            {portfolio.portfolio_description && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {portfolio.portfolio_description}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate(`/portfolio/${id}/edit`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'dashboard' && (
          <PortfolioDashboard portfolioId={id} />
        )}
        {activeTab === 'projects' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Portfolio Projects
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Projects view coming soon...
            </p>
          </div>
        )}
        {activeTab === 'resources' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Portfolio Resources
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Resources view coming soon...
            </p>
          </div>
        )}
        {activeTab === 'financial' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Financial Overview
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Financial view coming soon...
            </p>
          </div>
        )}
        {activeTab === 'risks' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Portfolio Risks
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Risks view coming soon...
            </p>
          </div>
        )}
        {activeTab === 'objectives' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Strategic Objectives
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Objectives view coming soon...
            </p>
          </div>
        )}
        {activeTab === 'reports' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Portfolio Reports
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Reports view coming soon...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

