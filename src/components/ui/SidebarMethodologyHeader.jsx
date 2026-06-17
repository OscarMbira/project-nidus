import { Shield, Settings2, Zap } from 'lucide-react'
import { METHODOLOGY_TRACK_DEFS } from '../../config/methodologyMenuUtils'

const ICON_BY_TRACK = {
  structured: Shield,
  pmbok: Settings2,
  agile: Zap,
}

/**
 * Methodology track divider in the sidebar (v671).
 */
export default function SidebarMethodologyHeader({
  track = 'structured',
  label,
  badge,
  color,
  headerBgClass = 'bg-gray-100 dark:bg-gray-800/80',
  headerTextClass = 'text-gray-700 dark:text-gray-300',
}) {
  const def = METHODOLOGY_TRACK_DEFS.find((d) => d.track === track) || METHODOLOGY_TRACK_DEFS[0]
  const Icon = ICON_BY_TRACK[track] || Shield
  const displayLabel = label || def.label
  const badgeText = badge || def.badge
  const accent = color || def.color

  return (
    <div
      className={`mx-2 mt-3 mb-1 px-2 py-2 rounded-md border-l-4 ${headerBgClass}`}
      style={{ borderLeftColor: accent }}
      role="presentation"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          [{badgeText}]
        </span>
        <Icon className="h-4 w-4 flex-shrink-0" style={{ color: accent }} aria-hidden />
        <span className={`text-[11px] sm:text-xs font-semibold truncate ${headerTextClass}`}>
          {displayLabel}
        </span>
      </div>
    </div>
  )
}
