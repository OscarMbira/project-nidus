/**
 * Local Register Engine — pmo-cat-admin oversight view (v931 PRD decision 5). Lists every local
 * register across every scope for a PMO Admin to audit/deactivate; system-defined rows are
 * shown read-only at the structure level (the actual write gate is RLS, rule 42 — this page
 * just doesn't offer controls that would fail anyway).
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { listAllRegistersForAccount, updateRegisterDefinition } from '../../services/localRegisterService'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

const SCOPE_LABELS = { pmo: 'PMO', portfolio: 'Portfolio', programme: 'Programme', project: 'Project' }

export default function ManageLocalRegistersPage() {
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [loading, setLoading] = useState(true)
  const [registers, setRegisters] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const accountId = await getCurrentUserAccountId()
      if (accountId) {
        const result = await listAllRegistersForAccount(accountId)
        if (!cancelled) setRegisters(result.data || [])
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const toggleActive = async (register) => {
    const result = await updateRegisterDefinition(
      register.id,
      { isActive: !register.is_active },
      { isSystemDefined: register.is_system_defined }
    )
    if (!result.success) return
    setRegisters((prev) => prev.map((r) => (r.id === register.id ? { ...r, is_active: !r.is_active } : r)))
    showSuccess({ recordId: register.register_key, operation: 'updated' })
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Local Registers</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Every register across every PMO/Portfolio/Programme/Project scope in this organisation.
          Built-in registers can be used but not renamed, refielded, or deleted.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Register</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Scope</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {registers.map((register) => (
                <tr key={register.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{register.label}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{SCOPE_LABELS[register.scope_level] || register.scope_level}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                      register.is_system_defined
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    }`}>
                      {register.is_system_defined ? 'Built-in' : 'Custom'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                      register.is_active
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    }`}>
                      {register.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/simulator/local-registers/${register.id}`)}
                        aria-label={`View ${register.label}`}
                        className="text-blue-600 dark:text-blue-400"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {!register.is_system_defined && (
                        <button
                          type="button"
                          onClick={() => toggleActive(register)}
                          className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:underline"
                        >
                          {register.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {registers.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No local registers yet.</div>
          )}
        </div>
      )}
      {modal}
    </div>
  )
}
