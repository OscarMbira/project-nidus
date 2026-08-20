import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import TierFormPolicyPanel from '@nidus/ui/TierFormPolicyPanel.jsx'
import { listProjectCopiedFormTemplates } from '@nidus/shared/services/projectFormTemplateCatalog.js'
import { buildPmTemplatesListPath } from '@nidus/shared/utils/organisationalTemplateRoutes'
import { getMenuLabel } from '@nidus/shared/services/menuLabelService.js'
import { platformDb as db } from '../../services/supabase/supabaseClient'

/**
 * Project-tier form field parameterization only.
 * Dropdown is limited to form templates copied into Project Templates for this project.
 */
export default function ProjectFieldTemplates() {
  const { projectId } = useParams()
  const [searchParams] = useSearchParams()
  const initialTemplateCode = searchParams.get('templateCode') || ''
  const [accountId, setAccountId] = useState(null)
  const [projectName, setProjectName] = useState(null)
  const [projectKey, setProjectKey] = useState(null)
  const [availableTemplates, setAvailableTemplates] = useState(null)
  const [catalogError, setCatalogError] = useState(null)
  const [backLinkLabel, setBackLinkLabel] = useState('Forms')

  useEffect(() => {
    getMenuLabel(db, 'plat_pm_project_templates_forms', 'Forms').then(setBackLinkLabel)
  }, [])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    db.from('projects')
      .select('account_id, project_name, project_code')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setAccountId(data?.account_id || null)
        setProjectName(data?.project_name || null)
        const code = data?.project_code != null && String(data.project_code).trim() !== ''
          ? String(data.project_code).trim()
          : null
        setProjectKey(code || projectId)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (!accountId || !projectId) return
    let cancelled = false
    setCatalogError(null)
    listProjectCopiedFormTemplates(db, { accountId, projectId })
      .then((list) => {
        if (!cancelled) setAvailableTemplates(list)
      })
      .catch((e) => {
        if (!cancelled) {
          setAvailableTemplates([])
          setCatalogError(e.message || 'Failed to load project form templates')
        }
      })
    return () => {
      cancelled = true
    }
  }, [accountId, projectId])

  const listHref = useMemo(
    () =>
      buildPmTemplatesListPath({
        pathname: '/platform/templates/project',
        listVariant: 'project',
        projectKey: projectKey || projectId || '',
        searchParams: 'domainGroup=forms',
      }),
    [projectKey, projectId],
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        to={listHref}
        className="mb-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {backLinkLabel}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Form Templates</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Parameterise form templates that have been copied into Project Templates for this project.
        Does not change the organisation-wide form master.
      </p>
      {catalogError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">{catalogError}</p>
      )}
      {accountId && availableTemplates != null ? (
        <TierFormPolicyPanel
          mode="platform"
          accountId={accountId}
          tier="project"
          entityType="project"
          entityId={projectId}
          entityName={projectName}
          initialTemplateCode={initialTemplateCode}
          availableTemplates={availableTemplates}
        />
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      )}
    </div>
  )
}
