import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { platformDb } from '../services/supabase/supabaseClient'
import { format } from 'date-fns'
import { ArrowLeft, Edit2, AlertTriangle, TrendingUp, User, Calendar, CheckCircle, Clock, MessageSquare, Paperclip, Link as LinkIcon, X, Link2 } from 'lucide-react'
import { getRiskById } from '../services/riskService'
import { getAssessmentHistory } from '../services/riskAssessmentService'
import RiskResponsesPanel from '../components/risks/RiskResponsesPanel'
import EnhancedRiskForm from '../components/risks/EnhancedRiskForm'
import PrePostAssessmentPanel from '../components/risks/PrePostAssessmentPanel'
import RiskAssessmentHistory from '../components/risks/RiskAssessmentHistory'
import RiskCommentsSection from '../components/risks/RiskCommentsSection'
import RiskAttachments from '../components/risks/RiskAttachments'
import RiskLinksPanel from '../components/risks/RiskLinksPanel'
import RiskReviewHistory from '../components/risks/RiskReviewHistory'
import EscalateToIssueDialog from '../components/risks/EscalateToIssueDialog'
import RiskScoreBadge from '../components/risks/RiskScoreBadge'
import RiskTypeBadge from '../components/risks/RiskTypeBadge'
import RiskStatusBadge from '../components/risks/RiskStatusBadge'
import ProximityBadge from '../components/risks/ProximityBadge'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const RISK_EXPORT_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'risk_identifier', label: 'Identifier' },
    { key: 'risk_title', label: 'Title' },
    { key: 'risk_type', label: 'Type' },
    { key: 'risk_category', label: 'Category' },
    { key: 'status_enum', label: 'Status' },
    { key: 'risk_level', label: 'Level' },
    { key: 'proximity', label: 'Proximity' }
  ]},
  { title: 'Description', fields: [{ key: 'risk_description', label: 'Description' }] },
  { title: 'Response', fields: [
    { key: 'response_category', label: 'Response Category' },
    { key: 'response_description', label: 'Response Description' }
  ]}
]

export default function RiskDetail() {
  const { riskId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [risk, setRisk] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showEditForm, setShowEditForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (riskId) {
      fetchData()
    }
  }, [riskId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch risk using service
      const riskResult = await getRiskById(riskId)
      if (riskResult.success) {
        setRisk(riskResult.data)
        
        // Fetch assessment history
        const assessmentResult = await getAssessmentHistory(riskId)
        if (assessmentResult.success) {
          setAssessments(assessmentResult.data || [])
        }
      } else {
        throw new Error(riskResult.error || 'Failed to load risk')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (riskId) {
      fetchData()
    }
  }, [riskId, refreshKey])

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Risk Details...</p>
        </div>
      </div>
    )
  }

  if (!risk) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Risk not found</p>
          <button
            onClick={() => navigate(`/projects/${projectId}/risks`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Risks
          </button>
        </div>
      </div>
    )
  }

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}/risks`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Risks
      </button>

      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {risk.risk_type === 'opportunity' ? (
                <TrendingUp className="h-6 w-6 text-green-500" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-500" />
              )}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {risk.risk_title}
              </h1>
              {risk.risk_identifier && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-sm font-mono">
                  {risk.risk_identifier}
                </span>
              )}
              <RiskTypeBadge riskType={risk.risk_type} />
              <RiskScoreBadge score={risk.pre_risk_score || risk.risk_level} expectedValue={risk.pre_expected_value} />
              <RiskStatusBadge status={risk.status_enum || risk.status} />
              {risk.proximity && (
                <ProximityBadge proximity={risk.proximity} proximityDate={risk.proximity_date} />
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {risk.risk_category ? risk.risk_category.replace('_', ' ').toUpperCase() : 'Uncategorized'}
              {risk.response_category && ` • Response: ${risk.response_category.replace('_', ' ')}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(RISK_EXPORT_SECTIONS, risk, `Risk_${risk.risk_identifier || risk.id}`)}
              onExportWord={() => exportRecordToWord(RISK_EXPORT_SECTIONS, risk, `Risk_${risk.risk_identifier || risk.id}`)}
              onExportExcel={() => exportRecordToExcel(RISK_EXPORT_SECTIONS, risk, `Risk_${risk.risk_identifier || risk.id}`)}
              onExportCSV={() => exportRecordToCSV(RISK_EXPORT_SECTIONS, risk, `Risk_${risk.risk_identifier || risk.id}`)}
              onExportXML={() => exportRecordToXML(RISK_EXPORT_SECTIONS, risk, `Risk_${risk.risk_identifier || risk.id}`)}
              onExportJSON={() => exportRecordToJSON(RISK_EXPORT_SECTIONS, risk, `Risk_${risk.risk_identifier || risk.id}`)}
              onExportPrint={() => exportRecordToPrint(RISK_EXPORT_SECTIONS, risk, `Risk_${risk.risk_identifier || risk.id}`)}
            />
            {risk.status_enum !== 'closed' && risk.status_enum !== 'occurred' && (
              <button
                onClick={() => setShowEscalateDialog(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Escalate to Issue
              </button>
            )}
            <button
              onClick={() => setShowEditForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit Risk
            </button>
          </div>
        </div>
      </div>

      {/* Pre-Post Assessment Panel */}
      {risk && (
        <div className="mb-6">
          <PrePostAssessmentPanel risk={risk} />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('responses')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'responses'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Response Actions
          </button>
          <button
            onClick={() => setActiveTab('assessment')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assessment'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Assessment History ({assessments.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Risk Details</h2>
            <div className="space-y-4">
              {/* Cause-Event-Effect Structure */}
              {risk.cause_description && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">CAUSE: Because of...</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{risk.cause_description}</p>
                </div>
              )}
              {risk.event_description && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">EVENT: There is a risk that...</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{risk.event_description}</p>
                </div>
              )}
              {risk.effect_description && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">EFFECT: Which would result in...</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{risk.effect_description}</p>
                </div>
              )}
              {/* Fallback to old description if new structure not available */}
              {!risk.cause_description && !risk.event_description && !risk.effect_description && risk.risk_description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{risk.risk_description}</p>
                </div>
              )}
              {risk.impact_description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Impact Description</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{risk.impact_description}</p>
                </div>
              )}
              {risk.potential_consequences && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Potential Consequences</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{risk.potential_consequences}</p>
                </div>
              )}
              {risk.response_strategy && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Response Strategy</h3>
                  <p className="text-gray-600 dark:text-gray-400 capitalize">{risk.response_strategy}</p>
                  {risk.response_strategy_description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">{risk.response_strategy_description}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Risk Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Author:</span>
                  <span className="text-gray-900 dark:text-white">
                    {risk.risk_author?.full_name || risk.risk_author_name || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Risk Owner:</span>
                  <span className="text-gray-900 dark:text-white">
                    {risk.risk_owner?.full_name || risk.risk_owner?.email || 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Date Registered:</span>
                  <span className="text-gray-900 dark:text-white">
                    {risk.date_registered ? format(new Date(risk.date_registered), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                </div>
                {risk.risk_actionee && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Actionee:</span>
                    <span className="text-gray-900 dark:text-white">
                      {risk.risk_actionee?.full_name || risk.risk_actionee_name || 'Unassigned'}
                    </span>
                  </div>
                )}
                {risk.target_mitigation_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Target Mitigation Date:</span>
                    <span className="text-gray-900 dark:text-white">
                      {format(new Date(risk.target_mitigation_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
                {risk.next_review_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Next Review Date:</span>
                    <span className="text-gray-900 dark:text-white">
                      {format(new Date(risk.next_review_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {risk.affected_areas && risk.affected_areas.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Affected Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {risk.affected_areas.map((area, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'responses' && riskId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <RiskResponsesPanel riskId={riskId} onUpdate={handleUpdate} />
        </div>
      )}

      {activeTab === 'assessment' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <RiskAssessmentHistory assessments={assessments} />
        </div>
      )}

      {activeTab === 'comments' && riskId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <RiskCommentsSection riskId={riskId} />
        </div>
      )}

      {activeTab === 'links' && riskId && risk && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <RiskLinksPanel riskId={riskId} projectId={projectId} />
        </div>
      )}

      {/* Additional Sections in Overview */}
      {activeTab === 'overview' && riskId && (
        <div className="space-y-6 mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <RiskAttachments riskId={riskId} />
          </div>
        </div>
      )}

      {showEditForm && risk && (
        <EnhancedRiskForm
          risk={risk}
          projectId={projectId}
          riskRegisterId={risk.risk_register_id}
          onSave={() => {
            setShowEditForm(false)
            handleUpdate()
          }}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showEscalateDialog && risk && (
        <EscalateToIssueDialog
          risk={risk}
          onClose={() => setShowEscalateDialog(false)}
          onSuccess={() => {
            setShowEscalateDialog(false)
            handleUpdate()
          }}
        />
      )}
    </div>
  )
}

