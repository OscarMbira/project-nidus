import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { createEEF, listEEFCategories, listSimulationRunsForPicker } from '../../../services/sim/simEEFService'
import { getCurrentUserAccountId } from '../../../utils/accountResolution'

export default function SimEEFCreate() {
  const navigate = useNavigate()
  const [accountId, setAccountId] = useState(null)
  const [categories, setCategories] = useState([])
  const [runs, setRuns] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    eef_type: 'internal',
    impact_level: 'medium',
    impact_direction: 'neutral',
    source_reference: '',
    related_simulation_run_id: '',
    status: 'active',
    notes: '',
    on_hold_reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    ;(async () => {
      const id = await getCurrentUserAccountId()
      setAccountId(id)
      if (id) {
        const c = await listEEFCategories(id)
        setCategories(c.data || [])
      }
      const r = await listSimulationRunsForPicker()
      setRuns(r.data || [])
    })()
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (onHold) => {
    if (!accountId || !form.title.trim()) {
      setError('Organisation and title are required')
      return
    }
    setSaving(true)
    setError(null)
    const { data, error: e } = await createEEF({
      organisation_id: accountId,
      title: form.title.trim(),
      description: form.description || null,
      category_id: form.category_id || null,
      eef_type: form.eef_type,
      impact_level: form.impact_level,
      impact_direction: form.impact_direction,
      source_reference: form.source_reference || null,
      related_simulation_run_id: form.related_simulation_run_id || null,
      status: form.status,
      notes: form.notes || null,
      is_on_hold: onHold,
      on_hold_reason: onHold ? form.on_hold_reason || 'Draft' : null,
    })
    setSaving(false)
    if (e) {
      setError(e.message)
      return
    }
    setSuccess({ id: data.id })
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6">
          <p className="text-green-800 dark:text-green-200 font-medium">EEF created.</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Record ID: {success.id}</p>
          <button type="button" className="mt-6 px-4 py-2 rounded-lg bg-sky-600 text-white" onClick={() => navigate(`/simulator/eef/${success.id}`)}>
            View
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button type="button" onClick={() => navigate('/simulator/eef')} className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">New Simulator EEF</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Title *</span>
          <input className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Description</span>
          <textarea className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[80px]" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Category</span>
          <select className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Related simulation run</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]"
            value={form.related_simulation_run_id}
            onChange={(e) => set('related_simulation_run_id', e.target.value)}
          >
            <option value="">— None —</option>
            {runs.map((run) => (
              <option key={run.id} value={run.id}>
                {run.id.slice(0, 8)}… {run.created_at ? new Date(run.created_at).toLocaleDateString() : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" disabled={saving} className="px-4 py-2 rounded-lg border border-amber-500 text-amber-700" onClick={() => submit(true)}>
            <Save className="h-4 w-4 inline" /> On hold
          </button>
          <button type="button" disabled={saving} className="px-4 py-2 rounded-lg bg-sky-600 text-white" onClick={() => submit(false)}>
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
