/**
 * Product Status Account View Page
 */

import { useNavigate } from 'react-router-dom'

import { useEntityDetailParams } from '@nidus/shared/hooks/useEntityDetailParams.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import { ArrowLeft, Edit } from 'lucide-react'
import ProductStatusAccountView from '../../components/productStatusAccount/ProductStatusAccountView'

export default function ProductStatusAccountViewPage() {
  const { projectId, entityId: psaId, projectRouteKey, loading } = useEntityDetailParams('productStatusAccount', { entityParam: 'psaId' })
  const navigate = useNavigate()

  if (loading || !psaId) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(platformProjectPath(projectRouteKey, 'product-status-accounts'))}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Status Accounts
      </button>
      <ProductStatusAccountView psaId={psaId} projectId={projectId} />
    </div>
  )
}
