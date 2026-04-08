import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { useState, useEffect } from 'react'
import CheckpointReportForm from '../../components/structured/CheckpointReportForm'
import { getLatestCheckpointReport } from '../../services/checkpointReportService'

export default function CheckpointReportCreate() {
  const { workPackageId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [previousReportId, setPreviousReportId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPreviousReport()
  }, [workPackageId])

  const loadPreviousReport = async () => {
    try {
      const latest = await getLatestCheckpointReport(workPackageId)
      if (latest) {
        setPreviousReportId(latest.id)
      }
    } catch (error) {
      console.error('Error loading previous report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (report) => {
    if (report?.id) {
      navigate(`/app/projects/${projectId}/work-packages/${workPackageId}/checkpoint-reports/${report.id}`)
    } else {
      navigate(`/app/projects/${projectId}/work-packages/${workPackageId}/checkpoint-reports`)
    }
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/work-packages/${workPackageId}/checkpoint-reports`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <CheckpointReportForm
      projectId={projectId}
      workPackageId={workPackageId}
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
      previousReportId={previousReportId}
    />
  )
}
