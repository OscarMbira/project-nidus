/**
 * Skill Catalog — list of shared skills (GAP-11, v963 Phase 18, Simulator port). Rules
 * 40/41/44/61/38. Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/
 * SkillCatalogListPage.jsx. Simulator has no organisation/accounts concept at the schema level
 * (see skillCatalogService.js header) — sim.skill_categories/sim.skill_catalog are shared
 * reference content readable by all, so there is no accountId gate here, unlike Platform.
 * Categories are a lightweight supporting lookup managed inline here rather than as their own
 * full create/edit/view stack.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookMarked, Plus, LayoutGrid, List as ListIcon, ArrowLeft, X } from 'lucide-react'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import { useSortableTable } from '@nidus/shared/hooks/useSortableTable'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton, ExportListMenu } from '@nidus/ui'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { listCategories, createCategory, deleteCategory, listSkills, deleteSkill } from '../services/skillCatalogService'
import SkillsMatrixTabsNav from '../components/SkillsMatrixTabsNav'

export default function SkillCatalogListPage({ basePath = '/simulator/pm/resources/skills' }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [skills, setSkills] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [showCategories, setShowCategories] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [viewMode, setViewMode] = useViewMode('skill-catalog-sim', 'list')
  const { showSuccess, modal: successModal } = useSuccessModal()

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'skill_name', direction: 'asc' },
    storageKey: 'skill-catalog-sim-sort',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const [skillRows, categoryRows] = await Promise.all([listSkills(), listCategories()])
    setSkills(skillRows)
    setCategories(categoryRows)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return skills
    return skills.filter((s) => s.skill_name?.toLowerCase().includes(q) || s.category_name?.toLowerCase().includes(q))
  }, [skills, search])

  const sortAccessors = useMemo(() => ({ skill_name: (r) => r.skill_name || '', category_name: (r) => r.category_name || '' }), [])
  const sorted = sortedData(filtered, sortAccessors)

  const exportColumns = [
    { key: 'skill_name', label: 'Skill' },
    { key: 'category_name', label: 'Category' },
    { key: 'skill_code', label: 'Code' },
  ]

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete skill "${row.skill_name}"?`)) return
    await deleteSkill(row.id)
    showSuccess({ recordId: row.skill_name, operation: 'deleted', message: `"${row.skill_name}" was deleted.` })
    load()
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    await createCategory({ categoryName: newCategoryName.trim(), sortOrder: categories.length })
    setNewCategoryName('')
    load()
  }

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Delete category "${cat.category_name}"? Skills in it keep their name but lose the category.`)) return
    await deleteCategory(cat.id)
    load()
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading skills matrix…</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <BookMarked className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Skills Matrix</h1>
        </div>
      </div>

      <SkillsMatrixTabsNav active="catalog" basePath={basePath} />

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setShowCategories((v) => !v)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          {showCategories ? 'Hide' : 'Manage'} categories ({categories.length})
        </button>
        <button onClick={() => navigate(`${basePath}/catalog/create`)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Skill
        </button>
      </div>

      {showCategories && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="New category name"
              className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
            />
            <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Add</button>
          </form>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {c.category_name}
                <button type="button" onClick={() => handleDeleteCategory(c)} aria-label={`Delete category ${c.category_name}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white max-w-xs"
          />
          <div className="flex items-center gap-2">
            <ExportListMenu columns={exportColumns} data={sorted} baseFilename="SkillCatalog" />
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Table view">
              <ListIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} aria-label="Card view">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No skills yet.</div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/40">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('skill_name')} onSort={() => handleSort('skill_name')} className="!normal-case whitespace-nowrap">Skill</TableHeaderCell>
                  <TableHeaderCell sortable sortDirection={getSortDirectionForColumn('category_name')} onSort={() => handleSort('category_name')} className="!normal-case whitespace-nowrap">Category</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Code</TableHeaderCell>
                  <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {sorted.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.skill_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.category_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.skill_code || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <RowActionButton variant="view" label="View skill" onClick={() => navigate(`${basePath}/catalog/${row.id}`)} />
                        <RowActionButton variant="edit" label="Edit skill" onClick={() => navigate(`${basePath}/catalog/${row.id}/edit`)} />
                        <RowActionButton variant="delete" label="Delete skill" onClick={() => handleDelete(row)} />
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
                <div className="text-xs text-gray-500 dark:text-gray-400">{row.category_name || 'Uncategorised'}</div>
                <div className="flex items-center gap-1 pt-1">
                  <RowActionButton variant="view" label="View skill" onClick={() => navigate(`${basePath}/catalog/${row.id}`)} />
                  <RowActionButton variant="edit" label="Edit skill" onClick={() => navigate(`${basePath}/catalog/${row.id}/edit`)} />
                  <RowActionButton variant="delete" label="Delete skill" onClick={() => handleDelete(row)} />
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
