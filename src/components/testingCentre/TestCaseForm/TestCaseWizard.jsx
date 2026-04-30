import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import * as platform from '../../../services/testingCentreService'
import * as sim from '../../../services/simTestingCentreService'
import StepGeneralInfo from './StepGeneralInfo'
import StepTestCaseSteps from './StepTestStepsBuilder'
import StepTestData from './StepTestData'
import StepAutomation from './StepAutomation'
import StepEvidenceTags from './StepEvidenceTags'

const STEPS = [
  { id: 'general', title: 'General' },
  { id: 'steps', title: 'Preconditions & steps' },
  { id: 'data', title: 'Data & expected' },
  { id: 'auto', title: 'Automation' },
  { id: 'tags', title: 'Evidence & tags' },
]

function defaultForm(suggestFn) {
  const code = typeof suggestFn === 'function' ? suggestFn() : String(suggestFn)
  return {
    test_case_code: code,
    title: '',
    description: '',
    module_id: null,
    feature_name: '',
    methodology_type: 'hybrid',
    test_type: 'ui',
    scenario_type: 'positive',
    priority: 'medium',
    severity_if_failed: 'medium',
    preconditions: '',
    test_steps: [{ step_no: 1, action: '', input: '', expected: '' }],
    _testDataJson: '{}',
    expected_result: '',
    automation_key: '',
    playwright_spec_path: '',
    vitest_spec_path: '',
    database_test_path: '',
    tags: [],
    owner_role: '',
    is_reusable: true,
  }
}

function mapRowToForm(row) {
  const test_steps = Array.isArray(row.test_steps) && row.test_steps.length
    ? row.test_steps
    : [{ step_no: 1, action: '', input: '', expected: '' }]
  let _testDataJson = '{}'
  try {
    _testDataJson = row.test_data && Object.keys(row.test_data).length
      ? JSON.stringify(row.test_data, null, 2)
      : '{}'
  } catch {
    _testDataJson = '{}'
  }
  return {
    test_case_code: row.test_case_code,
    title: row.title || '',
    description: row.description || '',
    module_id: row.module_id,
    feature_name: row.feature_name || '',
    methodology_type: row.methodology_type || 'hybrid',
    test_type: row.test_type || 'ui',
    scenario_type: row.scenario_type || 'positive',
    priority: row.priority || 'medium',
    severity_if_failed: row.severity_if_failed || 'medium',
    preconditions: row.preconditions || '',
    test_steps,
    _testDataJson,
    expected_result: row.expected_result || '',
    automation_key: row.automation_key || '',
    playwright_spec_path: row.playwright_spec_path || '',
    vitest_spec_path: row.vitest_spec_path || '',
    database_test_path: row.database_test_path || '',
    tags: row.tags || [],
    owner_role: row.owner_role || '',
    is_reusable: row.is_reusable !== false,
  }
}

function buildApiPayload(form, finalStatus) {
  let test_data = {}
  if (form._testDataJson && form._testDataJson.trim()) {
    try {
      test_data = JSON.parse(form._testDataJson)
      if (typeof test_data !== 'object' || test_data === null) throw new Error('object required')
    } catch {
      throw new Error('Test data must be valid JSON object')
    }
  }
  if (!form.title || !form.title.trim()) throw new Error('Title is required')
  if (!form.test_case_code || !form.test_case_code.trim()) throw new Error('Test case code is required')
  if (!form.expected_result || !form.expected_result.trim()) {
    if (finalStatus === 'ready') throw new Error('Expected result is required to publish as ready')
  }
  return {
    test_case_code: form.test_case_code.trim(),
    title: form.title.trim(),
    description: form.description || null,
    module_id: form.module_id || null,
    feature_name: form.feature_name || null,
    methodology_type: form.methodology_type,
    test_type: form.test_type,
    scenario_type: form.scenario_type,
    priority: form.priority,
    severity_if_failed: form.severity_if_failed,
    preconditions: form.preconditions || null,
    test_steps: form.test_steps,
    test_data,
    expected_result: form.expected_result || null,
    automation_key: form.automation_key || null,
    playwright_spec_path: form.playwright_spec_path || null,
    vitest_spec_path: form.vitest_spec_path || null,
    database_test_path: form.database_test_path || null,
    tags: form.tags,
    owner_role: form.owner_role || null,
    owner_user_id: null,
    is_reusable: form.is_reusable,
    is_active: true,
    status: finalStatus,
  }
}

export default function TestCaseWizard({ mode = 'platform', testCaseId = null, pathPrefix = '/platform/testing-centre' }) {
  const navigate = useNavigate()
  const svc = mode === 'sim' ? sim : platform
  const suggestCode = useMemo(
    () => (mode === 'sim' ? sim.suggestTestCaseCode : platform.suggestTestCaseCode),
    [mode]
  )

  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => defaultForm(suggestCode))
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(!!testCaseId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    svc.listTestModules().then((r) => { if (r.success) setModules(r.data || []) })
  }, [svc])

  useEffect(() => {
    if (!testCaseId) return
    setLoading(true)
    svc
      .getTestCase(testCaseId)
      .then((r) => {
        if (r.success && r.data) setForm(mapRowToForm(r.data))
        else toast.error(r.message || 'Failed to load')
      })
      .finally(() => setLoading(false))
  }, [testCaseId, svc])

  const regen = useCallback(() => {
    setForm((f) => ({ ...f, test_case_code: suggestCode() }))
  }, [suggestCode])

  const doSave = async (status) => {
    let payload
    try {
      payload = buildApiPayload(form, status)
    } catch (e) {
      toast.error(e.message)
      return
    }
    setSaving(true)
    const res = testCaseId
      ? await svc.updateTestCase(testCaseId, payload)
      : await svc.createTestCase(payload)
    setSaving(false)
    if (res.success) {
      const code = res.data?.test_case_code || form.test_case_code
      toast.success(
        testCaseId ? `Test case ${code} updated` : `Test case ${code} created (${res.data?.status || status})`
      )
      navigate(`${pathPrefix}/cases/${res.data.id}`)
    } else {
      toast.error(res.message || 'Save failed')
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-600 dark:text-gray-400 min-h-screen bg-gray-50 dark:bg-gray-950">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to={`${pathPrefix}/cases`} className="text-sm text-blue-500 hover:underline">
          ← Test case library
        </Link>
        <h1 className="text-2xl font-semibold mt-2">{testCaseId ? 'Edit test case' : 'New test case'}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Step {step + 1} of {STEPS.length}</p>
        <ol className="mt-3 flex flex-wrap gap-1">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className={`px-2 py-1 text-xs rounded ${
                  i === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                {i + 1}. {s.title}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4 md:p-6">
        {step === 0 && (
          <StepGeneralInfo
            form={form}
            setForm={setForm}
            moduleOptions={modules}
            onRegenerateCode={testCaseId ? null : regen}
            readOnlyCode={!!testCaseId}
          />
        )}
        {step === 1 && <StepTestCaseSteps form={form} setForm={setForm} />}
        {step === 2 && <StepTestData form={form} setForm={setForm} />}
        {step === 3 && <StepAutomation form={form} setForm={setForm} />}
        {step === 4 && <StepEvidenceTags form={form} setForm={setForm} />}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-800 pt-4">
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded border border-gray-300 dark:border-gray-600"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded bg-blue-600 text-white"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => doSave('draft')}
              className="inline-flex items-center gap-1 px-3 py-2 rounded border border-amber-600/50 text-amber-700 dark:text-amber-300"
            >
              <Save className="w-4 h-4" />
              Save as draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => doSave('ready')}
              className="inline-flex items-center gap-1 px-3 py-2 rounded bg-green-600 text-white"
            >
              {testCaseId ? 'Save' : 'Publish (ready)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
