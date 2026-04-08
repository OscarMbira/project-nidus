import { Link } from 'react-router-dom'

/**
 * Success confirmation after approving a meeting extraction → issue/risk.
 * Same wording for Platform and Simulator (parity).
 */
export default function ExtractionApproveSuccessModal({
  open,
  onClose,
  kind,
  recordId,
  recordTitle,
  viewHref,
}) {
  if (!open) return null
  const label = kind === 'issue' ? 'Issue' : 'Risk'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="extraction-success-title"
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-green-200 dark:border-green-800 bg-green-50/90 dark:bg-green-950/40"
      >
        <h3 id="extraction-success-title" className="text-lg font-semibold text-green-900 dark:text-green-100">
          {label} created successfully.
        </h3>
        <dl className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <dt className="inline font-medium text-gray-600 dark:text-gray-400">Record ID: </dt>
            <dd className="inline font-mono break-all">{recordId}</dd>
          </div>
          {recordTitle ? (
            <div>
              <dt className="inline font-medium text-gray-600 dark:text-gray-400">Title: </dt>
              <dd className="inline">{recordTitle}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline font-medium text-gray-600 dark:text-gray-400">Operation: </dt>
            <dd className="inline">CREATE</dd>
          </div>
        </dl>
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-6">
          {viewHref ? (
            <Link
              to={viewHref}
              className="inline-flex justify-center px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-700"
            >
              View in register
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Continue reviewing
          </button>
        </div>
      </div>
    </div>
  )
}
