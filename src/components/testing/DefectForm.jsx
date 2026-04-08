import { useState, useEffect } from 'react'

const SEVERITY = ['critical', 'high', 'medium', 'low', 'trivial']
const PRIORITY = ['critical', 'high', 'medium', 'low']
const STATUS = ['new', 'open', 'in_progress', 'resolved', 'closed', 'reopened', 'deferred', 'duplicate']

export default function DefectForm({ defect, projectId, onSubmit, disabled, projectIdKey = 'project_id' }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'medium',
    priority: 'medium',
    status: 'new',
    environment: '',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    browser_os: '',
  })

  useEffect(() => {
    if (defect) {
      setForm({
        title: defect.title || '',
        description: defect.description || '',
        severity: defect.severity || 'medium',
        priority: defect.priority || 'medium',
        status: defect.status || 'new',
        environment: defect.environment || '',
        steps_to_reproduce: defect.steps_to_reproduce || '',
        expected_behavior: defect.expected_behavior || '',
        actual_behavior: defect.actual_behavior || '',
        browser_os: defect.browser_os || '',
      })
    }
  }, [defect])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    onSubmit({
      ...(defect ? {} : { [projectIdKey]: projectId }),
      title: form.title.trim(),
      description: form.description || null,
      severity: form.severity,
      priority: form.priority,
      status: form.status,
      environment: form.environment || null,
      steps_to_reproduce: form.steps_to_reproduce || null,
      expected_behavior: form.expected_behavior || null,
      actual_behavior: form.actual_behavior || null,
      browser_os: form.browser_os || null,
    })
  }

  const field = (label, key, multiline = false) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          rows={3}
          disabled={disabled}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        />
      ) : (
        <input
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          disabled={disabled}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        />
      )}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {field('Title *', 'title')}
      {field('Description', 'description', true)}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Severity</label>
          <select
            value={form.severity}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
            disabled={disabled}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            {SEVERITY.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Priority</label>
          <select
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            disabled={disabled}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            {PRIORITY.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            disabled={disabled}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>
      {field('Environment', 'environment')}
      {field('Browser / OS', 'browser_os')}
      {field('Steps to reproduce', 'steps_to_reproduce', true)}
      {field('Expected', 'expected_behavior', true)}
      {field('Actual', 'actual_behavior', true)}
      {!disabled && (
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
        >
          {defect ? 'Save changes' : 'Create defect'}
        </button>
      )}
    </form>
  )
}
