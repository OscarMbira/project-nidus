/**
 * PMO oversight — scope management plans & scope statements (read-only list).
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import PMOOversightHeader from '../../components/pmo/PMOOversightHeader'
import ExportListMenu from '../../components/ui/ExportListMenu'

const PLAN_COLS = [
  { key: 'project_name', label: 'Project' },
  { key: 'status', label: 'Plan status' },
  { key: 'version', label: 'Version' },
  { key: 'updated_at', label: 'Updated' },
]

const STMT_COLS = [
  { key: 'project_name', label: 'Project' },
  { key: 'status', label: 'Statement status' },
  { key: 'version', label: 'Version' },
  { key: 'updated_at', label: 'Updated' },
]

export default function PMOOversightScope() {
  const [plans, setPlans] = useState([])
  const [stmts, setStmts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [p, s] = await Promise.all([
        platformDb
          .from('scope_management_plans')
          .select('id, status, version, updated_at, project:projects(id, project_name, project_code)')
          .eq('is_deleted', false)
          .order('updated_at', { ascending: false })
          .limit(500),
        platformDb
          .from('scope_statements')
          .select('id, status, version, updated_at, project:projects(id, project_name, project_code)')
          .eq('is_deleted', false)
          .order('updated_at', { ascending: false })
          .limit(500),
      ])
      if (cancelled) return
      const planRows = (p.data || []).map((r) => ({
        ...r,
        project_name: r.project?.project_name || r.project?.project_code || '—',
      }))
      const stmtRows = (s.data || []).map((r) => ({
        ...r,
        project_name: r.project?.project_name || r.project?.project_code || '—',
      }))
      setPlans(planRows)
      setStmts(stmtRows)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PMOOversightHeader
        title="Scope register (all projects)"
        description="Read-only overview of scope management plans and scope statements."
        icon={FileText}
        stats={[
          { label: 'Scope plans', value: plans.length },
          { label: 'Scope statements', value: stmts.length },
        ]}
      />

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <>
          <div className="mb-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scope management plans</h2>
              <ExportListMenu columns={PLAN_COLS} data={plans} baseFilename="PMO_scope_plans" />
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="p-3 text-left">Project</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Version</th>
                    <th className="p-3 text-left">Updated</th>
                    <th className="p-3 text-left">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((r) => (
                    <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-3">{r.project_name}</td>
                      <td className="p-3">{r.status}</td>
                      <td className="p-3">{r.version}</td>
                      <td className="p-3 text-xs">{r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}</td>
                      <td className="p-3">
                        {r.project?.id ? (
                          <Link
                            to={`/platform/projects/${r.project.id}/scope/management-plan`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            View
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
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scope statements</h2>
              <ExportListMenu columns={STMT_COLS} data={stmts} baseFilename="PMO_scope_statements" />
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="p-3 text-left">Project</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Version</th>
                    <th className="p-3 text-left">Updated</th>
                    <th className="p-3 text-left">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {stmts.map((r) => (
                    <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-3">{r.project_name}</td>
                      <td className="p-3">{r.status}</td>
                      <td className="p-3">{r.version}</td>
                      <td className="p-3 text-xs">{r.updated_at ? new Date(r.updated_at).toLocaleString() : '—'}</td>
                      <td className="p-3">
                        {r.project?.id ? (
                          <Link
                            to={`/platform/projects/${r.project.id}/scope/statement`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            View
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
          </div>
        </>
      )}
    </div>
  )
}
