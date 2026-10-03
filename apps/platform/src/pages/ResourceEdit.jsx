import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import ResourceForm from '../components/ResourceForm'

export default function ResourceEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isCreate = !id
  const [resource, setResource] = useState(null)
  const [loading, setLoading] = useState(!isCreate)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (isCreate) return
    fetchResource()
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
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = (created) => {
    navigate(isCreate ? `/platform/resources/${created?.id}` : `/platform/resources/${id}`)
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

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Resource not found</p>
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <ResourceForm resource={resource} onSave={handleSaved} onCancel={() => navigate(-1)} />
    </div>
  )
}
