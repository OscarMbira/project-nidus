/**
 * Product Description List Page
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import ProductDescriptionList from '../../components/productDescription/ProductDescriptionList'

export default function ProductDescriptionListPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleCreate = () => {
    navigate(`/app/projects/${projectId}/product-descriptions/create`)
  }

  return (
    <ProductDescriptionList
      projectId={projectId}
      onCreate={handleCreate}
    />
  )
}
