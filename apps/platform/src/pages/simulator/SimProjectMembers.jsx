/**
 * Simulator — manage practice project members (direct add, no invitations)
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Users, UserPlus, Edit, Trash2, Loader } from 'lucide-react'
import {
  getSimUserPracticeProjects,
  getSimProjectMembers,
  addSimProjectMember,
  updateSimMemberRole,
  removeSimProjectMember,
  getSimAssignableRoles,
} from '../../services/sim/simProjectMembershipService'
import { useToast } from '../../hooks/useToast'
import { useSortableTable } from '../../hooks/useSortableTable'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { useViewMode } from '../../hooks/useViewMode'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import SimAddMemberModal from '../../components/sim/SimAddMemberModal'
import SimEditMemberRoleModal from '../../components/sim/SimEditMemberRoleModal'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

const STORAGE_SORT = 'nidus-sim-project-members-sort'
const EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'joined', label: 'Joined' },
]

export default function SimProjectMembers() {
  const { showToast } = useToast()
  const assignableRoles = useMemo(() => getSimAssignableRoles(), [])
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [successBanner, setSuccessBanner] = useState(null)
  const [viewMode, setViewMode] = useViewMode('sim-project-members', 'list')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'name', direction: 'asc' },
    storageKey: STORAGE_SORT,
  })

  const loadProjects = useCallback(async () => {
    const res = await getSimUserPracticeProjects()
    if (res.success) {
      const list = res.data || []
      setProjects(list)
      setProjectId((prev) => {
        if (prev) return prev
        if (list.length === 1) return list[0].id
        return prev
      })
    } else {
      showToast('error', res.error || 'Failed to load projects')
    }
  }, [showToast])

  const loadMembers = useCallback(async () => {
    if (!projectId) {
      setMembers([])
      return
    }
    setLoading(true)
    try {
      const res = await getSimProjectMembers(projectId)
      if (res.success) setMembers(res.data || [])
      else showToast('error', res.error || 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [projectId, showToast])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const rows = useMemo(() => {
    return (members || []).map((m) => ({
      ...m,
      name: m.profile?.full_name || m.profile?.email || 'User',
      email: m.profile?.email || '',
      role: m.role_name,
      joined: m.joined_at || m.created_at,
    }))
  }, [members])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    if (!t) return rows
    return rows.filter(
      (r) =>
        String(r.name).toLowerCase().includes(t) || String(r.email).toLowerCase().includes(t)
    )
  }, [rows, search])

  const accessors = useMemo(
    () => ({
      name: (r) => r.name,
      role: (r) => r.role,
      joined: (r) => (r.joined ? new Date(r.joined).getTime() : 0),
    }),
    []
  )

  const displayRows = sortedData(filtered, accessors)

  const exportData = useMemo(
    () =>
      displayRows.map((r) => ({
        name: r.name,
        email: r.email,
        role: r.role,
        joined: r.joined ? new Date(r.joined).toLocaleDateString() : '',
      })),
    [displayRows]
  )

  const sortIndicator = (col) => {
    const d = getSortDirectionForColumn(col)
    if (d === 'asc') return '↑'
    if (d === 'desc') return '↓'
    return '⇅'
  }

  const onRemove = async (m) => {
    const name = m.profile?.full_name || m.profile?.email || 'Member'
    if (!window.confirm(`Remove ${name} from this practice project?`)) return
    const res = await removeSimProjectMember(m.id)
    if (res.success) {
      setSuccessBanner({ action: 'Removed member', detail: name })
      showToast('success', 'Member removed')
      loadMembers()
    } else showToast('error', res.error || 'Remove failed')
  }

  const onAdd = async (authUserId, roleName) => {
    const res = await addSimProjectMember(projectId, authUserId, roleName)
    if (res.success) {
      setSuccessBanner({ action: 'Member added', detail: roleName })
      showToast('success', 'Member added')
      setShowAdd(false)
      loadMembers()
    } else showToast('error', res.error || 'Add failed')
  }

  const onEditSave = async (roleName) => {
    if (!editRow) return
    const res = await updateSimMemberRole(editRow.id, roleName)
    if (res.success) {
      setSuccessBanner({ action: 'Role updated', detail: editRow.profile?.email || '' })
      showToast('success', 'Role updated')
      setEditRow(null)
      loadMembers()
    } else showToast('error', res.error || 'Update failed')
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 text-gray-900 dark:text-white">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-7 h-7" />
          Practice project members
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Add or manage members on your practice projects (simulator).
        </p>
      </div>

      {successBanner && (
        <div
          className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-900 dark:text-green-100"
          role="status"
        >
          <strong>{successBanner.action}</strong>
          {successBanner.detail ? ` — ${successBanner.detail}` : ''}
          <button type="button" className="ml-3 underline" onClick={() => setSuccessBanner(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
        <label className="flex-1 block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Practice project</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} {p.project_code ? `(${p.project_code})` : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!projectId}
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <UserPlus className="w-4 h-4" />
          Add member
        </button>
      </div>

      {!projectId ? (
        <p className="text-gray-500 dark:text-gray-400">Select a practice project to manage members.</p>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="w-full md:max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Member list layout" />
              <ExportListMenu columns={EXPORT_COLS} data={exportData} baseFilename="SimProjectMembers" />
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {displayRows.map((m, index) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
                >
                  <div className="font-medium">{m.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{m.email}</div>
                  <div className="text-xs text-violet-600 dark:text-violet-400 mt-2">{m.role_name}</div>
                  <div className="flex gap-2 mt-3">
                  <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                    <button
                      type="button"
                      onClick={() => setEditRow(m)}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(m)}
                      className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                <TableRowNumberHeader className="!normal-case" />
                    <th className="text-left px-4 py-2">
                      <button type="button" className="font-semibold inline-flex items-center gap-1" onClick={() => handleSort('name')}>
                        Name {sortIndicator('name')}
                      </button>
                    </th>
                    <th className="text-left px-4 py-2">Email</th>
                    <th className="text-left px-4 py-2">
                      <button type="button" className="font-semibold inline-flex items-center gap-1" onClick={() => handleSort('role')}>
                        Role {sortIndicator('role')}
                      </button>
                    </th>
                    <th className="text-left px-4 py-2">
                      <button type="button" className="font-semibold inline-flex items-center gap-1" onClick={() => handleSort('joined')}>
                        Joined {sortIndicator('joined')}
                      </button>
                    </th>
                    <th className="text-right px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((m, index) => (
                    <tr key={m.id} className="border-t border-gray-200 dark:border-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-4 py-3">{m.name}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{m.email}</td>
                      <td className="px-4 py-3">{m.role_name}</td>
                      <td className="px-4 py-3">
                        {m.joined ? new Date(m.joined).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button type="button" className="text-blue-600 dark:text-blue-400" onClick={() => setEditRow(m)}>
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        <button type="button" className="text-red-600 dark:text-red-400" onClick={() => onRemove(m)}>
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <SimAddMemberModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        assignableRoles={assignableRoles}
        onAdd={onAdd}
      />
      <SimEditMemberRoleModal
        isOpen={!!editRow}
        onClose={() => setEditRow(null)}
        memberLabel={editRow ? `${editRow.profile?.full_name || ''} (${editRow.profile?.email || ''})` : ''}
        assignableRoles={assignableRoles}
        currentRoleName={editRow?.role_name}
        onSave={onEditSave}
      />
    </div>
  )
}
