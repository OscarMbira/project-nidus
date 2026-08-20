/**
 * Product Description Create Page
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import ProductDescriptionForm from '../../components/productDescription/ProductDescriptionForm'

export default function ProductDescriptionCreate() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const productDeliverableId = searchParams.get('deliverableId')
  const ppdCompositionItemId = searchParams.get('compositionItemId')

  const handleSave = (pd) => {
    navigate(platformProjectPath(routeKey, 'product-descriptions', pd.pd_reference || pd.id))
  }

  const handleCancel = () => {
    navigate(platformProjectPath(routeKey, 'product-descriptions'))
  }

  return (
    <ProductDescriptionForm
      projectId={projectId}
      mode="create"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
