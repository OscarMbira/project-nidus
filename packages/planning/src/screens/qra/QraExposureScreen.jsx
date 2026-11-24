/**
 * v1355 — expected exposure before and after the response. Cards open the risk register
 * filtered to the risks that have a range.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardStatCard from '@nidus/ui/DashboardStatCard'
import { exposureTotals } from '../../engine/qra/riskExposure.js'
import { useRegionalFormatSettings } from '@nidus/shared/hooks/useRegionalFormatSettings'
import { formatRegionalCurrency } from '@nidus/shared/utils/formatRegionalSettings'
import { useQraProject } from './useQraProject.js'

export default function QraExposureScreen() {
  const navigate = useNavigate()
  const ctx = useQraProject()
  const regional = useRegionalFormatSettings(ctx.isSim ? null : ctx.projectId)
  const [filter, setFilter] = useState('all')
  const pre = useMemo(() => exposureTotals(ctx.risks || [], { basis: 'pre' }), [ctx.risks])
  const post = useMemo(() => exposureTotals(ctx.risks || [], { basis: 'post' }), [ctx.risks])
  const money = (n) => formatRegionalCurrency(n, regional)
  const rows = pre.rows.filter((row) => (filter === 'estimated' ? row.estimatedFromScore : true))
  if (ctx.scheduleOnly) return <p className="text-gray-700 dark:text-gray-200">Exposure is part of the project risk register, which the Planner does not include.</p>
  if (!ctx.projectId) return <p className="text-gray-700 dark:text-gray-200">Choose a project to see exposure.</p>
  const register = ctx.isSim ? '/simulator/practice-risk-register' : '/platform/risks'
  return (
    <div className="space-y-4">
      {ctx.error && <p className="text-sm text-red-700 dark:text-red-300">{ctx.error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <DashboardStatCard label="Expected cost, before response" value={money(pre.costEmv)} onClick={() => setFilter('all')} />
        <DashboardStatCard label="Expected days, before response" value={pre.scheduleEmvDays.toFixed(1)} onClick={() => setFilter('all')} />
        <DashboardStatCard label="Expected cost, after response" value={money(post.costEmv)} onClick={() => setFilter('all')} />
        <DashboardStatCard label="Estimated from the score" value={pre.estimatedCount} onClick={() => setFilter('estimated')} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <tr>
              <th className="px-3 py-2 text-left">Risk</th>
              <th className="px-3 py-2 text-right">Expected cost</th>
              <th className="px-3 py-2 text-right">Expected days</th>
              <th className="px-3 py-2 text-left">Probability</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.risk.id} className="border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 cursor-pointer" onClick={() => navigate(`${register}/${row.risk.display_id || row.risk.risk_reference || row.risk.id}`)}>
                <td className="px-3 py-2">{row.risk.risk_title || row.risk.title}</td>
                <td className="px-3 py-2 text-right tabular-nums">{money(row.costEmv)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.scheduleEmvDays.toFixed(1)}</td>
                <td className="px-3 py-2">{row.probability == null ? '—' : `${Math.round(row.probability * 100)}%`}{row.estimatedFromScore ? ' (from the score)' : ''}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-700 dark:text-gray-200">No open risks on this project.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
