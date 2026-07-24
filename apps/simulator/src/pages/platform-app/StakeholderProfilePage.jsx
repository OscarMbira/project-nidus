/**
 * Stakeholder Profile Page – loads stakeholder by ID and renders read-only profile.
 * Edit button navigates to edit form.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getStakeholder } from '../../services/stakeholderService'
import StakeholderProfile from '../../components/stakeholders/StakeholderProfile'

export default function StakeholderProfilePage() {
  const { stakeholderId } = useParams()
  const navigate = useNavigate()
  const [stakeholder, setStakeholder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!stakeholderId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    getStakeholder(stakeholderId)
      .then((data) => {
        setStakeholder(data)
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load stakeholder')
        setStakeholder(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [stakeholderId])

  const handleEdit = () => {
    navigate(`/platform/stakeholders/register/edit/${stakeholderId}`, {
      state: { projectId: stakeholder?.project_id },
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    )
  }

  if (error || !stakeholder) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate('/platform/stakeholders/register')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-5 w-5" /> Back to register
        </button>
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-300">
          {error || 'Stakeholder not found.'}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button
        type="button"
        onClick={() => navigate('/platform/stakeholders/register')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-5 w-5" /> Back to register
      </button>
      <StakeholderProfile stakeholder={stakeholder} onEdit={handleEdit} />
    </div>
  )
}
