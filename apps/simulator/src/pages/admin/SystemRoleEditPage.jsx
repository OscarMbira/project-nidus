/**
 * System Role Edit page (v910) — system_admin/super_admin-only edit of a built-in role.
 * Everything Custom Roles support except role_name (shown read-only; other code matches roles
 * by that internal slug) and clone-source (editing an existing built-in, not creating one).
 * Route: admin/system-roles/:id/edit
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader, ShieldAlert } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import {
  isSystemAdmin,
  getRoleById,
  getRoleMenuGrants,
  getIndustryCategories,
  updateBuiltinRole,
} from '../../services/organisationCustomRoleService'

const SYSTEM_ROLES_PATH = '/simulator/pmo/system-roles'

export default function SystemRoleEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [role, setRole] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [industryCategories, setIndustryCategories] = useState([])

  const [activeTab, setActiveTab] = useState('details')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [roleLevel, setRoleLevel] = useState(1)
  const [industryCategoryId, setIndustryCategoryId] = useState('')
  const [isGovernanceOnly, setIsGovernanceOnly] = useState(false)
  const [menuGrants, setMenuGrants] = useState([])
  const [excludedMenuItemIds, setExcludedMenuItemIds] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    const isAdmin = await isSystemAdmin()
    setAllowed(isAdmin)
    if (!isAdmin) {
      setLoading(false)
      return
    }

    const [roleRes, industryRes] = await Promise.all([getRoleById(id), getIndustryCategories()])
    if (industryRes.success) setIndustryCategories(industryRes.data)

    if (!roleRes.success || !roleRes.data || roleRes.data.account_id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setRole(roleRes.data)
    setDisplayName(roleRes.data.role_display_name || '')
    setDescription(roleRes.data.role_description || '')
    setRoleLevel(roleRes.data.role_level ?? 1)
    setIndustryCategoryId(roleRes.data.industry_category_id || '')
    setIsGovernanceOnly(!!roleRes.data.is_governance_only)

    const grantsRes = await getRoleMenuGrants(roleRes.data.role_name, null)
    if (grantsRes.success) setMenuGrants(grantsRes.data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        displayName: role?.role_display_name || '',
        description: role?.role_description || '',
        roleLevel: role?.role_level ?? 1,
        industryCategoryId: role?.industry_category_id || '',
        isGovernanceOnly: !!role?.is_governance_only,
      }),
    [role],
  )
  const isDirty = useMemo(
    () =>
      !loading &&
      JSON.stringify({ displayName, description, roleLevel, industryCategoryId, isGovernanceOnly }) !== baselineSnapshot,
    [loading, displayName, description, roleLevel, industryCategoryId, isGovernanceOnly, baselineSnapshot],
  )
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this built-in role.')

  const goToList = () => navigate(SYSTEM_ROLES_PATH)
  const handleBack = () => confirmDiscard(goToList)

  const toggleMenuItem = (menuItemId) => {
    setExcludedMenuItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(menuItemId)) next.delete(menuItemId)
      else next.add(menuItemId)
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Role name is required')
      return
    }

    setSaving(true)
    setError(null)

    const result = await updateBuiltinRole({
      projectRoleId: role.id,
      displayName: displayName.trim(),
      description: description.trim() || null,
      roleLevel: Number(roleLevel),
      industryCategoryId: industryCategoryId || null,
      isGovernanceOnly,
      removeMenuItemIds: Array.from(excludedMenuItemIds),
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    showSuccess({
      recordId: role.role_name,
      operation: 'updated',
      message: `"${displayName.trim()}" was updated successfully. This change applies to every organisation on the platform.`,
      onOk: goToList,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">
        Loading role…
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
        <button onClick={() => navigate('/simulator/pmo/dashboard')} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          Back to Dashboard
        </button>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Role not found, or is not a built-in role.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          Back to System Role Catalog
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <ShieldAlert className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Built-in Role</h1>
      </div>

      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
        This role is shared reference data. Saving changes here affects every organisation on the platform, not just yours.
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role name (internal)
              </label>
              <input
                type="text"
                value={role.role_name}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white opacity-60 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Never editable — other code matches this role by its internal name.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display name *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Level (seniority — higher = more senior)
                </label>
                <input
                  type="number"
                  value={roleLevel}
                  onChange={(e) => setRoleLevel(e.target.value)}
                  min={1}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Industry
                </label>
                <select
                  value={industryCategoryId}
                  onChange={(e) => setIndustryCategoryId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="">— None —</option>
                  {industryCategories.map((ic) => (
                    <option key={ic.id} value={ic.id}>{ic.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isGovernanceOnly}
                onChange={(e) => setIsGovernanceOnly(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Oversight-only (read-only Governance Dashboard, like Board Member / Sponsor)
            </label>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sidebar menu access</p>
              {menuGrants.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">This role has no menu access.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                  {menuGrants.map((g) => (
                    <label
                      key={g.menu_item_id}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <input
                        type="checkbox"
                        checked={!excludedMenuItemIds.has(g.menu_item_id)}
                        onChange={() => toggleMenuItem(g.menu_item_id)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      {g.menu_item?.menu_label || g.menu_item_id}
                    </label>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Uncheck any item to remove it from this role — affects every organisation using this role.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <AuditDetailsPanel description="Who created this role, and how it is classified.">
              <AuditCard title="Identity" description="How this role is labelled and tracked.">
                <AuditField label="Role name (internal)" value={role.role_name} />
                <AuditField label="Display name" value={displayName || role.role_display_name} />
                <AuditField label="Status" value={role.is_active === false ? 'Inactive' : 'Active'} />
              </AuditCard>
              <AuditCard title="Classification" description="How this role behaves in the system.">
                <AuditField label="Level" value={roleLevel} />
                <AuditField label="Dashboard" value={isGovernanceOnly ? 'Governance (read-only)' : 'Operational'} />
                <AuditField label="Scope" value="Shared — every organisation on the platform" />
              </AuditCard>
              <AuditCard title="Record history" description="When this role was created and last changed.">
                <AuditTimestampPair dateLabel="Created at" value={role.created_at} />
                <AuditTimestampPair dateLabel="Last updated" value={role.updated_at} />
              </AuditCard>
            </AuditDetailsPanel>
          </div>
        )}
      </div>
      {successModal}
    </div>
  )
}
