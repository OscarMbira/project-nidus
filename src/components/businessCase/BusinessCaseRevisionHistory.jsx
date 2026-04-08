/**
 * BusinessCaseRevisionHistory
 * Displays the version history of a Business Case document.
 */

import { useEffect, useState, useCallback } from 'react'
import { History, Loader2 } from 'lucide-react'
import { getRevisionHistory } from '../../services/businessCaseService'

export default function BusinessCaseRevisionHistory({ caseId }) {
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRevisions = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getRevisionHistory(caseId)
      setRevisions(data)
    } catch (err) {
      console.error('Error loading revision history:', err)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { fetchRevisions() }, [fetchRevisions])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading revision history...
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2 mb-3">
        <History className="w-4 h-4" /> Revision History
      </h3>

      {revisions.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No revision history yet.</p>
      )}

      <div className="overflow-x-auto">
        {revisions.length > 0 && (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Version</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Summary</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revised By</th>
              </tr>
            </thead>
            <tbody>
              {revisions.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-white">{r.version_number}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{r.revision_date}</td>
                  <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{r.summary_of_changes}</td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    {r.revised_by_name || (r.revised_by ? `${r.revised_by.first_name} ${r.revised_by.last_name}` : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
