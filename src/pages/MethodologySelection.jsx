import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

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
        .order('is_default', { ascending: false })
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading methodologies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Select Project Methodology
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Choose the methodology that best fits your project needs
          </p>
        </div>

        {/* Methodologies Grid */}
        {methodologies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {methodologies.map((methodology) => {
              const isSelected = selectedMethodology?.id === methodology.id
              return (
                <Card
                  key={methodology.id}
                  onClick={() => handleSelectMethodology(methodology)}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-xl ${
                    isSelected
                      ? 'ring-2 ring-blue-600 dark:ring-blue-500 shadow-lg border-blue-600 dark:border-blue-500'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="p-6">
                    {/* Icon and Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                          style={{ backgroundColor: methodology.methodology_color || '#3B82F6' }}
                        >
                          {methodology.methodology_icon || '📋'}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                            {methodology.methodology_name}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                            {methodology.methodology_category || 'General'}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 min-h-[60px]">
                      {methodology.methodology_description || 'No description available'}
                    </p>

                    {/* Features Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {methodology.supports_sprints && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md">
                          Sprints
                        </span>
                      )}
                      {methodology.supports_kanban && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md">
                          Kanban
                        </span>
                      )}
                      {methodology.supports_gantt && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-md">
                          Gantt
                        </span>
                      )}
                      {methodology.supports_stages && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-md">
                          Stages
                        </span>
                      )}
                    </div>

                    {/* Default Badge */}
                    {methodology.is_default && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
                        <Sparkles className="h-3 w-3" />
                        Recommended Methodology
                      </div>
                    )}

                    {/* Select Indicator */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                          <CheckCircle2 className="h-4 w-4" />
                          Selected
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No methodologies available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                There are no active methodologies configured in the system. Please contact your administrator.
              </p>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Continue Button - Fixed Bottom */}
        {selectedMethodology && methodologies.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-40">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                  style={{ backgroundColor: selectedMethodology.methodology_color || '#3B82F6' }}
                >
                  {selectedMethodology.methodology_icon || '📋'}
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Selected Methodology
                  </p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {selectedMethodology.methodology_name}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleContinue}
                size="lg"
                className="flex items-center gap-2"
              >
                Continue to Project Creation
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
