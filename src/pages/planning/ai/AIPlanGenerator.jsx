import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import { platformDb } from '../../../services/supabase/supabaseClient'
import * as api from '../../../services/planAIService'
import * as simApi from '../../../services/sim/simPlanAIService'

const TEMPLATES = ['software', 'banking', 'infrastructure', 'construction', 'product_launch', 'consulting']

export default function AIPlanGenerator() {
  const { pathname } = useLocation()
  const isSim = pathname.includes('/simulator/')
  const projectId = usePlanningProjectId()
  const [prompt, setPrompt] = useState('')
  const [industry, setIndustry] = useState('software')
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (!projectId || !prompt.trim()) {
      toast.error('Select a project and enter a prompt.')
      return
    }
    setBusy(true)
    try {
      const {
        data: { user },
      } = await platformDb.auth.getUser()
      if (isSim) {
        await simApi.generatePlan({
          prompt: prompt.trim(),
          industryTemplate: industry,
          practiceProjectId: projectId,
          authUserId: user?.id ?? null,
        })
      } else {
        const { data: proj } = await platformDb.from('projects').select('organisation_id').eq('id', projectId).single()
        await api.generatePlan({
          prompt: prompt.trim(),
          industryTemplate: industry,
          projectId,
          organisationId: proj.organisation_id,
          createdByProfileId: null,
        })
      }
      toast.success('AI session saved — review generated content in project history.')
      setPrompt('')
    } catch (e) {
      toast.error(e?.message || 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-2">AI plan generator</h1>
        <PlanningProjectBar isSim={isSim} />
        <p className="text-gray-500 text-sm mt-2">
          Uses Edge Function <code className="text-gray-400">plan-ai-generate</code> when deployed. Sessions are stored for review.
        </p>
        {!projectId && <p className="text-amber-400/90 text-sm mt-4">Select a project.</p>}
        {projectId && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Industry template</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2"
              >
                {TEMPLATES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Describe the plan you need</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="w-full rounded-lg bg-gray-900 border border-gray-600 px-3 py-2 text-sm"
                placeholder="E.g. Phase 1 design, Phase 2 build, key milestones for go-live…"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={run}
              className="rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 text-sm"
            >
              {busy ? 'Working…' : 'Generate & save session'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
