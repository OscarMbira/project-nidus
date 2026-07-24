export default function IssuePriorityBadge({ priority }) {
  const getPriorityConfig = () => {
    switch (priority) {
      case 'critical':
        return {
          label: 'Critical',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }
      case 'high':
        return {
          label: 'High',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
        }
      case 'medium':
        return {
          label: 'Medium',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
        }
      case 'low':
        return {
          label: 'Low',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        }
      default:
        return {
          label: priority || 'Unknown',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        }
    }
  }

  const config = getPriorityConfig()

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}
