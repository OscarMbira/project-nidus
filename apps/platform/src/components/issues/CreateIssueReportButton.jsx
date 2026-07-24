import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { canCreateReport } from '../../services/issueReportService'

export default function CreateIssueReportButton({ issueId, projectId }) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(false)
  const [hasReport, setHasReport] = useState(false)

  const handleCreateReport = async () => {
    try {
      setChecking(true)
      
      // Check if report already exists
      const canCreate = await canCreateReport(issueId)
      
      if (!canCreate) {
        // Report already exists, navigate to it
        const { getIssueReportByIssueId } = await import('../../services/issueReportService')
        const report = await getIssueReportByIssueId(issueId)
        if (report) {
          navigate(`/projects/${projectId}/issues/${issueId}/reports/${report.id}`)
        } else {
          alert('An Issue Report exists for this issue, but could not be loaded.')
        }
        return
      }

      // Navigate to create report page
      navigate(`/projects/${projectId}/issues/${issueId}/reports/create`)
    } catch (error) {
      console.error('Error checking report:', error)
      alert('Error: ' + error.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <button
      onClick={handleCreateReport}
      disabled={checking}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {checking ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          {hasReport ? 'View Issue Report' : 'Create Issue Report'}
        </>
      )}
    </button>
  )
}
