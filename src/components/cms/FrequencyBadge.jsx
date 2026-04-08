/**
 * Frequency Badge Component
 * Display frequency for reports/activities
 */

import { Calendar } from 'lucide-react'

export default function FrequencyBadge({ frequency, size = 'sm' }) {
  const frequencyLabels = {
    continuous: 'Continuous',
    daily: 'Daily',
    weekly: 'Weekly',
    bi_weekly: 'Bi-Weekly',
    monthly: 'Monthly',
    stage_end: 'Stage End',
    on_demand: 'On Demand'
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  if (!frequency) return null

  return (
    <span className={`inline-flex items-center gap-1 ${sizeClasses[size]} bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full`}>
      <Calendar className="w-3 h-3" />
      {frequencyLabels[frequency] || frequency}
    </span>
  )
}
