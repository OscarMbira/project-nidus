/**
 * Product Status Account Edit Page
 */

import { useNavigate } from 'react-router-dom'

import { useEntityDetailParams } from '@nidus/shared/hooks/useEntityDetailParams.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import { ArrowLeft } from 'lucide-react'
import ProductStatusAccountForm from '../../components/productStatusAccount/ProductStatusAccountForm'

export default function ProductStatusAccountEdit() {
  const { projectId, entityId: psaId, projectRouteKey } = useEntityDetailParams('productStatusAccount', { entityParam: 'psaId' })
  const navigate = useNavigate()

  const handleSave = (data) => {
    navigate(platformProjectPath(projectRouteKey, 'product-status-accounts', data.psa_reference || data.id))
  }

  const handleCancel = () => {
    navigate(platformProjectPath(projectRouteKey, 'product-status-accounts', psaId))
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
