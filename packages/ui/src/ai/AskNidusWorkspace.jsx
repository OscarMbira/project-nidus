/**
 * v1272 — Ask Nidus workspace (full page, PRD D10): conversation history, wide result tables with
 * export and Save as report, and a project scope picker. Resumes ?conversation=<id>.
 * Replaces the per-app AIWorkspace copies. Theme-aware, phone-friendly (history becomes a toggle).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Bot, History, Plus, Trash2 } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'
import { useCurrentProject } from '@nidus/shared/hooks/useCurrentProject'
import { deleteConversation, getAiUser, listConversations } from '@nidus/shared/services/askNidusService'
import AskNidusChat from './AskNidusChat.jsx'

export default function AskNidusWorkspace({ settingsPath = null, showBack = false }) {
  const { app, db } = useAppConfig()
  const navigate = useNavigate()
  const { currentProjectId } = useCurrentProject()
  const [params, setParams] = useSearchParams()
  const conversationId = params.get('conversation')
  const [user, setUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(app === 'simulator' ? null : currentProjectId || null)
  const [showHistory, setShowHistory] = useState(false)

  const refresh = (u = user) => {
    if (u) listConversations(db, u.authUserId).then(setConversations).catch(() => setConversations([]))
  }

  useEffect(() => {
    let alive = true
    Promise.all([
      getAiUser(platformDb),
      db.from('ai_v_projects').select('id, display_id, project_name').eq('is_archived', false).order('project_name').limit(300),
    ]).then(([u, projs]) => {
      if (!alive) return
      setUser(u)
      setProjects(projs.data || [])
      refresh(u)
    })
    return () => { alive = false }
  }, [db]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectConversation = (id) => {
    const next = new URLSearchParams(params)
    if (id) next.set('conversation', id)
    else next.delete('conversation')
    setParams(next, { replace: true })
    setShowHistory(false)
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    await deleteConversation(db, id)
    if (id === conversationId) selectConversation(null)
    refresh()
  }

  const selectedProject = projects.find((p) => p.id === projectId)

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[480px] flex-col bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        {showBack && (
          <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        <button type="button" onClick={() => setShowHistory((s) => !s)} className="rounded p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden" aria-label="Conversations">
          <History className="h-5 w-5" />
        </button>
        <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ask Nidus</h1>
        {app !== 'planner' || projects.length > 1 ? (
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="ask-nidus-project" className="text-sm text-gray-600 dark:text-gray-300">Scope</label>
            <select
              id="ask-nidus-project"
              value={projectId || ''}
              onChange={(e) => setProjectId(e.target.value || null)}
              className="max-w-[260px] rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">All my projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.display_id ? `${p.display_id} — ` : ''}{p.project_name}</option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className={`${showHistory ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:flex lg:w-64`}>
          <div className="border-b border-gray-200 p-3 dark:border-gray-700">
            <button type="button" onClick={() => selectConversation(null)} className="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" /> New conversation
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 && <p className="px-2 text-sm text-gray-500 dark:text-gray-400">No conversations yet.</p>}
            {conversations.map((c) => (
              <div key={c.id} className={`group mb-1 flex items-center rounded ${c.id === conversationId ? 'bg-blue-50 dark:bg-blue-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                <button type="button" onClick={() => selectConversation(c.id)} className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm text-gray-700 dark:text-gray-200">
                  {c.title || 'Conversation'}
                </button>
                <button type="button" onClick={() => remove(c.id)} className="p-1.5 text-gray-400 opacity-0 hover:text-red-600 group-hover:opacity-100 focus:opacity-100" aria-label="Delete conversation" title="Delete conversation">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <main className={`${showHistory ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col bg-white dark:bg-gray-900 lg:flex`}>
          <AskNidusChat
            variant="workspace"
            conversationId={conversationId}
            onConversationChange={(id) => { selectConversation(id); refresh() }}
            projectId={projectId}
            projectName={selectedProject?.project_name || null}
            settingsPath={settingsPath}
          />
        </main>
      </div>
    </div>
  )
}
