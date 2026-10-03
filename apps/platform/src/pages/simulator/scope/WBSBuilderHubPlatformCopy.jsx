/**
 * Work Breakdown Structure hub (v1024) — Hierarchy | Dictionary | Control Accounts | Work Packages link.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useProjectRole } from '@nidus/shared/hooks/useProjectRole'
import { platformDb } from '@nidus/supabase'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { listWbsNodes, saveWbsNode, softDeleteWbsNode } from '../../services/wbsNodeService'
import WBSTreeView from '../../components/scope/WBSTreeView'
import WBSNodeForm from '../../components/scope/WBSNodeForm'
import {
  listControlAccounts,
  createControlAccount,
  updateControlAccount,
  softDeleteControlAccount,
} from '../../services/controlAccountService'

const TABS = [
  { id: 'hierarchy', label: 'WBS Hierarchy' },
  { id: 'dictionary', label: 'WBS Dictionary' },
  { id: 'control_accounts', label: 'Control Accounts' },
  { id: 'work_packages', label: 'Work Packages' },
]

const CA_EMPTY = {
  name: '',
  code: '',
  wbs_node_id: '',
  budget_amount: '',
  status: 'active',
  notes: '',
}

export default function WBSBuilder() {
  const { projectId, routeKey } = usePlatformProjectId()
  const { canEdit } = useProjectRole(projectId)
  const { showSuccess, modal } = useSuccessModal()
  const [tab, setTab] = useState('hierarchy')
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editNode, setEditNode] = useState(null)
  const [parentForNew, setParentForNew] = useState(null)
  const [dictRows, setDictRows] = useState([])
  const [accounts, setAccounts] = useState([])
  const [caFormOpen, setCaFormOpen] = useState(false)
  const [caEditId, setCaEditId] = useState(null)
  const [caForm, setCaForm] = useState(CA_EMPTY)

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''

  const loadNodes = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const res = await listWbsNodes(projectId)
    if (res.success) setNodes(res.data || [])
    setLoading(false)
  }, [projectId])

  const loadDictionary = useCallback(async () => {
    if (!projectId) return
    const { data, error } = await platformDb
      .from('wbs_dictionary_entries')
      .select('id, reference_code, title, status, description, wbs_node_id, created_at')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('title', { ascending: true })
    if (error) toast.error(error.message)
    else setDictRows(data || [])
  }, [projectId])

  const loadAccounts = useCallback(async () => {
    if (!projectId) return
    const res = await listControlAccounts(projectId)
    if (res.success) setAccounts(res.data || [])
    else toast.error(res.error || 'Failed to load control accounts')
  }, [projectId])

  useEffect(() => { loadNodes() }, [loadNodes])
  useEffect(() => {
    if (tab === 'dictionary') loadDictionary()
    if (tab === 'control_accounts') loadAccounts()
  }, [tab, loadDictionary, loadAccounts])

  const onSubmitForm = async (payload) => {
    if (!projectId || !canEdit) return
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user) return
    const res = await saveWbsNode(projectId, payload, user.id)
    if (res.success) {
      showSuccess({ recordId: res.data?.display_id || res.data?.id, operation: editNode ? 'updated' : 'created', message: 'WBS node saved.' })
      setFormOpen(false)
      setEditNode(null)
      setParentForNew(null)
      loadNodes()
    } else toast.error(res.error)
  }

  const onDelete = async (node) => {
    if (!projectId || !canEdit) return
    if (!window.confirm(`Delete node "${node.title}"?`)) return
    const res = await softDeleteWbsNode(node.id, projectId, null)
    if (res.success) {
      showSuccess({ recordId: node.title, operation: 'deleted', message: 'WBS node deleted.' })
      loadNodes()
    } else toast.error(res.error)
  }

  const saveCa = async (e) => {
    e.preventDefault()
    if (!projectId || !canEdit || !caForm.name.trim()) return
    const { data: { user } } = await platformDb.auth.getUser()
    const fields = {
      ...caForm,
      wbs_node_id: caForm.wbs_node_id || null,
      budget_amount: caForm.budget_amount === '' ? null : Number(caForm.budget_amount),
    }
    const res = caEditId
      ? await updateControlAccount(caEditId, fields, user?.id)
      : await createControlAccount(projectId, fields, user?.id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    showSuccess({
      recordId: res.data?.display_id || res.data?.name,
      operation: caEditId ? 'updated' : 'created',
      message: 'Control account saved.',
    })
    setCaFormOpen(false)
    setCaEditId(null)
    setCaForm(CA_EMPTY)
    loadAccounts()
  }

  if (!projectId) {
    return <p className="p-6 text-amber-700 dark:text-amber-300">Select a project to manage the WBS.</p>
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      {modal}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Work Breakdown Structure</h1>
          <p className="text-sm text-gray-700 dark:text-gray-200">Hierarchy, dictionary, and lean control accounts.</p>
        </div>
        {canEdit && tab === 'hierarchy' && (
          <button
            type="button"
            onClick={() => { setEditNode(null); setParentForNew(null); setFormOpen(true) }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
          >
            Add root node
          </button>
        )}
        {canEdit && tab === 'control_accounts' && (
          <button
            type="button"
            onClick={() => { setCaEditId(null); setCaForm(CA_EMPTY); setCaFormOpen(true) }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
          >
            Add control account
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id
                ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-gray-700 dark:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'hierarchy' && (
        loading ? (
          <p className="text-gray-700 dark:text-gray-200">Loading…</p>
        ) : (
          <>
            <WBSTreeView
              nodes={nodes}
              canEdit={canEdit}
              onEdit={(n) => { setEditNode(n); setParentForNew(null); setFormOpen(true) }}
              onDelete={onDelete}
              onAddChild={(n) => { setEditNode(null); setParentForNew(n.id); setFormOpen(true) }}
            />
            {formOpen && (
              <WBSNodeForm
                initial={editNode}
                parentId={parentForNew}
                onSubmit={onSubmitForm}
                onCancel={() => { setFormOpen(false); setEditNode(null); setParentForNew(null) }}
              />
            )}
          </>
        )
      )}

      {tab === 'dictionary' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between gap-2">
            <p className="text-sm text-gray-700 dark:text-gray-200">Reuses WBS dictionary entries (process template store).</p>
            <Link
              to={`/pm/process-templates/t/wbs-dictionary${projectSuffix}`}
              className="text-sm text-blue-600 dark:text-blue-400 underline"
            >
              Open full dictionary
            </Link>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-gray-900 dark:text-gray-100">Reference</th>
                <th className="px-3 py-2 text-left text-gray-900 dark:text-gray-100">Title</th>
                <th className="px-3 py-2 text-left text-gray-900 dark:text-gray-100">Status</th>
              </tr>
            </thead>
            <tbody>
              {dictRows.map((r) => (
                <tr key={r.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{r.reference_code || '—'}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{r.title}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{r.status}</td>
                </tr>
              ))}
              {dictRows.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-4 text-gray-700 dark:text-gray-200">No dictionary entries for this project.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'control_accounts' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Budget</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{a.display_id || a.id.slice(0, 8)}</td>
                  <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{a.name}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{a.code || '—'}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{a.budget_amount ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{a.status}</td>
                  <td className="px-3 py-2 space-x-2">
                    {canEdit && (
                      <>
                        <button type="button" className="text-amber-600" onClick={() => {
                          setCaEditId(a.id)
                          setCaForm({
                            name: a.name || '',
                            code: a.code || '',
                            wbs_node_id: a.wbs_node_id || '',
                            budget_amount: a.budget_amount ?? '',
                            status: a.status || 'active',
                            notes: a.notes || '',
                          })
                          setCaFormOpen(true)
                        }}>Edit</button>
                        <button type="button" className="text-red-600" onClick={async () => {
                          if (!window.confirm(`Delete "${a.name}"?`)) return
                          const { data: { user } } = await platformDb.auth.getUser()
                          const res = await softDeleteControlAccount(a.id, user?.id)
                          if (res.success) { showSuccess({ recordId: a.display_id || a.name, operation: 'deleted', message: 'Control account deleted.' }); loadAccounts() }
                          else toast.error(res.error)
                        }}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-gray-700 dark:text-gray-200">No control accounts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'work_packages' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
            Work Packages stay on their existing Delivery menu. Open the register from here.
          </p>
          <Link to={`/pm/delivery/work-packages${projectSuffix}`} className="text-blue-600 dark:text-blue-400 underline text-sm">
            Open Work Packages
          </Link>
        </div>
      )}

      {caFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={saveCa} className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{caEditId ? 'Edit control account' : 'New control account'}</h2>
            <label className="block text-xs">Name
              <input required value={caForm.name} onChange={(e) => setCaForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" />
            </label>
            <label className="block text-xs">Code
              <input value={caForm.code} onChange={(e) => setCaForm((f) => ({ ...f, code: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" />
            </label>
            <label className="block text-xs">WBS node
              <select value={caForm.wbs_node_id} onChange={(e) => setCaForm((f) => ({ ...f, wbs_node_id: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2">
                <option value="">—</option>
                {nodes.map((n) => <option key={n.id} value={n.id}>{n.title || n.id}</option>)}
              </select>
            </label>
            <label className="block text-xs">Budget
              <input type="number" step="0.01" value={caForm.budget_amount} onChange={(e) => setCaForm((f) => ({ ...f, budget_amount: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" />
            </label>
            <label className="block text-xs">Status
              <select value={caForm.status} onChange={(e) => setCaForm((f) => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2">
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="on_hold">on_hold</option>
                <option value="closed">closed</option>
              </select>
            </label>
            <label className="block text-xs">Notes
              <textarea value={caForm.notes} onChange={(e) => setCaForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                className="mt-1 w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCaFormOpen(false)} className="px-3 py-2 text-sm rounded border">Cancel</button>
              <button type="submit" className="px-3 py-2 text-sm rounded bg-blue-600 text-white">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
