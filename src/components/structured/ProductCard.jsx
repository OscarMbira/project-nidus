import { Package, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export default function ProductCard({ product, onEdit, onDelete, mode = 'view' }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'quality_check':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-blue-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'quality_check':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'approved':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-5 w-5 text-gray-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">{product.product_name}</h4>
            {getStatusIcon(product.product_status)}
          </div>
          {product.product_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{product.product_description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <span className={`px-2 py-1 text-xs rounded ${getStatusColor(product.product_status)}`}>
              {product.product_status.replace('_', ' ')}
            </span>
            {product.quality_status && (
              <span className={`px-2 py-1 text-xs rounded ${
                product.quality_status === 'passed'
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : product.quality_status === 'failed'
                  ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}>
                Quality: {product.quality_status.replace('_', ' ')}
              </span>
            )}
          </div>
          {product.planned_end_date && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Planned end: {new Date(product.planned_end_date).toLocaleDateString()}
            </p>
          )}
        </div>
        {mode !== 'view' && (onEdit || onDelete) && (
          <div className="flex gap-2 ml-4">
            {onEdit && (
              <button
                onClick={() => onEdit(product)}
                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(product.id)}
                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
