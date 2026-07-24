/**
 * Wraps create/edit forms as a modal overlay or an in-page panel (PMO oversight).
 * @param {'modal'|'page'} variant
 */
import { X } from 'lucide-react'

export default function FormSurface({
  variant = 'modal',
  title,
  subtitle = null,
  icon: Icon = null,
  onClose,
  children,
  maxWidthClass = 'max-w-4xl',
  className = '',
}) {
  const header = (
    <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {Icon ? <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400 shrink-0" /> : null}
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  )

  const panel = (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full flex flex-col ${
        variant === 'page' ? '' : `${maxWidthClass} max-h-[90vh] overflow-hidden`
      } ${className}`}
    >
      {header}
      <div className={variant === 'page' ? 'flex-1' : 'overflow-y-auto flex-1'}>{children}</div>
    </div>
  )

  if (variant === 'page') {
    return <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden shadow-sm">{panel}</div>
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {panel}
    </div>
  )
}

/** Use full-page forms on PMO Project Oversight menu routes (not modals). */
export function resolveOversightFormVariant(pathname = '') {
  if (!pathname) return 'modal'
  if (/\/pmo\/oversight\//.test(pathname)) return 'page'
  if (/\/pmo\/registers\//.test(pathname)) return 'page'
  if (/\/pmo\/delays\/templates/.test(pathname)) return 'page'
  if (/\/simulator\/pmo\/oversight\//.test(pathname)) return 'page'
  if (/\/simulator\/pmo\/registers\//.test(pathname)) return 'page'
  if (/\/simulator\/pmo\/delays\/templates/.test(pathname)) return 'page'
  return 'modal'
}
