/**
 * Product Status Account List Component
 */

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Calendar, Package } from 'lucide-react'
import { getProductStatusAccountByProject } from '../../services/productStatusAccountService'
import ProductStatusAccountCard from './ProductStatusAccountCard'
import ExportListMenu from '../ui/ExportListMenu'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
const PSA_COLUMNS = [
  { key: 'psa_reference', label: 'Reference' },
  { key: 'product_name', label: 'Product Name' },
  { key: 'current_status', label: 'Status' }
]

export default function ProductStatusAccountList({ projectId, onCreate, reportDate = null }) {
  const [psas, setPsas] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [progressFilter, setProgressFilter] = useState('all')
  const [currentReportDate, setCurrentReportDate] = useState(reportDate || new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (projectId) {
      loadProductStatusAccounts()
    }
  }, [projectId, currentReportDate])

  const loadProductStatusAccounts = async () => {
    try {
      setLoading(true)
      const result = await getProductStatusAccountByProject(projectId, currentReportDate)
      if (result.success) {
        setPsas(result.data || [])
      }
    } catch (error) {
      console.error('Error loading product status accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPSAs = psas.filter(psa => {
    const matchesSearch = !searchTerm || 
      psa.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      psa.psa_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      psa.product_reference?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || psa.current_status === statusFilter
    const matchesProgress = progressFilter === 'all' || psa.progress_indicator === progressFilter
    return matchesSearch && matchesStatus && matchesProgress
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading product status accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Status Accounts</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {psas.length} total • Report Date: {new Date(currentReportDate).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={PSA_COLUMNS} data={filteredPSAs} baseFilename="ProductStatusAccounts" disabled={!filteredPSAs.length} />
          {onCreate && (
          <button
            onClick={onCreate}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Status Account
          </button>
          )}
        </div>
      </div>

      {/* Report Date Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        <input
          type="date"
          value={currentReportDate}
          onChange={(e) => setCurrentReportDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product status accounts..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="under_review">Under Review</option>
            <option value="quality_check">Quality Check</option>
            <option value="completed">Completed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="handed_over">Handed Over</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
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
            <option value="ahead_of_schedule">Ahead of Schedule</option>
          </select>
        </div>
      </div>

      {/* Status Accounts Grid */}
      {filteredPSAs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Product Status Accounts Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || statusFilter !== 'all' || progressFilter !== 'all'
              ? 'No status accounts match your filters.'
              : 'Create your first Product Status Account to start tracking product status.'}
          </p>
          {onCreate && !searchTerm && statusFilter === 'all' && progressFilter === 'all' && (
            <button
              onClick={onCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Status Account
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPSAs.map((psa, index) => (
            <ProductStatusAccountCard key={psa.id} psa={psa} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  )
}
