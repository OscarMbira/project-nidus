/**
 * Risk Score Badge Component
 * Visual badge for risk level (very_low, low, medium, high, very_high)
 */

export default function RiskScoreBadge({ score, expectedValue = null }) {
  const getScoreConfig = (score) => {
    switch (score) {
      case 'very_high':
        return {
          label: 'Very High',
          className: 'bg-red-600 text-white dark:bg-red-800 dark:text-red-100'
        };
      case 'high':
        return {
          label: 'High',
          className: 'bg-orange-500 text-white dark:bg-orange-700 dark:text-orange-100'
        };
      case 'medium':
        return {
          label: 'Medium',
          className: 'bg-yellow-500 text-white dark:bg-yellow-700 dark:text-yellow-100'
        };
      case 'low':
        return {
          label: 'Low',
          className: 'bg-green-500 text-white dark:bg-green-700 dark:text-green-100'
        };
      case 'very_low':
        return {
          label: 'Very Low',
          className: 'bg-gray-400 text-white dark:bg-gray-600 dark:text-gray-100'
        };
      default:
        return {
          label: score || 'Unknown',
          className: 'bg-gray-400 text-white dark:bg-gray-600 dark:text-gray-100'
        };
    }
  };

  const config = getScoreConfig(score);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.className}`}>
      {config.label}
      {expectedValue !== null && (
        <span className="ml-1 opacity-75">({expectedValue})</span>
      )}
    </span>
  );
}
