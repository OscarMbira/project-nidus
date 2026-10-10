import { useState, useEffect } from 'react'
import { getApprovalStatus } from '../../../services/eprApprovalService'
import { format } from 'date-fns'
import ReportSectionList from './ReportSectionList'

function showDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return format(date, 'dd MMM yyyy')
}

const APPROVAL_COLUMNS = [
  { key: 'approver', label: 'Approver', value: (row) => row.approver_name || row.approver?.full_name || row.approver?.email || '' },
  { key: 'status', label: 'Status', value: (row) => String(row.approval_status || '').replace(/_/g, ' ') },
  { key: 'date', label: 'Date', value: (row) => showDate(row.approval_date) },
  { key: 'comments', label: 'Comments', value: (row) => row.comments || '' },
]

export default function EPRApprovals({ reportId }) {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (reportId) {
      loadApprovals()
    } else {
      setLoading(false)
    }
  }, [reportId])

  const loadApprovals = async () => {
    try {
      setLoading(true)
      const data = await getApprovalStatus(reportId)
      setApprovals(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading approvals:', error)
      setApprovals([])
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
          viewModeId="epr-approvals"
          title="Approvals"
          rows={approvals}
          columns={APPROVAL_COLUMNS}
          emptyText="No approvals yet."
        />
      )}
    </div>
  )
}
