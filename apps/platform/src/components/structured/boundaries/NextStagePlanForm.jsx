import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { X, FileText, Calendar, DollarSign, Target, Users, Shield } from 'lucide-react';
import { createNextStagePlan, updateNextStagePlan, fetchStageBoundaries } from '../../../services/stageBoundariesService';

export default function NextStagePlanForm({ projectId, plan, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [stageBoundaries, setStageBoundaries] = useState([]);
  const [activeSection, setActiveSection] = useState('basic');
  const [formData, setFormData] = useState({
    plan_title: plan?.plan_title || '',
    plan_date: plan?.plan_date || new Date().toISOString().split('T')[0],
    current_stage_boundary_id: plan?.current_stage_boundary_id || '',
    next_stage_boundary_id: plan?.next_stage_boundary_id || '',
    next_stage_name: plan?.next_stage_name || '',
    next_stage_number: plan?.next_stage_number || '',
    next_stage_description: plan?.next_stage_description || '',
    stage_objectives: plan?.stage_objectives || '',
    planned_start_date: plan?.planned_start_date || '',
    planned_end_date: plan?.planned_end_date || '',
    stage_budget: plan?.stage_budget || '',
    scope_description: plan?.scope_description || '',
    resource_requirements: plan?.resource_requirements || '',
    quality_expectations: plan?.quality_expectations || '',
    identified_risks: plan?.identified_risks || '',
    time_tolerance_days: plan?.time_tolerance_days || 7,
    cost_tolerance_amount: plan?.cost_tolerance_amount || '',
    approval_status: plan?.approval_status || 'draft',
    notes: plan?.notes || ''
  });

  useEffect(() => {
    fetchStages();
  }, [projectId]);

  const fetchStages = async () => {
    try {
      const data = await fetchStageBoundaries(projectId);
      setStageBoundaries(data || []);
    } catch (error) {
      console.error('Error fetching stage boundaries:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const planData = {
        project_id: projectId,
        current_stage_boundary_id: formData.current_stage_boundary_id || null,
        next_stage_boundary_id: formData.next_stage_boundary_id || null,
        plan_title: formData.plan_title,
        plan_date: formData.plan_date,
        next_stage_name: formData.next_stage_name,
        next_stage_number: formData.next_stage_number ? parseInt(formData.next_stage_number) : null,
        next_stage_description: formData.next_stage_description,
        stage_objectives: formData.stage_objectives,
        planned_start_date: formData.planned_start_date || null,
        planned_end_date: formData.planned_end_date || null,
        stage_budget: formData.stage_budget ? parseFloat(formData.stage_budget) : null,
        scope_description: formData.scope_description,
        resource_requirements: formData.resource_requirements,
        quality_expectations: formData.quality_expectations,
        identified_risks: formData.identified_risks,
        time_tolerance_days: parseInt(formData.time_tolerance_days),
        cost_tolerance_amount: formData.cost_tolerance_amount ? parseFloat(formData.cost_tolerance_amount) : null,
        approval_status: formData.approval_status,
        notes: formData.notes
      };

      if (plan) {
        planData.updated_by = user.id;
        await updateNextStagePlan(plan.id, planData);
      } else {
        planData.prepared_by = user.id;
        planData.created_by = user.id;
        await createNextStagePlan(planData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving next stage plan:', error);
      alert('Error saving next stage plan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'planning', label: 'Planning', icon: Target },
    { id: 'resources', label: 'Resources & Quality', icon: Users },
    { id: 'risks', label: 'Risks & Tolerances', icon: Shield }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan ? 'Edit Next Stage Plan' : 'Create Next Stage Plan'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Plan objectives, resources, and deliverables for the next stage
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 px-6 pt-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2 font-medium text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                  activeSection === section.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
          {activeSection === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Plan Title *</label>
                <input
                  type="text"
                  value={formData.plan_title}
                  onChange={(e) => setFormData({ ...formData, plan_title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Next Stage Plan - [Stage Name]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Plan Date *</label>
                  <input
                    type="date"
                    value={formData.plan_date}
                    onChange={(e) => setFormData({ ...formData, plan_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Current Stage</label>
                  <select
                    value={formData.current_stage_boundary_id}
                    onChange={(e) => setFormData({ ...formData, current_stage_boundary_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select current stage...</option>
                    {stageBoundaries.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        Stage {stage.stage_number}: {stage.stage_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Next Stage Name *</label>
                  <input
                    type="text"
                    value={formData.next_stage_name}
                    onChange={(e) => setFormData({ ...formData, next_stage_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Next Stage Number</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.next_stage_number}
                    onChange={(e) => setFormData({ ...formData, next_stage_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Next Stage Description</label>
                <textarea
                  value={formData.next_stage_description}
                  onChange={(e) => setFormData({ ...formData, next_stage_description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe the purpose and scope of the next stage..."
                />
              </div>
            </div>
          )}

          {activeSection === 'planning' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Stage Objectives</label>
                <textarea
                  value={formData.stage_objectives}
                  onChange={(e) => setFormData({ ...formData, stage_objectives: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="List the key objectives for this stage..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="h-4 w-4" />
                    Planned Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.planned_start_date}
                    onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="h-4 w-4" />
                    Planned End Date
                  </label>
                  <input
                    type="date"
                    value={formData.planned_end_date}
                    onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <DollarSign className="h-4 w-4" />
                  Stage Budget ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.stage_budget}
                  onChange={(e) => setFormData({ ...formData, stage_budget: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Scope Description</label>
                <textarea
                  value={formData.scope_description}
                  onChange={(e) => setFormData({ ...formData, scope_description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe what is in scope for this stage..."
                />
              </div>
            </div>
          )}

          {activeSection === 'resources' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Users className="h-4 w-4" />
                  Resource Requirements
                </label>
                <textarea
                  value={formData.resource_requirements}
                  onChange={(e) => setFormData({ ...formData, resource_requirements: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe resource needs (team members, equipment, etc.)..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Quality Expectations</label>
                <textarea
                  value={formData.quality_expectations}
                  onChange={(e) => setFormData({ ...formData, quality_expectations: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Define quality standards and acceptance criteria..."
                />
              </div>
            </div>
          )}

          {activeSection === 'risks' && (
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Shield className="h-4 w-4" />
                  Identified Risks
                </label>
                <textarea
                  value={formData.identified_risks}
                  onChange={(e) => setFormData({ ...formData, identified_risks: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="List known risks for this stage..."
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Stage Tolerances</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Time Tolerance (Days)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.time_tolerance_days}
                      onChange={(e) => setFormData({ ...formData, time_tolerance_days: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Cost Tolerance ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost_tolerance_amount}
                      onChange={(e) => setFormData({ ...formData, cost_tolerance_amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Approval Status</label>
                <select
                  value={formData.approval_status}
                  onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="under-review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          )}

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
              {loading ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
