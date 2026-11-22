/**
 * Project Details (Project Setup) — read-only summary of the project record (v1344 A1).
 * Tabs: Overview · Objectives & Success · Classification & Delivery · Dates & People · Audit.
 * The project wizard is the only editor: each tab's Edit button opens it on the matching step
 * (/platform/projects/<code>/edit?tab=…). Project Manager changes are PMO-only (v1344 A2, SQL v1480).
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { listDeliveryMethodologyOptions } from '@nidus/shared/services/deliveryMethodologyOptionsService.js'
import { listProjectAttributeOptions, projectAttributeLabel } from '@nidus/shared/services/projectAttributeOptionsService'
import { toMultilineText } from '@nidus/shared/utils/projectWizardFormUtils'
import { useRegionalFormatSettings } from '@nidus/shared/hooks/useRegionalFormatSettings'
import { formatRegionalDate } from '@nidus/shared/utils/formatRegionalSettings'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import { getProjectDetails } from '../../services/projectDetailsService'
import RecordCustomFields from '../../components/shared-app/RecordCustomFields'
import { useLdeExportParts } from '../../lib/useLdeExportParts'

const TABS = [
  { value: 'overview', label: 'Overview', wizardTab: 'details' },
  { value: 'objectives', label: 'Objectives & Success', wizardTab: 'details' },
  { value: 'classification', label: 'Classification & Delivery', wizardTab: 'details' },
  { value: 'people', label: 'Dates & People', wizardTab: 'governance' },
  { value: 'custom-fields', label: 'Custom Fields' },
  { value: 'audit', label: 'Audit details' },
]

const HEALTH_STYLES = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  amber: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  red: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
}

const EXPORT_SECTIONS = [
  {
    title: 'Identity',
    fields: [
      { key: 'project_code', label: 'Project code', fact: true },
      { key: 'project_name', label: 'Project name', fact: true },
      { key: 'status_name', label: 'Status', fact: true },
      { key: 'industry_name', label: 'Industries', fact: true },
      { key: 'priority_label', label: 'Priority', fact: true },
      { key: 'health', label: 'Health', fact: true },
    ],
  },
  { title: 'Overview', fields: [{ key: 'project_description', label: 'Overview' }] },
  {
    title: 'Objectives & Success',
    fields: [
      { key: 'project_objectives', label: 'Objectives', itemColumnLabel: 'Objective' },
      { key: 'success_criteria', label: 'Success Criteria', itemColumnLabel: 'Criterion' },
    ],
  },
  {
    title: 'Classification & Delivery',
    fields: [
      { key: 'classification_label', label: 'Classification', fact: true },
      { key: 'methodology_label', label: 'Methodology', fact: true },
      { key: 'billing_label', label: 'Billing Type', fact: true },
      { key: 'budget_currency', label: 'Currency', fact: true },
    ],
  },
  {
    title: 'Dates & People',
    fields: [
      { key: 'planned_start', label: 'Planned start', fact: true },
      { key: 'planned_end', label: 'Planned end', fact: true },
      { key: 'project_manager', label: 'Project Manager', fact: true },
      { key: 'executive', label: 'Executive (Sponsor)', fact: true },
      { key: 'funding_authority', label: 'Funding authority', fact: true },
      { key: 'approving_authority', label: 'Approving authority', fact: true },
      { key: 'benefit_owner', label: 'Benefit owner', fact: true },
    ],
  },
]

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="sm:col-span-2 text-sm text-gray-900 dark:text-gray-100">{children || <span className="text-gray-400 dark:text-gray-500">Not set</span>}</dd>
    </div>
  )
}

function ListValue({ text }) {
  const items = toMultilineText(text).split('\n').map((s) => s.trim()).filter(Boolean)
  if (!items.length) return null
  return (
    <ol className="list-decimal pl-5 space-y-1">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ol>
  )
}

export default function ProjectDetailsPage() {
  const { projectId, routeKey, loading: projectIdLoading, error: projectIdError } = usePlatformProjectId()
  const settings = useRegionalFormatSettings(projectId || null)
  const [activeTab, setActiveTab] = useState('overview')
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [options, setOptions] = useState({ priority: [], billing_type: [], classification: [] })
  const [methodologies, setMethodologies] = useState([])
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const lde = useLdeExportParts({
    entityType: 'project',
    entityId: project?.id,
    projectId,
    screenCode: 'project_detail',
    enabled: !!project?.id,
  })

  const load = useCallback(async () => {
    if (projectIdLoading) return
    if (!projectId) {
      setLoading(false)
      setProject(null)
      return
    }
    setLoading(true)
    try {
      // Independent loads in parallel (rule 66); option lists are cached per session.
      const [data, attributeOptions, methodologyRows] = await Promise.all([
        getProjectDetails(projectId),
        listProjectAttributeOptions(platformDb).catch(() => ({ priority: [], billing_type: [], classification: [] })),
        listDeliveryMethodologyOptions(platformDb, { includeLegacy: true }).catch(() => []),
      ])
      setProject(data)
      setOptions(attributeOptions)
      setMethodologies(methodologyRows)
    } catch (e) {
      toast.error(e?.message || 'Failed to load project details')
      setProject(null)
    } finally {
      setLoading(false)
    }
  }, [projectId, projectIdLoading])

  useEffect(() => {
    const t = setTimeout(load, 0) // start after render (no synchronous setState inside the effect)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    if (activeTab !== 'audit' || !project?.created_by) return
    let cancelled = false
    resolveAuditUserLabels(platformDb, [project.created_by])
      .then((labels) => { if (!cancelled) setAuditUserLabels(labels || {}) })
      .catch(() => { if (!cancelled) setAuditUserLabels({}) })
    return () => { cancelled = true }
  }, [activeTab, project])

  if (projectIdLoading || loading) {
    return <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-500 dark:text-gray-400">Loading…</div>
  }

  if (!projectId || projectIdError === 'missing' || projectIdError === 'not_found') {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-500 dark:text-gray-400">
        Select a project from the project picker to view project details.
      </div>
    )
  }

  const date = (v) => (v ? formatRegionalDate(v, settings) : '')
  const projectKey = project?.project_code || routeKey || projectId
  const tab = TABS.find((t) => t.value === activeTab)
  const editHref = tab?.wizardTab ? `/platform/projects/${encodeURIComponent(projectKey)}/edit?tab=${tab.wizardTab}` : null
  const methodologyLabel = (code) => methodologies.find((m) => m.code === code)?.label || humanizeAuditToken(code)
  const industriesText = (project?.industries || []).map((i) => (i.is_primary ? `${i.name} (Primary)` : i.name)).join(', ')
  const people = project?.people || {}

  const exportRecord = project
    ? {
        project_code: project.project_code,
        project_name: project.project_name,
        status_name: project.status?.status_name,
        industry_name: industriesText,
        priority_label: projectAttributeLabel(options, 'priority', project.priority),
        health: humanizeAuditToken(project.health_status),
        project_description: project.project_description,
        project_objectives: toMultilineText(project.project_objectives),
        success_criteria: toMultilineText(project.success_criteria),
        classification_label: projectAttributeLabel(options, 'classification', project.project_classification),
        methodology_label: project.delivery_methodology ? methodologyLabel(project.delivery_methodology) : '',
        billing_label: projectAttributeLabel(options, 'billing_type', project.billing_type),
        budget_currency: project.budget_currency,
        planned_start: date(project.planned_start_date),
        planned_end: date(project.planned_end_date),
        project_manager: people.projectManager,
        executive: people.executive,
        funding_authority: people.fundingAuthority,
        approving_authority: people.approvingAuthority,
        benefit_owner: people.benefitOwner,
        ...lde.mergedRecord,
      }
    : null

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to={`/platform/projects/${encodeURIComponent(projectKey)}`} aria-label="Back to the project"
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">Project Details</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{project?.project_code} — {project?.project_name}</p>
          </div>
          {exportRecord && (
            <ExportRecordMenu sections={lde.section ? [...EXPORT_SECTIONS, lde.section] : EXPORT_SECTIONS} record={exportRecord} baseFilename={`ProjectDetails_${project.project_code || project.id}`} />
          )}
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Project Details sections"
            tabs={TABS.map(({ value, label }) => ({ value, label }))} />
        </div>

        {!project ? (
          <p className="text-gray-500 dark:text-gray-400">Could not load project details.</p>
        ) : activeTab === 'custom-fields' ? (
          <RecordCustomFields
            projectId={projectId}
            entityType="project"
            entityId={project.id}
            screenCode="project_detail"
            mode="view"
            alwaysShow
            title="Custom Fields"
          />
        ) : activeTab === 'audit' ? (
          <AuditDetailsPanel description="Where this project's record stands.">
            <AuditCard title="Identity" description="How this project is labelled.">
              <AuditField label="Project" value={project.project_name} />
              <AuditField label="Project code" value={project.project_code} />
            </AuditCard>
            <AuditCard title="Classification" description="Classification and methodology.">
              <AuditField label="Classification" value={projectAttributeLabel(options, 'classification', project.project_classification) || null} />
              <AuditField label="Methodology" value={project.delivery_methodology ? methodologyLabel(project.delivery_methodology) : null} />
              <AuditField label="Priority" value={projectAttributeLabel(options, 'priority', project.priority) || null} />
            </AuditCard>
            <AuditCard title="Record history" description="When this project was created and last updated.">
              <AuditField label="Created by" value={project.created_by ? auditUserLabels[project.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={project.created_at} />
              <AuditTimestampPair dateLabel="Updated at" value={project.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        ) : (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Read-only summary. Changes are made in the project form.
              </p>
              {editHref && (
                <Link to={editHref}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              )}
            </div>
            <dl>
              {activeTab === 'overview' && (
                <>
                  <Row label="Overview">{project.project_description && <p className="whitespace-pre-wrap">{project.project_description}</p>}</Row>
                  <Row label="Status">{project.status?.status_name}</Row>
                  <Row label="Industries">{industriesText}</Row>
                  <Row label="Health">
                    {project.health_status && (
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${HEALTH_STYLES[String(project.health_status).toLowerCase()] || 'border-gray-300 dark:border-gray-600'}`}>
                        {project.health_status}
                      </span>
                    )}
                  </Row>
                </>
              )}
              {activeTab === 'objectives' && (
                <>
                  <Row label="Objectives"><ListValue text={project.project_objectives} /></Row>
                  <Row label="Success Criteria"><ListValue text={project.success_criteria} /></Row>
                </>
              )}
              {activeTab === 'classification' && (
                <>
                  <Row label="Classification">{projectAttributeLabel(options, 'classification', project.project_classification)}</Row>
                  <Row label="Priority">{projectAttributeLabel(options, 'priority', project.priority)}</Row>
                  <Row label="Methodology">{project.delivery_methodology ? methodologyLabel(project.delivery_methodology) : ''}</Row>
                  <Row label="Billing Type">{projectAttributeLabel(options, 'billing_type', project.billing_type)}</Row>
                  <Row label="Currency">{project.budget_currency}</Row>
                  <Row label="Lifecycle template">{project.lifecycle_template ? humanizeAuditToken(project.lifecycle_template) : ''}</Row>
                  <Row label="Delivery complexity">{project.delivery_complexity ? humanizeAuditToken(project.delivery_complexity) : ''}</Row>
                </>
              )}
              {activeTab === 'people' && (
                <>
                  <Row label="Planned start">{date(project.planned_start_date)}</Row>
                  <Row label="Planned end">{date(project.planned_end_date)}</Row>
                  <Row label="Project Manager">
                    {people.projectManager}
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Only a PMO Admin can change the Project Manager.</span>
                  </Row>
                  <Row label="Executive (Sponsor)">{people.executive}</Row>
                  <Row label="Funding authority">{people.fundingAuthority}</Row>
                  <Row label="Approving authority">{people.approvingAuthority}</Row>
                  <Row label="Benefit owner">{people.benefitOwner}</Row>
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
