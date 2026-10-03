/**
 * Governance Framework – Create / Edit
 * Route: /platform/governance/framework/create  |  /platform/governance/framework/:id/edit
 *
 * Principles: MultiLineListInput (newline-joined TEXT).
 * Escalation: structured steps (Level · Escalate to · Timeframe · Notes) stored as escalation_path TEXT.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, Shield, ArrowLeft, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import SelectField from '@nidus/ui/SelectField'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const inp =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1'

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

const EMPTY = {
  name: '',
  version: '1.0',
  status: 'draft',
  description: '',
  principles: '',
  notes: '',
}

function emptyEscalationStep(level = 1) {
  return { level, whom: '', timeframe: '', notes: '' }
}

function normalizeEscalationFromText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return []
  return lines.map((line, i) => {
    const m = line.match(/^L(\d+):\s*(.*)$/i)
    if (m) {
      const rest = m[2]
      const notesMatch = rest.match(/^(.*?)\s*\((.*)\)\s*$/)
      if (notesMatch) {
        const mid = notesMatch[1]
        const parts = mid.split(/\s+—\s+/)
        return {
          level: Number(m[1]) || i + 1,
          whom: parts[0] || '',
          timeframe: parts.slice(1).join(' — ') || '',
          notes: notesMatch[2] || '',
        }
      }
      const parts = rest.split(/\s+—\s+/)
      return {
        level: Number(m[1]) || i + 1,
        whom: parts[0] || rest,
        timeframe: parts.slice(1).join(' — ') || '',
        notes: '',
      }
    }
    return { level: i + 1, whom: line, timeframe: '', notes: '' }
  })
}

function stepsToLegacyText(steps) {
  return (Array.isArray(steps) ? steps : [])
    .map((s) => {
      const level = s.level != null ? `L${s.level}: ` : ''
      const whom = String(s.whom || '').trim()
      const tf = String(s.timeframe || '').trim()
      const notes = String(s.notes || '').trim()
      if (!whom && !tf && !notes) return ''
      const mid = [whom, tf].filter(Boolean).join(' — ')
      return `${level}${mid}${notes ? ` (${notes})` : ''}`.trim()
    })
    .filter(Boolean)
    .join('\n')
}

export default function GovernanceFrameworkForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()

  const [form, setForm] = useState(EMPTY)
  const [escalationSteps, setEscalationSteps] = useState([])
  const [record, setRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (!isEdit) return
    platformDb
      .from('governance_frameworks')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            name: data.name ?? '',
            version: data.version ?? '1.0',
            status: data.status ?? 'draft',
            description: data.description ?? '',
            principles: data.principles ?? '',
            notes: data.notes ?? '',
          })
          setEscalationSteps(normalizeEscalationFromText(data.escalation_path))
          setRecord(data)
        }
        setLoading(false)
      })
  }, [id, isEdit])

  useEffect(() => {
    if (formTab !== 'audit' || !record) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [record.created_by, record.updated_by])
      setAuditUserLabels(labels)
    })()
  }, [formTab, record])

  const setField = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const updateStep = (index, patch) => {
    setEscalationSteps((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  const addStep = () => {
    setEscalationSteps((prev) => [...prev, emptyEscalationStep(prev.length + 1)])
  }

  const removeStep = (index) => {
    setEscalationSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, level: i + 1 })),
    )
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const cleanedSteps = (escalationSteps || [])
        .map((s, i) => ({
          level: Number(s.level) || i + 1,
          whom: String(s.whom || '').trim(),
          timeframe: String(s.timeframe || '').trim(),
          notes: String(s.notes || '').trim(),
        }))
        .filter((s) => s.whom || s.timeframe || s.notes)
        .map((s, i) => ({ ...s, level: s.level || i + 1 }))

      const payload = {
        ...form,
        escalation_path: stepsToLegacyText(cleanedSteps) || null,
        updated_at: new Date().toISOString(),
      }

      if (isEdit) {
        const { data, error } = await platformDb
          .from('governance_frameworks')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single()
        if (error) throw error
        setRecord(data)
        setEscalationSteps(normalizeEscalationFromText(data.escalation_path))
        showSuccess({
          recordId: data?.name || id,
          operation: 'updated',
          message: 'Governance framework updated.',
        })
      } else {
        const { data, error } = await platformDb
          .from('governance_frameworks')
          .insert({ ...payload, is_deleted: false, created_at: new Date().toISOString() })
          .select('*')
          .single()
        if (error) throw error
        setRecord(data)
        showSuccess({
          recordId: data?.name || data?.id,
          operation: 'created',
          message: 'Governance framework created.',
          onOk: () => navigate(`/platform/governance/framework/${data.id}/edit`),
        })
      }
    } catch (err) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 text-sm"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-3">
          <Shield size={22} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold">{isEdit ? 'Edit' : 'New'} Governance Framework</h1>
        </div>

        <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

        {formTab === 'audit' ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            {!record ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">Audit details appear after this framework is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this governance framework, and how it is classified.">
                <AuditCard title="Identity" description="How this framework is labelled and tracked.">
                  <AuditField label="Name" value={record.name} />
                  <AuditField label="Version" value={record.version} />
                  <AuditField label="Status" value={humanizeAuditToken(record.status)} />
                </AuditCard>
                <AuditCard title="Classification" description="Where this framework sits.">
                  <AuditField label="Escalation path" value={record.escalation_path} />
                </AuditCard>
                <AuditCard title="Record history" description="When this framework was created and last changed.">
                  <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                  <AuditField label="Updated by" value={record.updated_by ? auditUserLabels[record.updated_by] || null : null} />
                  <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        ) : (
          <form onSubmit={handleSave} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-5">
            <div>
              <label className={lbl}>
                Name <span className="text-red-500">*</span>
              </label>
              <input className={inp} value={form.name} onChange={setField('name')} required disabled={saving} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Version</label>
                <input className={inp} value={form.version} onChange={setField('version')} disabled={saving} />
              </div>
              <div>
                <label className={lbl}>Status</label>
                <SelectField
                  forceNative
                  options={STATUS_OPTIONS}
                  value={form.status}
                  onChange={(status) => setForm((p) => ({ ...p, status: status || 'draft' }))}
                  disabled={saving}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className={lbl}>Description</label>
              <textarea className={`${inp} min-h-[5rem]`} value={form.description} onChange={setField('description')} disabled={saving} rows={3} />
            </div>

            <div className="space-y-1">
              <label className={lbl}>Governance principles</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">One principle per row.</p>
              <MultiLineListInput
                viewModeId="gov-framework-principles"
                value={form.principles}
                onChange={(principles) => setForm((p) => ({ ...p, principles }))}
                placeholder="Add a governance principle…"
                itemColumnLabel="Principle"
                ariaLabelPrefix="principle"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className={lbl}>Escalation path</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Level, whom to escalate to, and timeframe (one step per row).
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
                      <TableRowNumberHeader />
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase w-16">Level</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Escalate to (whom)</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Timeframe</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase">Notes</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {escalationSteps.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-gray-500 dark:text-gray-400">
                          None recorded.
                        </td>
                      </tr>
                    ) : (
                      escalationSteps.map((row, index) => (
                        <tr key={`esc-${index}`}>
                          <TableRowNumberCell number={getDisplayRowNumber(index)} />
                          <td className="px-2 py-2 align-top">
                            <input
                              type="number"
                              min={1}
                              value={row.level ?? index + 1}
                              onChange={(e) => updateStep(index, { level: Number(e.target.value) || index + 1 })}
                              className={inp}
                              disabled={saving}
                              aria-label={`Escalation level ${index + 1}`}
                            />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <input
                              type="text"
                              value={row.whom || ''}
                              onChange={(e) => updateStep(index, { whom: e.target.value })}
                              className={inp}
                              placeholder="e.g. Project Board"
                              disabled={saving}
                            />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <input
                              type="text"
                              value={row.timeframe || ''}
                              onChange={(e) => updateStep(index, { timeframe: e.target.value })}
                              className={inp}
                              placeholder="e.g. Within 1 day"
                              disabled={saving}
                            />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <input
                              type="text"
                              value={row.notes || ''}
                              onChange={(e) => updateStep(index, { notes: e.target.value })}
                              className={inp}
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

            <div>
              <label className={lbl}>Notes</label>
              <textarea className={`${inp} min-h-[5rem]`} value={form.notes} onChange={setField('notes')} disabled={saving} rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white"
              >
                <Save size={15} />
                {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
      {modal}
    </div>
  )
}
