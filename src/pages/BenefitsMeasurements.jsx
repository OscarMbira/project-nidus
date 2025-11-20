import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Plus, Search, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { getBenefits, getBenefitMeasurements } from '../services/benefitsService';
import { supabase } from '../services/supabaseClient';

export default function BenefitsMeasurements() {
  const navigate = useNavigate();
  const [benefits, setBenefits] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBenefitId, setSelectedBenefitId] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    measurement_type: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchBenefits();
  }, []);

  useEffect(() => {
    if (selectedBenefitId) {
      fetchMeasurements();
    }
  }, [selectedBenefitId, filters]);

  const fetchBenefits = async () => {
    try {
      const data = await getBenefits();
      setBenefits(data || []);
    } catch (error) {
      console.error('Error fetching benefits:', error);
    }
  };

  const fetchMeasurements = async () => {
    if (!selectedBenefitId) return;
    
    try {
      setLoading(true);
      const data = await getBenefitMeasurements(selectedBenefitId, filters);
      setMeasurements(data || []);
    } catch (error) {
      console.error('Error fetching measurements:', error);
      alert('Error loading measurements: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedBenefit = benefits.find(b => b.id === selectedBenefitId);

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
              <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              Benefit Measurements
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Track and record benefit measurements over time
            </p>
          </div>
        </div>
      </div>

      {/* Benefit Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Benefit:
          </label>
          <select
            value={selectedBenefitId}
            onChange={(e) => setSelectedBenefitId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[300px]"
          >
            <option value="">Select a benefit...</option>
            {benefits.map(benefit => (
              <option key={benefit.id} value={benefit.id}>
                {benefit.benefit_name} {benefit.benefit_code ? `(${benefit.benefit_code})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedBenefitId && (
        <>
          {/* Selected Benefit Info */}
          {selectedBenefit && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedBenefit.benefit_name}
                  </h3>
                  {selectedBenefit.benefit_code && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Code: {selectedBenefit.benefit_code}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Target: {selectedBenefit.target_value || 'N/A'} {selectedBenefit.measurement_unit || ''}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Current: {selectedBenefit.current_value || 'N/A'} {selectedBenefit.measurement_unit || ''}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedBenefit.target_value && selectedBenefit.target_value > 0
                      ? Math.round(((selectedBenefit.current_value || 0) / selectedBenefit.target_value) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Realization</div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search measurements..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <select
                value={filters.measurement_type || ''}
                onChange={(e) => setFilters({ ...filters, measurement_type: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Types</option>
                <option value="actual">Actual</option>
                <option value="forecast">Forecast</option>
                <option value="planned">Planned</option>
                <option value="baseline">Baseline</option>
              </select>
              <input
                type="date"
                placeholder="Start Date"
                value={filters.start_date || ''}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <input
                type="date"
                placeholder="End Date"
                value={filters.end_date || ''}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Measurements List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : measurements.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Measurements yet
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Create your first measurement to start tracking this benefit
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quality
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Verified
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {measurements.map((measurement) => (
                      <tr key={measurement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {measurement.measurement_date && new Date(measurement.measurement_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {parseFloat(measurement.measurement_value || 0).toLocaleString()} {measurement.measurement_unit || ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                            {measurement.measurement_type || 'actual'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                            measurement.data_quality === 'excellent' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            measurement.data_quality === 'good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            measurement.data_quality === 'fair' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            measurement.data_quality === 'poor' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {measurement.data_quality || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {measurement.verified ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {measurement.verified_date && new Date(measurement.verified_date).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!selectedBenefitId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Select a Benefit
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Please select a benefit from the dropdown above to view its measurements
          </p>
        </div>
      )}
    </div>
  );
}

