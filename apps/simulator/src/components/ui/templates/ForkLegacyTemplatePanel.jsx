import { useState } from 'react'

/**
 * Fork effective legacy_document or structured_list master for a Portfolio/Programme.
 */
export default function ForkLegacyTemplatePanel({
  entityLabel = 'entity',
  domain = 'legacy_document',
  forkLegacyTemplate,
  disabled = false,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const label = domain === 'structured_list' ? 'structured list' : 'reference document'

  async function handleFork() {
    if (typeof forkLegacyTemplate !== 'function') return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      setResult(await forkLegacyTemplate())
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Legacy {label} templates
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Fork the effective {label} master into a tailored copy for this {entityLabel}.
        </p>
      </div>
      <button
        type="button"
        disabled={disabled || busy || typeof forkLegacyTemplate !== 'function'}
        onClick={handleFork}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? 'Forking…' : `Fork ${label} for this ${entityLabel}`}
      </button>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
      ) : null}
      {result?.template ? (
        <div className="rounded border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm text-green-800 dark:text-green-200">
          Forked — id <span className="font-mono">{result.template.id}</span>
          {result.template.title ? ` (${result.template.title})` : ''}
        </div>
      ) : null}
    </div>
  )
}
