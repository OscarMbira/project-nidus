import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import {
  formInstancePathSegmentFromRow,
  resolveFormInstanceRecordsListPath,
} from '@nidus/shared/utils/formInstanceRegisterUtils.js'
import { applyTieredSchemaFieldOverrides, buildFieldOverrideMap } from '@nidus/shared/utils/formTemplateFieldOverrides'
import {
  applyGuidanceToSchema,
  buildDefaultValuesMap,
} from '@nidus/shared/utils/formTemplateFieldDefaults'
import { useLanguageContext } from '@nidus/shared/context/LanguageContext'
import DynamicFormRenderer from '../../components/forms/DynamicFormRenderer'
import {
  createFormInstance,
  getFieldDefaultsForOrg,
  getFieldOverridesForOrg,
  getFieldTranslations,
  getFormTemplate,
  getProjectAccountId,
  listFieldAdditionsForOrg,
  listInstanceTemplatesForChain,
  resolveEntityPolicyChain,
  updateFormValues,
} from '../../services/formEngineService'

const TIER_LABEL = { portfolio: 'Portfolio', programme: 'Programme', project: 'Project' }

export default function FormNew({ mode = 'platform', basePath = '/platform/projects' }) {
  const { templateCode } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const projectSeg = encodeURIComponent(routeKey || projectId || '')
  const navigate = useNavigate()
  const { languageCode } = useLanguageContext()
  const [template, setTemplate] = useState(null)
  const [values, setValues] = useState({})
  const [organisationId, setOrganisationId] = useState(null)
  const [overridesByTier, setOverridesByTier] = useState([])
  const [additionsByTier, setAdditionsByTier] = useState([])
  const [defaultRows, setDefaultRows] = useState([])
  const [translations, setTranslations] = useState([])
  const [examples, setExamples] = useState([])
  const [selectedExampleId, setSelectedExampleId] = useState(null)
  const [autoInstance, setAutoInstance] = useState(null)
  const creatingInstanceRef = useRef(false)

  useEffect(() => {
    getFormTemplate(templateCode, mode).then((r) => r.success && setTemplate(r.data))
  }, [templateCode, mode])

  // Create the draft row as soon as the page opens (not on first Save) so field-level
  // Attachment capture — which needs a real form_instance_id to attach to — works
  // immediately on a brand-new record, same as the existing hold/draft-queue pattern
  // (rule 37) where an early, empty draft is expected, not an error state.
  useEffect(() => {
    if (!projectId || !templateCode || creatingInstanceRef.current) return
    creatingInstanceRef.current = true
    createFormInstance(projectId, templateCode, null, mode).then((result) => {
      if (result.success) setAutoInstance(result.data)
      else creatingInstanceRef.current = false // allow retry (e.g. transient network error)
    })
  }, [projectId, templateCode, mode])

  useEffect(() => {
    if (!template?.id) return
    getFieldTranslations(template.id, mode).then((r) => r.success && setTranslations(r.data))
  }, [template?.id, mode])

  useEffect(() => {
    if (!projectId) return
    getProjectAccountId(projectId, mode).then((r) => {
      if (r.success && r.data) setOrganisationId(r.data)
    })
  }, [projectId, mode])

  useEffect(() => {
    if (!organisationId || !template?.id || !projectId) return
    ;(async () => {
      const chainResult = await resolveEntityPolicyChain('project', projectId, mode)
      const chain = [{ entityType: null, entityId: null }, ...(chainResult.success ? chainResult.data : [{ entityType: 'project', entityId: projectId }])]

      const [defaults, layers, instanceExamples] = await Promise.all([
        getFieldDefaultsForOrg(organisationId, template.id, mode),
        Promise.all(
          chain.map((node) =>
            Promise.all([
              getFieldOverridesForOrg(organisationId, template.id, mode, { scopeEntityType: node.entityType, scopeEntityId: node.entityId }),
              listFieldAdditionsForOrg(organisationId, template.id, mode, { scopeEntityType: node.entityType, scopeEntityId: node.entityId }),
            ]),
          ),
        ),
        listInstanceTemplatesForChain(organisationId, template.id, 'project', projectId, mode),
      ])

      const nextOverridesByTier = layers.map(([overrides]) => buildFieldOverrideMap(overrides.success ? overrides.data : []))
      const nextAdditions = layers.flatMap(([, additions]) => (additions.success ? additions.data : []))
      setOverridesByTier(nextOverridesByTier)
      setAdditionsByTier(nextAdditions)
      if (instanceExamples.success) setExamples(instanceExamples.data)

      const orgDefaultRows = defaults.success ? (defaults.data || []) : []
      setDefaultRows(orgDefaultRows)
      const enabledSchema = applyTieredSchemaFieldOverrides(
        template?.current_version?.schema || { sections: [] },
        nextOverridesByTier,
        nextAdditions,
      )
      const defaultValues = buildDefaultValuesMap(orgDefaultRows, enabledSchema)
      setValues((prev) => (Object.keys(prev).length ? prev : defaultValues))
    })()
  }, [organisationId, template?.id, template?.current_version?.schema, projectId, mode])

  const filteredSchema = useMemo(() => {
    const schema = template?.current_version?.schema || { sections: [] }
    const enabled = applyTieredSchemaFieldOverrides(schema, overridesByTier, additionsByTier)
    return applyGuidanceToSchema(enabled, defaultRows)
  }, [template, overridesByTier, additionsByTier, defaultRows])

  const handleSelectExample = (example) => {
    setSelectedExampleId(example?.id || null)
    setValues(example ? (example.values || {}) : {})
  }

  const save = async () => {
    // Normally already created on page load (see effect above) — createFormInstance here is
    // only a fallback if that earlier call failed (e.g. transient network error).
    const created = autoInstance || (await createFormInstance(projectId, templateCode, null, mode)).data
    if (!created) return
    await updateFormValues(created.id, values, mode)
    const instanceSeg = formInstancePathSegmentFromRow(created)
    navigate(`${basePath}/${projectSeg}/forms/${instanceSeg}/edit`)
  }

  const listPath = resolveFormInstanceRecordsListPath({
    pathname: `${basePath}/${projectSeg}/forms/new`,
    projectId,
    projectKey: routeKey || projectId,
    templateCode,
    fallbackBasePath: basePath,
  })

  return (
    <div className="mx-auto w-full md:w-3/4 space-y-4 p-4 text-gray-900 dark:text-gray-100">
      <Link
        to={listPath}
        className="inline-block text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Back to records
      </Link>
      <h1 className="text-lg font-semibold">New Form: {template?.name || templateCode}</h1>

      {examples.length > 0 && (
        <div className="space-y-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Start from a completed example</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSelectExample(null)}
              className={`rounded border px-3 py-1.5 text-xs ${!selectedExampleId ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600'}`}
            >
              Start blank
            </button>
            {examples.map((example) => (
              <button
                key={example.id}
                type="button"
                onClick={() => handleSelectExample(example)}
                title={example.description || undefined}
                className={`rounded border px-3 py-1.5 text-xs ${selectedExampleId === example.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600'}`}
              >
                {example.name}
                <span className="ml-1 text-gray-400 dark:text-gray-500">
                  ({example.scope_entity_type ? TIER_LABEL[example.scope_entity_type] : 'Organisation'} example)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <DynamicFormRenderer
        schema={filteredSchema}
        values={values}
        rows={{}}
        onValueChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onRowsChange={() => {}}
        translations={translations}
        languageCode={languageCode}
        showCalculated
        mode={mode}
        formInstanceId={autoInstance?.id || null}
      />
      <button type="button" onClick={save} className="rounded bg-blue-600 px-4 py-2 text-sm text-white">Create Draft</button>
    </div>
  )
}
