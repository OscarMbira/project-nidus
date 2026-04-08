/**
 * Product Status Account Dashboard
 * Overview of all product statuses in project
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { Package, TrendingUp, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { getProductStatusAccountByProject, getStatusSummary } from '../../services/productStatusAccountService'
import ProductStatusAccountCard from '../../components/productStatusAccount/ProductStatusAccountCard'
import PSAStatusIndicator from '../../components/productStatusAccount/PSAStatusIndicator'

export default function ProductStatusAccountDashboard() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [psas, setPsas] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('all')
  const [progressFilter, setProgressFilter] = useState('all')

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId, reportDate])

  const loadData = async () => {
    try {
      setLoading(true)
      const [psasResult, summaryResult] = await Promise.all([
        getProductStatusAccountByProject(projectId, reportDate),
        getStatusSummary(projectId, reportDate)
      ])

      if (psasResult.success) {
        setPsas(psasResult.data || [])
      }

      if (summaryResult.success) {
        setSummary(summaryResult.data)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPSAs = psas.filter(psa => {
    const matchesStatus = statusFilter === 'all' || psa.current_status === statusFilter
    const matchesProgress = progressFilter === 'all' || psa.progress_indicator === progressFilter
    return matchesStatus && matchesProgress
  })

  const atRiskProducts = filteredPSAs.filter(p => p.progress_indicator === 'at_risk' || p.progress_indicator === 'delayed')
  const recentChanges = psas.filter(p => {
    if (!p.status_date) return false
    const statusDate = new Date(p.status_date)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return statusDate >= yesterday
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Product Status Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Overview of all product statuses • Report Date: {new Date(reportDate).toLocaleDateString()}
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_products || 0}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.in_progress || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">At Risk</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.at_risk || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.completed || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <input
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="accepted">Accepted</option>
          <option value="on_hold">On Hold</option>
        </select>
        <select
          value={progressFilter}
          onChange={(e) => setProgressFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Progress</option>
          <option value="on_track">On Track</option>
          <option value="at_risk">At Risk</option>
          <option value="delayed">Delayed</option>
        </select>
      </div>

      {/* Products at Risk */}
      {atRiskProducts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Products at Risk or Delayed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {atRiskProducts.map((psa) => (
              <ProductStatusAccountCard key={psa.id} psa={psa} projectId={projectId} />
            ))}
          </div>
        </div>
      )}

      {/* All Products */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          All Products ({filteredPSAs.length})
        </h2>
        {filteredPSAs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No product status accounts found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPSAs.map((psa) => (
              <ProductStatusAccountCard key={psa.id} psa={psa} projectId={projectId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
