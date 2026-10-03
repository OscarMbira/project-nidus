/**
 * Organisation risk categories (v1107).
 * Same page from PMO Configuration and from RAID → Risks.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, Tags } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import ViewToggle from '@nidus/ui/ViewToggle'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import { RowActionButton } from '@nidus/ui'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import RowNumberBadge from '@nidus/ui/RowNumberBadge'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { getRiskCatalogueAccess, listRiskCatalogue } from '../../services/riskCategoryCatalogService'
import { riskCategoryBasePath } from './riskCategoryPaths'

const COLUMNS = [
  { key: 'category_name', label: 'Category' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
  { key: 'subcategories', label: 'Sub-categories' },
]

export default function RiskCategoryCatalog() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const basePath = riskCategoryBasePath(pathname)
  const [viewMode, setViewMode] = useViewMode('risk-category-catalog', 'list')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [canAdd, setCanAdd] = useState(false)
  const [canMaintain, setCanMaintain] = useState(false)
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [search, setSearch] = useState('')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'category_name', direction: 'asc' },
    storageKey: 'nidus-risk-category-catalog',
    serverColumnMap: {},
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const access = await getRiskCatalogueAccess()
    if (!access.success) {
      setError(access.error || 'Could not check access')
      setLoading(false)
      return
    }
    setCanAdd(access.canAdd)
    setCanMaintain(access.canMaintain)
    const catalogue = await listRiskCatalogue(access.accountId)
    if (!catalogue.success) setError(catalogue.error || 'Could not load risk categories')
    setCategories(catalogue.categories || [])
    setSubcategories(catalogue.subcategories || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return categories
      .map((category) => {
        const scopedChildren = subcategories.filter((row) => {
          if (row.category_code !== category.category_code) return false
          if (row.organisation_id && category.organisation_id && row.organisation_id !== category.organisation_id) return false
          return true
        })
        return {
          ...category,
          source: category.organisation_id ? 'Organisation' : 'Built-in',
          status: category.is_active ? 'Active' : 'Inactive',
          children: scopedChildren,
          subcategoryLabel: scopedChildren.map((row) => row.subcategory_name).join(', '),
        }
      })
      .filter((row) => {
        if (!query) return true
        return row.category_name.toLowerCase().includes(query)
          || row.children.some((child) => child.subcategory_name.toLowerCase().includes(query))
      })
  }, [categories, subcategories, search])

  const displayRows = useMemo(
    () => sortedData(rows, {
      category_name: (row) => row.category_name || '',
      source: (row) => row.source,
      status: (row) => row.status,
      created_at: (row) => row.created_at || '',
    }),
    [rows, sortedData],
  )

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Tags className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Risk Categories</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Names used when a risk is logged. Shared by every project in this organisation.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Risk category layout" />
          <ExportListMenu
            columns={COLUMNS}
            data={displayRows.map((row) => ({
              category_name: row.category_name,
              source: row.source,
              status: row.status,
              subcategories: row.subcategoryLabel,
            }))}
            baseFilename="Risk-Categories"
            disabled={!displayRows.length}
          />
          {canAdd && (
            <button
              type="button"
              onClick={() => navigate(`${basePath}/create`)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add category
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search categories"
          className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-gray-600 dark:text-gray-300">Loading categories…</p>
      ) : displayRows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-700 dark:text-gray-200">No categories match this search.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {displayRows.map((row, index) => (
            <article key={row.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RowNumberBadge number={getDisplayRowNumber(index)} />
                  <h2 className="font-semibold text-gray-900 dark:text-white">{row.category_name}</h2>
                </div>
                <RowActions row={row} basePath={basePath} canAdd={canAdd} canMaintain={canMaintain} navigate={navigate} />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200">{row.source} · {row.status}</p>
              <SubcategoryList row={row} basePath={basePath} canMaintain={canMaintain} navigate={navigate} />
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <TableRowNumberHeader />
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('category_name')} onSort={() => handleSort('category_name')}>Category</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('source')} onSort={() => handleSort('source')}>Source</TableHeaderCell>
                <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('status')} onSort={() => handleSort('status')}>Status</TableHeaderCell>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">Sub-categories</th>
                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, index) => (
                <tr key={row.id} className="border-t border-gray-200 dark:border-gray-700">
                  <TableRowNumberCell number={getDisplayRowNumber(index)} />
                  <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100">{row.category_name}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{row.source}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{row.status}</td>
                  <td className="px-3 py-3 text-gray-700 dark:text-gray-200"><SubcategoryList row={row} basePath={basePath} canMaintain={canMaintain} navigate={navigate} /></td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <RowActions row={row} basePath={basePath} canAdd={canAdd} canMaintain={canMaintain} navigate={navigate} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SubcategoryList({ row, basePath, canMaintain, navigate }) {
  if (!row.children.length) return <span className="text-gray-500 dark:text-gray-400">None yet</span>
  return (
    <ul className="space-y-1">
      {row.children.map((child) => (
        <li key={child.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
          <span>
            {child.subcategory_name}
            {!child.is_active ? ' (inactive)' : ''}
            {child.organisation_id ? '' : ' · built-in'}
          </span>
          {canMaintain && child.organisation_id && (
            <RowActionButton
              variant="edit"
              label={`Edit ${child.subcategory_name}`}
              onClick={() => navigate(`${basePath}/${encodeURIComponent(row.category_code)}/subcategories/${encodeURIComponent(child.subcategory_code)}/edit`)}
            />
          )}
        </li>
      ))}
    </ul>
  )
}

function RowActions({ row, basePath, canAdd, canMaintain, navigate }) {
  const owned = Boolean(row.organisation_id)
  return (
    <div className="flex items-center gap-2">
      {canAdd && row.is_active && (
        <button
          type="button"
          className="text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
          onClick={() => navigate(`${basePath}/${encodeURIComponent(row.category_code)}/subcategories/create`)}
        >
          Add sub-category
        </button>
      )}
      {canMaintain && owned && (
        <RowActionButton
          variant="edit"
          label="Edit category"
          onClick={() => navigate(`${basePath}/${encodeURIComponent(row.category_code)}/edit`)}
        />
      )}
    </div>
  )
}
