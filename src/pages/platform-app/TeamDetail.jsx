/**
 * Team detail — view / edit
 * Routes: /platform/teams/:id  ·  /platform/teams/:id/edit
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import SelectField from '@nidus/ui/SelectField'
import RowActionButton from '@nidus/ui/RowActionButton'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import {
  getTeamDetail,
  updateTeam,
  deleteTeam,
  listTeamTypes,
  ensureTeamType,
  getAssignableProjectMembers,
  addMember,
  updateTeamMember,
  removeTeamMember,
  listProjectFunctionalRoles,
  setTeamChangeReason,
  clearTeamChangeReason,
} from '../../services/teamService'

const TABS = [
  { value: 'details', label: 'Details' },
  { value: 'members', label: 'Members' },
  { value: 'audit', label: 'Audit details' },
]

const EMPTY_MEMBER_DRAFT = {
  user_id: '',
  member_role: '',
  allocation_percentage: '100',
  allocation_start_date: '',
  allocation_end_date: '',
  member_comments: '',
}

function teamPathKey(team) {
  return (team?.team_code && String(team.team_code).trim()) || team?.id
}

function newMemberKey() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function memberLabel(row) {
  const u = row?.users || row?.profile || {}
  if (u.full_name && u.email) return `${u.full_name} (${u.email})`
  return u.full_name || u.email || row?.user_id || 'Unknown'
}

function membersFromTeam(teamMembers = []) {
  return (teamMembers || []).map((m) => ({
    key: m.id || newMemberKey(),
    id: m.id || null,
    user_id: m.user_id,
    user_label: memberLabel(m),
    member_role: m.member_role || '',
    allocation_percentage: Number(m.allocation_percentage ?? 100),
    allocation_start_date: m.allocation_start_date || '',
    allocation_end_date: m.allocation_end_date || '',
    member_comments: m.member_comments || '',
  }))
}

export default function TeamDetail({ mode: modeProp }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const isView = modeProp === 'view'
  const isEdit = modeProp === 'edit'

  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [team, setTeam] = useState(null)
  const [teamTypes, setTeamTypes] = useState([])
  const [assignable, setAssignable] = useState([])
  const [savingType, setSavingType] = useState(false)
  const [form, setForm] = useState({
    team_name: '',
    team_description: '',
    team_type: '',
    team_lead_user_id: '',
    max_team_size: '',
    is_active: true,
  })
  const [members, setMembers] = useState([])
  const [memberDraft, setMemberDraft] = useState(EMPTY_MEMBER_DRAFT)
  const [projectRoleOptions, setProjectRoleOptions] = useState([])
  const [originalMemberIds, setOriginalMemberIds] = useState([])
  const [baseline, setBaseline] = useState('')
  const [changeReason, setChangeReason] = useState('')

  const snapshot = useMemo(
    () => JSON.stringify({ form, members }),
    [form, members],
  )
  const isDirty = isEdit && baseline !== '' && snapshot !== baseline
  const { confirmDiscard, requestNavigation } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this team.',
  )

  const listPath = '/platform/teams'
  const routeKey = team ? teamPathKey(team) : id

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!id) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const detailRes = await getTeamDetail(id)
        if (cancelled) return
        if (!detailRes.success || !detailRes.data) {
          toast.error(detailRes.error || 'Team not found')
          navigate(listPath, { replace: true })
          return
        }
        const t = detailRes.data
        setTeam(t)
        const nextForm = {
          team_name: t.team_name || '',
          team_description: t.team_description || '',
          team_type: t.team_type || '',
          team_lead_user_id: t.team_lead_user_id || '',
          max_team_size: t.max_team_size != null ? String(t.max_team_size) : '',
          is_active: t.is_active !== false,
        }
        const nextMembers = membersFromTeam(t.members)
        setForm(nextForm)
        setMembers(nextMembers)
        setOriginalMemberIds(nextMembers.map((m) => m.id).filter(Boolean))
        setBaseline(JSON.stringify({ form: nextForm, members: nextMembers }))
        setChangeReason('')

        const projectId = t.project_id || t.projects?.id
        const [typesRes, assignableRes, rolesRes] = await Promise.all([
          listTeamTypes(),
          projectId
            ? getAssignableProjectMembers(projectId, null)
            : Promise.resolve({ success: true, data: [] }),
          projectId
            ? listProjectFunctionalRoles(projectId)
            : Promise.resolve({ success: true, data: [] }),
        ])
        if (cancelled) return
        if (typesRes.success) setTeamTypes(typesRes.data || [])
        if (assignableRes.success) setAssignable(assignableRes.data || [])
        if (rolesRes.success) {
          setProjectRoleOptions(
            (rolesRes.data || []).map((r) => ({
              value: r.role_label,
              label: r.role_label,
            })),
          )
        } else {
          setProjectRoleOptions([])
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message || 'Failed to load team')
          navigate(listPath, { replace: true })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  const typeOptions = useMemo(
    () =>
      (teamTypes || []).map((t) => ({
        value: t.type_code,
        label: t.type_label || t.type_code,
      })),
    [teamTypes],
  )

  const leadOptions = useMemo(() => {
    const opts = (assignable || []).map((row) => {
      const u = row.users || {}
      const label =
        u.full_name && u.email
          ? `${u.full_name} (${u.email})`
          : u.full_name || u.email || row.user_id
      return { value: row.user_id, label }
    })
    if (
      form.team_lead_user_id &&
      !opts.some((o) => o.value === form.team_lead_user_id)
    ) {
      opts.unshift({ value: form.team_lead_user_id, label: 'Current lead' })
    }
    return opts
  }, [assignable, form.team_lead_user_id])

  const peopleOptions = useMemo(() => {
    const taken = new Set(members.map((m) => m.user_id))
    return (assignable || [])
      .filter((row) => row.user_id && !taken.has(row.user_id))
      .map((row) => ({
        value: row.user_id,
        label: memberLabel(row),
      }))
  }, [assignable, members])

  const roleOptions = projectRoleOptions
  const projectRolesPath = team?.project_id
    ? `/platform/project-roles?projectId=${encodeURIComponent(
        team.projects?.project_code || team.project_id,
      )}`
    : '/platform/project-roles'

  const handleTeamTypeChange = async (raw) => {
    const next = String(raw || '').trim()
    if (!next) {
      setForm((f) => ({ ...f, team_type: '' }))
      return
    }
    const known = (teamTypes || []).find(
      (t) =>
        t.type_code === next ||
        String(t.type_label || '').toLowerCase() === next.toLowerCase(),
    )
    if (known) {
      setForm((f) => ({ ...f, team_type: known.type_code }))
      return
    }
    setSavingType(true)
    try {
      const res = await ensureTeamType(next)
      if (!res.success || !res.data) {
        toast.error(res.error || 'Could not add team type')
        return
      }
      setTeamTypes((prev) => {
        if (prev.some((t) => t.type_code === res.data.type_code)) return prev
        return [...prev, res.data]
      })
      setForm((f) => ({ ...f, team_type: res.data.type_code }))
      if (res.created) toast.success(`Added team type “${res.data.type_label}”`)
    } catch (err) {
      toast.error(err.message || 'Could not add team type')
    } finally {
      setSavingType(false)
    }
  }

  const goBack = () => {
    if (isDirty) confirmDiscard(() => navigate(listPath))
    else requestNavigation(listPath)
  }

  const updateMemberRow = (key, patch) => {
    setMembers((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)))
  }

  const addMemberRow = () => {
    if (!memberDraft.user_id) {
      toast.error('Select a team member')
      return
    }
    if (!String(memberDraft.member_role || '').trim()) {
      toast.error(
        roleOptions.length
          ? 'Select a member role'
          : 'Add roles on Project Roles & Skills first',
      )
      return
    }
    const pct = Number(memberDraft.allocation_percentage)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error('Allocation must be between 0 and 100')
      return
    }
    const start = (memberDraft.allocation_start_date || '').trim()
    const end = (memberDraft.allocation_end_date || '').trim()
    if (start && end && end < start) {
      toast.error('End date must be on or after start date')
      return
    }
    const person = assignable.find((r) => r.user_id === memberDraft.user_id)
    setMembers((prev) => [
      ...prev,
      {
        key: newMemberKey(),
        id: null,
        user_id: memberDraft.user_id,
        user_label: memberLabel(person) || memberDraft.user_id,
        member_role: String(memberDraft.member_role).trim(),
        allocation_percentage: pct,
        allocation_start_date: start || '',
        allocation_end_date: end || '',
        member_comments: String(memberDraft.member_comments || '').trim(),
      },
    ])
    setMemberDraft(EMPTY_MEMBER_DRAFT)
  }

  const removeMemberRow = (key) => {
    if (!window.confirm('Remove this member from the team?')) return
    setMembers((prev) => prev.filter((m) => m.key !== key))
  }

  const save = async (e) => {
    e.preventDefault()
    if (!team?.id || !isEdit) return
    if (!form.team_name.trim()) {
      toast.error('Team name is required')
      setActiveTab('details')
      return
    }
    const maxSize = form.max_team_size === '' ? null : Number(form.max_team_size)
    if (form.max_team_size !== '' && (!Number.isFinite(maxSize) || maxSize < 1)) {
      toast.error('Max team size must be a positive number')
      setActiveTab('details')
      return
    }
    if (maxSize != null && members.length > maxSize) {
      toast.error(`You have ${members.length} members but max team size is ${maxSize}`)
      setActiveTab('members')
      return
    }

    const definedRoles = new Set(
      roleOptions.map((r) => String(r.value || '').trim().toLowerCase()).filter(Boolean),
    )
    if (members.length > 0 && definedRoles.size === 0) {
      toast.error('Add project roles & skills before assigning members')
      setActiveTab('members')
      return
    }
    const missingRole = members.find((m) => !String(m.member_role || '').trim())
    if (missingRole) {
      toast.error(`Select a role for ${missingRole.user_label || 'each member'}`)
      setActiveTab('members')
      return
    }
    const badRole = members.find(
      (m) => !definedRoles.has(String(m.member_role || '').trim().toLowerCase()),
    )
    if (badRole) {
      toast.error(
        `Role “${badRole.member_role}” for ${badRole.user_label || 'a member'} is not on the project catalog`,
      )
      setActiveTab('members')
      return
    }

    if (!String(changeReason || '').trim()) {
      toast.error('Change reason is required')
      try {
        document.getElementById('team-change-reason')?.focus()
      } catch {
        /* ignore */
      }
      return
    }

    setSaving(true)
    try {
      await setTeamChangeReason(changeReason)
      const res = await updateTeam(team.id, {
        team_name: form.team_name.trim(),
        team_description: form.team_description.trim() || null,
        team_type: form.team_type || null,
        team_lead_user_id: form.team_lead_user_id || null,
        max_team_size: maxSize,
        is_active: form.is_active,
      })
      if (!res.success) {
        toast.error(res.error || 'Failed to update team')
        return
      }

      const errors = []

      // Members: remove dropped, update existing, add new
      const currentIds = new Set(members.map((m) => m.id).filter(Boolean))
      for (const oldId of originalMemberIds) {
        if (!currentIds.has(oldId)) {
          const rem = await removeTeamMember(oldId)
          if (!rem.success) errors.push(rem.error || 'Failed to remove a member')
        }
      }
      for (const m of members) {
        if (m.id) {
          const upd = await updateTeamMember(m.id, m.member_role || null, m.allocation_percentage, {
            allocation_start_date: m.allocation_start_date || null,
            allocation_end_date: m.allocation_end_date || null,
            member_comments: m.member_comments || null,
          })
          if (!upd.success) errors.push(upd.error || 'Failed to update a member')
        } else {
          const add = await addMember(team.id, m.user_id, {
            member_role: m.member_role || null,
            allocation_percentage: m.allocation_percentage,
            allocation_start_date: m.allocation_start_date || null,
            allocation_end_date: m.allocation_end_date || null,
            member_comments: m.member_comments || null,
          })
          if (!add.success) errors.push(add.error || 'Failed to add a member')
        }
      }

      if (errors.length) {
        toast.error(errors[0])
      }

      const refreshed = await getTeamDetail(teamPathKey({ ...team, ...res.data }) || team.id)
      if (refreshed.success && refreshed.data) {
        const t = refreshed.data
        setTeam(t)
        const nextMembers = membersFromTeam(t.members)
        const nextForm = {
          team_name: t.team_name || '',
          team_description: t.team_description || '',
          team_type: t.team_type || '',
          team_lead_user_id: t.team_lead_user_id || '',
          max_team_size: t.max_team_size != null ? String(t.max_team_size) : '',
          is_active: t.is_active !== false,
        }
        setForm(nextForm)
        setMembers(nextMembers)
        setOriginalMemberIds(nextMembers.map((m) => m.id).filter(Boolean))
        setBaseline(JSON.stringify({ form: nextForm, members: nextMembers }))
        setChangeReason('')
        await clearTeamChangeReason()
        showSuccess({
          recordId: teamPathKey(t),
          operation: 'updated',
          message: `Team “${t.team_name}” was updated.`,
          onOk: () => navigate(`/platform/teams/${encodeURIComponent(teamPathKey(t))}`),
        })
      } else {
        setBaseline(snapshot)
        setChangeReason('')
        await clearTeamChangeReason()
        showSuccess({
          recordId: teamPathKey({ ...team, ...res.data }),
          operation: 'updated',
          message: `Team “${form.team_name}” was updated.`,
        })
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update team')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!team?.id) return
    if (!window.confirm(`Delete team “${team.team_name}”? This can be undone only by an administrator.`)) {
      return
    }
    const res = await deleteTeam(team.id)
    if (!res.success) {
      toast.error(res.error || 'Failed to delete team')
      return
    }
    showSuccess({
      recordId: teamPathKey(team),
      operation: 'deleted',
      message: `Team “${team.team_name}” was deleted.`,
      onOk: () => navigate(listPath),
    })
  }

  if (loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex justify-center min-h-[40vh] items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500" />
      </div>
    )
  }

  if (!team) return null

  const readOnly = isView

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 hover:underline mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Teams
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {isView ? 'View team' : 'Edit team'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {team.team_code || team.id}
            {team.projects?.project_name ? ` · ${team.projects.project_name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isView && (
            <Link
              to={`/platform/teams/${encodeURIComponent(routeKey)}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[44px]"
            >
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          )}
          <RowActionButton
            variant="delete"
            label={`Delete ${team.team_name}`}
            onClick={handleDelete}
          />
        </div>
      </div>

      <DetailAuditTabList tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <form onSubmit={save} className="mt-4">
        {activeTab === 'details' && (
          <fieldset
            disabled={readOnly}
            className="space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Team name *
              </label>
              <input
                type="text"
                value={form.team_name}
                onChange={(e) => setForm((f) => ({ ...f, team_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={form.team_description}
                onChange={(e) => setForm((f) => ({ ...f, team_description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Team type
                </label>
                <SelectField
                  value={form.team_type}
                  onChange={handleTeamTypeChange}
                  options={typeOptions}
                  placeholder="Select type"
                  allowCustom={!readOnly}
                  loading={savingType}
                  disabled={readOnly}
                  forceSearchable
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max team size
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.max_team_size}
                  onChange={(e) => setForm((f) => ({ ...f, max_team_size: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-[44px]"
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Team lead
              </label>
              <SelectField
                value={form.team_lead_user_id}
                onChange={(v) => setForm((f) => ({ ...f, team_lead_user_id: v }))}
                options={leadOptions}
                placeholder="Select lead"
                forceSearchable
                disabled={readOnly}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Active
            </label>
          </fieldset>
        )}

        {activeTab === 'members' && (
          <section className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Members ({members.length})
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={projectRolesPath}
                  className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Manage Project Roles
                </Link>
                <Link
                  to={`/platform/teams/${encodeURIComponent(routeKey)}/allocation-history`}
                  className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
                >
                  View allocation history
                </Link>
              </div>
            </div>

            {isEdit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
                <label className="block text-xs text-gray-700 dark:text-gray-200 md:col-span-2">
                  Member
                  <div className="mt-1">
                    <SelectField
                      options={peopleOptions}
                      value={memberDraft.user_id}
                      onChange={(v) => setMemberDraft((d) => ({ ...d, user_id: v }))}
                      placeholder={
                        peopleOptions.length ? 'Select member…' : 'No assignable project members'
                      }
                      forceSearchable={peopleOptions.length >= 12}
                      disabled={!peopleOptions.length}
                    />
                  </div>
                </label>
                <label className="block text-xs text-gray-700 dark:text-gray-200 md:col-span-2">
                  Member role *
                  <div className="mt-1">
                    <SelectField
                      options={roleOptions}
                      value={memberDraft.member_role}
                      onChange={(v) => setMemberDraft((d) => ({ ...d, member_role: v }))}
                      placeholder={
                        roleOptions.length
                          ? 'Select role…'
                          : 'Add roles via Manage Project Roles'
                      }
                      forceSearchable={roleOptions.length >= 12}
                      disabled={!roleOptions.length}
                    />
                  </div>
                </label>
                <label className="block text-xs text-gray-700 dark:text-gray-200 md:col-span-2 max-w-xs">
                  Allocation %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={memberDraft.allocation_percentage}
                    onChange={(e) =>
                      setMemberDraft((d) => ({ ...d, allocation_percentage: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
                  />
                </label>
                <label className="block text-xs text-gray-700 dark:text-gray-200">
                  Start date
                  <input
                    type="date"
                    value={memberDraft.allocation_start_date}
                    onChange={(e) =>
                      setMemberDraft((d) => ({ ...d, allocation_start_date: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
                  />
                </label>
                <label className="block text-xs text-gray-700 dark:text-gray-200">
                  End date
                  <input
                    type="date"
                    value={memberDraft.allocation_end_date}
                    min={memberDraft.allocation_start_date || undefined}
                    onChange={(e) =>
                      setMemberDraft((d) => ({ ...d, allocation_end_date: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
                  />
                </label>
                <label className="block text-xs text-gray-700 dark:text-gray-200 md:col-span-2">
                  Comments
                  <textarea
                    value={memberDraft.member_comments}
                    onChange={(e) =>
                      setMemberDraft((d) => ({ ...d, member_comments: e.target.value }))
                    }
                    rows={2}
                    placeholder="Optional notes about this member on the team…"
                    className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
                  />
                </label>
                <div className="flex items-end md:col-span-2">
                  <button
                    type="button"
                    onClick={addMemberRow}
                    className="px-3 py-2 rounded bg-sky-600 text-white text-sm min-h-[44px]"
                  >
                    Add member
                  </button>
                </div>
              </div>
            )}

            {members.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-300 py-4 text-center">
                {isEdit ? 'No members yet. Add people from this project above.' : 'No active members on this team.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <TableRowNumberHeader />
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                        Member
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                        Role
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                        Alloc %
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                        Start
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                        End
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">
                        Comments
                      </th>
                      {isEdit && (
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-200">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, index) => (
                      <tr key={m.key} className="border-t border-gray-200 dark:border-gray-700">
                        <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{m.user_label}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200 min-w-[10rem]">
                          {isEdit ? (
                            <SelectField
                              options={
                                m.member_role &&
                                !roleOptions.some((o) => o.value === m.member_role)
                                  ? [
                                      { value: m.member_role, label: `${m.member_role} (current)` },
                                      ...roleOptions,
                                    ]
                                  : roleOptions
                              }
                              value={m.member_role || ''}
                              onChange={(v) => updateMemberRow(m.key, { member_role: v })}
                              placeholder={
                                roleOptions.length
                                  ? 'Select role…'
                                  : 'Add roles via Manage Project Roles'
                              }
                              forceSearchable={roleOptions.length >= 12}
                              disabled={!roleOptions.length && !m.member_role}
                            />
                          ) : (
                            m.member_role || '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                          {isEdit ? (
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={m.allocation_percentage}
                              onChange={(e) => {
                                const pct = Number(e.target.value)
                                if (!Number.isFinite(pct)) return
                                updateMemberRow(m.key, {
                                  allocation_percentage: Math.min(100, Math.max(0, pct)),
                                })
                              }}
                              className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
                            />
                          ) : (
                            m.allocation_percentage
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                          {isEdit ? (
                            <input
                              type="date"
                              value={m.allocation_start_date || ''}
                              onChange={(e) =>
                                updateMemberRow(m.key, { allocation_start_date: e.target.value })
                              }
                              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
                            />
                          ) : (
                            m.allocation_start_date || '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200">
                          {isEdit ? (
                            <input
                              type="date"
                              value={m.allocation_end_date || ''}
                              min={m.allocation_start_date || undefined}
                              onChange={(e) =>
                                updateMemberRow(m.key, { allocation_end_date: e.target.value })
                              }
                              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
                            />
                          ) : (
                            m.allocation_end_date || '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-200 min-w-[12rem]">
                          {isEdit ? (
                            <textarea
                              value={m.member_comments || ''}
                              onChange={(e) =>
                                updateMemberRow(m.key, { member_comments: e.target.value })
                              }
                              rows={2}
                              placeholder="Comments…"
                              className="w-full min-w-[10rem] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
                            />
                          ) : (
                            m.member_comments || '—'
                          )}
                        </td>
                        {isEdit && (
                          <td className="px-3 py-2">
                            <div className="flex justify-end">
                              <RowActionButton
                                variant="delete"
                                label="Remove member"
                                onClick={() => removeMemberRow(m.key)}
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'audit' && (
          <AuditDetailsPanel>
            <AuditCard title="Identity">
              <AuditField label="Team code" value={team.team_code || '—'} />
              <AuditField label="Team name" value={team.team_name} />
              <AuditField
                label="Project"
                value={
                  team.projects?.project_code
                    ? `${team.projects.project_code} — ${team.projects.project_name || ''}`
                    : team.projects?.project_name || '—'
                }
              />
            </AuditCard>
            <AuditCard title="Classification">
              <AuditField label="Type" value={team.team_type || '—'} />
              <AuditField label="Status" value={team.is_active ? 'Active' : 'Inactive'} />
              <AuditField
                label="Max size"
                value={team.max_team_size != null ? String(team.max_team_size) : 'Unlimited'}
              />
            </AuditCard>
            <AuditCard title="Record history">
              <AuditTimestampPair dateLabel="Created at" value={team.created_at} />
              <AuditTimestampPair dateLabel="Last updated" value={team.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )}

        {isEdit && activeTab !== 'audit' && (
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-gray-700 dark:text-gray-200">
              Change reason *
              <textarea
                id="team-change-reason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                rows={2}
                required
                placeholder="Why are these team or member fields changing?"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
              />
            </label>
            {isDirty && !String(changeReason || '').trim() && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Enter a change reason to save your edits.
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !isDirty}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 min-h-[44px]"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
