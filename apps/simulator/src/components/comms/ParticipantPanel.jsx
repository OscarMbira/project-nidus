import OnlinePresenceIndicator from './OnlinePresenceIndicator'

export default function ParticipantPanel({ participants = [] }) {
  return (
    <div className="w-full md:w-56 shrink-0 border-l border-gray-800 bg-gray-900 p-3 space-y-2">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Participants</h4>
      <ul className="space-y-2">
        {participants.map((p) => (
          <li key={p.id || p.user_id} className="flex items-center gap-2 text-sm text-gray-200">
            <OnlinePresenceIndicator status={p.joined_at ? 'online' : 'offline'} />
            <span className="truncate">{p.user?.full_name || p.user?.email || 'Member'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
