/**
 * Cost Actuals Ledger — detail/view page (Simulator, v963 Phase 6). Mirrors
 * apps/platform/src/pages/costActuals/CostActualDetailPage.jsx against sim.cost_actuals.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { getCostActual } from '../../services/costActualsService'

const TYPE_LABELS = { actual: 'Actual', commitment: 'Commitment', accrual: 'Accrual' }

function formatCurrency(amount) {
  const n = Number(amount)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

export default function CostActualDetailPage() {
  const { projectId, costActualId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [entry, setEntry] = useState(null)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await getCostActual(costActualId)
      if (!cancelled) { setEntry(result.data); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [costActualId])

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }
  if (!entry) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Cost actual entry not found.</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cost Actuals
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(entry.amount)}</h1>
          <span className="inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
            {TYPE_LABELS[entry.transaction_type] || entry.transaction_type}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/simulator/practice-projects/${projectId}/cost-actuals/${costActualId}/edit`)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Cost actual sections" />

      {activeTab === 'details' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Transaction Date</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{entry.transaction_date ? new Date(entry.transaction_date).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Category</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{entry.category || '—'}</p>
          </div>
          {entry.description && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.description}</p>
            </div>
          )}
          {entry.notes && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <AuditDetailsPanel description="Who created or changed this record.">
          <AuditCard title="Identity">
            <AuditField label="Type" value={TYPE_LABELS[entry.transaction_type] || entry.transaction_type} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Category" value={entry.category || '—'} />
            <AuditField label="Amount" value={formatCurrency(entry.amount)} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditTimestampPair dateLabel="Created at" value={entry.created_at} />
            <AuditTimestampPair dateLabel="Updated at" value={entry.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  )
}
