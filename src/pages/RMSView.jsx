import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { platformDb } from '../services/supabase/supabaseClient'
import { FileText, Edit2, CheckCircle, Clock, AlertTriangle, Plus, Target, Award, Settings, Users, BarChart3, Calendar, Shield, TrendingUp } from 'lucide-react'
import { getRMSByProject, updateRMS, createRMSForProject, validateCompleteness, checkConformance, applyToRiskRegister } from '../services/riskManagementStrategyService'
import { getStandards } from '../services/rmsRiskStandardsService'
import { getMethods, getMandatoryMethods } from '../services/rmsIdentificationMethodsService'
import { getScales, getDefaultScales } from '../services/rmsAssessmentScalesService'
import { getMatrices, getDefaultMatrix } from '../services/rmsRiskMatrixService'
import { getStrategies, getStrategiesByType } from '../services/rmsResponseStrategiesService'
import { getRoles, getIndependentRoles } from '../services/rmsRolesResponsibilitiesService'
import { getActivities, getUpcomingActivities } from '../services/rmsScheduledActivitiesService'
import { getTools } from '../services/rmsToolsTechniquesService'
import { getRecords, getMandatoryRecords } from '../services/rmsRecordsService'
import { getReports } from '../services/rmsReportsService'
import { getTemplates } from '../services/rmsTemplatesFormsService'
import { getRiskRegisterByProject } from '../services/riskRegisterService'
import RMSForm from '../components/rms/RMSForm'
import StandardsSection from '../components/rms/StandardsSection'
import MethodsSection from '../components/rms/MethodsSection'
import ScalesSection from '../components/rms/ScalesSection'
import MatrixSection from '../components/rms/MatrixSection'
import StrategiesSection from '../components/rms/StrategiesSection'
import ToolsSection from '../components/rms/ToolsSection'
import TemplatesSection from '../components/rms/TemplatesSection'
import RecordsSection from '../components/rms/RecordsSection'
import ReportsSection from '../components/rms/ReportsSection'
import RolesSection from '../components/rms/RolesSection'
import ActivitiesSection from '../components/rms/ActivitiesSection'
import CompletenessIndicator from '../components/rms/CompletenessIndicator'
import ConformanceChecker from '../components/rms/ConformanceChecker'
import RMSRevisionHistory from '../components/rms/RMSRevisionHistory'
import RMSExportMenu from '../components/rms/RMSExportMenu'
import RMSPrintView from '../components/rms/RMSPrintView'
import RMSApprovalWorkflow from '../components/rms/RMSApprovalWorkflow'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const RMS_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'rms_reference', label: 'Reference' },
    { key: 'status', label: 'Status' },
    { key: 'purpose', label: 'Purpose' }
  ]}
]

export default function RMSView() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [rms, setRms] = useState(null)
  const [riskRegister, setRiskRegister] = useState(null)
  const [standards, setStandards] = useState([])
  const [methods, setMethods] = useState([])
  const [scales, setScales] = useState([])
  const [matrices, setMatrices] = useState([])
  const [strategies, setStrategies] = useState([])
  const [roles, setRoles] = useState([])
  const [activities, setActivities] = useState([])
  const [tools, setTools] = useState([])
  const [templates, setTemplates] = useState([])
  const [records, setRecords] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [validation, setValidation] = useState(null)
  const [conformance, setConformance] = useState(null)
  const [showRMSForm, setShowRMSForm] = useState(false)
  const [applyingToRegister, setApplyingToRegister] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showPrintView, setShowPrintView] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId, refreshKey])

  const handleSectionUpdate = () => {
    // Trigger refresh of all data when a section is updated
    setRefreshKey(prev => prev + 1)
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await platformDb
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Get or create RMS
      let rmsResult = await getRMSByProject(projectId)
      if (!rmsResult.success || !rmsResult.data) {
        // Check if there's a default template
        try {
          const { data: { user } } = await platformDb.auth.getUser()
          if (user) {
            const { data: userData } = await platformDb
              .from('users')
              .select('account_id')
              .eq('auth_user_id', user.id)
              .eq('is_deleted', false)
              .single()

            if (userData?.account_id) {
              const { getDefaultTemplate } = await import('../services/rmsTemplateService')
              const templateResult = await getDefaultTemplate(userData.account_id)
              
              if (templateResult.success && templateResult.data) {
                // Create from template
                const { createRMSFromTemplate } = await import('../services/riskManagementStrategyService')
                const createResult = await createRMSFromTemplate(projectId, templateResult.data.id)
                if (createResult.success) {
                  rmsResult = await getRMSByProject(projectId)
                }
              }
            }
          }
        } catch (error) {
          console.error('Error checking for default template:', error)
        }

        // Fallback to default creation if no template
        if (!rmsResult.success || !rmsResult.data) {
          const createResult = await createRMSForProject(projectId)
          if (createResult.success) {
            rmsResult = await getRMSByProject(projectId)
          }
        }
      }
      setRms(rmsResult.data)

      // Fetch Risk Register
      const registerResult = await getRiskRegisterByProject(projectId)
      if (registerResult.success) {
        setRiskRegister(registerResult.data)
      }

      // Fetch related data
      if (rmsResult.data) {
        const [
          standardsData,
          methodsData,
          scalesData,
          matricesData,
          strategiesData,
          rolesData,
          activitiesData,
          toolsData,
          templatesData,
          recordsData,
          reportsData,
          validationData,
          conformanceData
        ] = await Promise.all([
          getStandards(rmsResult.data.id),
          getMethods(rmsResult.data.id),
          getScales(rmsResult.data.id),
          getMatrices(rmsResult.data.id),
          getStrategies(rmsResult.data.id),
          getRoles(rmsResult.data.id),
          getActivities(rmsResult.data.id),
          getTools(rmsResult.data.id),
          getTemplates(rmsResult.data.id),
          getRecords(rmsResult.data.id),
          getReports(rmsResult.data.id),
          validateCompleteness(rmsResult.data.id),
          checkConformance(rmsResult.data.id)
        ])

        setStandards(standardsData.success ? standardsData.data || [] : [])
        setMethods(methodsData.success ? methodsData.data || [] : [])
        setScales(scalesData.success ? scalesData.data || [] : [])
        setMatrices(matricesData.success ? matricesData.data || [] : [])
        setStrategies(strategiesData.success ? strategiesData.data || [] : [])
        setRoles(rolesData.success ? rolesData.data || [] : [])
        setActivities(activitiesData.success ? activitiesData.data || [] : [])
        setTools(toolsData.success ? toolsData.data || [] : [])
        setTemplates(templatesData.success ? templatesData.data || [] : [])
        setRecords(recordsData.success ? recordsData.data || [] : [])
        setReports(reportsData.success ? reportsData.data || [] : [])
        setValidation(validationData.success ? (Array.isArray(validationData.data) ? validationData.data : []) : [])
        setConformance(conformanceData.success ? (Array.isArray(conformanceData.data) ? conformanceData.data : []) : [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyToRegister = async () => {
    if (!rms || !riskRegister) {
      alert('Risk Register not found. Please create a Risk Register first.')
      return
    }

    if (!confirm('Apply RMS configuration (scales and matrix) to Risk Register? This will update the Risk Register configuration.')) {
      return
    }

    try {
      setApplyingToRegister(true)
      const result = await applyToRiskRegister(rms.id, riskRegister.id)
      if (result.success) {
        alert('RMS configuration applied to Risk Register successfully!')
        // Refresh Risk Register
        const registerResult = await getRiskRegisterByProject(projectId)
        if (registerResult.success) {
          setRiskRegister(registerResult.data)
        }
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error applying RMS to register:', error)
      alert('Error: ' + error.message)
    } finally {
      setApplyingToRegister(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Risk Management Strategy...</p>
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
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Project
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Risk Management Strategy
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {project?.project_name} - {rms?.rms_reference || 'Draft'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {rms && (
              <>
                <ExportRecordButtons
                  onExportPPT={() => exportRecordToPPT(RMS_VIEW_SECTIONS, rms, `RMS_${rms.rms_reference || rms.id}`)}
                  onExportWord={() => exportRecordToWord(RMS_VIEW_SECTIONS, rms, `RMS_${rms.rms_reference || rms.id}`)}
                  onExportExcel={() => exportRecordToExcel(RMS_VIEW_SECTIONS, rms, `RMS_${rms.rms_reference || rms.id}`)}
                  onExportCSV={() => exportRecordToCSV(RMS_VIEW_SECTIONS, rms, `RMS_${rms.rms_reference || rms.id}`)}
                  onExportXML={() => exportRecordToXML(RMS_VIEW_SECTIONS, rms, `RMS_${rms.rms_reference || rms.id}`)}
                  onExportJSON={() => exportRecordToJSON(RMS_VIEW_SECTIONS, rms, `RMS_${rms.rms_reference || rms.id}`)}
                  onExportPrint={() => exportRecordToPrint(RMS_VIEW_SECTIONS, rms, `RMS_${rms.rms_reference || rms.id}`)}
                />
                <RMSExportMenu
                  rms={rms}
                  standards={standards}
                  methods={methods}
                  scales={scales}
                  matrices={matrices}
                  strategies={strategies}
                  tools={tools}
                  templates={templates}
                  records={records}
                  reports={reports}
                  roles={roles}
                  activities={activities}
                  onPrint={() => setShowPrintView(true)}
                />
                {rms.status === 'approved' && riskRegister && (
                  <button
                    onClick={handleApplyToRegister}
                    disabled={applyingToRegister}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    {applyingToRegister ? 'Applying...' : 'Apply to Risk Register'}
                  </button>
                )}
                {rms.status !== 'approved' && (
                  <button
                    onClick={() => setShowRMSForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit Strategy
                  </button>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(rms.status)}`}>
                  {rms.status.replace('_', ' ')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Approval Workflow */}
      {rms && (
        <div className="mb-6">
          <RMSApprovalWorkflow rms={rms} onUpdate={fetchData} />
        </div>
      )}

      {/* Completeness Indicator */}
      {validation && Array.isArray(validation) && validation.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <CompletenessIndicator validation={validation} showDetails={true} />
        </div>
      )}

      {/* Risk Criteria Warnings */}
      {validation && validation.filter(s => s.is_complete).length === validation.length && (
        <div className="space-y-3 mb-6">
          {/* Check for independent risk role */}
          {roles.filter(r => r.independence_level && ['project_independent', 'corporate', 'external'].includes(r.independence_level)).length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                    No Independent Risk Role
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    At least one risk role should be independent of the project team (Project Assurance, Corporate Risk, or External Auditor).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Check for identification methods */}
          {methods.filter(m => m.is_mandatory).length === 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-1">
                    No Identification Methods Defined
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    Consider defining mandatory risk identification methods (workshops, checklists, etc.).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Check for assessment scales */}
          {scales.length < 2 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                    Assessment Scales Not Complete
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Define probability and impact assessment scales to enable risk assessment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Check for scheduled activities */}
          {activities.length === 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-1">
                    No Scheduled Activities Defined
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    Schedule risk activities (reviews, workshops, audits) to ensure risk processes are executed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Check if scales applied to Risk Register */}
          {rms && rms.status === 'approved' && riskRegister && scales.length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-1">
                    Apply Configuration to Risk Register
                  </p>
                  <p className="text-sm text-indigo-700 dark:text-indigo-400 mb-2">
                    Click "Apply to Risk Register" to sync scales and matrix configuration to the Risk Register.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!rms ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <AlertTriangle className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Risk Management Strategy
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create a Risk Management Strategy to define how risks will be managed in this project.
          </p>
        </div>
      ) : showPrintView ? (
        <RMSPrintView
          rms={rms}
          standards={standards}
          methods={methods}
          scales={scales}
          matrices={matrices}
          strategies={strategies}
          tools={tools}
          templates={templates}
          records={records}
          reports={reports}
          roles={roles}
          activities={activities}
        />
      ) : (
        <>
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview', icon: FileText },
                  { id: 'standards', label: `Standards (${standards.length})`, icon: Shield },
                  { id: 'procedures', label: 'Procedures', icon: Settings },
                  { id: 'methods', label: `Methods (${methods.length})`, icon: Target },
                  { id: 'scales', label: `Scales (${scales.length})`, icon: BarChart3 },
                  { id: 'matrix', label: `Matrix (${matrices.length})`, icon: TrendingUp },
                  { id: 'strategies', label: `Strategies (${strategies.length})`, icon: Shield },
                  { id: 'tools', label: `Tools (${tools.length})`, icon: Settings },
                  { id: 'templates', label: `Templates (${templates.length})`, icon: FileText },
                  { id: 'records', label: `Records (${records.length})`, icon: FileText },
                  { id: 'reports', label: `Reports (${reports.length})`, icon: BarChart3 },
                  { id: 'roles', label: `Roles (${roles.length})`, icon: Users },
                  { id: 'activities', label: `Activities (${activities.length})`, icon: Calendar },
                  { id: 'conformance', label: 'Conformance', icon: CheckCircle },
                  { id: 'history', label: 'Revision History', icon: Clock }
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
                  {/* Purpose */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Purpose</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{rms.purpose || 'Not defined'}</p>
                  </div>

                  {/* Objectives */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Objectives</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{rms.objectives || 'Not defined'}</p>
                  </div>

                  {/* Scope */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scope</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{rms.scope || 'Not defined'}</p>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Standards</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{standards.length}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Methods</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{methods.length}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-300">Scales</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">{scales.length}</p>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800 dark:text-orange-300">Roles</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{roles.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'standards' && rms && (
                <StandardsSection rmsId={rms.id} readOnly={rms.status === 'approved'} onUpdate={handleSectionUpdate} />
              )}

              {activeTab === 'procedures' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk Identification Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{rms.risk_identification_approach || 'Not defined'}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk Assessment Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{rms.risk_assessment_approach || 'Not defined'}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk Response Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{rms.risk_response_approach || 'Not defined'}</p>
                  </div>
                  {rms.risk_monitoring_approach && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk Monitoring Approach</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{rms.risk_monitoring_approach}</p>
                    </div>
                  )}
                  {rms.variance_from_corporate && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Variance from Corporate Standards</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">{rms.variance_from_corporate}</p>
                      {rms.variance_justification && (
                        <>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Justification</h4>
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{rms.variance_justification}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'methods' && rms && (
                <MethodsSection rmsId={rms.id} readOnly={rms.status === 'approved'} onUpdate={handleSectionUpdate} />
              )}

              {activeTab === 'scales' && rms && (
                <ScalesSection rmsId={rms.id} readOnly={rms.status === 'approved'} />
              )}

              {activeTab === 'matrix' && rms && (
                <MatrixSection rmsId={rms.id} readOnly={rms.status === 'approved'} />
              )}

              {activeTab === 'strategies' && rms && (
                <StrategiesSection rmsId={rms.id} readOnly={rms.status === 'approved'} />
              )}

              {activeTab === 'tools' && rms && (
                <ToolsSection rmsId={rms.id} readOnly={rms.status === 'approved'} />
              )}

              {activeTab === 'templates' && rms && (
                <TemplatesSection rmsId={rms.id} readOnly={rms.status === 'approved'} />
              )}

              {activeTab === 'records' && rms && (
                <RecordsSection rmsId={rms.id} readOnly={rms.status === 'approved'} />
              )}

              {activeTab === 'reports' && rms && (
                <ReportsSection rmsId={rms.id} readOnly={rms.status === 'approved'} />
              )}

              {activeTab === 'roles' && rms && (
                <RolesSection rmsId={rms.id} readOnly={rms.status === 'approved'} />
              )}

              {activeTab === 'activities' && rms && (
                <ActivitiesSection rmsId={rms.id} readOnly={rms.status === 'approved'} />
              )}

              {activeTab === 'conformance' && rms && (
                <ConformanceChecker rmsId={rms.id} onCheckComplete={setConformance} />
              )}

              {activeTab === 'history' && rms && (
                <RMSRevisionHistory rmsId={rms.id} />
              )}
            </div>
          </div>
        </>
      )}

      {showPrintView && (
        <div className="mt-4">
          <button
            onClick={() => setShowPrintView(false)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
          >
            Back to RMS View
          </button>
        </div>
      )}

      {/* RMS Form Modal */}
      {showRMSForm && (
        <RMSForm
          rms={rms}
          projectId={projectId}
          onSave={() => {
            setShowRMSForm(false)
            fetchData()
          }}
          onCancel={() => setShowRMSForm(false)}
        />
      )}
    </div>
  )
}
