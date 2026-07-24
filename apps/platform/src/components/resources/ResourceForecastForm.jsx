import { useState, useEffect } from 'react';
import { X, Save, TrendingUp, Target, Calendar } from 'lucide-react';
import { saveResourceForecast } from '../../services/crossResourceService';
import { supabase } from '../../services/supabaseClient';

export default function ResourceForecastForm({ forecast, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    portfolio_id: '',
    programme_id: '',
    forecast_scope: 'project',
    forecast_start_date: '',
    forecast_end_date: '',
    forecast_type: 'monthly',
    resource_category: '',
    resource_type: 'human',
    forecasted_demand_count: '',
    forecasted_demand_hours: '',
    forecasted_availability_count: '',
    forecasted_availability_hours: '',
    forecast_confidence_level: 'medium',
    forecast_confidence_percentage: 75,
    forecast_methodology: 'historical',
    forecast_notes: '',
  });

  const [portfolios, setPortfolios] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (forecast) {
      setFormData({
        portfolio_id: forecast.portfolio_id || '',
        programme_id: forecast.programme_id || '',
        forecast_scope: forecast.forecast_scope || 'project',
        forecast_start_date: forecast.forecast_start_date || '',
        forecast_end_date: forecast.forecast_end_date || '',
        forecast_type: forecast.forecast_type || 'monthly',
        resource_category: forecast.resource_category || '',
        resource_type: forecast.resource_type || 'human',
        forecasted_demand_count: forecast.forecasted_demand_count || '',
        forecasted_demand_hours: forecast.forecasted_demand_hours || '',
        forecasted_availability_count: forecast.forecasted_availability_count || '',
        forecasted_availability_hours: forecast.forecasted_availability_hours || '',
        forecast_confidence_level: forecast.forecast_confidence_level || 'medium',
        forecast_confidence_percentage: forecast.forecast_confidence_percentage || 75,
        forecast_methodology: forecast.forecast_methodology || 'historical',
        forecast_notes: forecast.forecast_notes || '',
      });
    }
    fetchLookupData();
  }, [forecast]);

  const fetchLookupData = async () => {
    try {
      // Fetch portfolios
      const { data: portfoliosData } = await supabase
        .from('portfolios')
        .select('id, portfolio_name, portfolio_code')
        .eq('is_deleted', false)
        .order('portfolio_name', { ascending: true });

      if (portfoliosData) setPortfolios(portfoliosData);

      // Fetch programmes
      const { data: programmesData } = await supabase
        .from('programmes')
        .select('id, programme_name, programme_code')
        .eq('is_deleted', false)
        .order('programme_name', { ascending: true });

      if (programmesData) setProgrammes(programmesData);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value ? parseFloat(value) : '') : value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = {
        ...formData,
        portfolio_id: formData.portfolio_id || null,
        programme_id: formData.programme_id || null,
        forecast_start_date: formData.forecast_start_date || null,
        forecast_end_date: formData.forecast_end_date || null,
        forecasted_demand_count: formData.forecasted_demand_count ? parseInt(formData.forecasted_demand_count) : null,
        forecasted_demand_hours: formData.forecasted_demand_hours ? parseFloat(formData.forecasted_demand_hours) : null,
        forecasted_availability_count: formData.forecasted_availability_count ? parseInt(formData.forecasted_availability_count) : null,
        forecasted_availability_hours: formData.forecasted_availability_hours ? parseFloat(formData.forecasted_availability_hours) : null,
        forecast_confidence_percentage: formData.forecast_confidence_percentage ? parseFloat(formData.forecast_confidence_percentage) : null,
      };

      await saveResourceForecast(submitData, forecast?.id);
      onSave();
    } catch (error) {
      console.error('Error saving forecast:', error);
      alert('Error saving forecast: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {forecast ? 'Edit Resource Forecast' : 'Create Resource Forecast'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Forecast Context */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Forecast Context
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scope
                </label>
                <select
                  name="forecast_scope"
                  value={formData.forecast_scope}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="project">Project</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="programme">Programme</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Portfolio (optional)
                </label>
                <select
                  name="portfolio_id"
                  value={formData.portfolio_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {portfolios.map(portfolio => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.portfolio_name} {portfolio.portfolio_code ? `(${portfolio.portfolio_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Programme (optional)
                </label>
                <select
                  name="programme_id"
                  value={formData.programme_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {programmes.map(programme => (
                    <option key={programme.id} value={programme.id}>
                      {programme.programme_name} {programme.programme_code ? `(${programme.programme_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Forecast Period */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Forecast Period
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="forecast_start_date"
                  value={formData.forecast_start_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  name="forecast_end_date"
                  value={formData.forecast_end_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Forecast Type *
                </label>
                <select
                  name="forecast_type"
                  value={formData.forecast_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>
          </div>

          {/* Resource Type/Category */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Resource Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Resource Category
                </label>
                <input
                  type="text"
                  name="resource_category"
                  value={formData.resource_category}
                  onChange={handleChange}
                  placeholder="e.g., developer, designer, manager"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Resource Type *
                </label>
                <select
                  name="resource_type"
                  value={formData.resource_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="human">Human</option>
                  <option value="equipment">Equipment</option>
                  <option value="facility">Facility</option>
                </select>
              </div>
            </div>
          </div>

          {/* Demand Forecast */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Demand Forecast
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Demand Count
                </label>
                <input
                  type="number"
                  name="forecasted_demand_count"
                  value={formData.forecasted_demand_count}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Number of resources needed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Demand Hours
                </label>
                <input
                  type="number"
                  name="forecasted_demand_hours"
                  value={formData.forecasted_demand_hours}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Total hours needed"
                />
              </div>
            </div>
          </div>

          {/* Availability Forecast */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Availability Forecast
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Availability Count
                </label>
                <input
                  type="number"
                  name="forecasted_availability_count"
                  value={formData.forecasted_availability_count}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Number of resources available"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Availability Hours
                </label>
                <input
                  type="number"
                  name="forecasted_availability_hours"
                  value={formData.forecasted_availability_hours}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Total hours available"
                />
              </div>
            </div>
          </div>

          {/* Forecast Confidence */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Forecast Confidence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confidence Level
                </label>
                <select
                  name="forecast_confidence_level"
                  value={formData.forecast_confidence_level}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confidence Percentage
                </label>
                <input
                  type="number"
                  name="forecast_confidence_percentage"
                  value={formData.forecast_confidence_percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Forecast Methodology
                </label>
                <select
                  name="forecast_methodology"
                  value={formData.forecast_methodology}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="historical">Historical Data</option>
                  <option value="trend">Trend Analysis</option>
                  <option value="expert_judgment">Expert Judgment</option>
                  <option value="machine_learning">Machine Learning</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Notes
            </h3>
            <div>
              <textarea
                name="forecast_notes"
                value={formData.forecast_notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes about this forecast..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : forecast ? 'Update Forecast' : 'Create Forecast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

