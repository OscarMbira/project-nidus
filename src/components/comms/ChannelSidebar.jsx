import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import OnlinePresenceIndicator from './OnlinePresenceIndicator'

export default function ChannelSidebar({ basePath, channels, activeChannelId, title = 'Channels' }) {
  return (
    <aside className="w-full md:w-72 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-900 text-gray-100 flex flex-col min-h-[50vh]">
      <div className="p-3 border-b border-gray-700 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-cyan-400" />
        <span className="font-semibold">{title}</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {(channels || []).map((ch) => (
          <Link
            key={ch.id}
            to={`${basePath}/channel/${ch.id}`}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              activeChannelId === ch.id ? 'bg-cyan-900/50 text-white' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <OnlinePresenceIndicator status="offline" />
            <span className="truncate">{ch.name || ch.channel_type || 'Channel'}</span>
          </Link>
        ))}
        {(!channels || !channels.length) && <p className="text-xs text-gray-500 px-2">No channels yet.</p>}
      </nav>
    </aside>
  )
}
