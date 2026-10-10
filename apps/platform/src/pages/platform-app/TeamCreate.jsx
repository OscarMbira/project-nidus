/**
 * Create Team — /platform/teams/create
 * Member roles come from the project Roles & skills catalog (v1084).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import SelectField from '@nidus/ui/SelectField'
import RowActionButton from '@nidus/ui/RowActionButton'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import {
  createTeamWithMembers,
  getAssignableProjectMembers,
  listTeamTypes,
  ensureTeamType,
  listProjectFunctionalRoles,
} from '../../services/teamService'

function skillsForRole(rows, roleLabel) {
  const wanted = String(roleLabel || '').trim().toLowerCase()
  if (!wanted) return []
  const row = (rows || []).find(
    (r) => String(r.role_label || '').trim().toLowerCase() === wanted,
  )
  return String(row?.required_skills || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function RoleSkillsTable({ skills }) {
  if (!skills.length) {
    return (
      <p className="mt-2 text-xs text-gray-700 dark:text-gray-200">
        No skills are recorded for this role.
      </p>
    )
  }
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="w-full table-fixed">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <TableRowNumberHeader />
            <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-700 dark:text-gray-200">
              Skill
            </th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill, index) => (
            <tr key={`${skill}-${index}`} className="border-t border-gray-200 dark:border-gray-700">
              <TableRowNumberCell number={getDisplayRowNumber(index)} />
              <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 break-words">{skill}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const CREATE_TEAM_TABS = [
  { value: 'details', label: 'Details' },
  { value: 'members', label: 'Members' },
  { value: 'audit', label: 'Audit details' },
]

const EMPTY_FORM = {
  team_name: '',
  team_description: '',
  team_type: 'delivery',
  team_lead_user_id: '',
  max_team_size: '',
}

const EMPTY_MEMBER_DRAFT = {
  user_id: '',
  member_role: '',
  allocation_percentage: '100',
  allocation_start_date: '',
  allocation_end_date: '',
  member_comments: '',
}

function newMemberKey() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function memberLabel(row) {
  const u = row?.users || row?.profile || {}
  if (u.full_name && u.email) return `${u.full_name} (${u.email})`
  return u.full_name || u.email || row?.user_id || 'Unknown'
}

export default function TeamCreate() {
  const navigate = useNavigate()
  const { projectId, routeKey, loading: projectLoading, error: projectError } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [project, setProject] = useState(null)
  const [assignable, setAssignable] = useState([])
  const [teamTypes, setTeamTypes] = useState([])
  const [savingType, setSavingType] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [members, setMembers] = useState([])
  const [memberDraft, setMemberDraft] = useState(EMPTY_MEMBER_DRAFT)
  const [projectRoleOptions, setProjectRoleOptions] = useState([])
  const [projectRoleRows, setProjectRoleRows] = useState([])
  const [baseline] = useState(() =>
    JSON.stringify({ form: EMPTY_FORM, members: [] }),
  )

  const snapshot = useMemo(
    () => JSON.stringify({ form, members }),
    [form, members],
  )
  const isDirty = snapshot !== baseline
  const { confirmDiscard, requestNavigation, confirmBack } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this team.',
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (projectLoading) return
      if (!projectId) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const [projectRes, assignableRes, typesRes, rolesRes] = await Promise.all([
          platformDb
            .from('projects')
            .select('id, project_name, project_code')
            .eq('id', projectId)
            .eq('is_deleted', false)
            .maybeSingle(),
          getAssignableProjectMembers(projectId, null),
          listTeamTypes(),
          listProjectFunctionalRoles(projectId),
        ])
        if (cancelled) return
        if (projectRes.error) throw projectRes.error
        setProject(projectRes.data || null)
        if (assignableRes.success) setAssignable(assignableRes.data || [])
        if (rolesRes.success) {
          const rows = rolesRes.data || []
          setProjectRoleRows(rows)
          setProjectRoleOptions(
            rows.map((r) => ({
              value: r.role_label,
              label: r.role_label,
            })),
          )
        } else {
          setProjectRoleRows([])
          setProjectRoleOptions([])
        }
        if (typesRes.success) {
          setTeamTypes(typesRes.data || [])
          const codes = (typesRes.data || []).map((t) => t.type_code)
          if (codes.length) {
            setForm((f) => (codes.includes(f.team_type) ? f : { ...f, team_type: codes[0] }))
          }
        } else if (typesRes.error) {
          toast.error(typesRes.error || 'Failed to load team types')
        }
      } catch (err) {
        console.error('Error loading create-team context:', err)
        toast.error(err.message || 'Failed to load form')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId, projectLoading])

  const peopleOptions = useMemo(() => {
    const taken = new Set(members.map((m) => m.user_id).filter(Boolean))
    return assignable
      .filter((row) => row.user_id && !taken.has(row.user_id))
      .map((row) => ({ value: row.user_id, label: memberLabel(row) }))
  }, [assignable, members])

  const leadOptions = useMemo(
    () => [
      { value: '', label: '— None —' },
      ...assignable.map((row) => ({ value: row.user_id, label: memberLabel(row) })),
    ],
    [assignable],
  )

  const teamTypeOptions = useMemo(
    () =>
      (teamTypes || []).map((t) => ({
        value: t.type_code,
        label: t.type_label,
      })),
    [teamTypes],
  )

  const roleOptions = projectRoleOptions
  const projectRolesPath = `/platform/project-roles?projectId=${encodeURIComponent(
    project?.project_code || routeKey || projectId || '',
  )}`

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setDraftField = (key, value) => setMemberDraft((d) => ({ ...d, [key]: value }))

  const handleTeamTypeChange = async (rawValue) => {
    const next = String(rawValue || '').trim()
    if (!next) {
      setField('team_type', '')
      return
    }

    const known = teamTypes.find(
      (t) =>
        t.type_code === next ||
        t.type_label.toLowerCase() === next.toLowerCase(),
    )
    if (known) {
      setField('team_type', known.type_code)
      return
    }

    setSavingType(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle()

      const res = await ensureTeamType(next, userRecord?.id || null)
      if (!res.success || !res.data) {
        toast.error(res.error || 'Could not add team type')
        return
      }

      setTeamTypes((prev) => {
        if (prev.some((t) => t.type_code === res.data.type_code)) return prev
        return [...prev, res.data].sort(
          (a, b) => (a.sort_order - b.sort_order) || a.type_label.localeCompare(b.type_label),
        )
      })
      setField('team_type', res.data.type_code)
      if (res.created) {
        toast.success(`Added team type “${res.data.type_label}” for everyone`)
      }
    } catch (err) {
      toast.error(err.message || 'Could not add team type')
    } finally {
      setSavingType(false)
    }
  }

  const updateMember = (key, patch) => {
    setMembers((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)))
  }

  const listPath = '/platform/teams'
  const goBack = () => {
    if (isDirty) confirmBack()
    else requestNavigation(-1)
  }

  const addMember = () => {
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

  const removeMember = (key) => {
    if (!window.confirm('Remove this member from the draft list?')) return
    setMembers((prev) => prev.filter((m) => m.key !== key))
  }

  const save = async (e) => {
    e.preventDefault()
    if (!projectId) {
      toast.error('Select a project in the header first')
      return
    }
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
      toast.error(`You added ${members.length} members but max team size is ${maxSize}`)
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

    const skillsRollup = projectRoleRows
      .flatMap((r) => String(r.required_skills || '').split(/\r?\n/))
      .map((s) => s.trim())
      .filter(Boolean)
    const uniqueSkills = [...new Set(skillsRollup)].join('\n') || null

    setSaving(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const { data: userRecord } = await platformDb
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      const result = await createTeamWithMembers(
        {
          project_id: projectId,
          team_name: form.team_name.trim(),
          team_description: form.team_description.trim() || null,
          team_type: form.team_type || null,
          team_lead_user_id: form.team_lead_user_id || null,
          max_team_size: maxSize,
          required_skills: uniqueSkills,
          created_by: userRecord?.id || null,
        },
        members.map((m) => ({
          user_id: m.user_id,
          member_role: m.member_role || null,
          allocation_percentage: m.allocation_percentage,
          allocation_start_date: m.allocation_start_date || null,
          allocation_end_date: m.allocation_end_date || null,
          member_comments: m.member_comments || null,
        })),
      )

      if (!result.success) throw new Error(result.error || 'Create failed')
      if (result.warning) toast.error(result.warning)

      const recordId =
        (result.data?.team_code && String(result.data.team_code).trim()) ||
        result.data?.team_name ||
        result.data?.id

      showSuccess({
        recordId,
        operation: 'created',
        message: members.length
          ? `Team created with ${members.length} member${members.length === 1 ? '' : 's'}.`
          : 'Team created successfully.',
        onOk: () => navigate(listPath),
      })
    } catch (err) {
      toast.error(err.message || 'Failed to create team')
    } finally {
      setSaving(false)
    }
  }

  if (projectLoading || loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <p className="text-gray-700 dark:text-gray-200">Loading…</p>
      </div>
    )
  }

  if (!projectId || projectError === 'missing' || projectError === 'not_found') {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <p className="text-amber-700 dark:text-amber-300">
          Select a project in the header first, then create a team for that project.
        </p>
        <Link to={listPath} className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 underline">
          ← Teams
        </Link>
      </div>
    )
  }

  const projectLabel = project
    ? [project.project_code, project.project_name].filter(Boolean).join(' — ')
    : routeKey || projectId

  const actionBar = (
    <div className="flex gap-2 pt-2">
      <button
        type="button"
        onClick={goBack}
        className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-gray-100"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
      >
        {saving ? 'Creating…' : 'Create Team'}
      </button>
    </div>
  )

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mb-4">
        <button
          type="button"
          onClick={goBack}
          className="text-sm text-blue-600 dark:text-blue-400 underline"
        >
          ← Teams
        </button>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Create Team</h1>
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
          Define each role with its required skills on one tab. Members are optional.
        </p>
      </div>

      <DetailAuditTabList
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={CREATE_TEAM_TABS}
        ariaLabel="Create team sections"
      />

      <form onSubmit={save} className="mt-4 max-w-4xl space-y-4">
        {activeTab === 'details' && (
          <section className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Team details</h2>

            <label className="block text-xs text-gray-700 dark:text-gray-200">
              Project
              <input
                readOnly
                value={projectLabel}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
              />
            </label>

            <label className="block text-xs text-gray-700 dark:text-gray-200">
              Team name <span className="text-red-500">*</span>
              <input
                value={form.team_name}
                onChange={(e) => setField('team_name', e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
              />
            </label>

            <label className="block text-xs text-gray-700 dark:text-gray-200">
              Description
              <textarea
                value={form.team_description}
                onChange={(e) => setField('team_description', e.target.value)}
                rows={3}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
              />
            </label>

            <label className="block text-xs text-gray-700 dark:text-gray-200">
              Team type
              <div className="mt-1">
                <SelectField
                  options={teamTypeOptions}
                  value={form.team_type}
                  onChange={handleTeamTypeChange}
                  placeholder="Search or add a team type…"
                  searchPlaceholder="Search team types…"
                  forceSearchable
                  allowCustom
                  loading={savingType}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Search the list, or type a new type and choose “Use as custom value” — it is saved for all users.
              </p>
            </label>

            <label className="block text-xs text-gray-700 dark:text-gray-200">
              Team lead (optional)
              <div className="mt-1">
                <SelectField
                  options={leadOptions}
                  value={form.team_lead_user_id}
                  onChange={(v) => setField('team_lead_user_id', v)}
                  placeholder="Select lead…"
                  forceSearchable={leadOptions.length >= 12}
                />
              </div>
            </label>

            <label className="block text-xs text-gray-700 dark:text-gray-200">
              Max team size (optional)
              <input
                type="number"
                min={1}
                step={1}
                value={form.max_team_size}
                onChange={(e) => setField('max_team_size', e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
              />
            </label>
          </section>
        )}

        {activeTab === 'members' && (
          <section className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Members ({members.length})
              </h2>
              <Link
                to={projectRolesPath}
                className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
              >
                Manage Project Roles
              </Link>
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-200">
              Optional. Add people from this project. Each member needs a role from the project
              Roles &amp; skills catalog. Comments are optional.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
              <label className="block text-xs text-gray-700 dark:text-gray-200 md:col-span-2">
                Member
                <div className="mt-1">
                  <SelectField
                    options={peopleOptions}
                    value={memberDraft.user_id}
                    onChange={(v) => setDraftField('user_id', v)}
                    placeholder={peopleOptions.length ? 'Select member…' : 'No assignable project members'}
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
                    onChange={(v) => setDraftField('member_role', v)}
                    placeholder={
                      roleOptions.length
                        ? 'Select role…'
                        : 'Add roles via Manage Project Roles'
                    }
                    forceSearchable={roleOptions.length >= 12}
                    disabled={!roleOptions.length}
                  />
                </div>
                {memberDraft.member_role ? (
                  <RoleSkillsTable skills={skillsForRole(projectRoleRows, memberDraft.member_role)} />
                ) : null}
              </label>

              <label className="block text-xs text-gray-700 dark:text-gray-200 md:col-span-2 max-w-xs">
                Allocation %
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={memberDraft.allocation_percentage}
                  onChange={(e) => setDraftField('allocation_percentage', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
                />
              </label>

              <label className="block text-xs text-gray-700 dark:text-gray-200">
                Start date
                <input
                  type="date"
                  value={memberDraft.allocation_start_date}
                  onChange={(e) => setDraftField('allocation_start_date', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
                />
              </label>

              <label className="block text-xs text-gray-700 dark:text-gray-200">
                End date
                <input
                  type="date"
                  value={memberDraft.allocation_end_date}
                  min={memberDraft.allocation_start_date || undefined}
                  onChange={(e) => setDraftField('allocation_end_date', e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
                />
              </label>

              <label className="block text-xs text-gray-700 dark:text-gray-200 md:col-span-2">
                Comments
                <textarea
                  value={memberDraft.member_comments}
                  onChange={(e) => setDraftField('member_comments', e.target.value)}
                  rows={2}
                  placeholder="Optional notes about this member on the team…"
                  className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2"
                />
              </label>

              <div className="flex items-end md:col-span-2">
                <button
                  type="button"
                  onClick={addMember}
                  className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
                >
                  Add member
                </button>
              </div>
            </div>

            {members.length === 0 ? (
              <p className="text-sm text-gray-700 dark:text-gray-200 py-4 text-center">
                No members yet. You can create the team and add members later.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <TableRowNumberHeader />
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">Member</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">Role</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">Alloc %</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">Start</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">End</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-200">Comments</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, index) => (
                      <tr key={m.key} className="border-t border-gray-200 dark:border-gray-700">
                        <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{m.user_label}</td>
                        <td className="px-3 py-2 min-w-[10rem]">
                          <SelectField
                            options={roleOptions}
                            value={m.member_role || ''}
                            onChange={(v) => updateMember(m.key, { member_role: v })}
                            placeholder={
                              roleOptions.length
                                ? 'Select role…'
                                : 'Add roles via Manage Project Roles'
                            }
                            forceSearchable={roleOptions.length >= 12}
                            disabled={!roleOptions.length}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={m.allocation_percentage}
                            onChange={(e) => {
                              const pct = Number(e.target.value)
                              if (!Number.isFinite(pct)) return
                              updateMember(m.key, { allocation_percentage: Math.min(100, Math.max(0, pct)) })
                            }}
                            className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={m.allocation_start_date || ''}
                            onChange={(e) => updateMember(m.key, { allocation_start_date: e.target.value })}
                            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={m.allocation_end_date || ''}
                            min={m.allocation_start_date || undefined}
                            onChange={(e) => updateMember(m.key, { allocation_end_date: e.target.value })}
                            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2 min-w-[12rem]">
                          <textarea
                            value={m.member_comments || ''}
                            onChange={(e) => updateMember(m.key, { member_comments: e.target.value })}
                            rows={2}
                            placeholder="Comments…"
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end">
                            <RowActionButton variant="delete" label="Remove member" onClick={() => removeMember(m.key)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'audit' && (
          <p className="text-sm text-gray-700 dark:text-gray-200">
            Audit details appear after this record is saved.
          </p>
        )}

        {activeTab !== 'audit' && actionBar}
      </form>
    </div>
  )
}
