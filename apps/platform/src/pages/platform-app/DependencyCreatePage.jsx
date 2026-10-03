/**
 * Create Inter-Project Dependency (full page)
 * Route: /platform/dependencies/create
 */

import { useNavigate } from 'react-router-dom'
import DependencyForm from '../../components/dependencies/DependencyForm'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

export default function DependencyCreatePage() {
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="max-w-4xl mx-auto">
        <DependencyForm
          dependency={null}
          usePageLayout
          backToList="/platform/dependencies"
          onSave={(saved) => {
            const recordId = String(saved?.dependency_code || saved?.id || '').trim()
            const name = saved?.dependency_name || recordId
            showSuccess({
              recordId,
              operation: 'created',
              message: `Created dependency ${name}.`,
              okLabel: 'Back to Dependency Register',
              onOk: () => navigate('/platform/dependencies'),
            })
          }}
          onCancel={() => navigate('/platform/dependencies')}
        />
      </div>
      {modal}
    </div>
  )
}
