/**
 * Composition Item Card Component
 */

import { Package, Edit, Trash2, Link as LinkIcon } from 'lucide-react'

export default function CompositionItemCard({ item, onEdit, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {item.item_number}. {item.sub_product_name}
            </h4>
            <span className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded">
              {item.sub_product_type?.replace('_', ' ')}
            </span>
            {item.is_mandatory && (
              <span className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded">
                Mandatory
              </span>
            )}
          </div>
          {item.sub_product_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {item.sub_product_description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {item.linked_product_description && (
              <span className="flex items-center">
                <LinkIcon className="w-4 h-4 mr-1" />
                PD: {item.linked_product_description.product_title}
              </span>
            )}
            {item.linked_product_deliverable && (
              <span className="flex items-center">
                <Package className="w-4 h-4 mr-1" />
                Deliverable: {item.linked_product_deliverable.product_name}
              </span>
            )}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                title="Edit item"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                title="Delete item"
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
