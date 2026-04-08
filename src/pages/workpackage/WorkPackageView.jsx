/**
 * Work Package View Page
 * Main view page for displaying and managing Work Package
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FileText, Edit2, ArrowLeft, Package, CheckCircle, Calendar, Users, BarChart3, Settings, Target, Briefcase, FileText as FileTextIcon } from 'lucide-react'
import { getWorkPackageById, updateWorkPackage, authorizeWorkPackage, acceptWorkPackage, completeWorkPackage, closeWorkPackage, updateProgress } from '../../services/controllingStageService'
import { getProducts } from '../../services/wpProductsService'
import { getQualityCriteria } from '../../services/wpQualityCriteriaService'
import { getAcceptanceCriteria } from '../../services/wpAcceptanceCriteriaService'
import { getResources } from '../../services/wpResourcesService'
import { getReportingArrangements } from '../../services/wpReportingArrangementsService'
import { getStatusHistory as getWPStatusHistory } from '../../services/wpStatusHistoryService'
import { getProgressSnapshots } from '../../services/wpProgressSnapshotsService'
import { supabase } from '../../services/supabaseClient'
import WPProductsSection from '../../components/workpackage/WPProductsSection'
import WPQualityCriteriaSection from '../../components/workpackage/WPQualityCriteriaSection'
import WPAcceptanceCriteriaSection from '../../components/workpackage/WPAcceptanceCriteriaSection'
import WPResourcesSection from '../../components/workpackage/WPResourcesSection'
import WPReportingArrangementsSection from '../../components/workpackage/WPReportingArrangementsSection'
import WPScheduleSection from '../../components/workpackage/WPScheduleSection'
import WPStatusSection from '../../components/workpackage/WPStatusSection'
import WPProgressSection from '../../components/workpackage/WPProgressSection'
import WorkPackageForm from '../../components/structured/WorkPackageForm'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const WP_VIEW_SECTIONS = [
  { title: 'Work Package', fields: [
    { key: 'wp_reference', label: 'Reference' },
    { key: 'work_package_name', label: 'Name' },
    { key: 'status', label: 'Status' }
  ]}
]

export default function WorkPackageView() {
  const { wpId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [workPackage, setWorkPackage] = useState(null)
  const [products, setProducts] = useState([])
  const [qualityCriteria, setQualityCriteria] = useState([])
  const [acceptanceCriteria, setAcceptanceCriteria] = useState([])
  const [resources, setResources] = useState([])
  const [reportingArrangements, setReportingArrangements] = useState([])
  const [statusHistory, setStatusHistory] = useState([])
  const [progressSnapshots, setProgressSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (wpId) {
      fetchData()
    }
  }, [wpId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch work package with related data
      const wpData = await getWorkPackageById(wpId)
      if (!wpData) {
        throw new Error('Work Package not found')
      }
      setWorkPackage(wpData)

      if (wpData?.project_id) {
        // Fetch project
        const { data: projectData } = await supabase
          .from('projects')
          .select('id, project_name, project_code')
          .eq('id', wpData.project_id)
          .eq('is_deleted', false)
          .single()

        setProject(projectData)

        // Fetch all related data
        const [
          productsResult,
          qualityResult,
          acceptanceResult,
          resourcesResult,
          reportingResult,
          historyResult,
          snapshotsResult
        ] = await Promise.all([
          getProducts(wpId),
          getQualityCriteria(wpId),
          getAcceptanceCriteria(wpId),
          getResources(wpId),
          getReportingArrangements(wpId),
          getWPStatusHistory(wpId),
          getProgressSnapshots(wpId)
        ])

        if (productsResult.success) setProducts(productsResult.data || [])
        if (qualityResult.success) setQualityCriteria(qualityResult.data || [])
        if (acceptanceResult.success) setAcceptanceCriteria(acceptanceResult.data || [])
        if (resourcesResult.success) setResources(resourcesResult.data || [])
        if (reportingResult.success) setReportingArrangements(reportingResult.data || [])
        if (historyResult.success) setStatusHistory(historyResult.data || [])
        if (snapshotsResult.success) setProgressSnapshots(snapshotsResult.data || [])
      } else {
        throw new Error('Work Package project_id not found')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthorize = async () => {
    if (!confirm('Authorize this work package?')) return
    try {
      await authorizeWorkPackage(wpId)
      await fetchData()
      alert('Work Package authorized successfully')
    } catch (error) {
      alert('Error authorizing: ' + error.message)
    }
  }

  const handleAccept = async () => {
    if (!confirm('Accept this work package?')) return
    try {
      await acceptWorkPackage(wpId)
      await fetchData()
      alert('Work Package accepted successfully')
    } catch (error) {
      alert('Error accepting: ' + error.message)
    }
  }

  const handleComplete = async () => {
    if (!confirm('Mark this work package as completed?')) return
    try {
      await completeWorkPackage(wpId)
      await fetchData()
      alert('Work Package completed successfully')
    } catch (error) {
      alert('Error completing: ' + error.message)
    }
  }

  const handleClose = async () => {
    if (!confirm('Close this work package?')) return
    try {
      await closeWorkPackage(wpId)
      await fetchData()
      alert('Work Package closed successfully')
    } catch (error) {
      alert('Error closing: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Work Package...</p>
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'closed':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'authorized':
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const canEdit = workPackage?.status === 'draft' || workPackage?.status === 'authorized'
  const canAuthorize = workPackage?.status === 'draft'
  const canAccept = workPackage?.status === 'authorized'
  const canComplete = workPackage?.status === 'in_progress'
  const canClose = workPackage?.status === 'completed'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${workPackage?.project_id}`)}
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
              Work Package
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {project?.project_name} - {workPackage?.wp_reference || workPackage?.work_package_code || 'Draft'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {workPackage && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workPackage.status || 'draft')}`}>
                {(workPackage.status || 'draft').replace('_', ' ').toUpperCase()}
              </span>
            )}
            {canAuthorize && (
              <button
                onClick={handleAuthorize}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
              >
                Authorize
              </button>
            )}
            {canAccept && (
              <button
                onClick={handleAccept}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                Accept
              </button>
            )}
            {canComplete && (
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                Complete
              </button>
            )}
            {canClose && (
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
              >
                Close
              </button>
            )}
            {canEdit && (
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
        <WorkPackageForm
          workPackage={workPackage}
          projectId={workPackage?.project_id}
          onSave={async () => {
            setEditing(false)
            await fetchData()
          }}
          onCancel={() => setEditing(false)}
        />
      ) : !workPackage ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Work Package Not Found
          </h3>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: FileText },
                { id: 'work', label: 'Work Definition', icon: Target },
                { id: 'products', label: `Products (${products.length})`, icon: Package },
                { id: 'quality', label: `Quality (${qualityCriteria.length})`, icon: CheckCircle },
                { id: 'acceptance', label: `Acceptance (${acceptanceCriteria.length})`, icon: CheckCircle },
                { id: 'schedule', label: 'Schedule', icon: Calendar },
                { id: 'resources', label: `Resources (${resources.length})`, icon: Briefcase },
                { id: 'reporting', label: `Reporting (${reportingArrangements.length})`, icon: FileTextIcon },
                { id: 'status', label: 'Status & Progress', icon: BarChart3 }
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Work Package Name</h3>
                  <p className="text-gray-700 dark:text-gray-300">{workPackage.work_package_name || 'Not defined'}</p>
                </div>

                {workPackage.work_package_description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{workPackage.work_package_description}</p>
                  </div>
                )}

                {workPackage.assigned_to && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Assigned To</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {workPackage.assigned_to.full_name} ({workPackage.assigned_to.email})
                    </p>
                  </div>
                )}

                {workPackage.stage_boundary && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Stage</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {workPackage.stage_boundary.stage_name || workPackage.stage_boundary.gate_name}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'work' && (
              <div className="space-y-6">
                {workPackage.work_description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Work Description</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{workPackage.work_description}</p>
                  </div>
                )}

                {workPackage.objectives && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Objectives</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{workPackage.objectives}</p>
                  </div>
                )}

                {workPackage.scope && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scope</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{workPackage.scope}</p>
                  </div>
                )}

                {workPackage.assumptions && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Assumptions</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{workPackage.assumptions}</p>
                  </div>
                )}

                {workPackage.constraints && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Constraints</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{workPackage.constraints}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'products' && workPackage && (
              <WPProductsSection
                wpId={workPackage.id}
                mode={canEdit ? 'edit' : 'view'}
              />
            )}

            {activeTab === 'quality' && workPackage && (
              <WPQualityCriteriaSection
                wpId={workPackage.id}
                mode={canEdit ? 'edit' : 'view'}
              />
            )}

            {activeTab === 'acceptance' && workPackage && (
              <WPAcceptanceCriteriaSection
                wpId={workPackage.id}
                mode={canEdit ? 'edit' : 'view'}
              />
            )}

            {activeTab === 'schedule' && workPackage && (
              <WPScheduleSection
                workPackage={workPackage}
                mode={canEdit ? 'edit' : 'view'}
                onUpdate={fetchData}
              />
            )}

            {activeTab === 'resources' && workPackage && (
              <WPResourcesSection
                wpId={workPackage.id}
                mode={canEdit ? 'edit' : 'view'}
              />
            )}

            {activeTab === 'reporting' && workPackage && (
              <WPReportingArrangementsSection
                wpId={workPackage.id}
                mode={canEdit ? 'edit' : 'view'}
                projectId={workPackage.project_id}
              />
            )}

            {activeTab === 'status' && workPackage && (
              <div className="space-y-6">
                <WPStatusSection
                  workPackage={workPackage}
                  statusHistory={statusHistory}
                />
                <WPProgressSection
                  workPackage={workPackage}
                  progressSnapshots={progressSnapshots}
                  onUpdateProgress={handleUpdateProgress}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
