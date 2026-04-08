/**
 * Product Status Account Print View Component
 * Printable format for Product Status Account
 */

import { generatePSAPrintView } from '../../utils/productStatusAccountExport'

export default function ProductStatusAccountPrintView({
  psa,
  statusHistory = [],
  progressSnapshots = [],
  linkedIssues = [],
  milestones = [],
  dependencies = []
}) {
  if (!psa) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 dark:text-gray-400">No Product Status Account data available</p>
      </div>
    )
  }

  const handlePrint = () => {
    const htmlContent = generatePSAPrintView(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies)
    const printWindow = window.open('', '_blank')
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Print View</h2>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
      </div>
      <div 
        className="print-content"
        dangerouslySetInnerHTML={{ __html: generatePSAPrintView(psa, statusHistory, progressSnapshots, linkedIssues, milestones, dependencies) }}
      />
    </div>
  )
}
