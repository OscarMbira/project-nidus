/**
 * Product Description List Component
 */

import { useState, useEffect } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { getProductDescriptionByProject } from '../../services/productDescriptionService'
import ProductDescriptionCard from './ProductDescriptionCard'
import ExportListMenu from '../ui/ExportListMenu'

const PD_COLUMNS = [
  { key: 'product_title', label: 'Product Title' },
  { key: 'pd_reference', label: 'Reference' },
  { key: 'status', label: 'Status' }
]

export default function ProductDescriptionList({ projectId, onCreate }) {
  const [productDescriptions, setProductDescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (projectId) {
      loadProductDescriptions()
    }
  }, [projectId])

  const loadProductDescriptions = async () => {
    try {
      setLoading(true)
      const result = await getProductDescriptionByProject(projectId)
      if (result.success) {
        setProductDescriptions(result.data || [])
      }
    } catch (error) {
      console.error('Error loading product descriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDescriptions = productDescriptions.filter(pd => {
    const matchesSearch = !searchTerm || 
      pd.product_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pd.pd_reference?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || pd.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading product descriptions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Descriptions</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {productDescriptions.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={PD_COLUMNS} data={filteredDescriptions} baseFilename="ProductDescriptions" disabled={!filteredDescriptions.length} />
          {onCreate && (
          <button
            onClick={onCreate}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Product Description
          </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product descriptions..."
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
            <option value="draft">Draft</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="superseded">Superseded</option>
          </select>
        </div>
      </div>

      {filteredDescriptions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'No product descriptions match your filters'
              : 'No product descriptions created yet'}
          </p>
          {onCreate && !searchTerm && statusFilter === 'all' && (
            <button
              onClick={onCreate}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Product Description
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDescriptions.map(pd => (
            <ProductDescriptionCard key={pd.id} pd={pd} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  )
}
