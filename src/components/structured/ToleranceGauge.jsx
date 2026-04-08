import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function ToleranceGauge({ type, actual, forecast, status, planned = null }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'within':
        return 'text-green-500'
      case 'approaching':
        return 'text-yellow-500'
      case 'exceeded':
        return 'text-red-500'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusBg = (status) => {
    switch (status) {
      case 'within':
        return 'bg-green-100 dark:bg-green-900'
      case 'approaching':
        return 'bg-yellow-100 dark:bg-yellow-900'
      case 'exceeded':
        return 'bg-red-100 dark:bg-red-900'
      default:
        return 'bg-gray-100 dark:bg-gray-700'
    }
  }

  const getIcon = () => {
    if (forecast > actual) {
      return <TrendingUp className="h-5 w-5" />
    } else if (forecast < actual) {
      return <TrendingDown className="h-5 w-5" />
    }
    return <Minus className="h-5 w-5" />
  }

  const formatValue = (value, type) => {
    if (type === 'cost') {
      return `$${value.toLocaleString()}`
    } else if (type === 'scope') {
      return `${value.toFixed(1)}%`
    } else {
      return `${value} days`
    }
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusBg(status)}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 dark:text-white capitalize">{type}</h4>
        <div className={getStatusColor(status)}>
          {getIcon()}
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Actual:</span>
          <span className="font-medium text-gray-900 dark:text-white">{formatValue(actual || 0, type)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Forecast:</span>
          <span className="font-medium text-gray-900 dark:text-white">{formatValue(forecast || 0, type)}</span>
        </div>
        {planned && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Planned:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatValue(planned, type)}</span>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
          <span className={`px-3 py-1 rounded-lg font-semibold text-sm capitalize ${getStatusBg(status)} ${getStatusColor(status)}`}>
            {status || 'unknown'}
          </span>
        </div>
      </div>
    </div>
  )
}
