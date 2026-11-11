import { useMemo, useState } from 'react'
import { Search, Copy, Archive, ArchiveRestore, PlusCircle } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from './Table'
import ViewToggle from './ViewToggle'
import RowActionButton from './RowActionButton'
import RowNumberBadge from './RowNumberBadge'

const TEXT_BUTTON = 'inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'

/** Default order (rule 40.1): name A→Z, then created first. */
function defaultOrder(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
    || String(a.created_at || '').localeCompare(String(b.created_at || ''))
}

/**
 * Templates tab of a register list page (v1336): System and Organisation templates, Card ⊞ /
 * Table ≡ (default table, rule 41), search, sortable columns (rule 40), row numbers (rule 44),
 * icon-only View / Edit (rule 61). Managers (PMO Admin / PM) can Customise, Edit and Archive.
 *
 * @param {object} props
 * @param {string} props.registerKey
 * @param {object[]} props.templates   rows from listRegisterTemplates(…, { includeArchived: true })
 * @param {boolean} [props.loading]
 * @param {boolean} [props.canManage]
 * @param {(t: object) => void} props.onPreview
 * @param {(t: object) => void} props.onUse
 * @param {(t: object) => void} [props.onCustomise]
 * @param {(t: object) => void} [props.onEdit]
 * @param {(t: object, archived: boolean) => void} [props.onArchive]
 */
export default function RegisterTemplatesTab({ registerKey, templates = [], loading = false, canManage = false, onPreview, onUse, onCustomise, onEdit, onArchive }) {
  const [viewMode, setViewMode] = useViewMode(`register-templates-${registerKey}`, 'list')
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({ storageKey: `register-templates-${registerKey}-sort` })

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = templates
      .filter((t) => showArchived || !t.is_archived)
      .filter((t) => !term || `${t.name} ${t.description || ''} ${t.display_id || ''}`.toLowerCase().includes(term))
      .sort(defaultOrder)
    return sortedData(list, {
      name: (t) => String(t.name || '').toLowerCase(),
      source: (t) => t.template_scope,
      version: (t) => Number(t.version || 0),
      updated_at: (t) => t.updated_at || '',
    })
  }, [templates, search, showArchived, sortedData])

  const scopeLabel = (t) => (t.template_scope === 'system' ? 'System' : 'Organisation')
  const editable = (t) => canManage && t.template_scope === 'organisation'

  const actions = (t) => (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <RowActionButton variant="view" label={`Preview ${t.name}`} onClick={() => onPreview(t)} />
      {editable(t) && onEdit && <RowActionButton variant="edit" label={`Edit ${t.name}`} onClick={() => onEdit(t)} />}
      {!t.is_archived && (
        <button type="button" onClick={() => onUse(t)} className={TEXT_BUTTON}>
          <PlusCircle className="h-3.5 w-3.5" /> Use
        </button>
      )}
      {canManage && onCustomise && !t.is_archived && (
        <button type="button" onClick={() => onCustomise(t)} className={TEXT_BUTTON}>
          <Copy className="h-3.5 w-3.5" /> Customise
        </button>
      )}
      {editable(t) && onArchive && (
        <button type="button" onClick={() => onArchive(t, !t.is_archived)} className={TEXT_BUTTON}>
          {t.is_archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          {t.is_archived ? 'Restore' : 'Archive'}
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            aria-label="Search templates"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="flex items-center gap-3">
          {canManage && (
            <label className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Show archived
            </label>
          )}
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Templates layout" />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading templates…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          No templates yet.{canManage ? ' Open a record and choose Save as template, or customise a system template.' : ''}
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader className="!normal-case" />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('name')} onSort={() => handleSort('name')} className="!normal-case">Template</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('source')} onSort={() => handleSort('source')} className="!normal-case">Source</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('version')} onSort={() => handleSort('version')} className="!normal-case">Version</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case">Products</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('updated_at')} onSort={() => handleSort('updated_at')} className="!normal-case">Updated</TableHeaderCell>
                <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((t, index) => (
                <tr key={t.id} className={t.is_archived ? 'opacity-60' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}>
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-4 py-3 text-sm">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
                    {t.description && <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{t.description}</p>}
                    {t.display_id && <p className="font-mono text-xs text-blue-600 dark:text-blue-400">{t.display_id}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{scopeLabel(t)}{t.is_archived ? ' (archived)' : ''}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">v{t.version}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{t.child_count || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">{actions(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t, index) => (
            <li key={t.id} className={`flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${t.is_archived ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-2">
                <RowNumberBadge number={getDisplayRowNumber(index)} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {scopeLabel(t)} · v{t.version}{t.child_count ? ` · ${t.child_count} products` : ''}{t.is_archived ? ' · archived' : ''}
                  </p>
                </div>
              </div>
              {t.description && <p className="line-clamp-3 text-xs text-gray-600 dark:text-gray-300">{t.description}</p>}
              <div className="mt-auto">{actions(t)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
