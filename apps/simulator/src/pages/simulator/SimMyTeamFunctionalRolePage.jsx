/**
 * Practice My Team — Add / Edit functional role (v1346, non-modal).
 * Routes: /simulator/practice-teams/my-team/roles/new
 *         /simulator/practice-teams/my-team/roles/:roleId/edit
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader, Save } from 'lucide-react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { simDb } from '@nidus/supabase'
import toast from 'react-hot-toast'
import {
  addSimTeamFunctionalRole,
  getSimTeamFunctionalRoleById,
  getSimTeamMembers,
  updateSimTeamFunctionalRole,
} from '../../services/sim/simTeamService'

const HELP_KEYS = [
  'sim.practice_team_functional_roles.role_label',
  'sim.practice_team_functional_roles.required_skills',
  'sim.practice_team_functional_roles.sort_order',
]

const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 min-h-[44px]'

function snapshotOf(form) {
  return JSON.stringify(form)
}

export default function SimMyTeamFunctionalRolePage() {
  const { roleId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isCreate = !roleId
  const teamIdParam = params.get('teamId') || ''

  const { showSuccess, modal: successModal } = useSuccessModal()
  const [formTab, setFormTab] = useState('details')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [role, setRole] = useState(null)
  const [memberCount, setMemberCount] = useState(0)
  const [form, setForm] = useState({ role_label: '', required_skills: '', sort_order: 10 })
  const [baseline, setBaseline] = useState('')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const isDirty = baseline !== '' && snapshotOf(form) !== baseline
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved role changes.')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (isCreate) {
        if (!teamIdParam) {
          setError('Team is required to add a functional role.')
          return
        }
        const initial = { role_label: '', required_skills: '', sort_order: 10 }
        setForm(initial)
        setBaseline(snapshotOf(initial))
        setRole(null)
        setMemberCount(0)
      } else {
        const res = await getSimTeamFunctionalRoleById(roleId)
        if (!res.success) throw new Error(res.error || 'Role not found')
        const r = res.data
        setRole(r)
        const initial = {
          role_label: r.role_label || '',
          required_skills: r.required_skills || '',
          sort_order: r.sort_order ?? 10,
        }
        setForm(initial)
        setBaseline(snapshotOf(initial))
        const members = await getSimTeamMembers(r.practice_team_id)
        if (members.success) {
          const label = String(r.role_label || '').toLowerCase()
          setMemberCount(
            (members.data || []).filter((m) => String(m.member_role || '').toLowerCase() === label).length
          )
        }
        const labels = await resolveAuditUserLabels(simDb, [r.created_by])
        setAuditUserLabels(labels)
      }
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [isCreate, roleId, teamIdParam])

  useEffect(() => {
    load()
  }, [load])

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const goBack = async () => {
    if (await confirmDiscard()) navigate(-1)
  }

  const handleSave = async () => {
    const label = form.role_label.trim()
    if (!label) {
      toast.error('Role label is required')
      return
    }
    const skills = (form.required_skills || '').trim() || null
    const sortOrder = Number(form.sort_order) || 0
    setSaving(true)
    try {
      if (isCreate) {
        const res = await addSimTeamFunctionalRole(teamIdParam, label, skills, sortOrder)
        if (!res.success) throw new Error(res.error || 'Failed to add role')
        setBaseline(snapshotOf({ ...form, role_label: label, required_skills: skills || '', sort_order: sortOrder }))
        showSuccess({
          recordId: res.data?.id,
          operation: 'created',
          message: `Functional role “${label}” added.`,
          onOk: () => navigate(-1),
        })
      } else {
        const res = await updateSimTeamFunctionalRole(roleId, label, skills, sortOrder)
        if (!res.success) throw new Error(res.error || 'Failed to update role')
        setBaseline(snapshotOf({ ...form, role_label: label, required_skills: skills || '', sort_order: sortOrder }))
        showSuccess({
          recordId: roleId,
          operation: 'updated',
          message: `Functional role “${label}” updated.`,
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

  const teamName = role?.practice_teams?.team_name

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
              {isCreate ? 'Add functional role' : 'Edit functional role'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {teamName || 'Team role label used when assigning members.'}
              {!isCreate && memberCount > 0 ? ` · ${memberCount} member(s) using this label` : ''}
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
            <AuditDetailsPanel description="How this functional role is classified and when it changed.">
              <AuditCard title="Identity" description="Role label on this practice team.">
                <AuditField label="Role label" value={role?.role_label} />
                <AuditField label="Team" value={teamName} />
              </AuditCard>
              <AuditCard title="Classification" description="Ordering and skills.">
                <AuditField label="Sort order" value={role?.sort_order} />
                <AuditField label="Members using" value={memberCount} />
              </AuditCard>
              <AuditCard title="Record history" description="When this role was added or last changed.">
                <AuditField
                  label="Created by"
                  value={role?.created_by ? auditUserLabels[role.created_by] || null : null}
                />
                <AuditTimestampPair dateLabel="Created at" value={role?.created_at} />
                <AuditTimestampPair dateLabel="Last updated" value={role?.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 space-y-5 max-w-2xl">
            <div>
              <FieldLabelWithHelp
                helpKey="sim.practice_team_functional_roles.role_label"
                className="text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Role label
              </FieldLabelWithHelp>
              <input
                value={form.role_label}
                onChange={(e) => setField('role_label', e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="e.g. Integration Specialist"
                maxLength={100}
              />
            </div>

            <div>
              <FieldLabelWithHelp
                helpKey="sim.practice_team_functional_roles.required_skills"
                className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
              >
                Required skills
              </FieldLabelWithHelp>
              <MultiLineListInput
                viewModeId="sim-my-team-role-required-skills"
                value={form.required_skills}
                onChange={(v) => setField('required_skills', v)}
                itemColumnLabel="Skill"
              />
            </div>

            <div>
              <FieldLabelWithHelp
                helpKey="sim.practice_team_functional_roles.sort_order"
                className="text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Sort order
              </FieldLabelWithHelp>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setField('sort_order', e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </div>
          </div>
        )}

        {successModal}
      </div>
    </FieldHelpScope>
  )
}
