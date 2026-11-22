/**
 * My Team — Add / Edit team member (v1346, non-modal).
 * Routes: /platform/my-team/members/new · /platform/my-team/members/:memberId/edit
 *         (also under /platform/teams/my-team/…)
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader, Save } from 'lucide-react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { platformDb } from '@nidus/supabase'
import toast from 'react-hot-toast'
import {
  addTeamMember,
  getAssignableProjectMembers,
  getTeamFunctionalRoles,
  getTeamMemberById,
  getUserTotalTeamAllocation,
  updateTeamMember,
} from '../../services/teamService'
import RegionalDateInput from '@nidus/ui/RegionalDateInput'

const HELP_KEYS = [
  'public.team_members.user_id',
  'public.team_members.member_role',
  'public.team_members.allocation_percentage',
  'public.team_members.allocation_start_date',
  'public.team_members.allocation_end_date',
  'public.team_members.member_comments',
  'public.team_members.is_active',
]

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 min-h-[44px]'

function snapshotOf(form) {
  return JSON.stringify(form)
}

export default function MyTeamMemberPage() {
  const { memberId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isCreate = !memberId
  const teamId = params.get('teamId') || ''
  const projectIdParam = params.get('projectId') || ''

  const { showSuccess, modal: successModal } = useSuccessModal()
  const [formTab, setFormTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [member, setMember] = useState(null)
  const [roles, setRoles] = useState([])
  const [assignable, setAssignable] = useState([])
  const [search, setSearch] = useState('')
  const [roleMode, setRoleMode] = useState('preset')
  const [form, setForm] = useState({
    userId: '',
    presetRole: '',
    customRole: '',
    allocation: 80,
    allocation_start_date: '',
    allocation_end_date: '',
    member_comments: '',
    is_active: true,
  })
  const [baseline, setBaseline] = useState('')
  const [allocWarning, setAllocWarning] = useState(null)
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const projectId = member?.teams?.project_id || projectIdParam
  const teamLabel = member?.teams?.team_name || ''

  const resolvedRole = roleMode === 'custom' ? form.customRole.trim() : form.presetRole
  const isDirty = baseline !== '' && snapshotOf({ ...form, roleMode }) !== baseline
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved member changes.')

  const filteredAssignable = useMemo(() => {
    const t = search.trim().toLowerCase()
    if (!t) return assignable
    return assignable.filter((row) => {
      const u = row.users || {}
      return [u.full_name, u.email].some((v) => String(v || '').toLowerCase().includes(t))
    })
  }, [assignable, search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (isCreate) {
        if (!teamId || !projectIdParam) {
          setError('Team and project are required to add a member.')
          return
        }
        const [a, r] = await Promise.all([
          getAssignableProjectMembers(projectIdParam, teamId),
          getTeamFunctionalRoles(teamId),
        ])
        if (!a.success) throw new Error(a.error || 'Failed to load assignable members')
        if (!r.success) throw new Error(r.error || 'Failed to load roles')
        const roleList = r.data || []
        setAssignable(a.data || [])
        setRoles(roleList)
        const initial = {
          userId: '',
          presetRole: roleList[0]?.role_label || '',
          customRole: '',
          allocation: 80,
          allocation_start_date: '',
          allocation_end_date: '',
          member_comments: '',
          is_active: true,
        }
        setForm(initial)
        setRoleMode('preset')
        setBaseline(snapshotOf({ ...initial, roleMode: 'preset' }))
        setMember(null)
      } else {
        const res = await getTeamMemberById(memberId)
        if (!res.success) throw new Error(res.error || 'Member not found')
        const m = res.data
        setMember(m)
        const tid = m.team_id
        const r = await getTeamFunctionalRoles(tid)
        const roleList = r.success ? r.data || [] : []
        setRoles(roleList)
        const mr = m.member_role || ''
        const match = roleList.some((x) => x.role_label === mr)
        const mode = mr && !match ? 'custom' : 'preset'
        const initial = {
          userId: m.user_id || '',
          presetRole: match ? mr : roleList[0]?.role_label || '',
          customRole: match ? '' : mr,
          allocation: Number(m.allocation_percentage) || 0,
          allocation_start_date: m.allocation_start_date || '',
          allocation_end_date: m.allocation_end_date || '',
          member_comments: m.member_comments || '',
          is_active: m.is_active !== false,
        }
        setForm(initial)
        setRoleMode(mode)
        setBaseline(snapshotOf({ ...initial, roleMode: mode }))
        const labels = await resolveAuditUserLabels(platformDb, [m.created_by, m.updated_by])
        setAuditUserLabels(labels)
      }
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [isCreate, memberId, teamId, projectIdParam])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!isCreate || !form.userId) {
      setAllocWarning(null)
      return
    }
    ;(async () => {
      const res = await getUserTotalTeamAllocation(form.userId)
      if (res.success && res.total >= 100) {
        setAllocWarning('This user is already at 100% allocation across other teams.')
      } else if (res.success && res.total > 0) {
        setAllocWarning(`Current allocation on other teams: ${res.total}%.`)
      } else setAllocWarning(null)
    })()
  }, [isCreate, form.userId])

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const goBack = async () => {
    if (await confirmDiscard()) navigate(-1)
  }

  const handleSave = async () => {
    if (!resolvedRole) {
      toast.error('Functional role is required')
      return
    }
    if (isCreate && !form.userId) {
      toast.error('Select a project member')
      return
    }
    const start = (form.allocation_start_date || '').trim()
    const end = (form.allocation_end_date || '').trim()
    if (start && end && end < start) {
      toast.error('End date must be on or after the start date')
      return
    }
    const pct = Math.min(100, Math.max(0, Number(form.allocation) || 0))
    const extra = {
      allocation_start_date: start || null,
      allocation_end_date: end || null,
      member_comments: (form.member_comments || '').trim() || null,
      is_active: form.is_active !== false,
    }
    setSaving(true)
    try {
      if (isCreate) {
        const res = await addTeamMember(teamId, form.userId, resolvedRole, pct, null, extra)
        if (!res.success) throw new Error(res.error || 'Failed to add member')
        setBaseline(snapshotOf({ ...form, roleMode, allocation: pct }))
        showSuccess({
          recordId: res.data?.id,
          operation: 'created',
          message: 'Team member added.',
          onOk: () => navigate(-1),
        })
      } else {
        const res = await updateTeamMember(memberId, resolvedRole, pct, extra)
        if (!res.success) throw new Error(res.error || 'Failed to update member')
        setBaseline(snapshotOf({ ...form, roleMode, allocation: pct }))
        showSuccess({
          recordId: memberId,
          operation: 'updated',
          message: 'Team member updated.',
        })
        await load()
      }
    } catch (err) {
      toast.error(err.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-6">
        <button
          type="button"
          onClick={goBack}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {isCreate ? 'Add team member' : 'Edit team member'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {isCreate
                ? 'Only users already on the project can be added.'
                : member?.users?.full_name || member?.users?.email || 'Member'}
              {teamLabel ? ` · ${teamLabel}` : ''}
            </p>
          </div>
          {formTab === 'details' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white min-h-[44px] disabled:opacity-50"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

        {formTab === 'audit' ? (
          isCreate ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Audit details appear after this record is saved.
            </p>
          ) : (
            <AuditDetailsPanel description="Who added or changed this team member, and how they are classified.">
              <AuditCard title="Identity" description="How this member is labelled and tracked.">
                <AuditField label="Name" value={member?.users?.full_name || member?.users?.email} />
                <AuditField label="Role" value={member?.member_role} />
                <AuditField label="Team" value={teamLabel} />
              </AuditCard>
              <AuditCard title="Classification" description="Allocation and status on this team.">
                <AuditField
                  label="Allocation %"
                  value={member?.allocation_percentage != null ? `${member.allocation_percentage}%` : null}
                />
                <AuditField label="Start date" value={member?.allocation_start_date} />
                <AuditField label="End date" value={member?.allocation_end_date} />
                <AuditField label="Status" value={member?.is_active !== false ? 'Active' : 'Inactive'} />
              </AuditCard>
              <AuditCard title="Record history" description="When this member was added and last changed.">
                <AuditField
                  label="Created by"
                  value={member?.created_by ? auditUserLabels[member.created_by] || null : null}
                />
                <AuditTimestampPair dateLabel="Created at" value={member?.created_at} />
                <AuditField
                  label="Updated by"
                  value={member?.updated_by ? auditUserLabels[member.updated_by] || null : null}
                />
                <AuditTimestampPair dateLabel="Last updated" value={member?.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 space-y-5 max-w-2xl">
            {isCreate && (
              <div className="space-y-2">
                <FieldLabelWithHelp
                  helpKey="public.team_members.user_id"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                  listOptions={false}
                >
                  Project member
                </FieldLabelWithHelp>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or email…"
                  className={inputClass}
                />
                <select
                  value={form.userId}
                  onChange={(e) => setField('userId', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a member…</option>
                  {filteredAssignable.map((row) => (
                    <option key={row.user_id} value={row.user_id}>
                      {row.users?.full_name || row.users?.email || row.user_id}
                    </option>
                  ))}
                </select>
                {allocWarning && (
                  <p className="text-sm text-amber-700 dark:text-amber-300">{allocWarning}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <FieldLabelWithHelp
                helpKey="public.team_members.member_role"
                className="text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Functional role
              </FieldLabelWithHelp>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRoleMode('preset')}
                  className={`text-xs px-2 py-1 rounded ${roleMode === 'preset' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}
                >
                  Preset
                </button>
                <button
                  type="button"
                  onClick={() => setRoleMode('custom')}
                  className={`text-xs px-2 py-1 rounded ${roleMode === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}
                >
                  Custom
                </button>
              </div>
              {roleMode === 'preset' ? (
                <select
                  value={form.presetRole}
                  onChange={(e) => setField('presetRole', e.target.value)}
                  className={inputClass}
                >
                  {roles.length === 0 && <option value="">No preset roles yet — use Custom</option>}
                  {roles.map((r) => (
                    <option key={r.id} value={r.role_label}>
                      {r.role_label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.customRole}
                  onChange={(e) => setField('customRole', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Integration Specialist"
                />
              )}
            </div>

            <div>
              <FieldLabelWithHelp
                helpKey="public.team_members.allocation_percentage"
                className="text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Allocation %
              </FieldLabelWithHelp>
              <input
                type="number"
                min={0}
                max={100}
                value={form.allocation}
                onChange={(e) => setField('allocation', e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabelWithHelp
                  helpKey="public.team_members.allocation_start_date"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Start date
                </FieldLabelWithHelp>
                <RegionalDateInput eventStyle
                  value={form.allocation_start_date}
                  onChange={(e) => setField('allocation_start_date', e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </div>
              <div>
                <FieldLabelWithHelp
                  helpKey="public.team_members.allocation_end_date"
                  className="text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  End date
                </FieldLabelWithHelp>
                <RegionalDateInput eventStyle
                  value={form.allocation_end_date}
                  onChange={(e) => setField('allocation_end_date', e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </div>
            </div>

            <FieldLabelWithHelp
              helpKey="public.team_members.is_active"
              className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
              control="checkbox"
            >
              <input
                type="checkbox"
                checked={form.is_active !== false}
                onChange={(e) => setField('is_active', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Active
            </FieldLabelWithHelp>

            <div>
              <FieldLabelWithHelp
                helpKey="public.team_members.member_comments"
                className="text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Comments
              </FieldLabelWithHelp>
              <textarea
                value={form.member_comments}
                onChange={(e) => setField('member_comments', e.target.value)}
                rows={3}
                className={`${inputClass} mt-1`}
                placeholder="Anything else about this member’s place on the team"
              />
            </div>
          </div>
        )}

        {successModal}
      </div>
    </FieldHelpScope>
  )
}
