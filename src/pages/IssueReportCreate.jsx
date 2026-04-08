import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import IssueReportForm from '../components/issues/IssueReportForm'
import { createIssueReport } from '../services/issueReportService'

export default function IssueReportCreate() {
  const { issueId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = async (report) => {
    navigate(`/projects/${projectId}/issues/${issueId}/reports/${report.id}`)
  }

  const handleCancel = () => {
    navigate(`/projects/${projectId}/issues/${issueId}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <IssueReportForm
        issueId={issueId}
        mode="create"
        onSave={handleSave}
        onCancel={handleCancel}
        autoPopulate={true}
      />
    </div>
  )
}
