import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Shield, FileEdit, ArrowLeft, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getTeamCharter } from '../../services/teamCharterService'

function Section({ title, content }) {
  if (!content) return null
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700 bg-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      <div className="px-5 py-4 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{content}</div>
    </div>
  )
}

export default function TeamCharterPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [charter, setCharter] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    ;(async () => {
      setLoading(true)
      try {
        const data = await getTeamCharter(projectId)
        setCharter(data)
      } catch (e) {
        toast.error(e?.message || 'Failed to load team charter')
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 min-h-[40px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              Team Charter
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/platform/projects/${projectId}/team-charter/edit`)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-sm font-medium text-white min-h-[40px]"
          >
            <FileEdit className="h-4 w-4" />
            {charter ? 'Edit Charter' : 'Create Charter'}
          </button>
        </div>

        {!charter ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No team charter has been created yet.</p>
            <p className="text-slate-500 text-xs mt-1">A Team Lead or Project Manager can create the charter.</p>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 px-6 py-5">
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wide mb-1">Team Charter</p>
              <h2 className="text-xl font-bold text-white">{charter.title}</h2>
              <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                charter.status === 'active'
                  ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                  : charter.status === 'draft'
                  ? 'bg-amber-900/40 text-amber-300 border-amber-700'
                  : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}>
                {charter.status}
              </span>
            </div>

            <Section title="Purpose" content={charter.purpose} />
            <Section title="Objectives" content={charter.objectives} />
            <Section title="Team Values" content={charter.values} />
            <Section title="Ways of Working" content={charter.ways_of_working} />
            <Section title="Team Norms" content={charter.norms} />
            <Section title="Communication Plan" content={charter.communication_plan} />
            <Section title="RACI Notes" content={charter.raci_notes} />
          </>
        )}
      </div>
    </div>
  )
}
