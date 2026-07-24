const SEVERITY_STYLES = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

export default function TurnEventCard({ event, selectedOption, onSelectOption }) {
  const npc = event.npc_source?.replace(/_/g, ' ') || 'Stakeholder';
  const options = event.decision_options || [];

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{npc}</p>
          <h4 className="font-semibold text-gray-900 dark:text-white">{event.title}</h4>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full capitalize ${SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.medium}`}>
          {event.severity}
        </span>
      </div>
      {event.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
      )}
      {options.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((opt) => (
            <button
              key={opt.id || opt.label}
              type="button"
              disabled={!!event.user_decision}
              onClick={() => onSelectOption?.(event.id, opt.id || opt.label)}
              className={`text-left rounded-lg border p-3 text-sm transition-colors ${
                selectedOption === (opt.id || opt.label) || event.user_decision === (opt.id || opt.label)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
              }`}
            >
              <span className="font-medium text-gray-900 dark:text-white">{opt.label}</span>
              {opt.score_delta != null && (
                <span className="block text-xs text-gray-500 mt-1">Score impact: {opt.score_delta > 0 ? '+' : ''}{opt.score_delta}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
