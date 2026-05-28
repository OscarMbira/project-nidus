import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AuthorisationQueueWidget({ fetchCount, queuePath = '/pm/authorisation/queue', className = '' }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const n = await fetchCount?.()
        if (!cancelled) setCount(typeof n === 'number' ? n : 0)
      } catch {
        if (!cancelled) setCount(0)
      }
    })()
    return () => { cancelled = true }
  }, [fetchCount])

  if (!count) return null

  return (
    <Link
      to={queuePath}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs font-medium ${className}`}
    >
      <Bell className="h-3.5 w-3.5" />
      {count} pending
    </Link>
  )
}
