import { useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { X, MessageSquare, Calendar, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { createAdHocDirection, updateAdHocDirection } from '../../../services/directingProjectService';

export default function AdHocDirectionForm({ projectId, direction, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    direction_title: direction?.direction_title || '',
    request_date: direction?.request_date || new Date().toISOString().split('T')[0],
    direction_type: direction?.direction_type || 'Guidance',
    priority: direction?.priority || 'Medium',
    request_description: direction?.request_description || '',
    business_justification: direction?.business_justification || '',
    direction_status: direction?.direction_status || 'Pending',
    response_required_by: direction?.response_required_by || '',
    board_response: direction?.board_response || '',
    response_date: direction?.response_date || ''
  });

  const directionTypes = [
    { value: 'Guidance', label: 'Guidance', description: 'Request for project direction or guidance', icon: MessageSquare },
    { value: 'Decision', label: 'Decision', description: 'Request for a specific decision', icon: CheckCircle },
    { value: 'Escalation', label: 'Escalation', description: 'Escalation of an issue or risk', icon: AlertCircle },
    { value: 'Approval', label: 'Approval', description: 'Request for approval of action', icon: FileText },
    { value: 'Exception', label: 'Exception', description: 'Request for exception to standards', icon: AlertCircle },
    { value: 'Clarification', label: 'Clarification', description: 'Request for clarification', icon: MessageSquare }
  ];

  const priorityOptions = [
    { value: 'Critical', label: 'Critical', color: 'red', description: 'Immediate response required' },
    { value: 'High', label: 'High', color: 'orange', description: 'Urgent response needed' },
    { value: 'Medium', label: 'Medium', color: 'yellow', description: 'Normal priority' },
    { value: 'Low', label: 'Low', color: 'green', description: 'Lower priority request' }
  ];

  const statusOptions = [
    { value: 'Pending', label: 'Pending', color: 'yellow' },
    { value: 'Under_Review', label: 'Under Review', color: 'blue' },
    { value: 'Responded', label: 'Responded', color: 'green' },
    { value: 'Deferred', label: 'Deferred', color: 'gray' },
    { value: 'Withdrawn', label: 'Withdrawn', color: 'red' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.direction_title.trim()) {
      alert('Please provide a direction title');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const directionData = {
        project_id: projectId,
        direction_title: formData.direction_title,
        request_date: formData.request_date,
        direction_type: formData.direction_type,
        priority: formData.priority,
        request_description: formData.request_description,
        business_justification: formData.business_justification,
        direction_status: formData.direction_status,
        response_required_by: formData.response_required_by || null,
        board_response: formData.board_response || null,
        response_date: formData.response_date || null
      };

      if (direction) {
        // Update existing direction
        directionData.updated_by = user.id;
        await updateAdHocDirection(direction.id, directionData);
      } else {
        // Create new direction
        directionData.requested_by = user.id;
        directionData.created_by = user.id;
        await createAdHocDirection(directionData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving ad hoc direction:', error);
      alert('Error saving ad hoc direction: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const option = priorityOptions.find(p => p.value === priority);
    return option?.color || 'gray';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {direction ? 'Edit Ad-Hoc Direction' : 'Request Ad-Hoc Direction'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Request guidance or decision from the Project Board outside of regular meetings
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
          {/* Direction Title */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MessageSquare className="h-4 w-4" />
              Direction Title *
            </label>
            <input
              type="text"
              value={formData.direction_title}
              onChange={(e) => setFormData({ ...formData, direction_title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Brief title describing the direction needed..."
              required
            />
          </div>

          {/* Request Date, Type, Priority, Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4" />
                Request Date *
              </label>
              <input
                type="date"
                value={formData.request_date}
                onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="h-4 w-4" />
                Direction Type *
              </label>
              <select
                value={formData.direction_type}
                onChange={(e) => setFormData({ ...formData, direction_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                {directionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {directionTypes.find(t => t.value === formData.direction_type) && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {directionTypes.find(t => t.value === formData.direction_type).description}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <AlertCircle className="h-4 w-4" />
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                {priorityOptions.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
              {priorityOptions.find(p => p.value === formData.priority) && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {priorityOptions.find(p => p.value === formData.priority).description}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CheckCircle className="h-4 w-4" />
                Status *
              </label>
              <select
                value={formData.direction_status}
                onChange={(e) => setFormData({ ...formData, direction_status: e.target.value })}
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

          {/* Request Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4" />
              Request Description *
            </label>
            <textarea
              value={formData.request_description}
              onChange={(e) => setFormData({ ...formData, request_description: e.target.value })}
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe the situation and the direction needed from the Project Board..."
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Provide detailed context about what decision or guidance is needed
            </p>
          </div>

          {/* Business Justification */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4" />
              Business Justification
            </label>
            <textarea
              value={formData.business_justification}
              onChange={(e) => setFormData({ ...formData, business_justification: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Explain the business impact and why this direction is needed now..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional: Explain the business case and urgency
            </p>
          </div>

          {/* Response Required By */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="h-4 w-4" />
              Response Required By
            </label>
            <input
              type="date"
              value={formData.response_required_by}
              onChange={(e) => setFormData({ ...formData, response_required_by: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional: Deadline for the board's response
            </p>
          </div>

          {/* Board Response Section */}
          {direction && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Board Response
              </h3>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Response
                </label>
                <textarea
                  value={formData.board_response}
                  onChange={(e) => setFormData({ ...formData, board_response: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Project Board's response or direction..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Response Date
                </label>
                <input
                  type="date"
                  value={formData.response_date}
                  onChange={(e) => setFormData({ ...formData, response_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          )}

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
              {loading ? 'Saving...' : direction ? 'Update Direction' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
