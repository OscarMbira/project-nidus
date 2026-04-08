/**
 * Product Description View Page
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import ProductDescriptionView from '../../components/productDescription/ProductDescriptionView'

export default function ProductDescriptionViewPage() {
  const { pdId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  return (
    <ProductDescriptionView
      pdId={pdId}
      onEdit={(pd) => navigate(`/app/projects/${projectId}/product-descriptions/${pd.id}/edit`)}
    />
  )
}
