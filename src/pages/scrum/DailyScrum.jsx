import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'
import { format, startOfDay, isToday } from 'date-fns'
import { Clock, AlertTriangle, CheckCircle, Users, Calendar, Plus, X, Save } from 'lucide-react'
import StandupCard from '../../components/scrum/StandupCard'
import BlockerPanel from '../../components/scrum/BlockerPanel'

const STANDUP_DURATION_MINUTES = 15

export default function DailyScrum() {
  const { sprintId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [sprint, setSprint] = useState(null)
  const [project, setProject] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [standupNotes, setStandupNotes] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [timerActive, setTimerActive] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(STANDUP_DURATION_MINUTES * 60)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    fetchData()
    getCurrentUser()
  }, [projectId, sprintId])

  useEffect(() => {
    if (selectedDate) {
      fetchStandupNotes()
    }
  }, [selectedDate, sprintId])

  useEffect(() => {
    let interval = null
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(seconds => seconds - 1)
      }, 1000)
    } else if (timerSeconds === 0) {
      setTimerActive(false)
      alert('Standup time is up!')
    }
    return () => clearInterval(interval)
  }, [timerActive, timerSeconds])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    } catch (error) {
      console.error('Error getting current user:', error)
    }
  }

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

      // Fetch sprint
      const { data: sprintData, error: sprintError } = await supabase
        .from('sprints')
        .select('*, project:project_id (id, project_name)')
        .eq('id', sprintId)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()

      if (sprintError) throw sprintError
      setSprint(sprintData)

      // Fetch team members (project members assigned to this sprint or project)
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select(`
          *,
          user:user_id (id, email, full_name)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      if (membersError) throw membersError
      setTeamMembers(membersData || [])

    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStandupNotes = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('daily_scrum_notes')
        .select(`
          *,
          user:user_id (id, email, full_name),
          blockers:standup_blockers (*)
        `)
        .eq('sprint_id', sprintId)
        .eq('standup_date', dateStr)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) throw error
      setStandupNotes(data || [])
    } catch (error) {
      console.error('Error fetching standup notes:', error)
    }
  }

  const handleSaveStandup = async (userId, standupData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      // Check if note already exists
      const { data: existing } = await supabase
        .from('daily_scrum_notes')
        .select('id')
        .eq('sprint_id', sprintId)
        .eq('user_id', userId)
        .eq('standup_date', dateStr)
        .eq('is_deleted', false)
        .single()

      let result
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('daily_scrum_notes')
          .update({
            ...standupData,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select(`
            *,
            user:user_id (id, email, full_name),
            blockers:standup_blockers (*)
          `)
          .single()

        if (error) throw error
        result = data
      } else {
        // Create new
        const { data, error } = await supabase
          .from('daily_scrum_notes')
          .insert({
            ...standupData,
            sprint_id: sprintId,
            user_id: userId,
            project_id: projectId,
            standup_date: dateStr,
            created_by: user.id,
            updated_by: user.id,
          })
          .select(`
            *,
            user:user_id (id, email, full_name),
            blockers:standup_blockers (*)
          `)
          .single()

        if (error) throw error
        result = data
      }

      // Update local state
      setStandupNotes(prev => {
        const filtered = prev.filter(n => n.user_id !== userId)
        return [...filtered, result]
      })
    } catch (error) {
      console.error('Error saving standup:', error)
      alert('Error saving standup: ' + error.message)
    }
  }

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startTimer = () => {
    setTimerSeconds(STANDUP_DURATION_MINUTES * 60)
    setTimerActive(true)
  }

  const stopTimer = () => {
    setTimerActive(false)
  }

  const resetTimer = () => {
    setTimerActive(false)
    setTimerSeconds(STANDUP_DURATION_MINUTES * 60)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Daily Scrum...</p>
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Sprint not found</p>
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go to Project
          </button>
        </div>
      </div>
    )
  }

  const allBlockers = standupNotes.flatMap(note => note.blockers || []).filter(b => !b.is_resolved && !b.is_deleted)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}/scrum/sprint/${sprintId}/board`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
      >
        ← Back to Sprint Board
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Daily Scrum
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {sprint.sprint_name} - {project?.project_name}
          </p>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <div className="text-center">
                <div className={`text-2xl font-mono font-bold ${
                  timerSeconds < 300 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {formatTimer(timerSeconds)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {timerActive ? 'Running' : 'Stopped'}
                </div>
              </div>
              <div className="flex gap-2">
                {!timerActive ? (
                  <button
                    onClick={startTimer}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    Start
                  </button>
                ) : (
                  <button
                    onClick={stopTimer}
                    className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
                  >
                    Pause
                  </button>
                )}
                <button
                  onClick={resetTimer}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Selector */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Standup Date:
          </label>
          <input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
          />
          {isToday(selectedDate) && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
              Today
            </span>
          )}
        </div>
      </div>

      {/* Blockers Panel */}
      {allBlockers.length > 0 && (
        <div className="mb-6">
          <BlockerPanel blockers={allBlockers} onUpdate={fetchStandupNotes} />
        </div>
      )}

      {/* Team Standup Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Standups
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {standupNotes.filter(n => n.is_completed).length} / {teamMembers.length} completed
          </div>
        </div>

        {teamMembers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
            No team members found for this sprint.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {teamMembers.map((member) => {
              const note = standupNotes.find(n => n.user_id === member.user_id)
              return (
                <StandupCard
                  key={member.user_id}
                  member={member.user}
                  standupNote={note}
                  selectedDate={selectedDate}
                  onSave={(data) => handleSaveStandup(member.user_id, data)}
                  currentUserId={currentUserId}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

