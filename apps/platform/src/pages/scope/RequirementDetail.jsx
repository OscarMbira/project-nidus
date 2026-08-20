import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useProjectRole } from '@nidus/shared/hooks/useProjectRole'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { resolveEntityId } from '@nidus/shared/utils/entityRouteParam'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { getRequirement, saveRequirement, softDeleteRequirement } from '../../services/requirementsRegisterService'
import { getStakeholders } from '../../services/stakeholderService'
import { platformDb } from '@nidus/supabase'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import { RowActionButton } from '@nidus/ui'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500'

const SECTIONS = [
  {
    title: 'Requirement',
    fields: [
      { key: 'requirement_code', label: 'Code' },
      { key: 'version', label: 'Version' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority (MoSCoW)' },
      { key: 'source_stakeholder', label: 'Source stakeholder' },
      { key: 'acceptance_criteria', label: 'Acceptance criteria' },
      { key: 'traceability_tag', label: 'Traceability tag' },
      { key: 'status', label: 'Status' },
    ],
  },
]

export default function RequirementDetail() {
  const { reqId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const isNew = reqId === 'new'
  const { canEdit } = useProjectRole(projectId)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [stakeholders, setStakeholders] = useState([])
  const [success, setSuccess] = useState(null)
  const [record, setRecord] = useState(null)
  const [resolvedReqId, setResolvedReqId] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [form, setForm] = useState({
    requirement_code: '',
    name: '',
    description: '',
    category: '',
    source_stakeholder_id: '',
    priority: '',
    status: 'draft',
    acceptance_criteria: '',
    traceability_tag: '',
    version: '1.0',
  })

  const loadStakeholders = useCallback(async () => {
    if (!projectId) return
    try {
      const data = await getStakeholders({ project_id: projectId, limit: 500 })
      setStakeholders(Array.isArray(data) ? data : [])
    } catch {
      setStakeholders([])
    }
  }, [projectId])

  const load = useCallback(async () => {
    if (!projectId || isNew) {
      setLoading(false)
      return
    }
    setLoading(true)
    const resolvedId = isLikelyDatabaseUuid(reqId)
      ? reqId
      : await resolveEntityId('requirement', reqId, projectId)
    if (!resolvedId) {
      setLoading(false)
      return
    }
    setResolvedReqId(resolvedId)
    const res = await getRequirement(projectId, resolvedId)
    if (res.success && res.data) {
      const d = res.data
      setRecord(d)
      setForm({
        requirement_code: d.requirement_code || '',
        name: d.name || '',
        description: d.description || '',
        category: d.category || '',
        source_stakeholder_id: d.source_stakeholder_id || '',
        priority: d.priority || '',
        status: d.status || 'draft',
        acceptance_criteria: d.acceptance_criteria || '',
        traceability_tag: d.traceability_tag || '',
        version: d.version || '1.0',
      })
      if (d.requirement_code && d.requirement_code !== reqId) {
        navigate(platformProjectPath(routeKey, 'scope', 'requirements', d.requirement_code), { replace: true })
      }
    }
    setLoading(false)
  }, [projectId, reqId, isNew, routeKey, navigate])

  useEffect(() => {
    loadStakeholders()
  }, [loadStakeholders])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (formTab !== 'audit' || !record) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [record.created_by, record.updated_by])
      setAuditUserLabels(labels)
    })()
  }, [formTab, record])

  const save = async (asDraft) => {
    if (!projectId || !canEdit) return
    setSaving(true)
    setSuccess(null)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const res = await saveRequirement(
        projectId,
        {
          id: isNew ? undefined : (resolvedReqId || reqId),
          ...form,
          source_stakeholder_id: form.source_stakeholder_id || null,
          status: asDraft ? 'draft' : form.status,
        },
        user.id
      )
      if (!res.success) throw new Error(res.error)
      setSuccess({
        message: `Requirement ${res.operation === 'created' ? 'created' : 'updated'} successfully.`,
        id: res.data?.id,
        op: res.operation,
      })
      if (isNew && res.data?.id) {
        navigate(platformProjectPath(routeKey, 'scope', 'requirements', res.data.requirement_code || res.data.id), { replace: true })
      }
    } catch (e) {
      setSuccess({ error: e.message })
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!projectId || isNew || !canEdit) return
    if (!window.confirm('Delete this requirement?')) return
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user) return
    const res = await softDeleteRequirement(resolvedReqId || reqId, projectId, user.id)
    if (res.success) navigate(platformProjectPath(routeKey, 'scope', 'requirements'))
    else setSuccess({ error: res.error })
  }

  if (!projectId) {
    return <p className="p-6 text-gray-500 dark:text-gray-400">Missing project.</p>
  }
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  const stakeholderLabel =
    stakeholders.find((s) => s.id === form.source_stakeholder_id)?.stakeholder_name ||
    stakeholders.find((s) => s.id === form.source_stakeholder_id)?.stakeholder_reference ||
    ''
  const exportRecord = {
    ...form,
    source_stakeholder: stakeholderLabel,
  }
  const exportFilename = `Requirement_${form.requirement_code || reqId || 'draft'}`

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={platformProjectPath(routeKey)} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <Link to={platformProjectPath(routeKey, 'scope', 'requirements')} className="hover:underline">
          Requirements
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700 dark:text-gray-300">{isNew ? 'New' : 'Detail'}</span>
      </nav>

      <div className="mb-6 flex flex-wrap justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{isNew ? 'New requirement' : 'Requirement'}</h1>
        <ExportRecordButtons
          sections={SECTIONS}
          record={exportRecord}
          baseFilename={exportFilename}
        />
      </div>

      {success?.message && (
        <div
          className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200"
          role="status"
        >
          {success.message} Record ID: {success.id}
        </div>
      )}
      {success?.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {success.error}
        </div>
      )}

      <div className="mb-4">
        <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
      </div>

      {formTab === 'audit' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          {!record ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this requirement is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this requirement, and how it is classified.">
              <AuditCard title="Identity" description="How this requirement is labelled and tracked.">
                <AuditField label="Code" value={record.requirement_code} />
                <AuditField label="Name" value={record.name} />
                <AuditField label="Status" value={humanizeAuditToken(record.status)} />
              </AuditCard>
              <AuditCard title="Classification" description="How this requirement is categorised.">
                <AuditField label="Category" value={humanizeAuditToken(record.category)} />
                <AuditField label="Priority" value={humanizeAuditToken(record.priority)} />
              </AuditCard>
              <AuditCard title="Record history" description="When this requirement was created and last changed.">
                <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                <AuditField label="Updated by" value={record.updated_by ? auditUserLabels[record.updated_by] || null : null} />
                <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Code</label>
              <input
                value={form.requirement_code}
                onChange={(e) => setForm((f) => ({ ...f, requirement_code: e.target.value }))}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Version</label>
              <input
                value={form.version}
                onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                disabled={!canEdit}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={!canEdit}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={!canEdit}
              rows={3}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                disabled={!canEdit}
                className={inputCls}
              >
                <option value="">—</option>
                <option value="business">business</option>
                <option value="functional">functional</option>
                <option value="non_functional">non_functional</option>
                <option value="technical">technical</option>
                <option value="regulatory">regulatory</option>
                <option value="other">other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Priority (MoSCoW)</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                disabled={!canEdit}
                className={inputCls}
              >
                <option value="">—</option>
                <option value="must">must</option>
                <option value="should">should</option>
                <option value="could">could</option>
                <option value="wont">wont</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Source stakeholder</label>
            <select
              value={form.source_stakeholder_id}
              onChange={(e) => setForm((f) => ({ ...f, source_stakeholder_id: e.target.value }))}
              disabled={!canEdit}
              className={inputCls}
            >
              <option value="">—</option>
              {stakeholders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.stakeholder_name || s.stakeholder_reference || s.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Acceptance criteria</label>
            <textarea
              value={form.acceptance_criteria}
              onChange={(e) => setForm((f) => ({ ...f, acceptance_criteria: e.target.value }))}
              disabled={!canEdit}
              rows={3}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Traceability tag</label>
            <input
              value={form.traceability_tag}
              onChange={(e) => setForm((f) => ({ ...f, traceability_tag: e.target.value }))}
              disabled={!canEdit}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              disabled={!canEdit}
              className={inputCls}
            >
              <option value="draft">draft</option>
              <option value="approved">approved</option>
              <option value="deferred">deferred</option>
              <option value="rejected">rejected</option>
              <option value="implemented">implemented</option>
            </select>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => save(true)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Save as draft
              </button>
              <button
                type="button"
                disabled={saving || !form.name.trim()}
                onClick={() => save(false)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {!isNew && (
                <RowActionButton variant="delete" label="Delete requirement" onClick={del} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
