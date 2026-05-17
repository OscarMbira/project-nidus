import { useEffect, useMemo, useState, createContext, useContext } from 'react'
import { NavLink, Route, Routes, Navigate } from 'react-router-dom'
import { platformDb } from '../../../services/supabase/supabaseClient'
import { resolveLdeAccountForCurrentUser } from '../utils/bootstrapLdeAccount'
import FieldDefinitionsPage from './FieldDefinitionsPage'
import FieldGroupsPage from './FieldGroupsPage'
import ScreenMappingPage from './ScreenMappingPage'
import ValidationRulesPage from './ValidationRulesPage'
import FieldPermissionsPage from './FieldPermissionsPage'
import AuditHistoryPage from './AuditHistoryPage'

export const LdeContext = createContext(null)

export function useLdeContext() {
  return useContext(LdeContext)
}

const tabs = [
  { to: 'field-definitions', label: 'Field definitions' },
  { to: 'field-groups', label: 'Field groups' },
  { to: 'screen-mapping', label: 'Screen mapping' },
  { to: 'validation-rules', label: 'Validation rules' },
  { to: 'field-permissions', label: 'Field permissions' },
  { to: 'audit-history', label: 'Audit history' },
]

export default function LocalDataExtensionsRoutes({
  dataDb = platformDb,
  rolesDb = platformDb,
}) {
  const [accountId, setAccountId] = useState(null)
  const [userInternalId, setUserInternalId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { userInternalId: uid, accountId: aid } = await resolveLdeAccountForCurrentUser()
        if (!cancelled) {
          setUserInternalId(uid)
          setAccountId(aid)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const ctx = useMemo(
    () => ({ accountId, userInternalId, platformDb: dataDb, rolesDb }),
    [accountId, userInternalId, dataDb, rolesDb]
  )

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    )
  }

  if (!accountId) {
    return (
      <div className="max-w-lg mx-auto mt-16 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-6 text-sm text-amber-900 dark:text-amber-100">
        No organisation account could be resolved for your user. Local Data Extensions are scoped per account.
      </div>
    )
  }

  return (
    <LdeContext.Provider value={ctx}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Local Data Extensions</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Define published fields, map them to screens, and capture values on records (platform projects or simulator practice projects).
        </p>
        <nav className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 dark:border-gray-700 pb-2">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <Routes>
          <Route index element={<Navigate to="field-definitions" replace />} />
          <Route path="field-definitions" element={<FieldDefinitionsPage />} />
          <Route path="field-groups" element={<FieldGroupsPage />} />
          <Route path="screen-mapping" element={<ScreenMappingPage />} />
          <Route path="validation-rules" element={<ValidationRulesPage />} />
          <Route path="field-permissions" element={<FieldPermissionsPage />} />
          <Route path="audit-history" element={<AuditHistoryPage />} />
          <Route path="*" element={<Navigate to="field-definitions" replace />} />
        </Routes>
      </div>
    </LdeContext.Provider>
  )
}
