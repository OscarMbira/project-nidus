/**
 * Create Inter-Project Dependency (full page)
 * Route: /platform/dependencies/create
 */

import { useNavigate } from 'react-router-dom'
import DependencyForm from '../../components/dependencies/DependencyForm'

export default function DependencyCreatePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DependencyForm
          dependency={null}
          onSave={() => navigate('/platform/dependencies')}
          onCancel={() => navigate('/platform/dependencies')}
          usePageLayout
        />
      </div>
    </div>
  )
}
