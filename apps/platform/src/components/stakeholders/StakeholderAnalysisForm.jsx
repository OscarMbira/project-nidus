/**
 * Stakeholder Analysis Form – power/interest, attitude, strategy.
 * Auto-calculates matrix quadrant from power + interest (1–5).
 */

import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { salienceClassFromPLU } from '@nidus/shared/utils/salienceUtils'
import SelectField from '@nidus/ui/SelectField'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import {
  addStakeholderAnalysisPeriod,
  listStakeholderAnalysisPeriods,
  periodSelectOptions,
  resolveAnalysisPeriodAccountId,
} from '../../services/stakeholderAnalysisPeriodService'

function quadrantFromPowerInterest(power, interest) {
  const high = (v) => v >= 4
  const low = (v) => v <= 2
  if (high(power) && high(interest)) return 'manage-closely'
  if (high(power) && low(interest)) return 'keep-satisfied'
  if (low(power) && high(interest)) return 'keep-informed'
  return 'monitor'
}

const ATTITUDES = ['champion', 'supporter', 'neutral', 'critic', 'blocker']
const PRIORITIES = ['critical', 'high', 'medium', 'low']
const POWER_SOURCES = ['budget', 'authority', 'expertise', 'information', 'relationships']
const SCORE_STEPS = [1, 2, 3, 4, 5]

const FORM_TABS = [
  { value: 'position', label: 'Position' },
  { value: 'attitude', label: 'Attitude' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'audit', label: 'Audit details' },
]

const fieldClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'

function ScorePicker({ label, value, onChange }) {
  const selected = Number(value) || 1
  return (
    <div>
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</span>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {SCORE_STEPS.map((step) => {
          const active = selected === step
          return (
            <button
              key={step}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(step)}
              className={`h-10 w-10 rounded-lg border text-sm font-semibold ${
                active
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:border-blue-500'
              }`}
            >
              {step}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function StakeholderAnalysisForm({ analysis, stakeholderId, projectId, stakeholders = [], onSave, onCancel }) {
  const [formData, setFormData] = useState({
    stakeholder_id: stakeholderId || '',
    project_id: projectId || '',
    power_level: 3,
    interest_level: 3,
    legitimacy_level: 3,
    urgency_level: 3,
    matrix_quadrant: 'monitor',
    salience_class: 'latent',
    current_attitude: 'neutral',
    desired_attitude: 'neutral',
    impact_on_project: null,
    power_sources: [],
    key_messages: '',
    engagement_strategy: '',
    engagement_priority: 'medium',
    analysis_date: new Date().toISOString().split('T')[0],
    analysis_period: '',
    notes: '',
  })
  const [formTab, setFormTab] = useState('position')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [periodRows, setPeriodRows] = useState([])
  const [periodAccountId, setPeriodAccountId] = useState(null)
  const [periodError, setPeriodError] = useState('')
  const [periodLoading, setPeriodLoading] = useState(false)
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this analysis.')

  useEffect(() => {
    if (formTab !== 'audit' || !analysis) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        analysis.created_by,
        analysis.updated_by,
      ])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [formTab, analysis])

  useEffect(() => {
    if (analysis) {
      const p = analysis.power_level ?? 3
      const l = analysis.legitimacy_level ?? 3
      const u = analysis.urgency_level ?? 3
      setFormData({
        stakeholder_id: analysis.stakeholder_id,
        project_id: analysis.project_id,
        power_level: p,
        interest_level: analysis.interest_level ?? 3,
        legitimacy_level: l,
        urgency_level: u,
        matrix_quadrant: analysis.matrix_quadrant || quadrantFromPowerInterest(p, analysis.interest_level ?? 3),
        salience_class: analysis.salience_class || salienceClassFromPLU(p, l, u),
        current_attitude: analysis.current_attitude || 'neutral',
        desired_attitude: analysis.desired_attitude || 'neutral',
        impact_on_project: analysis.impact_on_project ?? null,
        power_sources: Array.isArray(analysis.power_sources) ? analysis.power_sources : [],
        key_messages: analysis.key_messages || '',
        engagement_strategy: analysis.engagement_strategy || '',
        engagement_priority: analysis.engagement_priority || 'medium',
        analysis_date: analysis.analysis_date || new Date().toISOString().split('T')[0],
        analysis_period: analysis.analysis_period || '',
        notes: analysis.notes || '',
      })
    } else if (stakeholderId) {
      setFormData(prev => ({ ...prev, stakeholder_id: stakeholderId, project_id: projectId }))
    }
  }, [analysis, stakeholderId, projectId])

  useEffect(() => {
    const scopedProjectId = projectId || analysis?.project_id || ''
    if (!scopedProjectId) return undefined
    let cancelled = false
    setPeriodLoading(true)
    ;(async () => {
      try {
        const accountId = await resolveAnalysisPeriodAccountId(scopedProjectId)
        const rows = await listStakeholderAnalysisPeriods(accountId)
        if (cancelled) return
        setPeriodAccountId(accountId)
        setPeriodRows(rows)
        setPeriodError('')
      } catch (error) {
        if (!cancelled) setPeriodError(error?.message || 'Could not load analysis periods.')
      } finally {
        if (!cancelled) setPeriodLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId, analysis?.project_id])

  const addPeriod = async (name) => {
    setPeriodError('')
    if (!periodAccountId) {
      setPeriodError('Choose a project first so this period can be saved for the organisation.')
      return
    }
    try {
      const saved = await addStakeholderAnalysisPeriod(periodAccountId, name)
      setIsDirty(true)
      setFormData((prev) => ({ ...prev, analysis_period: saved }))
      setPeriodRows((prev) => {
        if (prev.some((row) => String(row.period_name).toLowerCase() === saved.toLowerCase())) return prev
        return [...prev, { period_name: saved, account_id: periodAccountId, is_system: false }]
      })
    } catch (error) {
      setPeriodError(error?.message || 'Could not add this period.')
    }
  }

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setIsDirty(true)
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? (value ? parseInt(value, 10) : null) : value }))
  }

  const setScore = (field, value) => {
    setIsDirty(true)
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      const power = field === 'power_level' ? value : prev.power_level
      const interest = field === 'interest_level' ? value : prev.interest_level
      const legitimacy = field === 'legitimacy_level' ? value : prev.legitimacy_level
      const urgency = field === 'urgency_level' ? value : prev.urgency_level
      if (field === 'power_level' || field === 'interest_level') {
        next.matrix_quadrant = quadrantFromPowerInterest(power, interest)
      }
      if (field === 'power_level' || field === 'legitimacy_level' || field === 'urgency_level') {
        next.salience_class = salienceClassFromPLU(power, legitimacy, urgency)
      }
      return next
    })
  }

  const togglePowerSource = (src) => {
    setIsDirty(true)
    setFormData(prev => ({
      ...prev,
      power_sources: prev.power_sources.includes(src) ? prev.power_sources.filter(s => s !== src) : [...prev.power_sources, src],
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.stakeholder_id) {
      setFormTab('position')
      return
    }
    onSave(formData)
  }

  const handleCancel = () => {
    confirmDiscard(() => onCancel?.())
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{analysis?.id ? 'Edit Analysis' : 'Add Analysis'}</h2>
      </div>
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <DetailAuditTabList
          activeTab={formTab}
          onChange={setFormTab}
          tabs={FORM_TABS}
          ariaLabel="Analysis sections"
        />

        {formTab === 'audit' && (
          !analysis?.id ? (
            <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this analysis is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this analysis, and how it is classified.">
              <AuditCard title="Identity" description="How this analysis is labelled and tracked.">
                <AuditField label="Matrix quadrant" value={humanizeAuditToken(formData.matrix_quadrant || analysis.matrix_quadrant)} />
                <AuditField label="Salience class" value={humanizeAuditToken(formData.salience_class || analysis.salience_class)} />
              </AuditCard>
              <AuditCard title="Classification" description="Where this analysis sits.">
                <AuditField label="Current attitude" value={humanizeAuditToken(formData.current_attitude || analysis.current_attitude)} />
                <AuditField label="Desired attitude" value={humanizeAuditToken(formData.desired_attitude || analysis.desired_attitude)} />
                <AuditField label="Engagement priority" value={humanizeAuditToken(formData.engagement_priority || analysis.engagement_priority)} />
              </AuditCard>
              <AuditCard title="Record history" description="When this analysis was created and last changed.">
                <AuditField label="Created by" value={analysis.created_by ? auditUserLabels[analysis.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Created at" value={analysis.created_at} />
                <AuditField label="Updated by" value={analysis.updated_by ? auditUserLabels[analysis.updated_by] || null : null} />
                <AuditTimestampPair dateLabel="Last updated" value={analysis.updated_at} />
                <AuditTimestampPair dateLabel="Analysis date" value={analysis.analysis_date || formData.analysis_date} />
              </AuditCard>
            </AuditDetailsPanel>
          )
        )}

        {formTab === 'position' && (
          <>
            {!analysis && stakeholders.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stakeholder</label>
                <SelectField
                  required
                  value={formData.stakeholder_id}
                  placeholder="Select"
                  onChange={(value) => {
                    setIsDirty(true)
                    setFormData((prev) => ({ ...prev, stakeholder_id: value }))
                  }}
                  options={stakeholders.map((s) => ({
                    value: s.id,
                    label: `${s.stakeholder_name}${s.stakeholder_organization ? ` (${s.stakeholder_organization})` : ''}`,
                  }))}
                />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ScorePicker label="Power (1–5)" value={formData.power_level} onChange={(v) => setScore('power_level', v)} />
              <ScorePicker label="Interest (1–5)" value={formData.interest_level} onChange={(v) => setScore('interest_level', v)} />
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Matrix quadrant (auto)</span>
              <p className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg capitalize text-gray-900 dark:text-gray-100">{formData.matrix_quadrant?.replace('-', ' ')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ScorePicker label="Legitimacy (1–5)" value={formData.legitimacy_level} onChange={(v) => setScore('legitimacy_level', v)} />
              <ScorePicker label="Urgency (1–5)" value={formData.urgency_level} onChange={(v) => setScore('urgency_level', v)} />
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salience class (auto)</span>
              <p className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg capitalize text-gray-900 dark:text-gray-100">{formData.salience_class || '—'}</p>
            </div>
          </>
        )}

        {formTab === 'attitude' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current attitude</label>
                <select name="current_attitude" value={formData.current_attitude} onChange={handleChange} className={fieldClass}>
                  {ATTITUDES.map(a => (<option key={a} value={a}>{a}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desired attitude</label>
                <select name="desired_attitude" value={formData.desired_attitude} onChange={handleChange} className={fieldClass}>
                  {ATTITUDES.map(a => (<option key={a} value={a}>{a}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Engagement priority</label>
              <select name="engagement_priority" value={formData.engagement_priority} onChange={handleChange} className={fieldClass}>
                {PRIORITIES.map(p => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Power sources</span>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {POWER_SOURCES.map((src, index) => (
                  <label key={src} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-6 shrink-0 text-sm tabular-nums text-gray-700 dark:text-gray-200">{index + 1}</span>
                    <input
                      type="checkbox"
                      checked={formData.power_sources.includes(src)}
                      onChange={() => togglePowerSource(src)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{src}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {formTab === 'engagement' && (
          <>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key messages</h3>
            <MultiLineListInput
              viewModeId="stakeholder-analysis-key-messages"
              value={formData.key_messages}
              onChange={(value) => {
                setIsDirty(true)
                setFormData((prev) => ({ ...prev, key_messages: value }))
              }}
              itemColumnLabel="Key message"
              placeholder="Add a key message"
              ariaLabelPrefix="key message"
            />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Engagement strategy</h3>
            <MultiLineListInput
              viewModeId="stakeholder-analysis-engagement-strategy"
              value={formData.engagement_strategy}
              onChange={(value) => {
                setIsDirty(true)
                setFormData((prev) => ({ ...prev, engagement_strategy: value }))
              }}
              itemColumnLabel="Engagement strategy"
              placeholder="Add an engagement approach"
              ariaLabelPrefix="engagement strategy"
            />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Analysis date</label>
                <input type="date" name="analysis_date" value={formData.analysis_date} onChange={handleChange} className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Period</label>
                <SelectField
                  value={formData.analysis_period}
                  onChange={(value) => {
                    setIsDirty(true)
                    setFormData((prev) => ({ ...prev, analysis_period: value || '' }))
                  }}
                  options={periodSelectOptions(periodRows, formData.analysis_period)}
                  placeholder="Search periods"
                  searchPlaceholder="Search periods..."
                  forceSearchable
                  allowCustom
                  openAbove
                  loading={periodLoading}
                  customValueActions={[{
                    key: 'add-period',
                    label: (term) => `Add "${term}" for this organisation`,
                    onSelect: addPeriod,
                  }]}
                  className={fieldClass}
                />
                {periodError && (
                  <p className="mt-2 text-sm text-red-700 dark:text-red-300">{periodError}</p>
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={handleCancel} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
          <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save className="h-4 w-4" />Save</button>
        </div>
      </form>
    </div>
  )
}
