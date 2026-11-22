import { useEffect, useState } from 'react';
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { ArrowLeft, Calendar, Users } from 'lucide-react';
import { RowActionButton } from '@nidus/ui';
import { supabase } from '../../../services/supabaseClient';
import { createFollowOnAction, updateFollowOnAction } from '../../../services/closingProjectService';
import { platformDb } from '@nidus/supabase';
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList';
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel';
import AuditCard from '@nidus/ui/AuditCard';
import AuditField from '@nidus/ui/AuditField';
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair';
import SelectField from '@nidus/ui/SelectField';
import ActionDescriptionItemsField, { descriptionItemsFromAction, joinDescriptionItems } from './ActionDescriptionItemsField';
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext';
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal';
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils';
import RegionalDateInput from '@nidus/ui/RegionalDateInput'

const CATEGORIES = [
  { value: 'operational-handover', label: 'Operational Handover' },
  { value: 'support-required', label: 'Support Required' },
  { value: 'support', label: 'Support' },
  { value: 'benefits-measurement', label: 'Benefits Measurement' },
  { value: 'benefits-realization', label: 'Benefits Realization' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'training', label: 'Training' },
  { value: 'warranty-support', label: 'Warranty Support' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'enhancement', label: 'Enhancement' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUSES = [
  { value: 'not-started', label: 'Not Started' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'approved', label: 'Approved' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function withCurrent(options, value) {
  if (!value || options.some((option) => option.value === value)) return options;
  return [...options, { value, label: humanizeAuditToken(value) }];
}

export function actionToForm(action) {
  const rawDate = action?.recommended_completion_date || action?.target_completion_date || '';
  return {
    action_title: action?.action_title || '',
    description_items: descriptionItemsFromAction(action),
    action_category: action?.action_category || action?.action_type || 'documentation',
    priority: action?.priority || 'medium',
    assigned_to_user_id: action?.assigned_to_user_id || action?.assigned_to || '',
    recommended_completion_date: rawDate ? String(rawDate).slice(0, 10) : '',
    status: action?.status || action?.action_status || 'recommended',
    // v1340 wave 4: stored columns the form did not show before
    action_rationale: action?.action_rationale || '',
    expected_outcome: action?.expected_outcome || '',
    assigned_to_team: action?.assigned_to_team || '',
    recommended_start_date: action?.recommended_start_date ? String(action.recommended_start_date).slice(0, 10) : '',
    required_resources: action?.required_resources || '',
    transition_to_operations: !!action?.transition_to_operations,
    operational_owner_user_id: action?.operational_owner_user_id || '',
  };
}

function FollowOnActionsFormBody({ projectId, action, onClose, onSuccess, readOnly = false, onEdit }) {
  const { showSuccess, modal: successModal } = useSuccessModal();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [formTab, setFormTab] = useState('details');
  const [auditUserLabels, setAuditUserLabels] = useState({});
  const [descriptionError, setDescriptionError] = useState('');
  const [formData, setFormData] = useState(() => actionToForm(action));
  const [baseline, setBaseline] = useState(() => JSON.stringify(actionToForm(action)));
  const [pendingLeave, setPendingLeave] = useState(false);

  const isDirty = !readOnly && !pendingLeave && JSON.stringify(formData) !== baseline;
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved follow-on action changes.');

  useEffect(() => {
    if (pendingLeave) onClose?.();
  }, [pendingLeave, onClose]);

  useEffect(() => {
    if (formTab !== 'audit' || !action) return undefined;
    let cancelled = false;
    (async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        action.created_by,
        action.updated_by,
      ]);
      if (!cancelled) setAuditUserLabels(labels || {});
    })();
    return () => { cancelled = true; };
  }, [formTab, action]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('is_active', true)
          .order('full_name');
        if (error) throw error;
        if (!cancelled) setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCancel = () => confirmDiscard(() => setPendingLeave(true));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const descriptionItems = (formData.description_items || []).filter((row) => String(row.description || '').trim());
    const description = joinDescriptionItems(descriptionItems);
    if (!description) {
      setFormTab('details');
      setDescriptionError('Add at least one action description.');
      return;
    }

    try {
      setLoading(true);
      setDescriptionError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .maybeSingle();
      if (userError) throw userError;
      if (!userRow?.id) throw new Error('User not found');

      const actionData = {
        project_id: projectId,
        action_title: formData.action_title,
        action_description: description,
        action_description_items: descriptionItems.map((row) => ({
          description: String(row.description).trim(),
          target_date: row.target_date || null,
        })),
        action_category: formData.action_category,
        priority: formData.priority,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        recommended_completion_date: formData.recommended_completion_date || null,
        status: formData.status,
        action_rationale: formData.action_rationale || null,
        expected_outcome: formData.expected_outcome || null,
        assigned_to_team: formData.assigned_to_team || null,
        recommended_start_date: formData.recommended_start_date || null,
        required_resources: formData.required_resources || null,
        transition_to_operations: !!formData.transition_to_operations,
        operational_owner_user_id: formData.transition_to_operations ? formData.operational_owner_user_id || null : null,
      };

      let saved;
      if (action) {
        actionData.updated_by = userRow.id;
        saved = await updateFollowOnAction(action.id, actionData);
      } else {
        actionData.created_by = userRow.id;
        actionData.updated_by = userRow.id;
        saved = await createFollowOnAction(actionData);
      }

      setBaseline(JSON.stringify(formData));
      showSuccess({
        recordId: saved?.action_reference || saved?.action_title || formData.action_title || 'Follow-on action',
        operation: action ? 'updated' : 'created',
        onOk: () => {
          onSuccess?.();
          setPendingLeave(true);
        },
      });
    } catch (error) {
      console.error('Error saving follow-on action:', error);
      setDescriptionError(error.message || 'Error saving follow-on action');
    } finally {
      setLoading(false);
    }
  };

  const userOptions = users.map((user) => ({
    value: user.id,
    label: user.full_name || user.email,
  }));

  return (
    <div>
      <button
        type="button"
        onClick={handleCancel}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {readOnly ? 'View Follow-on Action' : action ? 'Edit Follow-on Action' : 'Add Follow-on Action'}
          </h2>
          {readOnly && onEdit && (
            <RowActionButton variant="edit" label="Edit action" onClick={onEdit} />
          )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Document post-project actions and responsibilities
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

          {formTab === 'audit' && (
            !action?.id ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this action is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this follow-on action, and how it is classified.">
                <AuditCard title="Identity" description="How this action is labelled and tracked.">
                  <AuditField label="Title" value={formData.action_title || action.action_title} />
                  <AuditField label="Status" value={humanizeAuditToken(formData.status || action.status)} />
                </AuditCard>
                <AuditCard title="Classification" description="Where this action sits.">
                  <AuditField label="Action type" value={humanizeAuditToken(formData.action_category || action.action_category)} />
                  <AuditField label="Priority" value={humanizeAuditToken(formData.priority || action.priority)} />
                </AuditCard>
                <AuditCard title="Record history" description="When this action was created and last changed.">
                  <AuditField label="Created by" value={action.created_by ? auditUserLabels[action.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={action.created_at} />
                  <AuditField label="Updated by" value={action.updated_by ? auditUserLabels[action.updated_by] || null : null} />
                  <AuditTimestampPair dateLabel="Last updated" value={action.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )
          )}

          {formTab === 'details' && (
            <>
            <fieldset disabled={readOnly} className="space-y-6 min-w-0 border-0 p-0 m-0">
              <div>
                <FieldLabelWithHelp helpKey="public.follow_on_actions.action_title" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block" required>Action Title *</FieldLabelWithHelp>
                <input
                  type="text"
                  value={formData.action_title}
                  onChange={(e) => setFormData({ ...formData, action_title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Brief title of the follow-on action..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <FieldLabelWithHelp helpKey="public.follow_on_actions.action_category" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block" required>Action Type *</FieldLabelWithHelp>
                  <SelectField
                    options={withCurrent(CATEGORIES, formData.action_category)}
                    value={formData.action_category}
                    onChange={(value) => setFormData({ ...formData, action_category: value })}
                    aria-label="Action Type"
                    required
                  />
                </div>
                <div>
                  <FieldLabelWithHelp helpKey="public.follow_on_actions.priority" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block" required>Priority *</FieldLabelWithHelp>
                  <SelectField
                    options={withCurrent(PRIORITIES, formData.priority)}
                    value={formData.priority}
                    onChange={(value) => setFormData({ ...formData, priority: value })}
                    aria-label="Priority"
                    required
                  />
                </div>
                <div>
                  <FieldLabelWithHelp helpKey="public.follow_on_actions.status" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block" required>Status *</FieldLabelWithHelp>
                  <SelectField
                    options={withCurrent(STATUSES, formData.status)}
                    value={formData.status}
                    onChange={(value) => setFormData({ ...formData, status: value })}
                    aria-label="Status"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FieldLabelWithHelp helpKey="public.follow_on_actions.assigned_to_user_id" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" listOptions={false}>
                    <Users className="h-4 w-4" />
                    Assigned To
                  </FieldLabelWithHelp>
                  <SelectField
                    forceSearchable
                    options={userOptions}
                    value={formData.assigned_to_user_id}
                    onChange={(value) => setFormData({ ...formData, assigned_to_user_id: value })}
                    placeholder="Select user..."
                    aria-label="Assigned To"
                  />
                </div>
                <div>
                  <FieldLabelWithHelp helpKey="public.follow_on_actions.recommended_completion_date" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="h-4 w-4" />
                    Target Completion Date
                  </FieldLabelWithHelp>
                  <RegionalDateInput eventStyle
                    value={formData.recommended_completion_date}
                    onChange={(e) => setFormData({ ...formData, recommended_completion_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FieldLabelWithHelp helpKey="public.follow_on_actions.assigned_to_team" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Assigned Team</FieldLabelWithHelp>
                  <input
                    type="text"
                    value={formData.assigned_to_team}
                    onChange={(e) => setFormData({ ...formData, assigned_to_team: e.target.value })}
                    placeholder="Team or department taking the action"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <FieldLabelWithHelp helpKey="public.follow_on_actions.recommended_start_date" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Recommended Start Date</FieldLabelWithHelp>
                  <RegionalDateInput eventStyle
                    value={formData.recommended_start_date}
                    onChange={(e) => setFormData({ ...formData, recommended_start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <FieldLabelWithHelp helpKey="public.follow_on_actions.action_rationale" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Why This Action Is Needed</FieldLabelWithHelp>
                <textarea
                  rows={2}
                  value={formData.action_rationale}
                  onChange={(e) => setFormData({ ...formData, action_rationale: e.target.value })}
                  placeholder="The reason for the action"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <FieldLabelWithHelp helpKey="public.follow_on_actions.expected_outcome" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Expected Outcome</FieldLabelWithHelp>
                <textarea
                  rows={2}
                  value={formData.expected_outcome}
                  onChange={(e) => setFormData({ ...formData, expected_outcome: e.target.value })}
                  placeholder="What will be true once the action is done"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <FieldLabelWithHelp helpKey="public.follow_on_actions.required_resources" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Required Resources</FieldLabelWithHelp>
                <textarea
                  rows={2}
                  value={formData.required_resources}
                  onChange={(e) => setFormData({ ...formData, required_resources: e.target.value })}
                  placeholder="People, budget or tools the action needs"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <FieldLabelWithHelp helpKey="public.follow_on_actions.transition_to_operations" className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.transition_to_operations}
                    onChange={(e) => setFormData({ ...formData, transition_to_operations: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                  />
                  Hand this action over to operations
                </FieldLabelWithHelp>
                {formData.transition_to_operations && (
                  <div>
                    <FieldLabelWithHelp helpKey="public.follow_on_actions.operational_owner_user_id" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Operational Owner</FieldLabelWithHelp>
                    <SelectField
                      forceSearchable
                      options={userOptions}
                      value={formData.operational_owner_user_id}
                      onChange={(value) => setFormData({ ...formData, operational_owner_user_id: value })}
                      placeholder="Select user..."
                      aria-label="Operational Owner"
                    />
                  </div>
                )}
              </div>
            </fieldset>

              <div>
                <FieldLabelWithHelp helpKey="public.follow_on_actions.action_description" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block" required>Action Description *</FieldLabelWithHelp>
                <ActionDescriptionItemsField
                  items={formData.description_items}
                  disabled={readOnly}
                  onChange={(description_items) => {
                    setDescriptionError('');
                    setFormData({ ...formData, description_items });
                  }}
                />
                {descriptionError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{descriptionError}</p>
                )}
              </div>
            </>
          )}

          {!readOnly && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
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
              {loading ? 'Saving...' : action ? 'Update Action' : 'Add Action'}
            </button>
          </div>
          )}
        </form>
      </div>
      {successModal}
    </div>
  );
}

// v1345 slice 4: field help for this component (public.follow_on_actions.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'action_title', 'action_category', 'priority', 'status', 'assigned_to_user_id',
  'recommended_completion_date', 'assigned_to_team', 'recommended_start_date', 'action_rationale',
  'expected_outcome', 'required_resources', 'transition_to_operations', 'operational_owner_user_id',
  'action_description',
].map((name) => `public.follow_on_actions.${name}`)

export default function FollowOnActionsForm(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <FollowOnActionsFormBody {...props} />
    </FieldHelpScope>
  )
}
