import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Save, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import { getTeamCharter, createTeamCharter, updateTeamCharter } from '../../services/teamCharterService'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId'

const EMPTY = {
  title: 'Team Charter',
  status: 'draft',
  purpose: '',
  objectives: '',
  values: '',
  ways_of_working: '',
  norms: '',
  accountability: '',
  communication_plan: '',
  raci_notes: '',
}

const TABS = [
  { value: 'details', label: 'Details' },
  { value: 'objectives', label: 'Objectives' },
  { value: 'values', label: 'Team Values' },
  { value: 'ways_of_working', label: 'Ways of Working' },
  { value: 'norms', label: 'Team Norms' },
  { value: 'accountability', label: 'Accountability' },
  { value: 'communication_plan', label: 'Communication Plan' },
  { value: 'raci_notes', label: 'RACI Notes' },
  { value: 'audit', label: 'Audit Details' },
]

const LIST_FIELDS = [
  {
    key: 'objectives',
    label: 'Objectives',
    hint: 'What specific outcomes is the team responsible for delivering? Add one objective per row.',
    itemColumnLabel: 'Objective',
    placeholder: 'Add an objective…',
    viewModeId: 'team-charter-objectives',
  },
  {
    key: 'values',
    label: 'Team Values',
    hint: 'What values guide how the team works and behaves? Add one value per row.',
    itemColumnLabel: 'Value',
    placeholder: 'Add a team value…',
    viewModeId: 'team-charter-values',
  },
  {
    key: 'ways_of_working',
    label: 'Ways of Working',
    hint: 'How does the team collaborate, make decisions, and deliver work? Add one item per row.',
    itemColumnLabel: 'Item',
    placeholder: 'Add a way of working…',
    viewModeId: 'team-charter-ways',
  },
  {
    key: 'norms',
    label: 'Team Norms',
    hint: 'Agreed rules, meeting cadences, communication standards. Add one norm per row.',
    itemColumnLabel: 'Norm',
    placeholder: 'Add a team norm…',
    viewModeId: 'team-charter-norms',
  },
  {
    key: 'accountability',
    label: 'Accountability',
    hint: 'What happens if charter agreements are not followed? Add one accountability item per row (escalation, recovery actions, etc.).',
    itemColumnLabel: 'Item',
    placeholder: 'Add an accountability item…',
    viewModeId: 'team-charter-accountability',
  },
  {
    key: 'communication_plan',
    label: 'Communication Plan',
    hint: 'How and when does the team communicate internally and with stakeholders? Add one item per row.',
    itemColumnLabel: 'Item',
    placeholder: 'Add a communication item…',
    viewModeId: 'team-charter-communication',
  },
  {
    key: 'raci_notes',
    label: 'RACI Notes',
    hint: 'Responsibilities, accountability, consulting, and informing notes. Add one note per row.',
    itemColumnLabel: 'Note',
    placeholder: 'Add a RACI note…',
    viewModeId: 'team-charter-raci',
  },
]

export default function TeamCharterEditPage() {
  const {
    projectId,
    routeKey,
    loading: projectLoading,
  } = usePlatformProjectId()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [form, setForm] = useState(EMPTY)
  const [charterId, setCharterId] = useState(null)
  const [charterMeta, setCharterMeta] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    if (projectLoading) return
    if (!projectId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getTeamCharter(projectId)
        if (cancelled) return
        if (data) {
          setCharterId(data.id)
          setCharterMeta(data)
          setForm({
            title: data.title || 'Team Charter',
            status: data.status || 'draft',
            purpose: data.purpose || '',
            objectives: data.objectives || '',
            values: data.values || '',
            ways_of_working: data.ways_of_working || '',
            norms: data.norms || '',
            accountability: data.accountability || '',
            communication_plan: data.communication_plan || '',
            raci_notes: data.raci_notes || '',
          })
        } else {
          setCharterId(null)
          setCharterMeta(null)
          setForm(EMPTY)
        }
      } catch (e) {
        if (!cancelled) toast.error(e?.message || 'Failed to load charter')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, projectLoading])

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  const setListField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required')
      setActiveTab('details')
      return
    }
    if (!projectId) {
      toast.error('Select a project first')
      return
    }
    setSaving(true)
    try {
      // created_by / updated_by REFERENCE auth.users(id) — use auth uid, not public.users.id
      const {
        data: { user },
      } = await platformDb.auth.getUser()
      const authUid = user?.id || null

      const payload = {
        ...form,
        project_id: projectId,
        updated_by: authUid,
      }

      let operation = 'updated'
      if (charterId) {
        const updated = await updateTeamCharter(charterId, payload)
        setCharterMeta(updated)
      } else {
        const result = await createTeamCharter({
          ...payload,
          created_by: authUid,
        })
        setCharterId(result.id)
        setCharterMeta(result)
        operation = 'created'
      }
      showSuccess({
        recordId: form.title || charterId || routeKey || projectId,
        operation,
        message: `Team charter “${form.title}” was ${operation}.`,
      })
    } catch (e) {
      toast.error(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const activeListField = useMemo(
    () => LIST_FIELDS.find((f) => f.key === activeTab) || null,
    [activeTab],
  )

  if (projectLoading || loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex justify-center min-h-[40vh] items-center">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const listPath = routeKey
    ? `/platform/team-charter?projectId=${encodeURIComponent(routeKey)}`
    : '/platform/team-charter'

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      {modal}
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(listPath)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[40px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            {charterId ? 'Edit Team Charter' : 'Create Team Charter'}
          </h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !projectId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white min-h-[40px]"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Charter'}
          </button>
        </div>

        {!projectId ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            No project selected. Open Team Charter from a project context, then create or edit the charter.
          </p>
        ) : (
          <>
            <DetailAuditTabList tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'details' && (
              <section className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Charter Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Purpose
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    Why does this team exist? What is the team&apos;s mission? Add one statement per
                    row.
                  </p>
                  <MultiLineListInput
                    viewModeId="team-charter-purpose"
                    value={form.purpose}
                    onChange={(v) => setListField('purpose', v)}
                    placeholder="Add a purpose statement…"
                    itemColumnLabel="Statement"
                    ariaLabelPrefix="purpose statement"
                  />
                </div>
              </section>
            )}

            {activeListField && (
              <section className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {activeListField.label}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activeListField.hint}</p>
                </div>
                <MultiLineListInput
                  viewModeId={activeListField.viewModeId}
                  value={form[activeListField.key] || ''}
                  onChange={(v) => setListField(activeListField.key, v)}
                  placeholder={activeListField.placeholder}
                  itemColumnLabel={activeListField.itemColumnLabel}
                  ariaLabelPrefix={activeListField.label.toLowerCase()}
                />
              </section>
            )}

            {activeTab === 'audit' && (
              <AuditDetailsPanel>
                {charterId && charterMeta ? (
                  <>
                    <AuditCard title="Identity">
                      <AuditField label="Title" value={charterMeta.title || form.title} />
                      <AuditField label="Status" value={charterMeta.status || form.status} />
                      <AuditField label="Project" value={routeKey || projectId} />
                    </AuditCard>
                    <AuditCard title="Classification">
                      <AuditField label="Record type" value="Team Charter" />
                    </AuditCard>
                    <AuditCard title="Record history">
                      <AuditField
                        label="Created"
                        value={
                          charterMeta.created_at
                            ? new Date(charterMeta.created_at).toLocaleString()
                            : '—'
                        }
                      />
                      <AuditField
                        label="Updated"
                        value={
                          charterMeta.updated_at
                            ? new Date(charterMeta.updated_at).toLocaleString()
                            : '—'
                        }
                      />
                    </AuditCard>
                  </>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Audit details appear after this record is saved.
                  </p>
                )}
              </AuditDetailsPanel>
            )}

            {activeTab !== 'audit' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-6 py-2.5 text-sm font-medium text-white min-h-[44px]"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save Charter'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
