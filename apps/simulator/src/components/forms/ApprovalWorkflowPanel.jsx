export default function ApprovalWorkflowPanel({ status, onSubmit, onApprove, onReject, onArchive }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <p className="mb-3 text-xs text-gray-600 dark:text-gray-300">
        Status: <span className="font-semibold text-gray-900 dark:text-gray-100">{status || 'draft'}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onSubmit} className="rounded bg-blue-600 px-3 py-1 text-xs text-white">Submit</button>
        <button type="button" onClick={onApprove} className="rounded bg-green-600 px-3 py-1 text-xs text-white">Approve</button>
        <button type="button" onClick={onReject} className="rounded bg-amber-600 px-3 py-1 text-xs text-white">Reject</button>
        <button type="button" onClick={onArchive} className="rounded bg-gray-600 dark:bg-gray-700 px-3 py-1 text-xs text-white">Archive</button>
      </div>
    </div>
  )
}
