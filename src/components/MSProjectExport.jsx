import { useState, useEffect } from 'react'
import { Download, FileText, Loader } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import { exportToMSProjectXML, downloadMSProjectXML } from '../utils/msProjectImport'

export default function MSProjectExport({ projectId, onExportComplete, onCancel }) {
  const [exporting, setExporting] = useState(false)
  const [projectData, setProjectData] = useState(null)

  useEffect(() => {
    if (projectId) {
      fetchProjectData()
    }
  }, [projectId])

  const fetchProjectData = async () => {
    try {
      // Fetch project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError) throw projectError

      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      if (tasksError) throw tasksError

      // Fetch resources (if any)
      const { data: resources } = await supabase
        .from('resources')
        .select('*')
        .eq('is_deleted', false)
        .limit(100)

      setProjectData({
        project,
        tasks: tasks || [],
        resources: resources || [],
        assignments: [], // Would need to fetch from resource_assignments
      })
    } catch (error) {
      console.error('Error fetching project data:', error)
      alert('Error loading project data: ' + error.message)
    }
  }

  const handleExport = async () => {
    if (!projectData) return

    setExporting(true)

    try {
      const xmlContent = exportToMSProjectXML(projectData)
      const filename = `${projectData.project.project_name || 'project'}.xml`
      downloadMSProjectXML(xmlContent, filename)

      if (onExportComplete) {
        onExportComplete()
      }
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Error exporting to MS Project format: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  if (!projectData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="flex items-center gap-3">
            <Loader className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-gray-900 dark:text-white">Loading project data...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Export to Microsoft Project
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Export Summary
            </h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div><strong>Project:</strong> {projectData.project.project_name}</div>
              <div><strong>Tasks:</strong> {projectData.tasks.length}</div>
              <div><strong>Resources:</strong> {projectData.resources.length}</div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              The project will be exported as an XML file compatible with Microsoft Project.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export to MS Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

