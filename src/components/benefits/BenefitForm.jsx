import { useState, useEffect } from 'react';
import { X, Save, Target, DollarSign, Calendar } from 'lucide-react';
import { saveBenefit } from '../../services/benefitsService';
import { supabase } from '../../services/supabaseClient';

export default function BenefitForm({ benefit, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    benefit_code: '',
    benefit_name: '',
    benefit_description: '',
    portfolio_id: '',
    programme_id: '',
    project_id: '',
    benefit_category: 'financial',
    benefit_type: 'quantifiable',
    benefit_owner_user_id: '',
    measurement_unit: 'currency',
    baseline_value: null,
    target_value: null,
    current_value: null,
    realized_value: null,
    benefit_status: 'identified',
    expected_realization_date: '',
    actual_realization_date: '',
    tracking_frequency: 'monthly',
    estimated_value: null,
    realized_value_currency: null,
    value_currency: 'USD',
    attribution_percentage: 100,
    realization_probability: null,
    notes: '',
  });

  const [portfolios, setPortfolios] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (benefit) {
      setFormData({
        benefit_code: benefit.benefit_code || '',
        benefit_name: benefit.benefit_name || '',
        benefit_description: benefit.benefit_description || '',
        portfolio_id: benefit.portfolio_id || '',
        programme_id: benefit.programme_id || '',
        project_id: benefit.project_id || '',
        benefit_category: benefit.benefit_category || 'financial',
        benefit_type: benefit.benefit_type || 'quantifiable',
        benefit_owner_user_id: benefit.benefit_owner_user_id || '',
        measurement_unit: benefit.measurement_unit || 'currency',
        baseline_value: benefit.baseline_value || null,
        target_value: benefit.target_value || null,
        current_value: benefit.current_value || null,
        realized_value: benefit.realized_value || null,
        benefit_status: benefit.benefit_status || 'identified',
        expected_realization_date: benefit.expected_realization_date || '',
        actual_realization_date: benefit.actual_realization_date || '',
        tracking_frequency: benefit.tracking_frequency || 'monthly',
        estimated_value: benefit.estimated_value || null,
        realized_value_currency: benefit.realized_value_currency || null,
        value_currency: benefit.value_currency || 'USD',
        attribution_percentage: benefit.attribution_percentage || 100,
        realization_probability: benefit.realization_probability || null,
        notes: benefit.notes || '',
      });
    }
    fetchLookupData();
  }, [benefit]);

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

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true });

      if (projectsData) setProjects(projectsData);

      // Fetch users
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, full_name')
        .order('full_name', { ascending: true });

      if (usersData) setUsers(usersData);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value ? parseFloat(value) : null) : value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate at least one context is selected
      if (!formData.portfolio_id && !formData.programme_id && !formData.project_id) {
        alert('Please select at least one context (Portfolio, Programme, or Project)');
        setSaving(false);
        return;
      }

      const submitData = {
        ...formData,
        portfolio_id: formData.portfolio_id || null,
        programme_id: formData.programme_id || null,
        project_id: formData.project_id || null,
        benefit_owner_user_id: formData.benefit_owner_user_id || null,
        baseline_value: formData.baseline_value ? parseFloat(formData.baseline_value) : null,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
        realized_value: formData.realized_value ? parseFloat(formData.realized_value) : null,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        realized_value_currency: formData.realized_value_currency ? parseFloat(formData.realized_value_currency) : null,
        attribution_percentage: formData.attribution_percentage ? parseFloat(formData.attribution_percentage) : 100,
        realization_probability: formData.realization_probability ? parseFloat(formData.realization_probability) : null,
        expected_realization_date: formData.expected_realization_date || null,
        actual_realization_date: formData.actual_realization_date || null,
      };

      await saveBenefit(submitData, benefit?.id);
      onSave();
    } catch (error) {
      console.error('Error saving benefit:', error);
      alert('Error saving benefit: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {benefit ? 'Edit Benefit' : 'Create Benefit'}
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
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Benefit Code *
                </label>
                <input
                  type="text"
                  name="benefit_code"
                  value={formData.benefit_code}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., BEN-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Benefit Name *
                </label>
                <input
                  type="text"
                  name="benefit_name"
                  value={formData.benefit_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Cost Reduction"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="benefit_description"
                  value={formData.benefit_description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the benefit..."
                />
              </div>
            </div>
          </div>

          {/* Context */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Context (Select at least one) *
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Portfolio
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
                  Programme
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project
                </label>
                <select
                  name="project_id"
                  value={formData.project_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Benefit Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Benefit Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  name="benefit_category"
                  value={formData.benefit_category}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="financial">Financial</option>
                  <option value="operational">Operational</option>
                  <option value="strategic">Strategic</option>
                  <option value="compliance">Compliance</option>
                  <option value="customer">Customer</option>
                  <option value="employee">Employee</option>
                  <option value="technology">Technology</option>
                  <option value="environmental">Environmental</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type *
                </label>
                <select
                  name="benefit_type"
                  value={formData.benefit_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="quantifiable">Quantifiable</option>
                  <option value="qualitative">Qualitative</option>
                  <option value="intangible">Intangible</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  name="benefit_status"
                  value={formData.benefit_status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="identified">Identified</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="partially_realized">Partially Realized</option>
                  <option value="realized">Realized</option>
                  <option value="lost">Lost</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Measurement Unit
                </label>
                <select
                  name="measurement_unit"
                  value={formData.measurement_unit}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="currency">Currency</option>
                  <option value="percentage">Percentage</option>
                  <option value="count">Count</option>
                  <option value="hours">Hours</option>
                  <option value="score">Score</option>
                  <option value="text">Text</option>
                  <option value="customer_satisfaction">Customer Satisfaction</option>
                  <option value="employee_satisfaction">Employee Satisfaction</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tracking Frequency
                </label>
                <select
                  name="tracking_frequency"
                  value={formData.tracking_frequency}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="on_demand">On Demand</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Benefit Owner
                </label>
                <select
                  name="benefit_owner_user_id"
                  value={formData.benefit_owner_user_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Values & Targets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Baseline Value
                </label>
                <input
                  type="number"
                  name="baseline_value"
                  value={formData.baseline_value || ''}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Value
                </label>
                <input
                  type="number"
                  name="target_value"
                  value={formData.target_value || ''}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Value
                </label>
                <input
                  type="number"
                  name="current_value"
                  value={formData.current_value || ''}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Realized Value
                </label>
                <input
                  type="number"
                  name="realized_value"
                  value={formData.realized_value || ''}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Value
                </label>
                <input
                  type="number"
                  name="estimated_value"
                  value={formData.estimated_value || ''}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Realized Value (Currency)
                </label>
                <input
                  type="number"
                  name="realized_value_currency"
                  value={formData.realized_value_currency || ''}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  name="value_currency"
                  value={formData.value_currency}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Realization Probability (%)
                </label>
                <input
                  type="number"
                  name="realization_probability"
                  value={formData.realization_probability || ''}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected Realization Date
                </label>
                <input
                  type="date"
                  name="expected_realization_date"
                  value={formData.expected_realization_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Actual Realization Date
                </label>
                <input
                  type="date"
                  name="actual_realization_date"
                  value={formData.actual_realization_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes..."
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
              disabled={saving || (!formData.portfolio_id && !formData.programme_id && !formData.project_id)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : benefit ? 'Update Benefit' : 'Create Benefit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

