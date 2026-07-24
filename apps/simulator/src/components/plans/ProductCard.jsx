/**
 * Product Card Component
 */

import { Calendar, Package, Edit, Trash2, Link as LinkIcon } from 'lucide-react'

export default function ProductCard({ product, onEdit, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {product.product_name}
            </h4>
            <span className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded">
              {product.product_type?.replace('_', ' ')}
            </span>
          </div>
          {product.product_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {product.product_description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {product.planned_completion_date && (
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {product.planned_completion_date}
              </span>
            )}
            {product.linked_work_package && (
              <span className="flex items-center">
                <LinkIcon className="w-4 h-4 mr-1" />
                WP: {product.linked_work_package.work_package_name}
              </span>
            )}
            {product.linked_ppd_composition_item && (
              <span className="flex items-center">
                <Package className="w-4 h-4 mr-1" />
                PPD: {product.linked_ppd_composition_item.product_name}
              </span>
            )}
          </div>
          {product.acceptance_criteria && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              <strong>Acceptance:</strong> {product.acceptance_criteria}
            </p>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                title="Edit product"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
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
