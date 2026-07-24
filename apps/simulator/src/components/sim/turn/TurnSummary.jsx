export default function TurnSummary({ decisions = [], metricChanges = [], onContinue }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Turn Summary</h3>
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Decisions made</h4>
        {decisions.length ? (
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {decisions.map((d, i) => (
              <li key={i}>• {d.decisionOptionId || d.user_decision} — {d.outcome?.narrative || 'Recorded'}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No decisions this turn.</p>
        )}
      </div>
      {metricChanges.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">KPI changes</h4>
          <ul className="space-y-1 text-sm">
            {metricChanges.map((m) => (
              <li key={m.name} className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{m.name}</span>
                <span>{m.before} → {m.after} {m.delta > 0 ? '↑' : m.delta < 0 ? '↓' : '→'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 italic border-t border-gray-200 dark:border-gray-700 pt-3">
        Learning feedback: A senior practitioner would balance short-term delivery pressure with governance and stakeholder transparency.
      </p>
      {onContinue && (
        <button type="button" onClick={onContinue} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
          Continue
        </button>
      )}
    </div>
  );
}
