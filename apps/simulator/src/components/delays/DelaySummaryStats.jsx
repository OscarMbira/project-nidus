import { DashboardStatCard } from '@nidus/ui'

/**
 * @param {{ summary: object, onCardClick?: (key: 'total'|'open'|'resolved'|'days_lost'|'auto_linked') => void }} props
 */
export default function DelaySummaryStats({ summary, onCardClick }) {
  if (!summary) return null
  const cards = [
    ['Total', summary.total, 'total'],
    ['Open', summary.openCount, 'open'],
    ['Resolved', summary.resolvedCount, 'resolved'],
    ['Days lost (sum)', summary.totalDaysLost, 'days_lost'],
    ['Auto-linked', summary.autoLinkedCount, 'auto_linked'],
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {cards.map(([label, val, key]) => (
        <DashboardStatCard
          key={label}
          label={label}
          value={val ?? 0}
          onClick={onCardClick ? () => onCardClick(key) : undefined}
        />
      ))}
    </div>
  )
}
