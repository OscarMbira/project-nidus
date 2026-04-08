import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import ExceptionReportFormEnhanced from '../../components/structured/exceptionReport/ExceptionReportFormEnhanced'

export default function ExceptionReportCreate() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [searchParams] = useSearchParams()
  const exceptionId = searchParams.get('exceptionId')
  const navigate = useNavigate()

  const handleSave = (report) => {
    if (report?.id) {
      navigate(`/app/projects/${projectId}/exception-reports/${report.id}`)
    } else {
      navigate(`/app/projects/${projectId}/exception-reports`)
    }
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/exception-reports`)
  }

  if (!exceptionId) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Please select an exception to create a report for. Go to the exceptions list first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ExceptionReportFormEnhanced
      projectId={projectId}
      exceptionId={exceptionId}
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
