/**
 * Team Lead — manage team members and functional roles (v345)
 * Routes: /platform/my-team (sidebar) and /platform/teams/my-team
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserPlus, Search } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { isPmoAdmin } from '../../services/organisationRoleService'
import { useCurrentProject } from '../../lib/CurrentProjectContext'
import {
  getMyTeams,
  getTeamsForProject,
  getAllTeamsWithMembers,
  getTeamMembers,
  getTeamFunctionalRoles,
  deleteTeamFunctionalRole,
  removeTeamMember,
} from '../../services/teamService'
import PermissionGate from '../../components/auth/PermissionGate'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import ViewToggle from '@nidus/ui/ViewToggle'
import SortToolbar from '@nidus/ui/SortToolbar'
import RowActionButton from '@nidus/ui/RowActionButton'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import toast from 'react-hot-toast'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

const MEMBERS_VIEW_KEY = 'nidus-my-team-members-view'
const ROLES_VIEW_KEY = 'nidus-my-team-roles-view'

const PROJECT_MANAGER_ROLE_KEYS = new Set([
  'project_manager',
  'pm_project_manager',
  'project manager',
])

function userIsProjectManager(project) {
  if (!project) return false
  const keys = project.roleKeys || []
  if (keys.some((key) => PROJECT_MANAGER_ROLE_KEYS.has(String(key || '').trim().toLowerCase()))) {
    return true
  }
  const label = String(project.roleDisplayName || '').toLowerCase()
  return label.split('/').some((part) => part.trim() === 'project manager')
}

function readView(key, fallback = 'list') {
  try {
    const v = localStorage.getItem(key)
    if (v === 'grid' || v === 'list') return v
  } catch {
    /* ignore */
  }
  return fallback
}

export default function MyTeam() {
  const navigate = useNavigate()
  const { currentProjectId, currentProject, loading: projectLoading } = useCurrentProject()
  const seesProjectTeams = Boolean(currentProjectId) && userIsProjectManager(currentProject)
  const [appUserId, setAppUserId] = useState(null)
  const [pmo, setPmo] = useState(false)
  const [pmoMode, setPmoMode] = useState('mine')
  const [loading, setLoading] = useState(true)
  const [teamList, setTeamList] = useState([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [tab, setTab] = useState('members')
  const [members, setMembers] = useState([])
  const [functionalRoles, setFunctionalRoles] = useState([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [searchMembers, setSearchMembers] = useState('')
  const [searchRoles, setSearchRoles] = useState('')
  const [memberView, setMemberView] = useState(() => readView(MEMBERS_VIEW_KEY))
  const [roleView, setRoleView] = useState(() => readView(ROLES_VIEW_KEY))
  const [successBanner, setSuccessBanner] = useState(null)

  const memberSort = useSortableTable({
    defaultSort: { column: 'name', direction: 'asc' },
    storageKey: 'nidus-my-team-members-sort',
  })
  const roleSort = useSortableTable({
    defaultSort: { column: 'role_label', direction: 'asc' },
    storageKey: 'nidus-my-team-roles-sort',
  })

  useEffect(() => {
    localStorage.setItem(MEMBERS_VIEW_KEY, memberView)
  }, [memberView])
  useEffect(() => {
    localStorage.setItem(ROLES_VIEW_KEY, roleView)
  }, [roleView])

  const loadTeamIndex = useCallback(async () => {
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user?.id) return
    const admin = await isPmoAdmin(user.id)
    setPmo(admin)
    // teams.team_lead_user_id references public.users.id (not auth uid)
    const { data: profile } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    setAppUserId(profile?.id || null)

    if (admin && pmoMode === 'all') {
      const res = await getAllTeamsWithMembers()
      if (res.success) setTeamList(res.data || [])
      else {
        setTeamList([])
        toast.error(res.error || 'Failed to load teams')
      }
    } else if (seesProjectTeams) {
      const res = await getTeamsForProject(currentProjectId)
      if (res.success) setTeamList(res.data || [])
      else {
        setTeamList([])
        toast.error(res.error || 'Failed to load teams')
      }
    } else {
      const res = await getMyTeams(user.id)
      if (res.success) setTeamList(res.data || [])
      else {
        setTeamList([])
        toast.error(res.error || 'Failed to load teams')
      }
    }
  }, [pmoMode, seesProjectTeams, currentProjectId])

  useEffect(() => {
    if (projectLoading) return undefined
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await loadTeamIndex()
      } catch (err) {
        console.error('My Team load failed:', err)
        toast.error(err.message || 'Failed to load My Team')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadTeamIndex, projectLoading])

  useEffect(() => {
    if (!teamList.length) {
      setSelectedTeamId('')
      return
    }
    setSelectedTeamId((prev) => (prev && teamList.some((t) => t.id === prev) ? prev : teamList[0].id))
  }, [teamList])

  const selectedTeam = useMemo(
    () => teamList.find((t) => t.id === selectedTeamId) || null,
    [teamList, selectedTeamId]
  )

  const loadMembersAndRoles = useCallback(async () => {
    if (!selectedTeamId) return
    setMembersLoading(true)
    try {
      const [m, r] = await Promise.all([
        getTeamMembers(selectedTeamId),
        getTeamFunctionalRoles(selectedTeamId),
      ])
      if (m.success) setMembers(m.data || [])
      else toast.error(m.error || 'Failed to load members')
      if (r.success) setFunctionalRoles(r.data || [])
      else toast.error(r.error || 'Failed to load roles')
    } finally {
      setMembersLoading(false)
    }
  }, [selectedTeamId])

  useEffect(() => {
    if (selectedTeamId) loadMembersAndRoles()
    else {
      setMembers([])
      setFunctionalRoles([])
    }
  }, [selectedTeamId, loadMembersAndRoles])

  const roleUsageCounts = useMemo(() => {
    const m = new Map()
    for (const row of members) {
      const k = row.member_role || ''
      m.set(k, (m.get(k) || 0) + 1)
    }
    return m
  }, [members])

  const memberAccessors = useMemo(
    () => ({
      name: (row) => row.users?.full_name || row.users?.email || '',
      role: (row) => row.member_role || '',
      allocation: (row) => Number(row.allocation_percentage) || 0,
      joined: (row) => row.joined_at || '',
    }),
    []
  )

  const filteredMembers = useMemo(() => {
    const q = searchMembers.trim().toLowerCase()
    let rows = members
    if (q) {
      rows = rows.filter((m) => {
        const u = m.users
        const name = (u?.full_name || u?.email || '').toLowerCase()
        const role = (m.member_role || '').toLowerCase()
        return name.includes(q) || role.includes(q)
      })
    }
    return memberSort.sortedData(rows, memberAccessors)
  }, [members, searchMembers, memberSort, memberAccessors])

  const roleRows = useMemo(() => {
    const q = searchRoles.trim().toLowerCase()
    let rows = (functionalRoles || []).map((fr) => ({
      ...fr,
      _count: roleUsageCounts.get(fr.role_label) || 0,
    }))
    if (q) rows = rows.filter((r) => (r.role_label || '').toLowerCase().includes(q))
    const accessors = {
      role_label: (r) => r.role_label || '',
      _count: (r) => r._count ?? 0,
    }
    return roleSort.sortedData(rows, accessors)
  }, [functionalRoles, roleUsageCounts, searchRoles, roleSort])

  const pmoRolesSummary = useMemo(() => {
    if (!(pmo && pmoMode === 'all' && tab === 'roles')) return []
    const out = []
    for (const t of teamList) {
      const frs = t.functionalRoles || []
      for (const fr of frs) {
        const cnt = (t.members || []).filter((m) => (m.member_role || '') === fr.role_label).length
        out.push({
          teamId: t.id,
          teamName: t.team_name,
          projectName: t.projects?.project_name || '',
          roleLabel: fr.role_label,
          count: cnt,
        })
      }
    }
    return out.sort((a, b) => (a.teamName + a.roleLabel).localeCompare(b.teamName + b.roleLabel))
  }, [pmo, pmoMode, tab, teamList])

  const memberExportColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Functional role' },
    { key: 'allocation', label: 'Allocation %' },
    { key: 'joined', label: 'Joined' },
  ]
  const memberExportRows = useMemo(
    () =>
      filteredMembers.map((m) => ({
        name: m.users?.full_name || '',
        email: m.users?.email || '',
        role: m.member_role || '',
        allocation: m.allocation_percentage ?? '',
        joined: m.joined_at ? String(m.joined_at).slice(0, 10) : '',
      })),
    [filteredMembers]
  )

  const roleExportColumns = [
    { key: 'role_label', label: 'Role label' },
    { key: 'members_using', label: 'Members using' },
  ]
  const roleExportRows = useMemo(
    () => roleRows.map((r) => ({ role_label: r.role_label, members_using: r._count })),
    [roleRows]
  )

  const handleRemoveMember = async (row) => {
    if (!confirm(`Remove ${row.users?.full_name || row.users?.email || 'this member'} from the team?`)) return
    const res = await removeTeamMember(row.id)
    if (res.success) {
      setSuccessBanner({ op: 'removed', id: row.id })
      toast.success('Member removed from team')
      loadMembersAndRoles()
    } else toast.error(res.error || 'Remove failed')
  }

  const handleDeleteRole = async (fr) => {
    if (!selectedTeamId) return
    if (fr._count > 0) {
      toast.error('Remove members from this role before deleting it')
      return
    }
    if (!confirm(`Delete functional role “${fr.role_label}”?`)) return
    const res = await deleteTeamFunctionalRole(selectedTeamId, fr.id)
    if (res.success) {
      setSuccessBanner({ op: 'role_deleted', id: fr.id, label: fr.role_label })
      toast.success('Functional role deleted')
      loadMembersAndRoles()
    } else toast.error(res.error || 'Delete failed')
  }

  const memberCreatePath = () => {
    const pid = selectedTeam?.project_id || currentProjectId || ''
    return `/platform/my-team/members/new?teamId=${encodeURIComponent(selectedTeamId)}&projectId=${encodeURIComponent(pid)}`
  }
  const memberEditPath = (id) => `/platform/my-team/members/${encodeURIComponent(id)}/edit`
  const roleCreatePath = () =>
    `/platform/my-team/roles/new?teamId=${encodeURIComponent(selectedTeamId)}`
  const roleEditPath = (id) => `/platform/my-team/roles/${encodeURIComponent(id)}/edit`

  const openProjectName = currentProject?.projectName || 'this project'
  const emptyTeamMessage = pmo && pmoMode === 'all'
    ? 'No active teams found.'
    : seesProjectTeams
      ? `No teams are recorded for ${openProjectName}.`
      : 'You are not the lead of any active team. A project manager sees every team on the open project.'

  if (loading || projectLoading || !teamList.length) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">My Team</h1>
        <div className="max-w-3xl rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-base text-gray-900 dark:text-gray-100">
            {loading || projectLoading ? 'Loading teams…' : emptyTeamMessage}
          </p>
          {!loading && !projectLoading && pmo && (
            <button
              type="button"
              onClick={() => setPmoMode(pmoMode === 'all' ? 'mine' : 'all')}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white"
            >
              {pmoMode === 'all' ? 'Show my teams only' : 'Show all teams'}
            </button>
          )}
        </div>
      </div>
    )
  }

  const projectName = selectedTeam?.projects?.project_name || '—'
  const projectId = selectedTeam?.project_id
  /** Hide project name when the header already scopes the page to one project. */
  const showProjectOnTeamPicker = !seesProjectTeams || (pmo && pmoMode === 'all')
  /** Team leads / PMs own this page; PMO "All teams" is org-wide. Others still need team.manage. */
  const canManageSelectedTeam = Boolean(
    (pmo && pmoMode === 'all') ||
    seesProjectTeams ||
    (appUserId && selectedTeam?.team_lead_user_id === appUserId)
  )
  const manageMembersUi = (node) =>
    canManageSelectedTeam
      ? node
      : <PermissionGate permission="team.manage" projectId={projectId}>{node}</PermissionGate>

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7" />
            My Team
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {seesProjectTeams
              ? 'Teams on this project.'
              : 'Manage members and functional role labels for teams you lead.'}
          </p>
        </div>
        {pmo && (
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 p-1 bg-gray-100 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setPmoMode('mine')}
              className={`px-3 py-1.5 text-sm rounded-md ${pmoMode === 'mine' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
            >
              My teams
            </button>
            <button
              type="button"
              onClick={() => setPmoMode('all')}
              className={`px-3 py-1.5 text-sm rounded-md ${pmoMode === 'all' ? 'bg-white dark:bg-gray-700 shadow' : ''}`}
            >
              All teams
            </button>
          </div>
        )}
      </div>

      {successBanner && (
        <div
          className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-4 py-3 text-sm"
          role="status"
        >
          Success:{' '}
          {successBanner.op === 'removed' && <>member record {successBanner.id} removed from team.</>}
          {successBanner.op === 'member_added' && <>member added to team.</>}
          {successBanner.op === 'member_updated' && <>member record {successBanner.id} updated.</>}
          {successBanner.op === 'role_added' && <>functional role “{successBanner.label}” added (id {successBanner.id}).</>}
          {successBanner.op === 'role_updated' && <>functional role updated (id {successBanner.id}).</>}
          {successBanner.op === 'role_deleted' && <>functional role removed.</>}
          <button type="button" className="ml-2 underline" onClick={() => setSuccessBanner(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label data-help="exempt" className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Team</label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white min-h-[44px]"
          >
            {teamList.map((t) => (
              <option key={t.id} value={t.id}>
                {showProjectOnTeamPicker
                  ? `${t.team_name} — ${t.projects?.project_name || 'Project'}`
                  : t.team_name}
              </option>
            ))}
          </select>
        </div>
        {selectedTeam && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
            {showProjectOnTeamPicker && (
              <span>
                <span className="font-medium text-gray-800 dark:text-gray-200">Project:</span> {projectName}
              </span>
            )}
            <span>
              <span className="font-medium text-gray-800 dark:text-gray-200">Type:</span>{' '}
              {selectedTeam.team_type || '—'}
            </span>
            <span>
              <span className="font-medium text-gray-800 dark:text-gray-200">Members:</span> {members.length}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setTab('members')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px min-h-[44px] ${
            tab === 'members'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Members ({members.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('roles')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px min-h-[44px] ${
            tab === 'roles'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Functional roles ({functionalRoles.length})
        </button>
      </div>

      {tab === 'members' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchMembers}
                onChange={(e) => setSearchMembers(e.target.value)}
                placeholder="Search name or role…"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 min-h-[44px]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ViewToggle value={memberView === 'grid' ? 'grid' : 'list'} onChange={(v) => setMemberView(v === 'grid' ? 'grid' : 'list')} />
              <ExportListMenu
                columns={memberExportColumns}
                data={memberExportRows}
                baseFilename={`team-members-${selectedTeam?.team_name || 'export'}`}
                disabled={!memberExportRows.length}
              />
              {manageMembersUi(
                <button
                  type="button"
                  onClick={() => navigate(memberCreatePath())}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white min-h-[44px]"
                >
                  <UserPlus className="w-4 h-4" />
                  Add member
                </button>
              )}
            </div>
          </div>

          <SortToolbar
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'role', label: 'Role' },
              { key: 'allocation', label: 'Allocation' },
              { key: 'joined', label: 'Joined' },
            ]}
            getSortDirection={memberSort.getSortDirectionForColumn}
            onSort={memberSort.handleSort}
          />

          {membersLoading ? (
            <p className="text-gray-500">Loading members…</p>
          ) : memberView === 'list' ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                <TableRowNumberHeader className="!normal-case" />
                    {['name', 'role', 'allocation', 'joined'].map((col) => (
                      <th key={col} className="text-left px-3 py-2">
                        <button
                          type="button"
                          onClick={() => memberSort.handleSort(col)}
                          className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300"
                        >
                          {col === 'name' && 'Name'}
                          {col === 'role' && 'Functional role'}
                          {col === 'allocation' && 'Allocation %'}
                          {col === 'joined' && 'Joined'}
                          <span className="text-xs tabular-nums" aria-hidden="true">
                            {memberSort.getSortDirectionForColumn(col) === 'asc' && '↑'}
                            {memberSort.getSortDirectionForColumn(col) === 'desc' && '↓'}
                            {!memberSort.getSortDirectionForColumn(col) && '⇅'}
                          </span>
                        </button>
                      </th>
                    ))}
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredMembers.map((m, index) => (
                    <tr key={m.id} className="bg-white dark:bg-gray-900">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-3 py-2 text-gray-900 dark:text-white">
                        {m.users?.full_name || m.users?.email}
                      </td>
                      <td className="px-3 py-2">{m.member_role || '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{m.allocation_percentage ?? '—'}%</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                        {m.joined_at ? String(m.joined_at).slice(0, 10) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {manageMembersUi(
                          <div className="inline-flex items-center justify-end gap-0.5">
                            <RowActionButton
                              variant="edit"
                              label="Edit member"
                              onClick={() => navigate(memberEditPath(m.id))}
                            />
                            <RowActionButton
                              variant="delete"
                              label="Remove member"
                              onClick={() => handleRemoveMember(m)}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredMembers.map((m, index) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800"
                >
                  <div className="font-medium text-gray-900 dark:text-white">{m.users?.full_name || m.users?.email}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.users?.email}</div>
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">Role:</span> {m.member_role || '—'}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Allocation:</span> {m.allocation_percentage ?? '—'}%
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                    {manageMembersUi(
                      <div className="inline-flex items-center gap-0.5">
                        <RowActionButton
                          variant="edit"
                          label="Edit member"
                          onClick={() => navigate(memberEditPath(m.id))}
                        />
                        <RowActionButton
                          variant="delete"
                          label="Remove member"
                          onClick={() => handleRemoveMember(m)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!membersLoading && filteredMembers.length === 0 && (
            <p className="text-center text-gray-500 py-8">No members match your search.</p>
          )}
        </div>
      )}

      {tab === 'roles' && (
        <div className="space-y-4">
          {pmo && pmoMode === 'all' && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">All teams — functional roles summary</h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 dark:text-gray-400">
                <TableRowNumberHeader className="!normal-case" />
                      <th className="py-1 pr-2">Team</th>
                      <th className="py-1 pr-2">Project</th>
                      <th className="py-1 pr-2">Role</th>
                      <th className="py-1">Using</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pmoRolesSummary.map((row, i) => (
                      <tr key={`${row.teamId}-${row.roleLabel}-${i}`} className="border-t border-gray-200 dark:border-gray-600">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <td className="py-1 pr-2">{row.teamName}</td>
                        <td className="py-1 pr-2">{row.projectName}</td>
                        <td className="py-1 pr-2">{row.roleLabel}</td>
                        <td className="py-1">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchRoles}
                onChange={(e) => setSearchRoles(e.target.value)}
                placeholder="Search role label…"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 min-h-[44px]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ViewToggle value={roleView === 'grid' ? 'grid' : 'list'} onChange={(v) => setRoleView(v === 'grid' ? 'grid' : 'list')} />
              <ExportListMenu
                columns={roleExportColumns}
                data={roleExportRows}
                baseFilename={`team-functional-roles-${selectedTeam?.team_name || 'export'}`}
                disabled={!roleExportRows.length}
              />
              {manageMembersUi(
                <button
                  type="button"
                  onClick={() => navigate(roleCreatePath())}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white min-h-[44px]"
                >
                  Add role
                </button>
              )}
            </div>
          </div>

          <SortToolbar
            columns={[
              { key: 'role_label', label: 'Label' },
              { key: '_count', label: 'Members' },
            ]}
            getSortDirection={roleSort.getSortDirectionForColumn}
            onSort={roleSort.handleSort}
          />

          {membersLoading ? (
            <p className="text-gray-500">Loading roles…</p>
          ) : roleView === 'list' ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                <TableRowNumberHeader className="!normal-case" />
                    <th className="text-left px-3 py-2">
                      <button
                        type="button"
                        onClick={() => roleSort.handleSort('role_label')}
                        className="inline-flex items-center gap-1 font-medium"
                      >
                        Role label
                        <span className="text-xs" aria-hidden="true">
                          {roleSort.getSortDirectionForColumn('role_label') === 'asc' && '↑'}
                          {roleSort.getSortDirectionForColumn('role_label') === 'desc' && '↓'}
                          {!roleSort.getSortDirectionForColumn('role_label') && '⇅'}
                        </span>
                      </button>
                    </th>
                    <th className="text-left px-3 py-2">
                      <button
                        type="button"
                        onClick={() => roleSort.handleSort('_count')}
                        className="inline-flex items-center gap-1 font-medium"
                      >
                        Members using
                        <span className="text-xs" aria-hidden="true">
                          {roleSort.getSortDirectionForColumn('_count') === 'asc' && '↑'}
                          {roleSort.getSortDirectionForColumn('_count') === 'desc' && '↓'}
                          {!roleSort.getSortDirectionForColumn('_count') && '⇅'}
                        </span>
                      </button>
                    </th>
                    <th className="text-right px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {roleRows.map((fr, index) => (
                    <tr key={fr.id} className="bg-white dark:bg-gray-900">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{fr.role_label}</td>
                      <td className="px-3 py-2 tabular-nums">{fr._count}</td>
                      <td className="px-3 py-2 text-right">
                        {manageMembersUi(
                          <div className="inline-flex items-center justify-end gap-0.5">
                            <RowActionButton
                              variant="edit"
                              label="Edit functional role"
                              onClick={() => navigate(roleEditPath(fr.id))}
                            />
                            <RowActionButton
                              variant="delete"
                              label={fr._count > 0 ? 'Remove members before deleting this role' : 'Delete functional role'}
                              disabled={fr._count > 0}
                              onClick={() => handleDeleteRole(fr)}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roleRows.map((fr, index) => (
                <div
                  key={fr.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800"
                >
                  <div className="font-medium text-gray-900 dark:text-white">{fr.role_label}</div>
                  <div className="text-sm text-gray-500 mt-1">Members using: {fr._count}</div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                    {manageMembersUi(
                      <div className="inline-flex items-center gap-0.5">
                        <RowActionButton
                          variant="edit"
                          label="Edit functional role"
                          onClick={() => navigate(roleEditPath(fr.id))}
                        />
                        <RowActionButton
                          variant="delete"
                          label={fr._count > 0 ? 'Remove members before deleting this role' : 'Delete functional role'}
                          disabled={fr._count > 0}
                          onClick={() => handleDeleteRole(fr)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
