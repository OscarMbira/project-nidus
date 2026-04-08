import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { ArrowLeft, Edit2, Calendar, User, Clock, TrendingUp, AlertTriangle, Plus, Users, Award } from 'lucide-react'
import { format } from 'date-fns'
import ResourceForm from '../components/ResourceForm'
import ResourceAssignment from '../components/ResourceAssignment'
import ResourceCalendar from '../components/ResourceCalendar'
import ResourceSkills from '../components/ResourceSkills'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const RESOURCE_VIEW_SECTIONS = [
  { title: 'Resource', fields: [
    { key: 'resource_name', label: 'Name' },
    { key: 'resource_code', label: 'Code' },
    { key: 'resource_type', label: 'Type' }
  ]}
]

export default function ResourceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [resource, setResource] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showResourceForm, setShowResourceForm] = useState(false)
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [showSkills, setShowSkills] = useState(false)

  useEffect(() => {
    if (id) {
      fetchResource()
      fetchAssignments()
    }
  }, [id])

  const fetchResource = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          user:user_id (id, email, full_name),
          team:team_id (id, team_name)
        `)
        .eq('id', id)
        .eq('is_deleted', false)
        .single()

      if (error) throw error
      setResource(data)
    } catch (error) {
      console.error('Error fetching resource:', error)
      alert('Error loading resource: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('*')
        .eq('resource_id', id)
        .eq('is_deleted', false)
        .order('assignment_start_date', { ascending: true })

      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
  }

  const handleCreateAssignment = () => {
    setSelectedAssignment(null)
    setShowAssignmentForm(true)
  }

  const handleEditAssignment = (assignment) => {
    setSelectedAssignment(assignment)
    setShowAssignmentForm(true)
  }

  const handleAssignmentSaved = () => {
    setShowAssignmentForm(false)
    setSelectedAssignment(null)
    fetchAssignments()
  }

  const getAssignmentTypeLabel = (type) => {
    const labels = {
      task: 'Task',
      work_package: 'Work Package',
      user_story: 'User Story',
      kanban_card: 'Kanban Card',
      project: 'Project',
    }
    return labels[type] || type
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'confirmed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading resource...</p>
        </div>
      </div>
    )
  }

  if (!resource) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Resource not found</p>
          <button
            onClick={() => navigate('/resources')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Resources
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate('/resources')}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources
        </button>
        <ExportRecordButtons
          onExportPPT={() => exportRecordToPPT(RESOURCE_VIEW_SECTIONS, resource, `Resource_${resource.resource_code || id}`)}
          onExportWord={() => exportRecordToWord(RESOURCE_VIEW_SECTIONS, resource, `Resource_${resource.resource_code || id}`)}
          onExportExcel={() => exportRecordToExcel(RESOURCE_VIEW_SECTIONS, resource, `Resource_${resource.resource_code || id}`)}
          onExportCSV={() => exportRecordToCSV(RESOURCE_VIEW_SECTIONS, resource, `Resource_${resource.resource_code || id}`)}
          onExportXML={() => exportRecordToXML(RESOURCE_VIEW_SECTIONS, resource, `Resource_${resource.resource_code || id}`)}
          onExportJSON={() => exportRecordToJSON(RESOURCE_VIEW_SECTIONS, resource, `Resource_${resource.resource_code || id}`)}
          onExportPrint={() => exportRecordToPrint(RESOURCE_VIEW_SECTIONS, resource, `Resource_${resource.resource_code || id}`)}
        />
      </div>

      {/* Resource Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {resource.resource_name}
              </h1>
              {resource.resource_code && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {resource.resource_code}
                </span>
              )}
              <span className={`px-3 py-1 text-sm font-medium rounded ${
                resource.is_active 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {resource.is_active ? 'Active' : 'Inactive'}
              </span>
              {resource.is_available && (
                <span className="px-3 py-1 text-sm font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Available
                </span>
              )}
            </div>
            {resource.resource_description && (
              <p className="text-gray-600 dark:text-gray-300 mb-4">{resource.resource_description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalendar(true)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <Calendar className="h-4 w-4" />
              Calendar
            </button>
            <button
              onClick={() => setShowSkills(true)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors flex items-center gap-2 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <Award className="h-4 w-4" />
              Skills
            </button>
            <button
              onClick={() => setShowResourceForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit Resource
            </button>
          </div>
        </div>

        {/* Resource Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Type</h3>
            <p className="text-gray-900 dark:text-white capitalize">{resource.resource_type}</p>
            {resource.resource_category && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{resource.resource_category}</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Capacity
            </h3>
            <p className="text-gray-900 dark:text-white">
              {resource.default_capacity_hours_per_day}h/day
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {resource.default_capacity_percentage}% capacity
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <User className="h-4 w-4" />
              Linked To
            </h3>
            {resource.user ? (
              <p className="text-gray-900 dark:text-white">
                {resource.user.full_name || resource.user.email}
              </p>
            ) : resource.team ? (
              <p className="text-gray-900 dark:text-white">
                {resource.team.team_name}
              </p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Not linked</p>
            )}
          </div>
        </div>
      </div>

      {/* Assignments Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Assignments ({assignments.length})
          </h2>
          <button
            onClick={handleCreateAssignment}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Assignment
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No Assignments yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Create an assignment to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Assignment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Allocation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {getAssignmentTypeLabel(assignment.assignment_type)}
                      </div>
                      {assignment.role_in_assignment && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {assignment.role_in_assignment}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(assignment.assignment_start_date), 'MMM d, yyyy')}
                      </div>
                      {assignment.assignment_end_date && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          to {format(new Date(assignment.assignment_end_date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {assignment.allocated_hours_per_day}h/day
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {assignment.allocation_percentage}% allocation
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.assignment_status)}`}>
                        {assignment.assignment_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditAssignment(assignment)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resource Form Modal */}
      {showResourceForm && (
        <ResourceForm
          resource={resource}
          onSave={() => {
            setShowResourceForm(false)
            fetchResource()
          }}
          onCancel={() => setShowResourceForm(false)}
        />
      )}

      {/* Assignment Form Modal */}
      {showAssignmentForm && (
        <ResourceAssignment
          assignment={selectedAssignment}
          resourceId={resource.id}
          onSave={handleAssignmentSaved}
          onCancel={() => {
            setShowAssignmentForm(false)
            setSelectedAssignment(null)
          }}
        />
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <ResourceCalendar
          resourceId={resource.id}
          onClose={() => setShowCalendar(false)}
          onSave={() => {
            fetchResource()
            fetchAssignments()
          }}
        />
      )}

      {/* Skills Modal */}
      {showSkills && (
        <ResourceSkills
          resourceId={resource.id}
          onClose={() => setShowSkills(false)}
          onSave={() => {
            fetchResource()
          }}
        />
      )}
    </div>
  )
}

