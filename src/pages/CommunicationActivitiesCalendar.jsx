/**
 * Communication Activities Calendar Page
 * Calendar view of scheduled communication activities
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '../utils/projectRouteParam.js'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { supabase } from '../services/supabaseClient'
import { ArrowLeft } from 'lucide-react'
import ActivitiesCalendar from '../components/cms/ActivitiesCalendar'
import { getCMSByProject } from '../services/communicationManagementStrategyService'

export default function CommunicationActivitiesCalendar() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [cms, setCms] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Fetch CMS
      try {
        const cmsData = await getCMSByProject(projectId)
        setCms(cmsData)
      } catch (error) {
        console.log('No CMS found for project')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading calendar...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(platformProjectPath(routeKey, 'cms'))}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to CMS
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Communication Activities Calendar
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {project?.project_name} ({project?.project_code})
          </p>
        </div>
      </div>

      {/* Calendar Component */}
      {cms ? (
        <ActivitiesCalendar cmsId={cms.id} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Please create a Communication Management Strategy first to view activities calendar.
          </p>
        </div>
      )}
    </div>
  )
}
