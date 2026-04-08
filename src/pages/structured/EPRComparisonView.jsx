import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getEndProjectReportById, getBusinessCaseForReview, calculateBenefitsVariance } from '../../services/endProjectReportService'
import { getBenefitsComparison } from '../../services/eprBusinessCaseReviewService'
// Format currency helper
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export default function EPRComparisonView() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [businessCase, setBusinessCase] = useState(null)
  const [benefitsComparison, setBenefitsComparison] = useState([])
  const [variance, setVariance] = useState(null)

  useEffect(() => {
    if (reportId && projectId) {
      loadComparisonData()
    }
  }, [reportId, projectId])

  const loadComparisonData = async () => {
    try {
      setLoading(true)
      const [reportData, businessCaseData, benefitsData, varianceData] = await Promise.all([
        getEndProjectReportById(reportId).catch(() => null),
        getBusinessCaseForReview(projectId).catch(() => null),
        getBenefitsComparison(reportId).catch(() => []),
        calculateBenefitsVariance(reportId).catch(() => null)
      ])

      setReport(reportData)
      setBusinessCase(businessCaseData)
      setBenefitsComparison(benefitsData || [])
      setVariance(varianceData)
    } catch (error) {
      console.error('Error loading comparison data:', error)
      alert('Error loading comparison: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate(`/app/projects/${projectId}/closure/end-project-report/${reportId}`)
  }

  const getVarianceIcon = (varianceValue) => {
    if (!varianceValue) return <Minus className="h-4 w-4 text-gray-400" />
    if (varianceValue > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (varianceValue < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getVarianceColor = (varianceValue) => {
    if (!varianceValue) return 'text-gray-600'
    if (varianceValue > 0) return 'text-green-600'
    if (varianceValue < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Business Case Comparison
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Compare End Project Report benefits against Business Case
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Variance */}
        {variance && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Overall Benefits Variance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Expected</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(variance.total_expected)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Achieved</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(variance.total_achieved)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Residual</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(variance.total_residual)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Variance</p>
                <div className="flex items-center gap-2">
                  {getVarianceIcon(variance.variance)}
                  <p className={`text-2xl font-bold ${getVarianceColor(variance.variance)}`}>
                    {formatCurrency(variance.variance)}
                  </p>
                </div>
                {variance.variance_percentage && (
                  <p className={`text-sm ${getVarianceColor(variance.variance)}`}>
                    ({variance.variance_percentage.toFixed(1)}%)
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Business Case Info */}
        {businessCase && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Business Case Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Business Case ID</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {businessCase.business_case_id || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Expected Benefits</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(businessCase.total_expected_benefits)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Comparison Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Benefits Comparison</h2>
          {benefitsComparison.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Benefit Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Target Value</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Actual Value</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Variance</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Variance %</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {benefitsComparison.map((benefit) => (
                    <tr key={benefit.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{benefit.benefit_description}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 capitalize">{benefit.benefit_type?.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white text-right">
                        {benefit.original_target_value ? formatCurrency(benefit.original_target_value) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white text-right">
                        {benefit.actual_value ? formatCurrency(benefit.actual_value) : 'N/A'}
                      </td>
                      <td className={`py-3 px-4 text-sm text-right ${getVarianceColor(benefit.variance)}`}>
                        <div className="flex items-center justify-end gap-1">
                          {getVarianceIcon(benefit.variance)}
                          {benefit.variance ? formatCurrency(benefit.variance) : 'N/A'}
                        </div>
                      </td>
                      <td className={`py-3 px-4 text-sm text-right ${getVarianceColor(benefit.variance_percentage)}`}>
                        {benefit.variance_percentage ? `${benefit.variance_percentage.toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          benefit.is_post_project
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        }`}>
                          {benefit.is_post_project ? 'Post-Project' : 'Achieved'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No benefits comparison data available.</p>
          )}
        </div>
      </div>
    </div>
  )
}
