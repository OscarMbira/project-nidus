/**
 * OKR Cycle — view page with Details/Audit tabs (rule 63.1). GAP-03, v963 Phase 8.
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { getCycle } from '../../services/okrService'

function basePath(sim) {
  return sim ? '/simulator/pm/okr/cycles' : '/platform/pm/okr/cycles'
}

export default function OkrCycleDetailPage({ sim = false }) {
  const { cycleId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState(null)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const record = await getCycle(cycleId, { sim })
      if (!cancelled) {
        setCycle(record)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [cycleId, sim])

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  if (!cycle) return <div className="p-8 text-gray-500 dark:text-gray-400">Cycle not found.</div>

  const base = basePath(sim)

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate(base)} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Cycles
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cycle.cycle_name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cycle.cycle_code}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`${base}/${cycleId}/edit`)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="OKR cycle sections" />

      {activeTab === 'details' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Status</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">{cycle.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Period type</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 capitalize">{(cycle.period_type || '').replace('_', ' ')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Start date</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{cycle.start_date}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">End date</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{cycle.end_date}</p>
            </div>
          </div>
        </div>
      ) : (
        <AuditDetailsPanel description="Who created or changed this OKR cycle.">
          <AuditCard title="Identity">
            <AuditField label="Cycle code" value={cycle.cycle_code || '—'} />
            <AuditField label="Cycle name" value={cycle.cycle_name || '—'} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Period type" value={(cycle.period_type || '').replace('_', ' ')} />
            <AuditField label="Status" value={cycle.status} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditTimestampPair dateLabel="Created at" value={cycle.created_at} />
            <AuditTimestampPair dateLabel="Updated at" value={cycle.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  )
}
