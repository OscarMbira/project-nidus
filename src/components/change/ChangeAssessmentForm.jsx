import { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { X, FileText, DollarSign, Clock, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { createChangeAssessment, updateChangeAssessment } from '../../services/changeManagementService';

export default function ChangeAssessmentForm({ projectId, changeRequestId, assessment, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');
  const [formData, setFormData] = useState({
    assessment_date: assessment?.assessment_date || new Date().toISOString().split('T')[0],
    impact_summary: assessment?.impact_summary || '',
    impact_level: assessment?.impact_level || 'medium',

    // Schedule Impact
    schedule_impact_description: assessment?.schedule_impact_description || '',
    schedule_impact_days: assessment?.schedule_impact_days || 0,
    schedule_impact_level: assessment?.schedule_impact_level || 'none',
    new_completion_date: assessment?.new_completion_date || '',

    // Cost Impact
    cost_impact_description: assessment?.cost_impact_description || '',
    cost_impact_amount: assessment?.cost_impact_amount || 0,
    cost_impact_level: assessment?.cost_impact_level || 'none',
    cost_breakdown: assessment?.cost_breakdown || '',
    funding_source: assessment?.funding_source || '',

    // Scope Impact
    scope_impact_description: assessment?.scope_impact_description || '',
    scope_impact_level: assessment?.scope_impact_level || 'none',
    scope_baseline_affected: assessment?.scope_baseline_affected || false,

    // Quality Impact
    quality_impact_description: assessment?.quality_impact_description || '',
    quality_impact_level: assessment?.quality_impact_level || 'none',

    // Resource Impact
    resource_impact_description: assessment?.resource_impact_description || '',
    resource_impact_level: assessment?.resource_impact_level || 'none',
    resource_hours_required: assessment?.resource_hours_required || 0,

    // Risk Impact
    risk_impact_description: assessment?.risk_impact_description || '',
    risk_mitigation_required: assessment?.risk_mitigation_required || false,

    // Feasibility
    feasibility_assessment: assessment?.feasibility_assessment || '',
    feasibility_rating: assessment?.feasibility_rating || 'feasible',
    constraints: assessment?.constraints || '',

    // Recommendation
    recommendation: assessment?.recommendation || 'approve',
    recommendation_rationale: assessment?.recommendation_rationale || '',
    conditions: assessment?.conditions || '',

    // Implementation
    estimated_effort_hours: assessment?.estimated_effort_hours || 0,
    estimated_duration_days: assessment?.estimated_duration_days || 0,
    implementation_complexity: assessment?.implementation_complexity || 'medium'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const assessmentData = {
        change_request_id: changeRequestId,
        project_id: projectId,
        ...formData
      };

      if (assessment) {
        assessmentData.updated_by = user.id;
        await updateChangeAssessment(assessment.id, assessmentData);
      } else {
        assessmentData.assessed_by = user.id;
        assessmentData.created_by = user.id;
        await createChangeAssessment(assessmentData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving assessment:', error);
      alert('Error saving assessment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'cost-schedule', label: 'Cost & Schedule', icon: DollarSign },
    { id: 'scope-quality', label: 'Scope & Quality', icon: Target },
    { id: 'resources', label: 'Resources & Risks', icon: AlertTriangle },
    { id: 'recommendation', label: 'Recommendation', icon: TrendingUp }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'summary':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Assessment Date *
              </label>
              <input
                type="date"
                value={formData.assessment_date}
                onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Overall Impact Level *
              </label>
              <select
                value={formData.impact_level}
                onChange={(e) => setFormData({ ...formData, impact_level: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="negligible">Negligible</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Impact Summary *
              </label>
              <textarea
                value={formData.impact_summary}
                onChange={(e) => setFormData({ ...formData, impact_summary: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Overall summary of the change impact..."
                required
              />
            </div>
          </div>
        );

      case 'cost-schedule':
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Schedule Impact
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Impact Level *
                    </label>
                    <select
                      value={formData.schedule_impact_level}
                      onChange={(e) => setFormData({ ...formData, schedule_impact_level: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="none">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Schedule Impact (Days)
                    </label>
                    <input
                      type="number"
                      value={formData.schedule_impact_days}
                      onChange={(e) => setFormData({ ...formData, schedule_impact_days: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Schedule Impact Description
                  </label>
                  <textarea
                    value={formData.schedule_impact_description}
                    onChange={(e) => setFormData({ ...formData, schedule_impact_description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe schedule impact..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    New Completion Date
                  </label>
                  <input
                    type="date"
                    value={formData.new_completion_date}
                    onChange={(e) => setFormData({ ...formData, new_completion_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Cost Impact
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Impact Level *
                    </label>
                    <select
                      value={formData.cost_impact_level}
                      onChange={(e) => setFormData({ ...formData, cost_impact_level: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="none">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Cost Impact Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cost_impact_amount}
                      onChange={(e) => setFormData({ ...formData, cost_impact_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Cost Impact Description
                  </label>
                  <textarea
                    value={formData.cost_impact_description}
                    onChange={(e) => setFormData({ ...formData, cost_impact_description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe cost impact..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Funding Source
                  </label>
                  <input
                    type="text"
                    value={formData.funding_source}
                    onChange={(e) => setFormData({ ...formData, funding_source: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Where will funding come from?"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'scope-quality':
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Scope Impact
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Scope Impact Level *
                  </label>
                  <select
                    value={formData.scope_impact_level}
                    onChange={(e) => setFormData({ ...formData, scope_impact_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.scope_baseline_affected}
                      onChange={(e) => setFormData({ ...formData, scope_baseline_affected: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Scope Baseline Affected
                    </span>
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Scope Impact Description
                  </label>
                  <textarea
                    value={formData.scope_impact_description}
                    onChange={(e) => setFormData({ ...formData, scope_impact_description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe scope impact..."
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quality Impact
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Quality Impact Level *
                  </label>
                  <select
                    value={formData.quality_impact_level}
                    onChange={(e) => setFormData({ ...formData, quality_impact_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Quality Impact Description
                  </label>
                  <textarea
                    value={formData.quality_impact_description}
                    onChange={(e) => setFormData({ ...formData, quality_impact_description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe quality impact..."
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Resource Impact
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Impact Level *
                    </label>
                    <select
                      value={formData.resource_impact_level}
                      onChange={(e) => setFormData({ ...formData, resource_impact_level: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    >
                      <option value="none">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Resource Hours Required
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.resource_hours_required}
                      onChange={(e) => setFormData({ ...formData, resource_hours_required: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Resource Impact Description
                  </label>
                  <textarea
                    value={formData.resource_impact_description}
                    onChange={(e) => setFormData({ ...formData, resource_impact_description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe resource impact..."
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Risk Impact
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.risk_mitigation_required}
                      onChange={(e) => setFormData({ ...formData, risk_mitigation_required: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Risk Mitigation Required
                    </span>
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Risk Impact Description
                  </label>
                  <textarea
                    value={formData.risk_impact_description}
                    onChange={(e) => setFormData({ ...formData, risk_impact_description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe risk impact and mitigation needs..."
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'recommendation':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Feasibility Rating *
              </label>
              <select
                value={formData.feasibility_rating}
                onChange={(e) => setFormData({ ...formData, feasibility_rating: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="feasible">Feasible</option>
                <option value="challenging">Challenging</option>
                <option value="difficult">Difficult</option>
                <option value="not-feasible">Not Feasible</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Feasibility Assessment
              </label>
              <textarea
                value={formData.feasibility_assessment}
                onChange={(e) => setFormData({ ...formData, feasibility_assessment: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Assess technical and practical feasibility..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Implementation Complexity
                </label>
                <select
                  value={formData.implementation_complexity}
                  onChange={(e) => setFormData({ ...formData, implementation_complexity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="very-high">Very High</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Estimated Effort (Hours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.estimated_effort_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_effort_hours: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Estimated Duration (Days)
                </label>
                <input
                  type="number"
                  value={formData.estimated_duration_days}
                  onChange={(e) => setFormData({ ...formData, estimated_duration_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Recommendation *
              </label>
              <select
                value={formData.recommendation}
                onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="approve">Approve</option>
                <option value="approve-with-conditions">Approve with Conditions</option>
                <option value="reject">Reject</option>
                <option value="defer">Defer</option>
                <option value="request-more-info">Request More Information</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Recommendation Rationale *
              </label>
              <textarea
                value={formData.recommendation_rationale}
                onChange={(e) => setFormData({ ...formData, recommendation_rationale: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Justify your recommendation..."
                required
              />
            </div>

            {formData.recommendation === 'approve-with-conditions' && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Conditions
                </label>
                <textarea
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="List conditions for approval..."
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {assessment ? 'Edit Change Assessment' : 'Create Change Assessment'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Comprehensive impact analysis and recommendation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <nav className="flex overflow-x-auto">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-4 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeSection === section.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">{renderSection()}</div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
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
              {loading ? 'Saving...' : assessment ? 'Update Assessment' : 'Create Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
