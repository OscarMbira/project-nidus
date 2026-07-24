import { useEffect, useState, useMemo, useCallback } from 'react'
import SimTestingPageShell from '../../../components/sim/SimTestingPageShell'
import TestBulkUploadWizard from '../../../components/testing/TestBulkUploadWizard'
import { getPracticeTestSuites } from '../../../services/sim/practiceTestSuiteService'
import { batchCreatePracticeTestCases } from '../../../services/sim/practiceTestCaseService'

export default function SimTestCaseBulkUpload() {
  return (
    <SimTestingPageShell title="Bulk import test cases" subtitle="CSV, Excel, JSON, or XML for the practice project.">
      {({ projectId }) => <Body projectId={projectId} />}
    </SimTestingPageShell>
  )
}

function Body({ projectId }) {
  const [suiteMap, setSuiteMap] = useState({})

  const load = useCallback(async () => {
    if (!projectId) return
    const suites = await getPracticeTestSuites(projectId)
    const map = {}
    for (const s of suites || []) {
      if (s.name) map[s.name.trim()] = s.id
    }
    setSuiteMap(map)
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const memoMap = useMemo(() => suiteMap, [suiteMap])

  if (!projectId) return <p className="text-gray-500 text-sm">Select a practice project.</p>

  return (
    <TestBulkUploadWizard
      projectId={projectId}
      suiteNameToId={memoMap}
      validateOptions={{ projectKey: 'practice_project_id' }}
      batchCreateFn={batchCreatePracticeTestCases}
    />
  )
}
