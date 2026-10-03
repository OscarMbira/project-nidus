/**
 * RACI Matrix (GAP-10) — combined create/view/edit page. v963 Phase 12.
 * A matrix is fundamentally a live-editable grid, so "view" and "edit" are the
 * same surface here (rule 62 — keep it as simple as it can be while still usable);
 * only the initial "name this matrix" step is a separate lightweight create form
 * (rendered by this same component when there is no :id yet). Mandatory Audit tab
 * (rule 63.1) sits alongside the grid via the standard Details/Audit tab pair.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { usePlatformProjectId } from '../../../hooks/usePlatformProjectId'
import { platformDb } from '@nidus/supabase'
import {
  getRaciMatrix,
  createRaciMatrix,
  updateRaciMatrix,
  getProjectMembersForRaci,
  addRaciRow,
  deleteRaciRow,
  setRaciAssignment,
} from '../services/raciService'

/** Flat sibling routes (pm|pmo/resources/raci*) — never use navigate('..') (route-tree parent is /). */
function useRaciBasePath() {
  const { pathname } = useLocation()
  return pathname.startsWith('/pmo/') ? '/pmo/resources/raci' : '/pm/resources/raci'
}

const ROLES = ['R', 'A', 'C', 'I']
const ROLE_TITLE = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' }
const ROLE_CLASS = {
  R: 'bg-blue-600 text-white border-blue-600',
  A: 'bg-purple-600 text-white border-purple-600',
  C: 'bg-amber-500 text-white border-amber-500',
  I: 'bg-gray-500 text-white border-gray-500',
}

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

export default function RaciMatrixEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = useRaciBasePath()
  const { projectId, routeKey } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const isCreateMode = !id

  const listPath = useMemo(() => {
    const qs = new URLSearchParams(location.search)
    if (routeKey && !qs.get('projectId')) qs.set('projectId', routeKey)
    const q = qs.toString()
    return q ? `${basePath}?${q}` : basePath
  }, [basePath, location.search, routeKey])

  const matrixPath = useCallback(
    (matrixId) => {
      const qs = new URLSearchParams(location.search)
      if (routeKey && !qs.get('projectId')) qs.set('projectId', routeKey)
      const q = qs.toString()
      return q ? `${basePath}/${matrixId}?${q}` : `${basePath}/${matrixId}`
    },
    [basePath, location.search, routeKey],
  )

  const [loading, setLoading] = useState(!isCreateMode)
  const [saving, setSaving] = useState(false)
  const [matrix, setMatrix] = useState(null)
  const [members, setMembers] = useState([])
  const [creatorName, setCreatorName] = useState('—')
  const [activeTab, setActiveTab] = useState('details')
  const [newMatrixName, setNewMatrixName] = useState('')
  const [newRowName, setNewRowName] = useState('')
  const [addingRow, setAddingRow] = useState(false)

  const loadMatrix = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [matrixResult, membersResult] = await Promise.all([
      getRaciMatrix(id),
      getProjectMembersForRaci(projectId),
    ])
    if (matrixResult.success) {
      setMatrix(matrixResult.data)
      if (matrixResult.data.created_by) {
        const { data: user } = await platformDb.from('users').select('full_name').eq('auth_user_id', matrixResult.data.created_by).maybeSingle()
        if (user?.full_name) setCreatorName(user.full_name)
      }
    }
    if (membersResult.success) setMembers(membersResult.data)
    setLoading(false)
  }, [id, projectId])

  useEffect(() => { loadMatrix() }, [loadMatrix])

  const handleCreate = async () => {
    if (!newMatrixName.trim() || !projectId) return
    setSaving(true)
    const result = await createRaciMatrix(projectId, { matrix_name: newMatrixName.trim(), status: 'draft' })
    setSaving(false)
    if (!result.success) return
    showSuccess({
      recordId: result.data.id,
      operation: 'created',
      onOk: () => navigate(matrixPath(result.data.id), { replace: true }),
    })
  }

  const handleStatusChange = async (status) => {
    const result = await updateRaciMatrix(id, { status })
    if (result.success) setMatrix((prev) => ({ ...prev, status }))
  }

  const handleAddRow = async () => {
    if (!newRowName.trim()) return
    setAddingRow(true)
    const result = await addRaciRow(id, { deliverable_name: newRowName.trim(), sort_order: matrix?.rows?.length || 0 })
    setAddingRow(false)
    if (result.success) {
      setNewRowName('')
      await loadMatrix()
    }
  }

  const handleDeleteRow = async (rowId) => {
    const result = await deleteRaciRow(rowId)
    if (result.success) await loadMatrix()
  }

  const handleToggleCell = async (row, authUserId, role) => {
    const isSet = row.assignments.some((a) => a.member_user_id === authUserId && a.raci_role === role)
    // Optimistic update for a snappy grid
    setMatrix((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => {
        if (r.id !== row.id) return r
        return {
          ...r,
          assignments: isSet
            ? r.assignments.filter((a) => !(a.member_user_id === authUserId && a.raci_role === role))
            : [...r.assignments, { member_user_id: authUserId, raci_role: role }],
        }
      }),
    }))
    await setRaciAssignment(row.id, authUserId, role, !isSet)
  }

  const auditCards = useMemo(() => {
    if (!matrix) return null
    return (
      <AuditDetailsPanel description="Who created or changed this RACI matrix.">
        <AuditCard title="Identity">
          <AuditField label="Matrix" value={matrix.matrix_name} />
          <AuditField label="Version" value={matrix.matrix_version} />
        </AuditCard>
        <AuditCard title="Classification">
          <AuditField label="Status" value={matrix.status} />
          <AuditField label="Rows" value={matrix.rows.length} />
        </AuditCard>
        <AuditCard title="Record history">
          <AuditField label="Created by" value={creatorName} />
          <AuditTimestampPair dateLabel="Created at" value={matrix.created_at} />
          <AuditTimestampPair dateLabel="Updated at" value={matrix.updated_at} />
        </AuditCard>
      </AuditDetailsPanel>
    )
  }, [matrix, creatorName])

  if (isCreateMode) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-6">
        <button type="button" onClick={() => navigate(listPath)} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <ArrowLeft className="h-4 w-4" />
          Back to RACI Matrix
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New RACI Matrix</h1>
        <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Matrix name *</label>
            <input type="text" value={newMatrixName} onChange={(e) => setNewMatrixName(e.target.value)} className={inputClass} placeholder="e.g. Delivery workstream RACI" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">You'll add deliverables and assign R/A/C/I roles to project members on the next screen.</p>
        </div>
        <button type="button" onClick={handleCreate} disabled={saving || !newMatrixName.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
          {saving ? 'Creating…' : 'Create & continue'}
        </button>
        {modal}
      </div>
    )
  }

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  if (!matrix) return <div className="p-8 text-gray-500 dark:text-gray-400">RACI matrix not found.</div>

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <button type="button" onClick={() => navigate(listPath)} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to RACI Matrix
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{matrix.matrix_name}</h1>
        <select value={matrix.status} onChange={(e) => handleStatusChange(e.target.value)} className={`${inputClass} w-40`}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="RACI matrix sections" />

      {activeTab === 'details' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {ROLES.map((r) => (
              <span key={r} className="inline-flex items-center gap-1.5">
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold border ${ROLE_CLASS[r]}`}>{r}</span>
                {ROLE_TITLE[r]}
              </span>
            ))}
          </div>

          {members.length === 0 ? (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
              No active project members found to assign. Add members to this project first.
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase sticky left-0 bg-gray-50 dark:bg-gray-700">Deliverable</th>
                    {members.map((m) => (
                      <th key={m.authUserId} className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{m.fullName}</th>
                    ))}
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {matrix.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 whitespace-nowrap">{row.deliverable_name}</td>
                      {members.map((m) => (
                        <td key={m.authUserId} className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {ROLES.map((role) => {
                              const active = row.assignments.some((a) => a.member_user_id === m.authUserId && a.raci_role === role)
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => handleToggleCell(row, m.authUserId, role)}
                                  title={`${ROLE_TITLE[role]} — ${m.fullName}`}
                                  aria-pressed={active}
                                  className={`h-6 w-6 rounded text-[10px] font-bold border transition-colors ${active ? ROLE_CLASS[role] : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                                >
                                  {role}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-3 text-right">
                        <button type="button" onClick={() => handleDeleteRow(row.id)} aria-label={`Remove ${row.deliverable_name}`} className="p-1.5 rounded text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="text" value={newRowName} onChange={(e) => setNewRowName(e.target.value)} placeholder="New deliverable name" className={`${inputClass} max-w-sm`} />
            <button type="button" onClick={handleAddRow} disabled={addingRow || !newRowName.trim()} className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium whitespace-nowrap">
              <Plus className="h-4 w-4" />
              Add row
            </button>
          </div>
        </div>
      ) : auditCards}
      {modal}
    </div>
  )
}
