/**
 * Stage Plan Create Page
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { useState, useEffect } from 'react'
import StagePlanForm from '../../components/plans/StagePlanForm'
import { getProjectPlanByProject } from '../../services/projectPlanService'

export default function StagePlanCreate() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [projectPlanId, setProjectPlanId] = useState(null)
  const [stageNumber, setStageNumber] = useState(null)

  useEffect(() => {
    if (projectId) {
      loadProjectPlan()
      const stageNum = searchParams.get('stageNumber')
      if (stageNum) {
        setStageNumber(parseInt(stageNum))
      }
    }
  }, [projectId, searchParams])

  const loadProjectPlan = async () => {
    try {
      const result = await getProjectPlanByProject(projectId)
      if (result.success && result.data) {
        setProjectPlanId(result.data.id)
      }
    } catch (error) {
      console.error('Error loading project plan:', error)
    }
  }

  const handleSave = (plan) => {
    navigate(`/app/projects/${projectId}/plans/stage-plan/${plan.id}`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/plans`)
  }

  if (!projectPlanId) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          A Project Plan must be created first before creating Stage Plans.
        </p>
        <button
          onClick={() => navigate(`/app/projects/${projectId}/plans/project-plan/create`)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Create Project Plan First
        </button>
      </div>
    )
  }

  return (
    <StagePlanForm
      projectId={projectId}
      projectPlanId={projectPlanId}
      stageNumber={stageNumber}
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
