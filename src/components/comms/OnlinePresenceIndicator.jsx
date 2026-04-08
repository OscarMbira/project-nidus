/** Green / amber / grey presence dot (placeholder until Presence channel wired). */
export default function OnlinePresenceIndicator({ status = 'offline', className = '' }) {
  const color =
    status === 'online' ? 'bg-emerald-500' : status === 'away' ? 'bg-amber-500' : 'bg-gray-400 dark:bg-gray-500'
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color} ${className}`} title={status} />
}
