import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileText, User, Clock, Filter, Search, LayoutGrid, List,
  ChevronUp, ChevronDown, ChevronsUpDown, Plus, Eye, Pencil,
  Trash2, X, Save, AlertTriangle,
} from 'lucide-react'
import {
  fetchChangeLog, fetchAccessibleProjects, fetchCRsForProject,
  fetchChangeLogEntry, createChangeLogEntry, updateChangeLogEntry,
  deleteChangeLogEntry, resolveUserId,
} from '../../services/changeLogService'
import ExportListMenu from '../ui/ExportListMenu'
import ChangeLogAttachments from './ChangeLogAttachments'
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

// ─── constants ───────────────────────────────────────────────────────────────

const VIEW_KEY  = 'nidus_changelog_view'
const PAGE_SIZE = 50

const ACTION_OPTIONS = [
  'submitted', 'assessed', 'approved', 'rejected', 'implemented',
  'cancelled', 'created', 'updated', 'on-hold', 'reopened', 'other',
]

const LOG_TYPES = [
  { value: 'status-change',    label: 'Status Change' },
  { value: 'comment',          label: 'Comment' },
  { value: 'assessment',       label: 'Assessment' },
  { value: 'approval',         label: 'Approval' },
  { value: 'implementation',   label: 'Implementation' },
  { value: 'other',            label: 'Other' },
]

const ACTION_COLOURS = {
  submitted:    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  assessed:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved:     'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  rejected:     'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  implemented:  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  cancelled:    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  created:      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  updated:      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'on-hold':    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  reopened:     'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
}

const EXPORT_COLUMNS = [
  { key: 'cr_reference',  label: 'CR Reference' },
  { key: 'cr_title',      label: 'CR Title' },
  { key: 'action',        label: 'Action' },
  { key: 'log_type',      label: 'Log Type' },
  { key: 'description',   label: 'Description' },
  { key: 'old_value',     label: 'Previous Value' },
  { key: 'new_value',     label: 'New Value' },
  { key: 'performed_by',  label: 'Performed By' },
  { key: 'timestamp',     label: 'Timestamp' },
  { key: 'project',       label: 'Project' },
]

const EMPTY_FORM = {
  project_id: '', change_request_id: '', log_date: '', log_type: 'status-change',
  action: 'submitted', performed_by_role: '', old_value: '', new_value: '',
  description: '', comments: '',
}

// ─── small helpers ───────────────────────────────────────────────────────────

function ActionBadge({ type }) {
  const cls = ACTION_COLOURS[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${cls}`}>
      {(type || '').replace(/-/g, ' ')}
    </span>
  )
}

function SortIcon({ col, sort }) {
  if (sort.col !== col) return <ChevronsUpDown className="h-3 w-3 text-gray-400 ml-1 inline" />
  return sort.dir === 'asc'
    ? <ChevronUp className="h-3 w-3 text-blue-500 ml-1 inline" />
    : <ChevronDown className="h-3 w-3 text-blue-500 ml-1 inline" />
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
const thCls    = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200'

// ─── Create / Edit form (modal for edit; inline panel for create) ─────────────

function EntryModal({ mode, entry, projects, currentUserId, onSave, onClose, embedded = false }) {
  const isEdit = mode === 'edit'
  const [activeTab, setActiveTab] = useState('form')
  const [form, setForm]       = useState(EMPTY_FORM)
  const [crs, setCRs]         = useState([])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (isEdit && entry) {
      setForm({
        project_id:        entry.change_request?.project_id || '',
        change_request_id: entry.change_request_id || '',
        log_date:          entry.log_date ? entry.log_date.substring(0, 16) : '',
        log_type:          entry.log_type || 'other',
        action:            entry.action || 'submitted',
        performed_by_role: entry.performed_by_role || '',
        old_value:         entry.old_value || '',
        new_value:         entry.new_value || '',
        description:       entry.description || '',
        comments:          entry.comments || '',
      })
    } else {
      setForm({ ...EMPTY_FORM, log_date: new Date().toISOString().substring(0, 16) })
    }
  }, [isEdit, entry])

  useEffect(() => {
    if (form.project_id) {
      fetchCRsForProject(form.project_id).then(setCRs)
    } else {
      setCRs([])
    }
  }, [form.project_id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.change_request_id) { setError('Change Request is required.'); return }
    if (!form.action)            { setError('Action is required.'); return }
    setSaving(true); setError(null)
    try {
      let res
      if (isEdit) {
        res = await updateChangeLogEntry(entry.id, {
          ...form,
          log_date: form.log_date ? new Date(form.log_date).toISOString() : new Date().toISOString(),
          performed_by: entry.performed_by,
        })
      } else {
        res = await createChangeLogEntry({
          ...form,
          log_date: form.log_date ? new Date(form.log_date).toISOString() : new Date().toISOString(),
          performed_by: currentUserId,
        })
      }
      if (!res.success) throw new Error(res.message)
      onSave(res.data, isEdit)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const tabCls = active =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
    }`

  const panel = (
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl flex flex-col ${
          embedded
            ? 'border border-gray-200 dark:border-gray-700 shadow-sm w-full'
            : 'shadow-2xl w-full max-w-2xl max-h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Log Entry' : 'Add Log Entry'}
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs — attachments only shown when editing an existing entry */}
        {isEdit && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 flex-shrink-0">
            <button type="button" className={tabCls(activeTab === 'form')}        onClick={() => setActiveTab('form')}>Details</button>
            <button type="button" className={tabCls(activeTab === 'attachments')} onClick={() => setActiveTab('attachments')}>Attachments</button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'attachments' && isEdit ? (
          <div className="px-6 py-5">
            <ChangeLogAttachments logEntryId={entry?.id} readOnly={false} />
          </div>
        ) : (
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Project */}
            <Field label="Project *">
              <select
                value={form.project_id}
                onChange={e => { set('project_id', e.target.value); set('change_request_id', '') }}
                disabled={isEdit}
                className={inputCls}
              >
                <option value="">Select project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>

            {/* Change Request */}
            <Field label="Change Request *">
              <select
                value={form.change_request_id}
                onChange={e => set('change_request_id', e.target.value)}
                disabled={isEdit || !form.project_id}
                className={inputCls}
              >
                <option value="">Select CR…</option>
                {crs.map(cr => (
                  <option key={cr.id} value={cr.id}>
                    {cr.change_reference} — {cr.change_title}
                  </option>
                ))}
              </select>
            </Field>

            {/* Action */}
            <Field label="Action *">
              <select value={form.action} onChange={e => set('action', e.target.value)} className={inputCls}>
                {ACTION_OPTIONS.map(a => (
                  <option key={a} value={a}>{a.replace(/-/g, ' ')}</option>
                ))}
              </select>
            </Field>

            {/* Log Type */}
            <Field label="Log Type">
              <select value={form.log_type} onChange={e => set('log_type', e.target.value)} className={inputCls}>
                {LOG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>

            {/* Log Date */}
            <Field label="Log Date">
              <input
                type="datetime-local"
                value={form.log_date}
                onChange={e => set('log_date', e.target.value)}
                className={inputCls}
              />
            </Field>

            {/* Performed By Role */}
            <Field label="Performed By Role">
              <input
                type="text"
                value={form.performed_by_role}
                onChange={e => set('performed_by_role', e.target.value)}
                placeholder="e.g. Project Manager"
                className={inputCls}
              />
            </Field>

            {/* Previous Value */}
            <Field label="Previous Value / Status">
              <input
                type="text"
                value={form.old_value}
                onChange={e => set('old_value', e.target.value)}
                placeholder="e.g. draft"
                className={inputCls}
              />
            </Field>

            {/* New Value */}
            <Field label="New Value / Status">
              <input
                type="text"
                value={form.new_value}
                onChange={e => set('new_value', e.target.value)}
                placeholder="e.g. approved"
                className={inputCls}
              />
            </Field>
          </div>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Describe what happened…"
              className={inputCls}
            />
          </Field>

          {/* Comments */}
          <Field label="Comments">
            <textarea
              value={form.comments}
              onChange={e => set('comments', e.target.value)}
              rows={2}
              placeholder="Additional notes…"
              className={inputCls}
            />
          </Field>
        </div>
        )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 text-sm text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors ${
              isEdit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Entry'}
          </button>
        </div>
      </div>
  )

  if (embedded) {
    return (
      <div id="changelog-add-entry" className="scroll-mt-4">
        {panel}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      {panel}
    </div>
  )
}

// ─── View detail modal ───────────────────────────────────────────────────────

function ViewModal({ entry, onClose, onEdit, canEdit }) {
  const [activeTab, setActiveTab] = useState('details')

  const rows = [
    { label: 'CR Reference',   value: entry.change_request?.change_reference },
    { label: 'CR Title',       value: entry.change_request?.change_title },
    { label: 'Project',        value: entry.change_request?.project?.project_name },
    { label: 'Action',         value: <ActionBadge type={entry.action} /> },
    { label: 'Log Type',       value: entry.log_type?.replace(/-/g, ' ') },
    { label: 'Log Date',       value: entry.log_date ? new Date(entry.log_date).toLocaleString() : '—' },
    { label: 'Performed By',   value: entry.performed_by_user?.full_name || entry.performed_by_user?.email || '—' },
    { label: 'Role',           value: entry.performed_by_role || '—' },
    { label: 'Previous Value', value: entry.old_value || '—' },
    { label: 'New Value',      value: entry.new_value || '—' },
    { label: 'Description',    value: entry.description || '—' },
    { label: 'Comments',       value: entry.comments || '—' },
    { label: 'Created By',     value: entry.created_by_user?.full_name || entry.created_by_user?.email || '—' },
    { label: 'Created At',     value: entry.created_at ? new Date(entry.created_at).toLocaleString() : '—' },
  ]

  const tabCls = active =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Log Entry Detail</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 flex-shrink-0">
          <button className={tabCls(activeTab === 'details')}     onClick={() => setActiveTab('details')}>Details</button>
          <button className={tabCls(activeTab === 'attachments')} onClick={() => setActiveTab('attachments')}>Attachments</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'details' ? (
            <div className="space-y-3">
              {rows.map(r => (
                <div key={r.label} className="flex gap-3">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-36 flex-shrink-0 pt-0.5">
                    {r.label}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-white break-words">{r.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <ChangeLogAttachments logEntryId={entry.id} readOnly={!canEdit} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          {canEdit && (
            <button onClick={onEdit}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors">
              <Pencil className="h-4 w-4" /> Edit
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete confirmation ─────────────────────────────────────────────────────

function DeleteModal({ entry, onConfirm, onClose, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Delete Log Entry</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Are you sure you want to delete this log entry?
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {entry.change_request?.change_reference} — {(entry.action || '').replace(/-/g, ' ')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {entry.log_date ? new Date(entry.log_date).toLocaleString() : ''}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
            This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Success toast ───────────────────────────────────────────────────────────

function SuccessToast({ message, details, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white rounded-lg shadow-lg px-5 py-3 flex items-start gap-3 max-w-sm">
      <div className="flex-1">
        <p className="text-sm font-semibold">{message}</p>
        {details && <p className="text-xs mt-0.5 opacity-80">{details}</p>}
      </div>
      <button onClick={onClose}><X className="h-4 w-4 opacity-70 hover:opacity-100" /></button>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ChangeLog({ projectId: propProjectId = null, changeRequestId = null, limit = null }) {
  const [entries,   setEntries]   = useState([])
  const [projects,  setProjects]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [page,      setPage]      = useState(1)

  const [filters, setFilters] = useState({
    project_id: propProjectId || '', action_type: '',
    date_from: '', date_to: '', search: '',
  })

  const [view,    setView]    = useState(() => localStorage.getItem(VIEW_KEY) || 'table')
  const [sort,    setSort]    = useState({ col: 'timestamp', dir: 'desc' })

  // modal state
  const [modal,     setModal]     = useState(null)  // null | 'create' | 'edit' | 'view' | 'delete'
  const [activeEntry, setActive]  = useState(null)
  const [deleting,  setDeleting]  = useState(false)
  const [toast,     setToast]     = useState(null)

  // load
  useEffect(() => { fetchAccessibleProjects().then(setProjects) }, [])
  useEffect(() => { resolveUserId().then(setCurrentUserId) }, [])
  useEffect(() => { load() }, [filters, propProjectId, changeRequestId])

  useEffect(() => {
    if (modal !== 'create') return
    const id = requestAnimationFrame(() => {
      document.getElementById('changelog-add-entry')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(id)
  }, [modal])

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const data = await fetchChangeLog({
        ...filters,
        project_id:        propProjectId || filters.project_id || undefined,
        change_request_id: changeRequestId || undefined,
      })
      setEntries(data); setPage(1)
    } catch (err) {
      setError(err.message || 'Failed to load change log')
    } finally {
      setLoading(false)
    }
  }, [filters, propProjectId, changeRequestId])

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }))
  const clearFilters = () => setFilters({ project_id: propProjectId || '', action_type: '', date_from: '', date_to: '', search: '' })
  const toggleView = v => { setView(v); localStorage.setItem(VIEW_KEY, v) }

  const cycleSort = col => setSort(s => {
    if (s.col !== col) return { col, dir: 'asc' }
    if (s.dir === 'asc') return { col, dir: 'desc' }
    return { col: 'timestamp', dir: 'desc' }
  })

  const sorted = useMemo(() => {
    const arr = [...entries]; const { col, dir } = sort; const mul = dir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      let va, vb
      if      (col === 'timestamp') { va = a.log_date; vb = b.log_date }
      else if (col === 'action')    { va = a.action; vb = b.action }
      else if (col === 'user')      { va = a.performed_by_user?.full_name || ''; vb = b.performed_by_user?.full_name || '' }
      else if (col === 'project')   { va = a.change_request?.project?.project_name || ''; vb = b.change_request?.project?.project_name || '' }
      else if (col === 'cr')        { va = a.change_request?.change_reference || ''; vb = b.change_request?.change_reference || '' }
      else return 0
      return va < vb ? -mul : va > vb ? mul : 0
    })
    return arr
  }, [entries, sort])

  const paged      = useMemo(() => limit ? sorted.slice(0, limit) : sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [sorted, page, limit])
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))

  const exportRows = useMemo(() => sorted.map(e => ({
    cr_reference: e.change_request?.change_reference || '',
    cr_title:     e.change_request?.change_title || '',
    action:       (e.action || '').replace(/-/g, ' '),
    log_type:     (e.log_type || '').replace(/-/g, ' '),
    description:  e.description || '',
    old_value:    e.old_value || '',
    new_value:    e.new_value || '',
    performed_by: e.performed_by_user?.full_name || e.performed_by_user?.email || '',
    timestamp:    e.log_date ? new Date(e.log_date).toLocaleString() : '',
    project:      e.change_request?.project?.project_name || '',
  })), [sorted])

  // modal handlers
  const openCreate = () => {
    if (modal === 'create') {
      closeModal()
      return
    }
    setActive(null)
    setModal('create')
  }
  const openView   = entry => { setActive(entry); setModal('view') }
  const openEdit   = entry => { setActive(entry); setModal('edit') }
  const openDelete = entry => { setActive(entry); setModal('delete') }
  const closeModal = () => { setModal(null); setActive(null) }

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setEntries(prev => prev.map(e => e.id === saved.id ? saved : e))
      setToast({ message: 'Entry updated', details: `${saved.change_request?.change_reference} — ${saved.action}` })
    } else {
      setEntries(prev => [saved, ...prev])
      setToast({ message: 'Entry added', details: `${saved.change_request?.change_reference} — ${saved.action}` })
    }
    closeModal()
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await deleteChangeLogEntry(activeEntry.id)
    setDeleting(false)
    if (res.success) {
      setEntries(prev => prev.filter(e => e.id !== activeEntry.id))
      setToast({ message: 'Entry deleted', details: activeEntry.change_request?.change_reference })
      closeModal()
    } else {
      setError(res.message)
      closeModal()
    }
  }

  // ── render ──

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center text-red-600 dark:text-red-400 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {!limit && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          {/* Top row: search + view toggle + export + add */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={e => setFilter('search', e.target.value)}
                placeholder="Search by CR reference, title or description…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <button onClick={() => toggleView('table')} title="Table view"
                className={`p-2 ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <List className="h-4 w-4" />
              </button>
              <button onClick={() => toggleView('card')} title="Card view"
                className={`p-2 ${view === 'card' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <ExportListMenu columns={EXPORT_COLUMNS} data={exportRows} baseFilename="Change_Log" disabled={exportRows.length === 0} />
            <button
              type="button"
              onClick={openCreate}
              className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                modal === 'create'
                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Plus className="h-4 w-4" /> {modal === 'create' ? 'Close form' : 'Add Entry'}
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {!propProjectId && (
              <select value={filters.project_id} onChange={e => setFilter('project_id', e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <select value={filters.action_type} onChange={e => setFilter('action_type', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">All Actions</option>
              {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a.replace(/-/g, ' ')}</option>)}
            </select>
            <input type="date" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <input type="date" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <button onClick={clearFilters}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Add entry — inline panel (non-modal) */}
      {!limit && modal === 'create' && (
        <EntryModal
          mode="create"
          entry={null}
          projects={projects}
          currentUserId={currentUserId}
          onSave={handleSaved}
          onClose={closeModal}
          embedded
        />
      )}

      {/* Results panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Change Request Log
            {entries.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({entries.length} entries)</span>
            )}
          </h3>
        </div>

        {paged.length === 0 ? (
          <div className="py-16 text-center text-gray-500 dark:text-gray-400 text-sm">
            No change log entries found
          </div>
        ) : view === 'table' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className={thCls} onClick={() => cycleSort('timestamp')}>Timestamp <SortIcon col="timestamp" sort={sort} /></th>
                  <th className={thCls} onClick={() => cycleSort('action')}>Action <SortIcon col="action" sort={sort} /></th>
                  <th className={thCls} onClick={() => cycleSort('cr')}>CR Reference <SortIcon col="cr" sort={sort} /></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className={thCls} onClick={() => cycleSort('user')}>Performed By <SortIcon col="user" sort={sort} /></th>
                  {!propProjectId && <th className={thCls} onClick={() => cycleSort('project')}>Project <SortIcon col="project" sort={sort} /></th>}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status Change</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paged.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {entry.log_date ? new Date(entry.log_date).toLocaleString() : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3"><ActionBadge type={entry.action} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {entry.change_request?.change_reference && (
                        <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{entry.change_request.change_reference}</span>
                      )}
                      {entry.change_request?.change_title && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-[180px] truncate">{entry.change_request.change_title}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[240px]">
                      <span className="line-clamp-2">{entry.description || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-400" />
                        {entry.performed_by_user?.full_name || entry.performed_by_user?.email || 'Unknown'}
                      </div>
                    </td>
                    {!propProjectId && (
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {entry.change_request?.project?.project_name || '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {entry.old_value && entry.new_value ? (
                        <span>
                          <span className="text-gray-400">{entry.old_value}</span>
                          <span className="mx-1">→</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{entry.new_value}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openView(entry)} title="View" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openEdit(entry)} title="Edit" className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => openDelete(entry)} title="Delete" className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {paged.map(entry => (
              <div key={entry.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${ACTION_COLOURS[entry.action] || 'bg-gray-100 dark:bg-gray-700'}`}>
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <ActionBadge type={entry.action} />
                      {entry.change_request?.change_reference && (
                        <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{entry.change_request.change_reference}</span>
                      )}
                      {entry.change_request?.change_title && (
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{entry.change_request.change_title}</span>
                      )}
                    </div>
                    {entry.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{entry.description}</p>}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{entry.performed_by_user?.full_name || entry.performed_by_user?.email || 'Unknown'}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{entry.log_date ? new Date(entry.log_date).toLocaleString() : '—'}</span>
                      {!propProjectId && entry.change_request?.project?.project_name && <span>{entry.change_request.project.project_name}</span>}
                      {entry.old_value && entry.new_value && (
                        <span><span className="text-gray-400">{entry.old_value}</span><span className="mx-1">→</span><span className="font-medium">{entry.new_value}</span></span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openView(entry)} title="View" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => openEdit(entry)} title="Edit" className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => openDelete(entry)} title="Delete" className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!limit && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Next</button>
          </div>
        </div>
      )}

      {/* Modals — edit only (create uses inline panel above) */}
      {modal === 'edit' && (
        <EntryModal
          mode="edit"
          entry={activeEntry}
          projects={projects}
          currentUserId={currentUserId}
          onSave={handleSaved}
          onClose={closeModal}
        />
      )}

      {modal === 'view' && activeEntry && (
        <ViewModal
          entry={activeEntry}
          onClose={closeModal}
          onEdit={() => { setModal('edit') }}
          canEdit
        />
      )}

      {modal === 'delete' && activeEntry && (
        <DeleteModal
          entry={activeEntry}
          onConfirm={handleDelete}
          onClose={closeModal}
          deleting={deleting}
        />
      )}

      {/* Success toast */}
      {toast && (
        <SuccessToast message={toast.message} details={toast.details} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
