import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, TrendingUp, DollarSign, Target, AlertTriangle } from 'lucide-react';
import { getBenefits, getBenefitsDashboardStats, getBenefitsVsCosts } from '../services/benefitsService';
import BenefitsRealizationChart from '../components/benefits/BenefitsRealizationChart';

export default function BenefitsRealization() {
  const navigate = useNavigate();
  const [benefits, setBenefits] = useState([]);
  const [stats, setStats] = useState(null);
  const [costsAnalysis, setCostsAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    portfolio_id: '',
    programme_id: '',
    project_id: '',
    benefit_category: '',
    benefit_status: '',
    search: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [benefitsData, statsData, costsData] = await Promise.all([
        getBenefits(filters),
        getBenefitsDashboardStats(filters),
        getBenefitsVsCosts(filters),
      ]);
      setBenefits(benefitsData || []);
      setStats(statsData);
      setCostsAnalysis(costsData);
    } catch (error) {
      console.error('Error fetching benefits realization data:', error);
      alert('Error loading benefits realization: ' + error.message);
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

  const realizedBenefits = benefits.filter(b => b.benefit_status === 'realized');
  const inProgressBenefits = benefits.filter(b => b.benefit_status === 'in_progress' || b.benefit_status === 'partially_realized');
  const plannedBenefits = benefits.filter(b => b.benefit_status === 'planned' || b.benefit_status === 'identified');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/benefits')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              Benefits Realization Report
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              View benefits realization progress and analysis
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Realization Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {Math.round(stats.realizationPercentage || 0)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Realized Benefits</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.realized || 0} / {stats.total || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
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
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Benefits vs Costs Analysis */}
      {costsAnalysis && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Benefits vs Costs Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                ${(costsAnalysis.totalBenefits || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Total Benefits
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${(costsAnalysis.realizedBenefits || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Realized Benefits
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                ${(costsAnalysis.totalCosts || 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Total Costs
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {costsAnalysis.roi ? `${Math.round(costsAnalysis.roi)}%` : 'N/A'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                ROI
              </div>
            </div>
          </div>
          {costsAnalysis.netBenefits !== undefined && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Net Benefits:
                </span>
                <span className={`text-lg font-bold ${
                  costsAnalysis.netBenefits >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  ${costsAnalysis.netBenefits.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Benefits Realization Chart */}
      <div className="mb-6">
        <BenefitsRealizationChart benefits={benefits} />
      </div>

      {/* Benefits by Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Realized Benefits */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              Realized Benefits
            </h3>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              {realizedBenefits.length}
            </span>
          </div>
          <div className="space-y-3">
            {realizedBenefits.slice(0, 5).map((benefit, index) => (
              <div key={benefit.id} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {benefit.benefit_name}
                </div>
                {benefit.realized_value_currency && (
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ${parseFloat(benefit.realized_value_currency).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
            {realizedBenefits.length > 5 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                + {realizedBenefits.length - 5} more realized benefits
              </p>
            )}
          </div>
        </div>

        {/* In Progress Benefits */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              In Progress
            </h3>
            <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {inProgressBenefits.length}
            </span>
          </div>
          <div className="space-y-3">
            {inProgressBenefits.slice(0, 5).map((benefit, index) => (
              <div key={benefit.id} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {benefit.benefit_name}
                </div>
                {benefit.current_value && benefit.target_value && (
                  <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    {Math.round((benefit.current_value / benefit.target_value) * 100)}% complete
                  </div>
                )}
              </div>
            ))}
            {inProgressBenefits.length > 5 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                + {inProgressBenefits.length - 5} more in progress
              </p>
            )}
          </div>
        </div>

        {/* Planned Benefits */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Planned
            </h3>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {plannedBenefits.length}
            </span>
          </div>
          <div className="space-y-3">
            {plannedBenefits.slice(0, 5).map((benefit, index) => (
              <div key={benefit.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {benefit.benefit_name}
                </div>
                {benefit.expected_realization_date && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Expected: {new Date(benefit.expected_realization_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
            {plannedBenefits.length > 5 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                + {plannedBenefits.length - 5} more planned
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

