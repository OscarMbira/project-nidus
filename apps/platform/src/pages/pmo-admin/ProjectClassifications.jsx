/**
 * Project Classifications (v982 Phase 2 — PMO Configuration Zone)
 * PMO Admin defines classification/complexity levels once; projects can link to one
 * (public.project_classifications, projects.classification_id).
 * Route: /platform/pmo-admin/project-classifications
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus, LayoutGrid, List, Search, ArrowLeft, Save, X } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton } from '@nidus/ui'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { platformDb } from '@nidus/supabase'
import RowNumberBadge from '../../components/ui/RowNumberBadge'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
import {
  getPmoConfigAccess,
  getProjectClassifications,
  createProjectClassification,
  updateProjectClassification,
  deleteProjectClassification,
} from '../../services/projectClassificationService'

const COMPLEXITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'very_high', label: 'Very High' },
]

const EMPTY_FORM = { classification_code: '', classification_name: '', complexity_level: 'medium', description: '', color: '#3B82F6', is_active: true }

export default function ProjectClassifications() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useViewMode('pmo-project-classifications', 'list')
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)
  const [canManage, setCanManage] = useState(false)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const access = await getPmoConfigAccess()
    if (!access.success || !access.accountId) {
      setError(access.error || 'Could not resolve your organisation')
      setLoading(false)
      return
    }
    setAccountId(access.accountId)
    setCanManage(access.canManage)
    const res = await getProjectClassifications(access.accountId)
    if (res.success) setRows(res.data)
    else setError(res.error)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (formTab !== 'audit' || !editing) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [editing.created_by, editing.updated_by])
      setAuditUserLabels(labels)
    })()
  }, [formTab, editing])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? rows.filter((r) => r.classification_name?.toLowerCase().includes(q) || r.classification_code?.toLowerCase().includes(q))
      : rows
    return [...list].sort((a, b) => String(a.classification_name || '').localeCompare(String(b.classification_name || ''), undefined, { sensitivity: 'base' }))
  }, [rows, search])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormTab('details')
    setShowForm(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      classification_code: row.classification_code || '',
      classification_name: row.classification_name || '',
      complexity_level: row.complexity_level || 'medium',
      description: row.description || '',
      color: row.color || '#3B82F6',
      is_active: row.is_active !== false,
    })
    setFormTab('details')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete classification "${row.classification_name}"? This cannot be undone.`)) return
    const result = await deleteProjectClassification(row.id)
    if (!result.success) { setError(result.error); return }
    showSuccess({ recordId: row.classification_code, operation: 'deleted', message: `"${row.classification_name}" was deleted.` })
    load()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.classification_code.trim() || !form.classification_name.trim()) {
      setError('Code and name are required')
      return
    }
    setSaving(true)
    setError(null)
    const payload = { ...form, account_id: accountId }
    const result = editing
      ? await updateProjectClassification(editing.id, payload)
      : await createProjectClassification(payload)
    setSaving(false)
    if (!result.success) { setError(result.error); return }
    showSuccess({
      recordId: result.data.classification_code,
      operation: editing ? 'updated' : 'created',
      message: `"${result.data.classification_name}" was ${editing ? 'updated' : 'created'} successfully.`,
    })
    closeForm()
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading project classifications…</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Layers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Classifications</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Define complexity levels and link them to project governance</p>
          </div>
        </div>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Classification
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? 'Edit Classification' : 'Add Classification'}</h2>
          <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
          {formTab === 'audit' ? (
            <div className="mt-4">
              {!editing ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this classification is saved.</p>
              ) : (
                <AuditDetailsPanel description="Who created or changed this classification.">
                  <AuditCard title="Identity" description="How this classification is labelled.">
                    <AuditField label="Code" value={editing.classification_code} />
                    <AuditField label="Name" value={editing.classification_name} />
                  </AuditCard>
                  <AuditCard title="Classification" description="Complexity and status.">
                    <AuditField label="Complexity level" value={COMPLEXITY_LEVELS.find((l) => l.value === editing.complexity_level)?.label || editing.complexity_level} />
                    <AuditField label="Active" value={editing.is_active ? 'Yes' : 'No'} />
                  </AuditCard>
                  <AuditCard title="Record history" description="When this classification was created and last changed.">
                    <AuditField label="Created by" value={editing.created_by ? auditUserLabels[editing.created_by] || null : null} />
                    <AuditTimestampPair dateLabel="Created at" value={editing.created_at} />
                    <AuditField label="Updated by" value={editing.updated_by ? auditUserLabels[editing.updated_by] || null : null} />
                    <AuditTimestampPair dateLabel="Last updated" value={editing.updated_at} />
                  </AuditCard>
                </AuditDetailsPanel>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code *</label>
                  <input type="text" value={form.classification_code} onChange={(e) => setForm((f) => ({ ...f, classification_code: e.target.value.toUpperCase() }))} required placeholder="e.g. STANDARD" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                  <input type="text" value={form.classification_name} onChange={(e) => setForm((f) => ({ ...f, classification_name: e.target.value }))} required placeholder="e.g. Standard Complexity" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Complexity level</label>
                  <select value={form.complexity_level} onChange={(e) => setForm((f) => ({ ...f, complexity_level: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                    {COMPLEXITY_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Colour</label>
                  <input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded border-gray-300 dark:border-gray-600" />
                Active
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
                </button>
                <button type="button" onClick={closeForm} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Classifications ({filtered.length})</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white" />
            </div>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} aria-label="Table view"><List className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} aria-label="Card view"><LayoutGrid className="h-4 w-4" /></button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No classifications match your search.</div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Complexity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((row, index) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 tabular-nums">{getDisplayRowNumber(index)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">{row.classification_code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.color && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{row.classification_name}</span>
                      </div>
                      {row.description && <div className="text-xs text-gray-500 dark:text-gray-400">{row.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{COMPLEXITY_LEVELS.find((l) => l.value === row.complexity_level)?.label || row.complexity_level}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${row.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {row.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <>
                            <RowActionButton variant="edit" label="Edit classification" onClick={() => openEdit(row)} />
                            <RowActionButton variant="delete" label="Delete classification" onClick={() => handleDelete(row)} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((row, index) => (
              <div key={row.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <RowNumberBadge number={getDisplayRowNumber(index)} />
                  <span className={`px-2 py-0.5 text-xs rounded-full ${row.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                    {row.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {row.color && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />}
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{row.classification_name}</div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{row.classification_code} · {COMPLEXITY_LEVELS.find((l) => l.value === row.complexity_level)?.label || row.complexity_level}</div>
                {row.description && <div className="text-xs text-gray-500 dark:text-gray-400">{row.description}</div>}
                {canManage && (
                  <div className="flex items-center gap-1 pt-1">
                    <RowActionButton variant="edit" label="Edit classification" onClick={() => openEdit(row)} />
                    <RowActionButton variant="delete" label="Delete classification" onClick={() => handleDelete(row)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {successModal}
    </div>
  )
}
