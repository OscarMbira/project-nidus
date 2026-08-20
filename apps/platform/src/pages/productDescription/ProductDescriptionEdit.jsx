/**
 * Product Description Edit Page
 */

import { useNavigate } from 'react-router-dom'

import { useEntityDetailParams } from '@nidus/shared/hooks/useEntityDetailParams.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import ProductDescriptionForm from '../../components/productDescription/ProductDescriptionForm'

export default function ProductDescriptionEdit() {
  const { projectId, entityId: pdId, projectRouteKey } = useEntityDetailParams('productDescription', { entityParam: 'pdId' })
  const navigate = useNavigate()

  const handleSave = (pd) => {
    navigate(platformProjectPath(projectRouteKey, 'product-descriptions', pd.pd_reference || pd.id))
  }

  const handleCancel = () => {
    navigate(platformProjectPath(projectRouteKey, 'product-descriptions', pdId))
  }

  return (
    <ProductDescriptionForm
      projectId={projectId}
      pdId={pdId}
      mode="edit"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
