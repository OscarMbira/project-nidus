import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { format } from 'date-fns'
import { ArrowLeft, Edit2, AlertTriangle, TrendingUp, User, Calendar, CheckCircle, Clock } from 'lucide-react'
import MitigationPlan from '../components/MitigationPlan'

export default function RiskDetail() {
  const { projectId, riskId } = useParams()
  const navigate = useNavigate()
  const [risk, setRisk] = useState(null)
  const [mitigations, setMitigations] = useState([])
  const [assessments, setAssessments] = useState([])
  const [monitoring, setMonitoring] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'mitigation', 'assessment', 'monitoring'

  useEffect(() => {
    if (riskId) {
      fetchData()
    }
  }, [riskId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch risk
      const { data: riskData, error: riskError } = await supabase
        .from('risks')
        .select(`
          *,
          identified_by:identified_by_user_id (id, email, full_name),
          risk_owner:risk_owner_user_id (id, email, full_name)
        `)
        .eq('id', riskId)
        .eq('is_deleted', false)
        .single()

      if (riskError) throw riskError
      setRisk(riskData)

      // Fetch mitigations
      const { data: mitigationsData, error: mitigationsError } = await supabase
        .from('risk_mitigations')
        .select(`
          *,
          assigned_to:assigned_to_user_id (id, email, full_name)
        `)
        .eq('risk_id', riskId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (!mitigationsError) {
        setMitigations(mitigationsData || [])
      }

      // Fetch assessments
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('risk_assessments')
        .select(`
          *,
          assessed_by:assessed_by_user_id (id, email, full_name)
        `)
        .eq('risk_id', riskId)
        .eq('is_deleted', false)
        .order('assessment_date', { ascending: false })

      if (!assessmentsError) {
        setAssessments(assessmentsData || [])
      }

      // Fetch monitoring
      const { data: monitoringData, error: monitoringError } = await supabase
        .from('risk_monitoring')
        .select(`
          *,
          monitored_by:monitored_by_user_id (id, email, full_name)
        `)
        .eq('risk_id', riskId)
        .eq('is_deleted', false)
        .order('monitoring_date', { ascending: false })
        .limit(10)

      if (!monitoringError) {
        setMonitoring(monitoringData || [])
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
              {risk.risk_code && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-sm font-mono">
                  {risk.risk_code}
                </span>
              )}
              <span className={`px-3 py-1 rounded text-sm font-medium ${getRiskLevelColor(risk.risk_level)}`}>
                {risk.risk_level.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              {risk.risk_type === 'opportunity' ? 'Opportunity' : 'Threat'} • {risk.risk_category || 'Uncategorized'}
            </p>
          </div>
          <button
            onClick={() => navigate(`/projects/${projectId}/risks?edit=${riskId}`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Risk
          </button>
        </div>
      </div>

      {/* Risk Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Probability</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{risk.probability}/5</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Impact</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{risk.impact}/5</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Risk Score</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{risk.risk_score}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
            {risk.status.replace('_', ' ')}
          </p>
        </div>
      </div>

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
            onClick={() => setActiveTab('mitigation')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'mitigation'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Mitigation ({mitigations.length})
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
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'monitoring'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Monitoring ({monitoring.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Risk Details</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{risk.risk_description}</p>
              </div>
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
                  <span className="text-gray-600 dark:text-gray-400">Identified By:</span>
                  <span className="text-gray-900 dark:text-white">
                    {risk.identified_by?.full_name || risk.identified_by?.email || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Risk Owner:</span>
                  <span className="text-gray-900 dark:text-white">
                    {risk.risk_owner?.full_name || risk.risk_owner?.email || 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Identified Date:</span>
                  <span className="text-gray-900 dark:text-white">
                    {risk.identified_date ? format(new Date(risk.identified_date), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                </div>
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

      {activeTab === 'mitigation' && (
        <MitigationPlan riskId={riskId} projectId={projectId} onUpdate={fetchData} />
      )}

      {activeTab === 'assessment' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Assessment History</h2>
          {assessments.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No assessments recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(assessment.assessment_date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {assessment.assessed_by?.full_name || assessment.assessed_by?.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        P: {assessment.probability} × I: {assessment.impact} = {assessment.risk_score}
                      </p>
                      {assessment.trend && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          Trend: {assessment.trend}
                        </p>
                      )}
                    </div>
                  </div>
                  {assessment.assessment_notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{assessment.assessment_notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Monitoring Records</h2>
          {monitoring.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No monitoring records yet.</p>
          ) : (
            <div className="space-y-4">
              {monitoring.map((record) => (
                <div key={record.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(record.monitoring_date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {record.monitored_by?.full_name || record.monitored_by?.email}
                      </p>
                    </div>
                    {record.current_risk_score && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Score: {record.current_risk_score}
                      </p>
                    )}
                  </div>
                  {record.monitoring_notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{record.monitoring_notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

