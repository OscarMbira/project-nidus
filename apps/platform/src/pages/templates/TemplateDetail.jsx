import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy } from 'lucide-react'
import { getTemplateById, getMasterVersionHistory } from '../../services/templateLibraryService'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const BASE = '/platform/templates'

export default function TemplateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
  const [versions, setVersions] = useState([])
  const [err, setErr] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (activeTab !== 'audit' || !row) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        row.created_by,
        row.updated_by,
      ])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [activeTab, row])

  useEffect(() => {
    ;(async () => {
      const { data, error } = await getTemplateById(id)
      if (error) setErr(error.message)
      setRow(data)
      const v = await getMasterVersionHistory(id)
      setVersions(v.data || [])
    })()
  }, [id])

  const exportSections = useMemo(() => {
    if (!row) return []
    const fields = Object.keys(row.content || {}).map((k) => ({ key: k, label: k }))
    return [{ title: 'Template', fields: [{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description' }, ...fields] }]
  }, [row])

  const exportRecord = useMemo(() => {
    if (!row) return {}
    return { title: row.title, description: row.description, ...(row.content || {}) }
  }, [row])

  if (err || !row) return <div className="p-8 text-gray-600">{err || 'Loading…'}</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to={BASE} className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{row.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {row.template_type_code} · {row.status} · v{row.version}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportRecordMenu sections={exportSections} record={exportRecord} baseFilename={`Template_${row.id?.slice(0, 8)}`} />
          <button
            type="button"
            onClick={() => navigate(`${BASE}/copies/new?templateId=${row.id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white min-h-[44px]"
          >
            <Copy className="h-4 w-4" /> Create project copy
          </button>
          <Link to={`${BASE}/${id}/versions`} className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 min-h-[44px]">
            Version history
          </Link>
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Template sections" />

      {activeTab === 'audit' && (
        <AuditDetailsPanel description="Who created or changed this template, and how it is classified.">
          <AuditCard title="Identity" description="How this template is labelled and tracked.">
            <AuditField label="Title" value={row.title} />
            <AuditField label="Status" value={humanizeAuditToken(row.status)} />
            <AuditField label="Version" value={row.version} />
          </AuditCard>
          <AuditCard title="Classification" description="Where this template sits.">
            <AuditField label="Type" value={humanizeAuditToken(row.template_type_code)} />
          </AuditCard>
          <AuditCard title="Record history" description="When this template was created and last changed.">
            <AuditField label="Created by" value={row.created_by ? auditUserLabels[row.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={row.created_at} />
            <AuditField label="Updated by" value={row.updated_by ? auditUserLabels[row.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={row.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}

      {activeTab === 'details' && (
      <>
      <div className="prose dark:prose-invert max-w-none mb-8">
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{row.description || '—'}</p>
        {row.purpose && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold">Purpose</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{row.purpose}</p>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-900/40 p-4 overflow-x-auto">
        <pre className="text-sm text-gray-200">{JSON.stringify(row.content || {}, null, 2)}</pre>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Recent versions</h2>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          {versions.slice(0, 5).map((v) => (
            <li key={v.id}>
              {v.version_number} · {v.changed_at ? new Date(v.changed_at).toLocaleString() : '—'}
              {v.is_published && <span className="ml-2 text-violet-500">published</span>}
            </li>
          ))}
        </ul>
      </div>
      </>
      )}
    </div>
  )
}
