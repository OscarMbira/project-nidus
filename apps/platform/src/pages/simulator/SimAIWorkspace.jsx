/**
 * SimAIWorkspace.jsx (Phase 7.6)
 * Route: /simulator/ai. Uses sim schema only. ?debrief=<id> opens that debrief.
 * Three-panel layout; mobile: [Debrief] [Scores] [History] tabs. Ctrl+Shift+S shortcut.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import {
  getPastDebriefs,
  getDebriefById,
  getRunSummary,
} from '../../services/simAICoachService'
import SimAIWorkspaceHistory from '../../components/ai/SimAIWorkspaceHistory'
import SimAIWorkspaceDebrief from '../../components/ai/SimAIWorkspaceDebrief'
import SimAIWorkspaceScores from '../../components/ai/SimAIWorkspaceScores'

const TAB_DEBRIEF = 'debrief'
const TAB_SCORES = 'scores'
const TAB_HISTORY = 'history'

export default function SimAIWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const debriefIdFromUrl = searchParams.get('debrief')

  const [userId, setUserId] = useState(null)
  const [debriefs, setDebriefs] = useState([])
  const [selectedDebriefId, setSelectedDebriefId] = useState(null)
  const [selectedDebrief, setSelectedDebrief] = useState(null)
  const [runSummary, setRunSummary] = useState(null)
  const [mobileTab, setMobileTab] = useState(TAB_DEBRIEF)

  const loadDebriefs = useCallback(async (uid) => {
    if (!uid) return
    const list = await getPastDebriefs(uid)
    setDebriefs(list)
    if (list.length) {
      const first = debriefIdFromUrl ? list.find((d) => d.id === debriefIdFromUrl) : list[0]
      setSelectedDebriefId(first?.id ?? list[0].id)
    }
  }, [debriefIdFromUrl])

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await loadDebriefs(user.id)
    })()
  }, [loadDebriefs])


  useEffect(() => {
    if (!selectedDebriefId) {
      setSelectedDebrief(null)
      setRunSummary(null)
      return
    }
    (async () => {
      const d = await getDebriefById(selectedDebriefId)
      setSelectedDebrief(d)
      if (d?.run_id) {
        const run = await getRunSummary(d.run_id)
        setRunSummary(run)
      } else {
        setRunSummary(null)
      }
    })()
  }, [selectedDebriefId])

  const handleSelectDebrief = (id) => {
    setSelectedDebriefId(id)
    setSearchParams(id ? { debrief: id } : {})
  }

  const handleNewChat = () => {
    setSelectedDebriefId(null)
    setSelectedDebrief(null)
    setRunSummary(null)
    setSearchParams({})
  }

  const handleRunSelect = (runId) => {
    const d = debriefs.find((x) => x.run_id === runId)
    if (d) handleSelectDebrief(d.id)
  }

  const handleExportPdf = (content) => {
    if (!content) return
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Simulation Debrief</title></head><body style="font-family:sans-serif;max-width:640px;margin:24px;">
<h1>Simulation Debrief</h1>
${content.summary ? `<p>${content.summary}</p>` : ''}
${content.strengths?.length ? `<h2>Strengths</h2><ul>${content.strengths.map((s) => `<li>${s}</li>`).join('')}</ul>` : ''}
${content.improvements?.length ? `<h2>Areas to Improve</h2><ul>${content.improvements.map((i) => `<li>${i}</li>`).join('')}</ul>` : ''}
${content.topTip ? `<p><strong>Key takeaway:</strong> ${content.topTip}</p>` : ''}
</body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.onload = () => { w.print(); w.close() }
  }

  const handleExportWord = (content) => {
    if (!content) return
    const text = [
      'Simulation Debrief',
      '',
      content.summary || '',
      '',
      'Strengths',
      ...(content.strengths || []).map((s) => `• ${s}`),
      '',
      'Areas to Improve',
      ...(content.improvements || []).map((i) => `• ${i}`),
      '',
      content.topTip ? `Key takeaway: ${content.topTip}` : '',
    ].join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'simulation-debrief.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        window.location.href = '/simulator/ai'
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 bg-gray-800 shrink-0">
        <Bot className="w-6 h-6 text-purple-400" />
        <h1 className="font-semibold text-gray-100">Simulator AI Workspace</h1>
      </header>

      {/* Mobile tabs */}
      <div className="lg:hidden flex border-b border-gray-700 bg-gray-800">
        {[
          { id: TAB_DEBRIEF, label: 'Debrief' },
          { id: TAB_SCORES, label: 'Scores' },
          { id: TAB_HISTORY, label: 'History' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileTab(tab.id)}
            className={`flex-1 py-2 text-sm font-medium ${
              mobileTab === tab.id ? 'text-purple-400 border-b-2 border-purple-500' : 'text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left: History — hidden on mobile when another tab active */}
        <aside className={`w-56 shrink-0 flex-col border-r border-gray-700 ${mobileTab === TAB_HISTORY ? 'flex' : 'hidden lg:flex'}`}>
          <SimAIWorkspaceHistory
            debriefs={debriefs}
            selectedDebriefId={selectedDebriefId}
            onSelectDebrief={handleSelectDebrief}
            onNewChat={handleNewChat}
          />
        </aside>

        {/* Centre: Debrief */}
        <main className={`flex-1 min-w-0 flex flex-col ${mobileTab === TAB_DEBRIEF ? 'flex' : 'hidden lg:flex'}`}>
          <SimAIWorkspaceDebrief
            debrief={selectedDebrief}
            runId={selectedDebrief?.run_id}
            runSummary={runSummary}
            pastDebriefs={debriefs}
            onRunSelect={handleRunSelect}
            onExportPdf={handleExportPdf}
            onExportWord={handleExportWord}
          />
        </main>

        {/* Right: Scores */}
        <aside className={`w-72 shrink-0 border-l border-gray-700 ${mobileTab === TAB_SCORES ? 'flex flex-col' : 'hidden lg:flex flex-col'}`}>
          <SimAIWorkspaceScores runId={selectedDebrief?.run_id} runSummary={runSummary} />
        </aside>
      </div>
    </div>
  )
}
