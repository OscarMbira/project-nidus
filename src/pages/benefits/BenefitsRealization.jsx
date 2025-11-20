import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, CheckCircle, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { getBenefits, getBenefitsDashboardStats, getBenefitsVsCosts } from '../../services/benefitsService';
import BenefitsRealizationChart from '../../components/benefits/BenefitsRealizationChart';
import { getBenefitMeasurements } from '../../services/benefitsService';

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
    benefit_status: '',
  });
  const [measurements, setMeasurements] = useState([]);

  useEffect(() => {
    fetchData();
  }, [filters]);

  useEffect(() => {
    if (benefits.length > 0) {
      fetchAllMeasurements();
    }
  }, [benefits]);

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

  const fetchAllMeasurements = async () => {
    try {
      const allMeasurements = [];
      for (const benefit of benefits) {
        try {
          const measurementsData = await getBenefitMeasurements(benefit.id);
          if (measurementsData) {
            allMeasurements.push(...measurementsData);
          }
        } catch (error) {
          console.warn(`Error fetching measurements for benefit ${benefit.id}:`, error);
        }
      }
      setMeasurements(allMeasurements);
    } catch (error) {
      console.error('Error fetching measurements:', error);
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
              Benefits Realization
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              View and analyze benefits realization progress
            </p>
          </div>
        </div>
      </div>

      {/* Realization Chart */}
      {benefits.length > 0 && (
        <div className="mb-6">
          <BenefitsRealizationChart benefits={benefits} measurements={measurements} />
        </div>
      )}

      {/* Benefits vs Costs Analysis */}
      {costsAnalysis && costsAnalysis.totalBenefits > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              Benefits vs Costs Analysis
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ${(costsAnalysis.totalBenefits || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Benefits
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${(costsAnalysis.realizedBenefits || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Realized Benefits
              </div>
            </div>

            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                ${(costsAnalysis.totalCosts || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Costs
              </div>
            </div>

            <div className={`text-center p-4 rounded-lg ${
              costsAnalysis.netBenefits >= 0
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className={`text-2xl font-bold ${
                costsAnalysis.netBenefits >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                ${(costsAnalysis.netBenefits || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Net Benefits
              </div>
              {costsAnalysis.roi !== 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ROI: {Math.round(costsAnalysis.roi)}%
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Realized Benefits List */}
      {benefits.filter(b => b.benefit_status === 'realized' || b.benefit_status === 'partially_realized').length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Realized Benefits
          </h2>
          <div className="space-y-3">
            {benefits
              .filter(b => b.benefit_status === 'realized' || b.benefit_status === 'partially_realized')
              .map((benefit) => {
                const realizationPercentage = benefit.target_value && benefit.target_value > 0
                  ? ((benefit.realized_value || benefit.current_value || 0) / benefit.target_value) * 100
                  : 0;

                return (
                  <div
                    key={benefit.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {benefit.benefit_name}
                        </h3>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {benefit.benefit_category} • {benefit.benefit_type}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        benefit.benefit_status === 'realized'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {benefit.benefit_status?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-4 text-sm">
                        {benefit.estimated_value && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Estimated: </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {benefit.value_currency || 'USD'} {parseFloat(benefit.estimated_value).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {benefit.realized_value_currency && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Realized: </span>
                            <span className="font-medium text-green-600 dark:text-green-400">
                              {benefit.value_currency || 'USD'} {parseFloat(benefit.realized_value_currency).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-green-500 transition-all"
                            style={{ width: `${Math.min(100, realizationPercentage)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[3rem]">
                          {Math.round(realizationPercentage)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

