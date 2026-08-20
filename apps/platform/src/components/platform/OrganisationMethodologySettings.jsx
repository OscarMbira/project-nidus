import { useEffect, useState } from 'react'
import { platformDb } from '@nidus/supabase'
import {
  DEFAULT_FORM_BULK_APPROVE_MAX,
  FORM_BULK_APPROVE_HARD_MAX,
  normalizeFormBulkApproveMax,
} from '@nidus/shared/utils/formInstanceRegisterUtils.js'

const METHODOLOGY_OPTIONS = [
  { value: 'hybrid', label: 'Hybrid (all tracks visible)' },
  { value: 'structured', label: 'Structured / Traditional' },
  { value: 'standards_based', label: 'Standards-Based Process Groups' },
  { value: 'agile', label: 'Agile & Lean' },
]

/**
 * Organisation methodology settings (v673) + form bulk-approve cap (v860).
 */
export default function OrganisationMethodologySettings({ accountId, onSaved }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [defaultMethodology, setDefaultMethodology] = useState('hybrid')
  const [allowOverride, setAllowOverride] = useState(true)
  const [formBulkApproveMax, setFormBulkApproveMax] = useState(DEFAULT_FORM_BULK_APPROVE_MAX)

  useEffect(() => {
    if (!accountId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const { data, error: fetchErr } = await platformDb
        .from('accounts')
        .select('default_methodology, allow_project_methodology_override, form_bulk_approve_max')
        .eq('id', accountId)
        .maybeSingle()
      if (cancelled) return
      if (fetchErr) {
        setError(fetchErr.message)
      } else if (data) {
        setDefaultMethodology(data.default_methodology || 'hybrid')
        setAllowOverride(data.allow_project_methodology_override !== false)
        setFormBulkApproveMax(normalizeFormBulkApproveMax(data.form_bulk_approve_max))
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [accountId])

  const handleSave = async () => {
    if (!accountId) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    const capped = normalizeFormBulkApproveMax(formBulkApproveMax)
    const { error: updateErr } = await platformDb
      .from('accounts')
      .update({
        default_methodology: defaultMethodology,
        allow_project_methodology_override: allowOverride,
        form_bulk_approve_max: capped,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
    setSaving(false)
    if (updateErr) {
      setError(updateErr.message)
      return
    }
    setFormBulkApproveMax(capped)
    setSuccess('Organisation settings saved successfully.')
    onSaved?.({ defaultMethodology, allowOverride, formBulkApproveMax: capped })
    window.dispatchEvent(new CustomEvent('nidus-methodology-pref-changed'))
  }

  if (!accountId) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Link an organisation account to configure methodology settings.
      </p>
    )
  }

  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading methodology settings…</p>
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Methodology Settings</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Control which methodology tracks appear in the sidebar for your organisation.
        </p>
      </div>

      <div>
        <label
          htmlFor="org-default-methodology"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Default Methodology
        </label>
        <select
          id="org-default-methodology"
          value={defaultMethodology}
          onChange={(e) => setDefaultMethodology(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {METHODOLOGY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={allowOverride}
          onChange={(e) => setAllowOverride(e.target.checked)}
          className="mt-1 rounded border-gray-300 dark:border-gray-600"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          Allow delivery-level methodology override (Portfolio, Programme, or Project may set a track that differs from the organisation default).
        </span>
      </label>

      <div>
        <label
          htmlFor="org-form-bulk-approve-max"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Form bulk approve limit
        </label>
        <input
          id="org-form-bulk-approve-max"
          type="number"
          min={1}
          max={FORM_BULK_APPROVE_HARD_MAX}
          value={formBulkApproveMax}
          onChange={(e) => setFormBulkApproveMax(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Maximum draft form records that can be approved in one batch (default {DEFAULT_FORM_BULK_APPROVE_MAX}, max {FORM_BULK_APPROVE_HARD_MAX}).
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {success}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-600"
      >
        {saving ? 'Saving…' : 'Save Organisation Settings'}
      </button>
    </div>
  )
}
