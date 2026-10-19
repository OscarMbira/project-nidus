/**
 * v1272 — Ask Nidus conversation (PRD D10). Used by the floating widget and the full workspace in
 * Platform, Simulator and Planner. Reads the app and schema client from useAppConfig().
 *
 * Shows: AI access notice (consent / credits / kill switch), messages, live progress, result
 * tables (with export and Save as report), record search hits, help-doc excerpts, thumbs up/down.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Loader2, Send, ThumbsDown, ThumbsUp, User, BookOpen, Search } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import {
  AiBlockedError,
  askNidus,
  getAiStatus,
  getAiUiTexts,
  getAiUser,
  loadMessages,
  rateMessage,
  saveResultAsReport,
} from '@nidus/shared/services/askNidusService'
import Modal from '../Modal.jsx'
import AiAccessNotice from './AiAccessNotice.jsx'
import AiAnswerText from './AiAnswerText.jsx'
import AiResultTable from './AiResultTable.jsx'

function ResultBlock({ item, basePath, linksEnabled, compact, onSaveReport }) {
  if (item.kind === 'table') {
    return <AiResultTable result={item} basePath={basePath} linksEnabled={linksEnabled} compact={compact} onSaveReport={onSaveReport} />
  }
  if (item.kind === 'search') {
    if (!item.hits?.length) return null
    return (
      <div className="mt-2 rounded-lg border border-gray-200 p-2 dark:border-gray-700">
        <p className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300"><Search className="h-3.5 w-3.5" aria-hidden="true" /> Matching records</p>
        <ul className="space-y-1">
          {item.hits.slice(0, compact ? 5 : 20).map((h) => (
            <li key={`${h.entity_type}-${h.entity_id}`} className="text-xs text-gray-700 dark:text-gray-200">
              {linksEnabled && h.route_path ? (
                <Link to={basePath && !h.route_path.startsWith(basePath) ? `${basePath}${h.route_path}` : h.route_path} className="text-blue-600 hover:underline dark:text-blue-400">
                  {h.display_id ? `${h.display_id} · ` : ''}{h.title}
                </Link>
              ) : (
                <span>{h.display_id ? `${h.display_id} · ` : ''}{h.title}</span>
              )}
              <span className="text-gray-500 dark:text-gray-400"> — {h.entity_label || h.entity_type}{h.project_name ? `, ${h.project_name}` : ''}{h.matched === 'meaning' ? ' · similar meaning' : ''}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (item.kind === 'docs') {
    if (!item.excerpts?.length) return null
    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {item.excerpts.map((d, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <BookOpen className="h-3 w-3" aria-hidden="true" /> {d.title}
          </span>
        ))}
      </div>
    )
  }
  return null
}

export default function AskNidusChat({
  variant = 'widget',
  conversationId = null,
  onConversationChange = () => {},
  projectId = null,
  projectName = null,
  settingsPath = null,
  prefill = '',
  className = '',
}) {
  const { app, basePath, db } = useAppConfig()
  const compact = variant === 'widget'
  const linksEnabled = app !== 'planner'
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(null)
  const [texts, setTexts] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState(prefill || '')
  const [busy, setBusy] = useState(false)
  const [live, setLive] = useState(null) // { status, results, answer }
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState({})
  const [saving, setSaving] = useState(null) // { result, name }
  const { showSuccess, modal } = useSuccessModal()
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const activeConversation = useRef(conversationId)

  const refreshStatus = useCallback(() => getAiStatus(platformDb).then(setStatus).catch(() => setStatus(null)), [])

  useEffect(() => {
    let alive = true
    getAiUser(platformDb).then(async (u) => {
      if (!alive) return
      setUser(u)
      const [s, t] = await Promise.all([getAiStatus(platformDb).catch(() => null), getAiUiTexts(platformDb, u?.languageCode)])
      if (!alive) return
      setStatus(s)
      setTexts(t)
    })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (prefill) setInput(prefill)
  }, [prefill])

  useEffect(() => {
    // Ignore the id we just created ourselves mid-answer; load history for any other conversation.
    if (conversationId && conversationId === activeConversation.current && messages.length) return
    activeConversation.current = conversationId
    setLive(null)
    setError('')
    if (!conversationId) {
      setMessages([])
      return
    }
    loadMessages(db, conversationId).then(setMessages).catch(() => setMessages([]))
  }, [conversationId, db]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, live])

  const send = async (text) => {
    const question = String(text ?? input).trim()
    if (!question || busy) return
    setInput('')
    setError('')
    setBusy(true)
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: 'user', content: question }])
    const results = []
    let answerText = ''
    setLive({ status: 'Thinking…', results, answer: '' })
    try {
      const done = await askNidus({
        db,
        app,
        question,
        conversationId: activeConversation.current,
        projectId,
        projectName,
        onEvent: (ev) => {
          if (ev.type === 'status') setLive((l) => ({ ...l, status: ev.text }))
          if (ev.type === 'table') results.push({ kind: 'table', ...ev.result })
          if (ev.type === 'search') results.push({ kind: 'search', text: ev.text, hits: ev.hits })
          if (ev.type === 'docs') results.push({ kind: 'docs', excerpts: ev.excerpts })
          if (ev.type === 'table' || ev.type === 'search' || ev.type === 'docs') setLive((l) => ({ ...l, results: [...results] }))
          if (ev.type === 'answer') {
            answerText = ev.text
            setLive((l) => ({ ...l, answer: ev.text }))
          }
        },
      })
      setMessages((m) => [...m, {
        id: done?.message_id || `local-a-${Date.now()}`,
        role: 'assistant',
        content: answerText,
        structured_data: { results: [...results] },
      }])
      setLive(null)
      if (done?.conversation_id && done.conversation_id !== activeConversation.current) {
        activeConversation.current = done.conversation_id
        onConversationChange(done.conversation_id)
      }
      refreshStatus()
    } catch (err) {
      setLive(null)
      if (err instanceof AiBlockedError) {
        refreshStatus()
        setError(err.message)
      } else {
        setError(err?.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const rate = async (message, rating) => {
    if (!user?.authUserId || String(message.id).startsWith('local')) return
    setFeedback((f) => ({ ...f, [message.id]: rating }))
    try {
      await rateMessage(db, message.id, user.authUserId, rating)
    } catch {
      /* rating is best effort */
    }
  }

  const confirmSaveReport = async () => {
    if (!saving?.name?.trim()) return
    try {
      const saved = await saveResultAsReport(db, { name: saving.name.trim(), result: saving.result, ownerUserId: user?.userId })
      setSaving(null)
      showSuccess({ recordId: saved.template_name, subject: 'Report', operation: 'created', message: 'Saved to your reports. Open Report Builder to run, edit or share it.' })
    } catch (e) {
      setSaving((s) => ({ ...s, error: e?.message || 'Could not save the report.' }))
    }
  }

  const blocked = status && !status.allowed
  const placeholder = app === 'planner' ? 'Ask about your schedule, resources or dependencies…' : 'Ask about your projects…'

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className={`min-h-0 flex-1 overflow-y-auto ${compact ? 'px-3 py-3' : 'p-4'} space-y-3`}>
        <AiAccessNotice status={status} settingsPath={settingsPath} compact={compact} texts={texts} />

        {messages.length === 0 && !live && !blocked && (
          <div className="pt-4 text-center text-gray-500 dark:text-gray-400">
            <Bot className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden="true" />
            <p className="text-sm">Ask a question about your {app === 'simulator' ? 'practice ' : ''}data in plain words.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {String(texts?.[`suggestions_${app}`] || '').split('|').map((s) => s.trim()).filter(Boolean).map((s) => (
                <button key={s} type="button" onClick={() => send(s)}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role !== 'user' && <Bot className="mt-1 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />}
            <div className={`${m.role === 'user' ? 'max-w-[85%] rounded-2xl rounded-tr-sm bg-blue-600 px-3 py-2 text-sm text-white' : 'min-w-0 max-w-full flex-1'}`}>
              {m.role === 'user' ? <p className="whitespace-pre-wrap">{m.content}</p> : (
                <>
                  <AiAnswerText text={m.content} />
                  {(m.structured_data?.results || []).map((item, i) => (
                    <ResultBlock key={i} item={item} basePath={basePath} linksEnabled={linksEnabled} compact={compact}
                      onSaveReport={!compact && app !== 'planner' && item.kind === 'table' ? (r) => setSaving({ result: r, name: r.entity_label || '' }) : null} />
                  ))}
                  {!String(m.id).startsWith('local') && (
                    <div className="mt-1 flex gap-1">
                      <button type="button" aria-label="Helpful" title="Helpful" onClick={() => rate(m, 1)}
                        className={`rounded p-1 ${feedback[m.id] === 1 ? 'text-green-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}>
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" aria-label="Not helpful" title="Not helpful" onClick={() => rate(m, -1)}
                        className={`rounded p-1 ${feedback[m.id] === -1 ? 'text-red-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}>
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            {m.role === 'user' && <User className="mt-1 h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />}
          </div>
        ))}

        {live && (
          <div className="flex gap-2">
            <Bot className="mt-1 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              {live.answer ? <AiAnswerText text={live.answer} /> : (
                <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {live.status}
                </p>
              )}
              {live.results.map((item, i) => (
                <ResultBlock key={i} item={item} basePath={basePath} linksEnabled={linksEnabled} compact={compact} onSaveReport={null} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">{error}</p>
        )}
        <div ref={endRef} />
      </div>

      <div className={`border-t border-gray-200 dark:border-gray-700 ${compact ? 'px-3 pb-3 pt-2' : 'p-4'}`}>
        <div className="flex items-end gap-2">
          <label htmlFor={`ask-nidus-${variant}`} className="sr-only">Your question</label>
          <textarea
            id={`ask-nidus-${variant}`}
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={placeholder}
            rows={compact ? 1 : 2}
            maxLength={4000}
            disabled={busy || blocked}
            className="max-h-32 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <button type="button" onClick={() => send()} disabled={!input.trim() || busy || blocked} aria-label="Send question" title="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-center text-[11px] text-gray-400 dark:text-gray-500">
          Answers use only data you can already see. AI can make mistakes — check important figures.
        </p>
      </div>

      <Modal isOpen={Boolean(saving)} onClose={() => setSaving(null)} title="Save as report" size="sm"
        footer={(
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSaving(null)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">Cancel</button>
            <button type="button" onClick={confirmSaveReport} disabled={!saving?.name?.trim()} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
          </div>
        )}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="ask-nidus-report-name">Report name</label>
        <input id="ask-nidus-report-name" value={saving?.name || ''} onChange={(e) => setSaving((s) => ({ ...s, name: e.target.value, error: null }))} maxLength={200}
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{saving?.result?.explanation}</p>
        {saving?.error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{saving.error}</p>}
      </Modal>
      {modal}
    </div>
  )
}
