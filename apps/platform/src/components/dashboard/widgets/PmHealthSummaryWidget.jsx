/**
 * Project Health + Dashboard summary widgets (taxonomy §3 Dashboard — Documentation/
 * Core_PM_and_Industry_Menu_Taxonomy.md): Project Health, Schedule Summary, Cost Summary, RAID
 * Summary, Change Summary, Quality Summary, Testing Summary, Resource Summary.
 *
 * One widget, one shared fetch (getProjectHealthSummary) — same "cohesive widget, not several
 * independently-fetching ones" pattern as PmoAdminOverviewWidget.jsx (rule 66: several of these
 * cards would otherwise repeat the same risk/issue/EVM queries for no reason).
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  HeartPulse, Calendar, DollarSign, ShieldAlert, GitPullRequest, CheckSquare, Bug, Users,
} from 'lucide-react'
import { useCurrentProject } from '../../../lib/CurrentProjectContext'
import { getProjectHealthSummary } from '../../../services/projectHealthSummaryService'
import { formatCurrency } from '@nidus/shared/utils/amountShorthand'

const RAG_STYLES = {
  red: { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/20', label: 'At risk' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Needs attention' },
  green: { dot: 'bg-green-500', text: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/20', label: 'On track' },
}

function RagDot({ rag }) {
  const style = RAG_STYLES[rag]
  if (!style) {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" title="No data yet" />
  }
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.dot}`} title={style.label} />
}

function SummaryCard({ icon: Icon, title, rag, figures, to, qs }) {
  const style = RAG_STYLES[rag]
  return (
    <Link
      to={`${to}${qs}`}
      className="block rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500 dark:text-gray-500" />
          <span className="text-sm font-medium text-gray-800 dark:text-gray-300">{title}</span>
        </div>
        <RagDot rag={rag} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {figures.map((f) => (
          <div key={f.label} className="min-w-0">
            <p className="text-lg font-bold text-gray-900 dark:text-white truncate" title={String(f.value)}>{f.value}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{f.label}</p>
          </div>
        ))}
      </div>
      {style && (
        <p className={`mt-2 text-xs font-medium ${style.text}`}>{style.label}</p>
      )}
    </Link>
  )
}

const fmtIndex = (v) => (v == null ? '—' : v.toFixed(2))
// Shorthand ($5.5M, not $5,500,000) — a bare card in a 2-column grid has no room for the full
// separated form, which was overflowing past the card's edge into its neighbour.
const fmtCurrency = (v) => (v == null ? '—' : formatCurrency(v, { useShorthand: true, shorthandThreshold: 100000 }))

export default function PmHealthSummaryWidget() {
  const { currentProjectId, currentProject } = useCurrentProject()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentProjectId) {
      setSummary(null)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getProjectHealthSummary(currentProjectId)
        if (!cancelled) setSummary(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [currentProjectId])

  const currentProjectKey = currentProject?.projectCode || currentProjectId
  const qs = (extra) => {
    const params = new URLSearchParams(extra)
    if (currentProjectKey) params.set('projectId', currentProjectKey)
    return `?${params.toString()}`
  }

  if (loading || !summary) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">{loading ? 'Loading project health…' : 'No project selected.'}</p>
      </div>
    )
  }

  const healthStyle = RAG_STYLES[summary.projectHealth.rag]

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3">
          <HeartPulse className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Health</h2>
          <RagDot rag={summary.projectHealth.rag} />
          <span className={`text-sm font-medium ${healthStyle ? healthStyle.text : 'text-gray-600 dark:text-gray-400'}`}>
            {healthStyle ? healthStyle.label : 'No data yet'}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          Computed from schedule/cost performance, open critical risks, and open critical issues.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={Calendar}
          title="Schedule Summary"
          rag={summary.schedule.rag}
          figures={[{ label: 'SPI', value: fmtIndex(summary.schedule.spi) }]}
          to={currentProjectKey ? `/platform/projects/${currentProjectKey}/schedule/gantt` : '/platform/projects'}
          qs=""
        />
        <SummaryCard
          icon={DollarSign}
          title="Cost Summary"
          rag={summary.cost.rag}
          figures={[
            { label: 'CPI', value: fmtIndex(summary.cost.cpi) },
            { label: 'Budget', value: fmtCurrency(summary.cost.bac) },
          ]}
          to={currentProjectKey ? `/platform/projects/${currentProjectKey}/costs` : '/platform/projects'}
          qs=""
        />
        <SummaryCard
          icon={ShieldAlert}
          title="RAID Summary"
          rag={summary.raid.rag}
          figures={[
            { label: 'Open risks', value: summary.raid.risks.total },
            { label: 'Open issues', value: summary.raid.issues.total },
          ]}
          to="/pm/controls/risk-register"
          qs={qs()}
        />
        <SummaryCard
          icon={GitPullRequest}
          title="Change Summary"
          rag={null}
          figures={[
            { label: 'Open', value: summary.change.open },
            { label: 'Pending approval', value: summary.change.pendingApproval },
          ]}
          to="/platform/change"
          qs={qs()}
        />
        <SummaryCard
          icon={CheckSquare}
          title="Quality Summary"
          rag={null}
          figures={[{ label: 'Open items', value: summary.quality.open }]}
          to="/pm/controls/quality-register"
          qs={qs()}
        />
        <SummaryCard
          icon={Bug}
          title="Testing Summary"
          rag={summary.testing.rag}
          figures={[{ label: 'Open defects', value: summary.testing.defects.total }]}
          to="/platform/testing/defects"
          qs={qs()}
        />
        <SummaryCard
          icon={Users}
          title="Resource Summary"
          rag={null}
          figures={[{ label: 'Team size', value: summary.resources.teamSize }]}
          to="/platform/resources"
          qs={qs()}
        />
      </div>
    </div>
  )
}
