import { Target, TrendingUp, TrendingDown } from 'lucide-react'

export default function BenefitReviewCard({ review, onEdit, onDelete, mode = 'view' }) {
  const getBenefitTypeColor = (type) => {
    switch (type) {
      case 'achieved':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'residual':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'expected_net':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'not_achieved':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-gray-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">{review.benefit_description}</h4>
            <span className={`px-2 py-1 text-xs rounded ${getBenefitTypeColor(review.benefit_type)}`}>
              {review.benefit_type.replace('_', ' ')}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
            {review.original_target_value !== null && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Target:</span>
                <p className="font-medium">{review.original_target_value.toLocaleString()} {review.measurement_unit || ''}</p>
              </div>
            )}
            {review.actual_value !== null && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Actual:</span>
                <p className="font-medium">{review.actual_value.toLocaleString()} {review.measurement_unit || ''}</p>
              </div>
            )}
            {review.variance !== null && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Variance:</span>
                <p className={`font-medium ${
                  review.variance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {review.variance >= 0 ? '+' : ''}{review.variance.toLocaleString()} {review.measurement_unit || ''}
                </p>
              </div>
            )}
            {review.variance_percentage !== null && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Variance %:</span>
                <p className={`font-medium ${
                  review.variance_percentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {review.variance_percentage >= 0 ? '+' : ''}{review.variance_percentage.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>
        {mode !== 'view' && (onEdit || onDelete) && (
          <div className="flex gap-2 ml-4">
            {onEdit && (
              <button
                onClick={() => onEdit(review)}
                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(review.id)}
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
