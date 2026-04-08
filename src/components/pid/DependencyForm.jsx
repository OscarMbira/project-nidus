/**
 * Create / edit PID dependency (theme-aware)
 */

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { addDependency, updateDependency } from '../../services/pidDependenciesService'

const TYPES = ['external', 'internal', 'organizational', 'technical', 'resource', 'regulatory', 'other']
const STATUSES = ['satisfied', 'pending', 'at_risk', 'not_met']

const empty = {
  dependency_type: 'external',
  dependency_name: '',
  dependency_description: '',
  dependency_owner: '',
  dependency_status: 'pending',
  dependency_impact: '',
  mitigation_plan: '',
  expected_date: '',
}

export default function DependencyForm({ pidId, dependency, mode = 'create', onSave, onCancel }) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (dependency && mode === 'edit') {
      setForm({
        dependency_type: dependency.dependency_type || 'external',
        dependency_name: dependency.dependency_name || '',
        dependency_description: dependency.dependency_description || '',
        dependency_owner: dependency.dependency_owner || '',
        dependency_status: dependency.dependency_status || 'pending',
        dependency_impact: dependency.dependency_impact || '',
        mitigation_plan: dependency.mitigation_plan || '',
        expected_date: dependency.expected_date || '',
      })
    } else {
      setForm(empty)
    }
  }, [dependency, mode])

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.dependency_name.trim()) {
      setError('Name is required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        dependency_type: form.dependency_type,
        dependency_name: form.dependency_name.trim(),
        dependency_description: form.dependency_description || null,
        dependency_owner: form.dependency_owner || null,
        dependency_status: form.dependency_status,
        dependency_impact: form.dependency_impact || null,
        mitigation_plan: form.mitigation_plan || null,
        expected_date: form.expected_date || null,
      }
      const result =
        mode === 'edit' && dependency?.id
          ? await updateDependency(dependency.id, payload)
          : await addDependency(pidId, payload)
      if (result.success) onSave?.()
      else setError(result.error || 'Save failed')
    } catch (err) {
      setError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'edit' ? 'Edit dependency' : 'Add dependency'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Type</span>
            <select
              value={form.dependency_type}
              onChange={(e) => set('dependency_type', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Status</span>
            <select
              value={form.dependency_status}
              onChange={(e) => set('dependency_status', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Name *</span>
          <input
            value={form.dependency_name}
            onChange={(e) => set('dependency_name', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</span>
          <textarea
            value={form.dependency_description}
            onChange={(e) => set('dependency_description', e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Owner</span>
            <input
              value={form.dependency_owner}
              onChange={(e) => set('dependency_owner', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Expected date</span>
            <input
              type="date"
              value={form.expected_date}
              onChange={(e) => set('expected_date', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Impact</span>
          <textarea
            value={form.dependency_impact}
            onChange={(e) => set('dependency_impact', e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Mitigation</span>
          <textarea
            value={form.mitigation_plan}
            onChange={(e) => set('mitigation_plan', e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
