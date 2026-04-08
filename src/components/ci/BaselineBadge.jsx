/**
 * Baseline Badge Component
 * Displays baseline type badge
 */

import { Layers } from 'lucide-react'

export default function BaselineBadge({ baselineType, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded text-sm font-medium ${className}`}
    >
      <Layers className="h-3 w-3" />
      {baselineType}
    </span>
  )
}
