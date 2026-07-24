import { Bot } from 'lucide-react'
import DelaySeverityBadge from './DelaySeverityBadge'
import RowNumberBadge from '../ui/RowNumberBadge'

export default function DelayCard({ row, onEdit, readOnly, rowNumber }) {
  const src = row.source_type || 'manual'
  const auto = row.is_auto_linked
  return (
    <div className="rounded-xl border border-slate-600/50 bg-slate-900/50 dark:bg-slate-950/50 p-4 shadow-sm">
      <div className="flex justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          {rowNumber != null && <RowNumberBadge number={rowNumber} className="shrink-0" />}
          <div>
            <div className="text-sm text-slate-400">{row.delay_reference}</div>
            <h3 className="text-base font-semibold text-slate-100">{row.title}</h3>
          </div>
        </div>
        <DelaySeverityBadge severity={row.severity} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
        <span className="capitalize">{row.delay_category?.replace(/_/g, ' ')}</span>
        <span>·</span>
        <span className="capitalize">{row.status?.replace(/_/g, ' ')}</span>
        {row.impact_schedule_days != null && (
          <>
            <span>·</span>
            <span>{row.impact_schedule_days} d impact</span>
          </>
        )}
      </div>
      {auto && (
        <div className="mt-2 flex items-center gap-1 text-xs text-cyan-400">
          <Bot className="h-3.5 w-3.5" aria-hidden />
          <span>{src.replace(/_/g, ' ')}</span>
        </div>
      )}
      {!readOnly && onEdit && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="text-sm text-blue-400 hover:underline"
          >
            View / edit
          </button>
        </div>
      )}
    </div>
  )
}
