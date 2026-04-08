/**
 * RFPLineItemsTable - Line items table with vendor responses and search
 * readOnly: no inline edit, reorder, delete for non-PMO
 * onEdit, onDelete: optional callbacks for row actions (PMO only)
 */

import { useState, useMemo } from 'react'
import { Pencil, Trash2, Search } from 'lucide-react'

const hasAnyAdditional = (items) => items?.some((i) => i.additional_columns && typeof i.additional_columns === 'object' && Object.keys(i.additional_columns).length > 0)

function matchItem(item, q) {
  if (!q || !q.trim()) return true
  const s = q.toLowerCase().trim()
  const str = (v) => (v != null ? String(v).toLowerCase() : '')
  if (str(item.item_number).includes(s)) return true
  if (str(item.reference_number).includes(s)) return true
  if (str(item.scope_entity).includes(s)) return true
  if (str(item.business_area).includes(s)) return true
  if (str(item.description).includes(s)) return true
  if (str(item.vendor_response).includes(s)) return true
  const extra = item.additional_columns && typeof item.additional_columns === 'object' ? item.additional_columns : {}
  for (const v of Object.values(extra)) {
    if (str(v).includes(s)) return true
  }
  return false
}

export default function RFPLineItemsTable({ items = [], readOnly = false, onEdit, onDelete }) {
  const [searchQuery, setSearchQuery] = useState('')
  const showActions = !readOnly && (onEdit || onDelete)
  const showAdditional = hasAnyAdditional(items)

  const filteredItems = useMemo(() => {
    if (!items?.length) return []
    if (!searchQuery.trim()) return items
    return items.filter((item) => matchItem(item, searchQuery))
  }, [items, searchQuery])

  const isEmpty = !items || items.length === 0
  const columnCount = 6 + (showAdditional ? 1 : 0) + (showActions ? 1 : 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search line items..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search line items"
          />
        </div>
        {!isEmpty && searchQuery.trim() && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredItems.length} of {items.length}
          </span>
        )}
      </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700/50">
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">S/No</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reference</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Scope/Entity</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Business Area</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vendor Response</th>
            {showAdditional && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Additional</th>}
            {showActions && <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-24">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {isEmpty ? (
            <tr>
              <td colSpan={columnCount} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No line items. Use &quot;Add Item&quot; or &quot;Bulk Import&quot; to add line items.
              </td>
            </tr>
          ) : filteredItems.map((item) => {
            const extra = item.additional_columns && typeof item.additional_columns === 'object' ? item.additional_columns : {}
            const extraKeys = Object.keys(extra)
            return (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.item_number}</td>
              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{item.reference_number || '-'}</td>
              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{item.scope_entity || '-'}</td>
              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{item.business_area || '-'}</td>
              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white max-w-md">{item.description || '-'}</td>
              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">{item.vendor_response || '-'}</td>
              {showAdditional && (
                <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 max-w-xs" title={extraKeys.length ? extraKeys.map((k) => `${k}: ${extra[k]}`).join('\n') : ''}>
                  {extraKeys.length ? `${extraKeys.length} field${extraKeys.length !== 1 ? 's' : ''}` : '-'}
                </td>
              )}
              {showActions && (
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    {onEdit && (
                      <button onClick={() => onEdit(item)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(item)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    {!isEmpty && searchQuery.trim() && filteredItems.length === 0 && (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No line items match your search.</p>
    )}
    </div>
  )
}
