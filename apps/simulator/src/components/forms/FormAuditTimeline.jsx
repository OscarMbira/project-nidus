export default function FormAuditTimeline({ events = [] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Audit Timeline</h3>
      {!events.length ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No audit events yet.</p>
      ) : (
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {events.map((event) => (
            <li key={event.id || `${event.action}-${event.created_at}`}>
              {event.action}
              {event.created_at ? ` (${new Date(event.created_at).toLocaleString()})` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
