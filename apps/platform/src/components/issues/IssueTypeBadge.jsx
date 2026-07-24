import { FileText, AlertTriangle, HelpCircle } from 'lucide-react'

export default function IssueTypeBadge({ type }) {
  const getTypeConfig = () => {
    switch (type) {
      case 'request_for_change':
        return {
          label: 'RFC',
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
          icon: FileText
        }
      case 'off_specification':
        return {
          label: 'Off-Spec',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
          icon: AlertTriangle
        }
      case 'problem_concern':
        return {
          label: 'Problem',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
          icon: HelpCircle
        }
      default:
        return {
          label: type?.replace('_', ' ') || 'Issue',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
          icon: HelpCircle
        }
    }
  }

  const config = getTypeConfig()
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}
