/**
 * Product Description Edit Page
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import ProductDescriptionForm from '../../components/productDescription/ProductDescriptionForm'

export default function ProductDescriptionEdit() {
  const { pdId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = (pd) => {
    navigate(`/app/projects/${projectId}/product-descriptions/${pd.id}`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/product-descriptions/${pdId}`)
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
