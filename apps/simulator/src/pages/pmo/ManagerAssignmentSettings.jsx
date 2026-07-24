import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSystemAssignmentLimit, updateSystemAssignmentLimit } from '../../services/managerAssignmentService'

export default function ManagerAssignmentSettings() {
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState(5)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const v = await getSystemAssignmentLimit()
      setValue(v)
    } catch (e) {
      toast.error(e?.message || 'Failed to load setting')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!window.confirm(`Save maximum concurrent assignments as ${value}?`)) return
    setSaving(true)
    try {
      const n = await updateSystemAssignmentLimit(value)
      setValue(n)
      toast.success(`Updated: managers may have at most ${n} active assignments.`)
    } catch (err) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/platform/pmo-admin/manager-assignments"
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Back to manager assignments"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Manager assignment settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              System-wide limit for active portfolio, programme, and project manager assignments per user.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4"
        >
          {loading ? (
            <p className="text-gray-500 dark:text-gray-400">Loading…</p>
          ) : (
            <>
              <div>
                <label htmlFor="max-assign" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maximum concurrent assignments per manager
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Current value: <strong className="text-gray-900 dark:text-white">{value}</strong> — counts only active (non-completed) projects, programmes, and portfolios.
                </p>
                <input
                  id="max-assign"
                  type="number"
                  min={1}
                  max={999}
                  value={value}
                  onChange={(e) => setValue(parseInt(e.target.value, 10) || 1)}
                  className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 text-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
