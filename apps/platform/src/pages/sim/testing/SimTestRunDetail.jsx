import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SimTestingPageShell from '../../../components/sim/SimTestingPageShell'
import TestExecutionProgressBar from '../../../components/testing/TestExecutionProgressBar'
import {
  getPracticeTestRunById,
  getPracticeExecutionsByRun,
} from '../../../services/sim/practiceTestRunService'
import ExportRecordButtons from '../../../components/ui/ExportRecordButtons'
import {
  exportRecordToExcel,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
  exportRecordToPrint,
} from '../../../utils/exportUtils'
import { SIM_TESTING_BASE } from './simTestingPaths'

export default function SimTestRunDetail() {
  const { runId } = useParams()
  return (
    <SimTestingPageShell title="Test run detail" subtitle="Summary and execution progress.">
      {() => <Detail runId={runId} />}
    </SimTestingPageShell>
  )
}

function Detail({ runId }) {
  const [run, setRun] = useState(null)
  const [execs, setExecs] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!runId) return
    ;(async () => {
      try {
        const r = await getPracticeTestRunById(runId)
        setRun(r)
        const e = await getPracticeExecutionsByRun(runId)
        setExecs(e)
      } catch (e) {
        setErr(e?.message)
      }
    })()
  }, [runId])

  if (err) return <p className="text-red-400">{err}</p>
  if (!run) return <p className="text-gray-500">Loading…</p>

  const sections = [
    {
      title: 'Run',
      fields: [
        { key: 'run_name', label: 'Name' },
        { key: 'environment', label: 'Environment' },
        { key: 'status', label: 'Status' },
        { key: 'run_date', label: 'Run date' },
        { key: 'notes', label: 'Notes' },
      ],
    },
  ]
  const recordForExport = { ...run, execution_count: execs.length, summary_json: JSON.stringify(run.summary || {}) }

  return (
    <div className="space-y-4">
      <Link to={`${SIM_TESTING_BASE}/runs`} className="text-sm text-emerald-400 hover:underline">
        ← All runs
      </Link>
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="text-xl font-bold text-white">{run.run_name}</h2>
        <div className="flex gap-2">
          <ExportRecordButtons
            onExportExcel={() => exportRecordToExcel(sections, recordForExport, `test_run_${run.run_name || run.id}`)}
            onExportWord={() => exportRecordToWord(sections, recordForExport, `test_run_${run.run_name || run.id}`)}
            onExportPPT={() => exportRecordToPPT(sections, recordForExport, `test_run_${run.run_name || run.id}`)}
            onExportCSV={() => exportRecordToCSV(sections, recordForExport, `test_run_${run.run_name || run.id}`)}
            onExportXML={() => exportRecordToXML(sections, recordForExport, `test_run_${run.run_name || run.id}`)}
            onExportJSON={() => exportRecordToJSON(sections, recordForExport, `test_run_${run.run_name || run.id}`)}
            onExportPrint={() => exportRecordToPrint(sections, recordForExport)}
          />
          <Link
            to={`${SIM_TESTING_BASE}/runs/${runId}/execute`}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm"
          >
            Execute
          </Link>
        </div>
      </div>
      <TestExecutionProgressBar summary={run.summary} />
      <p className="text-sm text-gray-400">
        {run.environment} · {run.status} · {run.run_date}
      </p>
      <h3 className="text-sm font-semibold text-gray-300">Cases ({execs.length})</h3>
      <ul className="text-sm space-y-1">
        {execs.map((x) => (
          <li key={x.id} className="text-gray-300 flex justify-between border border-gray-800 rounded px-2 py-1">
            <span>
              {x.test_cases?.test_case_ref || x.test_case?.test_case_ref} —{' '}
              {x.test_cases?.title || x.test_case?.title}
            </span>
            <span className="text-gray-500">{x.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
