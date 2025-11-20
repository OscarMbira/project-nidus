import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { X, AlertTriangle, FileText, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { createExceptionPlan, updateExceptionPlan, fetchStageBoundaries } from '../../../services/stageBoundariesService';

export default function ExceptionPlanForm({ projectId, boardId, plan, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [stageBoundaries, setStageBoundaries] = useState([]);
  const [activeSection, setActiveSection] = useState('basic'); // basic, exception, solution, impact, approval
  const [formData, setFormData] = useState({
    plan_title: plan?.plan_title || '',
    plan_date: plan?.plan_date || new Date().toISOString().split('T')[0],
    stage_boundary_id: plan?.stage_boundary_id || '',
    exception_type: plan?.exception_type || 'budget',
    exception_description: plan?.exception_description || '',
    exception_cause: plan?.exception_cause || '',
    exception_impact: plan?.exception_impact || '',

    tolerance_type: plan?.tolerance_type || 'cost',
    tolerance_threshold: plan?.tolerance_threshold || '',
    actual_value: plan?.actual_value || '',
    variance_amount: plan?.variance_amount || '',

    current_status: plan?.current_status || '',
    proposed_solution: plan?.proposed_solution || '',
    solution_approach: plan?.solution_approach || 'recovery',
    recovery_actions: plan?.recovery_actions || '',

    impact_on_business_case: plan?.impact_on_business_case || '',
    impact_on_project_objectives: plan?.impact_on_project_objectives || '',
    impact_on_benefits: plan?.impact_on_benefits || '',
    impact_on_risks: plan?.impact_on_risks || '',

    revised_budget: plan?.revised_budget || '',
    additional_budget_required: plan?.additional_budget_required || '',
    additional_time_required_days: plan?.additional_time_required_days || '',
    revised_completion_date: plan?.revised_completion_date || '',

    option_1_description: plan?.option_1_description || '',
    option_1_pros_cons: plan?.option_1_pros_cons || '',
    option_2_description: plan?.option_2_description || '',
    option_2_pros_cons: plan?.option_2_pros_cons || '',
    option_3_description: plan?.option_3_description || '',
    option_3_pros_cons: plan?.option_3_pros_cons || '',
    recommended_option: plan?.recommended_option || 1,

    approval_status: plan?.approval_status || 'draft',
    implementation_status: plan?.implementation_status || 'not-started',
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
        board_id: boardId || null,
        stage_boundary_id: formData.stage_boundary_id || null,
        plan_title: formData.plan_title,
        plan_date: formData.plan_date,
        exception_type: formData.exception_type,
        exception_description: formData.exception_description,
        exception_cause: formData.exception_cause,
        exception_impact: formData.exception_impact,

        tolerance_type: formData.tolerance_type,
        tolerance_threshold: formData.tolerance_threshold,
        actual_value: formData.actual_value,
        variance_amount: formData.variance_amount,

        current_status: formData.current_status,
        proposed_solution: formData.proposed_solution,
        solution_approach: formData.solution_approach,
        recovery_actions: formData.recovery_actions,

        impact_on_business_case: formData.impact_on_business_case,
        impact_on_project_objectives: formData.impact_on_project_objectives,
        impact_on_benefits: formData.impact_on_benefits,
        impact_on_risks: formData.impact_on_risks,

        revised_budget: formData.revised_budget ? parseFloat(formData.revised_budget) : null,
        additional_budget_required: formData.additional_budget_required ? parseFloat(formData.additional_budget_required) : null,
        additional_time_required_days: formData.additional_time_required_days ? parseInt(formData.additional_time_required_days) : null,
        revised_completion_date: formData.revised_completion_date || null,

        option_1_description: formData.option_1_description,
        option_1_pros_cons: formData.option_1_pros_cons,
        option_2_description: formData.option_2_description,
        option_2_pros_cons: formData.option_2_pros_cons,
        option_3_description: formData.option_3_description,
        option_3_pros_cons: formData.option_3_pros_cons,
        recommended_option: parseInt(formData.recommended_option),

        approval_status: formData.approval_status,
        implementation_status: formData.implementation_status,
        notes: formData.notes
      };

      if (plan) {
        planData.updated_by = user.id;
        await updateExceptionPlan(plan.id, planData);
      } else {
        planData.prepared_by = user.id;
        planData.created_by = user.id;
        await createExceptionPlan(planData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving exception plan:', error);
      alert('Error saving exception plan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'exception', label: 'Exception Details', icon: AlertTriangle },
    { id: 'solution', label: 'Proposed Solution', icon: TrendingUp },
    { id: 'impact', label: 'Impact & Options', icon: DollarSign },
    { id: 'approval', label: 'Approval', icon: FileText }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan ? 'Edit Exception Plan' : 'Create Exception Plan'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Document tolerance breach and recovery plan
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Plan Title *</label>
                  <input
                    type="text"
                    value={formData.plan_title}
                    onChange={(e) => setFormData({ ...formData, plan_title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Exception Plan - [Brief Description]"
                    required
                  />
                </div>

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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Stage Boundary</label>
                  <select
                    value={formData.stage_boundary_id}
                    onChange={(e) => setFormData({ ...formData, stage_boundary_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select stage...</option>
                    {stageBoundaries.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        Stage {stage.stage_number}: {stage.stage_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Exception Type *</label>
                  <select
                    value={formData.exception_type}
                    onChange={(e) => setFormData({ ...formData, exception_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="budget">Budget</option>
                    <option value="schedule">Schedule</option>
                    <option value="scope">Scope</option>
                    <option value="quality">Quality</option>
                    <option value="risk">Risk</option>
                    <option value="combined">Combined</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Solution Approach *</label>
                  <select
                    value={formData.solution_approach}
                    onChange={(e) => setFormData({ ...formData, solution_approach: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="recovery">Recovery</option>
                    <option value="re-baseline">Re-baseline</option>
                    <option value="scope-reduction">Scope Reduction</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'exception' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Exception Description *</label>
                <textarea
                  value={formData.exception_description}
                  onChange={(e) => setFormData({ ...formData, exception_description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe the exception situation..."
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Exception Cause</label>
                <textarea
                  value={formData.exception_cause}
                  onChange={(e) => setFormData({ ...formData, exception_cause: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="What caused this exception?"
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Tolerance Breach Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Tolerance Type</label>
                    <select
                      value={formData.tolerance_type}
                      onChange={(e) => setFormData({ ...formData, tolerance_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="time">Time</option>
                      <option value="cost">Cost</option>
                      <option value="scope">Scope</option>
                      <option value="quality">Quality</option>
                      <option value="benefit">Benefit</option>
                      <option value="risk">Risk</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Tolerance Threshold</label>
                    <input
                      type="text"
                      value={formData.tolerance_threshold}
                      onChange={(e) => setFormData({ ...formData, tolerance_threshold: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., ±10%"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Actual Value</label>
                    <input
                      type="text"
                      value={formData.actual_value}
                      onChange={(e) => setFormData({ ...formData, actual_value: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., 15%"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Variance Amount</label>
                    <input
                      type="text"
                      value={formData.variance_amount}
                      onChange={(e) => setFormData({ ...formData, variance_amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., +5%"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'solution' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Current Status</label>
                <textarea
                  value={formData.current_status}
                  onChange={(e) => setFormData({ ...formData, current_status: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Current situation..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Proposed Solution</label>
                <textarea
                  value={formData.proposed_solution}
                  onChange={(e) => setFormData({ ...formData, proposed_solution: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Describe the proposed solution..."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Recovery Actions</label>
                <textarea
                  value={formData.recovery_actions}
                  onChange={(e) => setFormData({ ...formData, recovery_actions: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Specific actions to recover..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Additional Time Required (days)</label>
                  <input
                    type="number"
                    value={formData.additional_time_required_days}
                    onChange={(e) => setFormData({ ...formData, additional_time_required_days: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Revised Completion Date</label>
                  <input
                    type="date"
                    value={formData.revised_completion_date}
                    onChange={(e) => setFormData({ ...formData, revised_completion_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Additional Budget Required ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.additional_budget_required}
                    onChange={(e) => setFormData({ ...formData, additional_budget_required: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Revised Total Budget ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.revised_budget}
                    onChange={(e) => setFormData({ ...formData, revised_budget: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'impact' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Impact on Business Case</label>
                  <textarea
                    value={formData.impact_on_business_case}
                    onChange={(e) => setFormData({ ...formData, impact_on_business_case: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Impact on Project Objectives</label>
                  <textarea
                    value={formData.impact_on_project_objectives}
                    onChange={(e) => setFormData({ ...formData, impact_on_project_objectives: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Options Analysis */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Options Analysis</h3>

                {[1, 2, 3].map((num) => (
                  <div key={num} className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="radio"
                        name="recommended_option"
                        value={num}
                        checked={formData.recommended_option === num}
                        onChange={() => setFormData({ ...formData, recommended_option: num })}
                        className="h-4 w-4 text-blue-600"
                      />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Option {num}</h4>
                    </div>
                    <div className="space-y-3 ml-7">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Description</label>
                        <textarea
                          value={formData[`option_${num}_description`]}
                          onChange={(e) => setFormData({ ...formData, [`option_${num}_description`]: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder={`Describe option ${num}...`}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Pros & Cons</label>
                        <textarea
                          value={formData[`option_${num}_pros_cons`]}
                          onChange={(e) => setFormData({ ...formData, [`option_${num}_pros_cons`]: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="List pros and cons..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'approval' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <option value="implemented">Implemented</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Implementation Status</label>
                  <select
                    value={formData.implementation_status}
                    onChange={(e) => setFormData({ ...formData, implementation_status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
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
