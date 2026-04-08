/**
 * Practice team lead — members + functional roles (v345)
 * Route: /simulator/practice-teams/my-team
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Users, UserPlus, Pencil, Trash2, Search } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { isPmoAdmin } from '../../services/organisationRoleService'
import {
  getSimMyTeams,
  getSimAllTeamsWithMembers,
  getSimTeamMembers,
  getSimTeamFunctionalRoles,
  addSimTeamFunctionalRole,
  updateSimTeamFunctionalRole,
  deleteSimTeamFunctionalRole,
  removeSimTeamMember,
} from '../../services/sim/simTeamService'
import SimAddTeamMemberModal from '../../components/sim/SimAddTeamMemberModal'
import SimEditTeamMemberModal from '../../components/sim/SimEditTeamMemberModal'
import SimManageFunctionalRoleModal from '../../components/sim/SimManageFunctionalRoleModal'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import SortToolbar from '../../components/ui/SortToolbar'
import { useSortableTable } from '../../hooks/useSortableTable'
import { useToast } from '../../hooks/useToast'

const MEMBERS_VIEW_KEY = 'nidus-sim-my-team-members-view'
const ROLES_VIEW_KEY = 'nidus-sim-my-team-roles-view'

function readView(key, fallback = 'list') {
  try {
    const v = localStorage.getItem(key)
    if (v === 'grid' || v === 'list') return v
  } catch {
    /* ignore */
  }
  return fallback
}

export default function SimMyTeam() {
  const { showToast } = useToast()
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
  const [addOpen, setAddOpen] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [roleModal, setRoleModal] = useState(null)

  const memberSort = useSortableTable({
    defaultSort: { column: 'name', direction: 'asc' },
    storageKey: 'nidus-sim-my-team-members-sort',
  })
  const roleSort = useSortableTable({
    defaultSort: { column: 'role_label', direction: 'asc' },
    storageKey: 'nidus-sim-my-team-roles-sort',
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

    if (admin && pmoMode === 'all') {
      const res = await getSimAllTeamsWithMembers()
      if (res.success) setTeamList(res.data || [])
      else {
        setTeamList([])
        showToast('error', res.error || 'Failed to load practice teams')
      }
    } else {
      const res = await getSimMyTeams()
      if (res.success) setTeamList(res.data || [])
      else {
        setTeamList([])
        showToast('error', res.error || 'Failed to load practice teams')
      }
    }
  }, [pmoMode, showToast])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await loadTeamIndex()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadTeamIndex])

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
        getSimTeamMembers(selectedTeamId),
        getSimTeamFunctionalRoles(selectedTeamId),
      ])
      if (m.success) setMembers(m.data || [])
      else showToast('error', m.error || 'Failed to load members')
      if (r.success) setFunctionalRoles(r.data || [])
      else showToast('error', r.error || 'Failed to load roles')
    } finally {
      setMembersLoading(false)
    }
  }, [selectedTeamId, showToast])

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
      name: (row) => row.profile?.full_name || row.profile?.email || '',
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
        const u = m.profile
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
      const practiceName = t.practice_projects?.project_name || ''
      for (const fr of frs) {
        const cnt = (t.members || []).filter((m) => (m.member_role || '') === fr.role_label).length
        out.push({
          teamId: t.id,
          teamName: t.team_name,
          projectName: practiceName,
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
        name: m.profile?.full_name || '',
        email: m.profile?.email || '',
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
    if (!confirm(`Remove ${row.profile?.full_name || row.profile?.email || 'this member'} from the practice team?`)) return
    const res = await removeSimTeamMember(row.id)
    if (res.success) {
      setSuccessBanner({ op: 'removed', id: row.id })
      showToast('success', 'Member removed')
      loadMembersAndRoles()
    } else showToast('error', res.error || 'Remove failed')
  }

  const handleDeleteRole = async (fr) => {
    if (!selectedTeamId) return
    const res = await deleteSimTeamFunctionalRole(selectedTeamId, fr.id)
    if (res.success) {
      setSuccessBanner({ op: 'role_deleted', id: fr.id, label: fr.role_label })
      showToast('success', 'Functional role deleted')
      loadMembersAndRoles()
    } else showToast('error', res.error || 'Delete failed')
  }

  const onSaveNewRole = async (label) => {
    if (!selectedTeamId) return
    const res = await addSimTeamFunctionalRole(selectedTeamId, label)
    if (res.success) {
      setSuccessBanner({ op: 'role_added', id: res.data?.id, label })
      showToast('success', 'Functional role added')
      setRoleModal(null)
      loadMembersAndRoles()
    } else showToast('error', res.error || 'Save failed')
  }

  const onSaveEditRole = async (label) => {
    if (!roleModal?.row) return
    const res = await updateSimTeamFunctionalRole(roleModal.row.id, label)
    if (res.success) {
      setSuccessBanner({ op: 'role_updated', id: roleModal.row.id, label })
      showToast('success', 'Functional role updated')
      setRoleModal(null)
      loadMembersAndRoles()
    } else showToast('error', res.error || 'Save failed')
  }

  const practiceProjectId = selectedTeam?.practice_project_id
  const practiceProjectName = selectedTeam?.practice_projects?.project_name || '—'

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-400 dark:text-gray-500">
        Loading…
      </div>
    )
  }

  if (!teamList.length) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">My Practice Team</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {pmo && pmoMode === 'all'
            ? 'No active practice teams found.'
            : 'You are not the lead of any active practice team. PMO users can switch to “All teams” to manage teams visible to you.'}
        </p>
        {pmo && (
          <button
            type="button"
            onClick={() => setPmoMode(pmoMode === 'all' ? 'mine' : 'all')}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            {pmoMode === 'all' ? 'Show my teams only' : 'Show all teams'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7" />
            My Practice Team
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage members and functional role labels for practice teams you lead.
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
          {successBanner.op === 'removed' && <>membership {successBanner.id} updated.</>}
          {successBanner.op === 'member_added' && <>member added to practice team.</>}
          {successBanner.op === 'member_updated' && <>member {successBanner.id} updated.</>}
          {successBanner.op === 'role_added' && <>functional role “{successBanner.label}” added.</>}
          {successBanner.op === 'role_updated' && <>functional role updated.</>}
          {successBanner.op === 'role_deleted' && <>functional role removed.</>}
          <button type="button" className="ml-2 underline" onClick={() => setSuccessBanner(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Practice team</label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white min-h-[44px]"
          >
            {teamList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.team_name} — {t.practice_projects?.project_name || 'Practice project'}
              </option>
            ))}
          </select>
        </div>
        {selectedTeam && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>
              <span className="font-medium text-gray-800 dark:text-gray-200">Practice project:</span> {practiceProjectName}
            </span>
            <span>
              <span className="font-medium text-gray-800 dark:text-gray-200">Type:</span> {selectedTeam.team_type || '—'}
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
                baseFilename={`sim-team-members-${selectedTeam?.team_name || 'export'}`}
                disabled={!memberExportRows.length}
              />
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white min-h-[44px]"
              >
                <UserPlus className="w-4 h-4" />
                Add member
              </button>
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
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="bg-white dark:bg-gray-900">
                      <td className="px-3 py-2 text-gray-900 dark:text-white">
                        {m.profile?.full_name || m.profile?.email}
                      </td>
                      <td className="px-3 py-2">{m.member_role || '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{m.allocation_percentage ?? '—'}%</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                        {m.joined_at ? String(m.joined_at).slice(0, 10) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setEditMember(m)}
                          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 mr-1"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m)}
                          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-red-600"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredMembers.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900"
                >
                  <div className="font-medium text-gray-900 dark:text-white">{m.profile?.full_name || m.profile?.email}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.profile?.email}</div>
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">Role:</span> {m.member_role || '—'}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Allocation:</span> {m.allocation_percentage ?? '—'}%
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditMember(m)}
                      className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m)}
                      className="px-3 py-1.5 rounded border border-red-300 text-red-600 text-sm"
                    >
                      Remove
                    </button>
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
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">All practice teams — functional roles summary</h3>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 dark:text-gray-400">
                      <th className="py-1 pr-2">Team</th>
                      <th className="py-1 pr-2">Practice project</th>
                      <th className="py-1 pr-2">Role</th>
                      <th className="py-1">Using</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pmoRolesSummary.map((row, i) => (
                      <tr key={`${row.teamId}-${row.roleLabel}-${i}`} className="border-t border-gray-200 dark:border-gray-600">
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
                baseFilename={`sim-functional-roles-${selectedTeam?.team_name || 'export'}`}
                disabled={!roleExportRows.length}
              />
              <button
                type="button"
                onClick={() => setRoleModal({ mode: 'add' })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white min-h-[44px]"
              >
                Add role
              </button>
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
                  {roleRows.map((fr) => (
                    <tr key={fr.id} className="bg-white dark:bg-gray-900">
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{fr.role_label}</td>
                      <td className="px-3 py-2 tabular-nums">{fr._count}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setRoleModal({ mode: 'edit', row: fr })}
                          className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={fr._count > 0}
                          onClick={() => handleDeleteRole(fr)}
                          className="px-2 py-1 rounded border border-red-300 text-red-600 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {roleRows.map((fr) => (
                <div
                  key={fr.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900"
                >
                  <div className="font-medium text-gray-900 dark:text-white">{fr.role_label}</div>
                  <div className="text-sm text-gray-500 mt-1">Members using: {fr._count}</div>
                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setRoleModal({ mode: 'edit', row: fr })}
                      className="px-3 py-1.5 rounded border text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={fr._count > 0}
                      onClick={() => handleDeleteRole(fr)}
                      className="px-3 py-1.5 rounded border border-red-300 text-red-600 text-sm disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <SimAddTeamMemberModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        practiceTeamId={selectedTeamId}
        practiceProjectId={practiceProjectId}
        onSuccess={() => {
          setSuccessBanner({ op: 'member_added' })
          loadMembersAndRoles()
        }}
      />

      <SimEditTeamMemberModal
        isOpen={!!editMember}
        onClose={() => setEditMember(null)}
        practiceTeamId={selectedTeamId}
        member={editMember}
        onSuccess={() => {
          setSuccessBanner({ op: 'member_updated', id: editMember?.id })
          loadMembersAndRoles()
        }}
      />

      <SimManageFunctionalRoleModal
        isOpen={!!roleModal}
        onClose={() => setRoleModal(null)}
        mode={roleModal?.mode === 'edit' ? 'edit' : 'add'}
        title={roleModal?.mode === 'edit' ? 'Edit functional role' : 'Add functional role'}
        initialLabel={roleModal?.row?.role_label || ''}
        onSave={roleModal?.mode === 'edit' ? onSaveEditRole : onSaveNewRole}
      />
    </div>
  )
}
