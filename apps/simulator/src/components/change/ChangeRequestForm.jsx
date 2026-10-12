import { useState, useEffect } from 'react';
import { simDb, platformDb } from '@nidus/supabase';
import { FileText, AlertTriangle, Target, TrendingUp, BarChart3, CheckSquare } from 'lucide-react';
import { createChangeRequest, updateChangeRequest, fetchChangeAssessment, createChangeAssessment, updateChangeAssessment } from '../../services/changeManagementService';
import FormSurface from '@nidus/ui/FormSurface';
import InheritedChangeRequestFields from '../../features/local-data-extensions/components/InheritedChangeRequestFields';
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution';
import { getSimProjectMembers } from '../../services/sim/simProjectMembershipService';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import MultiLineListInput from '@nidus/ui/MultiLineListInput';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';

import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import SelectField from '@nidus/ui/SelectField'
import { getPracticeStakeholders } from '../../services/sim/practiceStakeholderService'
import {
  addChangeRequestorOption,
  buildRequestorSelectOptions,
  listChangeRequestorOptions,
} from '../../services/changeRequestorCatalogueService'
export default function ChangeRequestForm({
  projectId,
  request,
  onClose,
  onSuccess,
  variant = 'modal',
  accountId: accountIdProp = null,
  backLabel = null,
}) {
  const [accountId, setAccountId] = useState(accountIdProp);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');
  const [boards, setBoards] = useState([]);
  const [formData, setFormData] = useState({
    change_title: request?.change_title || '',
    change_description: request?.change_description || '',
    change_category: request?.change_category || 'scope',
    change_type: request?.change_type || 'enhancement',
    reason_for_change: request?.reason_for_change || '',
    business_rationale: request?.business_rationale || '',
    current_situation: request?.current_situation || '',
    proposed_solution: request?.proposed_solution || '',
    alternative_solutions: request?.alternative_solutions || '',
    impact_summary: request?.impact_summary || '',
    priority: request?.priority || 'medium',
    urgency: request?.urgency || 'medium',
    business_criticality: request?.business_criticality || 'medium',
    submission_date: request?.submission_date || new Date().toISOString().split('T')[0],
    requestor_name: request?.requestor_name || '',
    requestor_organization: request?.requestor_organization || '',
    change_board_id: request?.change_board_id || '',
    owner_user_id: request?.owner_user_id || '',
    current_approver_user_id: request?.current_approver_user_id || '',
    status_reason: request?.status_reason || '',
    notes: request?.notes || ''
  });
  const [auditUserLabels, setAuditUserLabels] = useState({});
  const [members, setMembers] = useState([]);
  const [requestorSources, setRequestorSources] = useState({ names: [], organizations: [] });
  const [requestorError, setRequestorError] = useState('');
  const [assessment, setAssessment] = useState(null);
  const [assessmentSaving, setAssessmentSaving] = useState(false);
  const [assessmentData, setAssessmentData] = useState({
    impact_level: 'medium',
    impact_summary: '',
    schedule_impact_level: 'none',
    schedule_impact_description: '',
    cost_impact_level: 'none',
    cost_impact_description: '',
    scope_impact_level: 'none',
    scope_impact_description: '',
    quality_impact_level: 'none',
    quality_impact_description: '',
    resource_impact_level: 'none',
    resource_impact_description: '',
    risk_impact_description: '',
    feasibility_rating: 'feasible',
    recommendation: 'approve',
    recommendation_rationale: '',
    conditions: '',
  });

  useEffect(() => {
    fetchBoards();
    fetchMembers();
  }, [projectId]);

  useEffect(() => {
    if (!request?.id) return;
    let cancelled = false;
    fetchChangeAssessment(request.id).then((row) => {
      if (cancelled) return;
      setAssessment(row || null);
      if (row) {
        setAssessmentData((prev) => ({
          ...prev,
          impact_level: row.impact_level || 'medium',
          impact_summary: row.impact_summary || '',
          schedule_impact_level: row.schedule_impact_level || 'none',
          schedule_impact_description: row.schedule_impact_description || '',
          cost_impact_level: row.cost_impact_level || 'none',
          cost_impact_description: row.cost_impact_description || '',
          scope_impact_level: row.scope_impact_level || 'none',
          scope_impact_description: row.scope_impact_description || '',
          quality_impact_level: row.quality_impact_level || 'none',
          quality_impact_description: row.quality_impact_description || '',
          resource_impact_level: row.resource_impact_level || 'none',
          resource_impact_description: row.resource_impact_description || '',
          risk_impact_description: row.risk_impact_description || '',
          feasibility_rating: row.feasibility_rating || 'feasible',
          recommendation: row.recommendation || 'approve',
          recommendation_rationale: row.recommendation_rationale || '',
          conditions: row.conditions || '',
        }));
      }
    });
    return () => { cancelled = true; };
  }, [request?.id]);

  const fetchMembers = async () => {
    if (!projectId) return;
    const { data } = await getSimProjectMembers(projectId);
    setMembers(data || []);
  };

  useEffect(() => {
    if (activeSection !== 'audit' || !request) return;
    let cancelled = false;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        request.created_by,
        request.updated_by,
        request.submitted_by,
      ]);
      if (!cancelled) setAuditUserLabels(labels || {});
    })();
    return () => { cancelled = true; };
  }, [activeSection, request]);

  useEffect(() => {
    if (accountIdProp) {
      setAccountId(accountIdProp);
      return;
    }
    let cancelled = false;
    getCurrentUserAccountId().then((id) => {
      if (!cancelled) setAccountId(id);
    });
    return () => { cancelled = true; };
  }, [accountIdProp, projectId]);

  useEffect(() => {
    if (!projectId) return undefined;
    let cancelled = false;
    (async () => {
      const [stakeholders, priorResult, catalogueRows] = await Promise.all([
        getPracticeStakeholders(projectId).then((result) => result?.data || []).catch(() => []),
        simDb
          .from('practice_change_requests')
          .select('requestor_name, requestor_organization')
          .eq('practice_project_id', projectId)
          .eq('is_deleted', false)
          .limit(500)
          .then(({ data }) => data || [])
          .catch(() => []),
        listChangeRequestorOptions().catch((error) => {
          if (!cancelled) {
            const message = error?.message || '';
            setRequestorError(/does not exist|schema cache/i.test(message)
              ? 'Run SQL/v1142_change_requestor_catalogue.sql in Supabase, then refresh, before adding a new name or organisation.'
              : (message || 'Could not load saved requestor options.'));
          }
          return [];
        }),
      ]);
      if (cancelled) return;
      const savedNames = (catalogueRows || []).filter((row) => row.item_kind === 'name').map((row) => row.item_name);
      const savedOrgs = (catalogueRows || []).filter((row) => row.item_kind === 'organization').map((row) => row.item_name);
      setRequestorSources({
        names: [
          ...members.map((member) => member.profile?.full_name || member.profile?.email || member.full_name || member.email),
          ...(stakeholders || []).map((row) => row.stakeholder_name),
          ...priorResult.map((row) => row.requestor_name),
          ...savedNames,
        ],
        organizations: [
          ...(stakeholders || []).map((row) => row.stakeholder_organization),
          ...priorResult.map((row) => row.requestor_organization),
          ...savedOrgs,
        ],
      });
    })();
    return () => { cancelled = true; };
  }, [projectId, members]);

  const saveRequestorOption = async (kind, name) => {
    setRequestorError('');
    try {
      const saved = await addChangeRequestorOption(kind, name);
      const field = kind === 'name' ? 'requestor_name' : 'requestor_organization';
      const sourceKey = kind === 'name' ? 'names' : 'organizations';
      setFormData((prev) => ({ ...prev, [field]: saved }));
      setRequestorSources((prev) => ({
        ...prev,
        [sourceKey]: [...prev[sourceKey], saved],
      }));
    } catch (error) {
      setRequestorError(error?.message || 'Could not save this option.');
    }
  };

  const fetchBoards = async () => {
    try {
      const { data, error } = await simDb
        .from('practice_change_board')
        .select('id, board_name')
        .eq('practice_project_id', projectId)
        .eq('status', 'active')
        .eq('is_deleted', false);

      if (error) throw error;
      setBoards(data || []);
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: { user } } = await simDb.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const requestData = {
        project_id: projectId,
        change_title: formData.change_title,
        change_description: formData.change_description,
        change_category: formData.change_category,
        change_type: formData.change_type,
        reason_for_change: formData.reason_for_change,
        business_rationale: formData.business_rationale || null,
        current_situation: formData.current_situation,
        proposed_solution: formData.proposed_solution,
        alternative_solutions: formData.alternative_solutions,
        impact_summary: formData.impact_summary || null,
        priority: formData.priority,
        urgency: formData.urgency,
        business_criticality: formData.business_criticality,
        submission_date: formData.submission_date,
        requestor_name: formData.requestor_name,
        requestor_organization: formData.requestor_organization,
        change_board_id: formData.change_board_id || null,
        owner_user_id: formData.owner_user_id || user.id,
        current_approver_user_id: formData.current_approver_user_id || null,
        notes: formData.notes,
        status: request ? request.status : 'submitted'
      };

      if (request) {
        requestData.status_reason = formData.status_reason || null;
        requestData.updated_by = user.id;
        await updateChangeRequest(request.id, requestData);
      } else {
        requestData.submitted_by = user.id;
        requestData.created_by = user.id;
        await createChangeRequest(requestData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving change request:', error);
      alert('Error saving change request: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAssessment = async () => {
    if (!request?.id) return;
    try {
      setAssessmentSaving(true);
      const payload = { change_request_id: request.id, project_id: projectId, ...assessmentData };

      if (assessment) {
        const updated = await updateChangeAssessment(assessment.id, payload);
        setAssessment(updated);
      } else {
        payload.assessment_date = new Date().toISOString().split('T')[0];
        const created = await createChangeAssessment(payload);
        setAssessment(created);
      }
    } catch (error) {
      console.error('Error saving assessment:', error);
      alert('Error saving assessment: ' + error.message);
    } finally {
      setAssessmentSaving(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'details', label: 'Change Details', icon: AlertTriangle },
    { id: 'solutions', label: 'Solutions', icon: Target },
    { id: 'priority', label: 'Priority & Impact', icon: TrendingUp },
    { id: 'assessment', label: 'Assessment', icon: BarChart3 },
    { id: 'decision', label: 'Decision', icon: CheckSquare }
  ];

  const impactLevelOptions = (
    <>
      <option value="none">None</option>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </>
  );

  const renderAssessmentSaveBar = () => (
    <div className="flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={handleSaveAssessment}
        disabled={assessmentSaving}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {assessmentSaving ? 'Saving...' : assessment ? 'Update Assessment & Decision' : 'Save Assessment & Decision'}
      </button>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Change Title *
                </label>
                <input
                  type="text"
                  value={formData.change_title}
                  onChange={(e) => setFormData({ ...formData, change_title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Brief title describing the change..."
                  required
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Change Description *
                </label>
                <textarea
                  value={formData.change_description}
                  onChange={(e) => setFormData({ ...formData, change_description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Detailed description of the proposed change..."
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Category *
                </label>
                <select
                  value={formData.change_category}
                  onChange={(e) => setFormData({ ...formData, change_category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="scope">Scope</option>
                  <option value="schedule">Schedule</option>
                  <option value="budget">Budget</option>
                  <option value="quality">Quality</option>
                  <option value="resource">Resource</option>
                  <option value="risk">Risk</option>
                  <option value="technical">Technical</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Type *
                </label>
                <select
                  value={formData.change_type}
                  onChange={(e) => setFormData({ ...formData, change_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="corrective">Corrective Action</option>
                  <option value="preventive">Preventive Action</option>
                  <option value="enhancement">Enhancement</option>
                  <option value="defect-fix">Defect Fix</option>
                  <option value="regulatory">Regulatory Requirement</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Submission Date *
                </label>
                <input
                  type="date"
                  value={formData.submission_date}
                  onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Change Board
                </label>
                <select
                  value={formData.change_board_id}
                  onChange={(e) => setFormData({ ...formData, change_board_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select board...</option>
                  {boards.map((board, index) => (
                    <option key={board.id} value={board.id}>
                      {board.board_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Requestor Name
                </label>
                <SelectField
                  value={formData.requestor_name}
                  onChange={(value) => setFormData({ ...formData, requestor_name: value || '' })}
                  options={buildRequestorSelectOptions(requestorSources.names, formData.requestor_name)}
                  placeholder="Search project people and stakeholders"
                  searchPlaceholder="Search requestors..."
                  forceSearchable
                  allowCustom
                  customValueActions={[{
                    key: 'add-requestor-name',
                    label: (term) => `Add "${term}" for this organisation`,
                    onSelect: (term) => saveRequestorOption('name', term),
                  }]}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Requestor Organization
                </label>
                <SelectField
                  value={formData.requestor_organization}
                  onChange={(value) => setFormData({ ...formData, requestor_organization: value || '' })}
                  options={buildRequestorSelectOptions(requestorSources.organizations, formData.requestor_organization)}
                  placeholder="Search departments or organisations"
                  searchPlaceholder="Search organisations..."
                  forceSearchable
                  allowCustom
                  customValueActions={[{
                    key: 'add-requestor-organization',
                    label: (term) => `Add "${term}" for this organisation`,
                    onSelect: (term) => saveRequestorOption('organization', term),
                  }]}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {requestorError && (
                  <p className="mt-2 text-sm text-red-700 dark:text-red-300">{requestorError}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Owner
                </label>
                <select
                  value={formData.owner_user_id}
                  onChange={(e) => setFormData({ ...formData, owner_user_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Me (defaults to the submitter)</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.email || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Approver
                </label>
                <select
                  value={formData.current_approver_user_id}
                  onChange={(e) => setFormData({ ...formData, current_approver_user_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Not yet assigned</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile?.full_name || m.profile?.email || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Reason for Change *
              </label>
              <textarea
                value={formData.reason_for_change}
                onChange={(e) => setFormData({ ...formData, reason_for_change: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Why is this change necessary?"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Business rationale
              </label>
              <MultiLineListInput
                viewModeId="change-request-business-rationale"
                id="business_rationale"
                value={formData.business_rationale}
                onChange={(value) => setFormData({ ...formData, business_rationale: value })}
                placeholder="One business reason"
                ariaLabelPrefix="business rationale"
                itemColumnLabel="Business rationale"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Current Situation *
              </label>
              <textarea
                value={formData.current_situation}
                onChange={(e) => setFormData({ ...formData, current_situation: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe the current state or problem..."
                required
              />
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Change Justification Guidelines
              </h4>
              <ul className="text-sm text-gray-800 dark:text-gray-100 space-y-1 list-disc list-inside marker:text-gray-700 dark:marker:text-gray-100">
                <li>Clearly articulate the business need</li>
                <li>Explain impact of not making the change</li>
                <li>Reference any dependencies or constraints</li>
                <li>Include supporting data or evidence</li>
              </ul>
            </div>
          </div>
        );

      case 'solutions':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Proposed Solution *
              </label>
              <textarea
                value={formData.proposed_solution}
                onChange={(e) => setFormData({ ...formData, proposed_solution: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Detailed description of the proposed solution..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Alternative Solutions
              </label>
              <MultiLineListInput
                viewModeId="change-request-alternative-solutions"
                id="alternative_solutions"
                value={formData.alternative_solutions}
                onChange={(value) => setFormData({ ...formData, alternative_solutions: value })}
                placeholder="Other options considered..."
                ariaLabelPrefix="alternative solution"
                itemColumnLabel="Alternative solution"
              />
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">
                Solution Description Best Practices
              </h4>
              <ul className="text-sm text-green-800 dark:text-green-400 space-y-1 list-disc list-inside">
                <li>Be specific about what will be changed</li>
                <li>Include implementation approach</li>
                <li>Identify resources required</li>
                <li>Estimate time and cost impacts</li>
                <li>Consider alternative approaches</li>
              </ul>
            </div>
          </div>
        );

      case 'priority':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Priority *
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Urgency *
                </label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="immediate">Immediate</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Business Criticality *
                </label>
                <select
                  value={formData.business_criticality}
                  onChange={(e) => setFormData({ ...formData, business_criticality: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Impact
              </label>
              <MultiLineListInput
                viewModeId="change-request-impact"
                id="impact_summary"
                value={formData.impact_summary}
                onChange={(value) => setFormData({ ...formData, impact_summary: value })}
                placeholder="What is affected if this change goes ahead — or doesn't?"
                ariaLabelPrefix="impact"
                itemColumnLabel="Impact"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                A quick summary at submission time. A full multi-dimensional impact analysis happens later, in Assessment.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Additional Notes
              </label>
              <MultiLineListInput
                viewModeId="change-request-additional-notes"
                id="notes"
                value={formData.notes}
                onChange={(value) => setFormData({ ...formData, notes: value })}
                placeholder="Any additional information..."
                ariaLabelPrefix="additional note"
                itemColumnLabel="Additional note"
              />
            </div>

            {request && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Decision Notes
                </label>
                <MultiLineListInput
                  viewModeId="change-request-decision-notes"
                  id="status_reason"
                  value={formData.status_reason}
                  onChange={(value) => setFormData({ ...formData, status_reason: value })}
                  placeholder="Why the status is what it is..."
                  ariaLabelPrefix="decision note"
                  itemColumnLabel="Decision note"
                />
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                Priority Assessment Guide
              </h4>
              <div className="text-sm text-yellow-800 dark:text-yellow-400 space-y-2">
                <p><strong>Critical/Immediate:</strong> Blocking work, safety issue, compliance requirement</p>
                <p><strong>High/High:</strong> Significant impact on schedule, cost, or quality</p>
                <p><strong>Medium/Medium:</strong> Moderate impact, can be scheduled</p>
                <p><strong>Low/Low:</strong> Nice-to-have, minimal impact</p>
              </div>
            </div>
          </div>
        );

      case 'assessment':
        if (!request?.id) {
          return (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Assessment becomes available after this change request is submitted.
            </p>
          );
        }
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">What will it affect?</h4>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Assess scope, schedule, cost, quality, resources, and risk.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Overall Impact Level
                </label>
                <select
                  value={assessmentData.impact_level}
                  onChange={(e) => setAssessmentData({ ...assessmentData, impact_level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="negligible">Negligible</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Impact Summary
              </label>
              <textarea
                value={assessmentData.impact_summary}
                onChange={(e) => setAssessmentData({ ...assessmentData, impact_summary: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Overall summary of the change impact..."
              />
            </div>

            {[
              { key: 'schedule', label: 'Schedule' },
              { key: 'cost', label: 'Cost' },
              { key: 'scope', label: 'Scope' },
              { key: 'quality', label: 'Quality' },
              { key: 'resource', label: 'Resources' },
            ].map(({ key, label }) => (
              <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    {label} Impact Level
                  </label>
                  <select
                    value={assessmentData[`${key}_impact_level`]}
                    onChange={(e) => setAssessmentData({ ...assessmentData, [`${key}_impact_level`]: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {impactLevelOptions}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    {label} Impact Description
                  </label>
                  <textarea
                    value={assessmentData[`${key}_impact_description`]}
                    onChange={(e) => setAssessmentData({ ...assessmentData, [`${key}_impact_description`]: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder={`Describe the ${label.toLowerCase()} impact...`}
                  />
                </div>
              </div>
            ))}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Risk Impact Description
              </label>
              <textarea
                value={assessmentData.risk_impact_description}
                onChange={(e) => setAssessmentData({ ...assessmentData, risk_impact_description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Describe risk impact and mitigation needs..."
              />
            </div>

            {renderAssessmentSaveBar()}
          </div>
        );

      case 'decision':
        if (!request?.id) {
          return (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Decision becomes available after this change request is submitted.
            </p>
          );
        }
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">What was decided?</h4>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Record approval, rejection, deferral, and conditions.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Feasibility Rating
              </label>
              <select
                value={assessmentData.feasibility_rating}
                onChange={(e) => setAssessmentData({ ...assessmentData, feasibility_rating: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="feasible">Feasible</option>
                <option value="challenging">Challenging</option>
                <option value="difficult">Difficult</option>
                <option value="not-feasible">Not Feasible</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Decision
              </label>
              <select
                value={assessmentData.recommendation}
                onChange={(e) => setAssessmentData({ ...assessmentData, recommendation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                Decision Rationale
              </label>
              <textarea
                value={assessmentData.recommendation_rationale}
                onChange={(e) => setAssessmentData({ ...assessmentData, recommendation_rationale: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Justify the decision..."
              />
            </div>

            {assessmentData.recommendation === 'approve-with-conditions' && (
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Conditions
                </label>
                <textarea
                  value={assessmentData.conditions}
                  onChange={(e) => setAssessmentData({ ...assessmentData, conditions: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="List conditions for approval..."
                />
              </div>
            )}

            {renderAssessmentSaveBar()}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <FormSurface
      variant={variant}
      title={request ? 'Edit Change Request' : 'Submit Change Request'}
      subtitle="Document and submit a change request for review"
      icon={FileText}
      onClose={onClose}
      backLabel={backLabel}
    >

        {/* Section Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-2">
          <DetailAuditTabList
            activeTab={activeSection}
            onChange={setActiveSection}
            ariaLabel="Change request sections"
            tabs={[...sections.map((s) => ({ value: s.id, label: s.label })), { value: 'audit', label: 'Audit details' }]}
          />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {activeSection === 'audit' ? (
              !request?.id ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this change request is saved.</p>
              ) : (
                <AuditDetailsPanel description="Who created or changed this change request, and how it is classified.">
                  <AuditCard title="Identity" description="How this change request is labelled and tracked.">
                    <AuditField label="Title" value={formData.change_title || request.change_title} />
                    <AuditField label="Category" value={humanizeAuditToken(formData.change_category || request.change_category)} />
                    <AuditField label="Type" value={humanizeAuditToken(formData.change_type || request.change_type)} />
                    <AuditField label="Status" value={humanizeAuditToken(request.status)} />
                  </AuditCard>
                  <AuditCard title="Classification" description="Where this change request sits.">
                    <AuditField label="Priority" value={humanizeAuditToken(formData.priority || request.priority)} />
                    <AuditField label="Urgency" value={humanizeAuditToken(formData.urgency || request.urgency)} />
                    <AuditField label="Business criticality" value={humanizeAuditToken(formData.business_criticality || request.business_criticality)} />
                    <AuditField label="Requestor" value={formData.requestor_name || request.requestor_name} />
                    <AuditField label="Submitted by" value={request.submitted_by ? auditUserLabels[request.submitted_by] || null : null} />
                  </AuditCard>
                  <AuditCard title="Record history" description="When this change request was created and last changed.">
                    <AuditField label="Created by" value={request.created_by ? auditUserLabels[request.created_by] || null : null} />
                    <AuditTimestampPair dateLabel="Created at" value={request.created_at} />
                    <AuditField label="Updated by" value={request.updated_by ? auditUserLabels[request.updated_by] || null : null} />
                    <AuditTimestampPair dateLabel="Last updated" value={request.updated_at} />
                    <AuditTimestampPair dateLabel="Submission date" value={request.submission_date || formData.submission_date} />
                  </AuditCard>
                </AuditDetailsPanel>
              )
            ) : renderSection()}
            {request?.id && accountId && projectId && (
              <InheritedChangeRequestFields
                db={simDb}
                accountId={accountId}
                projectId={projectId}
                practiceProjectId={projectId}
                changeRequestId={request.id}
                mode="edit"
              />
            )}
          </div>

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
              {loading ? 'Saving...' : request ? 'Update Request' : 'Submit Request'}
            </button>
          </div>
      </form>
    </FormSurface>
  );
}
