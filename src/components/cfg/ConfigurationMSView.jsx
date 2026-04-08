/**
 * Configuration Management Strategy View Component
 * Read-only view of Configuration Management Strategy with tabs for all sections
 */

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Edit2, 
  CheckCircle, 
  Clock, 
  Package,
  Hash,
  GitBranch,
  BarChart3,
  Layers,
  Shield,
  Settings,
  Wrench,
  FolderArchive,
  Calendar,
  Users,
  AlertCircle
} from 'lucide-react'
import { 
  getConfigurationMSById, 
  validateCompleteness, 
  checkConformance 
} from '../../services/configurationManagementStrategyService'
import { getItemTypes } from '../../services/cfgItemTypesService'
import { getIdentificationMethods } from '../../services/cfgIdentificationMethodsService'
import { getVersionProcedures } from '../../services/cfgVersionControlService'
import { getStatusDefinitions } from '../../services/cfgStatusDefinitionsService'
import { getBaselineProcedures } from '../../services/cfgBaselineProceduresService'
import { getAuditProcedures } from '../../services/cfgAuditProceduresService'
import { getTools } from '../../services/cfgToolsTechnologiesService'
import { getRecordRequirements } from '../../services/cfgRecordsRequirementsService'
import { getReports } from '../../services/cfgReportsService'
import { getActivities } from '../../services/cfgScheduledActivitiesService'
import { getRoles } from '../../services/cfgRolesResponsibilitiesService'

export default function ConfigurationMSView({ cfgMsId, onEdit, readOnly = true }) {
  const [cfgMs, setCfgMs] = useState(null)
  const [itemTypes, setItemTypes] = useState([])
  const [identificationMethods, setIdentificationMethods] = useState([])
  const [versionProcedures, setVersionProcedures] = useState([])
  const [statusDefinitions, setStatusDefinitions] = useState([])
  const [baselineProcedures, setBaselineProcedures] = useState([])
  const [auditProcedures, setAuditProcedures] = useState([])
  const [tools, setTools] = useState([])
  const [records, setRecords] = useState([])
  const [reports, setReports] = useState([])
  const [activities, setActivities] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [completeness, setCompleteness] = useState(null)
  const [conformance, setConformance] = useState(null)

  useEffect(() => {
    if (cfgMsId) {
      fetchData()
    }
  }, [cfgMsId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [cfgMsData, itemTypesData, idMethodsData, versionData, statusData, baselineData, auditData, toolsData, recordsData, reportsData, activitiesData, rolesData, completenessData, conformanceData] = await Promise.all([
        getConfigurationMSById(cfgMsId),
        getItemTypes(cfgMsId),
        getIdentificationMethods(cfgMsId),
        getVersionProcedures(cfgMsId),
        getStatusDefinitions(cfgMsId),
        getBaselineProcedures(cfgMsId),
        getAuditProcedures(cfgMsId),
        getTools(cfgMsId),
        getRecordRequirements(cfgMsId),
        getReports(cfgMsId),
        getActivities(cfgMsId),
        getRoles(cfgMsId),
        validateCompleteness(cfgMsId),
        checkConformance(cfgMsId)
      ])

      setCfgMs(cfgMsData)
      setItemTypes(itemTypesData || [])
      setIdentificationMethods(idMethodsData || [])
      setVersionProcedures(versionData || [])
      setStatusDefinitions(statusData || [])
      setBaselineProcedures(baselineData || [])
      setAuditProcedures(auditData || [])
      setTools(toolsData || [])
      setRecords(recordsData || [])
      setReports(reportsData || [])
      setActivities(activitiesData || [])
      setRoles(rolesData || [])
      setCompleteness(completenessData || [])
      setConformance(conformanceData || {})
    } catch (error) {
      console.error('Error fetching Configuration MS data:', error)
      alert('Error loading Configuration MS: ' + error.message)
    } finally {
      setLoading(false)
    }
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'introduction', label: 'Introduction', icon: FileText },
    { id: 'procedures', label: 'Procedures', icon: Settings },
    { id: 'item-types', label: 'Item Types', icon: Package },
    { id: 'identification', label: 'Identification', icon: Hash },
    { id: 'version-control', label: 'Version Control', icon: GitBranch },
    { id: 'status', label: 'Status', icon: BarChart3 },
    { id: 'baselines', label: 'Baselines', icon: Layers },
    { id: 'audits', label: 'Audits', icon: Shield },
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'records', label: 'Records', icon: FolderArchive },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'activities', label: 'Activities', icon: Calendar },
    { id: 'roles', label: 'Roles', icon: Users },
    { id: 'conformance', label: 'Conformance', icon: CheckCircle }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Configuration Management Strategy...</p>
        </div>
      </div>
    )
  }

  if (!cfgMs) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Configuration Management Strategy not found</p>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mt-2 ${getStatusColor(cfgMs.status)}`}>
                  {cfgMs.status.replace('_', ' ')}
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Reference</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{cfgMs.cms_reference}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Version</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{cfgMs.version_number || '1.0'}</p>
              </div>
            </div>

            {cfgMs.project && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project</h3>
                <p className="text-gray-900 dark:text-white">{cfgMs.project.project_name}</p>
                {cfgMs.project.project_code && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Code: {cfgMs.project.project_code}</p>
                )}
              </div>
            )}

            {completeness && completeness.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Completeness</h3>
                <div className="space-y-2">
                  {completeness.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.section_name}</span>
                      {item.is_complete ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'introduction':
        return (
          <div className="space-y-6">
            {cfgMs.purpose && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Purpose</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cfgMs.purpose}</p>
              </div>
            )}
            {cfgMs.objectives && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Objectives</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cfgMs.objectives}</p>
              </div>
            )}
            {cfgMs.scope && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scope</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cfgMs.scope}</p>
              </div>
            )}
          </div>
        )

      case 'procedures':
        return (
          <div className="space-y-6">
            {cfgMs.configuration_planning_approach && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Configuration Planning Approach</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cfgMs.configuration_planning_approach}</p>
              </div>
            )}
            {cfgMs.configuration_control_approach && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Configuration Control Approach</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cfgMs.configuration_control_approach}</p>
              </div>
            )}
            {cfgMs.configuration_assurance_approach && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Configuration Assurance Approach</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cfgMs.configuration_assurance_approach}</p>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              {tabs.find(t => t.id === activeTab)?.label} section details will be displayed here.
              <br />
              This section contains {activeTab === 'item-types' ? itemTypes.length : 
                                     activeTab === 'identification' ? identificationMethods.length :
                                     activeTab === 'status' ? statusDefinitions.length :
                                     activeTab === 'baselines' ? baselineProcedures.length :
                                     activeTab === 'audits' ? auditProcedures.length :
                                     activeTab === 'tools' ? tools.length :
                                     activeTab === 'records' ? records.length :
                                     activeTab === 'reports' ? reports.length :
                                     activeTab === 'activities' ? activities.length :
                                     activeTab === 'roles' ? roles.length : 0} items.
            </p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Configuration Management Strategy
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {cfgMs.cms_reference} • Version {cfgMs.version_number || '1.0'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(cfgMs.status)}`}>
              {cfgMs.status.replace('_', ' ')}
            </span>
            {!readOnly && cfgMs.status === 'draft' && onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 overflow-x-auto px-4">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
