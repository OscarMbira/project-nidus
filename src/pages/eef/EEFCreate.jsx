import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { createEEF, listEEFCategories, listProjectsForOrganisation } from '../../services/eefService'
import { getCurrentUserAccountId } from '../../utils/accountResolution'

const initial = {
  title: '',
  description: '',
  category_id: '',
  eef_type: 'internal',
  impact_level: 'medium',
  impact_direction: 'neutral',
  source_reference: '',
  related_project_id: '',
  status: 'active',
  notes: '',
  is_on_hold: false,
  on_hold_reason: '',
}

export default function EEFCreate() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [accountId, setAccountId] = useState(null)
  const [categories, setCategories] = useState([])
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState(initial)
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
        const p = await listProjectsForOrganisation(id)
        setProjects(p.data || [])
      }
    })()
  }, [])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const buildPayload = (onHold) => ({
    organisation_id: accountId,
    title: form.title.trim(),
    description: form.description || null,
    category_id: form.category_id || null,
    eef_type: form.eef_type,
    impact_level: form.impact_level,
    impact_direction: form.impact_direction,
    source_reference: form.source_reference || null,
    related_project_id: form.related_project_id || null,
    status: form.status,
    notes: form.notes || null,
    is_on_hold: onHold ? true : false,
    on_hold_reason: onHold ? form.on_hold_reason || 'Draft' : null,
  })

  const submit = async (onHold) => {
    if (!accountId) {
      setError('No organisation context')
      return
    }
    if (!form.title.trim()) {
      setError('Title is required')
      return
    }
    setSaving(true)
    setError(null)
    const { data, error: e } = await createEEF(buildPayload(onHold))
    setSaving(false)
    if (e) {
      setError(e.message)
      return
    }
    setSuccess({ id: data.id, op: onHold ? 'saved on hold' : 'created' })
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6">
          <p className="text-green-800 dark:text-green-200 font-medium">EEF {success.op} successfully.</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Record ID: {success.id}</p>
          <button
            type="button"
            className="mt-6 px-4 py-2 rounded-lg bg-sky-600 text-white"
            onClick={() => navigate(`/platform/eef/${success.id}`)}
          >
            View record
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button type="button" onClick={() => navigate('/platform/eef')} className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to list
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">New Enterprise Environment Factor</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Step {step} of 2 — {step === 1 ? 'Basics' : 'Impact & links'}
      </p>
      {error && (
        <p className="text-red-600 dark:text-red-400 mb-4" role="alert">
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Title *</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[100px]"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</span>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]"
              value={form.category_id}
              onChange={(e) => set('category_id', e.target.value)}
            >
              <option value="">— Select —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">EEF type</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]"
                value={form.eef_type}
                onChange={(e) => set('eef_type', e.target.value)}
              >
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="under_review">Under review</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600" onClick={() => setStep(2)}>
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Impact level</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]"
                value={form.impact_level}
                onChange={(e) => set('impact_level', e.target.value)}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Impact direction</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]"
                value={form.impact_direction}
                onChange={(e) => set('impact_direction', e.target.value)}
              >
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </label>
            <label className="block sm:col-span-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Related project</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]"
                value={form.related_project_id}
                onChange={(e) => set('related_project_id', e.target.value)}
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Source / reference</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]"
              value={form.source_reference}
              onChange={(e) => set('source_reference', e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[80px]"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">On-hold reason (if saving as draft)</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 min-h-[44px]"
              value={form.on_hold_reason}
              onChange={(e) => set('on_hold_reason', e.target.value)}
            />
          </label>
          <div className="flex flex-wrap justify-between gap-2 pt-4">
            <button type="button" className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600" onClick={() => setStep(1)}>
              Back
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500 text-amber-700 dark:text-amber-300"
                onClick={() => submit(true)}
              >
                <Save className="h-4 w-4" /> Save on hold
              </button>
              <button
                type="button"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white"
                onClick={() => submit(false)}
              >
                <Save className="h-4 w-4" /> Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
