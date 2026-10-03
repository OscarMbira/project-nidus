/**
 * Project Details — Overview, Objectives, Success Criteria, Classification, Methodology,
 * Metadata (taxonomy §3, Project Setup > Project Details).
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import { getProjectDetails, updateProjectDetails } from '../../services/projectDetailsService'

const CLASSIFICATIONS = ['strategic', 'tactical', 'operational']

const PROJECT_DETAILS_EXPORT_SECTIONS = [
  {
    title: 'Identity',
    fields: [
      { key: 'project_code', label: 'Project code' },
      { key: 'project_name', label: 'Project name' },
      { key: 'status_name', label: 'Status' },
      { key: 'industry_name', label: 'Industries' },
      { key: 'budget_currency', label: 'Currency' },
    ],
  },
  {
    title: 'Overview',
    fields: [{ key: 'project_description', label: 'Overview' }],
  },
  {
    title: 'Objectives & Success',
    fields: [
      { key: 'project_objectives', label: 'Objectives' },
      { key: 'success_criteria', label: 'Success Criteria' },
    ],
  },
  {
    title: 'Classification',
    fields: [
      { key: 'project_classification', label: 'Classification' },
      { key: 'delivery_methodology', label: 'Methodology' },
      { key: 'billing_type', label: 'Billing Type' },
    ],
  },
]

const BILLING_TYPES = ['time_and_material', 'fixed_price']
const BILLING_TYPE_LABELS = { time_and_material: 'Time & Material', fixed_price: 'Fixed Price' }

/** Coerce DB text / legacy JSON-array values into a newline-joined string for MultiLineListInput. */
function toMultilineText(value) {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).join('\n')
  const raw = String(value)
  const trimmed = raw.trim()
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean).join('\n')
    } catch {
      /* keep as plain text */
    }
  }
  return raw
}

export default function ProjectDetailsPage() {
  const { projectId, loading: projectIdLoading, error: projectIdError } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()

  const [activeTab, setActiveTab] = useState('details')
  const [project, setProject] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const load = useCallback(async () => {
    if (projectIdLoading) return
    if (!projectId) {
      setLoading(false)
      setProject(null)
      setForm(null)
      return
    }
    setLoading(true)
    try {
      const data = await getProjectDetails(projectId)
      setProject(data)
      setForm({
        project_description: data.project_description || '',
        project_objectives: toMultilineText(data.project_objectives),
        success_criteria: toMultilineText(data.success_criteria),
        project_classification: data.project_classification || '',
        delivery_methodology: data.delivery_methodology || '',
        billing_type: data.billing_type || '',
      })
    } catch (e) {
      toast.error(e?.message || 'Failed to load project details')
      setProject(null)
      setForm(null)
    } finally {
      setLoading(false)
    }
  }, [projectId, projectIdLoading])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (activeTab !== 'audit' || !project?.created_by) return
    let cancelled = false
    ;(async () => {
      try {
        const labels = await resolveAuditUserLabels(platformDb, [project.created_by])
        if (!cancelled) setAuditUserLabels(labels || {})
      } catch {
        if (!cancelled) setAuditUserLabels({})
      }
    })()
    return () => { cancelled = true }
  }, [activeTab, project])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!projectId) {
      toast.error('No project selected.')
      return
    }
    setSaving(true)
    try {
      const updated = await updateProjectDetails(projectId, form)
      setProject((prev) => ({ ...prev, ...updated }))
      setForm((prev) => ({
        ...prev,
        project_description: updated.project_description || '',
        project_objectives: toMultilineText(updated.project_objectives),
        success_criteria: toMultilineText(updated.success_criteria),
        project_classification: updated.project_classification || '',
        delivery_methodology: updated.delivery_methodology || '',
        billing_type: updated.billing_type || '',
      }))
      showSuccess({ recordId: project?.project_code || updated.project_code, operation: 'updated', message: 'Project details saved.' })
    } catch (e2) {
      toast.error(e2?.message || 'Failed to save project details')
    } finally {
      setSaving(false)
    }
  }

  if (projectIdLoading || loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  if (!projectId || projectIdError === 'missing' || projectIdError === 'not_found') {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-500 dark:text-gray-400">
        Select a project from the project picker to view and edit project details.
      </div>
    )
  }

  const exportRecord = project && form
    ? {
        project_code: project.project_code,
        project_name: project.project_name,
        status_name: project.status?.status_name,
        industry_name: (project.industries || [])
          .map((ind) => (ind.is_primary ? `${ind.name} (Primary)` : ind.name))
          .join(', '),
        budget_currency: project.budget_currency,
        project_description: form.project_description,
        project_objectives: form.project_objectives,
        success_criteria: form.success_criteria,
        project_classification: form.project_classification,
        delivery_methodology: form.delivery_methodology,
        billing_type: form.billing_type ? (BILLING_TYPE_LABELS[form.billing_type] || form.billing_type) : '',
      }
    : null

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to={`/platform/projects/${projectId}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">Project Details</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project?.project_code} — {project?.project_name}</p>
          </div>
          {exportRecord && (
            <ExportRecordMenu
              sections={PROJECT_DETAILS_EXPORT_SECTIONS}
              record={exportRecord}
              baseFilename={`ProjectDetails_${project.project_code || project.id}`}
            />
          )}
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <DetailAuditTabList
            activeTab={activeTab}
            onChange={setActiveTab}
            ariaLabel="Project Details sections"
            tabs={[
              { value: 'details', label: 'Details' },
              { value: 'audit', label: 'Audit details' },
            ]}
          />
        </div>

        {!form ? (
          <p className="text-gray-500 dark:text-gray-400">Could not load project details.</p>
        ) : activeTab === 'details' ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
              <div>
                <label htmlFor="project_details_overview" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overview</label>
                <textarea
                  id="project_details_overview"
                  rows={4}
                  value={form.project_description}
                  onChange={(e) => setForm({ ...form, project_description: e.target.value })}
                  placeholder="What is this project about?"
                  className="w-full min-h-[6rem] rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white resize-y"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objectives</label>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  Add one objective per line. Press Enter or click Add after each.
                </p>
                <MultiLineListInput
                  viewModeId="project-details-objectives"
                  id="project_details_objectives"
                  value={form.project_objectives}
                  onChange={(v) => setForm({ ...form, project_objectives: v })}
                  placeholder="e.g. Migrate all retail accounts to Temenos T24 with zero data loss"
                  ariaLabelPrefix="objective"
                  itemColumnLabel="Objective"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Success Criteria</label>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  How success will be measured. Add one criterion per line.
                </p>
                <MultiLineListInput
                  viewModeId="project-details-success-criteria"
                  id="project_details_success_criteria"
                  value={form.success_criteria}
                  onChange={(v) => setForm({ ...form, success_criteria: v })}
                  placeholder="e.g. Core banking platform live with zero critical defects"
                  ariaLabelPrefix="success criterion"
                  itemColumnLabel="Success criterion"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Classification</label>
                  <select
                    value={form.project_classification}
                    onChange={(e) => setForm({ ...form, project_classification: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white capitalize"
                  >
                    <option value="">Not classified</option>
                    {CLASSIFICATIONS.map((c) => (
                      <option key={c} value={c} className="capitalize">{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Methodology</label>
                  <input
                    type="text"
                    value={form.delivery_methodology}
                    onChange={(e) => setForm({ ...form, delivery_methodology: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white capitalize"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Type</label>
                  <select
                    value={form.billing_type}
                    onChange={(e) => setForm({ ...form, billing_type: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">Not set</option>
                    {BILLING_TYPES.map((b) => (
                      <option key={b} value={b}>{BILLING_TYPE_LABELS[b]}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Time &amp; Material projects get a Planned vs Actual comparison on the Work Plan tab.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                  <Save className="h-4 w-4" /> Save
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Metadata</h2>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between md:block">
                  <dt className="text-gray-500 dark:text-gray-400">Project code</dt>
                  <dd className="font-medium">{project?.project_code || '—'}</dd>
                </div>
                <div className="flex justify-between md:block">
                  <dt className="text-gray-500 dark:text-gray-400">Status</dt>
                  <dd className="font-medium">{project?.status?.status_name || '—'}</dd>
                </div>
                <div className="flex justify-between md:block">
                  <dt className="text-gray-500 dark:text-gray-400">Industries</dt>
                  <dd className="font-medium">
                    {project?.industries?.length ? (
                      <div className="flex flex-wrap gap-1.5 justify-end md:justify-start">
                        {project.industries.map((ind) => (
                          <span
                            key={ind.id}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-xs"
                          >
                            {ind.name}
                            {ind.is_primary && (
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                Primary
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="flex justify-between md:block">
                  <dt className="text-gray-500 dark:text-gray-400">Currency</dt>
                  <dd className="font-medium">{project?.budget_currency || '—'}</dd>
                </div>
                <div className="flex justify-between md:block">
                  <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="font-medium">{project?.created_at ? new Date(project.created_at).toLocaleDateString() : '—'}</dd>
                </div>
                <div className="flex justify-between md:block">
                  <dt className="text-gray-500 dark:text-gray-400">Last updated</dt>
                  <dd className="font-medium">{project?.updated_at ? new Date(project.updated_at).toLocaleDateString() : '—'}</dd>
                </div>
              </dl>
            </div>
          </form>
        ) : (
          <AuditDetailsPanel description="Where this project's details record stands.">
            <AuditCard title="Identity" description="How this project is labelled.">
              <AuditField label="Project" value={project?.project_name} />
              <AuditField label="Project code" value={project?.project_code} />
            </AuditCard>
            <AuditCard title="Classification" description="Classification and methodology.">
              <AuditField label="Classification" value={humanizeAuditToken(project?.project_classification)} />
              <AuditField label="Methodology" value={humanizeAuditToken(project?.delivery_methodology)} />
              <AuditField label="Billing Type" value={project?.billing_type ? BILLING_TYPE_LABELS[project.billing_type] || humanizeAuditToken(project.billing_type) : null} />
            </AuditCard>
            <AuditCard title="Record history" description="When this project was created and last updated.">
              <AuditField label="Created by" value={project?.created_by ? auditUserLabels[project.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={project?.created_at} />
              <AuditTimestampPair dateLabel="Updated at" value={project?.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )}
      </div>
      {modal}
    </div>
  )
}
