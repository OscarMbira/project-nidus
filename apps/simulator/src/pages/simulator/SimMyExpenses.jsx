import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { getMySimExpenses } from '../../services/simExpenseClaimService'

const EXPORT_COLS = [
  { key: 'expense_date', label: 'Date' },
  { key: 'amount', label: 'Amount' },
  { key: 'currency', label: 'Currency' },
  { key: 'claim_status', label: 'Status' },
  { key: 'expense_type', label: 'Type' },
  { key: 'description', label: 'Description' },
]

export default function SimMyExpenses() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    getMySimExpenses().then(setRows).catch((e) => toast.error(e?.message))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold">My expenses (Simulator)</h1>
        <ExportListMenu columns={EXPORT_COLS} data={rows} baseFilename="sim_my_expenses" disabled={!rows.length} />
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="border border-gray-800 rounded p-3">{r.claim_status} — {r.amount}</li>
        ))}
      </ul>
    </div>
  )
}
