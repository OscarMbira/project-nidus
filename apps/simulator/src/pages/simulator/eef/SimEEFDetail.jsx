import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { deleteEEF, getEEFById } from '../../../services/sim/simEEFService'
import { simDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

export default function SimEEFDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
  const [err, setErr] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (activeTab !== 'audit' || !row) return
    (async () => {
      const labels = await resolveAuditUserLabels(simDb, [row.created_by])
      setAuditUserLabels(labels || {})
    })()
  }, [activeTab, row])

  useEffect(() => {
    ;(async () => {
      const { data, error } = await getEEFById(id)
      if (error) setErr(error.message)
      setRow(data)
    })()
  }, [id])

  const del = async () => {
    if (!window.confirm('Delete?')) return
    const { error } = await deleteEEF(id)
    if (error) alert(error.message)
    else navigate('/simulator/eef')
  }

  if (err || !row) return <div className="p-8 text-gray-600">{err || 'Loading…'}</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/simulator/eef" className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{row.title}</h1>
        <div className="flex gap-2">
          <RowActionButton variant="edit" label="Edit EEF" onClick={() => navigate(`/simulator/eef/${id}/edit`)} />
          <RowActionButton variant="delete" label="Delete EEF" onClick={del} />
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'audit' ? (
        <AuditDetailsPanel description="Who created or changed this Enterprise Environment Factor.">
          <AuditCard title="Identity" description="How this EEF is labelled.">
            <AuditField label="Title" value={row.title} />
          </AuditCard>
          <AuditCard title="Classification" description="How this EEF is categorised.">
            <AuditField label="Type" value={humanizeAuditToken(row.eef_type)} />
            <AuditField label="Impact level" value={humanizeAuditToken(row.impact_level)} />
            <AuditField label="Status" value={humanizeAuditToken(row.status)} />
          </AuditCard>
          <AuditCard title="Record history" description="When this EEF was created and last changed.">
            <AuditField label="Created by" value={row.created_by ? auditUserLabels[row.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={row.created_at} />
            <AuditTimestampPair dateLabel="Last updated" value={row.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{row.description || '—'}</p>
      )}
    </div>
  )
}
