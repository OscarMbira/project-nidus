import { Lock, GitFork, Eye, Edit3, Clock } from 'lucide-react'

/**
 * DocumentStateBadge
 *
 * Visual indicator for document governance states:
 * - baseline: Blue badge with lock icon (immutable PMO standard)
 * - tailored: Orange badge with fork icon (project-specific copy)
 * - read-only: Grey badge with eye icon (no edit permission)
 * - editable: Green badge with edit icon (user can modify)
 * - under-review: Purple badge with clock icon (awaiting PMO approval)
 */

const STATE_CONFIG = {
  baseline: {
    label: 'Baseline',
    icon: Lock,
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  tailored: {
    label: 'Tailored for Project',
    icon: GitFork,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-300',
    iconColor: 'text-orange-600 dark:text-orange-400'
  },
  'read-only': {
    label: 'Read-Only',
    icon: Eye,
    bgColor: 'bg-gray-100 dark:bg-gray-700/50',
    textColor: 'text-gray-700 dark:text-gray-300',
    iconColor: 'text-gray-500 dark:text-gray-400'
  },
  editable: {
    label: 'Editable',
    icon: Edit3,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-300',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  'under-review': {
    label: 'Under PMO Review',
    icon: Clock,
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-300',
    iconColor: 'text-purple-600 dark:text-purple-400'
  }
}

export default function DocumentStateBadge({ state, size = 'sm' }) {
  const config = STATE_CONFIG[state]
  if (!config) return null

  const Icon = config.icon
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-1 text-sm'

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses}`}>
      <Icon className={`${iconSize} ${config.iconColor}`} />
      {config.label}
    </span>
  )
}
