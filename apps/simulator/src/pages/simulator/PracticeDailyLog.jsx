/**
 * Practice Daily Log Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { getPracticeDailyLog, getPracticeDailyLogEntries, createPracticeDailyLog } from '../../services/sim/practiceDailyLogService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const PRACTICE_DAILY_LOG_COLUMNS = [
  { key: 'entry_date', label: 'Date' },
  { key: 'entry_type', label: 'Type' },
  { key: 'description', label: 'Description' }
]

export default function PracticeDailyLog() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [log, setLog] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadLog()
    }
  }, [projectId])

  const loadLog = async () => {
    try {
      setLoading(true)
      const result = await getPracticeDailyLog(projectId)
      if (result.success) {
        setLog(result.data)
        if (result.data) {
          const entriesResult = await getPracticeDailyLogEntries(result.data.id)
          if (entriesResult.success) setEntries(entriesResult.data || [])
        }
      } else {
        // Create log if it doesn't exist
        const createResult = await createPracticeDailyLog(projectId, { log_reference: `DL-${Date.now()}` })
        if (createResult.success) {
          setLog(createResult.data)
        }
      }
    } catch (error) {
      console.error('Error loading daily log:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Daily Log</h1>
        <div className="flex gap-2">
          <ExportListMenu columns={PRACTICE_DAILY_LOG_COLUMNS} data={entries} baseFilename="PracticeDailyLog" disabled={!entries.length} />
          {log && (
          <button onClick={() => navigate(`/simulator/practice-daily-log/${log.id}/entry?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" /> Add Entry
          </button>
          )}
        </div>
      </div>
      {loading ? <div className="text-center py-12">Loading...</div> : !log ? <div className="text-center py-12 text-gray-500">Creating daily log...</div> : entries.length === 0 ? <div className="text-center py-12 text-gray-500">No entries yet. Add your first entry.</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry, index) => (
                <tr key={entry.id} onClick={() => navigate(`/simulator/practice-daily-log/${log.id}/entry/${entry.id}?projectId=${projectId}`)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.entry_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.entry_type}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{entry.description?.substring(0, 100)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{entry.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
