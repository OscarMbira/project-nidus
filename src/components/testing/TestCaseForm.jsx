import { useState, useEffect } from 'react'
import { X, Save, ClipboardList } from 'lucide-react'
import TestCaseStepEditor from './TestCaseStepEditor'

const PRIORITIES = ['critical','high','medium','low']
const TEST_TYPES  = ['manual','automated','exploratory']
const STATUSES    = ['draft','active','deprecated','archived']

export default function TestCaseForm({
  testCase,
  projectId,
  suites = [],
  initialSuiteId = '',
  onSave,
  onClose,
  projectIdKey = 'project_id',
  /** `modal` = overlay (edit from detail). `inline` = full page / embedded card (create flow). */
  layout = 'modal',
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    preconditions: '',
    expected_result: '',
    test_data: '',
    test_type: 'manual',
    priority: 'medium',
    status: 'active',
    suite_id: '',
    module_area: '',
    requirement_ref: '',
    estimated_duration_minutes: 5,
    tags: '',
    steps: [],
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  /** `general` = metadata & narrative fields; `steps` = step-by-step editor only */
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    setActiveTab('general')
  }, [testCase?.id])

  useEffect(() => {
    if (testCase) {
      setForm({
        title: testCase.title || '',
        description: testCase.description || '',
        preconditions: testCase.preconditions || '',
        expected_result: testCase.expected_result || '',
        test_data: testCase.test_data || '',
        test_type: testCase.test_type || 'manual',
        priority: testCase.priority || 'medium',
        status: testCase.status || 'active',
        suite_id: testCase.suite_id || '',
        module_area: testCase.module_area || '',
        requirement_ref: testCase.requirement_ref || '',
        estimated_duration_minutes: testCase.estimated_duration_minutes || 5,
        tags: Array.isArray(testCase.tags) ? testCase.tags.join(', ') : '',
        steps: testCase.steps || [],
      })
    }
  }, [testCase])

  useEffect(() => {
    if (!testCase && initialSuiteId) {
      setForm((f) => ({ ...f, suite_id: initialSuiteId }))
    }
  }, [initialSuiteId, testCase])

  const validate = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
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
        suite_id: form.suite_id || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        estimated_duration_minutes: parseInt(form.estimated_duration_minutes) || 5,
      }
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = hasErr => `w-full bg-gray-700 border ${hasErr ? 'border-red-500' : 'border-gray-600'}
    rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`

  const inner = (
    <div
      className={
        layout === 'modal'
          ? 'bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700 my-4'
          : 'bg-gray-800/90 rounded-xl shadow-lg w-full sm:w-[75%] max-w-full min-w-0 border border-gray-700 mx-auto'
      }
    >
        {/* Sticky header only in modal scroll; inline + TestingPageShell both used sticky top-0 and overlapped */}
        <div
          className={`flex items-center justify-between p-5 border-b border-gray-700 bg-gray-800 rounded-t-xl ${
            layout === 'modal' ? 'sticky top-0 z-10' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              {testCase ? 'Edit Test Case' : 'New Test Case'}
            </h2>
            {testCase?.test_case_ref && (
              <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                {testCase.test_case_ref}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="border-b border-gray-700 px-5 shrink-0">
            <nav className="flex gap-1" role="tablist" aria-label="Test case sections">
              <button
                type="button"
                role="tab"
                id="test-case-tab-general"
                aria-selected={activeTab === 'general'}
                aria-controls="test-case-panel-general"
                onClick={() => setActiveTab('general')}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'general'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                General
              </button>
              <button
                type="button"
                role="tab"
                id="test-case-tab-steps"
                aria-selected={activeTab === 'steps'}
                aria-controls="test-case-panel-steps"
                onClick={() => setActiveTab('steps')}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'steps'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Test steps
                {form.steps.length > 0 && (
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full tabular-nums">
                    {form.steps.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div className="p-5 space-y-4 flex-1 min-h-0">
            <div
              id="test-case-panel-general"
              role="tabpanel"
              aria-labelledby="test-case-tab-general"
              hidden={activeTab !== 'general'}
              className={activeTab !== 'general' ? 'hidden' : 'space-y-4'}
            >
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className={inputCls(errors.title)}
                  placeholder="e.g. User can log in with valid credentials"
                />
                {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
              </div>

              {/* Suite + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Test Suite</label>
                  <select
                    value={form.suite_id}
                    onChange={e => setForm(f => ({ ...f, suite_id: e.target.value }))}
                    className={inputCls(false)}
                  >
                    <option value="">— No Suite —</option>
                    {suites.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Test Type</label>
                  <select
                    value={form.test_type}
                    onChange={e => setForm(f => ({ ...f, test_type: e.target.value }))}
                    className={inputCls(false)}
                  >
                    {TEST_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority + Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className={inputCls(false)}
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className={inputCls(false)}
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Est. Duration (min)</label>
                  <input
                    type="number" min="1"
                    value={form.estimated_duration_minutes}
                    onChange={e => setForm(f => ({ ...f, estimated_duration_minutes: e.target.value }))}
                    className={inputCls(false)}
                  />
                </div>
              </div>

              {/* Description + Preconditions (one row, two columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[6rem]"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Preconditions</label>
                  <textarea
                    value={form.preconditions}
                    onChange={e => setForm(f => ({ ...f, preconditions: e.target.value }))}
                    rows={4}
                    placeholder="What must be true before this test can run…"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[6rem]"
                  />
                </div>
              </div>

              {/* Expected Result */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Overall Expected Result</label>
                <textarea
                  value={form.expected_result}
                  onChange={e => setForm(f => ({ ...f, expected_result: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Module + Requirement */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Module / Area</label>
                  <input
                    value={form.module_area}
                    onChange={e => setForm(f => ({ ...f, module_area: e.target.value }))}
                    className={inputCls(false)}
                    placeholder="e.g. Authentication"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Requirement Ref</label>
                  <input
                    value={form.requirement_ref}
                    onChange={e => setForm(f => ({ ...f, requirement_ref: e.target.value }))}
                    className={inputCls(false)}
                    placeholder="e.g. REQ-001"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
                <input
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  className={inputCls(false)}
                  placeholder="e.g. login, smoke, regression"
                />
              </div>
            </div>

            <div
              id="test-case-panel-steps"
              role="tabpanel"
              aria-labelledby="test-case-tab-steps"
              hidden={activeTab !== 'steps'}
              className={activeTab !== 'steps' ? 'hidden' : 'space-y-3 min-h-[12rem]'}
            >
              <TestCaseStepEditor
                steps={form.steps}
                onChange={steps => setForm(f => ({ ...f, steps }))}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-5 pb-5 pt-2 border-t border-gray-700">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700
                text-white rounded-lg disabled:opacity-60">
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : testCase ? 'Update Test Case' : 'Create Test Case'}
            </button>
          </div>
        </form>
    </div>
  )

  if (layout === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
        {inner}
      </div>
    )
  }

  return <div className="w-full">{inner}</div>
}
