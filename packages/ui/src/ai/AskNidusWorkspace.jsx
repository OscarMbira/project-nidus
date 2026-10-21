/**
 * v1272 — Ask Nidus workspace (full page, PRD D10): conversation history, wide result tables with
 * export and Save as report, and the project scope. Resumes ?conversation=<id>.
 * Replaces the per-app AIWorkspace copies. Theme-aware, phone-friendly (history becomes a toggle).
 *
 * v1294 (Platform): the scope is the header project — no second project list here. Multi-project
 * roles (PMO, Project/Programme/Portfolio Managers) get a "This project | All my projects" toggle;
 * everyone else always works on their header project (preselected when they have only one).
 * public.ai_project_scope decides what each role may use, and agent-run enforces it.
 * Simulator and Planner keep their own project picker (they have no header project selector).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Bot, History, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import { useAppConfig } from '@nidus/shared/context/AppConfigContext'
import { useCurrentProject } from '@nidus/shared/hooks/useCurrentProject'
import { deleteConversation, getAiUser, listConversations } from '@nidus/shared/services/askNidusService'
import AskNidusChat from './AskNidusChat.jsx'

// Desktop conversation list: hide/show and drag to resize; remembered per browser (a convenience,
// so plain localStorage, guarded — private windows can refuse it).
const HISTORY_HIDDEN_KEY = 'nidus:askNidus:historyHidden'
const HISTORY_WIDTH_KEY = 'nidus:askNidus:historyWidth'
const HISTORY_MIN = 180
const HISTORY_MAX = 480
const HISTORY_DEFAULT = 256
const clampWidth = (w) => Math.min(HISTORY_MAX, Math.max(HISTORY_MIN, Math.round(Number(w) || HISTORY_DEFAULT)))
function readPref(key) {
  try { return window.localStorage.getItem(key) } catch { return null }
}
function writePref(key, value) {
  try { window.localStorage.setItem(key, String(value)) } catch { /* not stored */ }
}

export default function AskNidusWorkspace({ settingsPath = null, showBack = false }) {
  const { app, db } = useAppConfig()
  const navigate = useNavigate()
  const { currentProjectId, currentProject } = useCurrentProject()
  const [params, setParams] = useSearchParams()
  const conversationId = params.get('conversation')
  const [user, setUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [projects, setProjects] = useState([])
  const [pickedProjectId, setPickedProjectId] = useState(null)
  const [showHistory, setShowHistory] = useState(false) // phones: list replaces the chat
  const [historyHidden, setHistoryHidden] = useState(() => readPref(HISTORY_HIDDEN_KEY) === '1') // desktop
  const [historyWidth, setHistoryWidth] = useState(() => clampWidth(readPref(HISTORY_WIDTH_KEY) || HISTORY_DEFAULT))

  const toggleHistoryHidden = () => setHistoryHidden((h) => { writePref(HISTORY_HIDDEN_KEY, h ? '0' : '1'); return !h })
  const setWidth = (w) => { const next = clampWidth(w); setHistoryWidth(next); writePref(HISTORY_WIDTH_KEY, next) }

  const startResize = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = historyWidth
    const move = (ev) => setHistoryWidth(clampWidth(startWidth + ev.clientX - startX))
    const up = (ev) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setWidth(startWidth + ev.clientX - startX)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const followsHeader = app === 'platform'
  const [scopeInfo, setScopeInfo] = useState(null) // ai_project_scope(): can_choose_all, default_project_id
  const [scopeAll, setScopeAll] = useState(false)

  const refresh = (u = user) => {
    if (u) listConversations(db, u.authUserId).then(setConversations).catch(() => setConversations([]))
  }

  useEffect(() => {
    let alive = true
    Promise.all([
      getAiUser(platformDb),
      followsHeader
        ? Promise.resolve({ data: [] })
        : db.from('ai_v_projects').select('id, display_id, project_name').eq('is_archived', false).order('project_name').limit(300),
    ]).then(([u, projs]) => {
      if (!alive) return
      setUser(u)
      setProjects(projs.data || [])
      refresh(u)
    })
    return () => { alive = false }
  }, [db]) // eslint-disable-line react-hooks/exhaustive-deps

  // v1294: what this user may choose, for the header project.
  useEffect(() => {
    if (!followsHeader) return
    let alive = true
    platformDb.rpc('ai_project_scope', { p_project_id: currentProjectId || null, p_all: false })
      .then(({ data }) => {
        if (!alive) return
        setScopeInfo(data || null)
        // No project to focus on (e.g. PMO outside a project): start on "All my projects".
        if (data?.can_choose_all && !data?.default_project_id) setScopeAll(true)
      })
    return () => { alive = false }
  }, [followsHeader, currentProjectId])

  const headerProjectId = currentProjectId || scopeInfo?.default_project_id || null
  const projectId = followsHeader ? (scopeAll ? null : headerProjectId) : pickedProjectId
  const canChooseAll = followsHeader && !!scopeInfo?.can_choose_all

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

  const projectName = followsHeader
    ? (projectId && projectId === currentProjectId ? currentProject?.projectName || null : null)
    : projects.find((p) => p.id === projectId)?.project_name || null
  const toggleCls = (on) => `px-3 py-1 text-sm font-medium ${on
    ? 'bg-blue-600 text-white'
    : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'} disabled:opacity-50`

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
        <button type="button" onClick={toggleHistoryHidden}
          className="hidden rounded p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 lg:inline-flex"
          aria-label={historyHidden ? 'Show conversations' : 'Hide conversations'} title={historyHidden ? 'Show conversations' : 'Hide conversations'}
          aria-expanded={!historyHidden}>
          {historyHidden ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
        <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ask Nidus</h1>
        {canChooseAll && (
          <div className="ml-auto inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600" role="group" aria-label="What Ask Nidus looks at">
            <button type="button" onClick={() => setScopeAll(false)} disabled={!headerProjectId} aria-pressed={!scopeAll}
              title={headerProjectId ? 'Only the project selected in the header' : 'Choose a project in the header first'}
              className={toggleCls(!scopeAll)}>
              This project
            </button>
            <button type="button" onClick={() => setScopeAll(true)} aria-pressed={scopeAll}
              title={scopeInfo?.org_wide ? 'Every project in your organisation' : 'All the projects you are assigned to'}
              className={`${toggleCls(scopeAll)} border-l border-gray-300 dark:border-gray-600`}>
              All my projects
            </button>
          </div>
        )}
        {!followsHeader && (app !== 'planner' || projects.length > 1) ? (
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="ask-nidus-project" className="text-sm text-gray-600 dark:text-gray-300">Scope</label>
            <select
              id="ask-nidus-project"
              value={pickedProjectId || ''}
              onChange={(e) => setPickedProjectId(e.target.value || null)}
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
        <aside
          style={{ '--ask-history-w': `${historyWidth}px` }}
          className={`${showHistory ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${historyHidden ? 'lg:hidden' : 'lg:flex'} lg:w-[var(--ask-history-w)]`}>
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
        {!historyHidden && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize conversations"
            aria-valuemin={HISTORY_MIN}
            aria-valuemax={HISTORY_MAX}
            aria-valuenow={historyWidth}
            tabIndex={0}
            title="Drag to resize · double-click to reset"
            onPointerDown={startResize}
            onDoubleClick={() => setWidth(HISTORY_DEFAULT)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') { e.preventDefault(); setWidth(historyWidth - 16) }
              if (e.key === 'ArrowRight') { e.preventDefault(); setWidth(historyWidth + 16) }
            }}
            className="hidden w-1.5 shrink-0 cursor-col-resize touch-none bg-transparent hover:bg-blue-400/60 focus:bg-blue-500/60 focus:outline-none lg:block"
          />
        )}

        <main className={`${showHistory ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col bg-white dark:bg-gray-900 lg:flex`}>
          <AskNidusChat
            variant="workspace"
            conversationId={conversationId}
            onConversationChange={(id) => { selectConversation(id); refresh() }}
            projectId={projectId}
            projectName={projectName}
            scopeAll={followsHeader && scopeAll}
            settingsPath={settingsPath}
          />
        </main>
      </div>
    </div>
  )
}
