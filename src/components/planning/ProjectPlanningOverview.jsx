import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { SearchCode, ClipboardList, LayoutDashboard } from 'lucide-react'
import PlanHealthScoreCard from './PlanHealthScoreCard'
import * as healthApi from '../../services/planHealthScoreService'
import * as intelApi from '../../services/planIntelligenceService'
import * as microApi from '../../services/microPlanService'
import * as govApi from '../../services/planGovernanceService'

/**
 * Phase 6 — Project overview strip: health, scan, team plans, governance (Platform project detail).
 */
export default function ProjectPlanningOverview({ projectId }) {
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [microSummary, setMicroSummary] = useState(null)
  const [govAttention, setGovAttention] = useState(0)
  const [scanning, setScanning] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    setHealthLoading(true)
    try {
      const [h, ms, gov] = await Promise.all([
        healthApi.getLatestScore(projectId).catch(() => null),
        microApi.getMicroPlanSummary(projectId).catch(() => null),
        govApi.getGovernanceFindings(projectId).catch(() => []),
      ])
      setHealth(h)
      setMicroSummary(ms)
      setGovAttention((gov || []).filter((g) => g.status === 'pending' || g.status === 'non_compliant').length)
    } catch (e) {
      console.warn('ProjectPlanningOverview:', e)
    } finally {
      setHealthLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const runScan = async () => {
    if (!projectId) return
    setScanning(true)
    try {
      const r = await intelApi.runIntelligenceScan(projectId)
      toast.success(`Intelligence scan: ${r.findingsCreated} new finding(s).`)
      load()
    } catch (e) {
      toast.error(e?.message || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const recalcHealth = async () => {
    if (!projectId) return
    try {
      const row = await healthApi.calculateScore(projectId)
      setHealth(row)
      toast.success(`Health score: ${row?.overall_score ?? '—'}`)
    } catch (e) {
      toast.error(e?.message || 'Recalculate failed')
    }
  }

  if (!projectId) return null

  const planningBase = `/pm/planning`
  const q = `?projectId=${encodeURIComponent(projectId)}`

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/80">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-blue-500" />
          Planning intelligence
        </h2>
        <Link
          to={`${planningBase}${q}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          Open planning hub →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PlanHealthScoreCard score={health} loading={healthLoading} onRecalculate={recalcHealth} />

        <div className="flex flex-col justify-center rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">Governance attention</p>
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{govAttention}</p>
          <Link to={`${planningBase}/governance${q}`} className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            View gates
          </Link>
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-900/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <ClipboardList className="h-3.5 w-3.5" /> Team micro-plans
          </p>
          <p className="text-sm text-gray-800 dark:text-gray-200">
            Total {microSummary?.total ?? '—'}
            {microSummary?.byType &&
              Object.keys(microSummary.byType).length > 0 &&
              ` · ${Object.entries(microSummary.byType)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            RAG: G {microSummary?.byRag?.green ?? 0} · A {microSummary?.byRag?.amber ?? 0} · R{' '}
            {microSummary?.byRag?.red ?? 0}
          </p>
          <Link to={`${planningBase}/microplans${q}`} className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            Open micro-plans
          </Link>
        </div>

        <div className="flex flex-col justify-center gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={runScan}
            disabled={scanning}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <SearchCode className="h-4 w-4" />
            {scanning ? 'Scanning…' : 'Run intelligence scan'}
          </button>
          <Link
            to={`${planningBase}/intelligence${q}`}
            className="text-center text-xs text-blue-600 dark:text-blue-400"
          >
            View findings
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link
          to={`${planningBase}/executive${q}`}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Executive view
        </Link>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <Link
          to={`${planningBase}/recovery${q}`}
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Recovery planning
        </Link>
      </div>
    </div>
  )
}
