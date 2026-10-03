/**
 * Training Tracker (GAP-20) — certification catalog detail/view page. v963 Phase 14.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { getCertification } from '../services/trainingService'

export default function TrainingCertificationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [cert, setCert] = useState(null)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await getCertification(id)
      if (!cancelled) {
        if (result.success) setCert(result.data)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  if (!cert) return <div className="p-8 text-gray-500 dark:text-gray-400">Certification not found.</div>

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate('..')} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Certification Catalog
      </button>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cert.certification_name}</h1>
        <button type="button" onClick={() => navigate('edit')} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Certification sections" />

      {activeTab === 'details' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Code</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{cert.certification_code || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Issuing body</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{cert.issuing_body || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Validity</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{cert.validity_months ? `${cert.validity_months} months` : 'Never expires'}</p>
          </div>
        </div>
      ) : (
        <AuditDetailsPanel description="When this catalog entry was created or changed.">
          <AuditCard title="Identity">
            <AuditField label="Certification" value={cert.certification_name} />
            <AuditField label="Code" value={cert.certification_code} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Issuing body" value={cert.issuing_body} />
            <AuditField label="Validity" value={cert.validity_months ? `${cert.validity_months} months` : 'Never expires'} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditTimestampPair dateLabel="Created at" value={cert.created_at} />
            <AuditTimestampPair dateLabel="Updated at" value={cert.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  )
}
