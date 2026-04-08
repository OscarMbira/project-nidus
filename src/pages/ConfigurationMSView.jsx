/**
 * Configuration MS View Page
 * View Configuration Management Strategy for a project
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '../utils/projectRouteParam.js'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { supabase } from '../services/supabaseClient'
import { ArrowLeft, Edit2, FileText } from 'lucide-react'
import ConfigurationMSViewComponent from '../components/cfg/ConfigurationMSView'
import { getConfigurationMSByProject, createConfigurationMSForProject } from '../services/configurationManagementStrategyService'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const CFG_MS_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'cms_reference', label: 'Reference' },
    { key: 'status', label: 'Status' },
    { key: 'version_number', label: 'Version' }
  ]}
]

export default function ConfigurationMSView() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [cfgMs, setCfgMs] = useState(null)
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

      // Get Configuration MS
      try {
        const cfgMsData = await getConfigurationMSByProject(projectId)
        setCfgMs(cfgMsData)
      } catch (error) {
        // Configuration MS doesn't exist yet
        console.log('No Configuration MS found for project')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    navigate(platformProjectPath(routeKey, 'configuration-ms', 'edit'))
  }

  const handleCreate = async () => {
    try {
      const newCfgMs = await createConfigurationMSForProject(projectId)
      setCfgMs(newCfgMs)
      navigate(platformProjectPath(routeKey, 'configuration-ms', 'edit'))
    } catch (error) {
      console.error('Error creating Configuration MS:', error)
      alert('Error creating Configuration MS: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading Configuration Management Strategy...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!cfgMs) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(platformProjectPath(routeKey))}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </button>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Configuration Management Strategy Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This project doesn't have a Configuration Management Strategy yet.
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Create Configuration Management Strategy
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(platformProjectPath(routeKey))}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </button>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Configuration Management Strategy — {cfgMs.cms_reference || 'View'}
        </h1>
        <div className="flex items-center gap-3">
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(CFG_MS_VIEW_SECTIONS, cfgMs, `ConfigurationMS_${cfgMs.cms_reference || cfgMs.id}`)}
            onExportWord={() => exportRecordToWord(CFG_MS_VIEW_SECTIONS, cfgMs, `ConfigurationMS_${cfgMs.cms_reference || cfgMs.id}`)}
            onExportExcel={() => exportRecordToExcel(CFG_MS_VIEW_SECTIONS, cfgMs, `ConfigurationMS_${cfgMs.cms_reference || cfgMs.id}`)}
            onExportCSV={() => exportRecordToCSV(CFG_MS_VIEW_SECTIONS, cfgMs, `ConfigurationMS_${cfgMs.cms_reference || cfgMs.id}`)}
            onExportXML={() => exportRecordToXML(CFG_MS_VIEW_SECTIONS, cfgMs, `ConfigurationMS_${cfgMs.cms_reference || cfgMs.id}`)}
            onExportJSON={() => exportRecordToJSON(CFG_MS_VIEW_SECTIONS, cfgMs, `ConfigurationMS_${cfgMs.cms_reference || cfgMs.id}`)}
            onExportPrint={() => exportRecordToPrint(CFG_MS_VIEW_SECTIONS, cfgMs, `ConfigurationMS_${cfgMs.cms_reference || cfgMs.id}`)}
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
      <ConfigurationMSViewComponent cfgMsId={cfgMs.id} onEdit={handleEdit} />
    </div>
  )
}
