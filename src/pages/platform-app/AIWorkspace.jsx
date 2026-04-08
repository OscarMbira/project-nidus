/**
 * AI Workspace — full three-panel NotebookLM-style workspace at /platform/ai
 * Resumes conversation from ?conversation=<id> or last active.
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, MessageSquare, FileText, History } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { platformDb } from '../../services/supabase/supabaseClient'
import {
  getActiveConversation,
  loadMessages,
  listConversations,
  createConversation,
  switchConversation,
  sendMessage,
  getOrgAiSettings,
  updateConversationTitle,
} from '../../services/aiAssistantService'
import { getOrgIdForUser, getPrivacyNoticeText } from '../../services/aiSettingsService'
import AIChatMessage from '../../components/ai/AIChatMessage'
import AIWorkspaceSources from '../../components/ai/AIWorkspaceSources'

const TAB_CHAT = 'chat'
const TAB_SOURCES = 'sources'
const TAB_HISTORY = 'history'

export default function AIWorkspace() {
  const [searchParams] = useSearchParams()
  const conversationIdFromUrl = searchParams.get('conversation')

  const [user, setUser] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState('')
  const [orgId, setOrgId] = useState(null)
  const [aiDataMode, setAiDataMode] = useState('template')
  const [selectedMessageId, setSelectedMessageId] = useState(null)
  const [mobileTab, setMobileTab] = useState(TAB_CHAT)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!mounted || !u) return
      setUser(u)
      const projs = await platformDb.from('projects').select('id, project_name, project_code').eq('is_deleted', false).order('project_name').limit(50)
      setProjects(projs.data || [])
      const convList = await listConversations(u.id)
      setConversations(convList)
      const resolvedOrgId = await getOrgIdForUser(u.id)
      setOrgId(resolvedOrgId || null)
      if (resolvedOrgId) getOrgAiSettings(resolvedOrgId).then((s) => mounted && s && setAiDataMode(s.data_answer_mode || 'template'))

      if (conversationIdFromUrl) {
        await switchConversation(u.id, conversationIdFromUrl)
        setConversationId(conversationIdFromUrl)
        const msgs = await loadMessages(conversationIdFromUrl)
        if (mounted) setMessages(msgs)
        const conv = convList.find((c) => c.id === conversationIdFromUrl)
        if (conv?.project_id && mounted) setSelectedProject(conv.project_id)
      } else {
        const active = await getActiveConversation(u.id)
        if (active && mounted) {
          setConversationId(active.id)
          setSelectedProject(active.project_id || null)
          const msgs = await loadMessages(active.id)
          if (mounted) setMessages(msgs)
        } else {
          const { id: newId } = await createConversation(u.id, null)
          if (mounted && newId) setConversationId(newId)
        }
      }
    })()
    return () => { mounted = false }
  }, [conversationIdFromUrl])

  const handleSend = async () => {
    const question = inputValue.trim()
    if (!question || !user || !conversationId || isLoading) return
    setInputValue('')
    setError('')
    setIsLoading(true)
    const isFirstMessage = messages.length === 0
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: question, processed_by: null, created_at: new Date().toISOString() }])
    if (isFirstMessage) updateConversationTitle(conversationId, question)
    let finalContent = ''
    try {
      const result = await sendMessage({
        question,
        conversationId,
        userId: user.id,
        projectId: selectedProject,
        orgId: orgId ?? null,
        history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        onChunk: (partial) => { finalContent = partial; setStreamingText(partial) },
      })
      setStreamingText('')
      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: finalContent,
        processed_by: result?.engine ?? null,
        structured_data: result?.structured != null ? { modules: result.structured } : null,
        created_at: new Date().toISOString(),
      }])
      listConversations(user.id).then(setConversations)
    } catch (err) {
      setError(err?.message || 'Failed to send')
      setStreamingText('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectConversation = async (convId) => {
    if (!user) return
    await switchConversation(user.id, convId)
    setConversationId(convId)
    const msgs = await loadMessages(convId)
    setMessages(msgs)
    const c = conversations.find((x) => x.id === convId)
    setSelectedProject(c?.project_id || null)
  }

  const handleNewChat = async () => {
    if (!user) return
    const { id: newId } = await createConversation(user.id, selectedProject)
    if (newId) {
      setConversationId(newId)
      setMessages([])
      listConversations(user.id).then(setConversations)
    }
  }

  const selectedMessage = messages.find((m) => m.id === selectedMessageId)
  const sourcesData = selectedMessage?.structured_data
  const sourcesProcessedBy = selectedMessage?.processed_by

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Mobile tabs (Phase 3.6) */}
      <div className="lg:hidden flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {[
          { id: TAB_CHAT, label: 'Chat', Icon: MessageSquare },
          { id: TAB_SOURCES, label: 'Sources', Icon: FileText },
          { id: TAB_HISTORY, label: 'History', Icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileTab(tab.id)}
            className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 ${
              mobileTab === tab.id ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <tab.Icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left: history */}
        <aside className={`w-56 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col ${mobileTab === TAB_HISTORY ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleNewChat}
              title="Clear conversation and start a new chat"
              className="w-full py-2 px-3 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              + New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Conversations</p>
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectConversation(c.id)}
                className={`w-full text-left text-sm px-2 py-1.5 rounded mb-1 truncate ${
                  c.id === conversationId ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {c.title || 'New conversation'}
              </button>
            ))}
          </div>
        </aside>

        {/* Centre: chat */}
        <main className={`flex-1 flex flex-col min-w-0 ${mobileTab === TAB_CHAT ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <Bot className="w-5 h-5 text-blue-600" />
            <h1 className="font-semibold text-gray-800 dark:text-gray-100">AI Workspace</h1>
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="ml-4 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.project_code ? `[${p.project_code}] ` : ''}{p.project_name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!conversationId && <p className="text-sm text-gray-500">Loading…</p>}
            {messages.map((msg) => (
              <div
                key={msg.id}
                role="button"
                tabIndex={0}
                onClick={() => (msg.structured_data && (msg.processed_by === 'data' || msg.processed_by === 'local' || msg.processed_by === 'docs')) && setSelectedMessageId(msg.id)}
                onKeyDown={(e) => e.key === 'Enter' && (msg.structured_data && (msg.processed_by === 'data' || msg.processed_by === 'local' || msg.processed_by === 'docs')) && setSelectedMessageId(msg.id)}
                className={selectedMessageId === msg.id ? 'ring-1 ring-blue-500 rounded-lg -m-1 p-1' : ''}
              >
                <AIChatMessage message={msg} surface="workspace" conversationId={conversationId} />
              </div>
            ))}
            {streamingText && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
                {streamingText}<span className="inline-block w-1.5 h-3.5 bg-blue-500 ml-0.5 animate-pulse" />
              </div>
            )}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Ask a follow-up question..."
                rows={2}
                className="flex-1 resize-none text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100"
                disabled={isLoading || !conversationId}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading || !conversationId}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{getPrivacyNoticeText(aiDataMode)}</p>
          </div>
        </main>

        {/* Right: sources (Phase 3.4) */}
        <aside className={`w-72 shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col ${mobileTab === TAB_SOURCES ? 'flex' : 'hidden lg:flex'}`}>
          <AIWorkspaceSources structuredData={sourcesData} processedBy={sourcesProcessedBy} />
        </aside>
      </div>
    </div>
  )
}
