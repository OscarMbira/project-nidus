import TurnEventCard from './TurnEventCard';

export default function TurnTimeline({ turns = [], currentTurnNumber = 1, onSelectTurn }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-2 min-w-max">
        {turns.map((turn) => {
          const isCurrent = turn.turn_number === currentTurnNumber;
          const isDone = turn.status === 'completed' || turn.status === 'skipped';
          const eventCount = (turn.events_triggered || []).length;
          return (
            <button
              key={turn.id || turn.turn_number}
              type="button"
              onClick={() => onSelectTurn?.(turn)}
              className={`flex flex-col items-center px-3 py-2 rounded-lg border text-xs transition-colors ${
                isCurrent
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 animate-pulse'
                  : isDone
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="font-semibold">T{turn.turn_number}</span>
              <span>{turn.sim_date_start?.slice(5)}</span>
              <span className="mt-1 flex gap-0.5">
                {Array.from({ length: Math.min(eventCount, 5) }).map((_, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TurnTimelineLegend() {
  return (
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Green = completed · Blue = current · Grey = upcoming
    </p>
  );
}
