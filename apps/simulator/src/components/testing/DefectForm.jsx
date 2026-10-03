import { useState, useEffect } from 'react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import SelectField from '@nidus/ui/SelectField'
import { getTestCases } from '../../services/testCaseService'
import DefectAttachmentUploader from './DefectAttachmentUploader'

const labelClass = 'block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1'
const controlClass = 'w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-70'

const FORM_TABS = [
  { value: 'summary', label: 'Summary' },
  { value: 'classification', label: 'Classification' },
  { value: 'environment', label: 'Environment' },
  { value: 'steps', label: 'Steps' },
  { value: 'result', label: 'Result' },
  { value: 'images', label: 'Images' },
]

function belongsToProject(row, projectId) {
  if (!projectId || !row) return false
  const scope = String(projectId)
  return String(row.project_id || '') === scope || String(row.practice_project_id || '') === scope
}

function caseOptions(cases, defect, projectId) {
  const list = (Array.isArray(cases) ? cases : []).filter((row) => belongsToProject(row, projectId))
  const linked = defect?.test_cases
  if (linked?.id && belongsToProject(linked, projectId) && !list.some((row) => row.id === linked.id)) {
    list.unshift(linked)
  }
  return list.map((row) => ({
    value: row.id,
    label: [row.test_case_ref, row.title].filter(Boolean).join(' — ') || row.id,
  }))
}

const SEVERITY = ['critical', 'high', 'medium', 'low', 'trivial']
const PRIORITY = ['critical', 'high', 'medium', 'low']
const STATUS = ['new', 'open', 'in_progress', 'resolved', 'closed', 'reopened', 'deferred', 'duplicate']

export default function DefectForm({
  defect,
  projectId,
  onSubmit,
  disabled,
  projectIdKey = 'project_id',
  loadTestCases = getTestCases,
  uploadedByUserId = null,
  attachmentHandlers = null,
}) {
  const [section, setSection] = useState('summary')
  const [titleError, setTitleError] = useState('')
  const [cases, setCases] = useState([])
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
    test_case_id: '',
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
        test_case_id: defect.test_case_id || '',
      })
    }
  }, [defect])

  useEffect(() => {
    if (!projectId) {
      setCases([])
      return undefined
    }
    let cancelled = false
    loadTestCases(projectId)
      .then((rows) => {
        if (cancelled) return
        setCases((rows || []).filter((row) => belongsToProject(row, projectId)))
      })
      .catch(() => { if (!cancelled) setCases([]) })
    return () => { cancelled = true }
  }, [projectId, loadTestCases])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setTitleError('Enter a title before saving.')
      setSection('summary')
      return
    }
    setTitleError('')
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
      test_case_id: form.test_case_id || null,
    })
  }

  const field = (label, key, multiline = false) => (
    <div>
      <label className={labelClass}>{label}</label>
      {multiline ? (
        <textarea
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          rows={4}
          disabled={disabled}
          className={controlClass}
        />
      ) : (
        <input
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          disabled={disabled}
          className={controlClass}
        />
      )}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <DetailAuditTabList
        activeTab={section}
        onChange={setSection}
        tabs={FORM_TABS}
        ariaLabel="Defect sections"
      />

      {section === 'summary' && (
        <div className="space-y-4">
          {field('Title *', 'title')}
          {titleError && <p className="text-sm text-red-600 dark:text-red-400">{titleError}</p>}
          {field('Description', 'description', true)}
          <div>
            <label className={labelClass} htmlFor="defect-test-case">Test case</label>
            <SelectField
              id="defect-test-case"
              aria-label="Test case"
              forceSearchable
              disabled={disabled}
              placeholder="No linked test case"
              searchPlaceholder="Search ref or title…"
              value={form.test_case_id}
              onChange={(value) => setForm((f) => ({ ...f, test_case_id: value || '' }))}
              options={[
                { value: '', label: 'No linked test case' },
                ...caseOptions(cases, defect, projectId),
              ]}
            />
          </div>
        </div>
      )}

      {section === 'images' && (
        <div className="space-y-4">
          {defect?.id ? (
            <DefectAttachmentUploader
              projectId={defect.project_id || defect.practice_project_id || projectId}
              defectId={defect.id}
              uploadedByUserId={uploadedByUserId}
              {...(attachmentHandlers || {})}
            />
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-200">
              Save this defect first. You can then upload or paste a screenshot here.
            </p>
          )}
        </div>
      )}

      {section === 'classification' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Severity</label>
            <select
              value={form.severity}
              onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
              disabled={disabled}
              className={controlClass}
            >
              {SEVERITY.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              disabled={disabled}
              className={controlClass}
            >
              {PRIORITY.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              disabled={disabled}
              className={controlClass}
            >
              {STATUS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {section === 'environment' && (
        <div className="space-y-4">
          {field('Environment', 'environment')}
          {field('Browser / OS', 'browser_os')}
        </div>
      )}

      {section === 'steps' && (
        <div>
          <label className={labelClass}>Steps to reproduce</label>
          <MultiLineListInput
            viewModeId="defect-steps-to-reproduce"
            value={form.steps_to_reproduce}
            onChange={(value) => setForm((f) => ({ ...f, steps_to_reproduce: value }))}
            itemColumnLabel="Step"
            placeholder="Add a step"
            ariaLabelPrefix="step"
            disabled={disabled}
          />
        </div>
      )}

      {section === 'result' && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Expected</label>
            <MultiLineListInput
              viewModeId="defect-expected-behavior"
              value={form.expected_behavior}
              onChange={(value) => setForm((f) => ({ ...f, expected_behavior: value }))}
              itemColumnLabel="Expected"
              placeholder="Add an expected result"
              ariaLabelPrefix="expected result"
              disabled={disabled}
            />
          </div>
          <div>
            <label className={labelClass}>Actual</label>
            <MultiLineListInput
              viewModeId="defect-actual-behavior"
              value={form.actual_behavior}
              onChange={(value) => setForm((f) => ({ ...f, actual_behavior: value }))}
              itemColumnLabel="Actual"
              placeholder="Add an actual result"
              ariaLabelPrefix="actual result"
              disabled={disabled}
            />
          </div>
        </div>
      )}

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
