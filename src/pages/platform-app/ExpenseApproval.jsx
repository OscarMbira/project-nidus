import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ExportListMenu from '../../components/ui/ExportListMenu'
import {
  getPendingApprovals,
  getFullyApprovedClaims,
  approveStep,
  rejectStep,
  markPaid,
  getApprovalHistory,
} from '../../services/expenseClaimService'
import { useFinancialPermissions } from '../../hooks/useFinancialPermissions'

export default function ExpenseApproval() {
  const { canManageAll } = useFinancialPermissions()
  const [rows, setRows] = useState([])
  const [paidQueue, setPaidQueue] = useState([])
  const [historyId, setHistoryId] = useState(null)
  const [hist, setHist] = useState([])

  const load = async () => {
    try {
      const [pending, ready] = await Promise.all([getPendingApprovals(), getFullyApprovedClaims()])
      setRows(pending)
      setPaidQueue(ready)
    } catch (e) {
      toast.error(e?.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!historyId) {
      setHist([])
      return
    }
    getApprovalHistory(historyId).then(setHist).catch(() => setHist([]))
  }, [historyId])

  const exportCols = [
    { key: 'id', label: 'ID' },
    { key: 'claim_status', label: 'Status' },
    { key: 'amount', label: 'Amount' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-wrap justify-between gap-3">
          <h1 className="text-xl font-bold">Expense approvals</h1>
          <ExportListMenu columns={exportCols} data={rows} baseFilename="expense_approvals_pending" />
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Pending your action</h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <div key={r.id} className="p-4 space-y-2">
                <div className="flex justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium">
                      {r.projects?.project_code} — {r.amount} {r.currency}
                    </div>
                    <div className="text-xs text-gray-500">{r.claim_status}</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-emerald-700 text-white text-sm"
                      onClick={() =>
                        approveStep(r.id, 'OK')
                          .then(load)
                          .then(() => toast.success('Approved'))
                      }
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded border border-red-800 text-red-400 text-sm"
                      onClick={() => rejectStep(r.id, 'Rejected').then(load)}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="text-xs text-blue-400"
                      onClick={() => setHistoryId(historyId === r.id ? null : r.id)}
                    >
                      History
                    </button>
                  </div>
                </div>
                {historyId === r.id && (
                  <ul className="text-xs text-gray-500 space-y-1 pl-4 border-l border-gray-700">
                    {hist.map((h) => (
                      <li key={h.id}>
                        {h.action} — {h.actioned_at}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {rows.length === 0 && <p className="p-6 text-center text-gray-500">No claims waiting for your approval.</p>}
          </div>
        </section>

        {canManageAll && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Ready for payment</h2>
            <p className="text-xs text-gray-500">Fully approved claims. Mark as paid after reimbursement.</p>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
              {paidQueue.map((r) => (
                <div key={r.id} className="p-4 flex justify-between gap-4 flex-wrap items-center">
                  <div>
                    <div className="font-medium">
                      {r.projects?.project_code} — {r.amount} {r.currency}
                    </div>
                    <div className="text-xs text-gray-500">fully_approved</div>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1 rounded bg-blue-700 text-white text-sm"
                    onClick={() => markPaid(r.id).then(load).then(() => toast.success('Marked paid'))}
                  >
                    Mark paid
                  </button>
                </div>
              ))}
              {paidQueue.length === 0 && (
                <p className="p-6 text-center text-gray-500">No claims ready for payment.</p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
