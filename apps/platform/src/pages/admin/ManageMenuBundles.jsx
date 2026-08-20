/**
 * Manage Menu Bundles (v914) — organisation-scoped, reusable sets of existing sidebar menu
 * items. The same admin population as Manage Roles can save a bundle once, then "start from"
 * it when creating or editing a custom role instead of hand-picking the same items every time.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutList, Plus, LayoutGrid, List, Search, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton } from '@nidus/ui'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import RowNumberBadge from '../../components/ui/RowNumberBadge'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
import { getManageRolesAccess } from '../../services/organisationCustomRoleService'
import { getOrgMenuBundles, deleteOrgMenuBundle } from '../../services/organisationMenuBundleService'

const MANAGE_MENU_BUNDLES_PATH = '/platform/admin/manage-menu-bundles'

const EXPORT_COLS = [
  { key: 'bundle_name', label: 'Bundle Name' },
  { key: 'description', label: 'Description' },
  { key: 'itemCount', label: 'Item Count' },
]

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className="h-3.5 w-3.5" />
      </span>
    </th>
  )
}

function sortBundles(bundles, sort) {
  if (!sort.key) return bundles
  const sorted = [...bundles].sort((a, b) => {
    const av = a[sort.key]
    const bv = b[sort.key]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return av - bv
    return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
  })
  return sort.dir === 'desc' ? sorted.reverse() : sorted
}

export default function ManageMenuBundles() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useViewMode('manage-menu-bundles', 'list')
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [bundles, setBundles] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [error, setError] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const access = await getManageRolesAccess()
    if (!access.success || !access.accountId) {
      setError(access.error || 'Could not resolve your organisation')
      setLoading(false)
      return
    }
    setCanManage(access.canManage)

    const bundlesRes = await getOrgMenuBundles(access.accountId)
    if (bundlesRes.success) setBundles(bundlesRes.data)
    else setError(bundlesRes.error)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleSort = (key) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return { key: null, dir: 'asc' }
    })
  }

  // Default: alphabetical by name, then created_at (rule 40.1)
  const filteredBundles = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? bundles.filter(
          (b) =>
            b.bundle_name?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q),
        )
      : bundles
    if (sort.key) return sortBundles(filtered, sort)
    return [...filtered].sort((a, b) => {
      const cmp = String(a.bundle_name || '').localeCompare(String(b.bundle_name || ''), undefined, { sensitivity: 'base' })
      if (cmp !== 0) return cmp
      return String(a.created_at || '').localeCompare(String(b.created_at || ''))
    })
  }, [bundles, search, sort])

  const exportData = useMemo(
    () =>
      filteredBundles.map((b) => ({
        bundle_name: b.bundle_name,
        description: b.description || '',
        itemCount: b.itemCount ?? '',
      })),
    [filteredBundles],
  )

  const openCreate = () => navigate(`${MANAGE_MENU_BUNDLES_PATH}/create`)
  const openEdit = (bundle) => navigate(`${MANAGE_MENU_BUNDLES_PATH}/${encodeURIComponent(bundle.bundle_name)}/edit`)
  const openView = (bundle) => navigate(`${MANAGE_MENU_BUNDLES_PATH}/${encodeURIComponent(bundle.bundle_name)}`)

  const handleDelete = async (bundle) => {
    if (!window.confirm(`Delete "${bundle.bundle_name}"? Roles already created from it keep their access — this cannot be undone.`)) return
    const result = await deleteOrgMenuBundle(bundle.id)
    if (!result.success) {
      setError(result.error)
      return
    }
    showSuccess({ recordId: bundle.bundle_name, operation: 'deleted', message: `"${bundle.bundle_name}" was deleted.` })
    loadAll()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">
        Loading menu bundles…
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/platform/dashboard')}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <LayoutList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Menu Bundles</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Save a reusable set of sidebar menu items to quickly start a new role from
            </p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Create Bundle
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {!canManage && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
          You can view menu bundles, but only PMO Admin, Portfolio Manager, Programme Manager, Project Manager, or Team Manager can create, edit, or remove them.
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Menu Bundles ({filteredBundles.length})</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Created by your organisation</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bundles..."
                className="pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            <ExportListMenu columns={EXPORT_COLS} data={exportData} baseFilename="MenuBundles" />
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {filteredBundles.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {bundles.length === 0 ? (
              <>
                No menu bundles yet.{' '}
                {canManage && (
                  <button onClick={openCreate} className="text-blue-600 dark:text-blue-400 hover:underline">
                    Create your first menu bundle
                  </button>
                )}
              </>
            ) : (
              'No bundles match your search.'
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                  <SortHeader label="Bundle Name" sortKey="bundle_name" sort={sort} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBundles.map((bundle, index) => (
                  <tr key={bundle.id}>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 tabular-nums">{getDisplayRowNumber(index)}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{bundle.bundle_name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{bundle.description || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <RowActionButton variant="view" label="View bundle" onClick={() => openView(bundle)} />
                        {canManage && (
                          <>
                            <RowActionButton variant="edit" label="Edit bundle" onClick={() => openEdit(bundle)} />
                            <RowActionButton variant="delete" label="Delete bundle" onClick={() => handleDelete(bundle)} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBundles.map((bundle, index) => (
              <div key={bundle.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <RowNumberBadge number={getDisplayRowNumber(index)} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{bundle.bundle_name}</div>
                  {bundle.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{bundle.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <RowActionButton variant="view" label="View bundle" onClick={() => openView(bundle)} />
                  {canManage && (
                    <>
                      <RowActionButton variant="edit" label="Edit bundle" onClick={() => openEdit(bundle)} />
                      <RowActionButton variant="delete" label="Delete bundle" onClick={() => handleDelete(bundle)} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {successModal}
    </div>
  )
}
