import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDefectById } from '../../services/defectService'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

export default function DefectDetailPage() {
  const { id } = useParams()
  const [d, setD] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  useEffect(() => {
    getDefectById(id).then(setD).catch(() => setD(null))
  }, [id])
  useEffect(() => {
    if (activeTab !== 'audit' || !d) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [d.created_by, d.updated_by])
      setAuditUserLabels(labels)
    })()
  }, [activeTab, d])
  if (!d) return <div className="p-6 text-gray-100">Loading…</div>
  return (
    <div className="p-6 min-h-screen bg-gray-950 text-gray-100 max-w-3xl mx-auto">
      <h1 className="text-xl">{d.defect_ref}</h1>

      <div className="my-4">
        <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'audit' ? (
        <AuditDetailsPanel description="Who reported or changed this defect, and how it is classified.">
          <AuditCard title="Identity" description="How this defect is labelled and tracked.">
            <AuditField label="Reference" value={d.defect_ref} />
            <AuditField label="Title" value={d.title} />
            <AuditField label="Status" value={humanizeAuditToken(d.status)} />
          </AuditCard>
          <AuditCard title="Classification" description="How this defect is categorised.">
            <AuditField label="Severity" value={humanizeAuditToken(d.severity)} />
            <AuditField label="Priority" value={humanizeAuditToken(d.priority)} />
          </AuditCard>
          <AuditCard title="Record history" description="When this defect was reported and last changed.">
            <AuditField label="Created by" value={d.created_by ? auditUserLabels[d.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={d.created_at} />
            <AuditField label="Updated by" value={d.updated_by ? auditUserLabels[d.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={d.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
        <p className="text-sm text-gray-400 mb-4">{d.title}</p>
      )}
    </div>
  )
}
