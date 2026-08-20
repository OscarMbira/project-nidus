/**
 * Platform Benefit view/edit – /platform/benefits/:id and /platform/benefits/:id/edit
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Target } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { platformDb } from '@nidus/supabase'
import { getBenefit } from '../../services/benefitsService'
import BenefitForm from '../../components/benefits/BenefitForm'

export default function BenefitDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [benefit, setBenefit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const isEditRoute = location.pathname.endsWith('/edit')

  useEffect(() => {
    if (activeTab !== 'audit' || !benefit) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [benefit.created_by, benefit.updated_by])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [activeTab, benefit])

  useEffect(() => {
    if (id) {
      setLoading(true)
      setError(null)
      getBenefit(id)
        .then(setBenefit)
        .catch((err) => {
          console.error('Error loading benefit:', err)
          setError(err?.message || 'Failed to load benefit')
        })
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading benefit...</p>
        </div>
      </div>
    )
  }

  if (error || !benefit) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-red-400 mb-4">{error || 'Benefit not found.'}</p>
          <button
            type="button"
            onClick={() => navigate('/platform/benefits')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Benefits
          </button>
        </div>
      </div>
    )
  }

  if (isEditRoute) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BenefitForm
            benefit={benefit}
            usePageLayout
            onSave={() => navigate('/platform/benefits')}
            onCancel={() => navigate(`/platform/benefits/${id}`)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/platform/benefits')}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Benefits
          </button>
          <RowActionButton
            variant="edit"
            label="Edit benefit"
            onClick={() => navigate(`/platform/benefits/${id}/edit`)}
          />
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Target className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-100">{benefit.benefit_name}</h1>
              <p className="text-gray-400 text-sm">{benefit.benefit_code}</p>
            </div>
          </div>
          <div className="mb-6">
            <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
          </div>

          {activeTab === 'details' && (
            <>
              {benefit.benefit_description && (
                <p className="text-gray-300 mb-4">{benefit.benefit_description}</p>
              )}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd className="text-gray-200">{benefit.benefit_status || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Category</dt>
                  <dd className="text-gray-200">{benefit.benefit_category || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Expected realization</dt>
                  <dd className="text-gray-200">{benefit.expected_realization_date ? new Date(benefit.expected_realization_date).toLocaleDateString() : '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Estimated value</dt>
                  <dd className="text-gray-200">{benefit.estimated_value != null ? `${benefit.estimated_value} ${benefit.value_currency || ''}` : '—'}</dd>
                </div>
              </dl>
            </>
          )}

          {activeTab === 'audit' && (
            <AuditDetailsPanel description="Who created or changed this benefit, and how it is classified.">
              <AuditCard title="Identity" description="How this benefit is labelled and tracked.">
                <AuditField label="Code" value={benefit.benefit_code} />
                <AuditField label="Name" value={benefit.benefit_name} />
                <AuditField label="Status" value={humanizeAuditToken(benefit.benefit_status)} />
              </AuditCard>
              <AuditCard title="Classification" description="Where this benefit sits.">
                <AuditField label="Portfolio" value={benefit.portfolio?.portfolio_name} />
                <AuditField label="Programme" value={benefit.programme?.programme_name} />
                <AuditField label="Project" value={benefit.project?.project_name} />
                <AuditField label="Benefit owner" value={benefit.benefit_owner?.full_name || benefit.benefit_owner?.email} />
              </AuditCard>
              <AuditCard title="Record history" description="When this benefit was created and last changed.">
                <AuditField label="Created by" value={benefit.created_by ? auditUserLabels[benefit.created_by] || null : null} />
                <AuditTimestampPair dateLabel="Created at" value={benefit.created_at} />
                <AuditField label="Updated by" value={benefit.updated_by ? auditUserLabels[benefit.updated_by] || null : null} />
                <AuditTimestampPair dateLabel="Last updated" value={benefit.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          )}
        </div>
      </div>
    </div>
  )
}
