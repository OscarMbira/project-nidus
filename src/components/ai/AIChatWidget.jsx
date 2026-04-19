import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, X, Plus, History, Send, ChevronLeft, Loader2, ExternalLink } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { platformDb } from '../../services/supabase/supabaseClient'
import {
  getActiveConversation,
  loadMessages,
  listConversations,
  createConversation,
  switchConversation,
  saveMessage,
  sendMessage,
  getOrgAiSettings,
  updateConversationTitle,
} from '../../services/aiAssistantService'
import { getOrgIdForUser, getPrivacyNoticeText } from '../../services/aiSettingsService'
import AIChatMessage from './AIChatMessage'
import AISuggestedQuestions from './AISuggestedQuestions'

export default function AIChatWidget() {
  const [isOpen,         setIsOpen]         = useState(false)
  const [showHistory,    setShowHistory]     = useState(false)
  const [messages,       setMessages]        = useState([])
  const [streamingText,  setStreamingText]   = useState('')
  const [inputValue,     setInputValue]      = useState('')
  const [isLoading,      setIsLoading]       = useState(false)
  const [conversationId, setConversationId]  = useState(null)
  const [conversations,  setConversations]   = useState([])
  const [projects,       setProjects]        = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [user,           setUser]            = useState(null)
  const [userInfo,       setUserInfo]        = useState({})
  const [error,          setError]           = useState('')
  const [statusText,     setStatusText]      = useState('')   // phase feedback during AI call
  const [waitingSeconds, setWaitingSeconds]  = useState(0)    // seconds in "Waiting for AI…" (for progressive hint)
  const [orgId,          setOrgId]           = useState(null)
  const [aiDataMode,     setAiDataMode]      = useState('template')

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const initPromiseRef = useRef(null)
  const navigate       = useNavigate()
  const messagePairCount = Math.floor(messages.filter((m) => m.role === 'assistant').length)

  // ── Init on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    initWidget()
  }, [isOpen])

  // Phase 6.3: "Ask about this" from AIInsightsPanel opens widget with question pre-filled
  useEffect(() => {
    const handler = (e) => {
      const question = e.detail?.question
      if (typeof question === 'string' && question.trim()) {
        setInputValue(question.trim())
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
    window.addEventListener('ai-widget-prefill', handler)
    return () => window.removeEventListener('ai-widget-prefill', handler)
  }, [])

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Progressive hint: after 8s in "Waiting for AI…" or 6s in "Gathering context…", show friendlier message
  useEffect(() => {
    if (statusText !== 'Waiting for AI…' && statusText !== 'Gathering context…') {
      setWaitingSeconds(0)
      return
    }
    setWaitingSeconds(0)
    const interval = setInterval(() => {
      setWaitingSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [statusText])

  const displayStatus =
    (statusText === 'Waiting for AI…' && waitingSeconds >= 8)
      ? 'Generating answer…'
      : (statusText === 'Gathering context…' && waitingSeconds >= 6)
        ? 'Querying your data…'
        : statusText

  /**
   * Loads auth, projects, and active conversation. Returns { user, conversationId } for callers
   * that need IDs before React state updates (e.g. send before state flush). In-flight calls share one promise.
   */
  const initWidget = async () => {
    if (initPromiseRef.current) {
      return initPromiseRef.current
    }
    const run = (async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authUser) {
        setError('Not authenticated. Please log in and try again.')
        return null
      }
      setUser(authUser)

      const [userData, projs, conv, resolvedOrgId] = await Promise.all([
        platformDb.from('users').select('full_name').eq('auth_user_id', authUser.id).maybeSingle(),
        platformDb.from('projects').select('id, project_name, project_code')
          .eq('is_deleted', false).order('project_name').limit(20),
        getActiveConversation(authUser.id),
        getOrgIdForUser(authUser.id),
      ])
      setOrgId(resolvedOrgId || null)
      if (resolvedOrgId) {
        getOrgAiSettings(resolvedOrgId).then((s) => setAiDataMode(s?.data_answer_mode || 'template'))
      }

      setUserInfo({ userName: userData?.data?.full_name || authUser.email, orgName: 'Organisation', role: 'Project Manager' })
      setProjects(projs.data || [])

      let finalConversationId = null

      if (conv) {
        finalConversationId = conv.id
        setConversationId(conv.id)
        setSelectedProject(conv.project_id || null)
        const [msgs, convList] = await Promise.all([
          loadMessages(conv.id),
          listConversations(authUser.id),
        ])
        setMessages(msgs)
        setConversations(convList)
      } else {
        const { id: newId, error: convErr } = await createConversation(authUser.id, null)
        if (!newId) {
          const detail = convErr ? ` DB error ${convErr.code}: ${convErr.message}` : ' (unknown error)'
          setError(`AI session could not be created.${detail} — Run SQL/v326_ai_diagnostic.sql in Supabase to fix.`)
          return null
        }
        finalConversationId = newId
        setConversationId(newId)
        setMessages([])
        listConversations(authUser.id).then(setConversations)
      }

      return { user: authUser, conversationId: finalConversationId }
    })()

    initPromiseRef.current = run
    try {
      return await run
    } finally {
      initPromiseRef.current = null
    }
  }

  // ── New conversation ──────────────────────────────────────────────────────
  const handleNewConversation = async () => {
    if (!user) return
    const { id: newId } = await createConversation(user.id, selectedProject)
    if (!newId) return
    setConversationId(newId)
    setMessages([])
    setStreamingText('')
    setShowHistory(false)
    inputRef.current?.focus()
    // Refresh list
    const convList = await listConversations(user.id)
    setConversations(convList)
  }

  // ── Switch conversation ───────────────────────────────────────────────────
  const handleSwitchConversation = async (convId) => {
    await switchConversation(user.id, convId)
    setConversationId(convId)
    const msgs = await loadMessages(convId)
    setMessages(msgs)
    setStreamingText('')
    setShowHistory(false)
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (questionOverride) => {
    const question = (questionOverride || inputValue).trim()
    if (!question || isLoading) return

    let effectiveUser = user
    let effectiveConversationId = conversationId
    if (!effectiveUser || !effectiveConversationId) {
      setError('')
      const session = await initWidget()
      effectiveUser = session?.user ?? user
      effectiveConversationId = session?.conversationId ?? conversationId
    }
    if (!effectiveUser || !effectiveConversationId) {
      setError((prev) => prev || 'AI Assistant is not ready. Please refresh the page and try again.')
      return
    }

    setInputValue('')
    setError('')
    setIsLoading(true)
    setStatusText('Sending…')

    // Show user message instantly — no waiting for DB
    const tmpId = `tmp-${Date.now()}`
    const userMsg = { id: tmpId, role: 'user', content: question, processed_by: null, created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])

    // Persist user message fire-and-forget (don't block AI call)
    saveMessage(effectiveConversationId, 'user', question).then((savedId) => {
      if (savedId) setMessages((prev) => prev.map((m) => m.id === tmpId ? { ...m, id: savedId } : m))
    })
    // Phase 5.2: auto-title from first message (truncate to 50 chars)
    if (messages.length === 0) updateConversationTitle(effectiveConversationId, question)

    // History snapshot (before new message) — last 10 for context (Phase 5.1)
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))

    try {
      let finalContent = ''
      const result = await sendMessage({
        question,
        conversationId: effectiveConversationId,
        userId:    effectiveUser.id,
        projectId: selectedProject,
        orgId:     orgId ?? null,
        userInfo,
        history,
        onStatus:  (phase) => setStatusText(phase),
        onChunk:   (partial) => {
          finalContent = partial
          setStreamingText(partial)
          setStatusText('') // clear phase label once tokens arrive
        },
      })

      // Commit streamed response to local state — no DB reload needed
      setMessages((prev) => [...prev, {
        id:               `ai-${Date.now()}`,
        role:             'assistant',
        content:          finalContent,
        processed_by:     result?.engine || null,
        structured_data:  result?.structured ?? null,
        context_modules:  result?.modules ?? [],
        created_at:       new Date().toISOString(),
      }])
      setStreamingText('')
      setStatusText('')

      // Update conversation title lazily (non-blocking)
      listConversations(effectiveUser.id).then(setConversations)
    } catch (err) {
      const raw = err?.message ?? ''
      const friendly = /bodystreambuffer|aborted|timeout/i.test(raw)
        ? 'The AI response was interrupted (timeout or connection closed). You can try again.'
        : (raw || 'Could not reach the AI. Check your Gemini API key in .env or try again.')
      setError(friendly)
      setStreamingText('')
      setStatusText('')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg items-center justify-center transition-all duration-200 ${isOpen ? 'hidden' : 'flex'}`}
        title="Open AI Assistant"
      >
        <Bot className="w-6 h-6" />
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1 rounded hover:bg-blue-700 transition-colors"
                title="Conversation history"
              >
                <History className="w-4 h-4" />
              </button>
              <Bot className="w-5 h-5" />
              <span className="font-semibold text-sm">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleNewConversation}
                className="p-1 rounded hover:bg-blue-700 transition-colors"
                title="New conversation"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-blue-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Project selector */}
          <div className="px-3 pt-2 pb-1 border-b border-gray-100 dark:border-gray-700">
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="w-full text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code ? `[${p.project_code}] ` : ''}{p.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden">
            {/* History sidebar */}
            {showHistory && (
              <div className="w-44 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex-shrink-0">
                <div className="p-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">History</p>
                  {conversations.length === 0 && (
                    <p className="text-xs text-gray-400">No conversations yet</p>
                  )}
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSwitchConversation(c.id)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded mb-1 truncate transition-colors ${
                        c.id === conversationId
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {c.title || 'New conversation'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-3 py-3">
                {!conversationId && !error && (
                  <div className="mx-2 mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>Loading…</span>
                  </div>
                )}
                {messages.length === 0 && !streamingText && conversationId && (
                  <div className="mt-6 px-1">
                    <div className="text-center text-gray-400 dark:text-gray-500">
                      <Bot className="w-8 h-8 mx-auto mb-1 opacity-40" />
                      <p className="text-sm">Ask me anything — data from your projects or general PM knowledge.</p>
                    </div>
                  </div>
                )}
                {messages.map((msg) => (
                  <AIChatMessage key={msg.id} message={msg} surface="widget" conversationId={conversationId} />
                ))}
                {/* Streaming indicator */}
                {streamingText && (
                  <div className="flex justify-start mb-3">
                    <div className="max-w-[85%] bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                      {streamingText}
                      <span className="inline-block w-1.5 h-3.5 bg-blue-500 ml-0.5 animate-pulse" />
                    </div>
                  </div>
                )}
                {isLoading && !streamingText && (
                  <div className="flex justify-start mb-3">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400 flex-shrink-0" />
                      {displayStatus && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{displayStatus}</span>
                      )}
                    </div>
                  </div>
                )}
                {error && (
                  <div className="mx-3 mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested questions — only when session is ready */}
              {messages.length === 0 && !streamingText && conversationId && (
                <AISuggestedQuestions onSelect={(q) => handleSend(q)} />
              )}

              {/* Input */}
              <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your projects..."
                    rows={1}
                    className="flex-1 resize-none text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-24 overflow-y-auto"
                    style={{ minHeight: '38px' }}
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || isLoading || !conversationId}
                    className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white flex items-center justify-center transition-colors"
                    title={!conversationId ? 'Loading…' : 'Send message'}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                {/* Continue in workspace banner (after 3 exchanges) */}
                {messagePairCount >= 3 && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">
                      Continue this conversation in the AI Workspace for full sources and history.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(conversationId ? `/platform/ai?conversation=${encodeURIComponent(conversationId)}` : '/platform/ai')}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Open in AI Workspace <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {/* Phase 5.6: Clear conversation + Open in workspace */}
                <div className="mt-1.5 flex items-center justify-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleNewConversation}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Clear conversation
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(conversationId ? `/platform/ai?conversation=${encodeURIComponent(conversationId)}` : '/platform/ai')}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in AI Workspace
                  </button>
                </div>
                {/* Privacy notice (Phase 4.3 — dynamic per mode) */}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
                  {getPrivacyNoticeText(aiDataMode)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
