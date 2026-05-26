/**
 * Practice Project Detail Page
 * Overview of practice project with all linked artefacts
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Edit2, Trash2, ArrowLeft } from 'lucide-react'
import { getPracticeProjectById, deletePracticeProject } from '../../services/sim/practiceProjectService'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'
import CustomFieldRenderer from '../../features/local-data-extensions/components/CustomFieldRenderer'
import { buildCustomFieldExportParts } from '../../features/local-data-extensions/utils/exportMerge'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { resolveLdeAccountForCurrentUser } from '../../features/local-data-extensions/utils/bootstrapLdeAccount'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
const PRACTICE_PROJECT_VIEW_SECTIONS = [
  { title: 'Project', fields: [
    { key: 'project_name', label: 'Name' },
    { key: 'project_code', label: 'Code' }
  ]}
]

async function buildPracticeProjectExport(projectRow, accountId) {
  const base = projectRow
  if (!simDb || !accountId || !projectRow?.id) {
    return { sections: PRACTICE_PROJECT_VIEW_SECTIONS, record: base }
  }
  try {
    const { section, mergedRecord } = await buildCustomFieldExportParts(
      simDb,
      accountId,
      'project',
      projectRow.id,
      undefined,
      projectRow.id
    )
    const sections = section ? [...PRACTICE_PROJECT_VIEW_SECTIONS, section] : PRACTICE_PROJECT_VIEW_SECTIONS
    return { sections, record: { ...base, ...mergedRecord } }
  } catch {
    return { sections: PRACTICE_PROJECT_VIEW_SECTIONS, record: base }
  }
}

export default function PracticeProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [ldeAccountId, setLdeAccountId] = useState(null)

  useEffect(() => {
    let cancelled = false
    resolveLdeAccountForCurrentUser().then(({ accountId: aid }) => {
      if (!cancelled) setLdeAccountId(aid)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (id) fetchProject()
  }, [id])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const result = await getPracticeProjectById(id)
      if (result.success) {
        setProject(result.data)
      } else {
        navigate('/simulator/practice-projects')
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this practice project?')) return
    try {
      const result = await deletePracticeProject(id)
      if (result.success) {
        navigate('/simulator/practice-projects')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Error: ' + error.message)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!project) {
    return <div className="text-center py-12">Project not found</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate('/simulator/practice-projects')}
          className="mb-4 inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.project_name}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{project.project_code}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <ExportRecordButtons
              onExportPPT={async () => {
                const { sections, record } = await buildPracticeProjectExport(project, ldeAccountId)
                exportRecordToPPT(sections, record, `PracticeProject_${project.project_code || id}`)
              }}
              onExportWord={async () => {
                const { sections, record } = await buildPracticeProjectExport(project, ldeAccountId)
                exportRecordToWord(sections, record, `PracticeProject_${project.project_code || id}`)
              }}
              onExportExcel={async () => {
                const { sections, record } = await buildPracticeProjectExport(project, ldeAccountId)
                exportRecordToExcel(sections, record, `PracticeProject_${project.project_code || id}`)
              }}
              onExportCSV={async () => {
                const { sections, record } = await buildPracticeProjectExport(project, ldeAccountId)
                exportRecordToCSV(sections, record, `PracticeProject_${project.project_code || id}`)
              }}
              onExportXML={async () => {
                const { sections, record } = await buildPracticeProjectExport(project, ldeAccountId)
                exportRecordToXML(sections, record, `PracticeProject_${project.project_code || id}`)
              }}
              onExportJSON={async () => {
                const { sections, record } = await buildPracticeProjectExport(project, ldeAccountId)
                exportRecordToJSON(sections, record, `PracticeProject_${project.project_code || id}`)
              }}
              onExportPrint={async () => {
                const { sections, record } = await buildPracticeProjectExport(project, ldeAccountId)
                exportRecordToPrint(sections, record, `PracticeProject_${project.project_code || id}`)
              }}
            />
            <button
              onClick={() => navigate(`/simulator/practice-projects/${id}/edit`)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 inline-flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {['overview', 'tasks', 'briefs', 'risks', 'issues', 'quality'].map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Description</h3>
                <p className="text-gray-600 dark:text-gray-400">{project.project_description || 'No description'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h4>
                  <p className="text-gray-900 dark:text-white">{project.project_status?.status_name || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Health</h4>
                  <p className="text-gray-900 dark:text-white">{project.health_status || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Progress</h4>
                  <p className="text-gray-900 dark:text-white">{project.percentage_complete || 0}%</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Budget</h4>
                  <p className="text-gray-900 dark:text-white">{project.budget_currency} {project.budget_amount || 0}</p>
                </div>
              </div>
              <CustomFieldRenderer
                platformDb={simDb}
                userLookupDb={platformDb}
                accountId={ldeAccountId}
                practiceProjectId={id}
                entityType="project"
                entityId={id}
                screenCode="project_detail"
              />
            </div>
          )}
          {activeTab === 'tasks' && <div className="text-center py-8 text-gray-500">Tasks coming soon</div>}
          {activeTab === 'briefs' && <div className="text-center py-8 text-gray-500">Briefs coming soon</div>}
          {activeTab === 'risks' && <div className="text-center py-8 text-gray-500">Risks coming soon</div>}
          {activeTab === 'issues' && <div className="text-center py-8 text-gray-500">Issues coming soon</div>}
          {activeTab === 'quality' && <div className="text-center py-8 text-gray-500">Quality coming soon</div>}
        </div>
      </div>
    </div>
  )
}
