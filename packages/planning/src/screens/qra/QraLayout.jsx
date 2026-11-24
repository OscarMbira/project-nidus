/**
 * v1355 — frame for quantitative risk analysis. Inside the schedule it uses the schedule
 * frame; opened on its own (Simulator menu) it has its own back control and project picker.
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { usePlanning } from '../../context/PlanningContext.jsx'
import ScheduleLayout from '../../components/ScheduleLayout.jsx'

export const QRA_HELP_KEYS = [
  'qra_settings.target_confidence', 'qra_settings.default_distribution',
  'qra_groups.name', 'qra_groups.strength',
  'task_duration_ranges.min_days', 'task_duration_ranges.ml_days', 'task_duration_ranges.max_days',
  'task_duration_ranges.distribution', 'task_duration_ranges.qra_group_id',
  'risk_task_links.task_id',
  'cost_line_ranges.line_label', 'cost_line_ranges.min_amount', 'cost_line_ranges.ml_amount',
  'cost_line_ranges.max_amount', 'cost_line_ranges.is_time_dependent', 'cost_line_ranges.daily_rate',
  'qra_runs.iterations', 'qra_runs.seed', 'qra_runs.response_basis',
]

const TABS = [
  { to: '.', label: 'Inputs', end: true },
  { to: 'run', label: 'Run' },
  { to: 'runs', label: 'Saved runs' },
  { to: 'exposure', label: 'Exposure' },
]

function Tabs({ scheduleOnly }) {
  const tabs = scheduleOnly ? TABS.filter((t) => t.to !== 'exposure') : TABS
  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 mb-4" role="tablist" aria-label="Risk analysis sections">
      {tabs.map((tab) => (
        <NavLink
          key={tab.label}
          to={tab.to}
          end={tab.end}
          data-help="exempt"
          className={({ isActive }) => `px-3 py-2 text-sm font-medium border-b-2 ${isActive ? 'border-blue-600 text-gray-900 dark:border-blue-300 dark:text-gray-100' : 'border-transparent text-gray-600 dark:text-gray-300'}`}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}

export default function QraLayout({ embedded = false }) {
  const { isSim, mode } = usePlanning()
  const scheduleOnly = mode === 'planner'
  const prefix = isSim ? 'sim' : 'public'
  const helpKeys = QRA_HELP_KEYS.map((key) => `${prefix}.${key}`)
  const body = (
    <FieldHelpScope helpKeys={helpKeys}>
      <Tabs scheduleOnly={scheduleOnly} />
      <Outlet />
    </FieldHelpScope>
  )
  if (embedded) {
    return (
      <ScheduleLayout title="Risk analysis" description="How likely the plan is to finish on time, and which uncertainties move it.">
        {body}
      </ScheduleLayout>
    )
  }
  return <Standalone title="Quantitative analysis">{body}</Standalone>
}

function Standalone({ title, children }) {
  const navigate = useNavigate()
  const { ProjectBar } = usePlanning()
  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <button type="button" onClick={() => navigate(-1)} data-help="exempt" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">How likely the plan is to meet its date and budget, and the contingency that confidence implies.</p>
      {ProjectBar ? <div className="mb-4"><ProjectBar /></div> : null}
      {children}
    </div>
  )
}
