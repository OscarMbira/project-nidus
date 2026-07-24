import { useEffect, useState } from 'react'
import * as platform from '../../services/testingCentreService'
import * as sim from '../../services/simTestingCentreService'

export default function TestingCentreSettingsPage({ mode }) {
  const svc = mode === 'sim' ? sim : platform
  const [s, setS] = useState({})
  useEffect(() => {
    svc.getSettings().then((r) => { if (r.success) setS(r.data || {}) })
  }, [svc])
  return (
    <div className="p-6 max-w-2xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <h1 className="text-xl font-semibold mb-4">Testing centre settings</h1>
      <pre className="text-xs p-3 rounded bg-gray-100 dark:bg-gray-900 overflow-auto border border-gray-200 dark:border-gray-800">{JSON.stringify(s, null, 2)}</pre>
    </div>
  )
}
