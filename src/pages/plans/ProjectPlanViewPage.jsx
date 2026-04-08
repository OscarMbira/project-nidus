/**
 * Project Plan View Page
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { useState, useEffect } from 'react'
import ProjectPlanView from '../../components/plans/ProjectPlanView'
import { getProjectPlanByProject } from '../../services/projectPlanService'

export default function ProjectPlanViewPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [planId, setPlanId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadPlan()
    }
  }, [projectId])

  const loadPlan = async () => {
    try {
      setLoading(true)
      const result = await getProjectPlanByProject(projectId)
      if (result.success && result.data) {
        setPlanId(result.data.id)
      } else {
        // No plan exists, redirect to create
        navigate(`/app/projects/${projectId}/plans/project-plan/create`)
      }
    } catch (error) {
      console.error('Error loading plan:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!planId) {
    return null
  }

  return (
    <ProjectPlanView
      planId={planId}
      onEdit={(plan) => navigate(`/app/projects/${projectId}/plans/project-plan/edit?planId=${plan.id}`)}
      onExport={(plan) => {
        // Export functionality
        console.log('Export plan:', plan)
      }}
    />
  )
}
