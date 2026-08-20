import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getOPAById, updateOPA } from '../../../services/sim/simOPAService'
import { simDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

export default function SimOPAEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [record, setRecord] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    ;(async () => {
      const { data } = await getOPAById(id)
      if (data) { setTitle(data.title || ''); setRecord(data) }
    })()
  }, [id])

  useEffect(() => {
    if (formTab !== 'audit' || !record) return
    (async () => {
      const labels = await resolveAuditUserLabels(simDb, [record.created_by])
      setAuditUserLabels(labels || {})
    })()
  }, [formTab, record])

  const save = async () => {
    const { error } = await updateOPA(id, { title })
    if (error) alert(error.message)
    else navigate(`/simulator/opa/${id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <h1 className="text-xl font-bold text-white">Edit OPA</h1>
      <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
      {formTab === 'audit' ? (
        !record ? (
          <p className="text-sm text-gray-400">Audit details appear after this OPA is saved.</p>
        ) : (
          <AuditDetailsPanel description="Who created or changed this Organisational Process Asset.">
            <AuditCard title="Identity" description="How this OPA is labelled.">
              <AuditField label="Title" value={record.title} />
            </AuditCard>
            <AuditCard title="Classification" description="How this OPA is categorised.">
              <AuditField label="Type" value={humanizeAuditToken(record.opa_type)} />
              <AuditField label="Status" value={humanizeAuditToken(record.status)} />
            </AuditCard>
            <AuditCard title="Record history" description="When this OPA was created and last changed.">
              <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
              <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      ) : (
      <>
      <input className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="button" onClick={save} className="px-4 py-2 bg-sky-600 text-white rounded-lg">
        Save
      </button>
      </>
      )}
    </div>
  )
}
