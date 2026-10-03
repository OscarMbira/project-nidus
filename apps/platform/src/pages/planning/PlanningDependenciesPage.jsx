/**
 * Planning > Dependencies (taxonomy §3, Planning > Dependencies: Internal/External/Owners/
 * Escalations). "Internal" = task-to-task dependencies within this project (activity_dependencies,
 * same data as Schedule > Network); "External" = this project's dependencies on/from other
 * projects (inter_project_dependencies, dependencyService.js). Reuses both existing, already-live
 * data sources rather than inventing a new table.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { listActivities } from '../../services/activityListService'
import { listDependencies as listActivityDependencies } from '../../services/activityDependencyService'
import { getProjectDependencies } from '../../services/dependencyService'

const STATUS_COLORS = {
  identified: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  active:     'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  at_risk:    'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  blocked:    'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  resolved:   'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] || STATUS_COLORS.identified}`}>
      {(status || 'identified').replace('_', ' ')}
    </span>
  )
}

export default function PlanningDependenciesPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [tab, setTab] = useState('internal')
  const [loading, setLoading] = useState(true)
  const [internalRows, setInternalRows] = useState([])
  const [activityById, setActivityById] = useState(new Map())
  const [external, setExternal] = useState({ outgoing: [], incoming: [] })

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const [deps, activities, extDeps] = await Promise.all([
        listActivityDependencies(projectId),
        listActivities(projectId),
        getProjectDependencies(projectId),
      ])
      setInternalRows(deps)
      setActivityById(new Map(activities.map((a) => [a.id, a])))
      setExternal(extDeps)
    } catch (e) {
      toast.error(e?.message || 'Failed to load dependencies')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''

  const allExternal = useMemo(() => [...(external.outgoing || []), ...(external.incoming || [])], [external])
  const escalations = useMemo(
    () => allExternal.filter((d) => d.dependency_status === 'blocked' || d.dependency_status === 'at_risk' || d.dependency_criticality === 'critical'),
    [allExternal]
  )
  const owners = useMemo(() => {
    const map = new Map()
    for (const d of allExternal) {
      const owner = d.dependency_owner?.full_name || d.dependency_owner?.email || 'Unassigned'
      if (!map.has(owner)) map.set(owner, [])
      map.get(owner).push(d)
    }
    return [...map.entries()]
  }, [allExternal])

  const tabs = [
    { key: 'internal', label: 'Internal', count: internalRows.length },
    { key: 'external', label: 'External', count: allExternal.length },
    { key: 'owners', label: 'Owners', count: owners.length },
    { key: 'escalations', label: 'Escalations', count: escalations.length },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Dependencies
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Internal (task-to-task) and external (cross-project) dependencies</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-fit">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              {t.label}
              {t.count > 0 && <span className="text-xs opacity-70">({t.count})</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : tab === 'internal' ? (
          internalRows.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
              <p>No internal (task-to-task) dependencies yet.</p>
              <Link to={`/platform/schedule/dependencies${projectSuffix}`} className="text-blue-600 dark:text-blue-400 text-sm hover:underline mt-2 inline-block">Add one in the Network view →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left">Predecessor</th>
                    <th className="px-4 py-2 text-left">Successor</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Lag (days)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {internalRows.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-2">{activityById.get(d.predecessor_activity_id)?.name || '—'}</td>
                      <td className="px-4 py-2">{activityById.get(d.successor_activity_id)?.name || '—'}</td>
                      <td className="px-4 py-2 font-mono text-xs">{d.dependency_type}</td>
                      <td className="px-4 py-2 capitalize">{d.dependency_category || '—'}</td>
                      <td className="px-4 py-2 tabular-nums">{d.lag_days ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : tab === 'external' ? (
          allExternal.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
              <p>No external (cross-project) dependencies yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allExternal.map((d) => (
                <div key={d.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{d.dependency_name || d.dependency_code}</p>
                    <StatusBadge status={d.dependency_status} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {d.source_project?.project_name || '—'} → {d.target_project?.project_name || '—'}
                  </p>
                </div>
              ))}
            </div>
          )
        ) : tab === 'owners' ? (
          owners.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
              <p>No dependency owners yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {owners.map(([owner, deps]) => (
                <div key={owner} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                  <h3 className="text-sm font-semibold mb-2">{owner}</h3>
                  <ul className="space-y-1">
                    {deps.map((d) => (
                      <li key={d.id} className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
                        <span>{d.dependency_name || d.dependency_code}</span>
                        <StatusBadge status={d.dependency_status} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        ) : (
          escalations.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
              <p>No blocked, at-risk, or critical dependencies right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {escalations.map((d) => (
                <div key={d.id} className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{d.dependency_name || d.dependency_code}</p>
                    <StatusBadge status={d.dependency_status} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Owner: {d.dependency_owner?.full_name || d.dependency_owner?.email || 'Unassigned'} · Criticality: {d.dependency_criticality || '—'}
                  </p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
