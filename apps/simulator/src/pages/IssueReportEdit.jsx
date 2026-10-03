import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import IssueReportForm from '../components/issues/IssueReportForm'

export default function IssueReportEdit() {
  const { issueId, reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = async (report) => {
    navigate(`/projects/${projectId}/issues/${issueId}/reports/${reportId}`)
  }

  const handleCancel = () => {
    navigate(`/projects/${projectId}/issues/${issueId}/reports/${reportId}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <IssueReportForm
        issueId={issueId}
        reportId={reportId}
        mode="edit"
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}
