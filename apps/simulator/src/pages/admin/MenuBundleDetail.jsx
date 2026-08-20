/**
 * Menu Bundle Detail page (v914 — non-modal per CLAUDE.md rule 65).
 * Create: name, optional description, and the same menu-item picker/preview
 * (`MenuItemPicker`) Create/Edit Role uses — a bundle is just a saved selection. View/Edit:
 * adjust name, description, and item selection (full add+remove, no legacy restriction).
 * Routes: admin/manage-menu-bundles/create · admin/manage-menu-bundles/:id ·
 * admin/manage-menu-bundles/:id/edit
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader, LayoutList } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import MenuItemPicker from '../../components/MenuItemPicker'
import {
  toggleMenuItemSelection,
  expandSelectedMenuItemIds,
  representativeIdsForMenuItemIds,
} from '../../utils/menuItemSelectionUtils'
import { getManageRolesAccess, getGrantableMenuItems } from '../../services/organisationCustomRoleService'
import {
  getMenuBundleById,
  createOrgMenuBundle,
  updateOrgMenuBundle,
} from '../../services/organisationMenuBundleService'

const MANAGE_MENU_BUNDLES_PATH = '/simulator/pmo/manage-menu-bundles'

/** @param {{ forceEdit?: boolean }} props */
export default function MenuBundleDetail({ forceEdit = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isCreate = !id
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(!isCreate)
  const [canManage, setCanManage] = useState(false)
  const [bundle, setBundle] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const readOnly = !isCreate && !forceEdit
  const isEdit = !isCreate

  const [activeTab, setActiveTab] = useState('details')
  const [bundleName, setBundleName] = useState('')
  const [description, setDescription] = useState('')

  const [grantableMenuItems, setGrantableMenuItems] = useState([])
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState(new Set())
  // Superset of every id selectedMenuItemIds has ever held this session — only grows, never
  // shrinks — so the preview keeps showing a section/item once it's been checked even after
  // it's unchecked again, letting the admin revisit it instead of it vanishing (v914 fix).
  const [touchedMenuItemIds, setTouchedMenuItemIds] = useState(new Set())
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

  const loadBundle = useCallback(async () => {
    setLoading(true)
    setNotFound(false)
    setTouchedMenuItemIds(new Set())

    // access, grantable items, and (in edit/view mode) the bundle itself all start together —
    // none blocks the others from starting. The bundle lookup (when :id is a friendly name, not
    // a UUID) needs an account id to scope its search; rather than let it resolve that itself
    // (redundant with — and running concurrently alongside, not after — the resolution already
    // happening inside getManageRolesAccess()), it's chained off that same in-flight promise so
    // it reuses the result once ready, while getGrantableMenuItems() keeps running in parallel.
    const accessPromise = getManageRolesAccess()
    const itemsPromise = getGrantableMenuItems()
    const bundlePromise = isCreate
      ? Promise.resolve(null)
      : accessPromise.then((access) => getMenuBundleById(decodeURIComponent(id), access.accountId))

    const [access, itemsRes, bundleRes] = await Promise.all([accessPromise, itemsPromise, bundlePromise])

    if (!access.success || !access.accountId) {
      setError(access.error || 'Could not resolve your organisation')
      setLoading(false)
      return
    }
    setCanManage(access.canManage)

    const items = itemsRes.success ? itemsRes.data : []
    setGrantableMenuItems(items)

    if (isCreate) {
      setLoading(false)
      return
    }

    if (!bundleRes.success || !bundleRes.data) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setBundle(bundleRes.data)
    setBundleName(bundleRes.data.bundle_name || '')
    setDescription(bundleRes.data.description || '')
    setSelectedMenuItemIds(representativeIdsForMenuItemIds(bundleRes.data.menuItemIds, items))
    setLoading(false)
  }, [id, isCreate])

  useEffect(() => {
    loadBundle()
  }, [loadBundle])

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        bundleName: bundle?.bundle_name || '',
        description: bundle?.description || '',
        menuItemIds: [...(bundle?.menuItemIds || [])].sort(),
      }),
    [bundle],
  )
  const isDirty = useMemo(() => {
    if (loading || readOnly) return false
    const currentMenuItemIds = expandSelectedMenuItemIds(selectedMenuItemIds, grantableMenuItems).sort()
    return (
      JSON.stringify({ bundleName, description, menuItemIds: currentMenuItemIds }) !== baselineSnapshot
    )
  }, [loading, readOnly, bundleName, description, selectedMenuItemIds, grantableMenuItems, baselineSnapshot])
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved menu bundle changes.')

  const goToList = () => navigate(MANAGE_MENU_BUNDLES_PATH)
  const handleBack = () => confirmDiscard(goToList)

  const toggleSelectedMenuItem = (menuItemId) => {
    setSelectedMenuItemIds((prev) => toggleMenuItemSelection(prev, menuItemId, grantableMenuItems))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!bundleName.trim()) {
      setError('Bundle name is required')
      return
    }

    setSaving(true)
    setError(null)

    const menuItemIds = expandSelectedMenuItemIds(selectedMenuItemIds, grantableMenuItems)

    if (isEdit) {
      const result = await updateOrgMenuBundle({
        bundleId: bundle.id,
        bundleName: bundleName.trim(),
        description: description.trim() || null,
        menuItemIds,
      })
      setSaving(false)
      if (!result.success) {
        setError(result.error)
        return
      }
      showSuccess({
        recordId: bundleName.trim(),
        operation: 'updated',
        message: `"${bundleName.trim()}" was updated successfully.`,
        onOk: goToList,
      })
      return
    }

    const result = await createOrgMenuBundle({
      bundleName: bundleName.trim(),
      description: description.trim() || null,
      menuItemIds,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    showSuccess({
      recordId: bundleName.trim(),
      operation: 'created',
      message: `"${bundleName.trim()}" was created successfully.`,
      onOk: goToList,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">
        Loading menu bundle…
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Menu bundle not found.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
          Back to Manage Menu Bundles
        </button>
      </div>
    )
  }

  if (forceEdit && !isCreate && !canManage) {
    navigate(`${MANAGE_MENU_BUNDLES_PATH}/${id}`, { replace: true })
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
        <LayoutList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isCreate ? 'Create Menu Bundle' : readOnly ? 'View Menu Bundle' : 'Edit Menu Bundle'}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bundle name *
                </label>
                <input
                  type="text"
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  required
                  placeholder="e.g. Field Team Access"
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

              <MenuItemPicker
                grantableMenuItems={grantableMenuItems}
                selectedMenuItemIds={selectedMenuItemIds}
                touchedMenuItemIds={touchedMenuItemIds}
                onToggle={toggleSelectedMenuItem}
                pickerLabel="Bundle items"
                helperText="Check every sidebar item this bundle should include. Attaching it to a role will check all of these for you."
                previewLabel="Bundle preview"
                previewSubtitle="What this bundle will include"
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
                  {isEdit ? 'Save Changes' : 'Create Bundle'}
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
            {!isEdit && !bundle ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Audit details appear after this bundle is saved.
              </p>
            ) : (
              <AuditDetailsPanel description="Who created this bundle, and how it is classified.">
                <AuditCard title="Identity" description="How this bundle is labelled.">
                  <AuditField label="Bundle name" value={bundleName || bundle.bundle_name} />
                  <AuditField label="Status" value={bundle.is_active === false ? 'Inactive' : 'Active'} />
                </AuditCard>
                <AuditCard title="Classification" description="What this bundle contains.">
                  <AuditField label="Item count" value={selectedMenuItemIds.size} />
                  <AuditField label="Scope" value="Organisation-wide" />
                </AuditCard>
                <AuditCard title="Record history" description="When this bundle was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={bundle.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={bundle.updated_at} />
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
