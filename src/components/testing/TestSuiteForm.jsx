import { useState, useEffect } from 'react'
import { X, Save, FolderOpen } from 'lucide-react'

const SUITE_TYPES = ['functional','regression','smoke','uat','performance','security','integration','exploratory','sanity']
const STATUSES    = ['draft','active','archived']

export default function TestSuiteForm({ suite, projectId, onSave, onClose, projectIdKey = 'project_id' }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    suite_type: 'functional',
    status: 'draft',
    version: '1.0',
    environment: '',
    estimated_duration_minutes: '',
    tags: '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (suite) {
      setForm({
        name: suite.name || '',
        description: suite.description || '',
        suite_type: suite.suite_type || 'functional',
        status: suite.status || 'draft',
        version: suite.version || '1.0',
        environment: suite.environment || '',
        estimated_duration_minutes: suite.estimated_duration_minutes || '',
        tags: Array.isArray(suite.tags) ? suite.tags.join(', ') : '',
      })
    }
  }, [suite])

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Suite name is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        [projectIdKey]: projectId,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        estimated_duration_minutes: form.estimated_duration_minutes
          ? parseInt(form.estimated_duration_minutes) : null,
      }
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type = 'text', required = false) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className={`w-full bg-gray-700 border ${errors[key] ? 'border-red-500' : 'border-gray-600'}
          rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
      />
      {errors[key] && <p className="text-red-400 text-xs mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              {suite ? 'Edit Test Suite' : 'New Test Suite'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {field('Suite Name', 'name', 'text', true)}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Suite Type</label>
              <select
                value={form.suite_type}
                onChange={e => setForm(f => ({ ...f, suite_type: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SUITE_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('Version', 'version')}
            {field('Est. Duration (min)', 'estimated_duration_minutes', 'number')}
          </div>

          {field('Target Environment', 'environment')}
          {field('Tags (comma-separated)', 'tags')}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700
                text-white rounded-lg disabled:opacity-60">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : suite ? 'Update Suite' : 'Create Suite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
