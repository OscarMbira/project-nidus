import { LayoutDashboard, List } from 'lucide-react'

/**
 * Shared Dashboard | Register/Log pill switcher (Risk Register / RAID Log pattern).
 * Active pill uses sky-600 to match Risk Management / Issue Register headers.
 *
 * @param {{
 *   value: 'dashboard' | 'register',
 *   onChange: (next: 'dashboard' | 'register') => void,
 *   registerLabel?: string,
 *   ariaLabel?: string,
 *   className?: string,
 * }} props
 */
export default function DashboardRegisterTabBar({
  value,
  onChange,
  registerLabel = 'Register',
  ariaLabel = 'View sections',
  className = '',
}) {
  const tabBtn = (active) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
      active
        ? 'bg-sky-600 text-white'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`

  return (
    <div
      className={`flex flex-wrap items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1 self-start ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'dashboard'}
        onClick={() => onChange('dashboard')}
        className={tabBtn(value === 'dashboard')}
      >
        <LayoutDashboard className="h-4 w-4" aria-hidden />
        Dashboard
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'register'}
        onClick={() => onChange('register')}
        className={tabBtn(value === 'register')}
      >
        <List className="h-4 w-4" aria-hidden />
        {registerLabel}
      </button>
    </div>
  )
}
