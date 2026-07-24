/**
 * CMS View Component
 * Read-only view of Communication Management Strategy with tabs for all sections
 */

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Edit2, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  Users, 
  Settings, 
  Calendar,
  BarChart3,
  Shield,
  Megaphone,
  AlertCircle
} from 'lucide-react'
import { getCMSById, validateCompleteness, checkConformance } from '../../services/communicationManagementStrategyService'
import { getChannels, getPreferredChannels } from '../../services/cmsCommunicationChannelsService'
import { getMethods, getMandatoryMethods } from '../../services/cmsCommunicationMethodsService'
import { getAudienceGroups } from '../../services/cmsAudienceGroupsService'
import { getStandards } from '../../services/cmsCommunicationStandardsService'
import { getTools } from '../../services/cmsToolsTechnologiesService'
import { getRecords, getMandatoryRecords } from '../../services/cmsCommunicationRecordsService'
import { getReports } from '../../services/cmsReportsService'
import { getActivities } from '../../services/cmsScheduledActivitiesService'
import { getRoles } from '../../services/cmsRolesResponsibilitiesService'

export default function CMSView({ cmsId, onEdit, readOnly = true }) {
  const [cms, setCms] = useState(null)
  const [channels, setChannels] = useState([])
  const [methods, setMethods] = useState([])
  const [audienceGroups, setAudienceGroups] = useState([])
  const [standards, setStandards] = useState([])
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
    if (cmsId) {
      fetchData()
    }
  }, [cmsId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [cmsData, channelsData, methodsData, audienceData, standardsData, toolsData, recordsData, reportsData, activitiesData, rolesData, completenessData, conformanceData] = await Promise.all([
        getCMSById(cmsId),
        getChannels(cmsId),
        getMethods(cmsId),
        getAudienceGroups(cmsId),
        getStandards(cmsId),
        getTools(cmsId),
        getRecords(cmsId),
        getReports(cmsId),
        getActivities(cmsId),
        getRoles(cmsId),
        validateCompleteness(cmsId),
        checkConformance(cmsId)
      ])

      setCms(cmsData)
      setChannels(channelsData || [])
      setMethods(methodsData || [])
      setAudienceGroups(audienceData || [])
      setStandards(standardsData || [])
      setTools(toolsData || [])
      setRecords(recordsData || [])
      setReports(reportsData || [])
      setActivities(activitiesData || [])
      setRoles(rolesData || [])
      setCompleteness(completenessData || [])
      setConformance(conformanceData || [])
    } catch (error) {
      console.error('Error fetching CMS data:', error)
      alert('Error loading CMS: ' + error.message)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Communication Management Strategy...</p>
        </div>
      </div>
    )
  }

  if (!cms) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Communication Management Strategy not found
        </h3>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'introduction', label: 'Introduction', icon: FileText },
    { id: 'procedures', label: 'Procedures', icon: Settings },
    { id: 'channels', label: `Channels (${channels.length})`, icon: Megaphone },
    { id: 'methods', label: `Methods (${methods.length})`, icon: MessageSquare },
    { id: 'audiences', label: `Audiences (${audienceGroups.length})`, icon: Users },
    { id: 'standards', label: `Standards (${standards.length})`, icon: Shield },
    { id: 'tools', label: `Tools (${tools.length})`, icon: Settings },
    { id: 'records', label: `Records (${records.length})`, icon: FileText },
    { id: 'reports', label: `Reports (${reports.length})`, icon: BarChart3 },
    { id: 'activities', label: `Activities (${activities.length})`, icon: Calendar },
    { id: 'roles', label: `Roles (${roles.length})`, icon: Users },
    { id: 'conformance', label: 'Conformance', icon: CheckCircle }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Status</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {cms.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">Channels</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{channels.length}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <p className="text-sm text-green-600 dark:text-green-400 mb-1">Methods</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{methods.length}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Audience Groups</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{audienceGroups.length}</p>
              </div>
            </div>

            {/* Completeness Check */}
            {completeness && completeness.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Completeness Check</h3>
                <div className="space-y-3">
                  {completeness.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.section_name}</span>
                      {item.is_complete ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">Incomplete</span>
                        </div>
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
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Purpose</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cms.purpose || 'Not specified'}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Objectives</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cms.objectives || 'Not specified'}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scope</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cms.scope || 'Not specified'}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Responsibility</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cms.strategy_responsibility || 'Not specified'}</p>
            </div>
          </div>
        )

      case 'procedures':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Communication Planning Approach</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cms.communication_planning_approach || 'Not specified'}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Communication Control Approach</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cms.communication_control_approach || 'Not specified'}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Communication Assurance Approach</h3>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cms.communication_assurance_approach || 'Not specified'}</p>
            </div>
            {cms.variance_from_corporate && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Variance from Corporate Standards</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cms.variance_from_corporate}</p>
                {cms.variance_justification && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Justification</h4>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{cms.variance_justification}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'channels':
        return (
          <div className="space-y-4">
            {channels.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No communication channels defined.</p>
            ) : (
              channels.map((channel, index) => (
                <div key={channel.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{channel.channel_name}</h4>
                        {channel.is_preferred && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">Preferred</span>
                        )}
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {channel.channel_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{channel.channel_description}</p>
                      {channel.applicability && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Applicability:</strong> {channel.applicability}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )

      case 'methods':
        return (
          <div className="space-y-4">
            {methods.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No communication methods defined.</p>
            ) : (
              methods.map((method, index) => (
                <div key={method.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{method.method_name}</h4>
                        {method.is_mandatory && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">Mandatory</span>
                        )}
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {method.method_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{method.method_description}</p>
                      {method.when_to_use && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>When to use:</strong> {method.when_to_use}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )

      case 'audiences':
        return (
          <div className="space-y-4">
            {audienceGroups.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No audience groups defined.</p>
            ) : (
              audienceGroups.map((group, index) => (
                <div key={group.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{group.group_name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{group.group_description}</p>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                      {group.group_type}
                    </span>
                    {group.frequency_preference && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                        {group.frequency_preference}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">
                      {group.confidentiality_level}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )

      case 'standards':
        return (
          <div className="space-y-4">
            {standards.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No communication standards defined.</p>
            ) : (
              standards.map((standard, index) => (
                <div key={standard.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{standard.standard_name}</h4>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {standard.standard_type}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">
                          {standard.compliance_level}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{standard.standard_description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )

      case 'tools':
        return (
          <div className="space-y-4">
            {tools.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No tools and technologies defined.</p>
            ) : (
              tools.map((tool, index) => (
                <div key={tool.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{tool.tool_name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{tool.tool_description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                      {tool.tool_type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )

      case 'records':
        return (
          <div className="space-y-4">
            {records.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No communication records defined.</p>
            ) : (
              records.map((record, index) => (
                <div key={record.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{record.record_name}</h4>
                        {record.is_mandatory && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">Mandatory</span>
                        )}
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {record.record_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{record.record_description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )

      case 'reports':
        return (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No communication reports defined.</p>
            ) : (
              reports.map((report, index) => (
                <div key={report.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{report.report_name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{report.report_description}</p>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                      {report.report_type}
                    </span>
                    {report.frequency && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                        {report.frequency}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )

      case 'activities':
        return (
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No scheduled activities defined.</p>
            ) : (
              activities.map((activity, index) => (
                <div key={activity.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{activity.activity_name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{activity.activity_description}</p>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                      {activity.activity_type}
                    </span>
                    {activity.timing && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                        {activity.timing}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )

      case 'roles':
        return (
          <div className="space-y-4">
            {roles.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No communication roles defined.</p>
            ) : (
              roles.map((role, index) => (
                <div key={role.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{role.role_name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{role.role_description}</p>
                  {role.assigned_to && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Assigned to:</strong> {role.assigned_to.full_name || role.assigned_to_name}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )

      case 'conformance':
        return (
          <div className="space-y-4">
            {conformance.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No conformance checks available.</p>
            ) : (
              conformance.map((item, index) => (
                <div key={index} className={`rounded-lg p-4 ${
                  item.conformance_status === 'conformant' 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{item.requirement_name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.conformance_status === 'conformant'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
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
              ))
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {cms.cms_reference || 'Communication Management Strategy'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Version {cms.version_number || '1.0'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(cms.status)}`}>
              {cms.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
            </span>
            {!readOnly && cms.status === 'draft' && onEdit && (
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
          <nav className="flex -mb-px overflow-x-auto">
            {tabs.map((tab) => {
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
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}
