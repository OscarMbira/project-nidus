import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { simDb } from '@nidus/supabase'
import { getTemplateNode } from '@nidus/shared/services/pmTemplateNodeService.js'
import { getNodeContent } from '@nidus/shared/services/pmTemplateContentService.js'
import { copyTemplateNodeForAccount } from '@nidus/shared/services/pmTemplateCopyService.js'
import { resolveAccountTemplateOverride } from '@nidus/shared/services/pmTemplateOverrideService.js'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution.js'
import { getMenuLabel } from '@nidus/shared/services/menuLabelService.js'
import { METHODOLOGY_TRACK_DEFS } from '@nidus/config/methodologyMenuUtils.js'

const TIER_LABELS = {
  portfolio: 'Portfolio',
  programme: 'Programme',
  project: 'Project',
  pmo: 'PMO',
}

function methodologyLabel(m) {
  if (m == null || String(m).trim() === '') return 'Common'
  const def = METHODOLOGY_TRACK_DEFS.find((d) => d.track === m)
  return def?.shortLabel || m
}

function humanizeKey(key) {
  return String(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function isSameText(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
}

/** Label + readonly "form field" box — matches the app's input styling but non-editable. */
function FieldGroup({ label, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </label>
      )}
      <div className="w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800/60 dark:text-gray-100">
        {children}
      </div>
    </div>
  )
}

/** Array/object values need more room to breathe than a half-width column allows. */
function isWideValue(value) {
  return Array.isArray(value) || (value != null && typeof value === 'object')
}

/** Renders a document_data (or nested) value as prose/bullets/nested fields — never raw JSON braces. */
function FieldValue({ value }) {
  if (value == null || value === '') return <span className="text-gray-400 dark:text-gray-500">—</span>
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-1 pl-4">
        {value.map((v, i) => (
          <li key={i}>{v && typeof v === 'object' ? <FieldValue value={v} /> : String(v)}</li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'object') {
    return (
      <div className="space-y-3">
        {Object.entries(value).map(([k, v]) => (
          <FieldGroup key={k} label={humanizeKey(k)}>
            <FieldValue value={v} />
          </FieldGroup>
        ))}
      </div>
    )
  }
  return <span className="whitespace-pre-wrap">{String(value)}</span>
}

/**
 * Read-only, non-modal preview of a Global template's content — reached from the
 * Global Template Library's "View" action so a user can review a template before
 * committing to Copy. Full page (not an overlay) per user preference.
 * Route: /simulator/pmo/template-library/preview/:nodeId
 */
export default function TemplatePreviewPage() {
  const { nodeId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const entityType = searchParams.get('entityType')
  const entityId = searchParams.get('entityId')
  const tierParam = searchParams.get('tier')

  const [node, setNode] = useState(null)
  const [info, setInfo] = useState({ kind: 'none', content: null })
  const [overrideNode, setOverrideNode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [backLabel, setBackLabel] = useState('Global Template Library')

  useEffect(() => {
    getMenuLabel(simDb, 'sim_tpl_library', 'Global Template Library').then(setBackLabel)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const n = await getTemplateNode(simDb, nodeId)
        if (!n) {
          toast.error('Template not found')
          return
        }
        if (cancelled) return
        setNode(n)
        const [contentInfo, accountId] = await Promise.all([
          getNodeContent(simDb, n),
          getCurrentUserAccountId(),
        ])
        if (cancelled) return
        setInfo(contentInfo)
        if (accountId && ['portfolio', 'programme', 'project'].includes(entityType)) {
          const override = await resolveAccountTemplateOverride(simDb, { accountId, globalNodeId: n.id })
          if (!cancelled) setOverrideNode(override)
        }
      } catch (e) {
        toast.error(e.message || 'Failed to load template')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [nodeId, entityType])

  const backHref = `/simulator/pmo/template-library${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

  const handleCopy = async () => {
    if (!node) return
    setCopying(true)
    try {
      const accountId = await getCurrentUserAccountId()
      const tier = tierParam || (entityType ? entityType.replace('practice_', '') : 'pmo')
      const isDownstreamScope = ['portfolio', 'programme', 'project'].includes(entityType)
      const source = isDownstreamScope && overrideNode ? overrideNode : node
      const { node: copied } = await copyTemplateNodeForAccount(simDb, {
        accountId,
        sourceNodeId: source.id,
        tier: ['portfolio', 'programme', 'project', 'pmo'].includes(tier) ? tier : 'pmo',
        scopeEntityType: entityType || 'account',
        scopeEntityId: entityId || null,
      })
      toast.success(`Copied as "${copied.name}" (${copied.template_reference || copied.id})`)
      navigate(backHref)
    } catch (e) {
      toast.error(e.message || 'Copy failed')
    } finally {
      setCopying(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    )
  }
  if (!node) return null

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <Link
        to={backHref}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {backLabel}
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{node.name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {[TIER_LABELS[node.tier] || node.tier, node.domain, methodologyLabel(node.methodology)].filter(Boolean).join(' · ')}
        </p>
        {overrideNode && (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            Your organisation already has a customised copy of this template.
          </p>
        )}
      </div>

      <FieldGroup label="Description">
        <FieldValue value={node.description} />
      </FieldGroup>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Template content
        </h2>

        {info.kind === 'opa' && info.content && (
          <div className="space-y-4">
            {!isSameText(info.content.name, node.name) && (
              <FieldGroup label="Name">
                <FieldValue value={info.content.name} />
              </FieldGroup>
            )}
            {!isSameText(info.content.description, node.description) && (
              <FieldGroup label="Description">
                <FieldValue value={info.content.description} />
              </FieldGroup>
            )}
          </div>
        )}

        {info.kind === 'process_template' && info.content && (
          <div className="space-y-4">
            {!isSameText(info.content.title || info.content.name, node.name) && (
              <FieldGroup label="Title">
                <FieldValue value={info.content.title || info.content.name} />
              </FieldGroup>
            )}
            {!isSameText(info.content.description, node.description) && (
              <FieldGroup label="Description">
                <FieldValue value={info.content.description} />
              </FieldGroup>
            )}
            {info.content.document_data && typeof info.content.document_data === 'object' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Object.entries(info.content.document_data).map(([key, value]) => (
                  <FieldGroup
                    key={key}
                    label={humanizeKey(key)}
                    className={isWideValue(value) ? 'md:col-span-2' : ''}
                  >
                    <FieldValue value={value} />
                  </FieldGroup>
                ))}
              </div>
            )}
          </div>
        )}

        {info.kind === 'process_template' && !info.content && (
          <p className="text-sm text-amber-600 dark:text-amber-400">No content row found for this process document.</p>
        )}

        {info.kind === 'level_template' && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This template only carries the name/description/category shown above — there is no
            additional payload stored for this domain.
          </p>
        )}

        {info.kind === 'form_template' && info.content && (
          <div className="space-y-5">
            {(info.content.schema?.sections || []).length > 0 ? (
              info.content.schema.sections.map((section) => (
                <div key={section.key} className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{section.title}</h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(section.fields || []).map((field) => (
                      <FieldGroup key={field.key} label={`${field.label}${field.required ? ' *' : ''}`}>
                        <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          {field.type}
                        </span>
                        {field.type === 'select' && Array.isArray(field.options) && field.options.length > 0 && (
                          <div className="mt-1">
                            <FieldValue value={field.options} />
                          </div>
                        )}
                      </FieldGroup>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                No fields found for this form template's current version.
              </p>
            )}
          </div>
        )}

        {info.kind === 'form_template' && !info.content && (
          <p className="text-sm text-amber-600 dark:text-amber-400">No content row found for this form template.</p>
        )}

        {info.kind === 'fields' && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Preview for this domain is managed on its own dedicated page — use Copy to bring it
            into your organisational library.
          </p>
        )}

        {info.kind === 'none' && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No additional content available for this template.</p>
        )}
      </div>

      <button
        type="button"
        disabled={copying}
        onClick={handleCopy}
        className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        <Copy className="h-4 w-4" />
        {copying ? 'Copying…' : overrideNode ? 'Copy again' : 'Copy to customise'}
      </button>
    </div>
  )
}
