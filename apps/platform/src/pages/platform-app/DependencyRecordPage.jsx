/**
 * View / edit one inter-project dependency.
 * Routes: /platform/dependencies/:dependencyKey
 *         /platform/dependencies/:dependencyKey/edit
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import DependencyForm from '../../components/dependencies/DependencyForm'
import { getInterProjectDependencyByKey } from '../../services/dependencyService'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

export default function DependencyRecordPage({ mode = 'view' }) {
  const { dependencyKey } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [dependency, setDependency] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const readOnly = mode !== 'edit'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const row = await getInterProjectDependencyByKey(dependencyKey)
        if (cancelled) return
        setDependency(row)
        const code = String(row.dependency_code || '').trim()
        if (code && dependencyKey && code !== dependencyKey) {
          const next = `/platform/dependencies/${encodeURIComponent(code)}${readOnly ? '' : '/edit'}`
          navigate(next, { replace: true })
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Dependency not found')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dependencyKey, navigate, readOnly])

  if (loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-16 text-center text-gray-600 dark:text-gray-300">
        Loading…
      </div>
    )
  }

  if (error || !dependency) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-16 text-center text-gray-700 dark:text-gray-200">
        {error || 'Dependency not found'}
      </div>
    )
  }

  const code = String(dependency.dependency_code || '').trim()
  const key = code || dependency.id

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="max-w-4xl mx-auto">
        <DependencyForm
          dependency={dependency}
          readOnly={readOnly}
          usePageLayout
          backToList="/platform/dependencies"
          onSave={(saved) => {
            const recordId = String(saved?.dependency_code || dependency.dependency_code || dependency.id || '').trim()
            const name = saved?.dependency_name || dependency.dependency_name || recordId
            showSuccess({
              recordId,
              operation: 'updated',
              message: `Updated dependency ${name}.`,
              okLabel: 'Back to Dependency Register',
              onOk: () => navigate('/platform/dependencies'),
            })
          }}
          onCancel={() => navigate('/platform/dependencies')}
          onEdit={readOnly ? () => navigate(`/platform/dependencies/${encodeURIComponent(key)}/edit`) : undefined}
        />
      </div>
      {modal}
    </div>
  )
}
