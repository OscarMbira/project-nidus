/**
 * Product Description Card Component
 */

import { FileText, CheckCircle, Clock, XCircle, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  superseded: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

const STATUS_ICONS = {
  draft: Clock,
  under_review: Clock,
  approved: CheckCircle,
  superseded: XCircle
}

export default function ProductDescriptionCard({ pd, projectId }) {
  const navigate = useNavigate()
  const StatusIcon = STATUS_ICONS[pd.status] || FileText

  const handleClick = () => {
    navigate(`/app/projects/${projectId}/product-descriptions/${pd.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {pd.product_title || 'Untitled Product'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {pd.pd_reference} • Version {pd.version_number}
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${STATUS_COLORS[pd.status] || STATUS_COLORS.draft}`}>
          <StatusIcon className="w-3 h-3" />
          {pd.status?.replace('_', ' ')}
        </span>
      </div>

      {pd.purpose && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {pd.purpose}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {pd.product_deliverable && (
          <span className="flex items-center">
            <Package className="w-3 h-3 mr-1" />
            {pd.product_deliverable.product_name}
          </span>
        )}
        {pd.ppd_composition_item && (
          <span className="flex items-center">
            <FileText className="w-3 h-3 mr-1" />
            PPD: {pd.ppd_composition_item.product_name}
          </span>
        )}
      </div>
    </div>
  )
}
