import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import SelectField from '@nidus/ui/SelectField'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { getTestEnvironments } from '../../services/testEnvironmentService'

const STATUSES = ['planned', 'in_progress', 'completed', 'cancelled', 'aborted', 'on_hold']

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

function optionLabel(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formFromRun(run) {
  return {
    run_name: run?.run_name || '',
    environment: run?.environment || '',
    suite_id: run?.suite_id || '',
    run_date: run?.run_date ? String(run.run_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    notes: run?.notes || '',
    status: run?.status || 'planned',
  }
}

export default function TestRunForm({
  projectId,
  suites = [],
  run = null,
  onSave,
  projectIdKey = 'project_id',
  fetchEnvironments = getTestEnvironments,
}) {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => formFromRun(run))
  const [baseline, setBaseline] = useState(() => formFromRun(run))
  const [environments, setEnvironments] = useState([])
  const [saving, setSaving] = useState(false)
  const [formTab, setFormTab] = useState('details')
  const isEdit = Boolean(run?.id)
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline)
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty && !saving)
  const projectSuites = useMemo(
    () => (suites || [])
      .filter((suite) => suite.project_id === projectId)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })),
    [suites, projectId],
  )

  useEffect(() => {
    const next = formFromRun(run)
    setForm(next)
    setBaseline(next)
  }, [run?.id, run?.updated_at, run?.run_name])

  useEffect(() => {
    if (!projectId || typeof fetchEnvironments !== 'function') {
      setEnvironments([])
      return undefined
    }
    let cancelled = false
    fetchEnvironments(projectId)
      .then((rows) => { if (!cancelled) setEnvironments(rows || []) })
      .catch(() => { if (!cancelled) setEnvironments([]) })
    return () => { cancelled = true }
  }, [projectId, fetchEnvironments])

  useEffect(() => {
    const stored = String(form.environment || '').trim()
    if (!stored || !environments.length) return
    const match = environments.find((row) => String(row.name || '').trim().toLowerCase() === stored.toLowerCase())
    if (!match || match.name === stored) return
    setForm((current) => ({ ...current, environment: match.name }))
    setBaseline((current) => ({ ...current, environment: match.name }))
  }, [environments, form.environment])

  const goBack = () => confirmDiscard(() => navigate(-1))

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
        status: form.status || 'planned',
      })
      setBaseline(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <button
        type="button"
        onClick={goBack}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <form
        onSubmit={submit}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl w-full p-6 space-y-4 text-gray-900 dark:text-gray-100"
      >
        <h2 className="text-lg font-semibold">{isEdit ? 'Edit test run' : 'New test run'}</h2>
        <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
        {formTab === 'audit' ? (
          run ? (
            <AuditDetailsPanel>
              <AuditCard title="Identity">
                <AuditField label="Run" value={run.run_name} />
                <AuditField label="Status" value={optionLabel(run.status || '')} />
              </AuditCard>
              <AuditCard title="Classification">
                <AuditField label="Environment" value={run.environment} />
                <AuditField label="Suite" value={run.suite?.name || suites.find((s) => s.id === run.suite_id)?.name || '—'} />
              </AuditCard>
              <AuditCard title="Record history">
                <AuditField label="Created" value={run.created_at ? new Date(run.created_at).toLocaleString() : '—'} />
                <AuditField label="Updated" value={run.updated_at ? new Date(run.updated_at).toLocaleString() : '—'} />
              </AuditCard>
            </AuditDetailsPanel>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this test run is saved.</p>
          )
        ) : (
        <>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Run name *</label>
          <input
            required
            value={form.run_name}
            onChange={(e) => setForm((f) => ({ ...f, run_name: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Suite *</label>
          <SelectField
            id="test-run-suite"
            required
            forceSearchable
            value={form.suite_id}
            onChange={(value) => setForm((f) => ({ ...f, suite_id: value }))}
            placeholder="Select suite…"
            searchPlaceholder="Search suites…"
            aria-label="Suite"
            options={projectSuites.map((suite) => ({ value: suite.id, label: suite.name }))}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Environment</label>
            <select
              value={form.environment}
              onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))}
              className={inputClass}
              aria-label="Environment"
            >
              <option value="">Select environment…</option>
              {environments
                .filter((row) => row.is_active !== false || row.name === form.environment)
                .map((row) => (
                  <option key={row.id} value={row.name}>{row.name}</option>
                ))}
              {form.environment && !environments.some((row) => row.name === form.environment) && (
                <option value={form.environment}>{form.environment}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {optionLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Run date</label>
          <input
            type="date"
            value={form.run_date}
            onChange={(e) => setForm((f) => ({ ...f, run_date: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
            className={inputClass}
          />
        </div>
        </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={goBack}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          {formTab !== 'audit' && (
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save run' : 'Create run'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
