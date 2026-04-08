import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAppRoutePrefix } from '../../hooks/useAppRoutePrefix'
import { getCurrentUserAccountId } from '../../utils/accountResolution'
import { useCommsApi } from './useCommsApi'
import ChannelSidebar from '../../components/comms/ChannelSidebar'

export default function CommsHub() {
  const basePath = `${useAppRoutePrefix()}/comms`
  const { channel } = useCommsApi()
  const [accountId, setAccountId] = useState(null)
  const [channels, setChannels] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const aid = await getCurrentUserAccountId()
      if (cancelled) return
      setAccountId(aid)
      if (!aid) return
      const { data, error } = await channel.listChannelsForAccount(aid)
      if (!cancelled) {
        if (error) setErr(error.message)
        setChannels(data || [])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [channel])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-4 min-h-[60vh]">
      <ChannelSidebar basePath={basePath} channels={channels} activeChannelId={null} />
      <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Communications</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Channels, direct messages, and meetings for your organisation.
        </p>
        {err && <p className="text-red-600 dark:text-red-400 text-sm mb-4">{err}</p>}
        {!accountId && <p className="text-sm text-gray-500">Loading account…</p>}
        <div className="flex flex-wrap gap-3">
          <Link
            to={`${basePath}/messages`}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium min-h-[44px]"
          >
            Open messages
          </Link>
          <Link
            to={`${basePath}/direct`}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm min-h-[44px]"
          >
            Direct messages
          </Link>
          <Link
            to={`${basePath}/meetings`}
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm min-h-[44px]"
          >
            Meetings
          </Link>
        </div>
      </div>
    </div>
  )
}
