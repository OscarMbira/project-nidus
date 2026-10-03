/**
 * Governance Structure — bodies / reporting / decision flow,
 * PMO oversight, structured escalation + reporting tables, Audit.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import SelectField from '@nidus/ui/SelectField'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { getGovernanceStructure, saveGovernanceStructure } from '../../services/projectGovernanceStructureService'
import {
  loadGovernancePartyOptions,
  normalizeEscalationSteps,
  normalizeReportingEntries,
  normalizeDecisionEntries,
  emptyEscalationStep,
  emptyReportingEntry,
  emptyDecisionEntry,
} from '../../services/governancePartyOptions'
import GovernanceChartsGallery from './GovernanceChartsGallery'

const TABS = [
  { value: 'structure', label: 'Governance Structure' },
  { value: 'pmo_oversight', label: 'PMO Oversight' },
  { value: 'escalation', label: 'Escalation Path' },
  { value: 'audit', label: 'Audit details' },
]

const CONTENT_TABS = new Set(['structure', 'pmo_oversight', 'escalation'])

const CADENCE_OPTIONS = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Fortnightly', label: 'Fortnightly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'Quarterly', label: 'Quarterly' },
  { value: 'Ad hoc', label: 'Ad hoc' },
  { value: 'As needed', label: 'As needed' },
]

const METHOD_OPTIONS = [
  { value: 'Consensus', label: 'Consensus' },
  { value: 'Majority vote', label: 'Majority vote' },
  { value: 'Unanimous', label: 'Unanimous' },
  { value: 'Chair decision', label: 'Chair decision' },
  { value: 'Sponsor decision', label: 'Sponsor decision' },
  { value: 'Delegated authority', label: 'Delegated authority' },
  { value: 'Escalation required', label: 'Escalation required' },
]

const EMPTY_FORM = {
  structure_notes: '',
  governance_bodies: '',
  pmo_oversight_notes: '',
  escalation_steps: [],
  reporting_entries: [],
  decision_entries: [],
}

function PartySelect({ value, onChange, options, disabled, placeholder }) {
  return (
    <SelectField
      forceSearchable
      allowCustom
      options={options}
      value={value || ''}
      onChange={(v) => onChange(v || '')}
      placeholder={placeholder}
      searchPlaceholder="Search bodies, members, roles…"
      disabled={disabled}
      className="w-full min-w-[11rem]"
    />
  )
}

export default function GovernanceStructurePage() {
  const navigate = useNavigate()
  const { projectId } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()

  const [activeTab, setActiveTab] = useState('structure')
  const [record, setRecord] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [partyOptions, setPartyOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uid, setUid] = useState(null)
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const refreshPartyOptions = useCallback(async (bodiesText) => {
    if (!projectId) {
      setPartyOptions([])
      return
    }
    try {
      const opts = await loadGovernancePartyOptions(projectId, bodiesText)
      setPartyOptions(opts)
    } catch (e) {
      console.warn('loadGovernancePartyOptions', e)
    }
  }, [projectId])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [data, { data: { user } }] = await Promise.all([
        getGovernanceStructure(projectId),
        platformDb.auth.getUser(),
      ])
      setRecord(data)
      const bodies = data?.governance_bodies || ''
      setForm({
        structure_notes: data?.structure_notes || '',
        governance_bodies: bodies,
        pmo_oversight_notes: data?.pmo_oversight_notes || '',
        escalation_steps: normalizeEscalationSteps(data),
        reporting_entries: normalizeReportingEntries(data),
        decision_entries: normalizeDecisionEntries(data),
      })
      await refreshPartyOptions(bodies)
      if (user) {
        const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to load governance structure')
    } finally {
      setLoading(false)
    }
  }, [projectId, refreshPartyOptions])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (activeTab !== 'audit' || !record) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [record.created_by, record.updated_by])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [activeTab, record])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const cleanedSteps = (form.escalation_steps || [])
        .map((s, i) => ({
          level: Number(s.level) || i + 1,
          whom: String(s.whom || '').trim(),
          timeframe: String(s.timeframe || '').trim(),
          notes: String(s.notes || '').trim(),
        }))
        .filter((s) => s.whom || s.timeframe || s.notes)
        .map((s, i) => ({ ...s, level: s.level || i + 1 }))

      const cleanedReporting = (form.reporting_entries || [])
        .map((r) => ({
          from_party: String(r.from_party || '').trim(),
          to_party: String(r.to_party || '').trim(),
          cadence: String(r.cadence || '').trim(),
          notes: String(r.notes || '').trim(),
        }))
        .filter((r) => r.from_party || r.to_party || r.cadence || r.notes)

      const cleanedDecisions = (form.decision_entries || [])
        .map((r) => ({
          decision: String(r.decision || '').trim(),
          decided_by: String(r.decided_by || '').trim(),
          method: String(r.method || '').trim(),
          notes: String(r.notes || '').trim(),
        }))
        .filter((r) => r.decision || r.decided_by || r.method || r.notes)

      const payload = {
        ...form,
        escalation_steps: cleanedSteps,
        reporting_entries: cleanedReporting,
        decision_entries: cleanedDecisions,
      }
      const saved = await saveGovernanceStructure(projectId, payload, uid)
      setRecord(saved)
      setForm((f) => ({
        ...f,
        escalation_steps: normalizeEscalationSteps(saved),
        reporting_entries: normalizeReportingEntries(saved),
        decision_entries: normalizeDecisionEntries(saved),
      }))
      showSuccess({ recordId: projectId, operation: record ? 'updated' : 'created', message: 'Governance structure saved.' })
    } catch (e2) {
      toast.error(e2?.message || 'Failed to save governance structure')
    } finally {
      setSaving(false)
    }
  }

  const setList = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (key === 'governance_bodies') {
      void refreshPartyOptions(value)
    }
  }

  const updateStep = (index, patch) => {
    setForm((f) => {
      const next = [...(f.escalation_steps || [])]
      next[index] = { ...next[index], ...patch }
      return { ...f, escalation_steps: next }
    })
  }

  const addStep = () => {
    setForm((f) => {
      const steps = f.escalation_steps || []
      return { ...f, escalation_steps: [...steps, emptyEscalationStep(steps.length + 1)] }
    })
  }

  const removeStep = (index) => {
    setForm((f) => ({
      ...f,
      escalation_steps: (f.escalation_steps || [])
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, level: i + 1 })),
    }))
  }

  const updateReporting = (index, patch) => {
    setForm((f) => {
      const next = [...(f.reporting_entries || [])]
      next[index] = { ...next[index], ...patch }
      return { ...f, reporting_entries: next }
    })
  }

  const addReporting = () => {
    setForm((f) => ({
      ...f,
      reporting_entries: [...(f.reporting_entries || []), emptyReportingEntry()],
    }))
  }

  const removeReporting = (index) => {
    setForm((f) => ({
      ...f,
      reporting_entries: (f.reporting_entries || []).filter((_, i) => i !== index),
    }))
  }

  const updateDecision = (index, patch) => {
    setForm((f) => {
      const next = [...(f.decision_entries || [])]
      next[index] = { ...next[index], ...patch }
      return { ...f, decision_entries: next }
    })
  }

  const addDecision = () => {
    setForm((f) => ({
      ...f,
      decision_entries: [...(f.decision_entries || []), emptyDecisionEntry()],
    }))
  }

  const removeDecision = (index) => {
    setForm((f) => ({
      ...f,
      decision_entries: (f.decision_entries || []).filter((_, i) => i !== index),
    }))
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100'

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Governance Structure</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Bodies, reporting lines, decision flow, PMO oversight, and escalation</p>
          </div>
        </div>

        <DetailAuditTabList
          activeTab={activeTab}
          onChange={setActiveTab}
          ariaLabel="Governance Structure sections"
          tabs={TABS}
        />

        {loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading…</p>
        ) : CONTENT_TABS.has(activeTab) ? (
          <form onSubmit={handleSave} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-5">
            {activeTab === 'structure' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Overview (optional)</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Short narrative if needed. Prefer the structured lists and tables below. Add chart images or PDFs in the gallery.
                  </p>
                  <textarea
                    rows={3}
                    value={form.structure_notes}
                    onChange={(e) => setForm({ ...form, structure_notes: e.target.value })}
                    placeholder="Optional overview of the governance model…"
                    className={inputClass}
                  />
                  <div className="mt-4">
                    <GovernanceChartsGallery projectId={projectId} disabled={saving} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Governance bodies</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Which bodies apply. Membership is on Steering Committee / Project Board pages — names here also feed Escalation / Reporting dropdowns.
                  </p>
                  <MultiLineListInput
                    viewModeId="gov-structure-bodies"
                    value={form.governance_bodies}
                    onChange={setList('governance_bodies')}
                    placeholder="Add a governance body…"
                    itemColumnLabel="Body"
                    ariaLabelPrefix="body"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Reporting lines</label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        From → To, with cadence. Parties from bodies, governance members, and project roles.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addReporting}
                      disabled={saving}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" /> Add line
                    </button>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <TableRowNumberHeader />
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">From</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">To</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Cadence</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Notes</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {(form.reporting_entries || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-4 text-gray-500 dark:text-gray-400">None recorded.</td>
                          </tr>
                        ) : (
                          (form.reporting_entries || []).map((row, index) => (
                            <tr key={`rep-${index}`}>
                              <TableRowNumberCell number={getDisplayRowNumber(index)} />
                              <td className="px-2 py-2 align-top">
                                <PartySelect
                                  value={row.from_party}
                                  onChange={(from_party) => updateReporting(index, { from_party })}
                                  options={partyOptions}
                                  disabled={saving}
                                  placeholder="From…"
                                />
                              </td>
                              <td className="px-2 py-2 align-top">
                                <PartySelect
                                  value={row.to_party}
                                  onChange={(to_party) => updateReporting(index, { to_party })}
                                  options={partyOptions}
                                  disabled={saving}
                                  placeholder="To…"
                                />
                              </td>
                              <td className="px-2 py-2 align-top min-w-[8rem]">
                                <SelectField
                                  forceSearchable
                                  allowCustom
                                  options={CADENCE_OPTIONS}
                                  value={row.cadence || ''}
                                  onChange={(cadence) => updateReporting(index, { cadence: cadence || '' })}
                                  placeholder="Cadence…"
                                  searchPlaceholder="Search cadence…"
                                  disabled={saving}
                                  className="w-full"
                                  aria-label={`Cadence for reporting line ${index + 1}`}
                                />
                              </td>
                              <td className="px-2 py-2 align-top">
                                <input
                                  type="text"
                                  value={row.notes || ''}
                                  onChange={(e) => updateReporting(index, { notes: e.target.value })}
                                  className={inputClass}
                                  placeholder="Notes…"
                                  disabled={saving}
                                />
                              </td>
                              <td className="px-2 py-2 align-top text-right">
                                <RowActionButton
                                  variant="delete"
                                  label={`Remove reporting line ${index + 1}`}
                                  onClick={() => removeReporting(index)}
                                  disabled={saving}
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Decision flow</label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        What is decided, by whom, and how. Parties from bodies, governance members, and project roles.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addDecision}
                      disabled={saving}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" /> Add rule
                    </button>
                  </div>
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <TableRowNumberHeader />
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Decision</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Decided by</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Method</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Notes</th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {(form.decision_entries || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-4 text-gray-500 dark:text-gray-400">None recorded.</td>
                          </tr>
                        ) : (
                          (form.decision_entries || []).map((row, index) => (
                            <tr key={`dec-${index}`}>
                              <TableRowNumberCell number={getDisplayRowNumber(index)} />
                              <td className="px-2 py-2 align-top min-w-[10rem]">
                                <input
                                  type="text"
                                  value={row.decision || ''}
                                  onChange={(e) => updateDecision(index, { decision: e.target.value })}
                                  className={inputClass}
                                  placeholder="e.g. Budget over threshold"
                                  disabled={saving}
                                  aria-label={`Decision ${index + 1}`}
                                />
                              </td>
                              <td className="px-2 py-2 align-top">
                                <PartySelect
                                  value={row.decided_by}
                                  onChange={(decided_by) => updateDecision(index, { decided_by })}
                                  options={partyOptions}
                                  disabled={saving}
                                  placeholder="Decided by…"
                                />
                              </td>
                              <td className="px-2 py-2 align-top min-w-[9rem]">
                                <SelectField
                                  forceSearchable
                                  allowCustom
                                  options={METHOD_OPTIONS}
                                  value={row.method || ''}
                                  onChange={(method) => updateDecision(index, { method: method || '' })}
                                  placeholder="Method…"
                                  searchPlaceholder="Search method…"
                                  disabled={saving}
                                  className="w-full"
                                  aria-label={`Method for decision ${index + 1}`}
                                />
                              </td>
                              <td className="px-2 py-2 align-top">
                                <input
                                  type="text"
                                  value={row.notes || ''}
                                  onChange={(e) => updateDecision(index, { notes: e.target.value })}
                                  className={inputClass}
                                  placeholder="Notes…"
                                  disabled={saving}
                                />
                              </td>
                              <td className="px-2 py-2 align-top text-right">
                                <RowActionButton
                                  variant="delete"
                                  label={`Remove decision rule ${index + 1}`}
                                  onClick={() => removeDecision(index)}
                                  disabled={saving}
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'pmo_oversight' && (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">PMO oversight arrangements</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  One arrangement per row (e.g. “Monthly PMO health check”).
                </p>
                <MultiLineListInput
                  viewModeId="gov-pmo-oversight-arrangements"
                  value={form.pmo_oversight_notes}
                  onChange={setList('pmo_oversight_notes')}
                  placeholder="Add a PMO oversight arrangement…"
                  itemColumnLabel="Arrangement"
                  ariaLabelPrefix="arrangement"
                  disabled={saving}
                />
              </div>
            )}

            {activeTab === 'escalation' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Escalation steps</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Level, whom (bodies / members / roles), and timeframe.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addStep}
                    disabled={saving}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> Add step
                  </button>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase w-16">Level</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Escalate to (whom)</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Timeframe</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Notes</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {(form.escalation_steps || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-gray-500 dark:text-gray-400">None recorded.</td>
                        </tr>
                      ) : (
                        (form.escalation_steps || []).map((row, index) => (
                          <tr key={`esc-${index}`}>
                            <td className="px-2 py-2 align-top">
                              <input
                                type="number"
                                min={1}
                                value={row.level ?? index + 1}
                                onChange={(e) => updateStep(index, { level: Number(e.target.value) || index + 1 })}
                                className={inputClass}
                                disabled={saving}
                                aria-label={`Escalation level ${index + 1}`}
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <PartySelect
                                value={row.whom}
                                onChange={(whom) => updateStep(index, { whom })}
                                options={partyOptions}
                                disabled={saving}
                                placeholder="Whom…"
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <input
                                type="text"
                                value={row.timeframe || ''}
                                onChange={(e) => updateStep(index, { timeframe: e.target.value })}
                                className={inputClass}
                                placeholder="e.g. Within 1 day"
                                disabled={saving}
                              />
                            </td>
                            <td className="px-2 py-2 align-top">
                              <input
                                type="text"
                                value={row.notes || ''}
                                onChange={(e) => updateStep(index, { notes: e.target.value })}
                                className={inputClass}
                                placeholder="Notes…"
                                disabled={saving}
                              />
                            </td>
                            <td className="px-2 py-2 align-top text-right">
                              <RowActionButton
                                variant="delete"
                                label={`Remove escalation step ${index + 1}`}
                                onClick={() => removeStep(index)}
                                disabled={saving}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </form>
        ) : (
          <AuditDetailsPanel description="Where this project's governance structure record stands.">
            {!record ? (
              <AuditCard title="Identity" description="Not saved yet.">
                <AuditField label="Status" value="Audit details appear after this record is saved" />
              </AuditCard>
            ) : (
              <>
                <AuditCard title="Identity" description="This record.">
                  <AuditField label="Project" value={projectId} />
                </AuditCard>
                <AuditCard title="Record history" description="When this record was created and last updated.">
                  <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                  <AuditField label="Updated by" value={record.updated_by ? auditUserLabels[record.updated_by] || null : null} />
                  <AuditTimestampPair dateLabel="Updated at" value={record.updated_at} />
                </AuditCard>
              </>
            )}
          </AuditDetailsPanel>
        )}
      </div>
      {modal}
    </div>
  )
}
