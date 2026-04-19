/**
 * Create Programme Modal Component
 * 
 * Form to create a new programme with:
 * - Programme name, description
 * - Programme owner selection
 * - Programme manager selection
 * - Start/end dates
 * - Goals and success criteria
 */

import { useState, useEffect, memo } from 'react';
import { X, Save } from 'lucide-react';
import { saveProgramme } from '../../../services/programmeService';
import { platformDb } from '../../../services/supabase/supabaseClient';
import { logAction } from '../../../services/pmoAuditService';

const CreateProgrammeModal = memo(function CreateProgrammeModal({ 
  organizationId, 
  onClose, 
  onSuccess 
}) {
  const [formData, setFormData] = useState({
    programme_name: '',
    programme_code: '',
    programme_description: '',
    programme_owner_user_id: '',
    programme_manager_user_id: '',
    programme_start_date: '',
    programme_end_date: '',
    programme_goals: '',
    success_criteria: '',
    account_id: organizationId
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [organizationId]);

  const loadUsers = async () => {
    if (!organizationId) return;

    setLoadingUsers(true);
    try {
      // Get projects for this account to find users
      const { data: projects } = await platformDb
        .from('projects')
        .select('id')
        .eq('account_id', organizationId)
        .eq('is_deleted', false)
        .limit(10);

      if (!projects || projects.length === 0) {
        setLoadingUsers(false);
        return;
      }

      const projectIds = projects.map(p => p.id);

      // Get users from user_projects
      const { data: userProjects } = await platformDb
        .from('user_projects')
        .select(`
          user_id,
          users:user_id (
            id,
            full_name,
            email,
            is_active
          )
        `)
        .in('project_id', projectIds)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .limit(100);

      if (userProjects) {
        const userMap = new Map();
        userProjects.forEach(up => {
          if (up.users && !userMap.has(up.users.id) && up.users.is_active !== false) {
            userMap.set(up.users.id, up.users);
          }
        });
        setUsers(Array.from(userMap.values()).sort((a, b) => 
          (a.full_name || '').localeCompare(b.full_name || '')
        ));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
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

      const programmeData = {
        ...formData,
        programme_status: 'planned',
        rag_status: 'green',
        created_by: userRecord?.id
      };

      const newProgramme = await saveProgramme(programmeData);

      // Log audit action
      if (userRecord) {
        await logAction(
          userRecord.id,
          'CREATE_PROGRAMME',
          'PROGRAMME',
          newProgramme.id,
          `Created programme: ${programmeData.programme_name}`,
          { programme_name: programmeData.programme_name }
        );
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating programme:', error);
      setError(error.message || 'Failed to create programme');
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
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Create Programme</h3>
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
            {/* Programme Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Programme Name *
              </label>
              <input
                type="text"
                name="programme_name"
                value={formData.programme_name}
                onChange={handleChange}
                required
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Programme Code */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Programme Code
              </label>
              <input
                type="text"
                name="programme_code"
                value={formData.programme_code}
                onChange={handleChange}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                name="programme_description"
                value={formData.programme_description}
                onChange={handleChange}
                rows={3}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Programme Owner */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Programme Owner
              </label>
              <select
                name="programme_owner_user_id"
                value={formData.programme_owner_user_id}
                onChange={handleChange}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select owner...</option>
                {loadingUsers ? (
                  <option disabled>Loading users...</option>
                ) : (
                  users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Programme Manager */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Programme Manager
              </label>
              <select
                name="programme_manager_user_id"
                value={formData.programme_manager_user_id}
                onChange={handleChange}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select manager...</option>
                {loadingUsers ? (
                  <option disabled>Loading users...</option>
                ) : (
                  users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="programme_start_date"
                  value={formData.programme_start_date}
                  onChange={handleChange}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="programme_end_date"
                  value={formData.programme_end_date}
                  onChange={handleChange}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Goals
              </label>
              <textarea
                name="programme_goals"
                value={formData.programme_goals}
                onChange={handleChange}
                rows={3}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter programme goals..."
              />
            </div>

            {/* Success Criteria */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Success Criteria
              </label>
              <textarea
                name="success_criteria"
                value={formData.success_criteria}
                onChange={handleChange}
                rows={3}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter success criteria..."
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Programme'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default CreateProgrammeModal;
