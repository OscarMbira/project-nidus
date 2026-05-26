import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'
import { Plus, Kanban, Settings, Trash2 } from 'lucide-react'
import SortToolbar from '../../components/ui/SortToolbar'
import { TableHeaderCell, TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { useSortableTable } from '../../hooks/useSortableTable'
import { useViewMode } from '../../hooks/useViewMode'
import ViewToggle from '../../components/ui/ViewToggle'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function KanbanBoards() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [boards, setBoards] = useState([])
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [boardViewMode, setBoardViewMode] = useViewMode('kanban-boards', 'grid')

  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'created_at', direction: 'desc' },
    storageKey: 'nidus-kanban-boards-sort',
  })

  const boardAccessors = useMemo(
    () => ({
      board_name: (b) => b.board_name ?? '',
      project: () => project?.project_name ?? '',
      created_at: (b) => b.created_at ?? '',
    }),
    [project?.project_name]
  )

  const displayBoards = useMemo(
    () => sortedData(boards, boardAccessors),
    [boards, sortedData, boardAccessors]
  )

  useEffect(() => {
    fetchData()
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('id', projectId)
        .eq('is_deleted', false)
        .single()

      if (projectError) throw projectError
      setProject(projectData)

      // Fetch Kanban boards
      const { data: boardsData, error: boardsError } = await supabase
        .from('kanban_boards')
        .select(`
          *,
          board_owner:board_owner_user_id (id, email, full_name)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (boardsError) {
        if (boardsError.code === '42P01') {
          console.log('Kanban boards table not found - please run v09_kanban_tables.sql first')
          setBoards([])
        } else {
          throw boardsError
        }
      } else {
        setBoards(boardsData || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBoard = async (boardData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('kanban_boards')
        .insert({
          ...boardData,
          project_id: projectId,
          board_owner_user_id: user.id,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single()

      if (error) throw error

      // Create default columns
      const defaultColumns = [
        { name: 'Backlog', order: 1, is_backlog_column: true },
        { name: 'To Do', order: 2 },
        { name: 'In Progress', order: 3 },
        { name: 'Review', order: 4 },
        { name: 'Done', order: 5, is_done_column: true }
      ]

      for (const col of defaultColumns) {
        await supabase
          .from('kanban_columns')
          .insert({
            board_id: data.id,
            column_name: col.name,
            column_order: col.order,
            is_backlog_column: col.is_backlog_column || false,
            is_done_column: col.is_done_column || false,
            created_by: user.id,
            updated_by: user.id
          })
      }

      setShowCreateForm(false)
      fetchData()
      // Navigate to the new board
      navigate(`/projects/${projectId}/kanban/board/${data.id}`)
    } catch (error) {
      console.error('Error creating board:', error)
      alert('Error creating board: ' + error.message)
    }
  }

  const handleDeleteBoard = async (boardId) => {
    if (!confirm('Are you sure you want to delete this board?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('kanban_boards')
        .update({
          is_deleted: true,
          deleted_by: user.id,
          deleted_at: new Date().toISOString()
        })
        .eq('id', boardId)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error deleting board:', error)
      alert('Error deleting board: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Kanban boards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          ← Back to Project
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Kanban Boards
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {project?.project_name}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ViewToggle value={boardViewMode} onChange={setBoardViewMode} ariaLabel="Kanban boards layout" />
            <button
              onClick={() => navigate(`/projects/${projectId}/kanban/metrics`)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              View Metrics
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Board
            </button>
          </div>
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Kanban className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Kanban boards yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create your first Kanban board to start visualizing your workflow
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
          >
            Create Your First Board
          </button>
        </div>
      ) : (
        <>
        <div className="mb-4">
          <SortToolbar
            columns={[
              { key: 'board_name', label: 'Board name' },
              { key: 'project', label: 'Project' },
              { key: 'created_at', label: 'Created' },
            ]}
            getSortDirection={getSortDirectionForColumn}
            onSort={handleSort}
          />
        </div>
        {boardViewMode === 'list' ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                <TableRowNumberHeader className="!normal-case" />
                    <TableHeaderCell sortable={false} className="!normal-case">Name</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case">Project</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case whitespace-nowrap">Created</TableHeaderCell>
                    <TableHeaderCell sortable={false} className="!normal-case text-right">Actions</TableHeaderCell>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayBoards.map((board, index) => (
                    <tr key={board.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-6 py-3">
                        <button
                          type="button"
                          className="text-left font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          onClick={() => navigate(`/projects/${projectId}/kanban/board/${board.id}`)}
                        >
                          {board.board_name}
                        </button>
                        {board.board_description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{board.board_description}</div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300">{project?.project_name || '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {board.created_at ? new Date(board.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteBoard(board.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          aria-label="Delete board"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayBoards.map((board, index) => (
            <div
              key={board.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/projects/${projectId}/kanban/board/${board.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                  <RowNumberBadge number={getDisplayRowNumber(index)} className="shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {board.board_name}
                  </h3>
                  {board.board_description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {board.board_description}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteBoard(board.id)
                  }}
                  className="ml-2 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="capitalize">{board.board_type}</span>
                {board.board_owner && (
                  <span>• {board.board_owner.full_name || board.board_owner.email}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
        </>
      )}

      {showCreateForm && (
        <CreateBoardForm
          onSave={handleCreateBoard}
          onClose={() => setShowCreateForm(false)}
        />
      )}
    </div>
  )
}

// Create Board Form Component
function CreateBoardForm({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    board_name: '',
    board_description: '',
    board_type: 'standard',
    card_color_scheme: 'priority',
    show_card_aging: true,
    show_blocked_indicators: true,
    allow_card_creation: true
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create Kanban Board
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Board Name *
            </label>
            <input
              type="text"
              name="board_name"
              value={formData.board_name}
              onChange={handleChange}
              placeholder="e.g., Development Board, Marketing Board"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="board_description"
              value={formData.board_description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the purpose of this board..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Board Type
            </label>
            <select
              name="board_type"
              value={formData.board_type}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="standard">Standard</option>
              <option value="swimlane">Swimlane</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Card Color Scheme
            </label>
            <select
              name="card_color_scheme"
              value={formData.card_color_scheme}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="type">Type</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="show_card_aging"
                checked={formData.show_card_aging}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Show card aging indicators
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="show_blocked_indicators"
                checked={formData.show_blocked_indicators}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Show blocked item indicators
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="allow_card_creation"
                checked={formData.allow_card_creation}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Allow card creation on board
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

