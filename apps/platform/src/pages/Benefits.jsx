import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, Search, TrendingUp, CheckCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { getBenefits, getBenefitsDashboardStats } from '../services/benefitsService';
import BenefitsRegister from '../components/benefits/BenefitsRegister';
import BenefitForm from '../components/benefits/BenefitForm';

export default function Benefits() {
  const navigate = useNavigate();
  const [benefits, setBenefits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBenefitForm, setShowBenefitForm] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState(null);
  const [filters, setFilters] = useState({
    portfolio_id: '',
    programme_id: '',
    project_id: '',
    benefit_category: '',
    benefit_type: '',
    benefit_status: '',
    search: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [benefitsData, statsData] = await Promise.all([
        getBenefits(filters),
        getBenefitsDashboardStats(filters),
      ]);
      setBenefits(benefitsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching benefits data:', error);
      alert('Error loading benefits: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBenefit = () => {
    setSelectedBenefit(null);
    setShowBenefitForm(true);
  };

  const handleEditBenefit = (benefit) => {
    setSelectedBenefit(benefit);
    setShowBenefitForm(true);
  };

  const handleBenefitSaved = () => {
    setShowBenefitForm(false);
    setSelectedBenefit(null);
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
            <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Benefits Realization
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/benefits/measurements')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <TrendingUp className="h-4 w-4" />
              Measurements
            </button>
            <button
              onClick={() => navigate('/benefits/realization')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <CheckCircle className="h-4 w-4" />
              Realization
            </button>
            <button
              onClick={handleCreateBenefit}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Benefit
            </button>
          </div>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Track and measure benefits delivery from portfolios, programmes, and projects
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Benefits</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total || 0}</p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Realized</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.realized || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {Math.round(stats.realizationPercentage || 0)}% realized
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.inProgress || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.partiallyRealized || 0} partially
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Estimated Value</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  ${(stats.totalEstimatedValue || 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Realized Value</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${(stats.totalRealizedValue || 0).toLocaleString()}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => navigate('/benefits/register')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Benefits Register</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">View all registered benefits</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/benefits/measurements')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Measurements</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track benefit measurements</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/benefits/realization')}
          className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left"
        >
          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Realization Report</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">View benefits realization</p>
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
                placeholder="Search benefits..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <select
              value={filters.benefit_category || ''}
              onChange={(e) => setFilters({ ...filters, benefit_category: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Categories</option>
              <option value="financial">Financial</option>
              <option value="operational">Operational</option>
              <option value="strategic">Strategic</option>
              <option value="compliance">Compliance</option>
              <option value="customer">Customer</option>
              <option value="employee">Employee</option>
            </select>
            <select
              value={filters.benefit_status || ''}
              onChange={(e) => setFilters({ ...filters, benefit_status: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Status</option>
              <option value="identified">Identified</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="partially_realized">Partially Realized</option>
              <option value="realized">Realized</option>
              <option value="lost">Lost</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filters.benefit_type || ''}
              onChange={(e) => setFilters({ ...filters, benefit_type: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Types</option>
              <option value="quantifiable">Quantifiable</option>
              <option value="qualitative">Qualitative</option>
              <option value="intangible">Intangible</option>
            </select>
          </div>
        </div>
      </div>

      {/* Benefits Register */}
      <BenefitsRegister
        benefits={benefits}
        onEdit={handleEditBenefit}
        onRefresh={fetchData}
      />

      {/* Benefit Form Modal */}
      {showBenefitForm && (
        <BenefitForm
          benefit={selectedBenefit}
          onSave={handleBenefitSaved}
          onCancel={() => {
            setShowBenefitForm(false);
            setSelectedBenefit(null);
          }}
        />
      )}
    </div>
  );
}

