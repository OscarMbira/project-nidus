/**
 * v1341 (D16, D19, R3) — Industry Modules screen, shared by Platform and Simulator.
 * The app page passes the project (Platform project or Simulator practice project) and any
 * project picker; this screen loads the items and history, handles switching and confirms
 * each change with the success modal (rule 16).
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ToggleRight } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import {
  listIndustryModules,
  setIndustryModuleDisabled,
  listIndustryModuleHistory,
} from '@nidus/shared/utils/industryModulesService'
import IndustryModulesPanel from './IndustryModulesPanel.jsx'

export default function IndustryModulesScreen({ app, projectId, projectLabel = '', picker = null }) {
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const [rows, setRows] = useState([])
  const [history, setHistory] = useState([])
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)

  const load = useCallback(async () => {
    if (!projectId) {
      setRows([])
      setHistory([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [list, hist] = await Promise.all([
        listIndustryModules(app, projectId),
        listIndustryModuleHistory(app, projectId).catch(() => []),
      ])
      setRows(list.rows)
      setCanEdit(list.canEdit)
      setHistory(hist)
    } catch (e) {
      setError(e?.message || 'Could not load the industry items for this project.')
    } finally {
      setLoading(false)
    }
  }, [app, projectId])

  useEffect(() => { load() }, [load])

  const onToggle = async (row, nextDisabled) => {
    setSavingId(row.menu_item_id)
    setError(null)
    try {
      await setIndustryModuleDisabled(app, projectId, row.menu_item_id, nextDisabled)
      setRows((prev) => prev.map((r) => (r.menu_item_id === row.menu_item_id
        ? { ...r, is_disabled: nextDisabled, disabled_at: nextDisabled ? new Date().toISOString() : null }
        : r)))
      listIndustryModuleHistory(app, projectId).then(setHistory).catch(() => {})
      showSuccess({
        recordId: row.menu_label,
        operation: 'updated',
        message: nextDisabled
          ? `${row.menu_label} is switched off for this project. Its records are kept.`
          : `${row.menu_label} is shown again for this project.`,
      })
    } catch (e) {
      setError(e?.message || 'Could not change this item.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-6 py-6 space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <ToggleRight className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          Industry Modules
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {projectLabel ? `Industry pages shown for ${projectLabel}.` : 'Choose which industry pages this project shows.'}
        </p>
      </div>
      {picker}
      {!projectId ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Select a project to manage its industry pages.</p>
      ) : (
        <IndustryModulesPanel
          projectLabel={projectLabel}
          rows={rows}
          history={history}
          loading={loading}
          error={error}
          canEdit={canEdit}
          savingId={savingId}
          onToggle={onToggle}
          viewModeId={`industry-modules-${app}`}
        />
      )}
      {modal}
    </div>
  )
}
