/**
 * Product Description Create Page
 */

import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import ProductDescriptionForm from '../../components/productDescription/ProductDescriptionForm'

export default function ProductDescriptionCreate() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const productDeliverableId = searchParams.get('deliverableId')
  const ppdCompositionItemId = searchParams.get('compositionItemId')

  const handleSave = (pd) => {
    navigate(`/app/projects/${projectId}/product-descriptions/${pd.id}`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/product-descriptions`)
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
