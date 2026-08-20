/**
 * Product Description List Page
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam.js'
import ProductDescriptionList from '../../components/productDescription/ProductDescriptionList'

export default function ProductDescriptionListPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleCreate = () => {
    navigate(platformProjectPath(routeKey, 'product-descriptions', 'create'))
  }

  return (
    <ProductDescriptionList
      projectId={projectId}
      routeKey={routeKey}
      onCreate={handleCreate}
    />
  )
}
