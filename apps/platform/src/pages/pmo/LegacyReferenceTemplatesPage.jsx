import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { platformDb } from '@nidus/supabase'
import {
  listLegacyDocumentTemplates,
  listStructuredListTemplates,
  getLegacyTemplateSignedUrl,
} from '@nidus/shared/services/legacyTemplateService'
import ViewToggle from '@nidus/ui/ViewToggle'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { RowNumberBadge } from '@nidus/ui'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'

export default function LegacyReferenceTemplatesPage() {
  const [tab, setTab] = useState('documents')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useViewMode('pmo-legacy-ref-templates', 'list')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = tab === 'documents'
        ? await listLegacyDocumentTemplates(platformDb, { search })
        : await listStructuredListTemplates(platformDb, { search })
      setRows(data)
    } catch (e) {
      toast.error(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [tab, search])

  useEffect(() => { load() }, [load])

  const downloadDoc = async (row) => {
    try {
      const url = await getLegacyTemplateSignedUrl(platformDb, row.storage_path)
      if (!url) throw new Error('Could not create download link')
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reference & list templates</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Uploaded legacy documents and structured lists available to PMs.
          </p>
        </div>
        <Link
          to="/pmo/legacy-templates/upload"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Upload legacy template
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('documents')}
          className={`rounded px-3 py-1.5 text-sm ${tab === 'documents' ? 'bg-blue-700 text-white' : 'border border-slate-600 text-slate-300'}`}
        >
          Documents
        </button>
        <button
          type="button"
          onClick={() => setTab('lists')}
          className={`rounded px-3 py-1.5 text-sm ${tab === 'lists' ? 'bg-blue-700 text-white' : 'border border-slate-600 text-slate-300'}`}
        >
          Structured lists
        </button>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="rounded border border-slate-600 bg-slate-950 px-3 py-1.5 text-sm text-slate-200"
        />
        <ViewToggle view={viewMode} onChange={setViewMode} />
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">No templates yet. Upload a legacy file to get started.</p>
      ) : viewMode === 'list' || viewMode === 'table' ? (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="min-w-full text-sm text-slate-200">
            <thead className="bg-slate-800 text-left text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">{tab === 'documents' ? 'Category' : 'Type'}</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-slate-500">{getDisplayRowNumber(index)}</td>
                  <td className="px-3 py-2">{row.title}</td>
                  <td className="px-3 py-2">{tab === 'documents' ? row.doc_category : row.list_type}</td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">
                    {tab === 'documents' ? (
                      <button type="button" className="text-blue-400 hover:underline" onClick={() => downloadDoc(row)}>
                        Download
                      </button>
                    ) : (
                      <span className="text-slate-400">{(row.rows || []).length} rows</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row, index) => (
            <article key={row.id} className="rounded-lg border border-slate-700 bg-slate-900 p-4">
              <div className="mb-2 flex items-center gap-2">
                <RowNumberBadge number={getDisplayRowNumber(index)} />
                <h3 className="font-medium text-slate-100">{row.title}</h3>
              </div>
              <p className="text-xs text-slate-500">
                {tab === 'documents' ? row.doc_category : `${row.list_type} · ${(row.rows || []).length} rows`}
              </p>
              {tab === 'documents' && (
                <button type="button" className="mt-3 text-sm text-blue-400 hover:underline" onClick={() => downloadDoc(row)}>
                  Download
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
