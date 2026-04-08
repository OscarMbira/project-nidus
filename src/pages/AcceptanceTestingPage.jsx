import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { CheckCircle, XCircle, Clock, AlertCircle, Target, FileText, Download } from 'lucide-react'
import { getPPDByProject, getOrCreatePPD } from '../services/projectProductDescriptionService'
import { getCriteria, recordAcceptance, getAcceptanceStatus } from '../services/ppdAcceptanceCriteriaService'
import { format } from 'date-fns'
import { exportAcceptanceReportToCSV } from '../utils/ppdExport'

export default function AcceptanceTestingPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [ppd, setPpd] = useState(null)
  const [criteria, setCriteria] = useState([])
  const [acceptanceStatus, setAcceptanceStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'passed', 'failed', 'must_have'

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId, filter])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const ppdData = await getOrCreatePPD(projectId)
      setPpd(ppdData)

      if (ppdData) {
        const [criteriaData, statusData] = await Promise.all([
          getCriteria(ppdData.id),
          getAcceptanceStatus(projectId)
        ])

        // Apply filter
        let filtered = criteriaData || []
        if (filter === 'pending') {
          filtered = filtered.filter(c => c.acceptance_status === 'pending')
        } else if (filter === 'passed') {
          filtered = filtered.filter(c => c.acceptance_status === 'passed')
        } else if (filter === 'failed') {
          filtered = filtered.filter(c => c.acceptance_status === 'failed')
        } else if (filter === 'must_have') {
          filtered = filtered.filter(c => c.priority === 'must_have')
        }

        setCriteria(filtered)
        setAcceptanceStatus(statusData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRecordAcceptance = async (criteriaId, status) => {
    try {
      const notes = prompt(`Enter notes for ${status} status:`)
      await recordAcceptance(criteriaId, status, notes || null)
      fetchData()
    } catch (error) {
      console.error('Error recording acceptance:', error)
      alert('Error: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Acceptance Testing...</p>
        </div>
      </div>
    )
  }

  if (!ppd) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Target className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Project Product Description
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Please create a Project Product Description first.
          </p>
          <button
            onClick={() => navigate(`/projects/${projectId}/ppd`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to PPD
          </button>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'waived':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'deferred':
        return <Clock className="h-5 w-5 text-blue-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'waived':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'deferred':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Acceptance Testing
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {ppd.product_title} - {ppd.ppd_reference}
        </p>
      </div>

      {/* Acceptance Status Summary */}
      {acceptanceStatus && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Acceptance Progress</h2>
            <div className="flex items-center gap-2">
              <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${acceptanceStatus.acceptance_percentage || 0}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {acceptanceStatus.acceptance_percentage?.toFixed(1) || 0}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Criteria</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{acceptanceStatus.total_criteria || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Passed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{acceptanceStatus.passed_criteria || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{acceptanceStatus.failed_criteria || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{acceptanceStatus.pending_criteria || 0}</p>
            </div>
          </div>
          {acceptanceStatus.can_close_project && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-300">
                ✅ All acceptance criteria met. Project can be closed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filters and Export */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({criteria.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('must_have')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'must_have'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Must Have
          </button>
          <button
            onClick={() => setFilter('passed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'passed'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Passed
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'failed'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Failed
          </button>
          </div>
        </div>
      </div>

      {/* Criteria List */}
      {criteria.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Target className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Acceptance Criteria
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Add acceptance criteria to the Project Product Description first.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {criteria.map((criterion) => (
            <div
              key={criterion.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(criterion.acceptance_status || 'pending')}
                    <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                      {criterion.criteria_reference}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(criterion.acceptance_status || 'pending')}`}>
                      {(criterion.acceptance_status || 'pending').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      criterion.priority === 'must_have' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                      criterion.priority === 'should_have' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                    }`}>
                      {criterion.priority?.replace('_', ' ')}
                    </span>
                    {criterion.is_measurable && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                        Measurable
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {criterion.criteria_title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    {criterion.criteria_description}
                  </p>
                  {criterion.measurement_method && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mb-3">
                      <p className="text-sm text-purple-800 dark:text-purple-300">
                        <strong>Measurement:</strong> {criterion.measurement_method}
                      </p>
                      {criterion.target_value && (
                        <p className="text-sm text-purple-800 dark:text-purple-300 mt-1">
                          <strong>Target:</strong> {criterion.target_value} {criterion.unit_of_measure || ''}
                        </p>
                      )}
                    </div>
                  )}
                  {criterion.acceptance_notes && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Notes:</strong> {criterion.acceptance_notes}
                      </p>
                      {criterion.acceptance_date && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(new Date(criterion.acceptance_date), 'MMM dd, yyyy')} - {criterion.accepted_by_user?.full_name || 'Unknown'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleRecordAcceptance(criterion.id, 'passed')}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Pass
                  </button>
                  <button
                    onClick={() => handleRecordAcceptance(criterion.id, 'failed')}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Fail
                  </button>
                  <button
                    onClick={() => handleRecordAcceptance(criterion.id, 'waived')}
                    className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Waive
                  </button>
                  <button
                    onClick={() => handleRecordAcceptance(criterion.id, 'deferred')}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Defer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
