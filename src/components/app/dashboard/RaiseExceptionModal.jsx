/**
 * Raise Exception Modal Component
 * 
 * Form to raise a new exception:
 * - Select project
 * - Exception reason (textarea)
 * - Exception level (dropdown)
 * - Submit (logs audit entry)
 */

import { useState, useEffect, memo } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { raiseException } from '../../../services/exceptionService';
import { platformDb } from '../../../services/supabase/supabaseClient';

const RaiseExceptionModal = memo(function RaiseExceptionModal({ 
  organizationId, 
  onClose, 
  onSuccess 
}) {
  const [formData, setFormData] = useState({
    project_id: '',
    exception_title: '',
    exception_reason: '',
    exception_description: '',
    exception_level: 'MEDIUM',
    exception_category: 'PERFORMANCE'
  });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProjects();
  }, [organizationId]);

  const loadProjects = async () => {
    if (!organizationId) return;

    setLoadingProjects(true);
    try {
      const { data: projectsData, error: projError } = await platformDb
        .from('projects')
        .select('id, project_name, project_code, health_status')
        .eq('account_id', organizationId)
        .eq('is_deleted', false)
        .order('project_name')
        .limit(100);

      if (projError) throw projError;
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      setError('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: { user } } = await platformDb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      const exceptionData = {
        ...formData,
        exception_status: 'OPEN',
        raised_by: userRecord?.id
      };

      const result = await raiseException(exceptionData, userRecord?.id);

      if (result.success) {
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(result.error || 'Failed to raise exception');
      }
    } catch (error) {
      console.error('Error raising exception:', error);
      setError(error.message || 'Failed to raise exception');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Raise Exception</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Select Project */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Project *
              </label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleChange}
                required
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a project...</option>
                {loadingProjects ? (
                  <option disabled>Loading projects...</option>
                ) : (
                  projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Exception Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Exception Title *
              </label>
              <input
                type="text"
                name="exception_title"
                value={formData.exception_title}
                onChange={handleChange}
                required
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief title for the exception"
              />
            </div>

            {/* Exception Level */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Exception Level *
              </label>
              <select
                name="exception_level"
                value={formData.exception_level}
                onChange={handleChange}
                required
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Exception Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Category
              </label>
              <select
                name="exception_category"
                value={formData.exception_category}
                onChange={handleChange}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PERFORMANCE">Performance</option>
                <option value="BUDGET">Budget</option>
                <option value="SCHEDULE">Schedule</option>
                <option value="SCOPE">Scope</option>
                <option value="QUALITY">Quality</option>
                <option value="RESOURCE">Resource</option>
                <option value="RISK">Risk</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Exception Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Exception Reason *
              </label>
              <textarea
                name="exception_reason"
                value={formData.exception_reason}
                onChange={handleChange}
                required
                rows={4}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the exception reason..."
              />
            </div>

            {/* Exception Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Additional Details
              </label>
              <textarea
                name="exception_description"
                value={formData.exception_description}
                onChange={handleChange}
                rows={3}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional context or details..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Raising...' : 'Raise Exception'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default RaiseExceptionModal;
