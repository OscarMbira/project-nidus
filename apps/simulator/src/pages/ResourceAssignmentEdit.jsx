import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import ResourceAssignment from '../components/ResourceAssignment'

export default function ResourceAssignmentEdit() {
  const { id, assignmentId } = useParams()
  const navigate = useNavigate()
  const isCreate = !assignmentId
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(!isCreate)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (isCreate) return
    fetchAssignment()
  }, [assignmentId])

  const fetchAssignment = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single()

      if (error) throw error
      setAssignment(data)
    } catch (error) {
      console.error('Error fetching assignment:', error)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = () => {
    navigate(`/simulator/resources/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading assignment...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Assignment not found</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <ResourceAssignment assignment={assignment} resourceId={id} onSave={handleSaved} onCancel={() => navigate(-1)} />
    </div>
  )
}
