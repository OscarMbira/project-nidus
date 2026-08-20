/**
 * Manage Roles (v902) — organisation-wide custom roles.
 * PMO Admin / Portfolio Manager / Programme Manager / Project Manager / Team Manager can
 * create new roles for their organisation by cloning an existing role's permissions and
 * sidebar menu grants. Built-in roles are shown read-only alongside the org's own custom ones.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Plus, LayoutGrid, List, Search, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton } from '@nidus/ui'
import RowNumberBadge from '../../components/ui/RowNumberBadge'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
import {
  getManageRolesAccess,
  getCloneSourceRoles,
  getOrgCustomRoles,
  getIndustryCategories,
  deactivateOrgCustomRole,
  deleteOrgCustomRole,
} from '../../services/organisationCustomRoleService'

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

export default function ManageRoles() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useViewMode('manage-roles', 'list')
  const [builtInViewMode, setBuiltInViewMode] = useViewMode('manage-roles-builtin', 'list')
  const [activeSection, setActiveSection] = useState('builtin')
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [builtInRoles, setBuiltInRoles] = useState([])
  const [customRoles, setCustomRoles] = useState([])
  const [industryCategories, setIndustryCategories] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [builtInSearch, setBuiltInSearch] = useState('')
  const [builtInIndustry, setBuiltInIndustry] = useState('')
  const [builtInSort, setBuiltInSort] = useState({ key: null, dir: 'asc' })
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

    const [cloneRes, customRes, industryRes] = await Promise.all([
      getCloneSourceRoles(access.accountId),
      getOrgCustomRoles(access.accountId),
      getIndustryCategories(),
    ])
    if (cloneRes.success) setBuiltInRoles(cloneRes.data.filter((r) => !r.account_id))
    if (customRes.success) setCustomRoles(customRes.data)
    if (industryRes.success) setIndustryCategories(industryRes.data)
    if (!cloneRes.success) setError(cloneRes.error)
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

  const handleBuiltInSort = (key) => {
    setBuiltInSort((prev) => {
      if (prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return { key: null, dir: 'asc' }
    })
  }

  // Default: alphabetical by display name, then created_at (rule 40.1)
  const filteredCustomRoles = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? customRoles.filter(
          (r) =>
            r.role_display_name?.toLowerCase().includes(q) ||
            r.role_description?.toLowerCase().includes(q),
        )
      : customRoles
    if (sort.key) return sortRoles(filtered, sort)
    return [...filtered].sort((a, b) => {
      const cmp = String(a.role_display_name || '').localeCompare(String(b.role_display_name || ''), undefined, { sensitivity: 'base' })
      if (cmp !== 0) return cmp
      return String(a.created_at || '').localeCompare(String(b.created_at || ''))
    })
  }, [customRoles, search, sort])

  // Default: alphabetical by display name (rule 40.1) — built-ins have no created_at tie-breaker need
  const filteredBuiltInRoles = useMemo(() => {
    const q = builtInSearch.trim().toLowerCase()
    let filtered = builtInRoles
    if (builtInIndustry) {
      filtered = filtered.filter((r) => r.industry_category_id === builtInIndustry)
    }
    if (q) {
      filtered = filtered.filter(
        (r) =>
          r.role_display_name?.toLowerCase().includes(q) ||
          r.role_description?.toLowerCase().includes(q) ||
          r.industry_category?.name?.toLowerCase().includes(q),
      )
    }
    if (builtInSort.key) return sortRoles(filtered, builtInSort)
    return [...filtered].sort((a, b) =>
      String(a.role_display_name || '').localeCompare(String(b.role_display_name || ''), undefined, { sensitivity: 'base' }),
    )
  }, [builtInRoles, builtInSearch, builtInIndustry, builtInSort])

  const openCreate = () => navigate('/simulator/pmo/manage-roles/create')
  const openEdit = (role) => navigate(`/simulator/pmo/manage-roles/${role.role_name}/edit`)
  const openView = (role) => navigate(`/simulator/pmo/manage-roles/${role.role_name}`)

  const handleDeactivate = async (role) => {
    if (!window.confirm(`Deactivate "${role.role_display_name}"? It will no longer be assignable, but current holders keep it.`)) return
    const result = await deactivateOrgCustomRole(role.id)
    if (!result.success) {
      setError(result.error)
      return
    }
    showSuccess({ recordId: role.role_display_name, operation: 'updated', message: `"${role.role_display_name}" was deactivated.` })
    loadAll()
  }

  const handleDelete = async (role) => {
    if (!window.confirm(`Delete "${role.role_display_name}"? This cannot be undone.`)) return
    const result = await deleteOrgCustomRole(role.id)
    if (!result.success) {
      // Blocked-while-in-use message from the RPC — offer deactivate as the alternative inline.
      setError(`${result.error} `)
      return
    }
    showSuccess({ recordId: role.role_display_name, operation: 'deleted', message: `"${role.role_display_name}" was deleted.` })
    loadAll()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">
        Loading roles…
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/simulator/pmo/dashboard')}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Roles</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create organisation-wide roles by cloning an existing role's permissions and menu access
            </p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Create Role
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
          You can view roles, but only PMO Admin, Portfolio Manager, Programme Manager, Project Manager, or Team Manager can create, edit, or remove them.
        </div>
      )}

      <div
        className="flex flex-wrap items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1 self-start"
        role="tablist"
        aria-label="Role sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'builtin'}
          onClick={() => setActiveSection('builtin')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeSection === 'builtin'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Built-in Roles ({filteredBuiltInRoles.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'custom'}
          onClick={() => setActiveSection('custom')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeSection === 'custom'
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Custom Roles ({filteredCustomRoles.length})
        </button>
      </div>

      {/* Built-in roles — read-only */}
      {activeSection === 'builtin' && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Built-in Roles ({filteredBuiltInRoles.length})</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Shared by every organisation — cannot be modified</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={builtInIndustry}
              onChange={(e) => setBuiltInIndustry(e.target.value)}
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
                value={builtInSearch}
                onChange={(e) => setBuiltInSearch(e.target.value)}
                placeholder="Search roles..."
                className="pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={() => setBuiltInViewMode('list')}
              className={`p-2 rounded-lg ${builtInViewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setBuiltInViewMode('grid')}
              className={`p-2 rounded-lg ${builtInViewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {filteredBuiltInRoles.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No built-in roles match your search.
          </div>
        ) : builtInViewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                  <SortHeader label="Role Name" sortKey="role_display_name" sort={builtInSort} onSort={handleBuiltInSort} />
                  <SortHeader label="Level" sortKey="role_level" sort={builtInSort} onSort={handleBuiltInSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dashboard</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Industry</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBuiltInRoles.map((role, index) => (
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
                        <RowActionButton variant="view" label="View role" onClick={() => openView(role)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBuiltInRoles.map((role, index) => (
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
                  <RowActionButton variant="view" label="View role" onClick={() => openView(role)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Custom roles */}
      {activeSection === 'custom' && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Custom Roles ({filteredCustomRoles.length})</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Created by your organisation, usable across all your projects</p>
          </div>
          <div className="flex items-center gap-2">
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

        {filteredCustomRoles.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {customRoles.length === 0 ? (
              <>
                No custom roles yet.{' '}
                {canManage && (
                  <button onClick={openCreate} className="text-blue-600 dark:text-blue-400 hover:underline">
                    Create your first custom role
                  </button>
                )}
              </>
            ) : (
              'No roles match your search.'
            )}
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
                  <SortHeader label="Status" sortKey="is_active" sort={sort} onSort={handleSort} />
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCustomRoles.map((role, index) => (
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
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          role.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {role.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <RowActionButton variant="view" label="View role" onClick={() => openView(role)} />
                        {canManage && (
                          <>
                            <RowActionButton variant="edit" label="Edit role" onClick={() => openEdit(role)} />
                            <RowActionButton variant="delete" label="Delete role" onClick={() => handleDelete(role)} />
                          </>
                        )}
                      </div>
                      {canManage && role.is_active && (
                        <button
                          onClick={() => handleDeactivate(role)}
                          className="mt-1 text-xs text-gray-500 dark:text-gray-400 hover:underline"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomRoles.map((role, index) => (
              <div key={role.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <RowNumberBadge number={getDisplayRowNumber(index)} />
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      role.is_active
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {role.is_active ? 'Active' : 'Inactive'}
                  </span>
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
                  <RowActionButton variant="view" label="View role" onClick={() => openView(role)} />
                  {canManage && (
                    <>
                      <RowActionButton variant="edit" label="Edit role" onClick={() => openEdit(role)} />
                      <RowActionButton variant="delete" label="Delete role" onClick={() => handleDelete(role)} />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {successModal}
    </div>
  )
}
