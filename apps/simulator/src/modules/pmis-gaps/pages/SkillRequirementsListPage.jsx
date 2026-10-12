/**
 * Skill Requirements — required skills per practice project/role/task (GAP-11, v963 Phase 18,
 * Simulator port). Rules 40/41/44/61/38. Simulator mirror of apps/platform/src/modules/
 * pmis-gaps/pages/SkillRequirementsListPage.jsx.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookMarked, Plus, LayoutGrid, List as ListIcon } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton, ExportListMenu } from '@nidus/ui'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { listRequirements, deleteRequirement } from '../services/skillCatalogService'
import SkillsMatrixTabsNav from '../components/SkillsMatrixTabsNav'

export default function SkillRequirementsListPage({ basePath = '/simulator/pm/resources/skills' }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useViewMode('skill-requirements-sim', 'list')
  const { showSuccess, modal: successModal } = useSuccessModal()

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'created_at', direction: 'desc' },
    storageKey: 'skill-requirements-sim-sort',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const data = await listRequirements()
    setRows(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.skill_name?.toLowerCase().includes(q) || r.entity_type?.toLowerCase().includes(q))
  }, [rows, search])

  const sortAccessors = useMemo(() => ({ skill_name: (r) => r.skill_name || '', entity_type: (r) => r.entity_type || '', created_at: (r) => r.created_at || '' }), [])
  const sorted = sortedData(filtered, sortAccessors)

  const exportColumns = [
    { key: 'skill_name', label: 'Skill' },
    { key: 'entity_type', label: 'Applies To' },
    { key: 'required_level', label: 'Required Level' },
  ]

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete this requirement for "${row.skill_name}"?`)) return
    await deleteRequirement(row.id)
    showSuccess({ recordId: row.skill_name, operation: 'deleted', message: 'Requirement was deleted.' })
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading requirements…</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <BookMarked className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Skills Matrix</h1>
      </div>

      <SkillsMatrixTabsNav active="requirements" basePath={basePath} />

      <div className="flex items-center justify-end">
        <button onClick={() => navigate(`${basePath}/requirements/create`)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Requirement
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requirements..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white max-w-xs"
          />
          <div className="flex items-center gap-2">
            <ExportListMenu columns={exportColumns} data={sorted} baseFilename="SkillRequirements" />
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Table view">
              <ListIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No requirements yet.</div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('skill_name')} onSort={() => handleSort('skill_name')} className="!normal-case whitespace-nowrap">Skill</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('entity_type')} onSort={() => handleSort('entity_type')} className="!normal-case whitespace-nowrap">Applies To</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Required Level</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.skill_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.entity_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.required_level}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <RowActionButton variant="view" label="View requirement" onClick={() => navigate(`${basePath}/requirements/${row.id}`)} />
                        <RowActionButton variant="edit" label="Edit requirement" onClick={() => navigate(`${basePath}/requirements/${row.id}/edit`)} />
                        <RowActionButton variant="delete" label="Delete requirement" onClick={() => handleDelete(row)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((row) => (
              <div key={row.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{row.skill_name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{row.entity_type} · Level {row.required_level}</div>
                <div className="flex items-center gap-1 pt-1">
                  <RowActionButton variant="view" label="View requirement" onClick={() => navigate(`${basePath}/requirements/${row.id}`)} />
                  <RowActionButton variant="edit" label="Edit requirement" onClick={() => navigate(`${basePath}/requirements/${row.id}/edit`)} />
                  <RowActionButton variant="delete" label="Delete requirement" onClick={() => handleDelete(row)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {successModal}
    </div>
  )
}
