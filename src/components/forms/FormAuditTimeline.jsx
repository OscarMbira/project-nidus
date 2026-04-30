export default function FormAuditTimeline({ events = [] }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-100">Audit Timeline</h3>
      <ul className="space-y-1 text-xs text-gray-300">
        {events.map((event) => <li key={event.id || event.created_at}>{event.action} ({event.created_at || 'now'})</li>)}
      </ul>
    </div>
  )
}
