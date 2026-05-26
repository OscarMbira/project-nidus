import { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Download, Copy, Pencil } from 'lucide-react'
import {
  getTemplateBySlug,
  roleKeyFromPath,
  isSimRoleKey,
  getTemplateListPath,
} from '../../components/processTemplates/processTemplatesRegistry'
import {
  getTemplateService,
  canEditMasterTemplate,
  canCopyTemplate,
} from '../../services/processTemplatesService'
import { platformDb } from '../../services/supabase/supabaseClient'
import TemplateCopyModal from '../../components/processTemplates/TemplateCopyModal'
import { useProcessTemplateScope } from '../../components/processTemplates/ProcessTemplateProjectScope'
import { exportListToPrint } from '../../utils/exportUtils'

const DETAIL_COLS = [
  { key: 'reference_code', label: 'Reference' },
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status' },
  { key: 'is_master', label: 'Master' },
]

export default function ProcessTemplateDetailPage({ roleKey: roleKeyProp, sim: simProp }) {
  const { slug, id } = useParams()
  const location = useLocation()
  const template = getTemplateBySlug(slug)
  const roleKey = roleKeyProp || roleKeyFromPath(location.pathname)
  const sim = simProp ?? isSimRoleKey(roleKey)
  const listPath = getTemplateListPath(roleKey, slug)
  const { projectId: scopeProjectId } = useProcessTemplateScope(roleKey)
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [copyOpen, setCopyOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    platformDb.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null))
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const svc = getTemplateService(slug, { sim })
        const data = await svc.getById(id)
        if (!cancelled) setRow(data)
      } catch (e) {
        toast.error(e?.message || 'Load failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [slug, id, sim])

  if (!template || template.kind !== 'new') {
    return <div className="p-6 text-gray-400">Template not found.</div>
  }

  if (loading) return <p className="p-6 text-gray-500">Loading…</p>
  if (!row) return <p className="p-6 text-gray-500">Record not found.</p>

  const canEdit = canEditMasterTemplate(roleKey, row, userId)
  const canCopy = canCopyTemplate(roleKey) && row.is_master
  const copyProjectId = row.is_master ? scopeProjectId : (row.project_id || row.practice_project_id)

  const handleExport = (fmt) => {
    const exportRow = {
      ...row,
      is_master: row.is_master ? 'Yes' : 'No',
      notes: row.document_data?.notes || '',
    }
    const cols = [...DETAIL_COLS, { key: 'notes', label: 'Notes' }]
    if (fmt === 'print') exportListToPrint(cols, [exportRow], `${slug}-${id}`, template.label)
    setExportOpen(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <Link to={listPath} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to list
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-100">{row.title || 'Untitled'}</h1>
          <p className="text-sm text-gray-500 mt-1">{row.reference_code || row.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Link
              to={`${listPath}/${id}/edit`}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-600 text-sm text-gray-200 hover:bg-gray-800"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          )}
          {canCopy && (
            <button
              type="button"
              onClick={() => setCopyOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-blue-600 text-sm text-blue-300 hover:bg-blue-900/30"
            >
              <Copy className="h-4 w-4" />
              Copy to workspace
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-600 text-sm text-gray-200 hover:bg-gray-800"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 z-10 rounded-lg border border-gray-700 bg-gray-900 py-1 min-w-[100px]">
                <button type="button" onClick={() => handleExport('print')} className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-800">
                  Print
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <dl className="rounded-xl border border-gray-700 bg-gray-900/50 divide-y divide-gray-800">
        <div className="px-4 py-3 grid grid-cols-3 gap-2">
          <dt className="text-sm text-gray-500">Status</dt>
          <dd className="col-span-2 text-sm text-gray-200 capitalize">{row.status}</dd>
        </div>
        <div className="px-4 py-3 grid grid-cols-3 gap-2">
          <dt className="text-sm text-gray-500">Type</dt>
          <dd className="col-span-2 text-sm text-gray-200">{row.is_master ? 'Master template' : 'Workspace copy'}</dd>
        </div>
        <div className="px-4 py-3 grid grid-cols-3 gap-2">
          <dt className="text-sm text-gray-500">Description</dt>
          <dd className="col-span-2 text-sm text-gray-200 whitespace-pre-wrap">{row.description || '—'}</dd>
        </div>
        <div className="px-4 py-3 grid grid-cols-3 gap-2">
          <dt className="text-sm text-gray-500">Document notes</dt>
          <dd className="col-span-2 text-sm text-gray-200 whitespace-pre-wrap font-mono">{row.document_data?.notes || '—'}</dd>
        </div>
        <div className="px-4 py-3 grid grid-cols-3 gap-2">
          <dt className="text-sm text-gray-500">Record ID</dt>
          <dd className="col-span-2 text-xs text-gray-400 font-mono">{row.id}</dd>
        </div>
      </dl>

      <TemplateCopyModal
        open={copyOpen}
        master={row}
        slug={slug}
        projectId={copyProjectId}
        sim={sim}
        onClose={() => setCopyOpen(false)}
      />
    </div>
  )
}
