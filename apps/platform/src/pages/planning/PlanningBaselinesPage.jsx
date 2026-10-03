/**
 * Planning > Baselines (taxonomy §3, Planning > Baselines: Scope/Schedule/Cost Baseline,
 * Baseline History, Baseline Approval). Reuses public.project_baselines (baseline_type enum:
 * schedule/cost/scope/performance) + public.baseline_snapshots (History) — same tables the
 * existing "S-Curve & Baselines" leaf already reads via the generic gap-records service.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { LineChart, Plus, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { listGapRecords, createGapRecord } from '../../modules/pmis-gaps/services/gapDataService'

const BASELINE_TYPES = [
  { key: 'scope', label: 'Scope Baseline' },
  { key: 'schedule', label: 'Schedule Baseline' },
  { key: 'cost', label: 'Cost Baseline' },
]

export default function PlanningBaselinesPage() {
  const { projectId } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const [tab, setTab] = useState('scope')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uid, setUid] = useState(null)
  const [baselines, setBaselines] = useState([])
  const [snapshots, setSnapshots] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ baseline_name: '', comments: '' })

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const [b, s, { data: { user } }] = await Promise.all([
        listGapRecords('project_baselines', { filters: { project_id: projectId }, orderBy: 'baseline_date', ascending: false }),
        listGapRecords('baseline_snapshots', { orderBy: 'snapshot_date', ascending: false }),
        platformDb.auth.getUser(),
      ])
      setBaselines(b)
      setSnapshots(s)
      if (user) {
        const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to load baselines')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const byType = useMemo(() => {
    const map = new Map()
    for (const type of ['scope', 'schedule', 'cost']) map.set(type, baselines.filter((b) => (b.baseline_type || 'schedule') === type))
    return map
  }, [baselines])

  const baselineIds = useMemo(() => new Set(baselines.map((b) => b.id)), [baselines])
  const historyRows = useMemo(() => snapshots.filter((s) => baselineIds.has(s.baseline_id)), [snapshots, baselineIds])
  const pendingApproval = useMemo(() => baselines.filter((b) => !b.approved_by), [baselines])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.baseline_name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      await createGapRecord('project_baselines', {
        project_id: projectId,
        baseline_name: form.baseline_name,
        baseline_type: tab === 'scope' || tab === 'schedule' || tab === 'cost' ? tab : 'schedule',
        baseline_date: new Date().toISOString().slice(0, 10),
        baseline_data: {},
        comments: form.comments || null,
        created_by: uid,
      })
      showSuccess({ recordId: form.baseline_name, operation: 'created', message: 'Baseline created.' })
      setFormOpen(false)
      setForm({ baseline_name: '', comments: '' })
      await load()
    } catch (e2) {
      toast.error(e2?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (baseline) => {
    setSaving(true)
    try {
      const { error } = await platformDb
        .from('project_baselines')
        .update({ approved_by: uid, approval_date: new Date().toISOString() })
        .eq('id', baseline.id)
      if (error) throw error
      showSuccess({ recordId: baseline.baseline_name, operation: 'updated', message: 'Baseline approved.' })
      await load()
    } catch (e) {
      toast.error(e?.message || 'Approve failed')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    ...BASELINE_TYPES,
    { key: 'history', label: `History (${historyRows.length})` },
    { key: 'approval', label: `Approval${pendingApproval.length ? ` (${pendingApproval.length})` : ''}` },
  ]

  const BaselineList = ({ type }) => {
    const rows = byType.get(type) || []
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <button type="button" onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
            <Plus className="h-4 w-4" /> New {BASELINE_TYPES.find((t) => t.key === type)?.label}
          </button>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
            <p>No {type} baselines recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((b) => (
              <div key={b.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{b.baseline_name}</p>
                  {b.approved_by ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /> Approved</span>
                  ) : (
                    <span className="text-xs text-amber-700 dark:text-amber-300">Pending approval</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{b.baseline_date} {b.comments ? `— ${b.comments}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Baselines
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Scope, schedule, and cost baselines — with history and approval</p>
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-fit">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {formOpen && (
          <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 grid grid-cols-1 gap-3">
            <input placeholder="Baseline name *" value={form.baseline_name} onChange={(e) => setForm({ ...form, baseline_name: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm" />
            <textarea placeholder="Comments" value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm" rows={2} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">Create</button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : tab === 'scope' || tab === 'schedule' || tab === 'cost' ? (
          <BaselineList type={tab} />
        ) : tab === 'history' ? (
          historyRows.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
              <p>No baseline snapshots recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Planned %</th>
                    <th className="px-4 py-2 text-left">Actual %</th>
                    <th className="px-4 py-2 text-left">Planned Cost</th>
                    <th className="px-4 py-2 text-left">Actual Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {historyRows.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2">{s.snapshot_date}</td>
                      <td className="px-4 py-2 tabular-nums">{s.planned_pct_complete ?? '—'}</td>
                      <td className="px-4 py-2 tabular-nums">{s.actual_pct_complete ?? '—'}</td>
                      <td className="px-4 py-2 tabular-nums">{s.planned_cost != null ? Number(s.planned_cost).toLocaleString() : '—'}</td>
                      <td className="px-4 py-2 tabular-nums">{s.actual_cost != null ? Number(s.actual_cost).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          pendingApproval.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
              <p>No baselines are pending approval.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingApproval.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 p-4">
                  <div>
                    <p className="font-medium">{b.baseline_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{b.baseline_type} · {b.baseline_date}</p>
                  </div>
                  <button type="button" onClick={() => handleApprove(b)} disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
      {modal}
    </div>
  )
}
