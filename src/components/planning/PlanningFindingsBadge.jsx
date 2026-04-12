/** Open error+warning findings count for nav badges */
export default function PlanningFindingsBadge({ count, className = '' }) {
  if (count == null || count <= 0) return null
  return (
    <span
      className={`ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-medium bg-amber-600/90 text-white ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
