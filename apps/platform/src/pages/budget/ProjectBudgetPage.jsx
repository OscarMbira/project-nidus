/**
 * Project Budget — Structure/Lines, Approved Budget, Revisions (taxonomy §3 Dashboard/Cost
 * Management > Budget). New dedicated page: project_budget_categories was previously only
 * editable inside the project wizard; this surfaces it as its own register with approval status
 * and revision history.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useFinancialPermissions } from '@nidus/shared/hooks/useFinancialPermissions'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { getByProjectId, saveForProject, getRevisions, setApprovalStatus } from '../../services/projectBudgetCategoryService'
import { getFundingSources } from '../../services/fundingSourceService'
import { getBudgetCategories } from '../../services/budgetCategoryService'
import { describeRevisionChanges } from './budgetRevisionChanges'
import SelectField from '@nidus/ui/SelectField'
import { RowActionButton } from '@nidus/ui'
import { SmartAmountInput } from '@nidus/ui/SmartAmountInput'

const formatAmount = (n) => Number(n || 0).toLocaleString()

function changeLabel(change, fundingNames) {
  const sourceName = (id) => (id ? fundingNames[id] || 'Unknown source' : 'None')
  if (change.type === 'added') return `Added ${change.name} (${formatAmount(change.to)})`
  if (change.type === 'removed') return `Removed ${change.name} (was ${formatAmount(change.from)})`
  if (change.type === 'renamed') return `Renamed ${change.from} → ${change.to}`
  if (change.type === 'funding') return `${change.name} funding source: ${sourceName(change.from)} → ${sourceName(change.to)}`
  return `${change.name}: ${formatAmount(change.from)} → ${formatAmount(change.to)}`
}

const APPROVAL_STYLES = {
  approved: { text: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Approved' },
  pending: { text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20', label: 'Pending Approval' },
  rejected: { text: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Rejected' },
}

export default function ProjectBudgetPage() {
  const { projectId } = usePlatformProjectId()
  const { canManage, canManageAll, readOnlyExecutive } = useFinancialPermissions()
  const { showSuccess, modal } = useSuccessModal()

  const [activeTab, setActiveTab] = useState('lines')
  const [project, setProject] = useState(null)
  const [lines, setLines] = useState([])
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uid, setUid] = useState(null)
  const [fundingSources, setFundingSources] = useState([])
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [categoryMaster, setCategoryMaster] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)
  const [budgetNotes, setBudgetNotes] = useState('')
  const [newLine, setNewLine] = useState({ category_name: '', budget_amount: '', funding_source_id: '' })

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [{ data: p }, catRes, fundsRes] = await Promise.all([
        platformDb
          .from('projects')
          .select('project_name, project_code, budget_currency, budget_approval_status, budget_approved_by, budget_approved_at, budget_notes')
          .eq('id', projectId)
          .single(),
        getByProjectId(projectId),
        getFundingSources(),
      ])
      setProject(p)
      setBudgetNotes(p?.budget_notes || '')
      setLines(catRes.success ? catRes.data : [])
      setFundingSources(fundsRes.success !== false ? fundsRes.data || [] : [])

      const {
        data: { user },
      } = await platformDb.auth.getUser()
      if (user) {
        const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        setUid(u?.id || null)
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to load budget')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    getBudgetCategories().then((res) => {
      if (res.success) setCategoryMaster(res.data)
    })
  }, [])

  useEffect(() => {
    if (activeTab !== 'revisions' || !projectId) return
    getRevisions(projectId).then((res) => {
      if (res.success) setRevisions(res.data)
    })
  }, [activeTab, projectId])

  useEffect(() => {
    if (activeTab !== 'audit' || !project) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [project.budget_approved_by])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [activeTab, project])

  const totalAmount = lines.reduce((sum, l) => sum + (Number(l.budget_amount) || 0), 0)
  const fundingNames = Object.fromEntries(fundingSources.map((f) => [f.id, f.name]))
  const approvalStyle = APPROVAL_STYLES[project?.budget_approval_status]

  const persistLines = async (nextLines) => {
    setSaving(true)
    try {
      const toSave = nextLines.map((l) => ({
        category_name: l.category_name,
        budget_amount: l.budget_amount,
        funding_source_id: l.funding_source_id || null,
        notes: l.notes || null,
      }))
      const res = await saveForProject(projectId, toSave, uid)
      if (!res.success) throw new Error(res.error || 'Save failed')
      await load()
      showSuccess({ recordId: project?.project_code, operation: 'updated', message: 'Budget lines saved.' })
    } catch (e) {
      toast.error(e?.message || 'Failed to save budget lines')
    } finally {
      setSaving(false)
    }
  }

  const handleAddLine = async (e) => {
    e.preventDefault()
    const name = newLine.category_name.trim()
    const amount = Number(newLine.budget_amount)
    if (!name || !(amount > 0)) {
      toast.error('Enter a category and an amount greater than 0.')
      return
    }
    const line = { ...newLine, category_name: name, budget_amount: amount, notes: newLine.notes?.trim() || null }
    const nextLines = editingIndex === null ? [...lines, line] : lines.map((l, i) => (i === editingIndex ? line : l))
    await persistLines(nextLines)
    setEditingIndex(null)
    setNewLine({ category_name: '', budget_amount: '', funding_source_id: '', notes: '' })
  }

  const handleEditLine = (index) => {
    const line = lines[index]
    setEditingIndex(index)
    setNewLine({
      category_name: line.category_name || '',
      budget_amount: String(line.budget_amount ?? ''),
      funding_source_id: line.funding_source_id || '',
      notes: line.notes || '',
    })
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setNewLine({ category_name: '', budget_amount: '', funding_source_id: '', notes: '' })
  }

  const handleRemoveLine = async (index) => {
    await persistLines(lines.filter((_, i) => i !== index))
  }

  const saveBudgetNotes = async () => {
    setSaving(true)
    try {
      const { error } = await platformDb
        .from('projects')
        .update({ budget_notes: budgetNotes.trim() || null })
        .eq('id', projectId)
      if (error) throw error
      toast.success('Budget notes saved.')
      await load()
    } catch (e) {
      toast.error(e?.message || 'Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  const handleApprovalChange = async (status) => {
    setSaving(true)
    try {
      const res = await setApprovalStatus(projectId, status, uid)
      if (!res.success) throw new Error(res.error || 'Failed to update approval status')
      await load()
      showSuccess({
        recordId: project?.project_code,
        operation: 'updated',
        message: status === 'approved' ? 'Budget approved.' : 'Budget approval status updated.',
      })
    } catch (e) {
      toast.error(e?.message || 'Failed to update approval status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to={`/platform/projects/${projectId}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Budget</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project?.project_code} — {project?.project_name}</p>
          </div>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <DetailAuditTabList
            activeTab={activeTab}
            onChange={setActiveTab}
            ariaLabel="Budget sections"
            tabs={[
              { value: 'lines', label: 'Budget Lines' },
              { value: 'notes', label: 'Notes' },
              { value: 'revisions', label: 'Revision History' },
              { value: 'audit', label: 'Audit details' },
            ]}
          />
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : activeTab === 'lines' ? (
          <div className="space-y-4">
            <div className={`rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-wrap items-center justify-between gap-3 ${approvalStyle?.bg || 'bg-white dark:bg-gray-900'}`}>
              <div>
                <p className={`text-sm font-semibold ${approvalStyle?.text || 'text-gray-700 dark:text-gray-300'}`}>
                  {approvalStyle?.label || 'No approval status set'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Total budget: {project?.budget_currency || ''} {totalAmount.toLocaleString()}
                </p>
              </div>
              {canManage && !readOnlyExecutive && !canManageAll && (
                <button
                  type="button"
                  disabled={saving || project?.budget_approval_status === 'pending' || project?.budget_approval_status === 'approved'}
                  onClick={() => handleApprovalChange('pending')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                >
                  Submit for approval
                </button>
              )}
              {canManageAll && !readOnlyExecutive && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving || project?.budget_approval_status === 'approved'}
                    onClick={() => handleApprovalChange('approved')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={saving || project?.budget_approval_status === 'rejected'}
                    onClick={() => handleApprovalChange('rejected')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <TableRowNumberHeader className="!normal-case" />
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Funding Source</th>
                    {canManage && !readOnlyExecutive && <th className="px-4 py-2 text-left">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                        No budget lines yet.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, index) => (
                      <tr key={`${line.category_name}-${index}`}>
                        <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <td className="px-4 py-2">
                          {line.category_name}
                          {line.notes && <div className="text-xs text-gray-500 dark:text-gray-400">{line.notes}</div>}
                        </td>
                        <td className="px-4 py-2 tabular-nums">{Number(line.budget_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-2">{line.funding_sources?.name || '—'}</td>
                        {canManage && !readOnlyExecutive && (
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                            <RowActionButton variant="edit" label={`Edit ${line.category_name}`} onClick={() => handleEditLine(index)} />
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(index)}
                              disabled={saving}
                              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                              aria-label={`Remove ${line.category_name}`}
                              title="Remove line"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {lines.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-800 font-semibold">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-right">Total</td>
                      <td className="px-4 py-2 tabular-nums">
                        {project?.budget_currency ? `${project.budget_currency} ` : ''}{totalAmount.toLocaleString()}
                      </td>
                      <td colSpan={canManage && !readOnlyExecutive ? 2 : 1} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {canManage && !readOnlyExecutive && (
              <form onSubmit={handleAddLine} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <SelectField
                  options={categoryMaster.map((c) => ({ value: c.name, label: c.name }))}
                  value={newLine.category_name}
                  onChange={(v) => setNewLine({ ...newLine, category_name: v })}
                  placeholder="Select category…"
                  forceSearchable
                />
                <SmartAmountInput
                  value={newLine.budget_amount === '' ? null : Number(newLine.budget_amount)}
                  onChange={(v) => setNewLine({ ...newLine, budget_amount: v ?? '' })}
                  placeholder="Amount (e.g. 10k, 3M)"
                  currency={project?.budget_currency}
                  min={0}
                />
                <select
                  value={newLine.funding_source_id}
                  onChange={(e) => setNewLine({ ...newLine, funding_source_id: e.target.value })}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                >
                  <option value="">Funding source (optional)</option>
                  {fundingSources.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <input
                  placeholder="Notes (optional)"
                  value={newLine.notes}
                  onChange={(e) => setNewLine({ ...newLine, notes: e.target.value })}
                  className="md:col-span-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
                />
                {editingIndex !== null && (
                  <button type="button" onClick={handleCancelEdit} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">
                  {editingIndex === null ? (<><Plus className="h-4 w-4" /> Add line</>) : 'Save line'}
                </button>
              </form>
            )}
          </div>
        ) : activeTab === 'notes' ? (
          <div className="space-y-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <label htmlFor="budget-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Overall budget notes</label>
            <textarea
              id="budget-notes"
              rows={6}
              value={budgetNotes}
              onChange={(e) => setBudgetNotes(e.target.value)}
              disabled={!canManage || readOnlyExecutive}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
            />
            {canManage && !readOnlyExecutive && (
              <div className="flex justify-end">
                <button type="button" onClick={saveBudgetNotes} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50">
                  Save notes
                </button>
              </div>
            )}
          </div>
        ) : activeTab === 'revisions' ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left">Revision</th>
                  <th className="px-4 py-2 text-left">Total</th>
                  <th className="px-4 py-2 text-left">What changed</th>
                  <th className="px-4 py-2 text-left">Status at revision</th>
                  <th className="px-4 py-2 text-left">Saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {revisions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                      No prior revisions — this budget hasn't been changed since it was first saved.
                    </td>
                  </tr>
                ) : (
                  revisions.map((rev, i) => (
                    <tr key={rev.id}>
                      <td className="px-4 py-2">#{rev.revision_number}</td>
                      <td className="px-4 py-2 tabular-nums">{rev.currency || ''} {Number(rev.total_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-2">
                        {(() => {
                          const changes = describeRevisionChanges(rev.budget_categories, i === 0 ? lines : revisions[i - 1].budget_categories)
                          if (changes.length === 0) return <span className="text-gray-500 dark:text-gray-400">No line changes</span>
                          return (
                            <ul className="space-y-0.5">
                              {changes.map((change, n) => (
                                <li key={n}>{changeLabel(change, fundingNames)}</li>
                              ))}
                            </ul>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-2">{rev.approval_status_at_revision ? humanizeAuditToken(rev.approval_status_at_revision) : 'Not set'}</td>
                      <td className="px-4 py-2">{rev.created_at ? new Date(rev.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <AuditDetailsPanel description="Budget approval status and where this project's budget stands.">
            <AuditCard title="Identity" description="How this project's budget is labelled.">
              <AuditField label="Project" value={project?.project_name} />
              <AuditField label="Currency" value={project?.budget_currency} />
              <AuditField label="Total budget" value={totalAmount ? totalAmount.toLocaleString() : null} />
            </AuditCard>
            <AuditCard title="Classification" description="Approval status.">
              <AuditField label="Approval status" value={humanizeAuditToken(project?.budget_approval_status)} />
            </AuditCard>
            <AuditCard title="Record history" description="When the budget was approved, and by whom.">
              <AuditField label="Approved by" value={project?.budget_approved_by ? auditUserLabels[project.budget_approved_by] || null : null} />
              <AuditTimestampPair dateLabel="Approved at" value={project?.budget_approved_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )}
      </div>
      {modal}
    </div>
  )
}
