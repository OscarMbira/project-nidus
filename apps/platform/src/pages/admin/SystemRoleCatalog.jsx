/**
 * System Role Catalog (v910) — system_admin/super_admin-only editing of the shared built-in
 * role catalog. Separate from ManageRoles.jsx (org-scoped, "cannot be modified" for built-ins)
 * so a regular PMO Admin's experience is completely unchanged by this page's existence.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, LayoutGrid, List, Search, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { RowActionButton } from '@nidus/ui'
import RowNumberBadge from '../../components/ui/RowNumberBadge'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
import {
  isSystemAdmin,
  getCloneSourceRoles,
  getIndustryCategories,
  getManageRolesAccess,
} from '../../services/organisationCustomRoleService'

const SYSTEM_ROLES_PATH = '/platform/admin/system-roles'

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

function sortRoles(roles, sort) {
  if (!sort.key) return roles
  const sorted = [...roles].sort((a, b) => {
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

export default function SystemRoleCatalog() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useViewMode('system-role-catalog', 'list')

  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [roles, setRoles] = useState([])
  const [industryCategories, setIndustryCategories] = useState([])
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })

  const loadAll = useCallback(async () => {
    setLoading(true)
    const isAdmin = await isSystemAdmin()
    setAllowed(isAdmin)
    if (!isAdmin) {
      setLoading(false)
      return
    }

    // getCloneSourceRoles just needs a non-null accountId to build the built-in + org-custom
    // union; any resolvable account works here since we filter to account_id-null rows below.
    const access = await getManageRolesAccess()
    const [rolesRes, industryRes] = await Promise.all([
      getCloneSourceRoles(access.accountId),
      getIndustryCategories(),
    ])
    if (rolesRes.success) setRoles(rolesRes.data.filter((r) => !r.account_id))
    if (industryRes.success) setIndustryCategories(industryRes.data)
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

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase()
    let filtered = roles
    if (industry) filtered = filtered.filter((r) => r.industry_category_id === industry)
    if (q) {
      filtered = filtered.filter(
        (r) =>
          r.role_display_name?.toLowerCase().includes(q) ||
          r.role_description?.toLowerCase().includes(q) ||
          r.industry_category?.name?.toLowerCase().includes(q),
      )
    }
    if (sort.key) return sortRoles(filtered, sort)
    return [...filtered].sort((a, b) =>
      String(a.role_display_name || '').localeCompare(String(b.role_display_name || ''), undefined, { sensitivity: 'base' }),
    )
  }, [roles, search, industry, sort])

  const openEdit = (role) => navigate(`${SYSTEM_ROLES_PATH}/${role.role_name}/edit`)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">
        Loading system role catalog…
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <ShieldAlert className="h-6 w-6" />
          <h1 className="text-xl font-bold">Access denied</h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          System Role Catalog is restricted to platform system administrators.
        </p>
        <button onClick={() => navigate('/platform/dashboard')} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/platform/dashboard')}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <ShieldAlert className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Role Catalog</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Edit the shared built-in role catalog — changes apply to every organisation on the platform
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Built-in Roles ({filteredRoles.length})</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Shared by every organisation</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            >
              <option value="">All industries</option>
              {industryCategories.map((ic) => (
                <option key={ic.id} value={ic.id}>{ic.name}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles..."
                className="pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
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

        {filteredRoles.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No roles match your search.
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                  <SortHeader label="Role Name" sortKey="role_display_name" sort={sort} onSort={handleSort} />
                  <SortHeader label="Level" sortKey="role_level" sort={sort} onSort={handleSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dashboard</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Industry</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRoles.map((role, index) => (
                  <tr key={role.id}>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 tabular-nums">{getDisplayRowNumber(index)}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{role.role_display_name}</div>
                      {role.role_description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{role.role_description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{role.role_level}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {role.is_governance_only ? 'Governance' : 'Operational'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {role.industry_category?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <RowActionButton variant="edit" label="Edit role" onClick={() => openEdit(role)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoles.map((role, index) => (
              <div key={role.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <RowNumberBadge number={getDisplayRowNumber(index)} />
                  {role.industry_category?.name && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {role.industry_category.name}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{role.role_display_name}</div>
                  {role.role_description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.role_description}</div>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Level {role.role_level} · {role.is_governance_only ? 'Governance' : 'Operational'}
                </div>
                <div className="flex items-center gap-1 pt-1">
                  <RowActionButton variant="edit" label="Edit role" onClick={() => openEdit(role)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
