import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { getExpenseClaim, getExpenseClaimItems } from '../../services/expenseClaimService'
import ExpenseItemsTable from '@nidus/ui/ExpenseItemsTable'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

export default function ExpenseClaimDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [claim, setClaim] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getExpenseClaim(id)
      .then((data) => { if (!cancelled) setClaim(data) })
      .catch((e) => toast.error(e?.message || 'Failed to load claim'))
      .finally(() => { if (!cancelled) setLoading(false) })
    getExpenseClaimItems(id)
      .then((data) => { if (!cancelled) setItems(data || []) })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (formTab !== 'audit' || !claim) return
    let cancelled = false
    resolveAuditUserLabels(platformDb, [claim.submitted_by_user_id]).then((labels) => {
      if (!cancelled) setAuditUserLabels(labels || {})
    })
    return () => { cancelled = true }
  }, [formTab, claim])

  const exportSections = useMemo(() => {
    if (!claim) return []
    return [
      {
        title: 'Claim',
        fields: [
          { key: 'project', label: 'Project' },
          { key: 'status', label: 'Status' },
          { key: 'amount', label: 'Amount' },
          { key: 'expense_date', label: 'Expense date' },
          { key: 'reimbursable', label: 'Reimbursable' },
          { key: 'vendor_name', label: 'Vendor' },
          { key: 'description', label: 'Description' },
          { key: 'notes', label: 'Notes' },
          ...(items.length > 0 ? [{ key: 'items', label: 'Items' }] : []),
        ],
      },
    ]
  }, [claim, items])

  const exportRecord = useMemo(() => {
    if (!claim) return {}
    return {
      project: `${claim.projects?.project_code || ''} — ${claim.projects?.project_name || ''}`.trim(),
      status: (claim.claim_status || '').replace(/_/g, ' '),
      amount: `${Number(claim.amount || 0).toLocaleString()} ${claim.currency || ''}`.trim(),
      expense_date: claim.expense_date,
      reimbursable: claim.is_reimbursable ? 'Yes' : 'No',
      vendor_name: claim.vendor_name || '',
      description: claim.description || '',
      notes: claim.notes || '',
      items: items.map((it) => `${it.description} — ${Number(it.amount).toLocaleString()} ${claim.currency || ''}`.trim()),
    }
  }, [claim, items])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-gray-500 dark:text-gray-400">Claim not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Expense claim</h1>
          <ExportRecordMenu sections={exportSections} record={exportRecord} baseFilename={`ExpenseClaim_${claim.id}`} />
        </div>

        <DetailAuditTabList
          activeTab={formTab}
          onChange={setFormTab}
          tabs={[
            { value: 'details', label: 'Details' },
            { value: 'audit', label: 'Audit details' },
          ]}
        />

        {formTab === 'details' && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Project</div>
                <div className="font-medium">{claim.projects?.project_code}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{claim.projects?.project_name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</div>
                <div className="font-medium capitalize">{(claim.claim_status || '').replace(/_/g, ' ')}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Amount</div>
                <div className="font-medium tabular-nums">{Number(claim.amount || 0).toLocaleString()} {claim.currency}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Expense date</div>
                <div className="font-medium">{claim.expense_date}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Reimbursable</div>
                <div className="font-medium">{claim.is_reimbursable ? 'Yes' : 'No'}</div>
              </div>
              {claim.vendor_name && (
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Vendor</div>
                  <div className="font-medium">{claim.vendor_name}</div>
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</div>
              <p>{claim.description || '—'}</p>
            </div>
            {claim.notes && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes</div>
                <p className="whitespace-pre-wrap">{claim.notes}</p>
              </div>
            )}
            {items.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Items</div>
                <ExpenseItemsTable items={items} onChange={() => {}} categories={[]} currency={claim.currency} readOnly />
              </div>
            )}
          </div>
        )}

        {formTab === 'audit' && (
          <AuditDetailsPanel description="Who submitted this claim, and its current status.">
            <AuditCard title="Identity" description="How this claim is labelled.">
              <AuditField label="Project" value={claim.projects?.project_code} />
              <AuditField label="Status" value={humanizeAuditToken(claim.claim_status)} />
            </AuditCard>
            <AuditCard title="Classification" description="Currency and reimbursement.">
              <AuditField label="Currency" value={claim.currency} />
              <AuditField label="Reimbursable" value={claim.is_reimbursable ? 'Yes' : 'No'} />
            </AuditCard>
            <AuditCard title="Record history" description="When this claim was created and last changed.">
              <AuditField label="Submitted by" value={claim.submitted_by_user_id ? auditUserLabels[claim.submitted_by_user_id] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={claim.created_at} />
              <AuditTimestampPair dateLabel="Last updated" value={claim.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )}
      </div>
    </div>
  )
}
