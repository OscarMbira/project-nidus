/**
 * Deliverable Register create / edit / view (v1024).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import {
  getDeliverable,
  createDeliverable,
  updateDeliverable,
  DELIVERABLE_STATUSES,
} from '../../services/deliverableRegisterService'

const STATUS_LABELS = {
  planned: 'Planned',
  submitted: 'Submitted',
  accepted: 'Accepted',
  rework: 'Rework / Rejected',
}

export default function DeliverableRegisterFormPage({ mode: modeProp }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projectId, routeKey } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const isCreate = modeProp === 'create' || !id
  const isView = modeProp === 'view'
  const [activeTab, setActiveTab] = useState('details')
  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving] = useState(false)
  const [record, setRecord] = useState(null)
  const [pbsNodes, setPbsNodes] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'planned',
    pbs_node_id: '',
    due_date: '',
    notes: '',
  })

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''
  const listPath = `/platform/deliverable-register${projectSuffix}`

  useEffect(() => {
    if (!projectId) return
    platformDb
      .from('plan_pbs_nodes')
      .select('id, node_code, name')
      .eq('project_id', projectId)
      .order('sort_order')
      .then(({ data }) => setPbsNodes(data || []))
  }, [projectId])

  useEffect(() => {
    if (isCreate || !id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await getDeliverable(id)
      if (cancelled) return
      if (!res.success || !res.data) {
        toast.error(res.error || 'Not found')
        setLoading(false)
        return
      }
      const d = res.data
      setRecord(d)
      setForm({
        title: d.title || '',
        description: d.description || '',
        status: d.status || 'planned',
        pbs_node_id: d.pbs_node_id || '',
        due_date: d.due_date || '',
        notes: d.notes || '',
      })
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id, isCreate])

  const save = async (e) => {
    e.preventDefault()
    if (!projectId || isView) return
    setSaving(true)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      const fields = {
        ...form,
        pbs_node_id: form.pbs_node_id || null,
        due_date: form.due_date || null,
        markSubmitted: form.status === 'submitted',
        markAccepted: form.status === 'accepted',
      }
      const res = isCreate
        ? await createDeliverable(projectId, fields, user?.id)
        : await updateDeliverable(record.id, fields, user?.id)
      if (!res.success) throw new Error(res.error)
      const displayId = res.data?.display_id || res.data?.title
      showSuccess({
        recordId: displayId,
        operation: isCreate ? 'created' : 'updated',
        message: `Deliverable ${isCreate ? 'created' : 'updated'}.`,
        onOk: () => navigate(`/platform/deliverable-register/${encodeURIComponent(res.data?.display_id || res.data?.id)}${projectSuffix}`),
      })
      setRecord(res.data)
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!projectId) {
    return <p className="p-6 text-amber-700 dark:text-amber-300">Select a project first.</p>
  }
  if (loading) return <p className="p-6 text-gray-700 dark:text-gray-200">Loading…</p>

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isCreate ? 'New deliverable' : isView ? 'View deliverable' : 'Edit deliverable'}
        </h1>
      </div>

      <DetailAuditTabList
        activeTab={activeTab}
        onChange={setActiveTab}
        detailsLabel="Details"
        auditLabel="Audit details"
      />

      {activeTab === 'details' && (
        <form onSubmit={save} className="mt-4 max-w-2xl space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <fieldset disabled={isView} className="space-y-3">
            <label className="block text-xs text-gray-700 dark:text-gray-200">Title
              <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" />
            </label>
            <label className="block text-xs text-gray-700 dark:text-gray-200">Description
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" />
            </label>
            <label className="block text-xs text-gray-700 dark:text-gray-200">Status
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2">
                {DELIVERABLE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </label>
            <label className="block text-xs text-gray-700 dark:text-gray-200">PBS node (optional)
              <select value={form.pbs_node_id} onChange={(e) => setForm((f) => ({ ...f, pbs_node_id: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2">
                <option value="">—</option>
                {pbsNodes.map((n) => <option key={n.id} value={n.id}>{n.node_code} {n.name}</option>)}
              </select>
            </label>
            <label className="block text-xs text-gray-700 dark:text-gray-200">Due date
              <input type="date" value={form.due_date || ''} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" />
            </label>
            <label className="block text-xs text-gray-700 dark:text-gray-200">Notes
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" />
            </label>
          </fieldset>
          {!isView && (
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => navigate(listPath)} className="px-3 py-2 rounded border text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </form>
      )}

      {activeTab === 'audit' && (
        <div className="mt-4">
          {!record ? (
            <p className="text-sm text-gray-700 dark:text-gray-200">Audit details appear after this record is saved.</p>
          ) : (
            <AuditDetailsPanel>
              <AuditCard title="Identity">
                <AuditField label="Display ID" value={record.display_id || '—'} />
                <AuditField label="Title" value={record.title} />
                <AuditField label="Status" value={STATUS_LABELS[record.status] || record.status} />
              </AuditCard>
              <AuditCard title="Classification">
                <AuditField label="Project" value={projectId} />
              </AuditCard>
              <AuditCard title="Record history">
                <AuditTimestampPair createdAt={record.created_at} updatedAt={record.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )}
        </div>
      )}
    </div>
  )
}
