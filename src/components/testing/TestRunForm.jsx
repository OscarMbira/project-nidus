import { useState } from 'react'
import { X } from 'lucide-react'

export default function TestRunForm({ projectId, suites, onSave, onClose, projectIdKey = 'project_id' }) {
  const [form, setForm] = useState({
    run_name: '',
    environment: 'uat',
    suite_id: '',
    run_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.run_name.trim() || !form.suite_id) return
    setSaving(true)
    try {
      await onSave({
        [projectIdKey]: projectId,
        run_name: form.run_name.trim(),
        environment: form.environment,
        suite_id: form.suite_id,
        run_date: form.run_date || null,
        notes: form.notes || null,
        status: 'planned',
      })
      onClose?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={submit}
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">New test run</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Run name *</label>
          <input
            required
            value={form.run_name}
            onChange={(e) => setForm((f) => ({ ...f, run_name: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Suite *</label>
          <select
            required
            value={form.suite_id}
            onChange={(e) => setForm((f) => ({ ...f, suite_id: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          >
            <option value="">Select suite…</option>
            {suites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Environment</label>
            <select
              value={form.environment}
              onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            >
              {['dev', 'staging', 'uat', 'production', 'other'].map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Run date</label>
            <input
              type="date"
              value={form.run_date}
              onChange={(e) => setForm((f) => ({ ...f, run_date: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create run'}
          </button>
        </div>
      </form>
    </div>
  )
}
