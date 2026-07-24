/**
 * AIWorkspaceSources.jsx (Phase 3.4)
 * Right panel: Sources from selected message — filter by module, export CSV/Print, record links.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileDown, Printer, ExternalLink, BookOpen } from 'lucide-react'

/** Flatten structured_data.modules into list of { module, row } */
function getSourceItems(structuredData) {
  const modules = structuredData?.modules ?? structuredData
  if (!modules || typeof modules !== 'object') return []
  const items = []
  for (const [moduleName, rows] of Object.entries(modules)) {
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      items.push({ module: moduleName, row })
    }
  }
  return items
}

function sourceLabel(moduleName, row) {
  if (moduleName === 'docs') return row.doc_title ?? row.doc_filename ?? 'Document'
  const id = row.risk_reference ?? row.issue_reference ?? row.mandate_reference ?? row.project_code ?? row.benefit_reference ?? row.quality_item_id ?? row.id?.slice(0, 8) ?? ''
  const title = row.risk_title ?? row.issue_title ?? row.project_name ?? row.portfolio_name ?? row.benefit_title ?? row.quality_title ?? row.stakeholder_name ?? row.task_name ?? String(id)
  const extra = row.status_enum ?? row.priority ?? row.approval_status ?? row.risk_score ?? ''
  return extra ? `${title} · ${extra}` : title
}

/** Module name -> base path for record view (id appended) */
const MODULE_ROUTES = {
  risks: '/platform/risks',
  issues: '/platform/issues',
  project_mandates: '/platform/mandates',
  mandates: '/platform/mandates',
  projects: '/platform/projects',
  portfolios: '/platform/portfolio',
  programme: '/platform/programme',
  quality: '/platform/quality',
  benefits: '/platform/benefits',
  tasks: '/platform/tasks',
  stakeholders: '/platform/stakeholders',
  docs: null, // docs use doc_route
}

function getRecordLink(moduleName, row) {
  if (moduleName === 'docs') return row.doc_route || null
  const base = MODULE_ROUTES[moduleName]
  if (!base) return null
  const id = row.id ?? row.risk_id ?? row.issue_id
  return id ? `${base}/${id}` : null
}

export default function AIWorkspaceSources({ structuredData, processedBy }) {
  const [moduleFilter, setModuleFilter] = useState('all')
  const navigate = useNavigate()

  const items = useMemo(() => getSourceItems(structuredData), [structuredData])
  const modules = useMemo(() => [...new Set(items.map((i) => i.module))].sort(), [items])
  const filtered = useMemo(
    () => (moduleFilter === 'all' ? items : items.filter((i) => i.module === moduleFilter)),
    [items, moduleFilter]
  )

  const handleExportCsv = () => {
    const headers = ['Module', 'Label']
    const rows = filtered.map(({ module: mod, row }) => [mod, sourceLabel(mod, row)])
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ai-workspace-sources.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handlePrint = () => {
    const content = filtered
      .map(({ module: mod, row }) => `${mod}: ${sourceLabel(mod, row)}`)
      .join('\n')
    const w = window.open('', '_blank')
    w.document.write(`<pre>${content}</pre>`)
    w.document.close()
    w.print()
    w.close()
  }

  if (!structuredData || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-6 text-center">
        <p className="text-sm">Select a message to view its sources here.</p>
        <p className="text-xs mt-1">Messages that answer from your data or docs show sources in this panel.</p>
      </div>
    )
  }

  const isDocs = processedBy === 'docs'

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 overflow-hidden">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isDocs ? 'Documentation' : 'Sources'} ({filtered.length})
        </p>
        {modules.length > 1 && (
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="mt-2 w-full text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-gray-800 dark:text-gray-200"
          >
            <option value="all">All modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        )}
        <div className="flex gap-1 mt-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            <FileDown className="w-3 h-3" /> CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
          >
            <Printer className="w-3 h-3" /> Print
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map(({ module: mod, row }, i) => {
          const link = getRecordLink(mod, row)
          return (
            <div
              key={i}
              className="text-xs bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-2 border border-gray-100 dark:border-gray-600"
            >
              <span className="text-gray-500 dark:text-gray-400 uppercase">{mod}</span>
              <p className="text-gray-800 dark:text-gray-200 mt-0.5 break-words">{sourceLabel(mod, row)}</p>
              {link && (
                <button
                  type="button"
                  onClick={() => navigate(link)}
                  className="mt-1 flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {isDocs ? <BookOpen className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                  Open record
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
