import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { X, FileCheck, Calendar, FileText, AlertTriangle } from 'lucide-react';
import { createProjectAuthorization, updateProjectAuthorization, fetchBoardMeetings } from '../../../services/directingProjectService';

export default function AuthorizationForm({ projectId, boardId, authorization, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [formData, setFormData] = useState({
    authorization_type: authorization?.authorization_type || 'Project_Initiation',
    authorization_date: authorization?.authorization_date || new Date().toISOString().split('T')[0],
    authorization_status: authorization?.authorization_status || 'Active',
    board_meeting_id: authorization?.board_meeting_id || null,
    authorized_amount: authorization?.authorized_amount || '',
    cost_tolerance_percent: authorization?.cost_tolerance_percent || 10,
    time_tolerance_days: authorization?.time_tolerance_days || 7,
    scope_tolerance: authorization?.scope_tolerance || 'Medium',
    authorization_notes: authorization?.authorization_notes || '',
    conditions: authorization?.conditions || ''
  });

  const authorizationTypes = [
    { value: 'Project_Initiation', label: 'Project Initiation', description: 'Initial project authorization' },
    { value: 'Stage_Authorization', label: 'Stage Authorization', description: 'Authorize next stage' },
    { value: 'Exception_Plan', label: 'Exception Plan', description: 'Exception plan approval' },
    { value: 'Project_Closure', label: 'Project Closure', description: 'Project closure approval' },
    { value: 'Budget_Change', label: 'Budget Change', description: 'Budget modification approval' },
    { value: 'Scope_Change', label: 'Scope Change', description: 'Scope modification approval' }
  ];

  const statusOptions = [
    { value: 'Active', label: 'Active', color: 'green' },
    { value: 'Superseded', label: 'Superseded', color: 'yellow' },
    { value: 'Revoked', label: 'Revoked', color: 'red' },
    { value: 'Expired', label: 'Expired', color: 'gray' }
  ];

  const toleranceOptions = [
    { value: 'Low', label: 'Low', description: 'Minimal tolerance for variance' },
    { value: 'Medium', label: 'Medium', description: 'Moderate tolerance for variance' },
    { value: 'High', label: 'High', description: 'Significant tolerance for variance' }
  ];

  useEffect(() => {
    if (boardId) {
      fetchMeetings();
    }
  }, [boardId]);

  const fetchMeetings = async () => {
    try {
      const data = await fetchBoardMeetings(boardId);
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching board meetings:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const authData = {
        project_id: projectId,
        authorization_type: formData.authorization_type,
        authorization_date: formData.authorization_date,
        authorization_status: formData.authorization_status,
        board_meeting_id: formData.board_meeting_id || null,
        authorized_amount: formData.authorized_amount ? parseFloat(formData.authorized_amount) : null,
        cost_tolerance_percent: parseFloat(formData.cost_tolerance_percent),
        time_tolerance_days: parseInt(formData.time_tolerance_days),
        scope_tolerance: formData.scope_tolerance,
        authorization_notes: formData.authorization_notes,
        conditions: formData.conditions
      };

      if (authorization) {
        // Update existing authorization
        authData.updated_by = user.id;
        await updateProjectAuthorization(authorization.id, authData);
      } else {
        // Create new authorization
        authData.created_by = user.id;
        await createProjectAuthorization(authData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving project authorization:', error);
      alert('Error saving project authorization: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {authorization ? 'Edit Project Authorization' : 'Create Project Authorization'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Document formal project board authorization and tolerances
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Authorization Type and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileCheck className="h-4 w-4" />
                Authorization Type *
              </label>
              <select
                value={formData.authorization_type}
                onChange={(e) => setFormData({ ...formData, authorization_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                {authorizationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {authorizationTypes.find(t => t.value === formData.authorization_type) && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {authorizationTypes.find(t => t.value === formData.authorization_type).description}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileCheck className="h-4 w-4" />
                Authorization Status *
              </label>
              <select
                value={formData.authorization_status}
                onChange={(e) => setFormData({ ...formData, authorization_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Authorization Date and Board Meeting */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4" />
                Authorization Date *
              </label>
              <input
                type="date"
                value={formData.authorization_date}
                onChange={(e) => setFormData({ ...formData, authorization_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4" />
                Board Meeting
              </label>
              <select
                value={formData.board_meeting_id || ''}
                onChange={(e) => setFormData({ ...formData, board_meeting_id: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">No meeting selected</option>
                {meetings.map((meeting) => (
                  <option key={meeting.id} value={meeting.id}>
                    {meeting.meeting_type} - {new Date(meeting.meeting_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Optional: Link to the board meeting where this was authorized
              </p>
            </div>
          </div>

          {/* Authorized Amount */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4" />
              Authorized Amount ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.authorized_amount}
              onChange={(e) => setFormData({ ...formData, authorized_amount: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="0.00"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional: Budget amount authorized for this scope
            </p>
          </div>

          {/* Tolerances Section */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Project Tolerances
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Define acceptable variance levels before escalation is required
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Cost Tolerance (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.cost_tolerance_percent}
                  onChange={(e) => setFormData({ ...formData, cost_tolerance_percent: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Time Tolerance (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.time_tolerance_days}
                  onChange={(e) => setFormData({ ...formData, time_tolerance_days: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Scope Tolerance
                </label>
                <select
                  value={formData.scope_tolerance}
                  onChange={(e) => setFormData({ ...formData, scope_tolerance: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  {toleranceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Authorization Notes */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4" />
              Authorization Notes
            </label>
            <textarea
              value={formData.authorization_notes}
              onChange={(e) => setFormData({ ...formData, authorization_notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe the authorization details, scope, and any specific considerations..."
            />
          </div>

          {/* Conditions */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4" />
              Conditions
            </label>
            <textarea
              value={formData.conditions}
              onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="List any conditions or constraints attached to this authorization..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional: Specify any conditions that must be met
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : authorization ? 'Update Authorization' : 'Create Authorization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
