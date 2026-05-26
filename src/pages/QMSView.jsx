import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { supabase } from '../services/supabaseClient'
import { FileText, Edit2, CheckCircle, Clock, AlertCircle, Plus, Target, Award, Settings, Users, BarChart3, Calendar, Shield, TrendingUp } from 'lucide-react'
import { getQMSByProject, getOrCreateQMS, validateCompleteness, checkConformance } from '../services/qualityManagementStrategyService'
import { getStandards } from '../services/qmsQualityStandardsService'
import { getMethods } from '../services/qmsQualityMethodsService'
import { getMetrics } from '../services/qmsQualityMetricsService'
import { getRoles, getIndependentRoles } from '../services/qmsQualityRolesService'
import { getActivities, getUpcomingActivities } from '../services/qmsScheduledActivitiesService'
import { getTools } from '../services/qmsQualityToolsService'
import { getRecords, getMandatoryRecords } from '../services/qmsQualityRecordsService'
import { getReports } from '../services/qmsQualityReportsService'
import QMSForm from '../components/qms/QMSForm'
import QMSExportMenu from '../components/qms/QMSExportMenu'
import { updateQMS } from '../services/qualityManagementStrategyService'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const QMS_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'qms_reference', label: 'Reference' },
    { key: 'strategy_title', label: 'Title' },
    { key: 'status', label: 'Status' }
  ]}
]

export default function QMSView() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [qms, setQms] = useState(null)
  const [standards, setStandards] = useState([])
  const [methods, setMethods] = useState([])
  const [metrics, setMetrics] = useState([])
  const [roles, setRoles] = useState([])
  const [activities, setActivities] = useState([])
  const [tools, setTools] = useState([])
  const [records, setRecords] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [validation, setValidation] = useState(null)
  const [conformance, setConformance] = useState(null)
  const [showQMSForm, setShowQMSForm] = useState(false)

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

      // Get or create QMS
      const qmsData = await getOrCreateQMS(projectId)
      setQms(qmsData)

      // Fetch related data
      if (qmsData) {
        const [
          standardsData,
          methodsData,
          metricsData,
          rolesData,
          activitiesData,
          toolsData,
          recordsData,
          reportsData,
          validationData,
          conformanceData
        ] = await Promise.all([
          getStandards(qmsData.id),
          getMethods(qmsData.id),
          getMetrics(qmsData.id),
          getRoles(qmsData.id),
          getActivities(qmsData.id),
          getTools(qmsData.id),
          getRecords(qmsData.id),
          getReports(qmsData.id),
          validateCompleteness(qmsData.id),
          checkConformance(qmsData.id)
        ])

        setStandards(standardsData || [])
        setMethods(methodsData || [])
        setMetrics(metricsData || [])
        setRoles(rolesData || [])
        setActivities(activitiesData || [])
        setTools(toolsData || [])
        setRecords(recordsData || [])
        setReports(reportsData || [])
        setValidation(validationData)
        setConformance(conformanceData || [])
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Quality Management Strategy...</p>
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
              Quality Management Strategy
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {project?.project_name} - {qms?.qms_reference || 'Draft'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {qms && (
              <>
                <ExportRecordButtons
                  onExportPPT={() => exportRecordToPPT(QMS_VIEW_SECTIONS, qms, `QMS_${qms.qms_reference || qms.id}`)}
                  onExportWord={() => exportRecordToWord(QMS_VIEW_SECTIONS, qms, `QMS_${qms.qms_reference || qms.id}`)}
                  onExportExcel={() => exportRecordToExcel(QMS_VIEW_SECTIONS, qms, `QMS_${qms.qms_reference || qms.id}`)}
                  onExportCSV={() => exportRecordToCSV(QMS_VIEW_SECTIONS, qms, `QMS_${qms.qms_reference || qms.id}`)}
                  onExportXML={() => exportRecordToXML(QMS_VIEW_SECTIONS, qms, `QMS_${qms.qms_reference || qms.id}`)}
                  onExportJSON={() => exportRecordToJSON(QMS_VIEW_SECTIONS, qms, `QMS_${qms.qms_reference || qms.id}`)}
                  onExportPrint={() => exportRecordToPrint(QMS_VIEW_SECTIONS, qms, `QMS_${qms.qms_reference || qms.id}`)}
                />
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(qms.status)}`}>
                  {qms.status.replace('_', ' ').toUpperCase()}
                </span>
                {qms.status === 'draft' && (
                  <button
                    onClick={() => setShowQMSForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                )}
                <QMSExportMenu 
                  qms={qms}
                  standards={standards}
                  methods={methods}
                  metrics={metrics}
                  roles={roles}
                  activities={activities}
                  tools={tools}
                  records={records}
                  reports={reports}
                />
              </>
            )}
            {validation && (
              <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                {validation.completeness_score || 0}% Complete
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Validation Summary */}
              {validation && !validation.is_complete && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                Strategy Incomplete ({validation.completeness_score}%)
              </h3>
              <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                {validation.issues?.slice(0, 3).map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
                {validation.issues?.length > 3 && (
                  <li>...and {validation.issues.length - 3} more</li>
                )}
              </ul>
              
              {/* Show incomplete sections */}
              {validation.sections && validation.sections.filter(s => !s.is_complete).length > 0 && (
                <div className="mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-800">
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                    Incomplete Sections:
                  </h4>
                  <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                    {validation.sections.filter(s => !s.is_complete).map((section, index) => (
                      <li key={index}>
                        {section.section_name}
                        {section.missing_items && section.missing_items.length > 0 && (
                          <span className="ml-2 text-xs">
                            ({section.missing_items.join(', ')})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Quality Criteria Warnings */}
      {validation && validation.is_complete && (
        <div className="space-y-3 mb-6">
          {/* Check for independent quality role */}
          {roles.filter(r => r.independence_level && ['project_independent', 'corporate', 'external'].includes(r.independence_level)).length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                    No Independent Quality Role
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    At least one quality role should be independent of the project team (Project Assurance, Corporate QA, or External Auditor).
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Check for mandatory methods */}
          {methods.filter(m => m.is_mandatory).length === 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-1">
                    No Mandatory Methods Defined
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    Consider defining mandatory quality methods to ensure consistent quality processes.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Check for metrics */}
          {metrics.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
                    No Quality Metrics Defined
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Define quality metrics to track and measure quality performance throughout the project.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Check for scheduled activities */}
          {activities.length === 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-1">
                    No Scheduled Activities Defined
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">
                    Schedule quality activities (audits, reviews, inspections) to ensure quality processes are executed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!qms ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Quality Management Strategy
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create a Quality Management Strategy to define how quality will be achieved in this project.
          </p>
        </div>
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
                  { id: 'metrics', label: `Metrics (${metrics.length})`, icon: BarChart3 },
                  { id: 'tools', label: `Tools (${tools.length})`, icon: Settings },
                  { id: 'records', label: `Records (${records.length})`, icon: FileText },
                  { id: 'reports', label: `Reports (${reports.length})`, icon: BarChart3 },
                  { id: 'roles', label: `Roles (${roles.length})`, icon: Users },
                  { id: 'activities', label: `Activities (${activities.length})`, icon: Calendar },
                  { id: 'conformance', label: 'Conformance', icon: CheckCircle }
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
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{qms.purpose || 'Not defined'}</p>
                  </div>

                  {/* Objectives */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Objectives</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{qms.objectives || 'Not defined'}</p>
                  </div>

                  {/* Scope */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scope</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{qms.scope || 'Not defined'}</p>
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
                        <span className="text-sm font-medium text-green-800 dark:text-green-300">Metrics</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">{metrics.length}</p>
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

              {activeTab === 'standards' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quality Standards</h3>
                  </div>
                  {standards.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No quality standards defined</p>
                  ) : (
                    <div className="space-y-3">
                      {standards.map((standard, index) => (
                        <div
                          key={standard.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">{standard.standard_code}</span>
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                  {standard.standard_type?.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  standard.compliance_level === 'mandatory' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                  standard.compliance_level === 'recommended' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                  'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                                }`}>
                                  {standard.compliance_level?.replace('_', ' ')}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{standard.standard_name}</h4>
                              {standard.standard_description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">{standard.standard_description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'methods' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quality Methods</h3>
                  </div>
                  {methods.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No quality methods defined</p>
                  ) : (
                    <div className="space-y-3">
                      {methods.map((method, index) => (
                        <div
                          key={method.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {method.is_mandatory && (
                                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                                    Mandatory
                                  </span>
                                )}
                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                                  {method.method_type?.replace('_', ' ')}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{method.method_name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{method.method_description}</p>
                              {method.when_to_use && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <strong>When to use:</strong> {method.when_to_use}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'roles' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quality Roles & Responsibilities</h3>
                  </div>
                  {roles.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No quality roles defined</p>
                  ) : (
                    <div className="space-y-3">
                      {roles.map((role, index) => (
                        <div
                          key={role.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">{role.role_name}</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  role.independence_level === 'external' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                  role.independence_level === 'corporate' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                  role.independence_level === 'project_independent' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                  'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                                }`}>
                                  {role.independence_level?.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{role.role_description}</p>
                              {role.assigned_to_user && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  <strong>Assigned to:</strong> {role.assigned_to_user.full_name || role.assigned_to_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'procedures' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quality Planning Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{qms.quality_planning_approach || 'Not defined'}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quality Control Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{qms.quality_control_approach || 'Not defined'}</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quality Assurance Approach</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{qms.quality_assurance_approach || 'Not defined'}</p>
                  </div>
                  {qms.variance_from_corporate && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Variance from Corporate Standards</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">{qms.variance_from_corporate}</p>
                      {qms.variance_justification && (
                        <>
                          <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Justification</h4>
                          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{qms.variance_justification}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'metrics' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quality Metrics</h3>
                  </div>
                  {metrics.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No quality metrics defined</p>
                  ) : (
                    <div className="space-y-3">
                      {metrics.map((metric, index) => (
                        <div
                          key={metric.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">{metric.metric_name}</span>
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                                  {metric.metric_category?.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{metric.metric_description}</p>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                {metric.target_value && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Target: </span>
                                    <span className="font-semibold text-gray-900 dark:text-white">{metric.target_value} {metric.unit_of_measure || ''}</span>
                                  </div>
                                )}
                                {metric.collection_frequency && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Frequency: </span>
                                    <span className="text-gray-900 dark:text-white">{metric.collection_frequency.replace('_', ' ')}</span>
                                  </div>
                                )}
                                {metric.responsible_role && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">Responsible: </span>
                                    <span className="text-gray-900 dark:text-white">{metric.responsible_role}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'tools' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tools & Techniques</h3>
                  </div>
                  {tools.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No tools or techniques defined</p>
                  ) : (
                    <div className="space-y-3">
                      {tools.map((tool, index) => (
                        <div
                          key={tool.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">{tool.tool_name}</span>
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                  {tool.tool_type?.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{tool.tool_description}</p>
                              {tool.tool_purpose && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <strong>Purpose:</strong> {tool.tool_purpose}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'records' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quality Records</h3>
                  </div>
                  {records.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No quality records defined</p>
                  ) : (
                    <div className="space-y-3">
                      {records.map((record, index) => (
                        <div
                          key={record.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">{record.record_name}</span>
                                {record.is_mandatory && (
                                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                                    Mandatory
                                  </span>
                                )}
                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                                  {record.record_type?.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{record.record_description}</p>
                              {record.storage_location && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <strong>Storage:</strong> {record.storage_location}
                                </p>
                              )}
                              {record.retention_period && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <strong>Retention:</strong> {record.retention_period}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quality Reports</h3>
                  </div>
                  {reports.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No quality reports defined</p>
                  ) : (
                    <div className="space-y-3">
                      {reports.map((report, index) => (
                        <div
                          key={report.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">{report.report_name}</span>
                                <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-xs">
                                  {report.report_type?.replace('_', ' ')}
                                </span>
                                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                  {report.frequency?.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{report.report_description}</p>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Recipients: </span>
                                  <span className="text-gray-900 dark:text-white">{report.recipients}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 dark:text-gray-400">Responsible: </span>
                                  <span className="text-gray-900 dark:text-white">{report.responsible_role}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activities' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scheduled Activities</h3>
                  </div>
                  {activities.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No scheduled activities defined</p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity, index) => (
                        <div
                          key={activity.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">{activity.activity_name}</span>
                                <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                                  {activity.activity_type?.replace('_', ' ')}
                                </span>
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                                  {activity.timing?.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{activity.activity_description}</p>
                              {activity.specific_timing && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <strong>Timing:</strong> {activity.specific_timing}
                                </p>
                              )}
                              {activity.participants && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <strong>Participants:</strong> {activity.participants}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'conformance' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Conformance Status</h3>
                  </div>
                  {conformance.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No conformance checks available</p>
                  ) : (
                    <div className="space-y-3">
                      {conformance.map((item, index) => (
                        <div
                          key={index}
                          className={`rounded-lg p-4 border ${
                            item.conformance_status === 'Conforms' || item.conformance_status === 'Referenced' || item.conformance_status === 'Defined'
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : item.conformance_status === 'Variance'
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold text-gray-900 dark:text-white">{item.standard_name}</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  item.conformance_status === 'Conforms' || item.conformance_status === 'Referenced' || item.conformance_status === 'Defined'
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                    : item.conformance_status === 'Variance'
                                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                    : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                                }`}>
                                  {item.conformance_status}
                                </span>
                              </div>
                              {item.gaps && item.gaps.length > 0 && (
                                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {item.gaps.map((gap, gapIndex) => (
                                    <li key={gapIndex}>{gap}</li>
                                  ))}
                                </ul>
                              )}
                              {item.recommendations && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  <strong>Recommendations:</strong> {item.recommendations}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* QMS Form Modal */}
      {showQMSForm && (
        <QMSForm
          qms={qms}
          projectId={projectId}
          onSave={() => {
            setShowQMSForm(false)
            fetchData()
          }}
          onCancel={() => setShowQMSForm(false)}
        />
      )}
    </div>
  )
}
