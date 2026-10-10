import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { FileText, CheckCircle, Calendar, TrendingUp, Target, Users } from 'lucide-react';
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext';
import { createProjectClosure, updateProjectClosure, archiveProjectClosure } from '../../../services/closingProjectService';
import { platformDb } from '@nidus/supabase';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';

import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import SelectField from '@nidus/ui/SelectField'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import { RowActionButton } from '@nidus/ui'

function approverLines(closure) {
  const list = String(closure?.approved_by_list || '').trim()
  if (list) return list
  return closure?.approved_by || ''
}

function namedUser(users, id) {
  if (!id) return ''
  const match = (users || []).find((user) => user.id === id)
  return match?.full_name || match?.email || id
}

function namedApprovers(users, value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((id) => namedUser(users, id))
    .join('\n')
}

const CLOSURE_EXPORT_SECTIONS = [
  {
    title: 'Basic Info',
    fields: [
      { key: 'closure_type', label: 'Closure Type' },
      { key: 'closure_status', label: 'Closure Status' },
      { key: 'closure_phase', label: 'Closure Phase' },
      { key: 'planned_closure_date', label: 'Planned Closure Date' },
      { key: 'actual_closure_date', label: 'Actual Closure Date' },
      { key: 'closure_reason', label: 'Closure Reason' },
    ],
  },
  {
    title: 'Performance',
    fields: [{ key: 'performance_summary', label: 'Performance Summary' }],
  },
  {
    title: 'Benefits',
    fields: [
      { key: 'benefits_transition_status', label: 'Benefits Transition Status' },
      { key: 'benefits_realization_summary', label: 'Benefits Realization Summary' },
    ],
  },
  {
    title: 'Financial closure',
    fields: [{ key: 'financial_closure_summary', label: 'Financial Closure Summary' }],
  },
  {
    title: 'Resources & Stakeholders',
    fields: [
      { key: 'resource_release_status', label: 'Resource Release Status' },
      { key: 'stakeholder_acceptance', label: 'Stakeholder Acceptance' },
      { key: 'project_board', label: 'Project Board' },
      { key: 'checklist_completion_percentage', label: 'Checklist Completion' },
    ],
  },
  {
    title: 'Prepared by',
    fields: [
      { key: 'prepared_by', label: 'Prepared By' },
      { key: 'final_approval_date', label: 'Final Approval Date' },
    ],
  },
  {
    title: 'Approval',
    fields: [{ key: 'approved_by', label: 'Approved By' }],
  },
]

function ApproverList({ users, value, onChange }) {
  const ids = String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const [pick, setPick] = useState('')
  const labelFor = (id) => {
    const match = users.find((user) => user.id === id)
    return match?.full_name || match?.email || id
  }
  const add = () => {
    if (!pick || ids.includes(pick)) return
    onChange([...ids, pick].join('\n'))
    setPick('')
  }
  const remove = (id) => {
    if (!window.confirm('Remove this approver?')) return
    onChange(ids.filter((item) => item !== id).join('\n'))
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Users className="h-4 w-4" />
        Approved By
      </label>
      {ids.length > 0 && (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
          {ids.map((id, index) => (
            <li key={id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {index + 1}. {labelFor(id)}
              </span>
              <RowActionButton variant="delete" label="Remove approver" onClick={() => remove(id)} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <SelectField
            forceSearchable
            value={pick}
            onChange={setPick}
            placeholder="Select user..."
            options={users
              .filter((user) => !ids.includes(user.id))
              .map((user) => ({ value: user.id, label: user.full_name || user.email }))}
          />
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!pick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  )
}

function ClosureListField({ label, required, viewModeId, value, onChange, placeholder, itemColumnLabel }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
        {label}{required ? ' *' : ''}
      </label>
      <MultiLineListInput
        viewModeId={viewModeId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        itemColumnLabel={itemColumnLabel}
        ariaLabelPrefix={itemColumnLabel}
      />
    </div>
  )
}

export default function ProjectClosureForm({ projectId, closure, onClose, onSuccess, initialSection = 'basic' }) {
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(initialSection);
  const [auditUserLabels, setAuditUserLabels] = useState({});
  const [archiving, setArchiving] = useState(false);
  const [archivedAt, setArchivedAt] = useState(closure?.archived_at || null);

  const handleArchive = async () => {
    if (!closure?.id || archivedAt) return;
    if (!window.confirm('Archive this project closure? This does not delete any data.')) return;
    setArchiving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const updated = await archiveProjectClosure(closure.id, user.id);
      setArchivedAt(updated?.archived_at || new Date().toISOString());
      onSuccess();
    } catch (error) {
      console.error('Error archiving project closure:', error);
      alert('Error archiving project closure: ' + error.message);
    } finally {
      setArchiving(false);
    }
  };

  useEffect(() => {
    if (activeSection !== 'audit' || !closure) return;
    let cancelled = false;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        closure.created_by,
        closure.updated_by,
      ]);
      if (!cancelled) setAuditUserLabels(labels || {});
    })();
    return () => { cancelled = true; };
  }, [activeSection, closure]);
  const [boards, setBoards] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    closure_type: closure?.closure_type || 'planned',
    closure_status: closure?.closure_status || 'initiated',
    closure_phase: closure?.closure_phase || 'preparation',
    planned_closure_date: closure?.planned_closure_date || '',
    actual_closure_date: closure?.actual_closure_date || '',
    closure_reason: closure?.closure_reason || '',
    performance_summary: closure?.performance_summary || '',
    benefits_realization_summary: closure?.benefits_realization_summary || '',
    financial_closure_summary: closure?.financial_closure_summary || '',
    resource_release_status: closure?.resource_release_status || 'not-started',
    stakeholder_acceptance: closure?.stakeholder_acceptance || 'pending',
    benefits_transition_status: closure?.benefits_transition_status || 'not_started',
    checklist_completion_percentage: closure?.checklist_completion_percentage || 0,
    final_approval_date: closure?.final_approval_date || '',
    project_board_id: closure?.project_board_id || '',
    prepared_by: closure?.prepared_by || '',
    approved_by: approverLines(closure)
  });
  const [formBaseline] = useState(() => JSON.stringify(formData));
  const [leaveAfterSave, setLeaveAfterSave] = useState(false);
  const isDirty = JSON.stringify(formData) !== formBaseline && !leaveAfterSave;
  const { confirmDiscard } = useUnsavedChangesGuard(
    isDirty && !loading,
    'You have unsaved closure changes.'
  );

  useEffect(() => {
    if (leaveAfterSave) onClose?.();
  }, [leaveAfterSave, onClose]);

  useEffect(() => {
    fetchBoards();
    fetchUsers();
  }, []);

  const fetchBoards = async () => {
    try {
      const { data, error } = await supabase
        .from('project_boards')
        .select('id, board_name')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('board_name');

      if (error) throw error;
      setBoards(data || []);
    } catch (error) {
      console.error('Error fetching boards:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const missingSection = [
      ['closure_reason', 'basic'],
      ['performance_summary', 'summary'],
      ['benefits_realization_summary', 'benefits'],
      ['financial_closure_summary', 'financial-closure'],
    ].find(([key]) => !String(formData[key] || '').trim());
    if (missingSection) {
      setActiveSection(missingSection[1]);
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const closureData = {
        project_id: projectId,
        closure_type: formData.closure_type,
        closure_status: formData.closure_status,
        closure_phase: formData.closure_phase,
        planned_closure_date: formData.planned_closure_date || null,
        actual_closure_date: formData.actual_closure_date || null,
        closure_reason: formData.closure_reason,
        performance_summary: formData.performance_summary,
        benefits_realization_summary: formData.benefits_realization_summary,
        financial_closure_summary: formData.financial_closure_summary,
        resource_release_status: formData.resource_release_status,
        stakeholder_acceptance: formData.stakeholder_acceptance,
        benefits_transition_status: formData.benefits_transition_status,
        checklist_completion_percentage: formData.checklist_completion_percentage,
        final_approval_date: formData.final_approval_date || null,
        project_board_id: formData.project_board_id || null,
        prepared_by: formData.prepared_by || null,
        approved_by: String(formData.approved_by || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0] || null,
        approved_by_list: String(formData.approved_by || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join('\n') || null,
      };

      if (closure) {
        closureData.updated_by = user.id;
        await updateProjectClosure(closure.id, closureData);
      } else {
        closureData.created_by = user.id;
        await createProjectClosure(closureData);
      }

      onSuccess?.();
      setLeaveAfterSave(true);
    } catch (error) {
      console.error('Error saving project closure:', error);
      alert('Error saving project closure: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'summary', label: 'Performance', icon: TrendingUp },
    { id: 'benefits', label: 'Benefits', icon: Target },
    { id: 'financial-closure', label: 'Financial closure', icon: Target },
    { id: 'resources', label: 'Resources & Stakeholders', icon: Users },
    { id: 'prepared-by', label: 'Prepared by', icon: Users },
    { id: 'approval', label: 'Approval', icon: CheckCircle }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Closure Type *
                </label>
                <select
                  value={formData.closure_type}
                  onChange={(e) => setFormData({ ...formData, closure_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="planned">Planned Closure</option>
                  <option value="early">Early Closure</option>
                  <option value="premature">Premature Closure</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Closure Status *
                </label>
                <select
                  value={formData.closure_status}
                  onChange={(e) => setFormData({ ...formData, closure_status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="initiated">Initiated</option>
                  <option value="in-progress">In Progress</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Closure Phase *
                </label>
                <select
                  value={formData.closure_phase}
                  onChange={(e) => setFormData({ ...formData, closure_phase: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="preparation">Preparation</option>
                  <option value="documentation">Documentation</option>
                  <option value="handover">Handover</option>
                  <option value="final-approval">Final Approval</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Project Board
                </label>
                <select
                  value={formData.project_board_id}
                  onChange={(e) => setFormData({ ...formData, project_board_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select project board...</option>
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
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="h-4 w-4" />
                  Planned Closure Date
                </label>
                <input
                  type="date"
                  value={formData.planned_closure_date}
                  onChange={(e) => setFormData({ ...formData, planned_closure_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="h-4 w-4" />
                  Actual Closure Date
                </label>
                <input
                  type="date"
                  value={formData.actual_closure_date}
                  onChange={(e) => setFormData({ ...formData, actual_closure_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <ClosureListField
              label="Closure Reason"
              required
              viewModeId="project-closure-reason"
              value={formData.closure_reason}
              onChange={(closure_reason) => setFormData({ ...formData, closure_reason })}
              placeholder="Why the project is being closed"
              itemColumnLabel="Reason"
            />
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-6">
            <ClosureListField
              label="Performance Summary"
              required
              viewModeId="project-closure-performance-summary"
              value={formData.performance_summary}
              onChange={(performance_summary) => setFormData({ ...formData, performance_summary })}
              placeholder="A performance point, achievement, or challenge"
              itemColumnLabel="Point"
            />

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Performance Summary Guidelines
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>Schedule performance against baseline</li>
                <li>Budget performance and cost variance</li>
                <li>Quality metrics and deliverable acceptance</li>
                <li>Scope completion and change management</li>
                <li>Key achievements and successes</li>
                <li>Major challenges and how they were addressed</li>
              </ul>
            </div>
          </div>
        );

      case 'benefits':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Benefits Transition Status
              </label>
              <select
                value={formData.benefits_transition_status}
                onChange={(e) => setFormData({ ...formData, benefits_transition_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Tracks handover of benefits realization ownership from the project to BAU/operations.
              </p>
            </div>

            <ClosureListField
              label="Benefits Realization Summary"
              required
              viewModeId="project-closure-benefits-summary"
              value={formData.benefits_realization_summary}
              onChange={(benefits_realization_summary) => setFormData({ ...formData, benefits_realization_summary })}
              placeholder="A benefit achieved or still being measured"
              itemColumnLabel="Benefit"
            />

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">
                Financial Closure Checklist
              </h4>
              <ul className="text-sm text-green-800 dark:text-green-400 space-y-1 list-disc list-inside">
                <li>All project costs accounted for</li>
                <li>Final budget variance documented</li>
                <li>Outstanding invoices processed</li>
                <li>Purchase orders closed</li>
                <li>Financial records archived</li>
                <li>Cost center closure completed</li>
              </ul>
            </div>
          </div>
        );

      case 'financial-closure':
        return (
          <div className="space-y-6">
            <ClosureListField
              label="Financial Closure Summary"
              required
              viewModeId="project-closure-financial-summary"
              value={formData.financial_closure_summary}
              onChange={(financial_closure_summary) => setFormData({ ...formData, financial_closure_summary })}
              placeholder="A budget, cost, or sign-off point"
              itemColumnLabel="Point"
            />
          </div>
        );

      case 'resources':
        return (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Resource Release Status *
              </label>
              <select
                value={formData.resource_release_status}
                onChange={(e) => setFormData({ ...formData, resource_release_status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="partial">Partial Release</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Stakeholder Acceptance *
              </label>
              <select
                value={formData.stakeholder_acceptance}
                onChange={(e) => setFormData({ ...formData, stakeholder_acceptance: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial Acceptance</option>
                <option value="accepted">Accepted</option>
                <option value="accepted-with-conditions">Accepted with Conditions</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Checklist Completion: {formData.checklist_completion_percentage}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={formData.checklist_completion_percentage}
                onChange={(e) => setFormData({ ...formData, checklist_completion_percentage: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2">
                Resource Release Checklist
              </h4>
              <ul className="text-sm text-purple-800 dark:text-purple-400 space-y-1 list-disc list-inside">
                <li>Team members released to new assignments</li>
                <li>Equipment and assets returned/reassigned</li>
                <li>Office space and facilities released</li>
                <li>Vendor contracts closed</li>
                <li>Software licenses deprovisioned</li>
                <li>Access rights revoked</li>
              </ul>
            </div>
          </div>
        );

      case 'prepared-by':
        return (
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="h-4 w-4" />
                Prepared By
              </label>
              <SelectField
                forceSearchable
                value={formData.prepared_by}
                onChange={(prepared_by) => setFormData({ ...formData, prepared_by })}
                placeholder="Select user..."
                options={users.map((user) => ({ value: user.id, label: user.full_name || user.email }))}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4" />
                Final Approval Date
              </label>
              <input
                type="date"
                value={formData.final_approval_date}
                onChange={(e) => setFormData({ ...formData, final_approval_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        );

      case 'approval':
        return (
          <div className="space-y-6">
            <ApproverList
              users={users}
              value={formData.approved_by}
              onChange={(approved_by) => setFormData({ ...formData, approved_by })}
            />

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                Final Approval Requirements
              </h4>
              <ul className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1 list-disc list-inside">
                <li>All project deliverables completed and accepted</li>
                <li>End Project Report prepared and reviewed</li>
                <li>Lessons Learned documented</li>
                <li>Follow-on actions defined and assigned</li>
                <li>Handover completed to operational teams</li>
                <li>Financial closure approved</li>
                <li>Stakeholder sign-off obtained</li>
              </ul>
            </div>

            {closure && (
              <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2">
                  Archive
                </h4>
                {archivedAt ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Archived on {new Date(archivedAt).toLocaleString()}.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Once closure is complete, archive this record for reference. Data is preserved — archiving does not delete anything.
                    </p>
                    <button
                      type="button"
                      onClick={handleArchive}
                      disabled={archiving}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {archiving ? 'Archiving...' : 'Archive Project Closure'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const requestClose = () => {
    confirmDiscard(() => onClose?.());
  };

  const boardName = boards.find((board) => board.id === formData.project_board_id)?.board_name || '';
  const exportRecord = {
    closure_type: humanizeAuditToken(formData.closure_type),
    closure_status: humanizeAuditToken(formData.closure_status),
    closure_phase: humanizeAuditToken(formData.closure_phase),
    planned_closure_date: formData.planned_closure_date,
    actual_closure_date: formData.actual_closure_date,
    closure_reason: formData.closure_reason,
    performance_summary: formData.performance_summary,
    benefits_transition_status: humanizeAuditToken(formData.benefits_transition_status),
    benefits_realization_summary: formData.benefits_realization_summary,
    financial_closure_summary: formData.financial_closure_summary,
    resource_release_status: humanizeAuditToken(formData.resource_release_status),
    stakeholder_acceptance: humanizeAuditToken(formData.stakeholder_acceptance),
    project_board: boardName,
    checklist_completion_percentage: `${formData.checklist_completion_percentage ?? 0}%`,
    prepared_by: namedUser(users, formData.prepared_by),
    final_approval_date: formData.final_approval_date,
    approved_by: namedApprovers(users, formData.approved_by),
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {closure ? 'Edit Project Closure' : 'Initiate Project Closure'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage project closure process and documentation
            </p>
          </div>
          <ExportRecordMenu
            sections={CLOSURE_EXPORT_SECTIONS}
            record={exportRecord}
            baseFilename="Project_Closure"
          />
        </div>
      </div>

        {/* Section Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <DetailAuditTabList
            activeTab={activeSection}
            onChange={setActiveSection}
            ariaLabel="Project closure sections"
            tabs={[
              ...sections.map((s) => ({ value: s.id, label: s.label })),
              { value: 'audit', label: 'Audit details' },
            ]}
          />
        </div>

        {activeSection === 'audit' && (
          <div className="flex-1 overflow-y-auto p-6">
            {!closure?.id ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this closure record is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this project closure, and how it is classified.">
                <AuditCard title="Identity" description="How this closure record is labelled and tracked.">
                  <AuditField label="Closure type" value={humanizeAuditToken(formData.closure_type || closure.closure_type)} />
                  <AuditField label="Closure status" value={humanizeAuditToken(formData.closure_status || closure.closure_status)} />
                </AuditCard>
                <AuditCard title="Classification" description="Where this closure record sits.">
                  <AuditField label="Closure phase" value={humanizeAuditToken(formData.closure_phase || closure.closure_phase)} />
                  <AuditField label="Benefits transition status" value={humanizeAuditToken(formData.benefits_transition_status || closure.benefits_transition_status)} />
                  <AuditField label="Archived" value={archivedAt ? new Date(archivedAt).toLocaleString() : 'Not archived'} />
                </AuditCard>
                <AuditCard title="Record history" description="When this closure record was created and last changed.">
                  <AuditField label="Created by" value={closure.created_by ? auditUserLabels[closure.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={closure.created_at} />
                  <AuditField label="Updated by" value={closure.updated_by ? auditUserLabels[closure.updated_by] || null : null} />
                  <AuditTimestampPair dateLabel="Last updated" value={closure.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">{renderSection()}</div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button
              type="button"
              onClick={requestClose}
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
              {loading ? 'Saving...' : closure ? 'Update Closure' : 'Initiate Closure'}
            </button>
          </div>
        </form>
    </div>
  );
}
