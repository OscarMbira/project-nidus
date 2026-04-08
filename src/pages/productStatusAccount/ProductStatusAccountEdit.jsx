/**
 * Product Status Account Edit Page
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { ArrowLeft } from 'lucide-react'
import ProductStatusAccountForm from '../../components/productStatusAccount/ProductStatusAccountForm'

export default function ProductStatusAccountEdit() {
  const { psaId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = (data) => {
    navigate(`/app/projects/${projectId}/product-status-accounts/${data.id}`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/product-status-accounts/${psaId}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={handleCancel}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Status Account
      </button>
      <ProductStatusAccountForm
        projectId={projectId}
        psaId={psaId}
        mode="edit"
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}
