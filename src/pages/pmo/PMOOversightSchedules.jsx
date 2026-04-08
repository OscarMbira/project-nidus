/**
 * PMO oversight — schedule management plans & activity counts (read-only).
 */

import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChartHorizontal } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import PMOOversightHeader from '../../components/pmo/PMOOversightHeader'
import ExportListMenu from '../../components/ui/ExportListMenu'

const COLS = [
  { key: 'project_name', label: 'Project' },
  { key: 'status', label: 'Schedule plan status' },
  { key: 'activity_count', label: 'Activities' },
  { key: 'updated_at', label: 'Updated' },
]

export default function PMOOversightSchedules() {
  const [plans, setPlans] = useState([])
  const [actCounts, setActCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data: planData, error: pe } = await platformDb
        .from('schedule_management_plans')
        .select('id, status, version, updated_at, project_id, project:projects(id, project_name, project_code)')
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .limit(500)

      const { data: actData, error: ae } = await platformDb
        .from('activity_list')
        .select('project_id')
        .eq('is_deleted', false)
        .limit(5000)

      if (cancelled) return

      if (pe || ae) {
        setPlans([])
        setActCounts({})
        setLoading(false)
        return
      }

      const counts = {}
      for (const row of actData || []) {
        if (!row.project_id) continue
        counts[row.project_id] = (counts[row.project_id] || 0) + 1
      }
      setActCounts(counts)

      const rows = (planData || []).map((r) => ({
        ...r,
        project_name: r.project?.project_name || r.project?.project_code || '—',
        activity_count: counts[r.project_id] ?? 0,
      }))
      setPlans(rows)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(
    () => [
      { label: 'Schedule plans', value: plans.length },
      { label: 'Tracked activities (sample)', value: Object.values(actCounts).reduce((a, b) => a + b, 0) },
    ],
    [plans.length, actCounts]
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PMOOversightHeader
        title="Schedule register (all projects)"
        description="Read-only overview of schedule management plans and activity volumes."
        icon={BarChartHorizontal}
        stats={stats}
      />

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <ExportListMenu columns={COLS} data={plans} baseFilename="PMO_schedule_plans" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-left">Plan status</th>
                  <th className="p-3 text-left">Activities</th>
                  <th className="p-3 text-left">Updated</th>
                  <th className="p-3 text-left">Open</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((r) => (
                  <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="p-3">{r.project_name}</td>
                    <td className="p-3">{r.status}</td>
                    <td className="p-3">{r.activity_count}</td>
                    <td className="p-3 text-xs">{r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}</td>
                    <td className="p-3">
                      {r.project?.id ? (
                        <Link
                          to={`/platform/projects/${r.project.id}/schedule/gantt`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Gantt
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
