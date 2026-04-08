import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { useAppRoutePrefix } from '../../hooks/useAppRoutePrefix'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import MessageBubble from '../../components/comms/MessageBubble'
import MessageInput from '../../components/comms/MessageInput'
import TypingIndicator from '../../components/comms/TypingIndicator'
import { useCommsApi } from './useCommsApi'

export default function ChannelView() {
  const { channelId } = useParams()
  const basePath = `${useAppRoutePrefix()}/comms`
  const { message, isSim } = useCommsApi()
  const [messages, setMessages] = useState([])
  const [myUserId, setMyUserId] = useState(null)
  const [usersMap, setUsersMap] = useState({})
  const [err, setErr] = useState(null)

  const client = isSim ? simDb : platformDb

  const load = useCallback(async () => {
    if (!channelId) return
    const { data, error } = await message.listMessages(channelId, { limit: 80 })
    if (error) setErr(error.message)
    setMessages(data || [])
    const ids = [...new Set((data || []).map((m) => m.sender_id).filter(Boolean))]
    if (ids.length) {
      const { data: us } = await client.from('users').select('id, full_name, email').in('id', ids)
      const map = {}
      ;(us || []).forEach((u) => {
        map[u.id] = u
      })
      setUsersMap(map)
    }
  }, [channelId, message, client])

  useEffect(() => {
    ;(async () => {
      const { data: auth } = await platformDb.auth.getUser()
      if (auth?.user) {
        const { data: u } = await platformDb.from('users').select('id').eq('auth_user_id', auth.user.id).maybeSingle()
        setMyUserId(u?.id || null)
      }
    })()
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!channelId) return
    const ch = client
      .channel(`comms-messages-${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: isSim ? 'sim' : 'public', table: 'comm_messages', filter: `channel_id=eq.${channelId}` },
        () => {
          load()
        }
      )
      .subscribe()
    const poll = setInterval(() => load(), 8000)
    return () => {
      clearInterval(poll)
      client.removeChannel(ch)
    }
  }, [channelId, client, isSim, load])

  const send = async (text) => {
    if (!myUserId || !channelId) return
    const { error } = await message.sendMessage({ channelId, senderId: myUserId, content: text })
    if (error) setErr(error.message)
    else load()
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col min-h-[70vh] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Channel</h1>
          <p className="text-xs text-gray-500 font-mono">{channelId}</p>
        </div>
        <Link to={`${basePath}/meetings/new`} className="text-sm text-cyan-600 dark:text-cyan-400 min-h-[44px] inline-flex items-center">
          Schedule call
        </Link>
      </div>
      {err && <p className="text-red-600 text-sm px-4 pt-2">{err}</p>}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isOwn={m.sender_id === myUserId}
            senderLabel={usersMap[m.sender_id]?.full_name || usersMap[m.sender_id]?.email || ''}
          />
        ))}
        <TypingIndicator names={[]} />
      </div>
      <MessageInput onSend={send} disabled={!myUserId} />
      <Link to={basePath} className="text-center text-sm text-gray-500 py-2">
        ← Hub
      </Link>
    </div>
  )
}
