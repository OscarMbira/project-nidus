/**
 * ExportListButton — single "Export to Excel" button for list/table pages.
 * Theme-aware (dark/light).
 */

import { Download } from 'lucide-react'

export default function ExportListButton({ onExport, disabled = false, loading = false }) {
  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Download className="w-4 h-4" />
      {loading ? 'Exporting...' : 'Export to Excel'}
    </button>
  )
}
