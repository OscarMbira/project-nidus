/**
 * Engagement Plan Form – strategy, method, frequency, attitude gap.
 * Rendered on its own page (add and edit), not in a modal.
 */

import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import SelectField from '@nidus/ui/SelectField'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'

const ENGAGEMENT_LEVELS = [
  ['unaware', 'Unaware'],
  ['resistant', 'Resistant'],
  ['neutral', 'Neutral'],
  ['supportive', 'Supportive'],
  ['leading', 'Leading'],
  ['unsupportive', 'Unsupportive'],
  ['blocking', 'Blocking'],
]
const METHODS = ['email', 'meeting', 'workshop', 'report', 'presentation', 'informal', 'survey']
const FREQUENCIES = ['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'as-needed']

const FORM_TABS = [
  { value: 'levels', label: 'Levels' },
  { value: 'approach', label: 'Approach' },
  { value: 'goals', label: 'Goals' },
  { value: 'escalation', label: 'Escalation' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'stakeholder', label: 'Requirements & expectations' },
  { value: 'notes', label: 'Notes' },
  { value: 'audit', label: 'Audit details' },
]

const fieldClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'

function stakeholderTypeBadgeClass(type) {
  switch ((type || '').toLowerCase()) {
    case 'internal':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'external':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'customer':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'supplier':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'regulator':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

export default function EngagementPlanForm({ plan, stakeholderId, projectId, stakeholders = [], onSave, onCancel, readOnly = false }) {
  const [formData, setFormData] = useState({
    stakeholder_id: stakeholderId || '',
    project_id: projectId || '',
    engagement_level: 'neutral',
    target_engagement_level: 'supportive',
    engagement_strategy: '',
    change_scope_impact: '',
    engagement_success_criteria: '',
    preferred_communication_method: 'email',
    preferred_communication_frequency: 'monthly',
    relationship_owner_user_id: '',
    escalation_path: '',
    pending_stakeholder_changes: '',
    interrelationships: '',
    related_engagement_links: '',
    notes: '',
  })
  const [owners, setOwners] = useState([])
  const [formTab, setFormTab] = useState('levels')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [formError, setFormError] = useState('')
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this engagement plan.')

  useEffect(() => {
    if (formTab !== 'audit' || !plan) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        plan.created_by,
        plan.updated_by,
      ])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [formTab, plan])

  useEffect(() => {
    if (plan) {
      setFormData({
        stakeholder_id: plan.stakeholder_id,
        project_id: plan.project_id,
        engagement_level: plan.engagement_level || 'neutral',
        target_engagement_level: plan.target_engagement_level || 'supportive',
        engagement_strategy: plan.engagement_strategy || '',
        change_scope_impact: plan.change_scope_impact || '',
        engagement_success_criteria: plan.engagement_success_criteria || '',
        preferred_communication_method: plan.preferred_communication_method || 'email',
        preferred_communication_frequency: plan.preferred_communication_frequency || 'monthly',
        relationship_owner_user_id: plan.relationship_owner_user_id || '',
        escalation_path: plan.escalation_path || '',
        pending_stakeholder_changes: plan.pending_stakeholder_changes || '',
        interrelationships: plan.interrelationships || '',
        related_engagement_links: plan.related_engagement_links || '',
        notes: plan.notes || '',
      })
      setIsDirty(false)
    } else if (stakeholderId || projectId) {
      setFormData(prev => ({
        ...prev,
        stakeholder_id: stakeholderId || prev.stakeholder_id,
        project_id: projectId || prev.project_id,
      }))
    }
  }, [plan, stakeholderId, projectId])

  useEffect(() => {
    if (!projectId && !formData.project_id) return undefined
    const id = formData.project_id || projectId
    let cancelled = false
    ;(async () => {
      const { data, error } = await platformDb
        .from('project_memberships')
        .select('user_id, users:users!project_memberships_user_id_fkey ( id, full_name, email )')
        .eq('project_id', id)
        .eq('is_active', true)
      if (cancelled || error) return
      const rows = (data || [])
        .map((row) => ({
          id: row.users?.id || row.user_id,
          label: row.users?.full_name || row.users?.email || 'Project member',
        }))
        .filter((row) => row.id)
      rows.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
      setOwners(rows)
    })()
    return () => { cancelled = true }
  }, [projectId, formData.project_id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setIsDirty(true)
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.stakeholder_id) {
      setFormError('Select a stakeholder.')
      return
    }
    setFormError('')
    try {
      await onSave({
        ...formData,
        relationship_owner_user_id: formData.relationship_owner_user_id || null,
      })
      setIsDirty(false)
    } catch {
      // The page shows the save error and keeps the form dirty.
    }
  }

  const handleCancel = () => {
    confirmDiscard(() => onCancel?.())
  }

  const setTextList = (key) => (value) => {
    setIsDirty(true)
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const stakeholderRecord = stakeholders.find((s) => s.id === formData.stakeholder_id) || plan?.stakeholder
  const stakeholderName = stakeholderRecord?.stakeholder_name

  return (
    <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{readOnly ? 'View Engagement Plan' : (plan ? 'Edit Engagement Plan' : 'Add Engagement Plan')}</h2>
          {stakeholderName && (
            <div className="mt-2 flex flex-wrap items-start gap-3">
              <p className="text-sm text-gray-700 dark:text-gray-200">{stakeholderName}</p>
              {stakeholderRecord?.stakeholder_type && (
                <div>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded capitalize ${stakeholderTypeBadgeClass(stakeholderRecord.stakeholder_type)}`}>
                    {stakeholderRecord.stakeholder_type}
                  </span>
                  {stakeholderRecord.is_decision_maker && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Decision Maker</div>
                  )}
                  {stakeholderRecord.is_influencer && (
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Influencer</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6">
        <fieldset disabled={readOnly} className="space-y-4 border-0 p-0 m-0 min-w-0">
        {!plan && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="engagement-plan-stakeholder">Stakeholder</label>
            <SelectField
              id="engagement-plan-stakeholder"
              name="stakeholder_id"
              value={formData.stakeholder_id}
              onChange={(value) => {
                setIsDirty(true)
                setFormData((prev) => ({ ...prev, stakeholder_id: value }))
              }}
              options={stakeholders.map((s) => ({ value: s.id, label: s.stakeholder_name }))}
              placeholder="Select a stakeholder"
              searchPlaceholder="Search stakeholders"
              forceSearchable
              required
              className={fieldClass}
            />
          </div>
        )}
        <DetailAuditTabList
          activeTab={formTab}
          onChange={setFormTab}
          tabs={FORM_TABS}
          ariaLabel="Engagement plan sections"
        />

        {formTab === 'audit' && (
          !plan?.id ? (
            <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this engagement plan is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this engagement plan, and how it is classified.">
              <AuditCard title="Identity" description="How this plan is labelled and tracked.">
                <AuditField label="Current level" value={humanizeAuditToken(formData.engagement_level || plan.engagement_level)} />
                <AuditField label="Target level" value={humanizeAuditToken(formData.target_engagement_level || plan.target_engagement_level)} />
              </AuditCard>
              <AuditCard title="Classification" description="Where this plan sits.">
                <AuditField label="Method" value={humanizeAuditToken(formData.preferred_communication_method || plan.preferred_communication_method)} />
                <AuditField label="Frequency" value={humanizeAuditToken(formData.preferred_communication_frequency || plan.preferred_communication_frequency)} />
                <AuditField label="Engagement owner" value={owners.find((owner) => owner.id === formData.relationship_owner_user_id)?.label || null} />
                <AuditField label="Scope and impact" value={formData.change_scope_impact || plan.change_scope_impact} />
                <AuditField label="Engagement goals" value={formData.engagement_success_criteria || plan.engagement_success_criteria} />
                <AuditField label="Escalation path" value={formData.escalation_path || plan.escalation_path} />
                <AuditField label="Pending changes" value={formData.pending_stakeholder_changes || plan.pending_stakeholder_changes} />
                <AuditField label="Interrelationships" value={formData.interrelationships || plan.interrelationships} />
                <AuditField label="Related links" value={formData.related_engagement_links || plan.related_engagement_links} />
              </AuditCard>
              <AuditCard title="Record history" description="When this plan was created and last changed.">
                <AuditField label="Created by" value={plan.created_by ? auditUserLabels[plan.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Created at" value={plan.created_at} />
                <AuditField label="Updated by" value={plan.updated_by ? auditUserLabels[plan.updated_by] || null : null} />
                <AuditTimestampPair dateLabel="Last updated" value={plan.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )
        )}

        {formTab === 'levels' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="engagement-plan-level">Current level</label>
                <select id="engagement-plan-level" name="engagement_level" value={formData.engagement_level} onChange={handleChange} className={fieldClass}>
                  {ENGAGEMENT_LEVELS.map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="engagement-plan-target">Desired level</label>
                <select id="engagement-plan-target" name="target_engagement_level" value={formData.target_engagement_level} onChange={handleChange} className={fieldClass}>
                  {ENGAGEMENT_LEVELS.map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="engagement-plan-impact">Scope and impact of the change</label>
              <textarea id="engagement-plan-impact" name="change_scope_impact" value={formData.change_scope_impact} onChange={handleChange} rows={3} className={fieldClass} />
            </div>
          </>
        )}

        {formTab === 'approach' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="engagement-plan-strategy">Engagement approach</label>
              <p className="mb-1 text-xs text-gray-600 dark:text-gray-300">How you will move this stakeholder to the desired level.</p>
              <textarea id="engagement-plan-strategy" name="engagement_strategy" value={formData.engagement_strategy} onChange={handleChange} rows={4} className={fieldClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="engagement-plan-method">Method</label>
                <select id="engagement-plan-method" name="preferred_communication_method" value={formData.preferred_communication_method} onChange={handleChange} className={fieldClass}>
                  {METHODS.map((method) => (<option key={method} value={method}>{method}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="engagement-plan-frequency">Frequency</label>
                <select id="engagement-plan-frequency" name="preferred_communication_frequency" value={formData.preferred_communication_frequency} onChange={handleChange} className={fieldClass}>
                  {FREQUENCIES.map((frequency) => (<option key={frequency} value={frequency}>{frequency}</option>))}
                </select>
              </div>
            </div>
          </>
        )}

        {formTab === 'goals' && (
          <>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Engagement goals</h3>
              <MultiLineListInput
                viewModeId="engagement-plan-goals"
                value={formData.engagement_success_criteria}
                onChange={setTextList('engagement_success_criteria')}
                itemColumnLabel="Engagement goal"
                placeholder="One goal"
                ariaLabelPrefix="engagement goal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="engagement-plan-owner">Engagement owner</label>
              <SelectField
                id="engagement-plan-owner"
                value={formData.relationship_owner_user_id}
                onChange={(value) => {
                  setIsDirty(true)
                  setFormData((prev) => ({ ...prev, relationship_owner_user_id: value || '' }))
                }}
                options={owners.map((owner) => ({ value: owner.id, label: owner.label }))}
                placeholder="Select the owner"
                searchPlaceholder="Search project members"
                forceSearchable
                className={fieldClass}
              />
            </div>
          </>
        )}

        {formTab === 'escalation' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Escalation path</h3>
            <MultiLineListInput
              viewModeId="engagement-plan-escalation"
              value={formData.escalation_path}
              onChange={setTextList('escalation_path')}
              itemColumnLabel="Escalation step"
              placeholder="Who to escalate to, and when"
              ariaLabelPrefix="escalation step"
            />
          </div>
        )}

        {formTab === 'relationships' && (
          <>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pending stakeholder changes</h3>
            <MultiLineListInput
              viewModeId="engagement-plan-changes"
              value={formData.pending_stakeholder_changes}
              onChange={setTextList('pending_stakeholder_changes')}
              itemColumnLabel="Pending change"
              placeholder="A pending addition, deletion, or change, and its impact"
              ariaLabelPrefix="pending change"
            />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Interrelationships</h3>
            <MultiLineListInput
              viewModeId="engagement-plan-relationships"
              value={formData.interrelationships}
              onChange={setTextList('interrelationships')}
              itemColumnLabel="Relationship"
              placeholder="A relationship or overlap with another stakeholder or group"
              ariaLabelPrefix="relationship"
            />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Links to risks, decisions, change, and adoption</h3>
            <MultiLineListInput
              viewModeId="engagement-plan-links"
              value={formData.related_engagement_links}
              onChange={setTextList('related_engagement_links')}
              itemColumnLabel="Link"
              placeholder="A risk, decision, change, or adoption need this engagement supports"
              ariaLabelPrefix="related link"
            />
            </div>
          </>
        )}

        {formTab === 'stakeholder' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Requirements</h3>
              <MultiLineListInput
                viewModeId="engagement-plan-requirements"
                value={stakeholderRecord?.special_requirements || ''}
                onChange={() => {}}
                itemColumnLabel="Requirement"
                ariaLabelPrefix="requirement"
                disabled
              />
            </section>
            <section>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expectations</h3>
              <MultiLineListInput
                viewModeId="engagement-plan-expectations"
                value={stakeholderRecord?.expectations || ''}
                onChange={() => {}}
                itemColumnLabel="Expectation"
                ariaLabelPrefix="expectation"
                disabled
              />
            </section>
          </div>
        )}

        {formTab === 'notes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="engagement-plan-notes">Notes</label>
            <textarea id="engagement-plan-notes" name="notes" value={formData.notes} onChange={handleChange} rows={4} className={fieldClass} />
          </div>
        )}

        {formError && (
          <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
        )}
        </fieldset>
        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={handleCancel} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">{readOnly ? 'Back' : 'Cancel'}</button>
          {!readOnly && (
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save className="h-4 w-4" />Save</button>
          )}
        </div>
      </form>
    </div>
  )
}
