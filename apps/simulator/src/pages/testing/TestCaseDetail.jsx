import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import TestingPageShell from '../../components/testing/TestingPageShell'
import TestCaseForm from '../../components/testing/TestCaseForm'
import { getTestCaseById, updateTestCase } from '../../services/testCaseService'
import { getTestSuiteOptions } from '../../services/testSuiteService'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import {
  exportRecordToExcel,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
  exportRecordToPrint,
} from '@nidus/shared/utils/exportUtils'

export default function TestCaseDetail() {
  const { caseId } = useParams()
  return (
    <TestingPageShell title="Test case" subtitle="View and edit steps and metadata.">
      {({ projectId }) => <Detail caseId={caseId} projectId={projectId} />}
    </TestingPageShell>
  )
}

function Detail({ caseId, projectId }) {
  const navigate = useNavigate()
  const [tc, setTc] = useState(null)
  const [suites, setSuites] = useState([])
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setErr(null)
    setNotFound(false)
    if (!caseId) {
      setTc(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const key = decodeURIComponent(caseId)
      const data = await getTestCaseById(key)
      if (!data) {
        setTc(null)
        setNotFound(true)
      } else {
        setTc(data)
      }
    } catch (e) {
      setTc(null)
      setErr(e?.message || 'Could not load test case')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [caseId])

  useEffect(() => {
    if (!editing || !projectId) return undefined
    let cancelled = false
    getTestSuiteOptions(projectId)
      .then((rows) => { if (!cancelled) setSuites(rows || []) })
      .catch(() => { if (!cancelled) setSuites([]) })
    return () => { cancelled = true }
  }, [editing, projectId])

  useEffect(() => {
    if (!editing || !caseId) return undefined
    let cancelled = false
    getTestCaseById(decodeURIComponent(caseId), { withImages: true })
      .then((data) => { if (!cancelled && data) setTc(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [editing, caseId])

  if (loading) return <p className="text-gray-700 dark:text-gray-200">Loading…</p>
  if (err) return <p className="text-red-700 dark:text-red-300">{err}</p>
  if (notFound || !tc) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3 text-gray-700 dark:text-gray-200 text-sm">
        <p className="text-gray-900 dark:text-gray-100 font-medium">Test case not found</p>
        <p>
          This link may be out of date (for example after re-running seed scripts, IDs change). Open the case from{' '}
          <Link to="/platform/testing/cases" className="text-emerald-700 dark:text-emerald-400 hover:underline">
            Test cases
          </Link>{' '}
          or use the ref in the URL (e.g. <code className="text-gray-900 dark:text-gray-100">TC-…</code>).
        </p>
      </div>
    )
  }

  const exportSections = [
    {
      title: 'Test case',
      fields: [
        { key: 'test_case_ref', label: 'Ref' },
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-emerald-700 dark:text-emerald-400 hover:underline">
          ← All cases
        </button>
        <div className="flex gap-2">
          {!editing && (
            <>
              <ExportRecordButtons
                onExportExcel={() => exportRecordToExcel(exportSections, tc, `test_case_${tc.test_case_ref || tc.id}`)}
                onExportWord={() => exportRecordToWord(exportSections, tc, `test_case_${tc.test_case_ref || tc.id}`)}
                onExportPPT={() => exportRecordToPPT(exportSections, tc, `test_case_${tc.test_case_ref || tc.id}`)}
                onExportCSV={() => exportRecordToCSV(exportSections, tc, `test_case_${tc.test_case_ref || tc.id}`)}
                onExportXML={() => exportRecordToXML(exportSections, tc, `test_case_${tc.test_case_ref || tc.id}`)}
                onExportJSON={() => exportRecordToJSON(exportSections, tc, `test_case_${tc.test_case_ref || tc.id}`)}
                onExportPrint={() => exportRecordToPrint(exportSections, tc)}
              />
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-sm text-white"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
      {editing ? (
        <TestCaseForm
          layout="inline"
          testCase={tc}
          projectId={projectId}
          suites={suites}
          onClose={() => setEditing(false)}
          onSave={async (payload) => {
            const { steps, ...rest } = payload
            await updateTestCase(tc.id, { ...rest, steps })
            setEditing(false)
            load()
          }}
        />
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{tc.test_case_ref}</p>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tc.title}</h2>
            <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{tc.description}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Steps</h3>
            <div className="space-y-2 text-sm text-gray-900 dark:text-gray-100">
              {(tc.steps || []).map((s) => (
                <div key={s.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-3">
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">{s.step_number}.</span>{' '}
                  <span className="whitespace-pre-wrap">{s.action}</span>
                  {s.expected_result && (
                    <p className="text-sm text-gray-800 dark:text-gray-100 mt-1 whitespace-pre-wrap">Expect: {s.expected_result}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
