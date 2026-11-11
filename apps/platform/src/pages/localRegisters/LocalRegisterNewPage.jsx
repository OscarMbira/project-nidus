/**
 * New record of a document register — choose Blank or a template (v1361, rule 65: a routed page,
 * not a dialog). Route: /platform/local-registers/:registerId/new?scopeLevel=…&scopeEntityId=…
 * Non-document registers have no templates and go straight to the create form.
 * Simulator twin: apps/simulator/src/pages/localRegisters/LocalRegisterNewPage.jsx.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getRegisterDefinition } from '../../services/localRegisterService'
import { useRegisterTemplates } from '../../lib/useRegisterTemplates'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'

const BASE_PATH = '/platform'

export default function LocalRegisterNewPage() {
  const { registerId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { projectId: contextProjectId } = usePlatformProjectId()
  const [state, setState] = useState({ key: null, register: null })

  const queryScopeLevel = searchParams.get('scopeLevel') || ''
  const queryScopeEntityId = searchParams.get('scopeEntityId') || ''
  const scopeLevel = queryScopeLevel || 'project'
  const scopeEntityId = queryScopeEntityId || (scopeLevel === 'project' ? contextProjectId || '' : '')
  const scopeSuffix = scopeEntityId ? `?scopeLevel=${scopeLevel}&scopeEntityId=${scopeEntityId}` : ''

  useEffect(() => {
    let cancelled = false
    getRegisterDefinition(registerId).then((result) => {
      if (!cancelled) setState({ key: registerId, register: result.data || null })
    })
    return () => { cancelled = true }
  }, [registerId])

  const loading = state.key !== registerId
  const register = state.register
  const templates = useRegisterTemplates({
    register,
    projectId: scopeLevel === 'project' ? scopeEntityId || null : null,
    basePath: BASE_PATH,
    scopeSuffix,
    loadRegister: getRegisterDefinition,
    inline: true,
  })

  // Registers without templates use the normal create form.
  const routeKey = register?.register_key || registerId
  useEffect(() => {
    if (register && !register.is_document && !register.behaviour?.templates) {
      navigate(`${BASE_PATH}/local-registers/${routeKey}/create${scopeSuffix}`, { replace: true })
    }
  }, [register, routeKey, scopeSuffix, navigate])

  return (
    <div className="space-y-6 p-6">
      <button
        onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {register ? `Back to ${register.label}` : 'Back'}
      </button>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : !register ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Register not found.</p>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New {register.label}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Start with an empty form or from a template.</p>
          </div>
          {templates.pickerElement}
          {templates.previewElement}
        </>
      )}
    </div>
  )
}
