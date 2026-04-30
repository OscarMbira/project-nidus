import { useEffect, useState } from 'react'
import { getTestingCentreDefects } from '../../services/defectService'

export default function DefectsPage() {
  const [rows, setRows] = useState([])
  useEffect(() => {
    getTestingCentreDefects().then(setRows).catch(() => setRows([]))
  }, [])
  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <h1 className="text-xl font-semibold mb-4">Defect &amp; issue links (testing sources)</h1>
      <ul className="text-sm space-y-2">
        {rows.map((d) => (
          <li key={d.id} className="border border-gray-200 dark:border-gray-800 rounded p-2">{d.defect_ref} — {d.title}</li>
        ))}
      </ul>
    </div>
  )
}
