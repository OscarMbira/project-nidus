/**
 * RFPForm - Create/Edit RFP
 * mode: 'create' | 'edit'
 */

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, ListPlus, Upload } from 'lucide-react'
import * as defaultRfpService from '../../services/rfpService'
import { getPortfolioCategories } from '../../services/portfolioCategoryService'
import SearchableSelect from '../ui/SearchableSelect'

const RFPLineItemEditor = lazy(() => import('./RFPLineItemEditor'))
import { SmartAmountInput } from '../ui/SmartAmountInput'
import { platformDb } from '../../services/supabase/supabaseClient'

/**
 * Resolve organisation account ID for the current user.
 * Same 3-step resolution as BrandingContext / portfolioCategoryService:
 * 1) Account owner, 2) Project owner, 3) Project member (user_projects).
 */
async function getAccountId() {
  try {
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user) return null

    const { data: userRow } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (!userRow?.id) return null

    const { data: accountRow } = await platformDb
      .from('accounts')
      .select('id')
      .eq('owner_user_id', userRow.id)
      .eq('is_deleted', false)
      .maybeSingle()
    if (accountRow?.id) return accountRow.id

    const { data: projAsOwner } = await platformDb
      .from('projects')
      .select('account_id')
      .eq('owner_user_id', userRow.id)
      .not('account_id', 'is', null)
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle()
    if (projAsOwner?.account_id) return projAsOwner.account_id

    const { data: projAsManager } = await platformDb
      .from('projects')
      .select('account_id')
      .eq('project_manager_user_id', userRow.id)
      .not('account_id', 'is', null)
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle()
    if (projAsManager?.account_id) return projAsManager.account_id

    const { data: memberRows } = await platformDb
      .from('user_projects')
      .select('project_id')
      .eq('user_id', userRow.id)
      .eq('is_deleted', false)
      .limit(5)
    if (memberRows?.length) {
      const projectIds = memberRows.map((r) => r.project_id)
      const { data: proj } = await platformDb
        .from('projects')
        .select('account_id')
        .in('id', projectIds)
        .not('account_id', 'is', null)
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle()
      if (proj?.account_id) return proj.account_id
    }

    return null
  } catch (err) {
    console.error('[RFPForm] getAccountId error:', err)
    return null
  }
}

const emptyContact = () => ({ contact_person: '', email: '', phone: '', mobile: '' })

const emptyForm = {
  rfp_reference: '',
  rfp_title: '',
  rfp_description: '',
  rfp_category: '',
  original_document_ref: '',
  original_issue_date: '',
  service_provider_name: '',
  service_provider_code: '',
  service_provider_contacts: [emptyContact()],
  contract_value: '',
  currency: 'USD',
  provider_selected_date: '',
  contract_start_date: '',
  contract_end_date: '',
  notes: '',
}

export default function RFPForm({ mode = 'create', basePath = '/pmo', rfpService = defaultRfpService }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { createRFP, getRFPById, updateRFP } = rfpService
  const [form, setForm] = useState(emptyForm)
  const [accountId, setAccountId] = useState(null)
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'provider' | 'line-items'
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const categoryOptions = useMemo(() => {
    const opts = categories.map((c) => ({ value: c.code || c.name, label: c.name }))
    if (form.rfp_category?.trim() && !opts.some((o) => o.value === form.rfp_category)) {
      opts.unshift({ value: form.rfp_category, label: form.rfp_category })
    }
    return opts
  }, [categories, form.rfp_category])

  // Open Line Items tab when edit URL has ?tab=line-items
  useEffect(() => {
    if (mode === 'edit' && id && searchParams.get('tab') === 'line-items') {
      setActiveTab('line-items')
    }
  }, [mode, id, searchParams])

  useEffect(() => {
    getAccountId().then(setAccountId)
  }, [])

  useEffect(() => {
    getPortfolioCategories({ activeOnly: true })
      .then((res) => res.success && res.data && setCategories(res.data))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false))
  }, [])

  useEffect(() => {
    if (mode === 'edit' && id) {
      getRFPById(id).then((rfp) => {
        const contacts = Array.isArray(rfp.service_provider_contacts) && rfp.service_provider_contacts.length > 0
          ? rfp.service_provider_contacts.map((c) => ({
              contact_person: c.contact_person ?? '',
              email: c.email ?? '',
              phone: c.phone ?? '',
              mobile: c.mobile ?? '',
            }))
          : [{ contact_person: rfp.service_provider_contact_person || '', email: rfp.service_provider_email || '', phone: rfp.service_provider_phone || '', mobile: '' }]
        setForm({
          rfp_reference: rfp.rfp_reference || '',
          rfp_title: rfp.rfp_title || '',
          rfp_description: rfp.rfp_description || '',
          rfp_category: rfp.rfp_category || '',
          original_document_ref: rfp.original_document_ref || '',
          original_issue_date: rfp.original_issue_date || '',
          service_provider_name: rfp.service_provider_name || '',
          service_provider_code: rfp.service_provider_code || '',
          service_provider_contacts: contacts,
          contract_value: rfp.contract_value ?? '',
          currency: rfp.currency || 'USD',
          provider_selected_date: rfp.provider_selected_date || '',
          contract_start_date: rfp.contract_start_date || '',
          contract_end_date: rfp.contract_end_date || '',
          notes: rfp.notes || '',
        })
      }).catch(console.error).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [mode, id])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }, [])

  const handleContactChange = useCallback((index, field, value) => {
    setForm((p) => ({
      ...p,
      service_provider_contacts: p.service_provider_contacts.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }))
  }, [])

  const addContact = useCallback(() => {
    setForm((p) => ({
      ...p,
      service_provider_contacts: [...p.service_provider_contacts, emptyContact()],
    }))
  }, [])

  const removeContact = useCallback((index) => {
    setForm((p) => ({
      ...p,
      service_provider_contacts: p.service_provider_contacts.filter((_, i) => i !== index).length
        ? p.service_provider_contacts.filter((_, i) => i !== index)
        : [emptyContact()],
    }))
  }, [])

  /** Build payload for create/update (shared by submit and save-and-go buttons). */
  const buildPayload = useCallback(() => {
    const contacts = (form.service_provider_contacts || []).filter(
      (c) => c.contact_person?.trim() || c.email?.trim() || c.phone?.trim() || c.mobile?.trim()
    )
    const payload = {
      ...form,
      organisation_id: accountId,
      service_provider_contacts: contacts.length ? contacts : [emptyContact()],
      contract_value: form.contract_value ? parseFloat(form.contract_value) : null,
      original_issue_date: form.original_issue_date || null,
      provider_selected_date: form.provider_selected_date || null,
      contract_start_date: form.contract_start_date || null,
      contract_end_date: form.contract_end_date || null,
    }
    const first = payload.service_provider_contacts[0]
    if (first) {
      payload.service_provider_contact_person = first.contact_person || null
      payload.service_provider_email = first.email || null
      payload.service_provider_phone = first.phone || null
    }
    return payload
  }, [form, accountId])

  /**
   * Save RFP (create or update). Returns created/updated id or null on failure.
   * Use for "Save and go to line items / bulk upload" when on create.
   */
  const saveRFPAndGetId = useCallback(async () => {
    if (!form.rfp_title?.trim()) {
      alert('RFP Title is required.')
      return null
    }
    if (!accountId) {
      alert('Organisation context not found. Please ensure you are in an organisation.')
      return null
    }
    try {
      setSaving(true)
      const payload = buildPayload()
      if (mode === 'create') {
        const created = await createRFP(payload)
        return created?.id ?? null
      }
      await updateRFP(id, payload)
      return id
    } catch (err) {
      alert(err?.message || 'Failed to save')
      return null
    } finally {
      setSaving(false)
    }
  }, [form, accountId, mode, id, buildPayload, createRFP, updateRFP])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!form.rfp_title?.trim()) {
      alert('RFP Title is required')
      return
    }
    if (!accountId) {
      alert('Organisation context not found. Please ensure you are in an organisation.')
      return
    }
    try {
      setSaving(true)
      const payload = buildPayload()
      if (mode === 'create') {
        const created = await createRFP(payload)
        navigate(`${basePath}/rfp/${created.id}/view`)
      } else {
        await updateRFP(id, payload)
        navigate(`${basePath}/rfp/${id}/view`)
      }
    } catch (err) {
      alert(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [form.rfp_title, accountId, buildPayload, mode, id, createRFP, updateRFP, navigate, basePath])

  const handleLoadItemsManually = useCallback(async () => {
    if (mode === 'edit' && id) {
      setActiveTab('line-items')
      return
    }
    const rfpId = await saveRFPAndGetId()
    if (rfpId) navigate(`${basePath}/rfp/${rfpId}/edit?tab=line-items`)
  }, [mode, id, saveRFPAndGetId, navigate, basePath])

  const handleBulkUpload = useCallback(async () => {
    if (mode === 'edit' && id) {
      navigate(`${basePath}/rfp/${id}/import`)
      return
    }
    const rfpId = await saveRFPAndGetId()
    if (rfpId) navigate(`${basePath}/rfp/${rfpId}/import`)
  }, [mode, id, saveRFPAndGetId, navigate, basePath])

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate(`${basePath}/procurement/rfp`)} className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{mode === 'create' ? 'Load RFP' : 'Edit RFP'}</h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleLoadItemsManually}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            title={!(mode === 'edit' && id) ? 'Save the RFP first to add line items' : 'Add line items one by one'}
          >
            <ListPlus className="w-4 h-4" />
            Load RFP items manually
          </button>
          <button
            type="button"
            onClick={handleBulkUpload}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            title={!(mode === 'edit' && id) ? 'Save the RFP first to bulk upload' : 'Upload from CSV or Excel'}
          >
            <Upload className="w-4 h-4" />
            Bulk upload (CSV/Excel)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-1" aria-label="RFP form sections">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'details'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-b-0 border-gray-200 dark:border-gray-700 -mb-px'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              RFP Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('provider')}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'provider'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-b-0 border-gray-200 dark:border-gray-700 -mb-px'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Service Provider
            </button>
            {mode === 'edit' && id && (
              <button
                type="button"
                onClick={() => setActiveTab('line-items')}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'line-items'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-b-0 border-gray-200 dark:border-gray-700 -mb-px'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Line Items
              </button>
            )}
          </nav>
        </div>

        {/* Tab panels */}
        {activeTab === 'details' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">RFP Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RFP Code</label>
                  <input name="rfp_reference" value={form.rfp_reference} onChange={handleChange} placeholder="Leave blank to auto-generate" className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">System-generated if left blank (e.g. RFP-2026-001).</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RFP Title *</label>
                  <input name="rfp_title" value={form.rfp_title} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea name="rfp_description" value={form.rfp_description} onChange={handleChange} rows={3} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <SearchableSelect
                  options={categoryOptions}
                  value={form.rfp_category}
                  onChange={(val) => setForm((p) => ({ ...p, rfp_category: val || '' }))}
                  placeholder={categoriesLoading ? 'Loading categories…' : 'Select category…'}
                  searchPlaceholder="Search categories…"
                  disabled={categoriesLoading}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Same as Portfolio / Programme categories. Manage in PMO Admin → Portfolio Categories.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Original Document Reference</label>
                <input name="original_document_ref" value={form.original_document_ref} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Original Issue Date</label>
                <input name="original_issue_date" type="date" value={form.original_issue_date} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'provider' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Provider</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provider Name</label>
                <input name="service_provider_name" value={form.service_provider_name} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact persons</span>
                  <button type="button" onClick={addContact} className="inline-flex items-center gap-1 px-2 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded">
                    <Plus className="w-4 h-4" /> Add contact
                  </button>
                </div>
                <div className="space-y-4">
                  {(form.service_provider_contacts || [emptyContact()]).map((contact, index) => (
                    <div key={index} className="p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Contact {index + 1}</span>
                        {(form.service_provider_contacts?.length ?? 1) > 1 && (
                          <button type="button" onClick={() => removeContact(index)} className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" aria-label="Remove contact">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Contact Person</label>
                          <input value={contact.contact_person} onChange={(e) => handleContactChange(index, 'contact_person', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" placeholder="Name" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Email</label>
                          <input type="email" value={contact.email} onChange={(e) => handleContactChange(index, 'email', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" placeholder="email@example.com" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Phone</label>
                          <input type="tel" value={contact.phone} onChange={(e) => handleContactChange(index, 'phone', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" placeholder="Phone" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Mobile number</label>
                          <input type="tel" value={contact.mobile} onChange={(e) => handleContactChange(index, 'mobile', e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 text-sm" placeholder="Mobile" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contract Value</label>
                  <SmartAmountInput
                    value={form.contract_value !== '' && form.contract_value != null && !Number.isNaN(Number(form.contract_value)) ? Number(form.contract_value) : null}
                    onChange={(num) => setForm((p) => ({ ...p, contract_value: num != null && !Number.isNaN(num) ? String(num) : '' }))}
                    placeholder="e.g. 23T, 2M"
                    min={0}
                    showConversionHint
                    className="w-full"
                    inputClassName="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Use T for thousands (23T = 23,000), M for millions (2M = 2,000,000). Press Enter to convert.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                  <select name="currency" value={form.currency} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'line-items' && mode === 'edit' && id && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <Suspense fallback={<div className="text-sm text-gray-500 dark:text-gray-400 py-4">Loading line items…</div>}>
              <RFPLineItemEditor rfpId={id} basePath={basePath} rfpService={rfpService} />
            </Suspense>
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={() => navigate(`${basePath}/procurement/rfp`)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
