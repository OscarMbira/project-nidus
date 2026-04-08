/**
 * Configuration Item Register Page
 * Main register/list page for all Configuration Items in a project
 */

import { useParams, useNavigate } from 'react-router-dom'

import { platformProjectPath } from '../utils/projectRouteParam.js'
import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import ConfigurationItemList from '../components/ci/ConfigurationItemList'

export default function ConfigurationItemRegister() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleCreate = () => {
    navigate(platformProjectPath(routeKey, 'configuration-items', 'create'))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ConfigurationItemList projectId={projectId} onCreate={handleCreate} />
    </div>
  )
}
