/**
 * Benefits Review Plan Form Component
 * Main form for creating/editing Benefits Review Plans
 */

import { useState, useEffect } from 'react';
import { FileText, X, Save, Calendar, User, Target, Users, DollarSign, BarChart3, AlertTriangle, CheckCircle } from 'lucide-react';
import { saveBenefitsReviewPlan } from '../../services/benefitsReviewPlanService';
import { platformDb, supabase } from '../../services/supabaseClient';

export default function BenefitsReviewPlanForm({ plan, projectId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    plan_title: '',
    document_ref: '',
    version_number: '1.0',
    release: '',
    plan_date: new Date().toISOString().split('T')[0],
    author_user_id: '',
    owner_user_id: '',
    client: '',
    scope_description: '',
    benefits_coverage_notes: '',
    accountability_description: '',
    measurement_approach: '',
    measurement_timing_rationale: '',
    resources_description: '',
    estimated_review_effort_hours: null,
    estimated_review_cost: null,
    review_cost_currency: 'USD',
    baseline_measures_description: '',
    baseline_recording_date: null,
    baseline_source: '',
    performance_review_approach: '',
    performance_review_frequency: '',
    performance_review_criteria: '',
    dis_benefits_included: false,
    dis_benefits_description: '',
    status: 'draft',
    document_location: '',
    document_url: '',
    project_id: projectId || null,
    programme_id: null,
    business_case_id: null,
  });

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('header');

  useEffect(() => {
    if (plan) {
      setFormData({
        ...plan,
        plan_date: plan.plan_date || new Date().toISOString().split('T')[0],
      });
    }
    fetchLookupData();
  }, [plan, projectId]);

  const fetchLookupData = async () => {
    try {
      const [usersData, projectsData, programmesData] = await Promise.all([
        platformDb
          .from('users')
          .select('id, email, full_name')
          .eq('is_deleted', false)
          .order('full_name', { ascending: true }),
        platformDb
          .from('projects')
          .select('id, project_name, project_code')
          .eq('is_deleted', false)
          .order('project_name', { ascending: true }),
        platformDb
          .from('programmes')
          .select('id, programme_name, programme_code')
          .eq('is_deleted', false)
          .order('programme_name', { ascending: true }),
      ]);

      if (usersData.data) setUsers(usersData.data);
      if (projectsData.data) setProjects(projectsData.data);
      if (programmesData.data) setProgrammes(programmesData.data);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value ? parseFloat(value) : null) : value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = {
        ...formData,
        estimated_review_effort_hours: formData.estimated_review_effort_hours || null,
        estimated_review_cost: formData.estimated_review_cost || null,
        baseline_recording_date: formData.baseline_recording_date || null,
        programme_id: formData.programme_id || null,
        business_case_id: formData.business_case_id || null,
      };

      await saveBenefitsReviewPlan(submitData, plan?.id);
      onSave();
    } catch (error) {
      console.error('Error saving benefits review plan:', error);
      alert('Error saving plan: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'header', label: 'Document Header', icon: FileText },
    { id: 'scope', label: 'Scope', icon: Target },
    { id: 'accountability', label: 'Accountability', icon: Users },
    { id: 'measurement', label: 'Measurement', icon: BarChart3 },
    { id: 'resources', label: 'Resources', icon: DollarSign },
    { id: 'baseline', label: 'Baseline', icon: Calendar },
    { id: 'performance', label: 'Performance Review', icon: CheckCircle },
    { id: 'disbenefits', label: 'Dis-benefits', icon: AlertTriangle },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'header':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plan Title *
                </label>
                <input
                  type="text"
                  name="plan_title"
                  value={formData.plan_title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Benefits Review Plan - [Project Name]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Reference
                </label>
                <input
                  type="text"
                  name="document_ref"
                  value={formData.document_ref}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="BRP-2026-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Version Number
                </label>
                <input
                  type="text"
                  name="version_number"
                  value={formData.version_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Release
                </label>
                <input
                  type="text"
                  name="release"
                  value={formData.release}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plan Date *
                </label>
                <input
                  type="date"
                  name="plan_date"
                  value={formData.plan_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Author *
                </label>
                <select
                  name="author_user_id"
                  value={formData.author_user_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select author...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Owner
                </label>
                <select
                  name="owner_user_id"
                  value={formData.owner_user_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select owner...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client
                </label>
                <input
                  type="text"
                  name="client"
                  value={formData.client}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {!projectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project
                  </label>
                  <select
                    name="project_id"
                    value={formData.project_id || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select project...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.project_name} ({project.project_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Programme (Optional)
                </label>
                <select
                  name="programme_id"
                  value={formData.programme_id || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select programme...</option>
                  {programmes.map(prog => (
                    <option key={prog.id} value={prog.id}>
                      {prog.programme_name} ({prog.programme_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="draft">Draft</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'scope':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                3. Scope Description
              </label>
              <textarea
                name="scope_description"
                value={formData.scope_description}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe what benefits are to be measured..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Benefits Coverage Notes
              </label>
              <textarea
                name="benefits_coverage_notes"
                value={formData.benefits_coverage_notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Notes on which benefits are covered..."
              />
            </div>
          </div>
        );

      case 'accountability':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                4. Accountability Description
              </label>
              <textarea
                name="accountability_description"
                value={formData.accountability_description}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe who is accountable for the expected benefits..."
              />
            </div>
          </div>
        );

      case 'measurement':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                5. Benefits Measurement Approach
              </label>
              <textarea
                name="measurement_approach"
                value={formData.measurement_approach}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe how to measure achievement of expected benefits..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Measurement Timing Rationale
              </label>
              <textarea
                name="measurement_timing_rationale"
                value={formData.measurement_timing_rationale}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe suitable timing for measurement, together with reasons..."
              />
            </div>
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                6. Resources Description
              </label>
              <textarea
                name="resources_description"
                value={formData.resources_description}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe what resources are needed to carry out the review work..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Effort (Hours)
                </label>
                <input
                  type="number"
                  name="estimated_review_effort_hours"
                  value={formData.estimated_review_effort_hours || ''}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Cost
                </label>
                <input
                  type="number"
                  name="estimated_review_cost"
                  value={formData.estimated_review_cost || ''}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  name="review_cost_currency"
                  value={formData.review_cost_currency}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AUD">AUD</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'baseline':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                7. Baseline Measures Description
              </label>
              <textarea
                name="baseline_measures_description"
                value={formData.baseline_measures_description}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe baseline measures from which improvements will be calculated..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Baseline Recording Date
                </label>
                <input
                  type="date"
                  name="baseline_recording_date"
                  value={formData.baseline_recording_date || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Baseline Source
                </label>
                <input
                  type="text"
                  name="baseline_source"
                  value={formData.baseline_source}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Q4 2025 Financial Reports"
                />
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                8. Performance Review Approach
              </label>
              <textarea
                name="performance_review_approach"
                value={formData.performance_review_approach}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe how performance of the project product will be reviewed..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Frequency
                </label>
                <select
                  name="performance_review_frequency"
                  value={formData.performance_review_frequency}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select frequency...</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                  <option value="stage_end">End of Stage</option>
                  <option value="project_end">End of Project</option>
                  <option value="on_demand">On Demand</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Criteria
                </label>
                <textarea
                  name="performance_review_criteria"
                  value={formData.performance_review_criteria}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Criteria for performance review..."
                />
              </div>
            </div>
          </div>
        );

      case 'disbenefits':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="dis_benefits_included"
                checked={formData.dis_benefits_included}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded border-gray-300"
              />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Dis-benefits Considered for Measurement and Review
              </label>
            </div>

            {formData.dis_benefits_included && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dis-benefits Description
                </label>
                <textarea
                  name="dis_benefits_description"
                  value={formData.dis_benefits_description}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Describe how dis-benefits will be measured and reviewed..."
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan ? 'Edit Benefits Review Plan' : 'Create Benefits Review Plan'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Navigation */}
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

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderSection()}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.plan_title}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
