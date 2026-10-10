import { useState, useEffect } from 'react'
import { getVersionHistory } from '../../../services/eprRevisionService'
import { format } from 'date-fns'
import ReportSectionList from './ReportSectionList'

function showDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, 'dd MMM yyyy')
}

const HISTORY_COLUMNS = [
  { key: 'version', label: 'Version', value: (row) => (row.version_no == null ? '' : `Version ${row.version_no}`) },
  { key: 'date', label: 'Date', value: (row) => showDate(row.revision_date) },
  { key: 'summary', label: 'Summary', value: (row) => row.summary_of_changes || '' },
  { key: 'revised_by', label: 'Revised by', value: (row) => row.revised_by_user?.full_name || row.revised_by_user?.email || '' },
]

export default function EPRRevisionHistory({ reportId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (reportId) {
      loadHistory()
    } else {
      setLoading(false)
    }
  }, [reportId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const data = await getVersionHistory(reportId)
      setHistory(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading revision history:', error)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {loading ? (
        <p className="text-sm text-gray-700 dark:text-gray-200">Loading...</p>
      ) : (
        <ReportSectionList
          viewModeId="epr-revision-history"
          title="Revision History"
          rows={history}
          columns={HISTORY_COLUMNS}
          emptyText="No revision history."
        />
      )}
    </div>
  )
}
