import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import {
  resolveCheckpointWorkPackageId,
  checkpointReportsListPath,
  checkpointReportDetailPath,
} from '@nidus/shared/utils/checkpointReportRoutes.js'
import { useState, useEffect } from 'react'
import CheckpointReportForm from '../../components/structured/CheckpointReportForm'
import { getLatestCheckpointReport } from '../../services/checkpointReportService'

export default function CheckpointReportCreate() {
  const { workPackageId: workPackageIdParam } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const workPackageId = resolveCheckpointWorkPackageId(workPackageIdParam)
  const [previousReportId, setPreviousReportId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPreviousReport()
  }, [workPackageId])

  const loadPreviousReport = async () => {
    try {
      if (!workPackageId) {
        setPreviousReportId(null)
      } else {
        const latest = await getLatestCheckpointReport(workPackageId)
        if (latest) {
          setPreviousReportId(latest.id)
        }
      }
    } catch (error) {
      console.error('Error loading previous report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = (report) => {
    const wpId = resolveCheckpointWorkPackageId(workPackageId, report?.work_package_id)
    if (report?.id) {
      navigate(checkpointReportDetailPath(routeKey, wpId, report.document_ref || report.id))
    } else {
      navigate(checkpointReportsListPath(routeKey, wpId))
    }
  }

  const handleCancel = () => {
    navigate(checkpointReportsListPath(routeKey, workPackageId))
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
