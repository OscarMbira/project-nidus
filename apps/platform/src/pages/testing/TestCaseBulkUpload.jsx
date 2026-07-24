import { useEffect, useState, useMemo, useCallback } from 'react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import TestBulkUploadWizard from '../../components/testing/TestBulkUploadWizard'
import { getTestSuites } from '../../services/testSuiteService'

export default function TestCaseBulkUpload() {
  return (
    <TestingPageShell title="Bulk import test cases" subtitle="CSV, Excel, JSON, or XML — mapped to suites by name.">
      {({ projectId }) => <Body projectId={projectId} />}
    </TestingPageShell>
  )
}

function Body({ projectId }) {
  const [suiteMap, setSuiteMap] = useState({})

  const load = useCallback(async () => {
    if (!projectId) return
    const suites = await getTestSuites(projectId)
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

  if (!projectId) return <p className="text-gray-500 text-sm">Select a project.</p>

  return <TestBulkUploadWizard projectId={projectId} suiteNameToId={memoMap} />
}
