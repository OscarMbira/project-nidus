import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Edit2, Trash2, Send, Calendar, User, Mail } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { getStakeholders } from '../../services/stakeholderService';

export default function CommunicationPlan({ projectId }) {
  const [plans, setPlans] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    communication_title: '',
    communication_type: 'meeting',
    target_audience: [],
    communication_channel: 'email',
    frequency: 'weekly',
    schedule_day: '',
    schedule_time: '',
    communication_objective: '',
    key_messages: '',
    success_metrics: '',
    owner_user_id: '',
    notes: '',
  });

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch stakeholders
      const shData = await getStakeholders({ project_id: projectId });
      setStakeholders(shData || []);

      // Fetch communication plans
      const { data, error } = await supabase
        .from('stakeholder_communications')
        .select(`
          *,
          owner:owner_user_id(id, email, full_name),
          stakeholders:stakeholder_communications_stakeholders(
            stakeholder:stakeholder_id(id, stakeholder_name)
          )
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching communication plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const submitData = {
        ...formData,
        project_id: projectId,
        target_stakeholder_ids: formData.target_audience,
        owner_user_id: formData.owner_user_id || null,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from('stakeholder_communications')
          .update({
            ...submitData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPlan.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stakeholder_communications')
          .insert({
            ...submitData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      setShowForm(false);
      setEditingPlan(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving communication plan:', error);
      alert('Error saving communication plan: ' + error.message);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete communication plan "${plan.communication_title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stakeholder_communications')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', plan.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting communication plan:', error);
      alert('Error deleting communication plan: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      communication_title: '',
      communication_type: 'meeting',
      target_audience: [],
      communication_channel: 'email',
      frequency: 'weekly',
      schedule_day: '',
      schedule_time: '',
      communication_objective: '',
      key_messages: '',
      success_metrics: '',
      owner_user_id: '',
      notes: '',
    });
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      communication_title: plan.communication_title || '',
      communication_type: plan.communication_type || 'meeting',
      target_audience: plan.target_stakeholder_ids || [],
      communication_channel: plan.communication_channel || 'email',
      frequency: plan.frequency || 'weekly',
      schedule_day: plan.schedule_day || '',
      schedule_time: plan.schedule_time || '',
      communication_objective: plan.communication_objective || '',
      key_messages: plan.key_messages || '',
      success_metrics: plan.success_metrics || '',
      owner_user_id: plan.owner_user_id || '',
      notes: plan.notes || '',
    });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Communication Plans
        </h3>
        <button
          onClick={() => {
            setEditingPlan(null);
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Communication Plan
        </button>
      </div>

      {/* Communication Plans List */}
      {plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Communication Plans
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create communication plans to manage stakeholder engagement
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create First Plan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {plan.communication_title}
                  </h4>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span className="capitalize">{plan.communication_type?.replace('-', ' ')}</span>
                    <span>•</span>
                    <span className="capitalize">{plan.communication_channel?.replace('-', ' ')}</span>
                    <span>•</span>
                    <span className="capitalize">{plan.frequency?.replace('-', ' ')}</span>
                    {plan.schedule_day && plan.schedule_time && (
                      <>
                        <span>•</span>
                        <span>{plan.schedule_day} at {plan.schedule_time}</span>
                      </>
                    )}
                  </div>
                  {plan.communication_objective && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {plan.communication_objective}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {plan.key_messages && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Key Messages:
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {plan.key_messages}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editingPlan ? 'Edit Communication Plan' : 'Create Communication Plan'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingPlan(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Communication Title *
                </label>
                <input
                  type="text"
                  value={formData.communication_title}
                  onChange={(e) => setFormData({ ...formData, communication_title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Weekly Status Update"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Communication Type *
                  </label>
                  <select
                    value={formData.communication_type}
                    onChange={(e) => setFormData({ ...formData, communication_type: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="email">Email</option>
                    <option value="report">Report</option>
                    <option value="presentation">Presentation</option>
                    <option value="workshop">Workshop</option>
                    <option value="newsletter">Newsletter</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Communication Channel *
                  </label>
                  <select
                    value={formData.communication_channel}
                    onChange={(e) => setFormData({ ...formData, communication_channel: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="in-person">In-Person</option>
                    <option value="video-call">Video Call</option>
                    <option value="phone">Phone</option>
                    <option value="portal">Portal</option>
                    <option value="document">Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Frequency *
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="as-needed">As Needed</option>
                    <option value="one-time">One-Time</option>
                  </select>
                </div>
              </div>

              {formData.frequency !== 'one-time' && formData.frequency !== 'as-needed' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Schedule Day
                    </label>
                    <select
                      value={formData.schedule_day}
                      onChange={(e) => setFormData({ ...formData, schedule_day: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select day...</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Schedule Time
                    </label>
                    <input
                      type="time"
                      value={formData.schedule_time}
                      onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Audience
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                  {stakeholders.map(stakeholder => (
                    <label key={stakeholder.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.target_audience.includes(stakeholder.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, target_audience: [...formData.target_audience, stakeholder.id] });
                          } else {
                            setFormData({ ...formData, target_audience: formData.target_audience.filter(id => id !== stakeholder.id) });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {stakeholder.stakeholder_name}
                      </span>
                    </label>
                  ))}
                  {stakeholders.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No stakeholders available</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Communication Objective
                </label>
                <textarea
                  value={formData.communication_objective}
                  onChange={(e) => setFormData({ ...formData, communication_objective: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What is the objective of this communication?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Key Messages
                </label>
                <textarea
                  value={formData.key_messages}
                  onChange={(e) => setFormData({ ...formData, key_messages: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Key messages to communicate..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Success Metrics
                </label>
                <textarea
                  value={formData.success_metrics}
                  onChange={(e) => setFormData({ ...formData, success_metrics: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="How will you measure success?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.communication_title}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

