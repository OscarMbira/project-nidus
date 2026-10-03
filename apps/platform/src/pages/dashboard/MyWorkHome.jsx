/**
 * My Work Home (v982 Phase 7 — Main Application Zones, brief §21; extended v982 Phase 7 follow-up)
 * The one genuinely new zone this phase introduces (decision 3) — a personal, cross-project
 * landing page combining (a) every project the signed-in user has a role on, and (b) every open
 * RAID item (risk/assumption/issue/dependency) they own, across every one of those projects.
 *
 * SCOPE NOTE (documented, not silent — see the Phase 7 plan file's Review section): (b) covers
 * risks/assumptions/issues/dependencies via the existing unified `raid_log` view
 * (myWorkService.js's own header explains why that one was cheap to add safely). It does NOT yet
 * cover governance actions (no cross-project "assigned to me" query exists for those yet —
 * getGovernanceActions() is project-scoped only) or task assignments (no unified cross-project
 * "my tasks" view was found). Both remain real gaps, not silently declared covered. All content
 * here is real, DB-driven (rule 25.1/26 — no mock data).
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, ArrowRight, ListChecks } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { getCurrentUserInternalUserId } from '@nidus/shared/utils/accountResolution'
import { getUserProjectRoles } from '../../services/roleService'
import { getMyOpenRaidItems } from '../../services/myWorkService'

const RAID_TYPE_LABEL = { risk: 'Risk', issue: 'Issue', assumption: 'Assumption', dependency: 'Dependency' }

export default function MyWorkHome() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [raidItems, setRaidItems] = useState([])
  const [raidLoading, setRaidLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const {
        data: { user },
      } = await platformDb.auth.getUser()
      if (!user) {
        if (!cancelled) { setLoading(false); setRaidLoading(false) }
        return
      }
      const result = await getUserProjectRoles(user.id)
      if (cancelled) return
      if (!result.success) {
        setError(result.error)
        setLoading(false)
        setRaidLoading(false)
        return
      }
      // De-dupe by project_id (a project can carry more than one active membership row for the
      // same user — same convention CurrentProjectContext.jsx already uses).
      const byProjectId = new Map()
      for (const row of result.data) {
        if (!row.projects) continue
        const existing = byProjectId.get(row.project_id)
        const roleLabel = row.project_roles?.role_display_name || row.project_roles?.role_name
        if (existing) {
          if (roleLabel && !existing.roles.includes(roleLabel)) existing.roles.push(roleLabel)
        } else {
          byProjectId.set(row.project_id, {
            projectId: row.project_id,
            projectName: row.projects.project_name,
            projectCode: row.projects.project_code,
            roles: roleLabel ? [roleLabel] : [],
          })
        }
      }
      setProjects([...byProjectId.values()].sort((a, b) => String(a.projectName || '').localeCompare(String(b.projectName || ''))))
      setLoading(false)

      // Independent of the project-membership fetch above — a separate, own-scoped query, so a
      // slow/failing RAID fetch never blocks "My Projects" from painting.
      const internalUserId = await getCurrentUserInternalUserId()
      const raidRes = await getMyOpenRaidItems(internalUserId)
      if (!cancelled) {
        setRaidItems(raidRes.success ? raidRes.data : [])
        setRaidLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const openProject = (project) => {
    const key = project.projectCode || project.projectId
    navigate(`/pm/dashboard?projectId=${encodeURIComponent(key)}`)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Work</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Every project you have a role on, in one place.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">My Projects</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Briefcase className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You're not a member of any project yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.projectId}
                type="button"
                onClick={() => openProject(project)}
                className="w-full flex items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{project.projectName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {project.projectCode ? `${project.projectCode} · ` : ''}{project.roles.join(', ') || 'Member'}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Assigned to You</h2>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          {raidLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : raidItems.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-gray-400" />
              No open risks, issues, assumptions, or dependencies are assigned to you right now.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {raidItems.map((item) => (
                <li key={`${item.raid_type}-${item.id}`} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <span className="inline-block px-1.5 py-0.5 mr-2 text-[10px] font-semibold uppercase rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {RAID_TYPE_LABEL[item.raid_type] || item.raid_type}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.title}</span>
                  </div>
                  {item.projects?.project_name && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{item.projects.project_name}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
