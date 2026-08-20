import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { getCopyById, exportCopyToExcel, exportCopyToPpt } from '../../services/projectTemplateCopyService'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const BASE = '/platform/templates'

export default function ProjectTemplateCopyDetail() {
  const { copyId } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState(null)
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
      const { data, error } = await getCopyById(copyId)
      if (error) setErr(error.message)
      setRow(data)
    })()
  }, [copyId])

  const exportSections = useMemo(() => {
    if (!row) return []
    const fields = Object.keys(row.content || {}).map((k) => ({ key: k, label: k }))
    return [
      {
        title: 'Copy',
        fields: [{ key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }, { key: 'current_version', label: 'Version' }, ...fields],
      },
    ]
  }, [row])

  const exportRecord = useMemo(() => {
    if (!row) return {}
    return { title: row.title, status: row.status, current_version: row.current_version, ...(row.content || {}) }
  }, [row])

  if (err || !row) return <div className="p-8 text-gray-600">{err || 'Loading…'}</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to={`${BASE}/project-copies`} className="inline-flex items-center gap-2 text-gray-600 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{row.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {row.project?.project_name || 'Project'} · v{row.current_version} · {row.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportRecordMenu sections={exportSections} record={exportRecord} baseFilename={`TemplateCopy_${copyId?.slice(0, 8)}`} />
          <button
            type="button"
            onClick={() => exportCopyToExcel(row)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
          >
            Excel
          </button>
          <button
            type="button"
            onClick={() => exportCopyToPpt(row)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
          >
            PPT
          </button>
          <button
            type="button"
            onClick={() => navigate(`${BASE}/copies/${copyId}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white min-h-[44px]"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <Link to={`${BASE}/copies/${copyId}/versions`} className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 min-h-[44px]">
            Version history
          </Link>
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Template copy sections" />

      {activeTab === 'audit' && (
        <AuditDetailsPanel description="Who created or changed this template copy, and how it is classified.">
          <AuditCard title="Identity" description="How this copy is labelled and tracked.">
            <AuditField label="Title" value={row.title} />
            <AuditField label="Status" value={humanizeAuditToken(row.status)} />
            <AuditField label="Version" value={row.current_version} />
          </AuditCard>
          <AuditCard title="Classification" description="Where this copy sits.">
            <AuditField label="Project" value={row.project?.project_name} />
          </AuditCard>
          <AuditCard title="Record history" description="When this copy was created and last changed.">
            <AuditField label="Created by" value={row.created_by ? auditUserLabels[row.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={row.created_at} />
            <AuditField label="Updated by" value={row.updated_by ? auditUserLabels[row.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={row.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}

      {activeTab === 'details' && (
      <pre className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-900/40 p-4 text-sm text-gray-200 overflow-auto">
        {JSON.stringify(row.content || {}, null, 2)}
      </pre>
      )}
    </div>
  )
}
