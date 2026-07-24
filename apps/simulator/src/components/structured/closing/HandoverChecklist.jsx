import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { X, Users, Calendar, CheckCircle, FileText, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { createProjectHandover, updateProjectHandover, fetchProjectHandover } from '../../../services/closingProjectService';

export default function HandoverChecklist({ projectId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [users, setUsers] = useState([]);
  const [handover, setHandover] = useState(null);
  const [checklistItems, setChecklistItems] = useState([
    { item: 'Project documentation handed over', completed: false },
    { item: 'Operational procedures documented', completed: false },
    { item: 'Training materials provided', completed: false },
    { item: 'Knowledge transfer sessions completed', completed: false },
    { item: 'Support contacts identified', completed: false },
    { item: 'Access rights transferred', completed: false },
    { item: 'System credentials provided', completed: false },
    { item: 'Warranty information documented', completed: false }
  ]);
  const [formData, setFormData] = useState({
    handover_from: '',
    handover_to: '',
    handover_date: new Date().toISOString().split('T')[0],
    handover_type: 'operational',
    handover_status: 'not-started',
    documentation_complete: false,
    training_complete: false,
    knowledge_transfer_complete: false,
    support_arrangements: '',
    operational_acceptance: '',
    handover_notes: '',
    acceptance_signature_date: ''
  });

  useEffect(() => {
    loadHandoverData();
    fetchUsers();
  }, [projectId]);

  const loadHandoverData = async () => {
    try {
      setLoadingData(true);
      const data = await fetchProjectHandover(projectId);
      if (data) {
        setHandover(data);
        setFormData({
          handover_from: data.handover_from || '',
          handover_to: data.handover_to || '',
          handover_date: data.handover_date || new Date().toISOString().split('T')[0],
          handover_type: data.handover_type || 'operational',
          handover_status: data.handover_status || 'not-started',
          documentation_complete: data.documentation_complete || false,
          training_complete: data.training_complete || false,
          knowledge_transfer_complete: data.knowledge_transfer_complete || false,
          support_arrangements: data.support_arrangements || '',
          operational_acceptance: data.operational_acceptance || '',
          handover_notes: data.handover_notes || '',
          acceptance_signature_date: data.acceptance_signature_date || ''
        });
        if (data.checklist_items && Array.isArray(data.checklist_items)) {
          setChecklistItems(data.checklist_items);
        }
      }
    } catch (error) {
      console.error('Error loading handover data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleChecklistToggle = (index) => {
    const updatedItems = [...checklistItems];
    updatedItems[index].completed = !updatedItems[index].completed;
    setChecklistItems(updatedItems);
  };

  const handleAddChecklistItem = () => {
    setChecklistItems([...checklistItems, { item: '', completed: false }]);
  };

  const handleRemoveChecklistItem = (index) => {
    const updatedItems = checklistItems.filter((_, i) => i !== index);
    setChecklistItems(updatedItems);
  };

  const handleChecklistItemChange = (index, value) => {
    const updatedItems = [...checklistItems];
    updatedItems[index].item = value;
    setChecklistItems(updatedItems);
  };

  const calculateCompletionPercentage = () => {
    if (checklistItems.length === 0) return 0;
    const completedCount = checklistItems.filter(item => item.completed).length;
    return Math.round((completedCount / checklistItems.length) * 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const handoverData = {
        project_id: projectId,
        handover_from: formData.handover_from || null,
        handover_to: formData.handover_to || null,
        handover_date: formData.handover_date || null,
        handover_type: formData.handover_type,
        handover_status: formData.handover_status,
        documentation_complete: formData.documentation_complete,
        training_complete: formData.training_complete,
        knowledge_transfer_complete: formData.knowledge_transfer_complete,
        support_arrangements: formData.support_arrangements,
        operational_acceptance: formData.operational_acceptance,
        handover_notes: formData.handover_notes,
        checklist_items: checklistItems,
        acceptance_signature_date: formData.acceptance_signature_date || null
      };

      if (handover) {
        handoverData.updated_by = user.id;
        await updateProjectHandover(handover.id, handoverData);
      } else {
        handoverData.created_by = user.id;
        await createProjectHandover(handoverData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving project handover:', error);
      alert('Error saving project handover: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-700 dark:text-gray-300 mt-4">Loading handover data...</p>
        </div>
      </div>
    );
  }

  const completionPercentage = calculateCompletionPercentage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Project Handover Checklist
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage project handover to operational teams
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Progress Bar */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Handover Completion
              </span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-3">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="h-4 w-4" />
                Handover From *
              </label>
              <select
                value={formData.handover_from}
                onChange={(e) => setFormData({ ...formData, handover_from: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Select user...</option>
                {users.map((user, index) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="h-4 w-4" />
                Handover To *
              </label>
              <select
                value={formData.handover_to}
                onChange={(e) => setFormData({ ...formData, handover_to: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="">Select user...</option>
                {users.map((user, index) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4" />
                Handover Date *
              </label>
              <input
                type="date"
                value={formData.handover_date}
                onChange={(e) => setFormData({ ...formData, handover_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Handover Type *
              </label>
              <select
                value={formData.handover_type}
                onChange={(e) => setFormData({ ...formData, handover_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="operational">Operational</option>
                <option value="support">Support</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Handover Status *
              </label>
              <select
                value={formData.handover_status}
                onChange={(e) => setFormData({ ...formData, handover_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Completion Flags */}
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Completion Status
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.documentation_complete}
                  onChange={(e) => setFormData({ ...formData, documentation_complete: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Documentation Complete
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.training_complete}
                  onChange={(e) => setFormData({ ...formData, training_complete: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Training Complete
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.knowledge_transfer_complete}
                  onChange={(e) => setFormData({ ...formData, knowledge_transfer_complete: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Knowledge Transfer Complete
                </span>
              </label>
            </div>
          </div>

          {/* Handover Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Handover Checklist
              </h3>
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium inline-flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Item
              </button>
            </div>
            <div className="space-y-2">
              {checklistItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleChecklistToggle(index)}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    value={item.item}
                    onChange={(e) => handleChecklistItemChange(index, e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                    placeholder="Checklist item..."
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(index)}
                    className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Support & Acceptance */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Support Arrangements *
            </label>
            <textarea
              value={formData.support_arrangements}
              onChange={(e) => setFormData({ ...formData, support_arrangements: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe ongoing support arrangements..."
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Operational Acceptance *
            </label>
            <textarea
              value={formData.operational_acceptance}
              onChange={(e) => setFormData({ ...formData, operational_acceptance: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Document operational team acceptance..."
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Handover Notes
            </label>
            <textarea
              value={formData.handover_notes}
              onChange={(e) => setFormData({ ...formData, handover_notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Additional handover notes and comments..."
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="h-4 w-4" />
              Acceptance Signature Date
            </label>
            <input
              type="date"
              value={formData.acceptance_signature_date}
              onChange={(e) => setFormData({ ...formData, acceptance_signature_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

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
              {loading ? 'Saving...' : handover ? 'Update Handover' : 'Create Handover'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
