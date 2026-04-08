export default function ExtractedItemCard({ title, description, quote, onApprove, onReject, onEnrich, type = 'issue' }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase text-cyan-600 dark:text-cyan-400">{type}</span>
      </div>
      <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
      {description && <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>}
      {quote && <blockquote className="text-xs border-l-2 border-cyan-500 pl-2 text-gray-500 italic">{quote}</blockquote>}
      <div className="flex flex-wrap gap-2 pt-2">
        <button type="button" onClick={onApprove} className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-sm">
          Approve
        </button>
        <button type="button" onClick={onEnrich} className="px-3 py-1.5 rounded-lg border border-gray-400 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-200">
          Enrich later
        </button>
        <button type="button" onClick={onReject} className="px-3 py-1.5 rounded-lg text-sm text-red-600 dark:text-red-400">
          Reject
        </button>
      </div>
    </div>
  )
}
