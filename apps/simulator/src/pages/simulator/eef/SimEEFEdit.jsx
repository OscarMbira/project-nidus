import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { getEEFById, listEEFCategories, listSimulationRunsForPicker, updateEEF } from '../../../services/sim/simEEFService'

export default function SimEEFEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [runs, setRuns] = useState([])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await getEEFById(id)
      if (error || !data) return
      const c = await listEEFCategories(data.organisation_id)
      setCategories(c.data || [])
      const r = await listSimulationRunsForPicker()
      setRuns(r.data || [])
      setForm({
        title: data.title,
        description: data.description || '',
        category_id: data.category_id || '',
        eef_type: data.eef_type,
        impact_level: data.impact_level,
        impact_direction: data.impact_direction,
        source_reference: data.source_reference || '',
        related_simulation_run_id: data.related_simulation_run_id || '',
        status: data.status,
        notes: data.notes || '',
        is_on_hold: data.is_on_hold,
        on_hold_reason: data.on_hold_reason || '',
      })
    })()
  }, [id])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form) return
    setSaving(true)
    const { error } = await updateEEF(id, {
      title: form.title,
      description: form.description || null,
      category_id: form.category_id || null,
      eef_type: form.eef_type,
      impact_level: form.impact_level,
      impact_direction: form.impact_direction,
      source_reference: form.source_reference || null,
      related_simulation_run_id: form.related_simulation_run_id || null,
      status: form.status,
      notes: form.notes || null,
      is_on_hold: form.is_on_hold,
      on_hold_reason: form.is_on_hold ? form.on_hold_reason : null,
    })
    setSaving(false)
    if (error) alert(error.message)
    else navigate(`/simulator/eef/${id}`)
  }

  if (!form) return <div className="p-8 text-gray-400">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to={`/simulator/eef/${id}`} className="inline-flex items-center gap-2 text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6">Edit EEF</h1>
      <div className="space-y-4 bg-gray-800 rounded-xl border border-gray-700 p-6">
        <input className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-white" value={form.title} onChange={(e) => set('title', e.target.value)} />
        <textarea className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-white min-h-[80px]" value={form.description} onChange={(e) => set('description', e.target.value)} />
        <select className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-white" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-white"
          value={form.related_simulation_run_id}
          onChange={(e) => set('related_simulation_run_id', e.target.value)}
        >
          <option value="">— Run —</option>
          {runs.map((run) => (
            <option key={run.id} value={run.id}>
              {run.id.slice(0, 8)}…
            </option>
          ))}
        </select>
        <button type="button" disabled={saving} onClick={save} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white">
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
    </div>
  )
}
