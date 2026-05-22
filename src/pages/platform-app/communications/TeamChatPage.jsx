import { useEffect, useRef, useState } from 'react'
import { Send, MessageCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { platformDb } from '../../../services/supabase/supabaseClient'
import { getMessages, sendMessage, subscribeToMessages } from '../../../services/communicationsService'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'

function formatTime(v) {
  if (!v) return ''
  return new Date(v).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatDateHeader(v) {
  if (!v) return ''
  const d = new Date(v)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

function groupByDay(messages) {
  const groups = []
  let currentDay = null
  for (const m of messages) {
    const day = new Date(m.created_at).toDateString()
    if (day !== currentDay) {
      groups.push({ type: 'day', label: formatDateHeader(m.created_at), key: m.created_at })
      currentDay = day
    }
    groups.push({ type: 'message', ...m })
  }
  return groups
}

export default function TeamChatPage() {
  const projectId = usePlanningProjectId()
  const [userId, setUserId] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    platformDb.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null))
  }, [])

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    getMessages(projectId)
      .then(data => setMessages(data))
      .catch(e => toast.error(e?.message || 'Failed to load messages'))
      .finally(() => setLoading(false))

    channelRef.current = subscribeToMessages(projectId, (newMsg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
    })

    return () => {
      if (channelRef.current) {
        platformDb.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const msg = text.trim()
    if (!msg || !projectId || !userId) return
    setSending(true)
    setText('')
    try {
      await sendMessage(projectId, userId, msg)
    } catch (e) {
      toast.error(e?.message || 'Send failed')
      setText(msg)
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const grouped = groupByDay(messages)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col" style={{ height: '100dvh' }}>
      <div className="px-4 pt-4 pb-2">
        <PlanningProjectBar />
        <h1 className="text-lg font-semibold text-white flex items-center gap-2 mt-3">
          <MessageCircle className="h-5 w-5 text-blue-400" />
          Team Chat
        </h1>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}

        {grouped.map((item) => {
          if (item.type === 'day') {
            return (
              <div key={item.key} className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-500 shrink-0">{item.label}</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
            )
          }
          const isOwn = item.sender_id === userId
          return (
            <div key={item.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
              <div className={`max-w-xs sm:max-w-md lg:max-w-lg rounded-2xl px-4 py-2.5 ${
                isOwn
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-slate-800 text-slate-100 rounded-bl-sm'
              }`}>
                {!isOwn && (
                  <p className="text-xs font-semibold text-blue-300 mb-0.5 font-mono">
                    {item.sender_id?.slice(0, 8)}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{item.message}</p>
                <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-slate-500'}`}>
                  {formatTime(item.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-950">
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder={projectId ? 'Type a message… (Enter to send)' : 'Select a project first'}
            disabled={!projectId || sending}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none disabled:opacity-50"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || !projectId || sending}
            className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white shrink-0"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
