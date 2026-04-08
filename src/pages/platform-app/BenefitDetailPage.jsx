/**
 * Platform Benefit view/edit – /platform/benefits/:id and /platform/benefits/:id/edit
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Target, Edit2 } from 'lucide-react'
import { getBenefit } from '../../services/benefitsService'
import BenefitForm from '../../components/benefits/BenefitForm'

export default function BenefitDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [benefit, setBenefit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isEditRoute = location.pathname.endsWith('/edit')

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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading benefit...</p>
        </div>
      </div>
    )
  }

  if (error || !benefit) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
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
      <div className="min-h-screen bg-gray-900">
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
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/platform/benefits')}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Benefits
          </button>
          <button
            type="button"
            onClick={() => navigate(`/platform/benefits/${id}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Edit2 className="h-4 w-4" /> Edit
          </button>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Target className="h-8 w-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-100">{benefit.benefit_name}</h1>
              <p className="text-gray-400 text-sm">{benefit.benefit_code}</p>
            </div>
          </div>
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
        </div>
      </div>
    </div>
  )
}
