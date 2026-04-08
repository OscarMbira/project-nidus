/**
 * Project Plan Create Page
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import ProjectPlanForm from '../../components/plans/ProjectPlanForm'

export default function ProjectPlanCreate() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = (plan) => {
    navigate(`/app/projects/${projectId}/plans/project-plan`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/plans`)
  }

  return (
    <ProjectPlanForm
      projectId={projectId}
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
