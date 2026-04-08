/**
 * Channel Effectiveness Badge Component
 * Display channel effectiveness rating
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function ChannelEffectivenessBadge({ rating, showLabel = true }) {
  if (rating === null || rating === undefined) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
        <Minus className="w-3 h-3" />
        {showLabel && 'Not Rated'}
      </span>
    )
  }

  const getColor = (rating) => {
    if (rating >= 4) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    if (rating >= 3) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }

  const getIcon = (rating) => {
    if (rating >= 4) return <TrendingUp className="w-3 h-3" />
    if (rating >= 3) return <Minus className="w-3 h-3" />
    return <TrendingDown className="w-3 h-3" />
  }

  const Icon = getIcon(rating)

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs ${getColor(rating)} rounded-full`}>
      {Icon}
      {rating}/5
      {showLabel && ` Effectiveness`}
    </span>
  )
}
