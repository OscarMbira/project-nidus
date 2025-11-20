import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

export default function MethodologySelection() {
  const [methodologies, setMethodologies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMethodology, setSelectedMethodology] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchMethodologies()
  }, [])

  const fetchMethodologies = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('methodologies')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('methodology_name', { ascending: true })

      if (error) throw error
      setMethodologies(data || [])
    } catch (error) {
      console.error('Error fetching methodologies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectMethodology = (methodology) => {
    setSelectedMethodology(methodology)
  }

  const handleContinue = () => {
    if (selectedMethodology) {
      navigate('/projects/create', { 
        state: { selectedMethodology } 
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading methodologies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Select Project Methodology
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Choose the methodology that best fits your project needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {methodologies.map((methodology) => (
          <div
            key={methodology.id}
            onClick={() => handleSelectMethodology(methodology)}
            className={`cursor-pointer rounded-lg border-2 p-6 transition-all ${
              selectedMethodology?.id === methodology.id
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
            }`}
          >
            <div className="flex items-center mb-4">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: methodology.methodology_color || '#3B82F6' }}
              >
                {methodology.methodology_icon || '📋'}
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {methodology.methodology_name}
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {methodology.methodology_category}
                </span>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
              {methodology.methodology_description}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
              {methodology.supports_sprints && (
                <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                  Sprints
                </span>
              )}
              {methodology.supports_kanban && (
                <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                  Kanban
                </span>
              )}
              {methodology.supports_gantt && (
                <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded">
                  Gantt
                </span>
              )}
              {methodology.supports_stages && (
                <span className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded">
                  Stages
                </span>
              )}
            </div>

            {methodology.is_default && (
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                ⭐ Default Methodology
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedMethodology && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selected: <span className="font-semibold text-gray-900 dark:text-white">{selectedMethodology.methodology_name}</span>
              </p>
            </div>
            <button
              onClick={handleContinue}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Continue to Project Creation →
            </button>
          </div>
        </div>
      )}

      {methodologies.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No methodologies available</p>
        </div>
      )}
    </div>
  )
}

