/**
 * Practice Configuration Item List Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Package, Plus } from 'lucide-react'
import { getPracticeConfigItems, createPracticeConfigItem } from '../../services/sim/practiceConfigMSService'
import ExportListMenu from '../../components/ui/ExportListMenu'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
const PRACTICE_CONFIG_ITEM_COLUMNS = [
  { key: 'item_name', label: 'Name' },
  { key: 'item_identifier', label: 'Identifier' }
]

export default function PracticeConfigItemList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) loadItems()
  }, [projectId])

  const loadItems = async () => {
    try {
      setLoading(true)
      const result = await getPracticeConfigItems(projectId)
      if (result.success) setItems(result.data || [])
    } catch (error) {
      console.error('Error loading config items:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Configuration Items</h1>
        <div className="flex gap-2">
          <ExportListMenu columns={PRACTICE_CONFIG_ITEM_COLUMNS} data={items} baseFilename="PracticeConfigItems" disabled={!items.length} />
          <button onClick={() => navigate(`/simulator/practice-config-items/create?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" /> Add Config Item
          </button>
        </div>
      </div>
      {loading ? <div className="text-center py-12">Loading...</div> : items.length === 0 ? <div className="text-center py-12 text-gray-500">No configuration items found</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, index) => (
            <div key={item.id} onClick={() => navigate(`/simulator/practice-config-items/${item.id}?projectId=${projectId}`)} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.item_name}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{item.item_description?.substring(0, 100)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
