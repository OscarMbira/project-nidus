/**
 * Cost Actuals Ledger — create/edit form (v963 Phase 6). Routed page per rule 65. Success modal
 * (rule 16) and unsaved-changes guard (rule 52). Amount shorthand entry (10k/3m) per rule 36
 * would apply here if this codebase's shared amount-parser hook is adopted opportunistically —
 * kept as a plain numeric input for this initial build to keep the form simple (rule 62).
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getCostActual, createCostActual, updateCostActual } from '../../services/costActualsService'
import { getByProjectId } from '../../services/projectBudgetCategoryService'

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

export default function CostActualForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!id

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [transactionType, setTransactionType] = useState('actual')
  const [amount, setAmount] = useState('')
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('')
  const [budgetLines, setBudgetLines] = useState([])

  useEffect(() => {
    if (!projectId) return
    getByProjectId(projectId).then((res) => {
      if (res.success) setBudgetLines(res.data)
    })
  }, [projectId])

  const categoryOptions = [...new Set([...budgetLines.map((l) => l.category_name), category].filter(Boolean))]
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isEdit) {
        setLoading(true)
        const result = await getCostActual(id)
        if (cancelled) return
        const r = result.data
        setTransactionType(r?.transaction_type || 'actual')
        setAmount(r?.amount != null ? String(r.amount) : '')
        setTransactionDate(r?.transaction_date || '')
        setCategory(r?.category || '')
        setDescription(r?.description || '')
        setNotes(r?.notes || '')
        setInitialSnapshot(JSON.stringify({ transactionType: r?.transaction_type, amount: r?.amount, transactionDate: r?.transaction_date, category: r?.category, description: r?.description, notes: r?.notes }))
        setLoading(false)
      } else {
        setInitialSnapshot(JSON.stringify({ transactionType: 'actual', amount: '', transactionDate, category: '', description: '', notes: '' }))
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  const isDirty = useMemo(() => {
    if (initialSnapshot === null) return false
    return JSON.stringify({ transactionType, amount, transactionDate, category, description, notes }) !== initialSnapshot
  }, [transactionType, amount, transactionDate, category, description, notes, initialSnapshot])

  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this cost actual entry.'
  )

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''
  const listPath = `/platform/cost-actuals${projectSuffix}`

  const isValid = amount !== '' && !Number.isNaN(Number(amount)) && !!transactionDate

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    const payload = {
      transactionType,
      amount: Number(amount),
      transactionDate,
      category: category.trim() || null,
      description: description.trim() || null,
      notes: notes.trim() || null,
    }
    const result = isEdit
      ? await updateCostActual(id, payload)
      : await createCostActual({ ...payload, projectId: projectId || searchParams.get('projectId') })
    setSaving(false)
    if (!result.success) return

    showSuccess({
      recordId: isEdit ? id : result.data?.id,
      operation: isEdit ? 'updated' : 'created',
      onOk: () => navigate(listPath, { replace: true }),
    })
  }

  const handleCancel = () => {
    if (isDirty) confirmDiscard(() => navigate(listPath))
    else requestNavigation(listPath)
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Cost Actuals
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {isEdit ? 'Edit Cost Actual Entry' : 'New Cost Actual Entry'}
      </h1>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Type *</label>
            <select value={transactionType} onChange={(e) => setTransactionType(e.target.value)} className={inputClass}>
              <option value="actual">Actual</option>
              <option value="commitment">Commitment</option>
              <option value="accrual">Accrual</option>
            </select>
          </div>
          <div>
            <label htmlFor="cost-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
            <input
              id="cost-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transaction Date *</label>
            <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="cost-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <select id="cost-category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              <option value="">Select a budget line…</option>
              {categoryOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="cost-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea id="cost-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
        </div>

        <div>
          <label htmlFor="cost-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <textarea id="cost-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} placeholder="Any additional context (e.g. approval details)" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isValid}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={handleCancel} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
          Cancel
        </button>
      </div>
      {modal}
    </div>
  )
}
