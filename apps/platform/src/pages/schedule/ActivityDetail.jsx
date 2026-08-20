import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useProjectRole } from '@nidus/shared/hooks/useProjectRole'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { resolveEntityId } from '@nidus/shared/utils/entityRouteParam'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { getActivity, saveActivity } from '../../services/activityListService'
import { listWbsNodes } from '../../services/wbsNodeService'
import { platformDb } from '@nidus/supabase'
import { SmartAmountInput } from '@nidus/ui/SmartAmountInput'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  exportRecordToExcel,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
  exportRecordToPrint,
} from '@nidus/shared/utils/exportUtils'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const SECTIONS = [
  {
    title: 'Activity',
    fields: [
      { key: 'activity_code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
      { key: 'estimation_technique', label: 'Estimation' },
    ],
  },
]

export default function ActivityDetail() {
  const { actId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const isNew = actId === 'new'
  const { canEdit } = useProjectRole(projectId)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [wbsNodes, setWbsNodes] = useState([])
  const [success, setSuccess] = useState(null)
  const [record, setRecord] = useState(null)
  const [resolvedActId, setResolvedActId] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [form, setForm] = useState({
    activity_code: '',
    name: '',
    description: '',
    wbs_node_id: '',
    is_milestone: false,
    planned_start_date: '',
    planned_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
    estimation_technique: 'pert',
    optimistic_duration: null,
    most_likely_duration: null,
    pessimistic_duration: null,
    duration_unit: 'days',
    basis_of_estimate: '',
    resource_requirements: '',
    constraints: '',
    assumptions: '',
    status: 'not_started',
  })

  const loadWbs = useCallback(async () => {
    if (!projectId) return
    const res = await listWbsNodes(projectId)
    if (res.success) setWbsNodes(res.data || [])
  }, [projectId])

  const load = useCallback(async () => {
    if (!projectId || isNew) {
      setLoading(false)
      return
    }
    setLoading(true)
    const resolvedId = isLikelyDatabaseUuid(actId)
      ? actId
      : await resolveEntityId('activity', actId, projectId)
    if (!resolvedId) {
      setLoading(false)
      return
    }
    setResolvedActId(resolvedId)
    const res = await getActivity(projectId, resolvedId)
    if (res.success && res.data) {
      const d = res.data
      setRecord(d)
      setForm({
        activity_code: d.activity_code || '',
        name: d.name || '',
        description: d.description || '',
        wbs_node_id: d.wbs_node_id || '',
        is_milestone: !!d.is_milestone,
        planned_start_date: d.planned_start_date || '',
        planned_end_date: d.planned_end_date || '',
        actual_start_date: d.actual_start_date || '',
        actual_end_date: d.actual_end_date || '',
        estimation_technique: d.estimation_technique || 'pert',
        optimistic_duration: d.optimistic_duration != null ? Number(d.optimistic_duration) : null,
        most_likely_duration: d.most_likely_duration != null ? Number(d.most_likely_duration) : null,
        pessimistic_duration: d.pessimistic_duration != null ? Number(d.pessimistic_duration) : null,
        duration_unit: d.duration_unit || 'days',
        basis_of_estimate: d.basis_of_estimate || '',
        resource_requirements: d.resource_requirements || '',
        constraints: d.constraints || '',
        assumptions: d.assumptions || '',
        status: d.status || 'not_started',
      })
      if (d.activity_code && d.activity_code !== actId) {
        navigate(platformProjectPath(routeKey, 'schedule', 'activities', d.activity_code), { replace: true })
      }
    }
    setLoading(false)
  }, [projectId, actId, isNew, routeKey, navigate])

  useEffect(() => {
    loadWbs()
  }, [loadWbs])

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

  const save = async (asHold) => {
    if (!projectId || !canEdit) return
    setSaving(true)
    setSuccess(null)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const res = await saveActivity(
        projectId,
        {
          id: isNew ? undefined : (resolvedActId || actId),
          ...form,
          wbs_node_id: form.wbs_node_id || null,
          status: asHold ? 'on_hold' : form.status,
        },
        user.id
      )
      if (!res.success) throw new Error(res.error)
      setSuccess({ message: 'Activity saved successfully.', id: res.data?.id })
      if (isNew && res.data?.id) {
        navigate(platformProjectPath(routeKey, 'schedule', 'activities', res.data.activity_code || res.data.id), { replace: true })
      }
    } catch (e) {
      setSuccess({ error: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (!projectId) return <p className="p-6 text-gray-500">Missing project.</p>
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center">Loading…</div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 dark:bg-gray-950">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={platformProjectPath(routeKey)} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <Link to={platformProjectPath(routeKey, 'schedule', 'activities')} className="hover:underline">
          Activities
        </Link>
        <span className="mx-2">/</span>
        <span>{isNew ? 'New' : 'Detail'}</span>
      </nav>

      <div className="mb-6 flex flex-wrap justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isNew ? 'New activity' : 'Activity'}</h1>
        <ExportRecordButtons
          onExportPPT={() => exportRecordToPPT(SECTIONS, form, `Activity_${actId}`)}
          onExportWord={() => exportRecordToWord(SECTIONS, form, `Activity_${actId}`)}
          onExportExcel={() => exportRecordToExcel(SECTIONS, form, `Activity_${actId}`)}
          onExportCSV={() => exportRecordToCSV(SECTIONS, form, `Activity_${actId}`)}
          onExportXML={() => exportRecordToXML(SECTIONS, form, `Activity_${actId}`)}
          onExportJSON={() => exportRecordToJSON(SECTIONS, form, `Activity_${actId}`)}
          onExportPrint={() => exportRecordToPrint(SECTIONS, form, `Activity_${actId}`)}
        />
      </div>

      {success?.message && (
        <div className="mb-4 rounded-lg border border-emerald-600/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200" role="status">
          {success.message} Record ID: {success.id}
        </div>
      )}
      {success?.error && <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">{success.error}</div>}

      <div className="mb-4">
        <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
      </div>

      {formTab === 'audit' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          {!record ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this activity is saved.</p>
          ) : (
            <AuditDetailsPanel description="Who created or changed this activity, and how it is classified.">
              <AuditCard title="Identity" description="How this activity is labelled and tracked.">
                <AuditField label="Code" value={record.activity_code} />
                <AuditField label="Name" value={record.name} />
                <AuditField label="Status" value={humanizeAuditToken(record.status)} />
              </AuditCard>
              <AuditCard title="Classification" description="How this activity is estimated.">
                <AuditField label="Estimation technique" value={humanizeAuditToken(record.estimation_technique)} />
                <AuditField label="Milestone" value={record.is_milestone ? 'Yes' : 'No'} />
              </AuditCard>
              <AuditCard title="Record history" description="When this activity was created and last changed.">
                <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                <AuditField label="Updated by" value={record.updated_by ? auditUserLabels[record.updated_by] || null : null} />
                <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )}
        </div>
      ) : (
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Code</label>
            <input
              value={form.activity_code}
              onChange={(e) => setForm((f) => ({ ...f, activity_code: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
            />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={form.is_milestone}
                onChange={(e) => setForm((f) => ({ ...f, is_milestone: e.target.checked }))}
                disabled={!canEdit}
              />
              Milestone
            </label>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">WBS node</label>
          <select
            value={form.wbs_node_id}
            onChange={(e) => setForm((f) => ({ ...f, wbs_node_id: e.target.value }))}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">—</option>
            {wbsNodes.map((n, index) => (
              <option key={n.id} value={n.id}>
                {(n.wbs_code || '') + ' ' + n.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            disabled={!canEdit}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['planned_start_date', 'Planned start'],
            ['planned_end_date', 'Planned end'],
            ['actual_start_date', 'Actual start'],
            ['actual_end_date', 'Actual end'],
          ].map(([k, lab]) => (
            <div key={k}>
              <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{lab}</label>
              <input
                type="date"
                value={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                disabled={!canEdit}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Estimation technique</label>
          <select
            value={form.estimation_technique}
            onChange={(e) => setForm((f) => ({ ...f, estimation_technique: e.target.value }))}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="expert_judgement">expert_judgement</option>
            <option value="analogous">analogous</option>
            <option value="parametric">parametric</option>
            <option value="three_point">three_point</option>
            <option value="pert">pert</option>
            <option value="other">other</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Optimistic (O)</label>
            <SmartAmountInput
              value={form.optimistic_duration}
              onChange={(v) => setForm((f) => ({ ...f, optimistic_duration: v }))}
              disabled={!canEdit}
              decimals={4}
              showCurrencySymbol={false}
              enableShorthand
              inputClassName="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Most likely (M)</label>
            <SmartAmountInput
              value={form.most_likely_duration}
              onChange={(v) => setForm((f) => ({ ...f, most_likely_duration: v }))}
              disabled={!canEdit}
              decimals={4}
              showCurrencySymbol={false}
              enableShorthand
              inputClassName="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Pessimistic (P)</label>
            <SmartAmountInput
              value={form.pessimistic_duration}
              onChange={(v) => setForm((f) => ({ ...f, pessimistic_duration: v }))}
              disabled={!canEdit}
              decimals={4}
              showCurrencySymbol={false}
              enableShorthand
              inputClassName="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Expected duration (O+4M+P)/6 and σ=(P−O)/6 are computed in the database when O, M, and P are set.
        </p>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Duration unit</label>
          <select
            value={form.duration_unit}
            onChange={(e) => setForm((f) => ({ ...f, duration_unit: e.target.value }))}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="hours">hours</option>
            <option value="days">days</option>
            <option value="weeks">weeks</option>
          </select>
        </div>
        {[
          ['basis_of_estimate', 'Basis of estimate'],
          ['resource_requirements', 'Resource requirements'],
          ['constraints', 'Constraints'],
          ['assumptions', 'Assumptions'],
        ].map(([k, lab]) => (
          <div key={k}>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{lab}</label>
            <textarea
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              disabled={!canEdit}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="not_started">not_started</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
            <option value="on_hold">on_hold</option>
          </select>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" disabled={saving} onClick={() => save(true)} className="rounded-lg border border-amber-600 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
              Put on hold
            </button>
            <button type="button" disabled={saving || !form.name.trim()} onClick={() => save(false)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  )
}
