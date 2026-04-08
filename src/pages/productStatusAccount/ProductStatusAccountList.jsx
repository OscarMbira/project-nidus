/**
 * Product Status Account List Page
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import ProductStatusAccountList from '../../components/productStatusAccount/ProductStatusAccountList'

export default function ProductStatusAccountListPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleCreate = () => {
    navigate(`/app/projects/${projectId}/product-status-accounts/create`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProductStatusAccountList 
        projectId={projectId}
        onCreate={handleCreate}
      />
    </div>
  )
}
