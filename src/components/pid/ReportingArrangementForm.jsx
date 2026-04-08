/**
 * Create / edit PID reporting arrangement
 */

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  addReportingArrangement,
  updateReportingArrangement,
} from '../../services/pidReportingArrangementsService'
import { supabase } from '../../services/supabaseClient'

const REPORT_TYPES = [
  'highlight_report',
  'checkpoint_report',
  'end_stage_report',
  'exception_report',
  'end_project_report',
  'ad_hoc',
]
const FORMATS = ['written', 'verbal', 'dashboard', 'other']

const empty = {
  report_type: 'highlight_report',
  report_frequency: '',
  report_recipients: '',
  report_template: '',
  report_format: 'written',
  report_owner: '',
  report_description: '',
}

export default function ReportingArrangementForm({
  pidId,
  arrangement,
  mode = 'create',
  projectId,
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (arrangement && mode === 'edit') {
      setForm({
        report_type: arrangement.report_type || 'highlight_report',
        report_frequency: arrangement.report_frequency || '',
        report_recipients: arrangement.report_recipients || '',
        report_template: arrangement.report_template || '',
        report_format: arrangement.report_format || 'written',
        report_owner: arrangement.report_owner || '',
        report_description: arrangement.report_description || '',
      })
    } else {
      setForm(empty)
    }
  }, [arrangement, mode])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      const { data, error: qErr } = await supabase
        .from('project_memberships')
        .select('user_id, users:user_id(id, full_name, email)')
        .eq('project_id', projectId)
        .eq('is_active', true)
      if (cancelled || qErr) return
      const rows = (data || []).map((r) => r.users).filter(Boolean)
      setUsers(rows)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.report_type) {
      setError('Report type is required.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        report_type: form.report_type,
        report_frequency: form.report_frequency || null,
        report_recipients: form.report_recipients || null,
        report_template: form.report_template || null,
        report_format: form.report_format,
        report_owner: form.report_owner || null,
        report_description: form.report_description || null,
      }
      const result =
        mode === 'edit' && arrangement?.id
          ? await updateReportingArrangement(arrangement.id, payload)
          : await addReportingArrangement(pidId, payload)
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
          {mode === 'edit' ? 'Edit reporting arrangement' : 'Add reporting arrangement'}
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
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Report type</span>
            <select
              value={form.report_type}
              onChange={(e) => set('report_type', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Format</span>
            <select
              value={form.report_format}
              onChange={(e) => set('report_format', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            >
              {FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Frequency</span>
          <input
            value={form.report_frequency}
            onChange={(e) => set('report_frequency', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Report owner</span>
          <select
            value={form.report_owner}
            onChange={(e) => set('report_owner', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          >
            <option value="">— None —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email || u.id}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Recipients</span>
          <textarea
            value={form.report_recipients}
            onChange={(e) => set('report_recipients', e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            placeholder="Names or distribution list"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Template</span>
          <input
            value={form.report_template}
            onChange={(e) => set('report_template', e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Description</span>
          <textarea
            value={form.report_description}
            onChange={(e) => set('report_description', e.target.value)}
            rows={3}
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
