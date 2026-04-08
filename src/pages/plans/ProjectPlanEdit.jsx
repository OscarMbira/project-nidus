/**
 * Project Plan Edit Page
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import ProjectPlanForm from '../../components/plans/ProjectPlanForm'

export default function ProjectPlanEdit() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  
  // Get planId from query params or state
  const searchParams = new URLSearchParams(window.location.search)
  const planId = searchParams.get('planId')

  const handleSave = (plan) => {
    navigate(`/app/projects/${projectId}/plans/project-plan`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/plans/project-plan`)
  }

  if (!planId) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 dark:text-gray-400">Plan ID not provided</p>
      </div>
    )
  }

  return (
    <ProjectPlanForm
      projectId={projectId}
      planId={planId}
      mode="edit"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
