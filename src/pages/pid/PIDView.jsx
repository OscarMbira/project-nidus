/**
 * Project Initiation Document View Page
 * Main view page for displaying and managing PID
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '../../utils/projectRouteParam.js'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { FileText, Edit2, CheckCircle, Clock, AlertCircle, Plus, Users, Target, Package, Settings, ArrowLeft } from 'lucide-react'
import { getPIDByProject, getOrCreatePID, updatePID } from '../../services/projectInitiationDocumentService'
import { getObjectives } from '../../services/pidObjectivesService'
import { supabase } from '../../services/supabaseClient'
import ObjectivesSection from '../../components/pid/ObjectivesSection'
import InterfacesSection from '../../components/pid/InterfacesSection'
import DependenciesSection from '../../components/pid/DependenciesSection'
import TeamStructureSection from '../../components/pid/TeamStructureSection'
import TolerancesSection from '../../components/pid/TolerancesSection'
import ReportingArrangementsSection from '../../components/pid/ReportingArrangementsSection'
import PIDExportMenu from '../../components/pid/PIDExportMenu'
import PIDForm from '../../components/pid/PIDForm'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const PID_EXPORT_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'pid_reference', label: 'Reference' },
    { key: 'pid_title', label: 'Title' },
    { key: 'status', label: 'Status' }
  ]}
]

export default function PIDView() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [pid, setPid] = useState(null)
  const [objectives, setObjectives] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [editing, setEditing] = useState(false)

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

      // Get or create PID
      const pidData = await getOrCreatePID(projectId)
      setPid(pidData)

      // Fetch related data if PID exists
      if (pidData && pidData.id) {
        const [
          objectivesResult,
          interfacesResult,
          dependenciesResult,
          teamResult,
          tolerancesResult,
          reportingResult
        ] = await Promise.all([
          getObjectives(pidData.id),
          import('../../services/pidInterfacesService').then(m => m.getInterfaces(pidData.id)),
          import('../../services/pidDependenciesService').then(m => m.getDependencies(pidData.id)),
          import('../../services/pidTeamStructureService').then(m => m.getTeamStructure(pidData.id)),
          import('../../services/pidTolerancesService').then(m => m.getTolerances(pidData.id)),
          import('../../services/pidReportingArrangementsService').then(m => m.getReportingArrangements(pidData.id))
        ])

        if (objectivesResult.success) setObjectives(objectivesResult.data || [])
        if (interfacesResult.success) setInterfaces(interfacesResult.data || [])
        if (dependenciesResult.success) setDependencies(dependenciesResult.data || [])
        if (teamResult.success) setTeamMembers(teamResult.data || [])
        if (tolerancesResult.success) setTolerances(tolerancesResult.data || [])
        if (reportingResult.success) setReportingArrangements(reportingResult.data || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (updates) => {
    try {
      if (!pid) return

      const updated = await updatePID(pid.id, updates)
      setPid(updated)
      setEditing(false)
      await fetchData()
    } catch (error) {
      console.error('Error saving PID:', error)
      alert('Error saving: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Project Initiation Document...</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'superseded':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Project
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Project Initiation Document
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {project?.project_name} - {pid?.pid_reference || 'Draft'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {pid && (
              <ExportRecordButtons
                onExportPPT={() => exportRecordToPPT(PID_EXPORT_SECTIONS, { ...pid, title: pid.pid_title }, `PID_${pid.pid_reference || pid.id}`)}
                onExportWord={() => exportRecordToWord(PID_EXPORT_SECTIONS, pid, `PID_${pid.pid_reference || pid.id}`)}
                onExportExcel={() => exportRecordToExcel(PID_EXPORT_SECTIONS, pid, `PID_${pid.pid_reference || pid.id}`)}
                onExportCSV={() => exportRecordToCSV(PID_EXPORT_SECTIONS, pid, `PID_${pid.pid_reference || pid.id}`)}
                onExportXML={() => exportRecordToXML(PID_EXPORT_SECTIONS, pid, `PID_${pid.pid_reference || pid.id}`)}
                onExportJSON={() => exportRecordToJSON(PID_EXPORT_SECTIONS, pid, `PID_${pid.pid_reference || pid.id}`)}
                onExportPrint={() => exportRecordToPrint(PID_EXPORT_SECTIONS, pid, `PID_${pid.pid_reference || pid.id}`)}
              />
            )}
            {pid && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pid.status || 'draft')}`}>
                {(pid.status || 'draft').replace('_', ' ').toUpperCase()}
              </span>
            )}
            {pid && (
              <PIDExportMenu
                pid={pid}
                objectives={objectives}
                interfaces={interfaces}
                dependencies={dependencies}
                teamMembers={teamMembers}
                tolerances={tolerances}
                reportingArrangements={reportingArrangements}
              />
            )}
            {pid && pid.status === 'draft' && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {editing ? (
        <PIDForm
          projectId={projectId}
          pid={pid}
          mode={pid ? 'edit' : 'create'}
          onSave={async (savedPid) => {
            setPid(savedPid)
            setEditing(false)
            await fetchData()
          }}
          onCancel={() => {
            setEditing(false)
          }}
          saving={false}
        />
      ) : !pid ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Project Initiation Document
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create a Project Initiation Document to establish solid foundations for this project.
          </p>
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="h-4 w-4" />
            Create PID
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: FileText },
                { id: 'definition', label: 'Project Definition', icon: Target },
                  { id: 'objectives', label: `Objectives (${objectives.length})`, icon: Target },
                { id: 'interfaces', label: `Interfaces (${interfaces.length})`, icon: Package },
                { id: 'dependencies', label: `Dependencies (${dependencies.length})`, icon: Link },
                { id: 'approach', label: 'Approach', icon: Settings },
                { id: 'team', label: `Team (${teamMembers.length})`, icon: Users },
                { id: 'tolerances', label: `Tolerances (${tolerances.length})`, icon: Gauge },
                { id: 'reporting', label: `Reporting (${reportingArrangements.length})`, icon: FileText },
                { id: 'controls', label: 'Controls', icon: Settings },
                { id: 'plans', label: 'Plans', icon: Package }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">PID Title</h3>
                  <p className="text-gray-700 dark:text-gray-300">{pid.pid_title || 'Not defined'}</p>
                </div>

                {pid.pid_description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.pid_description}</p>
                  </div>
                )}

                {pid.project_background && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Background</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.project_background}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'definition' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Project Definition</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {pid.project_definition || 'Not defined'}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Project Scope</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {pid.project_scope || 'Not defined'}
                  </p>
                </div>

                {pid.exclusions && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Exclusions</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.exclusions}</p>
                  </div>
                )}

                {pid.dependencies && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Dependencies</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.dependencies}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'objectives' && pid && (
              <ObjectivesSection
                pidId={pid.id}
                mode={pid.status === 'draft' ? 'edit' : 'view'}
              />
            )}

            {activeTab === 'interfaces' && pid && (
              <InterfacesSection
                pidId={pid.id}
                mode={pid.status === 'draft' ? 'edit' : 'view'}
              />
            )}

            {activeTab === 'dependencies' && pid && (
              <DependenciesSection
                pidId={pid.id}
                mode={pid.status === 'draft' ? 'edit' : 'view'}
              />
            )}

            {activeTab === 'approach' && (
              <div className="space-y-6">
                {pid.project_approach && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Project Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.project_approach}</p>
                  </div>
                )}

                {pid.development_approach && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Development Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.development_approach}</p>
                  </div>
                )}

                {pid.quality_approach && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Quality Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.quality_approach}</p>
                    {pid.quality_management_strategy && (
                      <a
                        href={`/projects/${projectId}/qms`}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                      >
                        View Quality Management Strategy →
                      </a>
                    )}
                  </div>
                )}

                {pid.risk_approach && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Risk Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.risk_approach}</p>
                    {pid.risk_management_strategy && (
                      <a
                        href={`/projects/${projectId}/rms`}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                      >
                        View Risk Management Strategy →
                      </a>
                    )}
                  </div>
                )}

                {pid.configuration_management_approach && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Configuration Management Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.configuration_management_approach}</p>
                    {pid.configuration_management_strategy && (
                      <a
                        href={platformProjectPath(routeKey, 'configuration-ms')}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                      >
                        View Configuration Management Strategy →
                      </a>
                    )}
                  </div>
                )}

                {pid.communication_approach && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Communication Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.communication_approach}</p>
                    {pid.communication_management_strategy && (
                      <a
                        href={platformProjectPath(routeKey, 'cms')}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                      >
                        View Communication Management Strategy →
                      </a>
                    )}
                  </div>
                )}

                {pid.change_control_approach && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Change Control Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.change_control_approach}</p>
                  </div>
                )}

                {pid.procurement_approach && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Procurement Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{pid.procurement_approach}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'team' && pid && (
              <TeamStructureSection
                pidId={pid.id}
                mode={pid.status === 'draft' ? 'edit' : 'view'}
                projectId={projectId}
              />
            )}

            {activeTab === 'tolerances' && pid && (
              <TolerancesSection
                pidId={pid.id}
                mode={pid.status === 'draft' ? 'edit' : 'view'}
              />
            )}

            {activeTab === 'reporting' && pid && (
              <ReportingArrangementsSection
                pidId={pid.id}
                mode={pid.status === 'draft' ? 'edit' : 'view'}
                projectId={projectId}
              />
            )}

            {(activeTab === 'controls' || activeTab === 'plans') && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} section - Implementation in progress...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
