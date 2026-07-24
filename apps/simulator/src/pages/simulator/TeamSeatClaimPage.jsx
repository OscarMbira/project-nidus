import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { claimTeamSeat } from '../../services/sim/simTeamSeatService'

export default function TeamSeatClaimPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('claiming') // 'claiming' | 'success' | 'error'
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErr('This invitation link is missing its token.')
      return
    }
    ;(async () => {
      const res = await claimTeamSeat(token)
      if (!res.success) {
        setStatus('error')
        setErr(res.error || 'Could not claim this seat')
        return
      }
      setStatus('success')
    })()
  }, [token])

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center text-gray-900 dark:text-gray-100">
      {status === 'claiming' && (
        <>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Claiming your seat...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <h1 className="text-2xl font-bold mb-2">Seat claimed</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            You now have full access to Portfolio, Programme, and Project Manager practice scenarios.
          </p>
          <button
            type="button"
            onClick={() => navigate('/simulator/run/setup')}
            className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium"
          >
            Start a scenario
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <h1 className="text-2xl font-bold mb-2">Couldn't claim this seat</h1>
          <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
        </>
      )}
    </div>
  )
}
