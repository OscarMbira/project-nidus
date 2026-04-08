/**
 * Work Package Product Card Component
 * Displays a single Work Package product/deliverable
 */

import { Edit2, Trash2, Package, ExternalLink } from 'lucide-react'

const PRODUCT_TYPE_COLORS = {
  deliverable: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  document: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  software: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  hardware: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  service: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  report: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const DELIVERY_STATUS_COLORS = {
  not_started: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  delivered: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
}

export default function WPProductCard({ product, mode = 'view', onEdit, onDelete }) {
  const typeColor = PRODUCT_TYPE_COLORS[product.product_type] || PRODUCT_TYPE_COLORS.other
  const statusColor = DELIVERY_STATUS_COLORS[product.delivery_status] || DELIVERY_STATUS_COLORS.not_started

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {product.product_name}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${typeColor}`}>
              {product.product_type}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${statusColor}`}>
              {product.delivery_status?.replace('_', ' ')}
            </span>
          </div>

          {product.product_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {product.product_description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {product.linked_deliverable && (
              <a
                href={`/projects/${product.linked_deliverable.project_id}/deliverables/${product.linked_deliverable.id}`}
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Deliverable: {product.linked_deliverable.deliverable_reference || product.linked_deliverable.deliverable_name}
              </a>
            )}
            {product.linked_description && (
              <a
                href={`/projects/${product.linked_description.project_id}/product-descriptions/${product.linked_description.id}`}
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Product Description: {product.linked_description.product_reference || product.linked_description.product_name}
              </a>
            )}
            {product.delivery_date && (
              <span>Delivered: {new Date(product.delivery_date).toLocaleDateString()}</span>
            )}
            {product.acceptance_date && (
              <span>Accepted: {new Date(product.acceptance_date).toLocaleDateString()}</span>
            )}
          </div>

          {(product.quality_criteria || product.acceptance_criteria) && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
              {product.quality_criteria && (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quality Criteria:</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{product.quality_criteria}</p>
                </div>
              )}
              {product.acceptance_criteria && (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Acceptance Criteria:</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{product.acceptance_criteria}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {mode !== 'view' && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title="Edit product"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                title="Delete product"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
