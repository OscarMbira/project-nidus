/**
 * Vendor category create/view/edit (v1208). Routed page, rule 65 + rule 63.1.
 * URL uses the category name (unique per organisation) or the record UUID.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader, Tags } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField, AuditTimestampPair } from '@nidus/ui'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getVendorCategory, saveVendorCategory } from '../services/procurementService'

export default function VendorCategoryForm({ basePath = '/platform/pm/procurement/vendor-categories', forceEdit = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isCreate = !id
  const readOnly = !isCreate && !forceEdit
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const [categoryName, setCategoryName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    if (isCreate) {
      setLoading(false)
      return
    }
    try {
      const accountId = await getCurrentUserAccountId()
      const row = await getVendorCategory(decodeURIComponent(id), accountId)
      if (!row) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setRecord(row)
      setCategoryName(row.category_name || '')
      setDescription(row.description || '')
      setIsActive(row.is_active !== false)
    } catch (err) {
      setError(err?.message || 'Could not load this category')
    } finally {
      setLoading(false)
    }
  }, [id, isCreate])

  useEffect(() => {
    load()
  }, [load])

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        categoryName: record?.category_name || '',
        description: record?.description || '',
        isActive: record?.is_active !== false,
      }),
    [record]
  )
  const isDirty = useMemo(() => {
    if (loading || readOnly || saved) return false
    return JSON.stringify({ categoryName, description, isActive }) !== baselineSnapshot
  }, [loading, readOnly, saved, categoryName, description, isActive, baselineSnapshot])
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved category changes.')

  const goToList = () => navigate(basePath)
  const handleBack = () => confirmDiscard(goToList)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!categoryName.trim()) {
      setError('Category name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const accountId = await getCurrentUserAccountId()
      await saveVendorCategory({
        id: record?.id,
        accountId,
        categoryName,
        description,
        isActive,
      })
      setSaved(true)
      setSaving(false)
      showSuccess({
        recordId: categoryName.trim(),
        operation: isCreate ? 'created' : 'updated',
        message: `"${categoryName.trim()}" was ${isCreate ? 'created' : 'updated'} successfully.`,
        onOk: goToList,
      })
    } catch (err) {
      setSaving(false)
      setError(err?.message || String(err))
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading category…</div>
  }
  if (notFound) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="text-sm text-gray-700 dark:text-gray-200">Category not found.</p>
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <button
        onClick={handleBack}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Tags className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isCreate ? 'Create Category' : readOnly ? 'View Category' : 'Edit Category'}
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
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category name *</label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                    maxLength={80}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
                  Active
                </label>
              </fieldset>

              <div className="flex gap-3 pt-2">
                {!readOnly && (
                  <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isCreate ? 'Create Category' : 'Save Changes'}
                  </button>
                )}
                <button type="button" onClick={handleBack} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {readOnly ? 'Close' : 'Cancel'}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6">
              {isCreate ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this category is saved.</p>
              ) : (
                <AuditDetailsPanel description="How this category is labelled and classified.">
                  <AuditCard title="Identity" description="How this category is labelled.">
                    <AuditField label="Category name" value={categoryName || '—'} />
                    <AuditField label="Description" value={description || '—'} />
                  </AuditCard>
                  <AuditCard title="Classification" description="Whether this category can be chosen on a vendor.">
                    <AuditField label="Status" value={isActive ? 'Active' : 'Inactive'} />
                  </AuditCard>
                  <AuditCard title="Record history" description="When this category was created and last changed.">
                    <AuditTimestampPair dateLabel="Created at" value={record?.created_at} />
                    <AuditTimestampPair dateLabel="Last updated" value={record?.updated_at} />
                  </AuditCard>
                </AuditDetailsPanel>
              )}
            </div>
          )}
        </div>
      </div>
      {successModal}
    </div>
  )
}
