/**
 * Project Users — members, invitations, seats (Platform)
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getProjectMembers,
  getProjectInvitations,
  getProjectInviteContext,
  resendInvitation,
  cancelInvitation,
  updatePlatformProjectMemberRole,
  removePlatformProjectMember,
  listProjectsForMemberManagement,
  canInviteToProject,
  readMemberManagementProjectsCache,
  fetchProjectPickerRowById,
} from '../../services/projectMembershipService'
import { getProjectSeatAllocation } from '../../services/seatManagementService'
import {
  getProjectManagerAssignableRoles,
  getPmoMembershipAssignableRoles,
} from '../../services/projectRoleAssignmentService'
import { platformDb } from '../../services/supabase/supabaseClient'
import InviteUserForm from '../../components/app/InviteUserForm'
import BulkInviteForm from '../../components/app/BulkInviteForm'
import { loadDraft as loadBulkInviteDraft } from '../../services/bulkInviteDraftService'
import EditMemberRoleModal from '../../components/app/EditMemberRoleModal'
import SeatUsageWidget from '../../components/app/SeatUsageWidget'
import ExportListMenu from '../../components/ui/ExportListMenu'
import ViewToggle from '../../components/ui/ViewToggle'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
import RowNumberBadge from '../../components/ui/RowNumberBadge'
import { useSortableTable } from '../../hooks/useSortableTable'
import { useViewMode } from '../../hooks/useViewMode'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId'
import { useEntityId } from '../../hooks/useEntityId'
import { projectQueryParam } from '../../utils/entityUrlUtils'
import { isLikelyDatabaseUuid } from '../../utils/isUuid'
import {
  Users,
  UserPlus,
  Upload,
  Mail,
  Edit,
  Trash2,
  Loader,
  RefreshCw,
} from 'lucide-react'
import { useToastContext } from '../../context/ToastContext'
import PermissionGate from '../../components/auth/PermissionGate'
import { isPmoAdmin } from '../../services/organisationRoleService'

const STORAGE_SORT = 'nidus-platform-project-users-sort'
const LOAD_MEMBERS_TIMEOUT_MS = 25000
const INTERNAL_USER_CACHE_PREFIX = 'nidus-internal-user-id'

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
  const qpProjectRaw = searchParams.get('project')
  const qpProject = qpProjectRaw?.trim() ? qpProjectRaw.trim() : null
  const qpAction = searchParams.get('action') || ''    // 'send-invite' | 'invite' | 'bulk-invite' → scroll to form
  const qpTab    = searchParams.get('tab')    || ''    // 'pending' → scroll to pending invitations
  const qpRole   = searchParams.get('role')   || ''    // role_name to pre-select in invite form
  const qpEntity = useEntityId(qpProject || '', 'project')
  const { error: toastError, success: toastSuccess } = useToastContext()

  const loadMembersSeq = useRef(0)

  useEffect(() => {
    return () => {
      loadMembersSeq.current += 1
    }
  }, [])

  const [loading, setLoading] = useState(true)
  const [sessionUser, setSessionUser] = useState({ internalId: null, authId: null })
  const [projectList, setProjectList] = useState([])
  const [projectListLoading, setProjectListLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [seatAllocation, setSeatAllocation] = useState(null)
  const [assignableRoles, setAssignableRoles] = useState([])
  const [editMember, setEditMember] = useState(null)
  const [search, setSearch] = useState('')
  const [successBanner, setSuccessBanner] = useState(null)
  const [viewMode, setViewMode] = useViewMode('platform-project-users', 'list')
  const [isPmoAdminUser, setIsPmoAdminUser] = useState(false)
  /** PMO can always add members; others need user.invite. Resolved per-project to avoid a flash where PMO incorrectly uses PermissionGate only. */
  const [memberAddEligibility, setMemberAddEligibility] = useState({
    loading: true,
    canAdd: false,
  })
  const [invitePanel, setInvitePanel] = useState('single')
  const [memberPageTab, setMemberPageTab] = useState('active')
  const [bulkResumeDraft, setBulkResumeDraft] = useState(null)

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'name', direction: 'asc' },
    storageKey: STORAGE_SORT,
  })

  const qpResolvedUuid = useMemo(() => {
    if (!qpProject) return ''
    if (isLikelyDatabaseUuid(qpProject)) return qpProject
    return qpEntity.uuid || ''
  }, [qpProject, qpEntity.uuid])

  const effectiveProjectId = useMemo(
    () => routeProjectId || selectedProjectId || qpResolvedUuid || '',
    [routeProjectId, selectedProjectId, qpResolvedUuid],
  )

  const openAddMemberTab = useCallback((panel = 'single') => {
    setInvitePanel(panel)
    setMemberPageTab('add')
  }, [])

  const scrollToAddMemberForm = useCallback(() => {
    openAddMemberTab('single')
  }, [openAddMemberTab])

  const scrollToBulkInviteForm = useCallback(() => {
    openAddMemberTab('bulk')
  }, [openAddMemberTab])

  const refreshBulkDraft = useCallback(async () => {
    if (!effectiveProjectId) {
      setBulkResumeDraft(null)
      return
    }
    const res = await loadBulkInviteDraft(effectiveProjectId)
    setBulkResumeDraft(res.success && res.data ? res.data : null)
  }, [effectiveProjectId])

  const resolveSession = useCallback(async () => {
    const { data: { session } } = await platformDb.auth.getSession()
    const authId = session?.user?.id
    if (!authId) {
      setSessionUser({ internalId: null, authId: null })
      return
    }
    let internalId = null
    try {
      internalId = sessionStorage.getItem(`${INTERNAL_USER_CACHE_PREFIX}:${authId}`)
    } catch {
      /* ignore */
    }
    if (internalId) {
      setSessionUser({ authId, internalId })
      return
    }
    const { data: row } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authId)
      .maybeSingle()
    internalId = row?.id || null
    if (internalId) {
      try {
        sessionStorage.setItem(`${INTERNAL_USER_CACHE_PREFIX}:${authId}`, internalId)
      } catch {
        /* ignore */
      }
    }
    setSessionUser({ authId, internalId })
  }, [])

  useEffect(() => {
    resolveSession()
  }, [resolveSession])

  useEffect(() => {
    if (!sessionUser.authId) {
      setMemberAddEligibility({ loading: false, canAdd: false })
      return
    }
    if (!effectiveProjectId) {
      setMemberAddEligibility({ loading: false, canAdd: false })
      return
    }
    if (isPmoAdminUser) {
      setMemberAddEligibility({ loading: false, canAdd: true })
      return
    }
    let cancelled = false
    setMemberAddEligibility({ loading: true, canAdd: false })
    ;(async () => {
      try {
        const inviteOk = await canInviteToProject(
          sessionUser.authId,
          sessionUser.internalId,
          effectiveProjectId,
        )
        if (!cancelled) setMemberAddEligibility({ loading: false, canAdd: !!inviteOk })
      } catch (e) {
        console.error('ProjectUsers: member add eligibility', e)
        if (!cancelled) setMemberAddEligibility({ loading: false, canAdd: false })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionUser.authId, sessionUser.internalId, effectiveProjectId, isPmoAdminUser])

  const applyProjectList = useCallback((rows) => {
    const list = rows || []
    setProjectList(list)
    if (!routeProjectId && !qpProject && list.length === 1) {
      setSelectedProjectId((prev) => prev || list[0].id)
    }
  }, [routeProjectId, qpProject])

  useEffect(() => {
    if (!sessionUser.internalId || !sessionUser.authId) {
      setProjectListLoading(false)
      return
    }

    const cached = readMemberManagementProjectsCache(sessionUser.internalId)
    const hadCache = !!(cached?.length)
    if (hadCache) {
      applyProjectList(cached)
      setProjectListLoading(false)
    } else {
      setProjectListLoading(true)
    }

    let cancelled = false
    ;(async () => {
      try {
        const pmo = await isPmoAdmin(sessionUser.authId)
        if (cancelled) return
        setIsPmoAdminUser(!!pmo)

        const res = await listProjectsForMemberManagement(
          sessionUser.internalId,
          sessionUser.authId,
          { isPmoAdmin: pmo },
        )
        if (cancelled) return
        if (res.success) applyProjectList(res.data || [])
        else {
          if (!cached?.length) setProjectList([])
          toastError(res.error || 'Failed to load project list')
        }
      } catch (e) {
        if (!cancelled) {
          console.error('ProjectUsers: project list', e)
          if (!cached?.length) setProjectList([])
          toastError(e?.message || 'Failed to load project list')
        }
      } finally {
        if (!cancelled) setProjectListLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sessionUser.internalId, sessionUser.authId, applyProjectList, toastError])

  useEffect(() => {
    const pid = effectiveProjectId
    if (!pid || projectList.some((p) => String(p.id).toLowerCase() === String(pid).toLowerCase())) {
      return
    }
    let cancelled = false
    ;(async () => {
      const res = await fetchProjectPickerRowById(pid)
      if (cancelled || !res.success || !res.data) return
      setProjectList((prev) => {
        if (prev.some((p) => p.id === res.data.id)) return prev
        return [...prev, res.data]
      })
    })()
    return () => {
      cancelled = true
    }
  }, [effectiveProjectId, projectList])

  useEffect(() => {
    if (routeProjectId || qpProject) return
    if (projectList.length !== 1 || selectedProjectId) return
    setSelectedProjectId(projectList[0].id)
  }, [routeProjectId, qpProject, projectList, selectedProjectId])

  useEffect(() => {
    if (!qpProject || routeProjectId || projectList.length === 0) return
    const exists = projectList.some(
      (p) =>
        String(p.id).toLowerCase() === qpProject.toLowerCase() ||
        (p.project_code && p.project_code.toLowerCase() === qpProject.toLowerCase()),
    )
    if (!exists) {
      setSearchParams({})
      setSelectedProjectId('')
    }
  }, [qpProject, routeProjectId, projectList, setSearchParams])

  useEffect(() => {
    if (qpProject && !routeProjectId && qpResolvedUuid) setSelectedProjectId(qpResolvedUuid)
  }, [qpProject, routeProjectId, qpResolvedUuid])

  useEffect(() => {
    if (!qpProject || routeProjectId) return
    if (!isLikelyDatabaseUuid(qpProject)) return
    if (!qpEntity.code || qpEntity.loading || qpEntity.error) return
    if (qpEntity.code === qpProject) return
    setSearchParams({ project: qpEntity.code }, { replace: true })
  }, [qpProject, qpEntity.code, qpEntity.loading, qpEntity.error, routeProjectId, setSearchParams])

  useEffect(() => {
    if (routeProjectId) setSelectedProjectId(routeProjectId)
  }, [routeProjectId])

  useEffect(() => {
    setMemberPageTab('active')
  }, [effectiveProjectId])

  const loadData = useCallback(async () => {
    const seq = ++loadMembersSeq.current

    const releaseLoading = () => {
      if (loadMembersSeq.current === seq) setLoading(false)
    }

    if (!effectiveProjectId) {
      setMembers([])
      setInvitations([])
      setSeatAllocation(null)
      releaseLoading()
      return
    }

    // If project picker finished loading, only load details for projects in the allowed list.
    if (!routeProjectId && !projectListLoading && projectList.length > 0) {
      const projectKnown = projectList.some(
        (p) => String(p.id).toLowerCase() === String(effectiveProjectId).toLowerCase(),
      )
      if (!projectKnown) {
        setMembers([])
        setInvitations([])
        setSeatAllocation(null)
        releaseLoading()
        return
      }
    }

    try {
      if (loadMembersSeq.current !== seq) return
      setLoading(true)
      const batch = Promise.all([
        getProjectMembers(effectiveProjectId),
        isPmoAdminUser ? getPmoMembershipAssignableRoles() : getProjectManagerAssignableRoles(),
      ])
      const timed = await Promise.race([
        batch,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Loading members timed out. Check your connection and try again.')),
            LOAD_MEMBERS_TIMEOUT_MS
          )
        ),
      ])
      const [membersResult, rolesResult] = timed
      if (loadMembersSeq.current !== seq) return
      if (membersResult.success) setMembers(membersResult.data || [])
      else setMembers([])
      // Invitations and seat allocation are loaded lazily to avoid noisy RLS failures on page load.
      setInvitations([])
      setSeatAllocation(null)
      if (rolesResult.success) setAssignableRoles(rolesResult.data || [])
      else setAssignableRoles([])
    } catch (e) {
      console.error(e)
      if (loadMembersSeq.current === seq) {
        toastError(e?.message || 'Failed to load project users')
        setMembers([])
        setAssignableRoles([])
      }
    } finally {
      releaseLoading()
    }
  }, [effectiveProjectId, routeProjectId, projectList, projectListLoading, toastError, isPmoAdminUser])

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

  const editModalRoleId = useMemo(() => {
    if (!editMember) return ''
    if (editMember.project_role_id) return editMember.project_role_id
    const rn = editMember.role?.role_name
    if (rn) {
      const hit = assignableRoles.find((r) => r.role_name === rn)
      if (hit) return hit.id
    }
    return ''
  }, [editMember, assignableRoles])

  const sortIndicator = (col) => {
    const d = getSortDirectionForColumn(col)
    if (d === 'asc') return '↑'
    if (d === 'desc') return '↓'
    return '⇅'
  }

  const handleInviteSuccess = (payload) => {
    loadData()
    loadInviteContext()
    const isDirect = payload?.mode === 'direct'
    setSuccessBanner({
      action: isDirect ? 'Member added' : 'Invitation sent',
      detail: isDirect ? `${projectName} — active immediately` : projectName,
    })
    toastSuccess(isDirect ? 'Member added to the project.' : 'Invitation sent successfully.')
    setMemberPageTab('active')
  }

  const onChangeProject = (id) => {
    setSelectedProjectId(id)
    if (!id) {
      setSearchParams({})
      return
    }
    ;(async () => {
      const param = await projectQueryParam(id)
      setSearchParams({ project: param || id })
    })()
  }

  const onResend = async (inv) => {
    const res = await resendInvitation(inv.id)
    if (res.success) {
      setSuccessBanner({ action: 'Invitation reminder recorded', detail: inv.invited_email })
      toastSuccess('Reminder updated')
      loadInviteContext()
    } else toastError(res.error || 'Failed')
  }

  const onCancelInvite = async (inv) => {
    if (!window.confirm(`Cancel invitation to ${inv.invited_email}?`)) return
    const res = await cancelInvitation(inv.id)
    if (res.success) {
      setSuccessBanner({ action: 'Invitation cancelled', detail: inv.invited_email })
      loadInviteContext()
    } else toastError(res.error || 'Failed')
  }

  const onRemoveMember = async (m) => {
    const name = m.user?.full_name || m.user?.email || 'Member'
    if (!window.confirm(`Remove ${name} from ${projectName}? This revokes their access.`)) return
    const res = await removePlatformProjectMember(m.id)
    if (res.success) {
      setSuccessBanner({ action: 'Member removed', detail: `${name} (membership ${m.id})` })
      toastSuccess('Member removed')
      loadData()
    } else toastError(res.error || 'Failed to remove')
  }

  const onEditSave = async (newRoleId) => {
    if (!editMember) return
    const res = await updatePlatformProjectMemberRole(editMember.id, newRoleId)
    if (res.success) {
      setSuccessBanner({
        action: 'Role updated',
        detail: `${editMember.user?.email || ''} → ${res.data?.role?.role_display_name || ''}`,
      })
      toastSuccess('Role updated')
      setEditMember(null)
      loadData()
    } else toastError(res.error || 'Failed to update role')
  }

  useEffect(() => {
    if (!effectiveProjectId) return
    loadInviteContext()
  }, [effectiveProjectId, loadInviteContext])

  useEffect(() => {
    refreshBulkDraft()
  }, [refreshBulkDraft])

  // Auto-scroll when arriving via sidebar shortcut links (?action=send-invite / ?tab=pending)
  useEffect(() => {
    if (loading || !effectiveProjectId) return
    if (qpAction === 'send-invite') {
      setInvitePanel('single')
      setMemberPageTab('add')
    } else if (qpAction === 'invite') {
      setInvitePanel('single')
      setMemberPageTab('add')
    } else if (qpAction === 'bulk-invite') {
      setInvitePanel('bulk')
      setMemberPageTab('add')
    } else if (qpTab === 'pending') {
      setMemberPageTab('active')
      setTimeout(() => {
        document.getElementById('pending-invitations-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
  // Only fire when loading resolves or qpAction/qpTab change — not on every re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, effectiveProjectId, qpAction, qpTab])

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-white">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Project members</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Invite users, change roles, and manage seats for your project.
            {qpAction === 'send-invite' && (
              <span className="block mt-1 text-blue-700 dark:text-blue-300">
                Choose a role and send a single invitation, or switch to Bulk invite to upload a CSV.
              </span>
            )}
            {isPmoAdminUser && (
              <span className="block mt-1 text-blue-700 dark:text-blue-300">
                PMO: pick any template role (sponsor / executive, programme manager, project manager,
                assurance, delivery team). Use All Projects or Create Project from the sidebar to add or amend
                projects.
              </span>
            )}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
          {sessionUser.authId && effectiveProjectId && memberPageTab === 'add' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-right hidden sm:block">
              {isPmoAdminUser
                ? 'Invite by email or add an existing user (PMO).'
                : 'Creates a pending invitation — they join when they accept the email.'}
            </p>
          )}
        </div>
      </div>

      {!routeProjectId && (
        <label className="block max-w-xl">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Project</span>
          {projectList.length === 1 && !projectListLoading ? (
            <p
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-gray-900 dark:text-gray-100"
              aria-live="polite"
            >
              {projectList[0].project_name}
              {projectList[0].project_code ? ` (${projectList[0].project_code})` : ''}
            </p>
          ) : (
            <select
              value={selectedProjectId || qpResolvedUuid || ''}
              onChange={(e) => onChangeProject(e.target.value)}
              disabled={projectListLoading && projectList.length === 0}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 disabled:opacity-60"
              aria-busy={projectListLoading}
            >
              <option value="">
                {projectListLoading ? 'Loading projects…' : 'Select a project…'}
              </option>
              {projectList.map((p, index) => (
                <option key={p.id} value={p.id}>
                  {p.project_name} {p.project_code ? `(${p.project_code})` : ''}
                </option>
              ))}
            </select>
          )}
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

      {effectiveProjectId && sessionUser.authId && bulkResumeDraft && memberPageTab === 'active' ? (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            You have a saved bulk invite draft for this project (
            {(bulkResumeDraft.members || []).length} row(s)).
          </p>
          <button
            type="button"
            onClick={scrollToBulkInviteForm}
            className="inline-flex justify-center px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 min-h-[44px]"
          >
            Resume draft
          </button>
        </div>
      ) : null}

      {effectiveProjectId && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
          <nav
            className="flex border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6"
            aria-label="Member management tabs"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              id="members-tab-active"
              aria-selected={memberPageTab === 'active'}
              aria-controls="members-panel-active"
              onClick={() => setMemberPageTab('active')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm mr-8 ${
                memberPageTab === 'active'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Users className="h-5 w-5" aria-hidden />
              Active members ({loading ? '…' : displayRows.length})
            </button>
            <button
              type="button"
              role="tab"
              id="members-tab-add"
              aria-selected={memberPageTab === 'add'}
              aria-controls="members-panel-add"
              onClick={() => setMemberPageTab('add')}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                memberPageTab === 'add'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <UserPlus className="h-5 w-5" aria-hidden />
              Add project member
            </button>
          </nav>

          {memberPageTab === 'active' && (
            <div id="members-panel-active" role="tabpanel" aria-labelledby="members-tab-active" className="p-4 sm:p-6 space-y-6">
              {!effectiveProjectId ? (
                <p className="text-gray-500 dark:text-gray-400">Select a project to manage members.</p>
              ) : loading ? (
                <div className="flex justify-center py-16">
                  <Loader className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  {seatAllocation && (
                    <SeatUsageWidget
                      projectId={effectiveProjectId}
                      seatAllocation={seatAllocation}
                      onPurchase={scrollToAddMemberForm}
                    />
                  )}

                  <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-gray-50 dark:bg-gray-900/50">
                      <h2 className="text-lg font-semibold flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Active members ({displayRows.length})
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            loadData()
                            loadInviteContext()
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                          aria-label="Refresh members and invitations"
                          title="Refresh"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        {sessionUser.authId && (
                          <button
                            type="button"
                            onClick={scrollToAddMemberForm}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shrink-0"
                          >
                            <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                            Add member
                          </button>
                        )}
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
                        {displayRows.length === 0 && (
                          <div className="sm:col-span-2 text-center py-10 text-gray-500 dark:text-gray-400">
                            <p className="font-medium text-gray-700 dark:text-gray-300">No active members yet</p>
                            <p className="text-sm mt-2 max-w-md mx-auto">
                              {isPmoAdminUser
                                ? 'Open Add member: invite by email, or use “Add existing user now” if they already have a login.'
                                : 'Use Add member above to send an invitation; people appear here after they accept.'}
                            </p>
                            <button
                              type="button"
                              onClick={scrollToAddMemberForm}
                              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              <UserPlus className="h-4 w-4 mr-2 shrink-0" />
                              Go to add member form
                            </button>
                          </div>
                        )}
                        {displayRows.map((member, index) => (
                          <div
                            key={member.id}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-2"
                          >
                            <div className="flex items-start gap-3">
                              <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
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
                            {isPmoAdminUser ? (
                              <div className="flex gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditMember(member)}
                                  className="text-sm text-blue-600 dark:text-blue-400 inline-flex items-center gap-1"
                                >
                                  <Edit className="w-4 h-4" /> Edit role
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onRemoveMember(member)}
                                  className="text-sm text-red-600 dark:text-red-400 inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-4 h-4" /> Remove
                                </button>
                              </div>
                            ) : (
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
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100 dark:bg-gray-800">
                            <tr>
                              <TableRowNumberHeader className="!px-4 !py-2 !normal-case" />
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
                            {displayRows.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                                  <p className="font-medium text-gray-700 dark:text-gray-300">No active members yet</p>
                                  <p className="text-sm mt-2 max-w-md mx-auto">
                                    {isPmoAdminUser
                                      ? 'Use Add member: send an invitation, or choose “Add existing user now” if they already have a platform login.'
                                      : 'Use Add member above to send an invitation; they appear here after they accept.'}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={scrollToAddMemberForm}
                                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                  >
                                    <UserPlus className="h-4 w-4 mr-2 shrink-0" />
                                    Go to add member form
                                  </button>
                                </td>
                              </tr>
                            )}
                            {displayRows.map((member, index) => (
                              <tr key={member.id} className="border-t border-gray-200 dark:border-gray-800">
                                <TableRowNumberCell number={getDisplayRowNumber(index)} className="!px-4 !py-3" />
                                <td className="px-4 py-3">{member.name}</td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{member.email}</td>
                                <td className="px-4 py-3">{member.role}</td>
                                <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-300">{member.status}</td>
                                <td className="px-4 py-3">
                                  {member.joined ? new Date(member.joined).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {isPmoAdminUser ? (
                                    <>
                                      <button
                                        type="button"
                                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white inline-flex"
                                        onClick={() => setEditMember(member)}
                                        aria-label="Edit role"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 inline-flex"
                                        onClick={() => onRemoveMember(member)}
                                        aria-label="Remove member"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </>
                                  ) : (
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
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {invitations.length > 0 && (
                    <div id="pending-invitations-section" className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                        <h2 className="text-lg font-semibold flex items-center">
                          <Mail className="h-5 w-5 mr-2" />
                          Pending invitations ({invitations.length})
                        </h2>
                      </div>
                      <div className="divide-y divide-gray-200 dark:divide-gray-800">
                        {invitations.map((invitation, index) => (
                          <div key={invitation.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
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
            </div>
          )}

          {memberPageTab === 'add' && sessionUser.authId && (
            <div id="members-panel-add" role="tabpanel" aria-labelledby="members-tab-add" className="p-4 sm:p-6 space-y-6">
              {effectiveProjectId && bulkResumeDraft ? (
                <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    You have a saved bulk invite draft for this project (
                    {(bulkResumeDraft.members || []).length} row(s)).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setInvitePanel('bulk')
                    }}
                    className="inline-flex justify-center px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 min-h-[44px]"
                  >
                    Resume draft
                  </button>
                </div>
              ) : null}

              <div
                id="send-role-invitation"
                className="flex flex-col sm:flex-row gap-2"
              >
                <button
                  type="button"
                  onClick={() => setInvitePanel('single')}
                  className={`inline-flex items-center justify-center px-4 py-2.5 rounded-lg shadow-sm w-full sm:w-auto min-h-[44px] ${
                    invitePanel === 'single'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <UserPlus className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                  Single invite
                </button>
                <button
                  type="button"
                  onClick={() => setInvitePanel('bulk')}
                  className={`inline-flex items-center justify-center px-4 py-2.5 rounded-lg w-full sm:w-auto min-h-[44px] ${
                    invitePanel === 'bulk'
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      : 'border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Upload className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                  Bulk invite
                </button>
              </div>

              {memberAddEligibility.loading ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">Checking permissions…</p>
              ) : !memberAddEligibility.canAdd ? (
                <p className="text-xs text-amber-700 dark:text-amber-300 max-w-xl">
                  You may not have invite permission on this project — the form below may still be useful; the
                  server will reject if not allowed.
                </p>
              ) : isPmoAdminUser ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Invite by email or add an existing user (PMO).
                </p>
              ) : null}

              {invitePanel === 'single' ? (
                <InviteUserForm
                  key={`invite-${effectiveProjectId}`}
                  projectId={effectiveProjectId}
                  onSuccess={handleInviteSuccess}
                  allowLeadershipRoles={isPmoAdminUser}
                  callerIsPmoAdmin={isPmoAdminUser}
                  defaultRole={qpRole || null}
                  permissionNote={
                    !memberAddEligibility.loading && !memberAddEligibility.canAdd
                      ? 'If submit fails with a permission error, ask a PMO administrator to grant project invite access or use a PMO account.'
                      : null
                  }
                />
              ) : (
                <div id="bulk-invite-panel">
                  <BulkInviteForm
                    key={`bulk-${effectiveProjectId}-${bulkResumeDraft?.id || 'new'}`}
                    projectId={effectiveProjectId}
                    allowLeadershipRoles={isPmoAdminUser}
                    callerIsPmoAdmin={isPmoAdminUser}
                    existingMemberEmails={members.map((m) => m.user?.email).filter(Boolean)}
                    pendingInviteEmails={invitations
                      .filter((i) => i.invitation_status === 'pending')
                      .map((i) => i.invited_email)
                      .filter(Boolean)}
                    seatAllocation={seatAllocation}
                    resumeDraft={invitePanel === 'bulk' ? bulkResumeDraft : null}
                    onSuccess={() => {
                      handleInviteSuccess()
                      refreshBulkDraft()
                    }}
                    onCancel={() => {
                      setInvitePanel('single')
                      refreshBulkDraft()
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!effectiveProjectId && (
        <p className="text-gray-500 dark:text-gray-400">Select a project to manage members.</p>
      )}

      <EditMemberRoleModal
        isOpen={!!editMember}
        onClose={() => setEditMember(null)}
        memberLabel={editMember ? `${editMember.user?.full_name || editMember.user?.email || ''}` : ''}
        roles={assignableRoles}
        currentRoleId={editModalRoleId || editMember?.project_role_id || editMember?.role?.id}
        onConfirm={onEditSave}
      />
    </div>
  )
}
