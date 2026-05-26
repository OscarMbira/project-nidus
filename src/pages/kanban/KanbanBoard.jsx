import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../../services/supabaseClient'
import { Plus, Settings, AlertCircle, Clock, BarChart3 } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { calculateFlowMetrics } from '../../utils/flowMetricsCalculator'
import { listClassesForBoard, saveClassOfService } from '../../services/kanbanClassOfServiceService'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
// Sortable Card Component
function SortableCard({ card, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'border-l-red-500'
      case 'high': return 'border-l-orange-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-green-500'
      default: return 'border-l-gray-300'
    }
  }

  const getCardAge = () => {
    if (!card.started_at) return null
    const days = differenceInDays(new Date(), new Date(card.started_at))
    return days
  }

  const cardAge = getCardAge()

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg border-l-4 p-3 mb-3 cursor-move hover:shadow-md transition-shadow ${getPriorityColor(card.priority)} ${card.is_blocked ? 'opacity-60' : ''}`}
    >
      {card.is_blocked && (
        <div className="flex items-center gap-1 mb-2 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>Blocked</span>
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm flex-1">
          {card.card_title}
        </h4>
        {card.card_type && (
          <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
            {card.card_type}
          </span>
        )}
      </div>
      {card.card_description && (
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
          {card.card_description}
        </p>
      )}
      {cardAge !== null && cardAge > 7 && (
        <div className="flex items-center gap-1 mb-2 text-orange-600 dark:text-orange-400 text-xs">
          <Clock className="h-3 w-3" />
          <span>{cardAge} days</span>
        </div>
      )}
      {card.assigned_user && (
        <div className="mt-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <span className="text-blue-600 dark:text-blue-400 text-xs font-medium">
              {card.assigned_user.full_name?.charAt(0) || card.assigned_user.email?.charAt(0) || 'U'}
            </span>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {card.assigned_user.full_name || card.assigned_user.email}
          </span>
        </div>
      )}
      {card.due_date && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Due: {format(new Date(card.due_date), 'MMM dd')}
        </div>
      )}
    </div>
  )
}

// Droppable Column Component
function DroppableColumn({ column, cards, onCardClick, onCreateCard, wipLimit }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const cardCount = cards.length
  const isWipExceeded = wipLimit && cardCount > wipLimit

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors ${
        isOver ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {column.column_color && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.column_color }}
            ></div>
          )}
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {column.column_name}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {wipLimit && (
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              isWipExceeded
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              {cardCount} / {wipLimit}
            </span>
          )}
          {!wipLimit && (
            <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium px-2 py-1 rounded-full">
              {cardCount}
            </span>
          )}
        </div>
      </div>
      {isWipExceeded && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
          WIP limit exceeded!
        </div>
      )}
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[100px]">
          {cards.map((card, index) => (
            <SortableCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card.id)}
            />
          ))}
          {cards.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
              Drop cards here
            </div>
          )}
        </div>
      </SortableContext>
      {onCreateCard && (
        <button
          onClick={() => onCreateCard(column.id)}
          className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Card
        </button>
      )}
    </div>
  )
}

export default function KanbanBoard() {
  const { boardId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [board, setBoard] = useState(null)
  const [columns, setColumns] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCard, setActiveCard] = useState(null)
  const [project, setProject] = useState(null)
  const [showCardForm, setShowCardForm] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [cosList, setCosList] = useState([])
  const [cosName, setCosName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    if (projectId && boardId) {
      fetchData()
    }
  }, [projectId, boardId])

  // Recalculate flow metrics whenever cards change
  useEffect(() => {
    setMetrics(calculateFlowMetrics(cards))
  }, [cards])

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

      // Fetch board
      const { data: boardData, error: boardError } = await supabase
        .from('kanban_boards')
        .select(`
          *,
          board_owner:board_owner_user_id (id, email, full_name)
        `)
        .eq('id', boardId)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (boardError) throw boardError
      setBoard(boardData)

      // Fetch columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('board_id', boardId)
        .eq('is_deleted', false)
        .order('column_order', { ascending: true })

      if (columnsError) throw columnsError
      setColumns(columnsData || [])

      // Fetch cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('kanban_cards')
        .select(`
          *,
          assigned_user:assigned_to_user_id (id, email, full_name)
        `)
        .eq('board_id', boardId)
        .eq('is_deleted', false)
        .order('card_order', { ascending: true, nullsLast: true })

      if (cardsError) throw cardsError
      setCards(cardsData || [])

      try {
        const cos = await listClassesForBoard(boardId)
        setCosList(cos || [])
      } catch {
        setCosList([])
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      if (error.code === '42P01') {
        alert('Kanban tables not found. Please run v09_kanban_tables.sql first.')
      } else {
        alert('Error: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (event) => {
    const { active } = event
    const card = cards.find(c => c.id === active.id)
    setActiveCard(card)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const cardId = active.id
    const newColumnId = over.id

    // Check if dropping on a valid column
    const columnExists = columns.find(c => c.id === newColumnId)
    if (!columnExists) {
      return
    }

    // Find the card
    const card = cards.find(c => c.id === cardId)
    if (!card || card.column_id === newColumnId) {
      return
    }

    // Check WIP limit
    const cardsInColumn = cards.filter(c => c.column_id === newColumnId)
    if (columnExists.wip_limit && cardsInColumn.length >= columnExists.wip_limit) {
      if (columnExists.wip_limit_type === 'hard') {
        alert(`WIP limit reached for ${columnExists.column_name}. Cannot move card.`)
        return
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Get max card_order in new column
      const { data: maxOrder } = await supabase
        .from('kanban_cards')
        .select('card_order')
        .eq('column_id', newColumnId)
        .eq('is_deleted', false)
        .order('card_order', { ascending: false })
        .limit(1)
        .single()

      const updateData = {
        column_id: newColumnId,
        updated_by: user?.id || null
      }

      // Update started_at if moving to a new column
      if (!card.started_at) {
        updateData.started_at = new Date().toISOString()
      }

      // Update completed_at if moving to done column
      if (columnExists.is_done_column && !card.completed_at) {
        updateData.completed_at = new Date().toISOString()
      } else if (!columnExists.is_done_column && card.completed_at) {
        updateData.completed_at = null
      }

      // Set card_order
      updateData.card_order = maxOrder?.card_order ? maxOrder.card_order + 1 : 1

      const { error } = await supabase
        .from('kanban_cards')
        .update(updateData)
        .eq('id', cardId)

      if (error) throw error

      // Update local state optimistically
      setCards(prevCards =>
        prevCards.map(c =>
          c.id === cardId ? { ...c, ...updateData } : c
        )
      )
    } catch (error) {
      console.error('Error updating card:', error)
      alert('Error updating card: ' + error.message)
      fetchData()
    }
  }

  const handleCreateCard = (columnId) => {
    setSelectedColumn(columnId)
    setShowCardForm(true)
  }

  const handleSaveCard = async (cardData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Get max card_order in column
      const { data: maxOrder } = await supabase
        .from('kanban_cards')
        .select('card_order')
        .eq('column_id', selectedColumn)
        .eq('is_deleted', false)
        .order('card_order', { ascending: false })
        .limit(1)
        .single()

      const { data, error } = await supabase
        .from('kanban_cards')
        .insert({
          ...cardData,
          board_id: boardId,
          column_id: selectedColumn,
          project_id: projectId,
          card_order: maxOrder?.card_order ? maxOrder.card_order + 1 : 1,
          created_by: user.id,
          updated_by: user.id
        })
        .select(`
          *,
          assigned_user:assigned_to_user_id (id, email, full_name)
        `)
        .single()

      if (error) throw error

      setCards(prev => [...prev, data])
      setShowCardForm(false)
      setSelectedColumn(null)
    } catch (error) {
      console.error('Error creating card:', error)
      alert('Error creating card: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Kanban board...</p>
        </div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Board not found</p>
          <button
            onClick={() => navigate(`/projects/${projectId}/kanban`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to Kanban Boards
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/projects/${projectId}/kanban`)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          ← Back to Boards
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {board.board_name}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {project?.project_name}
            </p>
          </div>
          <button
            onClick={() => navigate(`/projects/${projectId}/kanban`)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Settings className="h-5 w-5 inline mr-2" />
            Manage Boards
          </button>
        </div>
      </div>

      {/* Board Info */}
      {board.board_description && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
          <p className="text-gray-600 dark:text-gray-400">{board.board_description}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Classes of service</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Expedite, fixed date, standard — optional WIP limit per class (v350).
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          <input
            value={cosName}
            onChange={(e) => setCosName(e.target.value)}
            placeholder="Name (e.g. Expedite)"
            className="flex-1 min-w-[160px] px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
          />
          <button
            type="button"
            onClick={async () => {
              if (!cosName.trim()) return
              try {
                await saveClassOfService({
                  board_id: boardId,
                  name: cosName.trim(),
                  sort_order: cosList.length,
                })
                setCosName('')
                setCosList(await listClassesForBoard(boardId))
              } catch (e) {
                alert(e?.message || 'Could not save class of service')
              }
            }}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
          >
            Add
          </button>
        </div>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          {cosList.map((c, index) => (
            <li key={c.id}>
              {c.name}
              {c.wip_limit != null && <span className="text-gray-500"> (WIP {c.wip_limit})</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Flow Metrics Panel */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Avg Cycle Time</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.cycleTimeDays}d
                {metrics.sampleSizes.cycleTime > 0 && (
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                    ({metrics.sampleSizes.cycleTime} cards)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30">
              <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Avg Lead Time</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.leadTimeDays}d
                {metrics.sampleSizes.leadTime > 0 && (
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                    ({metrics.sampleSizes.leadTime} cards)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
              <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Throughput (7d)</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.throughputPerWeek}
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">cards</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
              <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Avg WIP Age</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.averageAgeDays}d
                {metrics.sampleSizes.age > 0 && (
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                    ({metrics.sampleSizes.age} cards)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const columnCards = cards.filter(c => c.column_id === column.id)
            return (
              <DroppableColumn
                key={column.id}
                column={column}
                cards={columnCards}
                wipLimit={column.wip_limit}
                onCardClick={(cardId) => {
                  // Navigate to card detail or open modal
                  console.log('Card clicked:', cardId)
                }}
                onCreateCard={board.allow_card_creation ? handleCreateCard : null}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border-l-4 border-blue-500 p-4 shadow-lg opacity-90 max-w-xs">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                {activeCard.card_title}
              </h4>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {columns.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No columns found. Please create columns for this board.
          </p>
        </div>
      )}

      {showCardForm && (
        <CardForm
          columnId={selectedColumn}
          onSave={handleSaveCard}
          onClose={() => {
            setShowCardForm(false)
            setSelectedColumn(null)
          }}
        />
      )}
    </div>
  )
}

// Card Form Component
function CardForm({ columnId, onSave, onClose }) {
  const [formData, setFormData] = useState({
    card_title: '',
    card_description: '',
    priority: 'medium',
    card_type: 'task',
    assigned_to_user_id: '',
    due_date: ''
  })
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('full_name', { ascending: true, nullsFirst: false })
        .order('email', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({
        ...formData,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        due_date: formData.due_date || null
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create Card
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
              Card Title *
            </label>
            <input
              type="text"
              name="card_title"
              value={formData.card_title}
              onChange={handleChange}
              placeholder="Enter card title..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="card_description"
              value={formData.card_description}
              onChange={handleChange}
              rows={4}
              placeholder="Enter card description..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Card Type
              </label>
              <select
                name="card_type"
                value={formData.card_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="epic">Epic</option>
                <option value="story">Story</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assign To
              </label>
              <select
                name="assigned_to_user_id"
                value={formData.assigned_to_user_id}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
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
              {loading ? 'Creating...' : 'Create Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

