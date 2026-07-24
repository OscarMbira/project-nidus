import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Modal } from '@nidus/ui'
import { getFormTemplates, getFormTemplate } from '../../services/formEngineService'
import { getSessionPMOAdminStatus } from '../../services/pmoAdminService'
import FormTemplateGallery from '../../components/forms/FormTemplateGallery'

/** Maps sidebar ?group= (PMO menus) → form_templates.process_group */
const GROUP_TO_PROCESS_GROUP = {
  // Standards-Based process groups
  Initiating: 'initiating',
  Planning: 'planning',
  Executing: 'executing',
  Monitoring: 'monitoring_controlling',
  Closing: 'closing',
  // Legacy single Agile bucket (still matches process_group = agile if any remain)
  Agile: 'agile',
  // Structured ceremonies (v786 / Admin v189)
  'Starting Up': 'starting_up',
  Directing: 'directing',
  'Controlling a Stage': 'controlling_a_stage',
  'Managing Product Delivery': 'managing_product_delivery',
  'Managing a Stage Boundary': 'managing_a_stage_boundary',
  // Agile ceremonies (v786 / Admin v191)
  Backlog: 'backlog',
  'Sprint Planning': 'sprint_planning',
  'Sprint Execution': 'sprint_execution',
  'Review & Retrospective': 'review_retrospective',
  Release: 'release',
}

const GROUP_LABELS = {
  Monitoring: 'Monitoring & Controlling',
}

export default function FormTemplateAdmin({ mode = 'platform' }) {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [search, setSearch] = useState('')
  const [searchParams] = useSearchParams()
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [isPmoAdmin, setIsPmoAdmin] = useState(false)

  const groupParam = searchParams.get('group')
  const processGroup = groupParam ? GROUP_TO_PROCESS_GROUP[groupParam] : null
  const builderBase = mode === 'sim' ? '/simulator/pmo/forms' : '/pmo/forms'

  useEffect(() => {
    getSessionPMOAdminStatus().then(({ isPMOAdmin }) => setIsPmoAdmin(Boolean(isPMOAdmin)))
    getFormTemplates(undefined, mode).then((r) => r.success && setTemplates(r.data))
  }, [mode])

  const filtered = useMemo(() => {
    let list = templates
    if (processGroup) list = list.filter((t) => t.process_group === processGroup)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.template_code.toLowerCase().includes(q)
      )
    }
    return list
  }, [templates, processGroup, search])

  const handleSelect = async (template) => {
    setPreviewLoading(true)
    setPreviewTemplate(null)
    const r = await getFormTemplate(template.template_code, mode)
    setPreviewLoading(false)
    if (r.success) setPreviewTemplate(r.data)
  }

  const handleEdit = (template) => {
    navigate(`${builderBase}/${template.template_code}/edit`)
  }

  const groupLabel = groupParam ? GROUP_LABELS[groupParam] || groupParam : 'All process groups'

  return (
    <div className="space-y-4 p-4 text-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Form Templates Admin</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {groupLabel} &middot; {filtered.length} of {templates.length} templates
          </p>
        </div>
        {isPmoAdmin && (
          <Link
            to={`${builderBase}/new`}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            New Template
          </Link>
        )}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search templates..."
        className="w-full max-w-sm rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No templates match this filter.</p>
      ) : (
        <FormTemplateGallery
          templates={filtered}
          onSelect={handleSelect}
          onEdit={handleEdit}
          canEdit={isPmoAdmin}
        />
      )}

      <Modal
        isOpen={previewLoading || !!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        title={previewTemplate?.name || 'Loading template...'}
        size="lg"
      >
        {previewLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        )}
        {previewTemplate && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {previewTemplate.template_code} &middot; {previewTemplate.process_group}
              {previewTemplate.current_version?.version_number != null && (
                <> &middot; v{previewTemplate.current_version.version_number}</>
              )}
            </p>
            {(previewTemplate.current_version?.schema?.sections || []).map((section) => (
              <div key={section.key}>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {section.title}
                </h3>
                <ul className="space-y-1">
                  {(section.fields || []).map((field) => (
                    <li
                      key={field.key}
                      className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2"
                    >
                      <span>{field.label}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">({field.type})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {isPmoAdmin && (
              <Link
                to={`${builderBase}/${previewTemplate.template_code}/edit`}
                className="inline-block text-sm text-blue-500 hover:underline"
              >
                Edit this template
              </Link>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
