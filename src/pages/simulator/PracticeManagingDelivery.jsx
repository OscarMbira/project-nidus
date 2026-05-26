/**
 * Practice Managing Product Delivery Page
 * Work package acceptance, product quality checks, delivery status updates
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Package, CheckCircle } from 'lucide-react'
import { getPracticeWorkPackages } from '../../services/sim/practiceWorkPackageService'
import { getPracticeQualityRegister } from '../../services/sim/practiceQualityService'

export default function PracticeManagingDelivery() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [workPackages, setWorkPackages] = useState([])
  const [qualityItems, setQualityItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [wpResult, qualityResult] = await Promise.all([
        getPracticeWorkPackages(projectId),
        getPracticeQualityRegister(projectId)
      ])
      if (wpResult.success) setWorkPackages(wpResult.data || [])
      if (qualityResult.success) setQualityItems(qualityResult.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Practice: Managing Product Delivery</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Package className="h-5 w-5 mr-2" /> Work Packages
          </h2>
          {workPackages.length === 0 ? (
            <p className="text-gray-500">No work packages found</p>
          ) : (
            <div className="space-y-2">
              {workPackages.slice(0, 5).map((wp, index) => (
                <div key={wp.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm">{wp.work_package_name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${wp.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {wp.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" /> Quality Checks
          </h2>
          {qualityItems.length === 0 ? (
            <p className="text-gray-500">No quality items found</p>
          ) : (
            <div className="space-y-2">
              {qualityItems.slice(0, 5).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm">{item.product_name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${item.quality_status === 'passed' ? 'bg-green-100 text-green-800' : item.quality_status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {item.quality_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
