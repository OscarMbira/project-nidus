import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
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
