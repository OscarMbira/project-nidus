/**
 * Portfolio View/Edit/Delete – Platform
 * Route: /platform/portfolio/edit/:portfolioId
 * State: viewOnly (true = read-only view with Edit/Delete buttons)
 */

import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, Briefcase } from 'lucide-react'
import { getPortfolio, deletePortfolio } from '../../services/portfolioService'
import PortfolioForm from '../../components/portfolio/PortfolioForm'

export default function PortfolioFormPage() {
  const navigate = useNavigate()
  const { portfolioId } = useParams()
  const location = useLocation()
  const viewOnlyFromState = location.state?.viewOnly === true
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(!!portfolioId)
  const [error, setError] = useState(null)
  const [viewOnly, setViewOnly] = useState(viewOnlyFromState)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!portfolioId) {
      setLoading(false)
      return
    }
    let cancelled = false
    getPortfolio(portfolioId)
      .then((data) => { if (!cancelled) setPortfolio(data) })
      .catch((e) => { if (!cancelled) setError(e?.message || 'Failed to load portfolio') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [portfolioId])

  const handleSave = (saved) => {
    const message = saved?.id
      ? `Portfolio updated successfully. Record ID: ${saved.id}${saved.portfolio_name ? ` (${saved.portfolio_name})` : ''}`
      : 'Portfolio saved successfully.'
    navigate('/platform/portfolio', { replace: true, state: { toast: { type: 'success', message } } })
  }

  const handleCancel = () => {
    navigate('/platform/portfolio', { replace: true })
  }

  const handleDelete = async () => {
    if (!portfolio) return
    if (!window.confirm(`Are you sure you want to delete "${portfolio.portfolio_name}"? This action cannot be undone.`)) return
    try {
      setDeleting(true)
      await deletePortfolio(portfolio.id)
      navigate('/platform/portfolio', { replace: true, state: { toast: { type: 'success', message: `Portfolio "${portfolio.portfolio_name}" (ID: ${portfolio.id}) has been deleted.` } } })
    } catch (e) {
      console.error(e)
      alert('Failed to delete portfolio: ' + (e?.message || e))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    )
  }

  if (portfolioId && error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/platform/portfolio')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Portfolio list
          </button>
        </div>
      </div>
    )
  }

  if (portfolioId && !portfolio) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <button
            onClick={() => navigate('/platform/portfolio')}
            className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-100"
            aria-label="Back to list"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <Briefcase className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-100">
              {portfolio ? (viewOnly ? 'View Portfolio' : 'Edit Portfolio') : 'Create Portfolio'}
            </h1>
          </div>
          {portfolio && (
            <div className="flex items-center gap-2">
              {viewOnly ? (
                <button
                  onClick={() => setViewOnly(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
              ) : null}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-400 hover:bg-red-500/20 rounded-lg font-medium disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
        <PortfolioForm
          portfolio={portfolio}
          onSave={handleSave}
          onCancel={handleCancel}
          useModalLayout={false}
          readOnly={viewOnly}
        />
      </div>
    </div>
  )
}
