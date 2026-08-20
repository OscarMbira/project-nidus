import { Eye, Pencil, Trash2 } from 'lucide-react'
import Tooltip from './Tooltip.jsx'

const VARIANTS = {
  view: {
    Icon: Eye,
    color: 'text-blue-600 hover:bg-blue-50 dark:text-sky-300 dark:hover:bg-sky-900/20',
  },
  edit: {
    Icon: Pencil,
    color: 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20',
  },
  delete: {
    Icon: Trash2,
    color: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
  },
}

/**
 * Icon-only row/detail-bar action button (View/Edit/Delete) with a themed
 * hover/focus tooltip and aria-label for accessibility (no native title —
 * that duplicates the Tooltip and causes double hover labels).
 * @param {{ variant: 'view'|'edit'|'delete', label: string, onClick: () => void, disabled?: boolean, className?: string }} props
 */
export default function RowActionButton({ variant, label, onClick, disabled = false, className = '', ...props }) {
  const config = VARIANTS[variant]
  if (!config) return null
  const { Icon, color } = config

  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`p-2 rounded transition-colors disabled:opacity-50 disabled:pointer-events-none ${color} ${className}`.trim()}
        {...props}
      >
        <Icon className="h-4 w-4" />
      </button>
    </Tooltip>
  )
}
