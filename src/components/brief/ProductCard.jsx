/**
 * Product Card Component
 * Display product description
 */

import { Star, Edit2, Trash2 } from 'lucide-react'

export default function ProductCard({ product, onEdit, onDelete, readOnly = false }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {product.product_name}
            </h3>
            {product.is_main_product && (
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm flex items-center">
                <Star className="w-3 h-3 mr-1" />
                Main Product
              </span>
            )}
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{product.product_description}</p>
          
          {product.purpose && (
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Purpose:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{product.purpose}</p>
            </div>
          )}
          
          {product.quality_criteria && (
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Quality Criteria:</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{product.quality_criteria}</p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 mt-3">
            {product.composition && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                Composition: {product.composition.substring(0, 50)}...
              </span>
            )}
            {product.quality_tolerance && (
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                Tolerance: {product.quality_tolerance}
              </span>
            )}
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(product)}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(product.id)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
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
