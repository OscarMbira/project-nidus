import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getOPAById, deleteOPA } from '../../../services/sim/simOPAService'
import { RowActionButton } from '@nidus/ui'
import { simDb } from '@nidus/supabase'
import { resolveTemplateProvenanceBatch } from '@nidus/shared/services/pmTemplateOverrideService.js'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

export default function SimOPADetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
  // v807 Gap 4: if this OPA was copied from a Global template, link back to it.
  const [provenance, setProvenance] = useState(null)
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
      const { data } = await getOPAById(id)
      setRow(data)
      if (data?.pm_template_node_id) {
        try {
          const map = await resolveTemplateProvenanceBatch(simDb, [data.pm_template_node_id])
          setProvenance(map.get(data.pm_template_node_id) || null)
        } catch {
          setProvenance(null)
        }
      }
    })()
  }, [id])

  if (!row) return <div className="p-8">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/simulator/opa" className="text-gray-400 mb-4 inline-block">
        Back
      </Link>
      <h1 className="text-2xl font-bold text-white mb-4">{row.title}</h1>
      {provenance && (
        <Link
          to={`/simulator/pmo/template-library/preview/${provenance.id}`}
          className="mb-4 inline-block text-sm text-emerald-400 hover:underline"
        >
          Copied from Global Template: {provenance.name} →
        </Link>
      )}
      <RowActionButton variant="edit" label="Edit OPA" onClick={() => navigate(`/simulator/opa/${id}/edit`)} />
      <RowActionButton
        variant="delete"
        label="Delete OPA"
        onClick={async () => {
          if (!window.confirm('Delete?')) return
          const { error } = await deleteOPA(id)
          if (!error) navigate('/simulator/opa')
        }}
      />

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'audit' && (
        <AuditDetailsPanel description="Who created or changed this Organisational Process Asset.">
          <AuditCard title="Identity" description="How this OPA is labelled.">
            <AuditField label="Title" value={row.title} />
          </AuditCard>
          <AuditCard title="Classification" description="How this OPA is categorised.">
            <AuditField label="Type" value={humanizeAuditToken(row.opa_type)} />
            <AuditField label="Status" value={humanizeAuditToken(row.status)} />
          </AuditCard>
          <AuditCard title="Record history" description="When this OPA was created and last changed.">
            <AuditField label="Created by" value={row.created_by ? auditUserLabels[row.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={row.created_at} />
            <AuditTimestampPair dateLabel="Last updated" value={row.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  )
}
