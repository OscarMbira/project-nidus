/**
 * Vendor performance rating — create/edit (Procurement, GAP-12), rule 65 + rule 63.1 Audit tab.
 * No standalone "view" mode — a rating is a short log entry, edited or deleted from the list.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader, Star } from 'lucide-react'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField, AuditTimestampPair } from '@nidus/ui'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { platformDb } from '@nidus/supabase'
import { getVendorRating, createVendorRating, updateVendorRating, listVendors } from '../services/procurementService'

export default function VendorRatingForm({ basePath = '/pm/procurement/performance' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isCreate = !id
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(null)
  const [vendors, setVendors] = useState([])
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [vendorId, setVendorId] = useState('')
  const [ratingScore, setRatingScore] = useState(5)
  const [ratingNotes, setRatingNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const accountId = await getCurrentUserAccountId()
    setVendors(accountId ? await listVendors(accountId) : [])

    if (isCreate) {
      setLoading(false)
      return
    }
    const row = await getVendorRating(id)
    if (!row) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setRating(row)
    setVendorId(row.vendor_id || '')
    setRatingScore(row.rating_score || 5)
    setRatingNotes(row.rating_notes || '')
    setLoading(false)
  }, [id, isCreate])

  useEffect(() => {
    load()
  }, [load])

  const baselineSnapshot = useMemo(
    () =>
      JSON.stringify({
        vendorId: rating?.vendor_id || '',
        ratingScore: rating?.rating_score || 5,
        ratingNotes: rating?.rating_notes || '',
      }),
    [rating]
  )
  const isDirty = useMemo(() => {
    if (loading) return false
    return JSON.stringify({ vendorId, ratingScore, ratingNotes }) !== baselineSnapshot
  }, [loading, vendorId, ratingScore, ratingNotes, baselineSnapshot])
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved rating changes.')

  const goToList = () => navigate(basePath)
  const handleBack = () => confirmDiscard(goToList)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!vendorId) {
      setError('Vendor is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const vendorName = vendors.find((v) => v.id === vendorId)?.vendor_name || ''
      if (isCreate) {
        const { data: { user } } = await platformDb.auth.getUser()
        await createVendorRating({ vendorId, ratingScore: Number(ratingScore), ratingNotes, ratedBy: user?.id || null })
        setSaving(false)
        showSuccess({ recordId: vendorName, operation: 'created', message: `Rating for "${vendorName}" was recorded.`, onOk: goToList })
      } else {
        await updateVendorRating(id, { vendorId, ratingScore: Number(ratingScore), ratingNotes })
        setSaving(false)
        showSuccess({ recordId: vendorName, operation: 'updated', message: `Rating for "${vendorName}" was updated.`, onOk: goToList })
      }
    } catch (err) {
      setSaving(false)
      setError(err?.message || String(err))
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading rating…</div>
  }
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Rating not found.</p>
        <button onClick={goToList} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Back to Vendor Performance</button>
      </div>
    )
  }

  const vendorName = vendors.find((v) => v.id === vendorId)?.vendor_name || ''

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={handleBack} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Star className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isCreate ? 'Rate a Vendor' : 'Edit Rating'}</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-4">
          <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 'details' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vendor *</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                required
                disabled={!isCreate}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white disabled:opacity-60"
              >
                <option value="">Select a vendor…</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.vendor_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Score (1-5) *</label>
              <select
                value={ratingScore}
                onChange={(e) => setRatingScore(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
              <textarea
                value={ratingNotes}
                onChange={(e) => setRatingNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isCreate ? 'Save Rating' : 'Save Changes'}
              </button>
              <button type="button" onClick={handleBack} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            {isCreate ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this rating is saved.</p>
            ) : (
              <AuditDetailsPanel description="How this rating is recorded.">
                <AuditCard title="Identity" description="What this rating is for.">
                  <AuditField label="Vendor" value={vendorName || '—'} />
                  <AuditField label="Score" value={`${ratingScore}/5`} />
                </AuditCard>
                <AuditCard title="Record history" description="When this rating was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={rating?.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={rating?.updated_at} />
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
