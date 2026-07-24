import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import RoleMenuCustomiser from '../../components/admin/RoleMenuCustomiser'
import {
  canAccessPmoRoleMenuPage,
  fetchCurrentUserEditorCapabilities,
} from '../../services/menuManagementService'

export default function PMORoleMenuManagement() {
  const [cap, setCap] = useState(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const c = await fetchCurrentUserEditorCapabilities()
        if (cancelled) return
        setCap(c)
        if (!canAccessPmoRoleMenuPage(c)) setDenied(true)
      } catch {
        if (!cancelled) setDenied(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (denied || (cap && !canAccessPmoRoleMenuPage(cap))) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Access denied</p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          PMO Admin or System Admin access is required.
        </p>
        <Link
          to="/platform/dashboard"
          className="mt-6 inline-flex items-center gap-2 text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    )
  }

  if (!cap) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-600 dark:text-gray-300">
        Loading…
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <Link
          to="/platform/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
      <RoleMenuCustomiser variant="pmo" />
    </div>
  )
}
