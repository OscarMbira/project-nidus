import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  SearchCode,
  GitBranch,
  PackageOpen,
  HeartPulse,
  Sparkles,
  Presentation,
  RefreshCcw,
  TrendingUp,
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PlanningProjectBar, { usePlanningProjectId } from '../../components/planning/PlanningProjectBar'
import PlanHealthScoreCard from '../../components/planning/PlanHealthScoreCard'
import * as healthApi from '../../services/planHealthScoreService'
import * as intelApi from '../../services/planIntelligenceService'
import * as scenarioApi from '../../services/planScenarioService'
import * as govApi from '../../services/planGovernanceService'
import * as microApi from '../../services/microPlanService'
import * as collisionApi from '../../services/planCollisionService'
import { platformDb } from '../../services/supabase/supabaseClient'

const EXEC_KEY = 'nidus-planning-exec-mode'

export default function PlanningHub() {
  const location = useLocation()
  const isSim = location.pathname.includes('/simulator/')
  const base = isSim ? '/simulator/pm/planning' : '/pm/planning'
  const projectId = usePlanningProjectId()
  const [exec, setExec] = useState(() => localStorage.getItem(EXEC_KEY) === '1')
  const [health, setHealth] = useState(null)
  const [findingsOpen, setFindingsOpen] = useState(0)
  const [scenarios, setScenarios] = useState(0)
  const [govPending, setGovPending] = useState(0)
  const [microCount, setMicroCount] = useState(0)
  const [collisionCount, setCollisionCount] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem(EXEC_KEY, exec ? '1' : '0')
  }, [exec])

  useEffect(() => {
    if (!projectId) {
      setHealth(null)
      setFindingsOpen(0)
      setScenarios(0)
      setGovPending(0)
      setMicroCount(0)
      return
    }
    let c = false
    ;(async () => {
      setLoading(true)
      try {
        if (isSim) {
          setHealth(null)
          setFindingsOpen(0)
          setScenarios(0)
          setGovPending(0)
          setMicroCount(0)
          return
        }
        const [h, finds, sc, gov, micro] = await Promise.all([
          healthApi.getLatestScore(projectId).catch(() => null),
          intelApi.getFindings(projectId, { status: 'open' }).catch(() => []),
          scenarioApi.getScenarios(projectId).catch(() => []),
          govApi.getGovernanceFindings(projectId).catch(() => []),
          microApi.getMicroPlans(projectId).catch(() => []),
        ])
        if (c) return
        setHealth(h)
        setFindingsOpen((finds || []).filter((f) => f.severity !== 'info').length)
        setScenarios((sc || []).filter((s) => s.status !== 'archived').length)
        setGovPending((gov || []).filter((g) => g.status === 'pending' || g.status === 'non_compliant').length)
        setMicroCount((micro || []).length)

        const { data: proj } = await platformDb.from('projects').select('organisation_id').eq('id', projectId).single()
        if (proj?.organisation_id) {
          const alerts = await collisionApi.getCollisionAlerts(proj.organisation_id, { status: 'open' }).catch(() => [])
          if (!c) setCollisionCount((alerts || []).length)
        }
      } catch (e) {
        toast.error(e?.message || 'Failed to load planning summary')
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [projectId, isSim])

  const tiles = [
    { to: `${base}/intelligence`, label: 'Plan intelligence', icon: SearchCode, desc: 'Quality findings & scans' },
    { to: `${base}/scenarios`, label: 'Scenarios', icon: GitBranch, desc: 'What-if schedules' },
    { to: `${base}/pbs`, label: 'Product plan (PBS)', icon: PackageOpen, desc: 'Product breakdown' },
    { to: `${base}/health`, label: 'Plan health', icon: HeartPulse, desc: '10-dimension score' },
    { to: `${base}/ai`, label: 'AI plan generator', icon: Sparkles, desc: 'Guided plan draft' },
    { to: `${base}/executive`, label: 'Executive view', icon: Presentation, desc: 'Decision summary' },
    { to: `${base}/recovery`, label: 'Recovery planning', icon: RefreshCcw, desc: 'Delay strategies' },
    { to: `${base}/confidence`, label: 'Confidence forecast', icon: TrendingUp, desc: '3-point estimates' },
    { to: `${base}/governance`, label: 'Governance gates', icon: ShieldCheck, desc: 'Gate compliance' },
    { to: `${base}/microplans`, label: 'Team micro-plans', icon: ClipboardList, desc: 'Sub-plans & activities' },
  ]

  if (!isSim) {
    tiles.push({
      to: '/pmo/planning/collisions',
      label: 'Portfolio collisions',
      icon: AlertTriangle,
      desc: 'PMO: cross-project conflicts',
    })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
              <LayoutDashboard className="w-7 h-7 text-blue-400" />
              Planning hub
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Intelligence, scenarios, health, AI, governance, and team micro-plans.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2">
            <span className="text-xs text-gray-400">Mode</span>
            <button
              type="button"
              onClick={() => setExec(false)}
              className={`text-xs px-2 py-1 rounded ${!exec ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Planner
            </button>
            <button
              type="button"
              onClick={() => setExec(true)}
              className={`text-xs px-2 py-1 rounded ${exec ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Executive
            </button>
          </div>
        </div>

        <PlanningProjectBar isSim={isSim} />

        {!projectId && (
          <p className="text-amber-400/90 text-sm mb-6">Select a project to load planning indicators and sub-modules.</p>
        )}

        {projectId && !isSim && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <PlanHealthScoreCard
              score={health}
              loading={loading}
              onRecalculate={async () => {
                try {
                  const row = await healthApi.calculateScore(projectId)
                  setHealth(row)
                  toast.success(`Health score recorded: ${row?.overall_score ?? '—'}`)
                } catch (e) {
                  toast.error(e?.message || 'Recalculate failed')
                }
              }}
            />
            <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4">
              <div className="text-sm text-gray-400">Open findings</div>
              <div className="text-2xl font-semibold text-amber-400">{findingsOpen}</div>
            </div>
            <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4">
              <div className="text-sm text-gray-400">Active scenarios</div>
              <div className="text-2xl font-semibold text-blue-400">{scenarios}</div>
            </div>
            <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4">
              <div className="text-sm text-gray-400">Governance attention</div>
              <div className="text-2xl font-semibold text-red-400">{govPending}</div>
            </div>
            <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4">
              <div className="text-sm text-gray-400">Team micro-plans</div>
              <div className="text-2xl font-semibold text-emerald-400">{microCount}</div>
            </div>
            {collisionCount != null && (
              <div className="rounded-xl border border-gray-700 bg-gray-900/80 p-4">
                <div className="text-sm text-gray-400">Open collisions (org)</div>
                <div className="text-2xl font-semibold text-orange-400">{collisionCount}</div>
              </div>
            )}
          </div>
        )}

        {exec && projectId && (
          <div className="mb-6 rounded-lg border border-blue-800/50 bg-blue-950/40 px-4 py-3 text-sm text-blue-200">
            Executive mode is on. Use the Executive view for a summary layout. Preference is saved in this browser.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tiles.map(({ to, label, icon: Icon, desc }) => (
            <Link
              key={to}
              to={projectId ? `${to}?projectId=${projectId}` : to}
              className="flex gap-3 rounded-xl border border-gray-700 bg-gray-900/60 hover:border-blue-600/60 hover:bg-gray-900 p-4 transition-colors"
            >
              <Icon className="w-8 h-8 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-white">{label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
