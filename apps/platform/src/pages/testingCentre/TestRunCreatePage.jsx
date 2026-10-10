import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import * as platform from '../../services/testingCentreService'
import * as sim from '../../services/simTestingCentreService'

export default function TestRunCreatePage({ pathPrefix = '/platform/testing-centre', mode = 'platform' }) {
  const navigate = useNavigate()
  const svc = mode === 'sim' ? sim : platform
  const [access, setAccess] = useState('checking')
  const [suites, setSuites] = useState([])
  const [environments, setEnvironments] = useState([])
  const [suiteId, setSuiteId] = useState('')
  const [environmentId, setEnvironmentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let o = true
    ;(async () => {
      const allowed = mode === 'sim' ? true : await platform.hasTestingCentrePermission('testing_centre.run')
      if (!o) return
      if (!allowed) {
        setAccess('denied')
        return
      }
      setAccess('granted')
      const [s, e] = await Promise.all([svc.listTestSuites(), svc.listEnvironments()])
      if (!o) return
      if (s.success) setSuites(s.data)
      if (e.success) setEnvironments(e.data)
    })()
    return () => { o = false }
  }, [svc])

  const handleStart = async () => {
    setSaving(true)
    setError('')
    const r = await svc.createTestRun({ suiteId, environmentId: environmentId || null })
    setSaving(false)
    if (r.success) {
      navigate(`${pathPrefix}/runs/${r.data.id}`)
    } else {
      setError(r.message || 'Unknown error')
    }
  }

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="text-xl font-semibold mb-4">Start new test run</h1>

      {access === 'denied' && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-6 text-sm text-amber-900 dark:text-amber-200 max-w-xl">
          You need the "Execute test runs" permission to start a run. Ask your PMO administrator to grant it.
        </div>
      )}

      {access === 'granted' && (
        <div className="max-w-xl space-y-4">
          <div>
            <label htmlFor="run-suite" className="block text-sm font-medium mb-1">Test suite</label>
            <select
              id="run-suite"
              aria-label="Test suite"
              value={suiteId}
              onChange={(e) => setSuiteId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="">Select a suite…</option>
              {suites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="run-environment" className="block text-sm font-medium mb-1">Environment</label>
            <select
              id="run-environment"
              aria-label="Environment"
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="">Suite default</option>
              {environments.map((en) => (
                <option key={en.id} value={en.id}>{en.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-500">Could not start the run: {error}</p>}
          <button
            type="button"
            onClick={handleStart}
            disabled={!suiteId || saving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Starting…' : 'Start run'}
          </button>
        </div>
      )}
    </div>
  )
}
