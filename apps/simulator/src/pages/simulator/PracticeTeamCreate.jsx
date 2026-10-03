/**
 * Practice Team create — /simulator/practice-teams/create
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import SelectField from '@nidus/ui/SelectField'
import { createPracticeTeam } from '../../services/sim/practiceTeamService'

const TEAM_TYPE_OPTIONS = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'support', label: 'Support' },
  { value: 'cross-functional', label: 'Cross-functional' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'other', label: 'Other' },
]

const EMPTY_FORM = {
  team_name: '',
  team_description: '',
  team_type: 'delivery',
}

export default function PracticeTeamCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const { showSuccess, modal } = useSuccessModal()
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [baseline] = useState(() => JSON.stringify(EMPTY_FORM))

  const listPath = projectId
    ? `/simulator/practice-teams?projectId=${encodeURIComponent(projectId)}`
    : '/simulator/practice-teams'

  const isDirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline])
  const { confirmDiscard, requestNavigation } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this team.',
  )

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const goBack = () => {
    if (isDirty) confirmDiscard(() => navigate(listPath))
    else requestNavigation(listPath)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!projectId) {
      toast.error('Select a practice project first')
      return
    }
    if (!form.team_name.trim()) {
      toast.error('Team name is required')
      return
    }

    setSaving(true)
    try {
      const result = await createPracticeTeam(projectId, {
        team_name: form.team_name.trim(),
        team_description: form.team_description.trim() || null,
        team_type: form.team_type || 'delivery',
        team_status: 'active',
      })
      if (!result.success) throw new Error(result.error || 'Create failed')

      showSuccess({
        recordId: result.data?.team_name || result.data?.id,
        operation: 'created',
        message: 'Practice team created successfully.',
        onOk: () => navigate(listPath),
      })
    } catch (err) {
      toast.error(err.message || 'Failed to create team')
    } finally {
      setSaving(false)
    }
  }

  if (!projectId) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <p className="text-amber-700 dark:text-amber-300">Select a practice project first.</p>
        <Link to="/simulator/practice-teams" className="mt-2 inline-block text-sm text-blue-600 dark:text-blue-400 underline">
          ← Practice Teams
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mb-4">
        <Link
          to={listPath}
          onClick={(e) => {
            if (isDirty) {
              e.preventDefault()
              goBack()
            }
          }}
          className="text-sm text-blue-600 dark:text-blue-400 underline"
        >
          ← Practice Teams
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">Create Team</h1>
      </div>

      <DetailAuditTabList
        activeTab={activeTab}
        onChange={setActiveTab}
        detailsLabel="Details"
        auditLabel="Audit details"
      />

      {activeTab === 'details' && (
        <form
          onSubmit={save}
          className="mt-4 max-w-2xl space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
        >
          <label className="block text-xs text-gray-700 dark:text-gray-200">
            Team name <span className="text-red-500">*</span>
            <input
              required
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
                options={TEAM_TYPE_OPTIONS}
                value={form.team_type}
                onChange={(v) => setField('team_type', v)}
                forceNative
              />
            </div>
          </label>

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
        </form>
      )}

      {activeTab === 'audit' && (
        <p className="mt-4 text-sm text-gray-700 dark:text-gray-200">
          Audit details appear after this record is saved.
        </p>
      )}
    </div>
  )
}
