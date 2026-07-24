/**
 * CMS Export Component
 * Export options for CMS
 */

import { useState } from 'react'
import { Download, FileText, FileJson, FileSpreadsheet, Printer } from 'lucide-react'

export default function CMSExport({ cmsId, cmsData, onExport }) {
  const [exporting, setExporting] = useState(false)
  const [format, setFormat] = useState('pdf')

  const exportFormats = [
    { value: 'pdf', label: 'PDF', icon: FileText, description: 'Portable Document Format' },
    { value: 'word', label: 'Word', icon: FileText, description: 'Microsoft Word Document' },
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Excel Spreadsheet' },
    { value: 'json', label: 'JSON', icon: FileJson, description: 'JSON Data Export' }
  ]

  const handleExport = async (exportFormat) => {
    if (!cmsId || !cmsData) return

    try {
      setExporting(true)
      setFormat(exportFormat)

      // Simulate export - in real implementation, this would call an export service
      const exportData = {
        cmsId,
        format: exportFormat,
        data: cmsData
      }

      if (onExport) {
        await onExport(exportData)
      } else {
        // Default export behavior
        console.log('Exporting CMS:', exportData)
        
        if (exportFormat === 'json') {
          const blob = new Blob([JSON.stringify(cmsData, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `cms-${cmsData.cms_reference || 'export'}.json`
          a.click()
          URL.revokeObjectURL(url)
        } else {
          alert(`Exporting as ${exportFormat.toUpperCase()}. In a full implementation, this would generate and download the file.`)
        }
      }
    } catch (error) {
      console.error('Error exporting CMS:', error)
      alert('Error exporting CMS: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Export Options</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Export the Communication Management Strategy in various formats
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {exportFormats.map((fmt) => {
          const Icon = fmt.icon
          return (
            <button
              key={fmt.value}
              onClick={() => handleExport(fmt.value)}
              disabled={exporting}
              className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon className="w-5 h-5 text-gray-400" />
              <div className="text-left flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{fmt.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{fmt.description}</p>
              </div>
              <Download className="w-4 h-4 text-gray-400" />
            </button>
          )
        })}
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg w-full justify-center"
        >
          <Printer className="w-4 h-4" />
          <span>Print View</span>
        </button>
      </div>

      {exporting && (
        <div className="text-center py-2 text-sm text-gray-600 dark:text-gray-400">
          Exporting as {format.toUpperCase()}...
        </div>
      )}
    </div>
  )
}
