/**
 * Team Structure — project team grouped by role (taxonomy §3, Project Setup >
 * Project Team > Team Structure). Read-only overview; membership is managed on
 * Team Members. Cards link through for easy navigation.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Network, User, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getProjectOrgStructure } from '../../services/projectOrgStructureService'

export default function ProjectOrgStructurePage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const teamsHref = useMemo(() => {
    const key = routeKey || projectId
    return key
      ? `/platform/teams?projectId=${encodeURIComponent(key)}`
      : '/platform/teams'
  }, [routeKey, projectId])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getProjectOrgStructure(projectId)
      setMembers(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load team structure')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const groups = members.reduce((acc, m) => {
    const label = m.role?.role_display_name || m.role?.role_name || 'Unassigned role'
    if (!acc[label]) acc[label] = []
    acc[label].push(m)
    return acc
  }, {})

  const sortedGroupEntries = Object.entries(groups).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  )

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Network className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Team Structure
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Project team grouped by role — open a person or role to manage membership on Team Members.
            </p>
          </div>
          <Link
            to={teamsHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[40px]"
          >
            Team Members
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {!projectId ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-8 text-center text-sm text-gray-600 dark:text-gray-300">
            Select a project to view its team structure.
          </div>
        ) : loading ? (
          <p className="text-gray-600 dark:text-gray-300">Loading…</p>
        ) : members.length === 0 ? (
          <div className="text-center py-16 text-gray-600 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <Network className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No project team members yet.</p>
            <Link
              to={teamsHref}
              className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Go to Team Members
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedGroupEntries.map(([roleLabel, roleMembers]) => (
              <div
                key={roleLabel}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {roleLabel}
                    <span className="ml-2 font-normal text-gray-600 dark:text-gray-300">
                      ({roleMembers.length})
                    </span>
                  </h2>
                  <Link
                    to={teamsHref}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    Manage
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roleMembers.map((m) => (
                    <Link
                      key={m.user_id}
                      to={teamsHref}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <User className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {m.users?.full_name || m.users?.email || 'Unknown'}
                        </p>
                        {m.users?.email && (
                          <p className="text-xs text-gray-700 dark:text-gray-200 truncate">{m.users.email}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
