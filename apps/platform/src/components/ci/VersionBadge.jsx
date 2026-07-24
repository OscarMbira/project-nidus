/**
 * Version Badge Component
 * Displays version number badge
 */

import { GitBranch } from 'lucide-react'

export default function VersionBadge({ versionNumber, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-sm font-medium ${className}`}
    >
      <GitBranch className="h-3 w-3" />
      v{versionNumber}
    </span>
  )
}
