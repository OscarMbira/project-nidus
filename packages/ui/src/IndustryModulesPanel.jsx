/**
 * v1341 (D16, D19, R3) — Industry Modules: switch off industry menu items a project does not need.
 * Switching off only hides the menu entry for everyone on the project; records are kept and come
 * back when the item is switched on again. Items switched off by the organisation are locked.
 * Presentational: the app page loads `rows` / `history` and handles `onToggle`.
 *
 * @param {{
 *   projectLabel?: string,
 *   rows: Array<{ menu_item_id: string, menu_label: string, group_label?: string, industry_name?: string,
 *                 is_disabled: boolean, disabled_at?: string, disabled_by_name?: string, organisation_disabled?: boolean }>,
 *   history: Array<{ id: string, menu_label: string, action: 'switched_off'|'switched_on', changed_at: string, changed_by_name?: string }>,
 *   loading?: boolean,
 *   error?: string|null,
 *   canEdit?: boolean,
 *   savingId?: string|null,
 *   onToggle: (row: object, nextDisabled: boolean) => void,
 *   viewModeId?: string,
 * }} props
 */
import { useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from './Table.jsx'
import RowNumberBadge from './RowNumberBadge.jsx'
import ViewToggle from './ViewToggle.jsx'
import DetailAuditTabList from './DetailAuditTabList.jsx'
import AuditDetailsPanel from './AuditDetailsPanel.jsx'
import AuditCard from './AuditCard.jsx'
import AuditField from './AuditField.jsx'

const ACCESSORS = {
  menu_label: (r) => r.menu_label,
  group_label: (r) => r.group_label,
  industry_name: (r) => r.industry_name,
  status: (r) => (r.organisation_disabled ? 2 : r.is_disabled ? 1 : 0),
}
const fmt = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString()
}

function StatusSwitch({ row, canEdit, saving, onToggle }) {
  if (row.organisation_disabled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300" title="Switched off by your organisation">
        <Lock className="h-3 w-3" aria-hidden="true" /> Off for the organisation
      </span>
    )
  }
  const on = !row.is_disabled
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${row.menu_label}: ${on ? 'shown' : 'switched off'}`}
      disabled={!canEdit || saving}
      onClick={() => onToggle(row, on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
        on ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export default function IndustryModulesPanel({
  projectLabel = '',
  rows = [],
  history = [],
  loading = false,
  error = null,
  canEdit = false,
  savingId = null,
  onToggle,
  viewModeId = 'industry-modules',
}) {
  const [tab, setTab] = useState('details')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode(viewModeId, 'list')
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'menu_label', direction: 'asc' },
    storageKey: `${viewModeId}-sort`,
  })

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? rows.filter((r) => [r.menu_label, r.group_label, r.industry_name].some((v) => String(v || '').toLowerCase().includes(q)))
      : rows
    return sortedData(list, ACCESSORS)
  }, [rows, search, sortedData])

  const offCount = rows.filter((r) => r.is_disabled).length
  const last = history[0] || null
  const header = (column, label) => (
    <TableHeaderCell sortable sortDirection={getSortDirectionForColumn(column)} onSort={() => handleSort(column)}>{label}</TableHeaderCell>
  )

  return (
    <div className="space-y-4">
      <DetailAuditTabList activeTab={tab} onChange={setTab} ariaLabel="Industry modules sections" />

      {tab === 'audit' && (
        <AuditDetailsPanel description="Who switched industry items off or on for this project, and when.">
          <AuditCard title="Identity" description="The project these settings belong to.">
            <AuditField label="Project" value={projectLabel || '—'} />
          </AuditCard>
          <AuditCard title="Classification" description="Industry items on this project.">
            <AuditField label="Industry items" value={String(rows.length)} />
            <AuditField label="Switched off" value={String(offCount)} />
          </AuditCard>
          <AuditCard title="Record history" description="The most recent change.">
            <AuditField label="Last changed by" value={last?.changed_by_name || '—'} />
            <AuditField label="Last changed at" value={fmt(last?.changed_at)} />
          </AuditCard>
          <div className="lg:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <TableRowNumberHeader />
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Item</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Change</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">By</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {history.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-4 text-gray-500 dark:text-gray-400">No changes yet.</td></tr>
                )}
                {history.map((h, i) => (
                  <tr key={h.id}>
                    <TableRowNumberCell number={getDisplayRowNumber(i)} />
                    <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{h.menu_label}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{h.action === 'switched_off' ? 'Switched off' : 'Switched on'}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{h.changed_by_name || '—'}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{fmt(h.changed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AuditDetailsPanel>
      )}

      {tab === 'details' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Switch off industry pages this project does not need. They disappear from the sidebar for everyone on the
            project. Nothing is deleted: switch a page back on and it returns with all its records.
          </p>
          {!canEdit && !loading && (
            <p className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              Only the Project Manager or a PMO Admin can change these settings. You can view them.
            </p>
          )}
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="search"
              aria-label="Search industry items"
              placeholder="Search industry items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:max-w-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Industry items layout" className="sm:ml-auto" />
          </div>

          {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading industry items…</p>}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">This project has no industry, so there is nothing to switch off.</p>
          )}
          {!loading && rows.length > 0 && visible.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No industry items match your search.</p>
          )}

          {!loading && visible.length > 0 && viewMode === 'list' && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <TableRowNumberHeader />
                    {header('menu_label', 'Page')}
                    {header('group_label', 'Group')}
                    {header('industry_name', 'Industry')}
                    {header('status', 'Shown')}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {visible.map((row, index) => (
                    <tr key={row.menu_item_id}>
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-3 text-sm text-gray-900 dark:text-gray-100">{row.menu_label}</td>
                      <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{row.group_label || '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{row.industry_name || '—'}</td>
                      <td className="px-6 py-3"><StatusSwitch row={row} canEdit={canEdit} saving={savingId === row.menu_item_id} onToggle={onToggle} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && visible.length > 0 && viewMode !== 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visible.map((row, index) => (
                <div key={row.menu_item_id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <RowNumberBadge number={getDisplayRowNumber(index)} />
                    <StatusSwitch row={row} canEdit={canEdit} saving={savingId === row.menu_item_id} onToggle={onToggle} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.menu_label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{[row.group_label, row.industry_name].filter(Boolean).join(' · ')}</p>
                  {row.is_disabled && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Switched off{row.disabled_by_name ? ` by ${row.disabled_by_name}` : ''} {fmt(row.disabled_at)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
