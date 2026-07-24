import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

export default function MetricCard({ 
  title, 
  value, 
  unit = '', 
  previousValue = null,
  targetValue = null,
  status = 'neutral', // 'good', 'warning', 'critical', 'neutral'
  trend = null, // 'up', 'down', 'stable'
  trendPercentage = null,
  displayFormat = 'number', // 'number', 'percentage', 'currency', 'duration'
  decimalPlaces = 2,
  prefix = '',
  suffix = '',
  onClick,
  className = ''
}) {
  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';

    let formatted = parseFloat(val).toFixed(decimalPlaces);

    if (displayFormat === 'percentage') {
      return `${formatted}%`;
    } else if (displayFormat === 'currency') {
      return `${prefix || '$'}${parseFloat(formatted).toLocaleString()}`;
    } else if (displayFormat === 'duration') {
      return `${formatted} ${suffix || 'days'}`;
    } else {
      return `${prefix}${parseFloat(formatted).toLocaleString()}${suffix}`;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusTextColor = () => {
    switch (status) {
      case 'good':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-900 dark:text-white';
    }
  };

  const getTrendIcon = () => {
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    } else if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    if (trend === 'up') {
      return 'text-green-600 dark:text-green-400';
    } else if (trend === 'down') {
      return 'text-red-600 dark:text-red-400';
    } else {
      return 'text-gray-500 dark:text-gray-400';
    }
  };

  const varianceFromTarget = targetValue !== null && value !== null && value !== undefined
    ? ((value - targetValue) / targetValue) * 100
    : null;

  return (
    <div
      className={`rounded-lg border p-4 transition-all hover:shadow-md ${getStatusColor()} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        {status === 'critical' && (
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className={`text-3xl font-bold ${getStatusTextColor()}`}>
            {formatValue(value)}
            {unit && <span className="text-lg font-normal ml-1">{unit}</span>}
          </div>

          {previousValue !== null && (
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon()}
              <span className={`text-xs font-medium ${getTrendColor()}`}>
                {trendPercentage !== null && trendPercentage !== undefined
                  ? `${trendPercentage > 0 ? '+' : ''}${trendPercentage.toFixed(1)}%`
                  : value !== null && previousValue !== null && previousValue !== 0
                  ? `${((value - previousValue) / previousValue * 100) > 0 ? '+' : ''}${((value - previousValue) / previousValue * 100).toFixed(1)}%`
                  : '—'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                vs previous
              </span>
            </div>
          )}

          {targetValue !== null && (
            <div className="mt-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Target: {formatValue(targetValue)}
              </div>
              {varianceFromTarget !== null && (
                <div className={`text-xs font-medium ${varianceFromTarget >= 0 && status !== 'critical' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {varianceFromTarget > 0 ? '+' : ''}{varianceFromTarget.toFixed(1)}% from target
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

