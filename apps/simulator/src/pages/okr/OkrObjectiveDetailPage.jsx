/**
 * OKR Objective — view page with Details/Key Results/Audit tabs (rule 63.1, tabs prop for a
 * 3-tab shape). Simulator mirror of apps/platform/src/pages/okr/OkrObjectiveDetailPage.jsx.
 * Key Results are managed inline (add/edit/delete) rather than as separate routed pages.
 * GAP-03, v963 Phase 8.
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { RowActionButton } from '@nidus/ui'
import {
  getObjective,
  getCycle,
  listKeyResults,
  createKeyResult,
  updateKeyResult,
  deleteKeyResult,
} from '../../services/okrService'

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'
const BASE = '/simulator/pm/okr/objectives'

const HEALTH_CLASS = {
  on_track: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
  at_risk: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  behind: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  completed: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
}

const EMPTY_KR = { kr_title: '', kr_description: '', target_value: '', current_value: '', unit_label: '', health_status: 'on_track' }

function KeyResultRowForm({ initial, onCancel, onSave, saving }) {
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Key result title *</label>
        <input type="text" value={form.kr_title} onChange={set('kr_title')} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Target</label>
          <input type="number" value={form.target_value} onChange={set('target_value')} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Current</label>
          <input type="number" value={form.current_value} onChange={set('current_value')} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
          <input type="text" value={form.unit_label} onChange={set('unit_label')} className={inputClass} placeholder="%, $, count…" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Health</label>
          <select value={form.health_status} onChange={set('health_status')} className={inputClass}>
            <option value="on_track">On track</option>
            <option value="at_risk">At risk</option>
            <option value="behind">Behind</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={saving || !form.kr_title.trim()}
          onClick={() => onSave(form)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          {saving ? 'Saving…' : 'Save key result'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function OkrObjectiveDetailPage() {
  const { objectiveId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [objective, setObjective] = useState(null)
  const [cycle, setCycle] = useState(null)
  const [keyResults, setKeyResults] = useState([])
  const [activeTab, setActiveTab] = useState('details')
  const [addingKr, setAddingKr] = useState(false)
  const [editingKrId, setEditingKrId] = useState(null)
  const [krSaving, setKrSaving] = useState(false)

  const loadKeyResults = async () => {
    const rows = await listKeyResults(objectiveId)
    setKeyResults(rows)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const record = await getObjective(objectiveId)
      if (cancelled) return
      setObjective(record)
      if (record?.cycle_id) {
        const cycleRecord = await getCycle(record.cycle_id)
        if (!cancelled) setCycle(cycleRecord)
      }
      await loadKeyResults()
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [objectiveId])

  const handleCreateKr = async (form) => {
    setKrSaving(true)
    try {
      await createKeyResult({
        objective_id: objectiveId,
        kr_title: form.kr_title.trim(),
        kr_description: form.kr_description?.trim() || null,
        target_value: form.target_value === '' ? null : Number(form.target_value),
        current_value: form.current_value === '' ? 0 : Number(form.current_value),
        unit_label: form.unit_label?.trim() || null,
        health_status: form.health_status,
      })
      setAddingKr(false)
      await loadKeyResults()
    } finally {
      setKrSaving(false)
    }
  }

  const handleUpdateKr = async (krId, form) => {
    setKrSaving(true)
    try {
      await updateKeyResult(krId, {
        kr_title: form.kr_title.trim(),
        kr_description: form.kr_description?.trim() || null,
        target_value: form.target_value === '' ? null : Number(form.target_value),
        current_value: form.current_value === '' ? 0 : Number(form.current_value),
        unit_label: form.unit_label?.trim() || null,
        health_status: form.health_status,
      })
      setEditingKrId(null)
      await loadKeyResults()
    } finally {
      setKrSaving(false)
    }
  }

  const handleDeleteKr = async (krId) => {
    if (!window.confirm('Remove this key result?')) return
    await deleteKeyResult(krId)
    await loadKeyResults()
  }

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  if (!objective) return <div className="p-8 text-gray-500 dark:text-gray-400">Objective not found.</div>

  const tabs = [
    { value: 'details', label: 'Details' },
    { value: 'key-results', label: `Key Results (${keyResults.length})` },
    { value: 'audit', label: 'Audit details' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate(BASE)} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Objectives
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{objective.objective_title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cycle?.cycle_name || '—'}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`${BASE}/${objectiveId}/edit`)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} tabs={tabs} ariaLabel="OKR objective sections" />

      {activeTab === 'details' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${HEALTH_CLASS[objective.health_status] || HEALTH_CLASS.on_track}`}>
              {(objective.health_status || '').replace('_', ' ')}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">{Number(objective.progress_pct || 0).toFixed(0)}% complete</span>
          </div>
          {objective.objective_description && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{objective.objective_description}</p>
            </div>
          )}
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Scope</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">{objective.scope_level}</p>
          </div>
        </div>
      )}

      {activeTab === 'key-results' && (
        <div className="space-y-3">
          {keyResults.map((kr) => (
            <div key={kr.id}>
              {editingKrId === kr.id ? (
                <KeyResultRowForm
                  initial={{
                    kr_title: kr.kr_title || '', kr_description: kr.kr_description || '',
                    target_value: kr.target_value ?? '', current_value: kr.current_value ?? '',
                    unit_label: kr.unit_label || '', health_status: kr.health_status || 'on_track',
                  }}
                  saving={krSaving}
                  onCancel={() => setEditingKrId(null)}
                  onSave={(form) => handleUpdateKr(kr.id, form)}
                />
              ) : (
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{kr.kr_title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {kr.current_value ?? 0}{kr.unit_label ? ` ${kr.unit_label}` : ''} of {kr.target_value ?? '—'}{kr.unit_label ? ` ${kr.unit_label}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${HEALTH_CLASS[kr.health_status] || HEALTH_CLASS.on_track}`}>
                      {(kr.health_status || '').replace('_', ' ')}
                    </span>
                    <RowActionButton variant="edit" label="Edit key result" onClick={() => setEditingKrId(kr.id)} />
                    <button type="button" onClick={() => handleDeleteKr(kr.id)} className="p-2 rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" aria-label="Delete key result">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {keyResults.length === 0 && !addingKr && (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              No key results yet.
            </div>
          )}

          {addingKr ? (
            <KeyResultRowForm initial={EMPTY_KR} saving={krSaving} onCancel={() => setAddingKr(false)} onSave={handleCreateKr} />
          ) : (
            <button
              type="button"
              onClick={() => setAddingKr(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Key Result
            </button>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <AuditDetailsPanel description="Who created or changed this objective.">
          <AuditCard title="Identity">
            <AuditField label="Objective" value={objective.objective_title || '—'} />
            <AuditField label="Cycle" value={cycle?.cycle_name || '—'} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Scope" value={objective.scope_level} />
            <AuditField label="Health" value={(objective.health_status || '').replace('_', ' ')} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditTimestampPair dateLabel="Created at" value={objective.created_at} />
            <AuditTimestampPair dateLabel="Updated at" value={objective.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  )
}
