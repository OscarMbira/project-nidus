/**
 * v1272 — Ask Nidus floating widget (PRD D10): quick questions from any page, aware of the
 * current project. Replaces the per-app AIChatWidget copies. Mounted once per app layout.
 *
 * Opens pre-filled from anywhere via:
 *   window.dispatchEvent(new CustomEvent('ai-widget-prefill', { detail: { question } }))
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, ExternalLink, History, Plus, X } from 'lucide-react'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'
import { useCurrentProject } from '@nidus/shared/hooks/useCurrentProject'
import { listConversations, getAiUser } from '@nidus/shared/services/askNidusService'
import { platformDb } from '@nidus/supabase'
import AskNidusChat from './AskNidusChat.jsx'

const storageKey = (app) => `nidus:askNidus:conversation:${app}`

function readStored(app) {
  try {
    return sessionStorage.getItem(storageKey(app)) || null
  } catch {
    return null
  }
}

function writeStored(app, id) {
  try {
    if (id) sessionStorage.setItem(storageKey(app), id)
    else sessionStorage.removeItem(storageKey(app))
  } catch {
    /* storage unavailable */
  }
}

export default function AskNidusWidget({ workspacePath, settingsPath }) {
  const { app, db } = useAppConfig()
  const { currentProjectId, currentProject } = useCurrentProject()
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState(() => readStored(app))
  const [prefill, setPrefill] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    const onPrefill = (e) => {
      const q = e.detail?.question
      if (typeof q === 'string' && q.trim()) {
        setPrefill(q.trim())
        setOpen(true)
      }
    }
    window.addEventListener('ai-widget-prefill', onPrefill)
    return () => window.removeEventListener('ai-widget-prefill', onPrefill)
  }, [])

  const changeConversation = (id) => {
    setConversationId(id)
    writeStored(app, id)
  }

  const toggleHistory = async () => {
    const next = !showHistory
    setShowHistory(next)
    if (next) {
      const u = await getAiUser(platformDb)
      if (u) listConversations(db, u.authUserId, 15).then(setHistory).catch(() => setHistory([]))
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 right-4 z-40 h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 ${open ? 'hidden' : 'flex'}`}
        title="Ask Nidus"
        aria-label="Open Ask Nidus"
      >
        <Bot className="h-6 w-6" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Ask Nidus"
          className="fixed inset-x-2 bottom-2 z-50 flex h-[85vh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[620px] sm:w-[420px]"
        >
          <div className="flex items-center justify-between bg-blue-600 px-3 py-2.5 text-white">
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleHistory} className="rounded p-1 hover:bg-blue-700" title="Recent conversations" aria-label="Recent conversations">
                <History className="h-4 w-4" />
              </button>
              <Bot className="h-5 w-5" aria-hidden="true" />
              <div className="leading-tight">
                <p className="text-sm font-semibold">Ask Nidus</p>
                {currentProjectId && currentProject?.project_name && (
                  <p className="max-w-[200px] truncate text-[11px] text-blue-100">About: {currentProject.project_name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => changeConversation(null)} className="rounded p-1 hover:bg-blue-700" title="New conversation" aria-label="New conversation">
                <Plus className="h-4 w-4" />
              </button>
              {workspacePath && (
                <Link
                  to={conversationId ? `${workspacePath}?conversation=${encodeURIComponent(conversationId)}` : workspacePath}
                  onClick={() => setOpen(false)}
                  className="rounded p-1 hover:bg-blue-700"
                  title="Open in workspace"
                  aria-label="Open in workspace"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              )}
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 hover:bg-blue-700" title="Close" aria-label="Close Ask Nidus">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-2">
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Recent conversations</p>
              {history.length === 0 && <p className="px-1 text-sm text-gray-500 dark:text-gray-400">No conversations yet.</p>}
              {history.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { changeConversation(c.id); setShowHistory(false) }}
                  className={`mb-1 block w-full truncate rounded px-2 py-1.5 text-left text-sm ${c.id === conversationId ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'}`}
                >
                  {c.title || 'Conversation'}
                </button>
              ))}
            </div>
          ) : (
            <AskNidusChat
              variant="widget"
              conversationId={conversationId}
              onConversationChange={changeConversation}
              projectId={app === 'simulator' ? null : currentProjectId}
              projectName={currentProject?.project_name || null}
              settingsPath={settingsPath}
              prefill={prefill}
            />
          )}
        </div>
      )}
    </>
  )
}
