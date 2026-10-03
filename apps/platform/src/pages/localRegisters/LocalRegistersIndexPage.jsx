/**
 * Local Register Engine — context-aware entry point (v931 PRD decision 7). Lists registers
 * visible at the current scope, reached via scopeLevel/scopeEntityId/scopeLabel query params
 * (e.g. linked from a project's own space with ?scopeLevel=project&scopeEntityId=<id>).
 *
 * v1 simplification: shows registers at the given scope level/entity plus all pmo-level (org-
 * wide) registers — does not yet resolve a project's parent programme/portfolio chain to also
 * surface programme-/portfolio-level registers "reaching down" to it. Flagged in the plan as a
 * follow-up, not attempted here to keep this pass bounded.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, FolderKanban } from 'lucide-react'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { listRegistersForScope } from '../../services/localRegisterService'

export default function LocalRegistersIndexPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scopeLevel = searchParams.get('scopeLevel') || 'pmo'
  const scopeEntityId = searchParams.get('scopeEntityId') || null
  const scopeLabel = searchParams.get('scopeLabel') || ''

  const [loading, setLoading] = useState(true)
  const [registers, setRegisters] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const accountId = await getCurrentUserAccountId()
      if (!accountId) { setLoading(false); return }

      const queries = [listRegistersForScope({ scopeLevel: 'pmo', accountId })]
      if (scopeLevel !== 'pmo') {
        queries.push(listRegistersForScope({ scopeLevel, scopeEntityId, accountId }))
      }
      const results = await Promise.all(queries)
      if (cancelled) return
      const combined = results.flatMap((r) => r.data || [])
      const deduped = Array.from(new Map(combined.map((r) => [r.id, r])).values())
      setRegisters(deduped)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [scopeLevel, scopeEntityId])

  const newRegisterPath = `/platform/local-registers/new?scopeLevel=${scopeLevel}${
    scopeEntityId ? `&scopeEntityId=${scopeEntityId}` : ''
  }${scopeLabel ? `&scopeLabel=${encodeURIComponent(scopeLabel)}` : ''}`

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Local Registers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {scopeLabel ? `Registers available to ${scopeLabel}` : 'Registers available here'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(newRegisterPath)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New Local Register
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
      ) : registers.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          No local registers here yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {registers.map((register) => (
            <button
              key={register.id}
              type="button"
              onClick={() => navigate(`/platform/local-registers/${register.id}`)}
              className="text-left p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition"
            >
              <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
              <h3 className="font-medium text-gray-900 dark:text-white">{register.label}</h3>
              {register.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{register.description}</p>
              )}
              {register.is_system_defined && (
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  Built-in
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
