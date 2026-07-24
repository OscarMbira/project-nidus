import { useState, useEffect } from 'react';
import { X, Save, Users, FolderKanban, Target, Calendar, AlertTriangle } from 'lucide-react';
import { saveCrossProjectAllocation, checkResourceConflicts } from '../../services/crossResourceService';
import { supabase } from '../../services/supabaseClient';

export default function CrossProjectAllocationForm({ allocation, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    resource_id: '',
    project_id: '',
    portfolio_id: '',
    programme_id: '',
    allocation_start_date: '',
    allocation_end_date: '',
    allocation_percentage: 100,
    allocated_hours_per_week: '',
    allocation_type: 'dedicated',
    allocation_status: 'planned',
    allocation_priority: 'medium',
    is_critical_resource: false,
    allocation_notes: '',
  });

  const [resources, setResources] = useState([]);
  const [projects, setProjects] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [conflictCheck, setConflictCheck] = useState(null);
  const [checkingConflicts, setCheckingConflicts] = useState(false);

  useEffect(() => {
    if (allocation) {
      setFormData({
        resource_id: allocation.resource_id || '',
        project_id: allocation.project_id || '',
        portfolio_id: allocation.portfolio_id || '',
        programme_id: allocation.programme_id || '',
        allocation_start_date: allocation.allocation_start_date || '',
        allocation_end_date: allocation.allocation_end_date || '',
        allocation_percentage: allocation.allocation_percentage || 100,
        allocated_hours_per_week: allocation.allocated_hours_per_week || '',
        allocation_type: allocation.allocation_type || 'dedicated',
        allocation_status: allocation.allocation_status || 'planned',
        allocation_priority: allocation.allocation_priority || 'medium',
        is_critical_resource: allocation.is_critical_resource || false,
        allocation_notes: allocation.allocation_notes || '',
      });
    }
    fetchLookupData();
  }, [allocation]);

  useEffect(() => {
    // Check for conflicts when relevant fields change
    if (formData.resource_id && formData.allocation_start_date && formData.allocation_end_date) {
      checkConflicts();
    }
  }, [formData.resource_id, formData.allocation_start_date, formData.allocation_end_date, formData.allocation_percentage]);

  const fetchLookupData = async () => {
    try {
      // Fetch resources
      const { data: resourcesData } = await supabase
        .from('resources')
        .select('id, resource_name, resource_code, resource_type')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('resource_name', { ascending: true });

      if (resourcesData) setResources(resourcesData);

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true });

      if (projectsData) setProjects(projectsData);

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

  const checkConflicts = async () => {
    if (!formData.resource_id || !formData.allocation_start_date || !formData.allocation_end_date) {
      return;
    }

    try {
      setCheckingConflicts(true);
      const conflicts = await checkResourceConflicts(
        formData.resource_id,
        formData.allocation_start_date,
        formData.allocation_end_date,
        allocation?.id
      );
      setConflictCheck(conflicts);
    } catch (error) {
      console.error('Error checking conflicts:', error);
      setConflictCheck(null);
    } finally {
      setCheckingConflicts(false);
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
      // Ensure at least one context is provided
      if (!formData.project_id && !formData.portfolio_id && !formData.programme_id) {
        alert('Please select at least one allocation context (Project, Portfolio, or Programme)');
        setSaving(false);
        return;
      }

      const submitData = {
        ...formData,
        resource_id: formData.resource_id || null,
        project_id: formData.project_id || null,
        portfolio_id: formData.portfolio_id || null,
        programme_id: formData.programme_id || null,
        allocation_start_date: formData.allocation_start_date || null,
        allocation_end_date: formData.allocation_end_date || null,
        allocation_percentage: formData.allocation_percentage ? parseFloat(formData.allocation_percentage) : null,
        allocated_hours_per_week: formData.allocated_hours_per_week ? parseFloat(formData.allocated_hours_per_week) : null,
      };

      await saveCrossProjectAllocation(submitData, allocation?.id);
      onSave();
    } catch (error) {
      console.error('Error saving allocation:', error);
      alert('Error saving allocation: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {allocation ? 'Edit Resource Allocation' : 'Create Resource Allocation'}
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
          {/* Resource Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Resource Selection
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resource *
              </label>
              <select
                name="resource_id"
                value={formData.resource_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Resource</option>
                {resources.map(resource => (
                  <option key={resource.id} value={resource.id}>
                    {resource.resource_name} {resource.resource_code ? `(${resource.resource_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Allocation Context */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Allocation Context (Select at least one)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
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
            </div>
          </div>

          {/* Allocation Period */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Allocation Period
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="allocation_start_date"
                  value={formData.allocation_start_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  name="allocation_end_date"
                  value={formData.allocation_end_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Allocation Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Allocation Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Allocation Percentage *
                </label>
                <input
                  type="number"
                  name="allocation_percentage"
                  value={formData.allocation_percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Percentage of resource capacity (0-100%)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hours per Week
                </label>
                <input
                  type="number"
                  name="allocated_hours_per_week"
                  value={formData.allocated_hours_per_week}
                  onChange={handleChange}
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Allocation Type *
                </label>
                <select
                  name="allocation_type"
                  value={formData.allocation_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="dedicated">Dedicated</option>
                  <option value="shared">Shared</option>
                  <option value="on-demand">On-Demand</option>
                  <option value="part-time">Part-Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  name="allocation_status"
                  value={formData.allocation_status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="planned">Planned</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  name="allocation_priority"
                  value={formData.allocation_priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  name="is_critical_resource"
                  checked={formData.is_critical_resource}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Critical Resource
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                name="allocation_notes"
                value={formData.allocation_notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes about this allocation..."
              />
            </div>
          </div>

          {/* Conflict Check */}
          {checkingConflicts && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">Checking for resource conflicts...</span>
              </div>
            </div>
          )}

          {conflictCheck && !checkingConflicts && (
            <div className={`border rounded-lg p-4 ${
              conflictCheck.hasConflict
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className={`flex items-center gap-2 ${
                conflictCheck.hasConflict
                  ? 'text-red-800 dark:text-red-300'
                  : 'text-green-800 dark:text-green-300'
              }`}>
                <AlertTriangle className={`h-5 w-5 ${
                  conflictCheck.hasConflict ? 'text-red-600' : 'text-green-600'
                }`} />
                <div className="flex-1">
                  <div className="font-medium">
                    {conflictCheck.hasConflict
                      ? `Conflict Detected: ${conflictCheck.totalAllocationPercentage.toFixed(1)}% allocated`
                      : `No Conflicts: ${conflictCheck.totalAllocationPercentage.toFixed(1)}% allocated, ${conflictCheck.availablePercentage.toFixed(1)}% available`
                    }
                  </div>
                  {conflictCheck.hasConflict && conflictCheck.conflictingAllocations.length > 0 && (
                    <div className="text-sm mt-1">
                      {conflictCheck.conflictingAllocations.length} conflicting allocation(s) found
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
              disabled={saving || (conflictCheck?.hasConflict && formData.allocation_status !== 'planned')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : allocation ? 'Update Allocation' : 'Create Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

