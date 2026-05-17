import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchLatestInProgressNpcRunId } from '../../services/sim/simLiveRunRoutes'

export default function SimLiveRunRedirect({ suffix = 'dashboard' }) {
  const navigate = useNavigate()
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetchLatestInProgressNpcRunId()
      if (cancelled) return
      if (res.runId) navigate(`/simulator/run/${res.runId}/${suffix}`, { replace: true })
      else navigate('/simulator/run/setup', { replace: true })
    })()
    return () => {
      cancelled = true
    }
  }, [navigate, suffix])
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
      Loading your simulation…
    </div>
  )
}
