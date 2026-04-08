import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import TestingPageShell from '../../components/testing/TestingPageShell'
import TestCaseForm from '../../components/testing/TestCaseForm'
import { getTestCaseById, updateTestCase } from '../../services/testCaseService'
import { getTestSuites } from '../../services/testSuiteService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import {
  exportRecordToExcel,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
  exportRecordToPrint,
} from '../../utils/exportUtils'

export default function TestCaseDetail() {
  const { caseId } = useParams()
  return (
    <TestingPageShell title="Test case" subtitle="View and edit steps and metadata.">
      {({ projectId }) => <Detail caseId={caseId} projectId={projectId} />}
    </TestingPageShell>
  )
}

function Detail({ caseId, projectId }) {
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
    if (!projectId) return
    ;(async () => {
      const s = await getTestSuites(projectId)
      setSuites(s)
    })()
  }, [projectId])

  if (loading) return <p className="text-gray-500">Loading…</p>
  if (err) return <p className="text-red-400">{err}</p>
  if (notFound || !tc) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-6 space-y-3 text-gray-300 text-sm">
        <p className="text-white font-medium">Test case not found</p>
        <p className="text-gray-400">
          This link may be out of date (for example after re-running seed scripts, IDs change). Open the case from{' '}
          <Link to="/platform/testing/cases" className="text-emerald-400 hover:underline">
            Test cases
          </Link>{' '}
          or use the ref in the URL (e.g. <code className="text-gray-300">TC-…</code>).
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
        <Link to="/platform/testing/cases" className="text-sm text-emerald-400 hover:underline">
          ← All cases
        </Link>
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
          <div className="rounded-xl border border-gray-800 p-4 space-y-2">
            <p className="text-xs text-gray-500">{tc.test_case_ref}</p>
            <h2 className="text-xl font-bold text-white">{tc.title}</h2>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{tc.description}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Steps</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-200">
              {(tc.steps || []).map((s) => (
                <li key={s.id} className="border border-gray-800 rounded-lg p-2">
                  <span className="text-emerald-500 font-medium">{s.step_number}.</span> {s.action}
                  {s.expected_result && (
                    <p className="text-xs text-gray-500 mt-1">Expect: {s.expected_result}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  )
}
