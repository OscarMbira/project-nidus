/**
 * PSA Status Indicator Component
 * Status badge/indicator for Product Status Accounts
 */

import { Package, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'

const STATUS_COLORS = {
  not_started: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  under_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  quality_check: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  handed_over: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  on_hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

const STATUS_ICONS = {
  not_started: Clock,
  planned: Clock,
  in_progress: Clock,
  under_review: Clock,
  quality_check: Clock,
  completed: CheckCircle,
  accepted: CheckCircle,
  rejected: XCircle,
  handed_over: CheckCircle,
  on_hold: AlertCircle,
  cancelled: XCircle
}

export default function PSAStatusIndicator({ status, showIcon = true, size = 'md' }) {
  const StatusIcon = STATUS_ICONS[status] || Package
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  }

  return (
    <span className={`${sizeClasses[size]} font-medium rounded-full flex items-center gap-1 ${STATUS_COLORS[status] || STATUS_COLORS.not_started}`}>
      {showIcon && <StatusIcon className="w-3 h-3" />}
      {status?.replace('_', ' ')}
    </span>
  )
}
