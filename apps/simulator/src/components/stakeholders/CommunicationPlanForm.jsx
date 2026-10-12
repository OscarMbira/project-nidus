/**
 * Communication Plan Form.
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
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { findStakeholderByRouteKey } from '@nidus/shared/utils/communicationPlanRoute'
import { audienceStakeholders, linesToArray, stakeholderTypeBadgeClass } from './communicationPlanAudience'
import SelectField from '@nidus/ui/SelectField'
import { getActiveLanguages } from '@nidus/shared/utils/languages'
import { getCommunicationInformationOptions } from '../../services/stakeholderService'

const STATUSES = ['draft', 'active', 'completed', 'cancelled']

function optionLabel(options, code) {
  return options.find((option) => option.option_code === code)?.option_label || code || null
}
const fieldClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'

const FORM_TABS = [
  { value: 'plan', label: 'Plan' },
  { value: 'audience', label: 'Audience' },
  { value: 'information', label: 'Information' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'constraints', label: 'Constraints' },
  { value: 'glossary', label: 'Glossary' },
  { value: 'notes', label: 'Notes' },
  { value: 'audit', label: 'Audit details' },
]

function arrayToLines(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n')
  return value || ''
}

export default function CommunicationPlanForm({ plan, projectId, stakeholders = [], focusStakeholderId = '', readOnly = false, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    project_id: projectId || '',
    plan_name: '',
    plan_description: '',
    plan_status: 'draft',
    communication_objectives: '',
    key_messages: '',
    tone_and_style: '',
    communication_language: '',
    communication_format: '',
    communication_detail_level: '',
    stakeholder_communication_requirements: '',
    primary_channels: '',
    communication_timeframe: '',
    communication_senders: '',
    communication_assumptions: '',
    communication_constraints: '',
    glossary: '',
    plan_start_date: new Date().toISOString().split('T')[0],
    plan_end_date: '',
    notes: '',
  })
  const [formTab, setFormTab] = useState('plan')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [languages, setLanguages] = useState([])
  const [languageError, setLanguageError] = useState('')
  const [formats, setFormats] = useState([])
  const [detailLevels, setDetailLevels] = useState([])
  const [optionsError, setOptionsError] = useState('')
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this communication plan.')

  useEffect(() => {
    if (formTab !== 'audit' || !plan) return undefined
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
        project_id: plan.project_id,
        plan_name: plan.plan_name || '',
        plan_description: plan.plan_description || '',
        plan_status: plan.plan_status || 'draft',
        communication_objectives: plan.communication_objectives || '',
        key_messages: plan.key_messages || '',
        tone_and_style: plan.tone_and_style || '',
        communication_language: plan.communication_language || '',
        communication_format: plan.communication_format || '',
        communication_detail_level: plan.communication_detail_level || '',
        stakeholder_communication_requirements: plan.stakeholder_communication_requirements
          || arrayToLines(plan.target_stakeholder_groups),
        primary_channels: arrayToLines(plan.primary_channels),
        communication_timeframe: plan.communication_timeframe || '',
        communication_senders: plan.communication_senders || '',
        communication_assumptions: plan.communication_assumptions || '',
        communication_constraints: plan.communication_constraints || '',
        glossary: plan.glossary || '',
        plan_start_date: plan.plan_start_date || '',
        plan_end_date: plan.plan_end_date || '',
        notes: plan.notes || '',
      })
      setIsDirty(false)
    } else if (projectId) {
      setFormData((prev) => ({ ...prev, project_id: projectId }))
    }
  }, [plan, projectId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [languageResult, optionsResult] = await Promise.all([
        getActiveLanguages('platform'),
        getCommunicationInformationOptions().then((rows) => ({ ok: true, rows })).catch((error) => ({ ok: false, error })),
      ])
      if (cancelled) return
      if (!languageResult.success) {
        setLanguageError(languageResult.message || 'Failed to load languages')
        setLanguages([])
      } else {
        setLanguageError('')
        setLanguages(languageResult.data || [])
      }
      if (!optionsResult.ok) {
        setOptionsError(optionsResult.error?.message || 'Failed to load format options')
        setFormats([])
        setDetailLevels([])
        return
      }
      setOptionsError('')
      const rows = optionsResult.rows || []
      setFormats(rows.filter((row) => row.option_kind === 'format'))
      setDetailLevels(rows.filter((row) => row.option_kind === 'detail_level'))
    })()
    return () => { cancelled = true }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setIsDirty(true)
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const setTextList = (key) => (value) => {
    setIsDirty(true)
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const requirementLines = linesToArray(formData.stakeholder_communication_requirements)
    try {
      await onSave({
        ...formData,
        plan_end_date: formData.plan_end_date || null,
        target_stakeholder_groups: requirementLines,
        primary_channels: linesToArray(formData.primary_channels),
      })
      setIsDirty(false)
    } catch {
      // The page shows the save error and keeps the form dirty.
    }
  }

  const handleCancel = () => {
    confirmDiscard(() => onCancel?.())
  }

  const matchedAudience = audienceStakeholders(stakeholders, [
    ...linesToArray(formData.stakeholder_communication_requirements),
    ...(Array.isArray(plan?.target_stakeholder_groups) ? plan.target_stakeholder_groups : []),
  ])
  const focused = focusStakeholderId
    ? (findStakeholderByRouteKey(stakeholders, focusStakeholderId) || findStakeholderByRouteKey(matchedAudience, focusStakeholderId))
    : null
  const audience = focused ? [focused] : matchedAudience

  return (
    <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{readOnly ? 'View Communication Plan' : plan ? 'Edit Communication Plan' : 'Add Communication Plan'}</h2>
        {audience.length > 0 && (
          <div className="mt-3 space-y-3">
            {audience.map((person) => (
              <div key={person.id} className="flex flex-wrap items-start gap-3">
                <p className="text-sm text-gray-700 dark:text-gray-200">{person.stakeholder_name}</p>
                {person.stakeholder_type && (
                  <div>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded capitalize ${stakeholderTypeBadgeClass(person.stakeholder_type)}`}>
                      {person.stakeholder_type}
                    </span>
                    {person.is_decision_maker && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Decision Maker</div>
                    )}
                    {person.is_influencer && (
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">Influencer</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <fieldset disabled={readOnly} className="space-y-4 border-0 p-0 m-0 min-w-0">
        <DetailAuditTabList
          activeTab={formTab}
          onChange={setFormTab}
          tabs={FORM_TABS}
          ariaLabel="Communication plan sections"
        />

        {formTab === 'plan' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="communication-plan-name">Plan name</label>
              <input id="communication-plan-name" type="text" name="plan_name" value={formData.plan_name} onChange={handleChange} required className={fieldClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="communication-plan-description">Description</label>
              <textarea id="communication-plan-description" name="plan_description" value={formData.plan_description} onChange={handleChange} rows={3} className={fieldClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="communication-plan-status">Status</label>
                <select id="communication-plan-status" name="plan_status" value={formData.plan_status} onChange={handleChange} className={fieldClass}>
                  {STATUSES.map((status) => (<option key={status} value={status}>{status}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="communication-plan-start">Start date</label>
                <input id="communication-plan-start" type="date" name="plan_start_date" value={formData.plan_start_date} onChange={handleChange} required className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="communication-plan-end">End date</label>
                <input id="communication-plan-end" type="date" name="plan_end_date" value={formData.plan_end_date} onChange={handleChange} className={fieldClass} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="communication-plan-objectives">Objectives</label>
              <textarea id="communication-plan-objectives" name="communication_objectives" value={formData.communication_objectives} onChange={handleChange} rows={3} className={fieldClass} />
            </div>
          </>
        )}

        {formTab === 'audience' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Who needs this information</h3>
            <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">Name the person or group, and what they need to receive.</p>
            <MultiLineListInput
              disabled={readOnly}
              viewModeId="communication-plan-audience"
              value={formData.stakeholder_communication_requirements}
              onChange={setTextList('stakeholder_communication_requirements')}
              itemColumnLabel="Requirement"
              placeholder="Depot supervisors — weekly kilometres and exceptions"
              ariaLabelPrefix="communication requirement"
            />
          </div>
        )}

        {formTab === 'information' && (
          <>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What to communicate</h3>
              <MultiLineListInput
              disabled={readOnly}
                viewModeId="communication-plan-messages"
                value={formData.key_messages}
                onChange={setTextList('key_messages')}
                itemColumnLabel="Message"
                placeholder="One message"
                ariaLabelPrefix="message"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="communication-plan-language">Language</label>
                <SelectField
                  id="communication-plan-language"
                  value={formData.communication_language}
                  onChange={(value) => {
                    setIsDirty(true)
                    setFormData((prev) => ({ ...prev, communication_language: value || '' }))
                  }}
                  options={languages.map((language) => ({
                    value: language.code,
                    label: language.native_name ? `${language.name} (${language.native_name})` : language.name,
                  }))}
                  placeholder="Select a language"
                  searchPlaceholder="Search languages"
                  forceSearchable
                  disabled={readOnly}
                  className={fieldClass}
                />
                {languageError && (
                  <p className="mt-1 text-xs text-red-700 dark:text-red-300">{languageError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="communication-plan-format">Format</label>
                <SelectField
                  id="communication-plan-format"
                  value={formData.communication_format}
                  onChange={(value) => {
                    setIsDirty(true)
                    setFormData((prev) => ({ ...prev, communication_format: value || '' }))
                  }}
                  options={formats.map((option) => ({ value: option.option_code, label: option.option_label }))}
                  placeholder="Select a format"
                  searchPlaceholder="Search formats"
                  disabled={readOnly}
                  className={fieldClass}
                />
                {optionsError && (
                  <p className="mt-1 text-xs text-red-700 dark:text-red-300">{optionsError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="communication-plan-detail">Level of detail</label>
                <SelectField
                  id="communication-plan-detail"
                  value={formData.communication_detail_level}
                  onChange={(value) => {
                    setIsDirty(true)
                    setFormData((prev) => ({ ...prev, communication_detail_level: value || '' }))
                  }}
                  options={detailLevels.map((option) => ({ value: option.option_code, label: option.option_label }))}
                  placeholder="Select a level"
                  searchPlaceholder="Search levels"
                  disabled={readOnly}
                  className={fieldClass}
                />
              </div>
            </div>
          </>
        )}

        {formTab === 'delivery' && (
          <>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Method</h3>
              <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">How the information is delivered, such as email, a meeting, or a notice.</p>
              <MultiLineListInput
              disabled={readOnly}
                viewModeId="communication-plan-methods"
                value={formData.primary_channels}
                onChange={setTextList('primary_channels')}
                itemColumnLabel="Method"
                placeholder="email"
                ariaLabelPrefix="method"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Timing and frequency</h3>
              <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">How often the information is provided, and in what circumstances.</p>
              <MultiLineListInput
              disabled={readOnly}
                viewModeId="communication-plan-timing"
                value={formData.communication_timeframe}
                onChange={setTextList('communication_timeframe')}
                itemColumnLabel="Timing"
                placeholder="Weekly, each Monday before the depot opens"
                ariaLabelPrefix="timing"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sender</h3>
              <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">The person or group who provides the information.</p>
              <MultiLineListInput
              disabled={readOnly}
                viewModeId="communication-plan-senders"
                value={formData.communication_senders}
                onChange={setTextList('communication_senders')}
                itemColumnLabel="Sender"
                placeholder="Project manager"
                ariaLabelPrefix="sender"
              />
            </div>
          </>
        )}

        {formTab === 'constraints' && (
          <>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assumptions</h3>
              <MultiLineListInput
              disabled={readOnly}
                viewModeId="communication-plan-assumptions"
                value={formData.communication_assumptions}
                onChange={setTextList('communication_assumptions')}
                itemColumnLabel="Assumption"
                placeholder="One assumption"
                ariaLabelPrefix="assumption"
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Constraints</h3>
              <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">Include limits on sensitive, proprietary, or confidential information.</p>
              <MultiLineListInput
              disabled={readOnly}
                viewModeId="communication-plan-constraints"
                value={formData.communication_constraints}
                onChange={setTextList('communication_constraints')}
                itemColumnLabel="Constraint"
                placeholder="One constraint"
                ariaLabelPrefix="constraint"
              />
            </div>
          </>
        )}

        {formTab === 'glossary' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Glossary</h3>
            <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">Terms or acronyms used in a particular way on this project.</p>
            <MultiLineListInput
              disabled={readOnly}
              viewModeId="communication-plan-glossary"
              value={formData.glossary}
              onChange={setTextList('glossary')}
              itemColumnLabel="Term"
              placeholder="Term — meaning"
              ariaLabelPrefix="term"
            />
          </div>
        )}

        {formTab === 'notes' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="communication-plan-notes">Notes</label>
            <textarea id="communication-plan-notes" name="notes" value={formData.notes} onChange={handleChange} rows={4} className={fieldClass} />
          </div>
        )}

        {formTab === 'audit' && (
          !plan?.id ? (
            <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this communication plan is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this communication plan, and how it is classified.">
              <AuditCard title="Identity" description="How this plan is labelled and tracked.">
                <AuditField label="Plan name" value={formData.plan_name || plan.plan_name} />
                <AuditField label="Status" value={humanizeAuditToken(formData.plan_status || plan.plan_status)} />
              </AuditCard>
              <AuditCard title="Classification" description="What this plan covers.">
                <AuditField label="Objectives" value={formData.communication_objectives || plan.communication_objectives} />
                <AuditField label="Start date" value={formData.plan_start_date || plan.plan_start_date} />
                <AuditField label="End date" value={formData.plan_end_date || plan.plan_end_date} />
                <AuditField label="Audience" value={formData.stakeholder_communication_requirements} />
                <AuditField label="Messages" value={formData.key_messages} />
                <AuditField label="Language" value={languages.find((language) => language.code === formData.communication_language)?.name || formData.communication_language} />
                <AuditField label="Format" value={optionLabel(formats, formData.communication_format)} />
                <AuditField label="Level of detail" value={optionLabel(detailLevels, formData.communication_detail_level)} />
                <AuditField label="Method" value={formData.primary_channels} />
                <AuditField label="Timing" value={formData.communication_timeframe} />
                <AuditField label="Sender" value={formData.communication_senders} />
                <AuditField label="Assumptions" value={formData.communication_assumptions} />
                <AuditField label="Constraints" value={formData.communication_constraints} />
                <AuditField label="Glossary" value={formData.glossary} />
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
        </fieldset>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={handleCancel} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">{readOnly ? 'Back' : 'Cancel'}</button>
          {!readOnly && (
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save className="h-4 w-4" />Save</button>
          )}
        </div>
      </form>
    </div>
  )
}
