/**
 * PM Controls - Quality Register (Write)
 */

import { useState, useEffect } from 'react'
import { DocumentGovernanceProvider } from '@nidus/shared/context/DocumentGovernanceContext'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import ViewToggle from '@nidus/ui/ViewToggle'
import { getQualityRegister } from '../../services/qualityManagementService'
import QualityRegister from '../../components/quality/QualityRegister'

export default function PMControlsQualityRegister() {
  const { projectId } = usePlatformProjectId()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useViewMode('pm-quality-register', 'list')

  const fetchItems = async () => {
    if (!projectId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getQualityRegister({ project_id: projectId })
      setItems(data || [])
    } catch (error) {
      console.error('Error fetching quality register:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  return (
    <DocumentGovernanceProvider>
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Quality Register
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage project quality register
            </p>
          </div>
          <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="Quality register layout" />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <QualityRegister
            items={items}
            onRefresh={fetchItems}
            projectId={projectId}
            registerViewMode={viewMode}
          />
        )}
      </div>
    </DocumentGovernanceProvider>
  )
}
