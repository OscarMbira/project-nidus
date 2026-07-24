export default function IssueSeverityBadge({ severity }) {
  const getSeverityConfig = () => {
    switch (severity) {
      case 'critical':
        return {
          label: 'Critical',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }
      case 'major':
        return {
          label: 'Major',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
        }
      case 'moderate':
        return {
          label: 'Moderate',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
        }
      case 'minor':
        return {
          label: 'Minor',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        }
      default:
        return {
          label: severity || 'Unknown',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        }
    }
  }

  const config = getSeverityConfig()

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
