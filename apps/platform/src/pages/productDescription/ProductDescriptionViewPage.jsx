/**
 * Product Description View Page
 */

import { useNavigate } from 'react-router-dom'

import { useEntityDetailParams } from '@nidus/shared/hooks/useEntityDetailParams.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import ProductDescriptionView from '../../components/productDescription/ProductDescriptionView'

export default function ProductDescriptionViewPage() {
  const { projectId, entityId: pdId, projectRouteKey, loading } = useEntityDetailParams('productDescription', { entityParam: 'pdId' })
  const navigate = useNavigate()

  if (loading || !pdId) return null

  return (
    <ProductDescriptionView
      pdId={pdId}
      onEdit={(pd) => navigate(platformProjectPath(projectRouteKey, 'product-descriptions', pd.pd_reference || pd.id, 'edit'))}
    />
  )
}
