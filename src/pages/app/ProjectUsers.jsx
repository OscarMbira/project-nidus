/**
 * Project Users — members, invitations, seats (Platform)
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getProjectMembers,
  getProjectInvitations,
  getProjectInviteContext,
  resendInvitation,
  cancelInvitation,
  updateMemberRole,
  removeMemberFromProject,
  listProjectsForMemberManagement,
} from '../../services/projectMembershipService'
import { getProjectSeatAllocation } from '../../services/seatManagementService'
import { getProjectManagerAssignableRoles } from '../../services/projectRoleAssignmentService'
import { platformDb } from '../../services/supabase/supabaseClient'
import InviteUserForm from '../../components/app/InviteUserForm'
import EditMemberRoleModal from '../../components/app/EditMemberRoleModal'
import SeatUsageWidget from '../../components/app/SeatUsageWidget'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import { useSortableTable } from '../../hooks/useSortableTable'
import { useViewMode } from '../../hooks/useViewMode'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId'
import {
  Users,
  UserPlus,
  Mail,
  Edit,
  Trash2,
  Loader,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import PermissionGate from '../../components/auth/PermissionGate'
import { isPmoAdmin } from '../../services/organisationRoleService'

const STORAGE_SORT = 'nidus-platform-project-users-sort'
const EXPORT_COLS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'joined', label: 'Joined' },
]

export default function ProjectUsers() {
  const { projectId: routeProjectId } = usePlatformProjectId()
  const [searchParams, setSearchParams] = useSearchParams()
  const qpProject = searchParams.get('project')
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [sessionUser, setSessionUser] = useState({ internalId: null, authId: null })
  const [projectList, setProjectList] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [seatAllocation, setSeatAllocation] = useState(null)
  const [showInviteSection, setShowInviteSection] = useState(false)
  const [assignableRoles, setAssignableRoles] = useState([])
  const [editMember, setEditMember] = useState(null)
  const [search, setSearch] = useState('')
  const [successBanner, setSuccessBanner] = useState(null)
  const [viewMode, setViewMode] = useViewMode('platform-project-users', 'list')
  const [isPmoAdminUser, setIsPmoAdminUser] = useState(false)

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'name', direction: 'asc' },
    storageKey: STORAGE_SORT,
  })

  const effectiveProjectId = routeProjectId || selectedProjectId || qpProject || ''

  const resolveSession = useCallback(async () => {
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user?.id) return
    const { data: row } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    setSessionUser({ authId: user.id, internalId: row?.id || null })
  }, [])

  useEffect(() => {
    resolveSession()
  }, [resolveSession])

  useEffect(() => {
    if (!sessionUser.authId) {
      setIsPmoAdminUser(false)
      return
    }
    let cancelled = false
    isPmoAdmin(sessionUser.authId).then((v) => {
      if (!cancelled) setIsPmoAdminUser(!!v)
    })
    return () => {
      cancelled = true
    }
  }, [sessionUser.authId])

  useEffect(() => {
    if (!sessionUser.internalId || !sessionUser.authId) return
    ;(async () => {
      const res = await listProjectsForMemberManagement(sessionUser.internalId, sessionUser.authId)
      if (res.success) setProjectList(res.data || [])
      else {
        setProjectList([])
        showToast('error', res.error || 'Failed to load project list')
      }
    })()
  }, [sessionUser, showToast])

  useEffect(() => {
    if (!qpProject || routeProjectId || projectList.length === 0) return
    const exists = projectList.some((p) => p.id === qpProject)
    if (!exists) {
      setSearchParams({})
      setSelectedProjectId('')
    }
  }, [qpProject, routeProjectId, projectList, setSearchParams])

  useEffect(() => {
    if (qpProject && !routeProjectId) setSelectedProjectId(qpProject)
  }, [qpProject, routeProjectId])

  useEffect(() => {
    if (routeProjectId) setSelectedProjectId(routeProjectId)
  }, [routeProjectId])

  useEffect(() => {
    setShowInviteSection(false)
  }, [effectiveProjectId])

  const loadData = useCallback(async () => {
    if (!effectiveProjectId) {
      setMembers([])
      setInvitations([])
      setSeatAllocation(null)
      setLoading(false)
      return
    }

    // If project picker is active, only load details for projects user can actually access.
    if (!routeProjectId && projectList.length > 0 && !projectList.some((p) => p.id === effectiveProjectId)) {
      setMembers([])
      setInvitations([])
      setSeatAllocation(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [membersResult, rolesResult] = await Promise.all([
        getProjectMembers(effectiveProjectId),
        getProjectManagerAssignableRoles(),
      ])
      if (membersResult.success) setMembers(membersResult.data || [])
      else setMembers([])
      // Invitations and seat allocation are loaded lazily to avoid noisy RLS failures on page load.
      setInvitations([])
      setSeatAllocation(null)
      if (rolesResult.success) setAssignableRoles(rolesResult.data || [])
      else setAssignableRoles([])
    } catch (e) {
      console.error(e)
      showToast('error', 'Failed to load project users')
    } finally {
      setLoading(false)
    }
  }, [effectiveProjectId, routeProjectId, projectList, showToast])

  const loadInviteContext = useCallback(async () => {
    if (!effectiveProjectId) return

    const rpc = await getProjectInviteContext(effectiveProjectId, 'pending')
    if (rpc.success && rpc.data) {
      setInvitations(rpc.data.invitations || [])
      setSeatAllocation(rpc.data.seat_allocation ?? null)
      return
    }

    if (rpc.useTableFallback) {
      const [invResult, seatResult] = await Promise.all([
        getProjectInvitations(effectiveProjectId, 'pending'),
        getProjectSeatAllocation(effectiveProjectId),
      ])
      setInvitations(invResult.success ? invResult.data || [] : [])
      setSeatAllocation(seatResult.success ? seatResult.data : null)
      return
    }

    setInvitations([])
    setSeatAllocation(null)
  }, [effectiveProjectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const projectName = useMemo(() => {
    const p = projectList.find((x) => x.id === effectiveProjectId)
    return p?.project_name || 'Project'
  }, [projectList, effectiveProjectId])

  const rows = useMemo(() => {
    return (members || []).map((m) => ({
      ...m,
      name: m.user?.full_name || m.user?.email || 'User',
      email: m.user?.email || '',
      role: m.role?.role_display_name || m.role?.role_name || '',
      status: m.invitation_status || 'active',
      joined: m.accepted_at || m.created_at,
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
      status: (r) => r.status,
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
        status: r.status,
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

  const handleInviteSuccess = () => {
    setShowInviteSection(false)
    loadData()
    loadInviteContext()
    setSuccessBanner({ action: 'Invitation sent', detail: projectName })
    showToast('success', 'Invitation sent successfully')
  }

  const onChangeProject = (id) => {
    setSelectedProjectId(id)
    if (id) setSearchParams({ project: id })
    else setSearchParams({})
  }

  const onResend = async (inv) => {
    const res = await resendInvitation(inv.id)
    if (res.success) {
      setSuccessBanner({ action: 'Invitation reminder recorded', detail: inv.invited_email })
      showToast('success', 'Reminder updated')
      loadInviteContext()
    } else showToast('error', res.error || 'Failed')
  }

  const onCancelInvite = async (inv) => {
    if (!window.confirm(`Cancel invitation to ${inv.invited_email}?`)) return
    const res = await cancelInvitation(inv.id)
    if (res.success) {
      setSuccessBanner({ action: 'Invitation cancelled', detail: inv.invited_email })
      loadInviteContext()
    } else showToast('error', res.error || 'Failed')
  }

  const onRemoveMember = async (m) => {
    const name = m.user?.full_name || m.user?.email || 'Member'
    if (!window.confirm(`Remove ${name} from ${projectName}? This revokes their access.`)) return
    const res = await removeMemberFromProject(m.id)
    if (res.success) {
      setSuccessBanner({ action: 'Member removed', detail: `${name} (membership ${m.id})` })
      showToast('success', 'Member removed')
      loadData()
    } else showToast('error', res.error || 'Failed to remove')
  }

  const onEditSave = async (newRoleId) => {
    if (!editMember) return
    const res = await updateMemberRole(editMember.id, newRoleId)
    if (res.success) {
      setSuccessBanner({
        action: 'Role updated',
        detail: `${editMember.user?.email || ''} → ${res.data?.role?.role_display_name || ''}`,
      })
      showToast('success', 'Role updated')
      setEditMember(null)
      loadData()
    } else showToast('error', res.error || 'Failed to update role')
  }

  useEffect(() => {
    if (!effectiveProjectId) return
    loadInviteContext()
  }, [effectiveProjectId, loadInviteContext])

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Project members</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Invite users, change roles, and manage seats for your project.
          </p>
        </div>
        {isPmoAdminUser ? (
          <button
            type="button"
            disabled={!effectiveProjectId}
            onClick={() => setShowInviteSection(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite member
          </button>
        ) : (
          <PermissionGate permission="user.invite" projectId={effectiveProjectId || undefined}>
            <button
              type="button"
              disabled={!effectiveProjectId}
              onClick={() => setShowInviteSection(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite member
            </button>
          </PermissionGate>
        )}
      </div>

      {!routeProjectId && (
        <label className="block max-w-xl">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Project</span>
          <select
            value={selectedProjectId || qpProject || ''}
            onChange={(e) => onChangeProject(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2"
          >
            <option value="">Select a project…</option>
            {projectList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} {p.project_code ? `(${p.project_code})` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

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

      {showInviteSection && effectiveProjectId && (
        <InviteUserForm
          projectId={effectiveProjectId}
          onSuccess={handleInviteSuccess}
          onCancel={() => setShowInviteSection(false)}
        />
      )}

      {effectiveProjectId && seatAllocation && (
        <SeatUsageWidget
          projectId={effectiveProjectId}
          seatAllocation={seatAllocation}
          onPurchase={() => setShowInviteSection(true)}
        />
      )}

      {!effectiveProjectId ? (
        <p className="text-gray-500 dark:text-gray-400">Select a project to manage members.</p>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="text-lg font-semibold flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Active members ({displayRows.length})
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or email…"
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
                <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Members layout" />
                <ExportListMenu columns={EXPORT_COLS} data={exportData} baseFilename={`ProjectMembers_${effectiveProjectId}`} />
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="p-4 grid sm:grid-cols-2 gap-4">
                {displayRows.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium shrink-0">
                        {member.user?.full_name?.charAt(0) || member.user?.email?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{member.email}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{member.role}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 capitalize">
                          Status: {member.status}
                        </p>
                      </div>
                    </div>
                    <PermissionGate permission="user.change_role" projectId={effectiveProjectId}>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => setEditMember(member)}
                          className="text-sm text-blue-600 dark:text-blue-400 inline-flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" /> Edit role
                        </button>
                        <PermissionGate permission="user.remove" projectId={effectiveProjectId}>
                          <button
                            type="button"
                            onClick={() => onRemoveMember(member)}
                            className="text-sm text-red-600 dark:text-red-400 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" /> Remove
                          </button>
                        </PermissionGate>
                      </div>
                    </PermissionGate>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="text-left px-4 py-2">
                        <button type="button" className="font-semibold" onClick={() => handleSort('name')}>
                          Name {sortIndicator('name')}
                        </button>
                      </th>
                      <th className="text-left px-4 py-2">Email</th>
                      <th className="text-left px-4 py-2">
                        <button type="button" className="font-semibold" onClick={() => handleSort('role')}>
                          Role {sortIndicator('role')}
                        </button>
                      </th>
                      <th className="text-left px-4 py-2">
                        <button type="button" className="font-semibold" onClick={() => handleSort('status')}>
                          Status {sortIndicator('status')}
                        </button>
                      </th>
                      <th className="text-left px-4 py-2">
                        <button type="button" className="font-semibold" onClick={() => handleSort('joined')}>
                          Joined {sortIndicator('joined')}
                        </button>
                      </th>
                      <th className="text-right px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((member) => (
                      <tr key={member.id} className="border-t border-gray-200 dark:border-gray-800">
                        <td className="px-4 py-3">{member.name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{member.email}</td>
                        <td className="px-4 py-3">{member.role}</td>
                        <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-300">{member.status}</td>
                        <td className="px-4 py-3">
                          {member.joined ? new Date(member.joined).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <PermissionGate permission="user.change_role" projectId={effectiveProjectId}>
                            <button
                              type="button"
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white inline-flex"
                              onClick={() => setEditMember(member)}
                              aria-label="Edit role"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <PermissionGate permission="user.remove" projectId={effectiveProjectId}>
                              <button
                                type="button"
                                className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 inline-flex"
                                onClick={() => onRemoveMember(member)}
                                aria-label="Remove member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </PermissionGate>
                          </PermissionGate>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {invitations.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Pending invitations ({invitations.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-medium">{invitation.invited_email}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Role: {invitation.role?.role_display_name || invitation.role?.role_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Sent {new Date(invitation.invitation_sent_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onResend(invitation)}
                        className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Resend
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancelInvite(invitation)}
                        className="text-sm text-red-600 dark:text-red-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <EditMemberRoleModal
        isOpen={!!editMember}
        onClose={() => setEditMember(null)}
        memberLabel={editMember ? `${editMember.user?.full_name || editMember.user?.email || ''}` : ''}
        roles={assignableRoles}
        currentRoleId={editMember?.project_role_id || editMember?.role?.id}
        onConfirm={onEditSave}
      />
    </div>
  )
}
