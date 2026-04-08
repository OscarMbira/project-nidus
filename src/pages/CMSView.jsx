/**
 * CMS View Page
 * View Communication Management Strategy for a project
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '../utils/projectRouteParam.js'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { supabase } from '../services/supabaseClient'
import { ArrowLeft, Edit2, FileText } from 'lucide-react'
import CMSViewComponent from '../components/cms/CMSView'
import { getCMSByProject, getOrCreateCMS } from '../services/communicationManagementStrategyService'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const CMS_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'cms_reference', label: 'Reference' },
    { key: 'strategy_title', label: 'Title' },
    { key: 'status', label: 'Status' }
  ]}
]

export default function CMSView() {
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

      // Get or create CMS
      try {
        const cmsData = await getCMSByProject(projectId)
        setCms(cmsData)
      } catch (error) {
        // CMS doesn't exist yet - will be created when needed
        console.log('No CMS found for project, will create when needed')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    navigate(platformProjectPath(routeKey, 'cms', 'edit'))
  }

  const handleCreate = async () => {
    try {
      const newCms = await getOrCreateCMS(projectId)
      setCms(newCms)
      navigate(platformProjectPath(routeKey, 'cms', 'edit'))
    } catch (error) {
      console.error('Error creating CMS:', error)
      alert('Error creating CMS: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading CMS...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!cms) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Communication Management Strategy Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This project doesn't have a Communication Management Strategy yet.
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Create CMS
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(platformProjectPath(routeKey))}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Communication Management Strategy
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {project?.project_name} ({project?.project_code})
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(CMS_VIEW_SECTIONS, cms, `CMS_${cms.cms_reference || cms.id}`)}
              onExportWord={() => exportRecordToWord(CMS_VIEW_SECTIONS, cms, `CMS_${cms.cms_reference || cms.id}`)}
              onExportExcel={() => exportRecordToExcel(CMS_VIEW_SECTIONS, cms, `CMS_${cms.cms_reference || cms.id}`)}
              onExportCSV={() => exportRecordToCSV(CMS_VIEW_SECTIONS, cms, `CMS_${cms.cms_reference || cms.id}`)}
              onExportXML={() => exportRecordToXML(CMS_VIEW_SECTIONS, cms, `CMS_${cms.cms_reference || cms.id}`)}
              onExportJSON={() => exportRecordToJSON(CMS_VIEW_SECTIONS, cms, `CMS_${cms.cms_reference || cms.id}`)}
              onExportPrint={() => exportRecordToPrint(CMS_VIEW_SECTIONS, cms, `CMS_${cms.cms_reference || cms.id}`)}
            />
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* CMS View Component */}
      <CMSViewComponent cmsId={cms.id} onEdit={handleEdit} readOnly={true} />
    </div>
  )
}
