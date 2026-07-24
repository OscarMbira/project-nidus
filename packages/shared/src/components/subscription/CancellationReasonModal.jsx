import { useEffect, useState } from 'react'
import { fetchActiveCancellationCategories, recordCancellationRequest } from '../../services/cancellationService'

/**
 * Customer cancellation reason modal — shown before subscription cancel proceeds.
 */
export default function CancellationReasonModal({
  open,
  onClose,
  onConfirm,
  targetSystem = 'platform',
  subscriptionId = null,
}) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [reasonId, setReasonId] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setError(null)
    setReasonId('')
    setNotes('')
    setLoading(true)
    fetchActiveCancellationCategories()
      .then((rows) => setCategories(rows))
      .catch((err) => setError(err?.message || 'Unable to load cancellation reasons.'))
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!reasonId) {
      setError('Please select a reason.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await recordCancellationRequest(reasonId, notes, subscriptionId, targetSystem)
      await onConfirm?.(reasonId, notes)
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Unable to save cancellation reason.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm?.(null, null)
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Unable to continue cancellation.')
    } finally {
      setSubmitting(false)
    }
  }

  const systemLabel = targetSystem === 'simulator' ? 'Simulator' : 'Platform'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 text-gray-100 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancellation-reason-title"
      >
        <h2 id="cancellation-reason-title" className="text-xl font-semibold mb-1">
          Before you go…
        </h2>
        <p className="text-sm text-gray-400 mb-5">
          Help us improve {systemLabel} — why are you cancelling?
        </p>

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Loading reasons…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset className="space-y-2">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    reasonId === cat.id
                      ? 'border-blue-500 bg-blue-950/30'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellation_reason"
                    value={cat.id}
                    checked={reasonId === cat.id}
                    onChange={() => setReasonId(cat.id)}
                    className="mt-1"
                  />
                  <span className="text-sm">{cat.label}</span>
                </label>
              ))}
            </fieldset>

            <div>
              <label htmlFor="cancellation-notes" className="block text-sm text-gray-400 mb-1">
                Additional details (optional)
              </label>
              <textarea
                id="cancellation-notes"
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100"
                placeholder="Tell us more…"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center pt-2">
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                className="text-sm text-gray-400 hover:text-gray-200 underline"
              >
                Skip
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                >
                  Keep subscription
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reasonId}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit & cancel subscription'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
