export default function SummaryCard({ summaryText, keyDecisions = [], actionItems = [], sentiment }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4">
      {sentiment && (
        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Sentiment: {sentiment}</p>
      )}
      {summaryText && (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Summary</h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{summaryText}</p>
        </div>
      )}
      {keyDecisions?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Key decisions</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            {keyDecisions.map((d, i) => (
              <li key={i}>{typeof d === 'string' ? d : d.decision || JSON.stringify(d)}</li>
            ))}
          </ul>
        </div>
      )}
      {actionItems?.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Action items</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            {actionItems.map((a, i) => (
              <li key={i}>{typeof a === 'string' ? a : a.description || JSON.stringify(a)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
