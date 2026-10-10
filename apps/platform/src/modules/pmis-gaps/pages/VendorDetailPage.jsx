/**
 * Vendor register item — create/view/edit (Procurement, GAP-12), rule 65 + rule 63.1 Audit tab.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader, Truck } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField, AuditTimestampPair } from '@nidus/ui'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import SelectField from '../../../components/ui/SelectField'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getVendor, createVendor, updateVendor, listVendorCategories, saveVendorCategory } from '../services/procurementService'

export default function VendorDetailPage({ basePath = '/pm/procurement/vendors', forceEdit = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isCreate = !id
  const readOnly = !isCreate && !forceEdit
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [vendor, setVendor] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const [vendorName, setVendorName] = useState('')
  const [vendorCode, setVendorCode] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [accountId, setAccountId] = useState(null)
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [isActive, setIsActive] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    if (isCreate) {
      setLoading(false)
      return
    }
    const row = await getVendor(id)
    if (!row) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setVendor(row)
    setVendorName(row.vendor_name || '')
    setVendorCode(row.vendor_code || '')
    setCategory(row.category || '')
    setContactEmail(row.contact_email || '')
    setContactPhone(row.contact_phone || '')
    setIsActive(row.is_active !== false)
    setLoading(false)
  }, [id, isCreate])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const resolvedAccountId = await getCurrentUserAccountId()
        if (!resolvedAccountId || cancelled) return
        if (!cancelled) setAccountId(resolvedAccountId)
        const rows = await listVendorCategories(resolvedAccountId)
        if (!cancelled) setCategories(rows.filter((row) => row.is_active !== false))
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load vendor categories')
      }
    })()
    return () => { cancelled = true }
  }, [])

  const categoryOptions = useMemo(() => {
    const names = categories.map((row) => row.category_name).filter(Boolean)
    if (category && !names.includes(category)) names.unshift(category)
    return names.map((name) => ({ value: name, label: name }))
  }, [categories, category])

  const handleCategoryChange = async (value) => {
    const name = String(value || '').trim().slice(0, 80)
    if (!name) {
      setCategory('')
      return
    }
    const existing = categories.find((row) => row.category_name?.toLowerCase() === name.toLowerCase())
    if (existing) {
      setCategory(existing.category_name)
      return
    }
    setCategory(name)
    if (!accountId) {
      setError('Could not resolve your organisation.')
      return
    }
    try {
      const saved = await saveVendorCategory({ accountId, categoryName: name })
      setCategories((prev) =>
        [...prev, saved].sort((a, b) => String(a.category_name).localeCompare(String(b.category_name)))
      )
      setCategory(saved.category_name)
    } catch (err) {
      if (err?.code === '23505') {
        const rows = await listVendorCategories(accountId)
        const match = rows.find((row) => row.category_name?.toLowerCase() === name.toLowerCase())
        setCategories(rows.filter((row) => row.is_active !== false))
        if (match) setCategory(match.category_name)
        return
      }
      setError(err?.message || 'Could not add this category')
    }
  }

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        vendorName: vendor?.vendor_name || '',
        vendorCode: vendor?.vendor_code || '',
        category: vendor?.category || '',
        contactEmail: vendor?.contact_email || '',
        contactPhone: vendor?.contact_phone || '',
        isActive: vendor?.is_active !== false,
      }),
    [vendor]
  )
  const isDirty = useMemo(() => {
    if (loading || readOnly || saved) return false
    return JSON.stringify({ vendorName, vendorCode, category, contactEmail, contactPhone, isActive }) !== baselineSnapshot
  }, [loading, readOnly, saved, vendorName, vendorCode, category, contactEmail, contactPhone, isActive, baselineSnapshot])
  const { requestNavigation } = useUnsavedChangesGuard(isDirty, 'You have unsaved vendor changes.')

  const goToList = () => navigate(basePath)
  const handleBack = () => requestNavigation(basePath)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!vendorName.trim()) {
      setError('Vendor name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (isCreate) {
        const accountId = await getCurrentUserAccountId()
        const created = await createVendor({ accountId, vendorName, vendorCode, category, contactEmail, contactPhone })
        setSaved(true)
        setSaving(false)
        showSuccess({
          recordId: created?.vendor_code || vendorName.trim(),
          operation: 'created',
          message: `"${vendorName.trim()}" was created successfully.`,
          onOk: goToList,
        })
      } else {
        await updateVendor(id, { vendorName, vendorCode, category, contactEmail, contactPhone, isActive })
        setSaved(true)
        setSaving(false)
        showSuccess({ recordId: vendorName.trim(), operation: 'updated', message: `"${vendorName.trim()}" was updated successfully.`, onOk: goToList })
      }
    } catch (err) {
      setSaving(false)
      setError(err?.message || String(err))
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading vendor…</div>
  }
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Vendor not found.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Back to Vendors</button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isCreate ? 'Create Vendor' : readOnly ? 'View Vendor' : 'Edit Vendor'}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vendor name *</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <SelectField
                    id="vendor-category"
                    aria-label="Category"
                    value={category}
                    onChange={handleCategoryChange}
                    options={categoryOptions}
                    placeholder="Select a category"
                    searchPlaceholder="Search or type a new category..."
                    forceSearchable
                    allowCustom={!readOnly}
                    customValueActions={readOnly ? [] : [{
                      key: 'add-category',
                      label: (term) => `Add "${term}"`,
                      onSelect: (term) => { handleCategoryChange(term) },
                    }]}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vendor code</label>
                  <input
                    type="text"
                    value={vendorCode}
                    onChange={(e) => setVendorCode(e.target.value)}
                    maxLength={60}
                    placeholder={isCreate ? 'Leave blank to assign a code' : ''}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact email</label>
                  <MultiLineListInput
                    viewModeId="vendor-contact-emails"
                    id="vendor-contact-emails"
                    value={contactEmail}
                    onChange={setContactEmail}
                    itemColumnLabel="Email"
                    placeholder="name@company.com"
                    ariaLabelPrefix="email"
                    disabled={readOnly}
                    validateItem={(item) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item) ? null : 'Enter a valid email address')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact phone</label>
                  <MultiLineListInput
                    viewModeId="vendor-contact-phones"
                    id="vendor-contact-phones"
                    value={contactPhone}
                    onChange={setContactPhone}
                    itemColumnLabel="Phone"
                    placeholder="Phone number"
                    ariaLabelPrefix="phone"
                    disabled={readOnly}
                  />
                </div>
              </div>
              {!isCreate && (
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
                  Active vendor
                </label>
              )}
            </fieldset>

            <div className="flex gap-3 pt-2">
              {!readOnly && (
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isCreate ? 'Create Vendor' : 'Save Changes'}
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this vendor is saved.</p>
            ) : (
              <AuditDetailsPanel description="How this vendor is labelled and classified.">
                <AuditCard title="Identity" description="How this vendor is labelled.">
                  <AuditField label="Vendor name" value={vendorName || vendor?.vendor_name} />
                  <AuditField label="Vendor code" value={vendorCode || '—'} />
                </AuditCard>
                <AuditCard title="Classification" description="Category and contact details.">
                  <AuditField label="Category" value={category || '—'} />
                  <AuditField label="Contact email" value={contactEmail ? contactEmail.split(/\r?\n/).filter(Boolean).join(', ') : '—'} />
                  <AuditField label="Contact phone" value={contactPhone ? contactPhone.split(/\r?\n/).filter(Boolean).join(', ') : '—'} />
                  <AuditField label="Average rating" value={vendor?.rating_avg != null ? String(vendor.rating_avg) : 'No ratings yet'} />
                </AuditCard>
                <AuditCard title="Record history" description="When this vendor was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={vendor?.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={vendor?.updated_at} />
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
