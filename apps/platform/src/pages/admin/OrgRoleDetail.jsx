/**
 * Org Role Detail page (v910 — non-modal, replaces OrgRoleEditorModal per CLAUDE.md rule 65).
 * Create (v912): build a new custom role from scratch — name, description, level, governance
 * flag, and a picker of every menu item any built-in role has (no clone-from-a-role step —
 * built-in roles are unchangeable reference data, so forcing a clone read as editing them by
 * proxy). Edit (v914): the same full add+remove picker as Create, seeded from the role's
 * current grants — supersedes the v902 remove-only edit restriction (the underlying
 * `update_org_custom_role` RPC and its JS wrapper already supported add+remove all along; only
 * this page's UI was remove-only). Both modes can also "start from" a saved Menu Bundle (v914),
 * which pre-fills the picker's selection — the admin can still adjust it before saving.
 * Routes: admin/manage-roles/create · admin/manage-roles/:id · admin/manage-roles/:id/edit
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader, Shield } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import SearchableSelect from '@nidus/ui/SearchableSelect'
import MenuItemPicker from '../../components/MenuItemPicker'
import {
  toggleMenuItemSelection,
  expandSelectedMenuItemIds,
  representativeIdsForMenuItemIds,
} from '../../utils/menuItemSelectionUtils'
import {
  getManageRolesAccess,
  getGrantableMenuItems,
  getRoleMenuGrants,
  getRoleById,
  createOrgCustomRole,
  updateOrgCustomRole,
} from '../../services/organisationCustomRoleService'
import { getOrgMenuBundles, getMenuBundleById } from '../../services/organisationMenuBundleService'

const MANAGE_ROLES_PATH = '/platform/admin/manage-roles'

/** @param {{ forceEdit?: boolean }} props */
export default function OrgRoleDetail({ forceEdit = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isCreate = !id
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(!isCreate)
  const [canManage, setCanManage] = useState(false)
  const [role, setRole] = useState(null)
  const [notFound, setNotFound] = useState(false)

  // readOnly: create is never read-only; a built-in role (no account_id) is always read-only
  // regardless of URL, since it can't be modified — matches ManageRoles.jsx never offering an
  // Edit action for built-ins in the first place.
  const readOnly = !isCreate && (!forceEdit || !role?.account_id)
  const isEdit = !isCreate

  const [activeTab, setActiveTab] = useState('details')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [roleLevel, setRoleLevel] = useState(4)
  const [isGovernanceOnly, setIsGovernanceOnly] = useState(false)

  // Same picker (create AND edit, v914) — pick from the full grantable universe.
  const [grantableMenuItems, setGrantableMenuItems] = useState([])
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState(new Set())
  // Superset of every id selectedMenuItemIds has ever held this session — only grows, never
  // shrinks — so the preview keeps showing a section/item once it's been checked even after
  // it's unchecked again, letting the admin revisit it instead of it vanishing (v914 fix).
  const [touchedMenuItemIds, setTouchedMenuItemIds] = useState(new Set())
  // Edit mode only: the role's real menu_item.id grants as loaded, before any edits — used to
  // diff against the final selection on save (add/remove), and to leave alone any legacy grant
  // that isn't reachable through the current grantable pool (see loadRole below).
  const [originalGrantMenuItemIds, setOriginalGrantMenuItemIds] = useState(new Set())
  // "Start from a bundle" (v914) — a quick-fill shortcut into the picker above, available on
  // both Create and Edit. Union only: applying a bundle adds its items to whatever is already
  // selected, never replaces it.
  const [menuBundles, setMenuBundles] = useState([])
  const [bundleToApply, setBundleToApply] = useState('')
  const [applyingBundle, setApplyingBundle] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setTouchedMenuItemIds((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const id of selectedMenuItemIds) {
        if (!next.has(id)) {
          next.add(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [selectedMenuItemIds])

  const loadRole = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    setTouchedMenuItemIds(new Set())

    // access, grantable items, and (in edit/view mode) the role itself all start together —
    // none blocks the others from starting. Menu bundles need access.accountId, so that one
    // is chained off the access promise directly (as soon as it resolves) rather than tacked
    // on after the whole batch finishes — it overlaps with whatever's left of items/role
    // instead of adding its own trailing round trip.
    const accessPromise = getManageRolesAccess()
    const itemsPromise = getGrantableMenuItems()
    const roleFetchPromise = isCreate ? Promise.resolve(null) : getRoleById(id)
    const bundlesPromise = accessPromise.then((access) =>
      access.accountId ? getOrgMenuBundles(access.accountId) : { success: false, data: [], error: null },
    )

    const [access, itemsRes, roleRes, bundlesRes] = await Promise.all([
      accessPromise,
      itemsPromise,
      roleFetchPromise,
      bundlesPromise,
    ])

    if (!access.success || !access.accountId) {
      setError(access.error || 'Could not resolve your organisation')
      setLoading(false)
      return
    }
    setCanManage(access.canManage)

    const items = itemsRes.success ? itemsRes.data : []
    setGrantableMenuItems(items)
    if (bundlesRes.success) setMenuBundles(bundlesRes.data)

    if (isCreate) {
      setLoading(false)
      return
    }

    if (!roleRes.success || !roleRes.data) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setRole(roleRes.data)
    setDisplayName(roleRes.data.role_display_name || '')
    setDescription(roleRes.data.role_description || '')
    setIsGovernanceOnly(!!roleRes.data.is_governance_only)

    const grantsRes = await getRoleMenuGrants(roleRes.data.role_name, roleRes.data.account_id ?? null)
    if (grantsRes.success) {
      const currentGrantIds = grantsRes.data.map((g) => g.menu_item_id)
      setOriginalGrantMenuItemIds(new Set(currentGrantIds))
      setSelectedMenuItemIds(representativeIdsForMenuItemIds(currentGrantIds, items))
    }
    setLoading(false)
  }, [id, isCreate])

  useEffect(() => {
    loadRole()
  }, [loadRole])

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        displayName: role?.role_display_name || '',
        description: role?.role_description || '',
        isGovernanceOnly: !!role?.is_governance_only,
        menuItemIds: [...originalGrantMenuItemIds].sort(),
      }),
    [role, originalGrantMenuItemIds],
  )
  const isDirty = useMemo(() => {
    if (loading || readOnly) return false
    const currentMenuItemIds = expandSelectedMenuItemIds(selectedMenuItemIds, grantableMenuItems).sort()
    return (
      JSON.stringify({ displayName, description, isGovernanceOnly, menuItemIds: currentMenuItemIds }) !==
      baselineSnapshot
    )
  }, [loading, readOnly, displayName, description, isGovernanceOnly, selectedMenuItemIds, grantableMenuItems, baselineSnapshot])
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved role changes.')

  const goToList = () => navigate(MANAGE_ROLES_PATH)
  const handleBack = () => confirmDiscard(goToList)

  const toggleSelectedMenuItem = (menuItemId) => {
    setSelectedMenuItemIds((prev) => toggleMenuItemSelection(prev, menuItemId, grantableMenuItems))
  }

  const applyBundle = async (bundleId) => {
    if (!bundleId) return
    setApplyingBundle(true)
    const res = await getMenuBundleById(bundleId)
    setApplyingBundle(false)
    setBundleToApply('')
    if (!res.success || !res.data) {
      setError(res.error || 'Failed to load menu bundle')
      return
    }
    const bundleRepIds = representativeIdsForMenuItemIds(res.data.menuItemIds, grantableMenuItems)
    setSelectedMenuItemIds((prev) => new Set([...prev, ...bundleRepIds]))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!displayName.trim()) {
      setError('Role name is required')
      return
    }

    setSaving(true)
    setError(null)

    // Each selected row can represent several underlying menu_items.id (deduped display of the
    // same functional item across legacy menu revamps) — grant/remove all of them, not just one.
    const finalMenuItemIds = new Set(expandSelectedMenuItemIds(selectedMenuItemIds, grantableMenuItems))

    if (isEdit) {
      // Only diff against grants that are reachable through the current picker pool — a legacy
      // grant the picker can't represent (e.g. no built-in role carries it any more) is left
      // untouched rather than silently dropped as "removed".
      const reachableIds = new Set(grantableMenuItems.flatMap((mi) => mi.ids))
      const reachableOriginalIds = [...originalGrantMenuItemIds].filter((mid) => reachableIds.has(mid))
      const addMenuItemIds = [...finalMenuItemIds].filter((mid) => !originalGrantMenuItemIds.has(mid))
      const removeMenuItemIds = reachableOriginalIds.filter((mid) => !finalMenuItemIds.has(mid))

      const result = await updateOrgCustomRole({
        projectRoleId: role.id,
        displayName: displayName.trim(),
        description: description.trim() || null,
        isGovernanceOnly,
        addMenuItemIds,
        removeMenuItemIds,
      })
      setSaving(false)
      if (!result.success) {
        setError(result.error)
        return
      }
      showSuccess({
        recordId: role.role_name,
        operation: 'updated',
        message: `"${displayName.trim()}" was updated successfully.`,
        onOk: goToList,
      })
      return
    }

    const menuItemIds = [...finalMenuItemIds]

    const result = await createOrgCustomRole({
      displayName: displayName.trim(),
      description: description.trim() || null,
      roleLevel: Number(roleLevel) || 4,
      isGovernanceOnly,
      menuItemIds,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    showSuccess({
      recordId: displayName.trim(),
      operation: 'created',
      message: `"${displayName.trim()}" was created successfully.`,
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

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Role not found.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          Back to Manage Roles
        </button>
      </div>
    )
  }

  // A viewer without manage access (or viewing a built-in) landing on /edit directly gets bounced
  // to the read-only view — matches ManageRoles.jsx never offering an Edit action in that case.
  if (forceEdit && !isCreate && (!canManage || !role?.account_id)) {
    navigate(`${MANAGE_ROLES_PATH}/${id}`, { replace: true })
    return null
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isCreate ? 'Create Role' : readOnly ? 'View Role' : 'Edit Role'}
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <fieldset disabled={readOnly} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            )}

            <div className={isCreate ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role name *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="e.g. Regional Delivery Lead"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              {isCreate && (
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
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Decides which of your team can assign this role — team_member (4) through project_board_member (12) are the built-in reference points.
                  </p>
                </div>
              )}
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

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isGovernanceOnly}
                onChange={(e) => setIsGovernanceOnly(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Oversight-only (read-only Governance Dashboard, like Board Member / Sponsor / Portfolio Manager)
            </label>

            {menuBundles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start from a bundle (optional)
                </label>
                <div className="w-full sm:w-80">
                  <SearchableSelect
                    options={menuBundles.map((b) => ({ value: b.id, label: b.bundle_name }))}
                    value={bundleToApply}
                    onChange={applyBundle}
                    placeholder="Choose a menu bundle…"
                    searchPlaceholder="Search bundles..."
                    disabled={applyingBundle}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Checks every item in the bundle below — you can still add or remove items after.
                </p>
              </div>
            )}

            <MenuItemPicker
              grantableMenuItems={grantableMenuItems}
              selectedMenuItemIds={selectedMenuItemIds}
              touchedMenuItemIds={touchedMenuItemIds}
              onToggle={toggleSelectedMenuItem}
              helperText={
                isCreate
                  ? 'Check every sidebar item this role should have. You can add or remove more later by editing the role.'
                  : 'Check or uncheck items to add or remove this role\'s sidebar access.'
              }
            />

          </fieldset>

            {/* Outside the fieldset deliberately — a disabled fieldset natively disables every
                descendant control, including these, which would leave "Close" inert on View. */}
            <div className="flex gap-3 pt-2">
              {!readOnly && (
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEdit ? 'Save Changes' : 'Create Role'}
                </button>
              )}
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {readOnly ? 'Close' : 'Cancel'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {!isEdit ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Audit details appear after this role is saved.
              </p>
            ) : (
              <AuditDetailsPanel description="Who created this role, and how it is classified.">
                <AuditCard title="Identity" description="How this role is labelled and tracked.">
                  <AuditField label="Role name (internal)" value={role.role_name} />
                  <AuditField label="Display name" value={displayName || role.role_display_name} />
                  <AuditField label="Status" value={role.is_active === false ? 'Inactive' : 'Active'} />
                </AuditCard>
                <AuditCard title="Classification" description="How this role behaves in the system.">
                  <AuditField label="Level" value={role.role_level} />
                  <AuditField label="Dashboard" value={isGovernanceOnly ? 'Governance (read-only)' : 'Operational'} />
                  <AuditField label="Industry" value={role.industry_category?.name || '—'} />
                  <AuditField label="Scope" value="Organisation-wide (all projects)" />
                </AuditCard>
                <AuditCard title="Record history" description="When this role was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={role.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={role.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        )}
      </div>
      {successModal}
    </div>
  )
}
