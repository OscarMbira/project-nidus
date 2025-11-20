/**
 * Capacity Report Export Utilities
 * Provides functions to export capacity data to various formats
 */

/**
 * Export capacity data to CSV format
 * @param {Array} capacityData - Array of capacity data objects
 * @param {Object} options - Export options
 * @returns {string} CSV string
 */
export function exportCapacityToCSV(capacityData, options = {}) {
  const {
    includeHeaders = true,
    dateRange = null,
    resourceFilter = null,
  } = options

  const headers = [
    'Resource Name',
    'Resource Code',
    'Total Capacity (h)',
    'Allocated (h)',
    'Available (h)',
    'Utilization (%)',
    'Status',
    'Over-Allocated',
  ]

  let csv = ''

  // Add headers
  if (includeHeaders) {
    csv += headers.join(',') + '\n'
  }

  // Add date range info if provided
  if (dateRange) {
    csv += `Date Range: ${dateRange.start} to ${dateRange.end}\n`
    csv += '\n'
  }

  // Add data rows
  capacityData.forEach((item) => {
    // Apply resource filter if provided
    if (resourceFilter && !resourceFilter(item)) {
      return
    }

    const row = [
      escapeCSV(item.resource_name || ''),
      escapeCSV(item.resource_code || ''),
      (item.total_capacity_hours || 0).toFixed(2),
      (item.allocated_hours || 0).toFixed(2),
      (item.available_hours || 0).toFixed(2),
      (item.utilization_percentage || 0).toFixed(2),
      item.is_over_allocated ? 'Over-Allocated' : (item.utilization_percentage || 0) >= 80 ? 'High' : 'OK',
      item.is_over_allocated ? 'Yes' : 'No',
    ]
    csv += row.join(',') + '\n'
  })

  return csv
}

/**
 * Download CSV file
 * @param {string} csvContent - CSV content string
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csvContent, filename = 'capacity-report.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Escape CSV field values
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeCSV(value) {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Generate capacity summary report text
 * @param {Array} capacityData - Array of capacity data objects
 * @param {Object} summaryStats - Summary statistics
 * @param {Object} dateRange - Date range object
 * @returns {string} Report text
 */
export function generateCapacitySummaryReport(capacityData, summaryStats, dateRange) {
  let report = 'RESOURCE CAPACITY REPORT\n'
  report += '='.repeat(50) + '\n\n'

  if (dateRange) {
    report += `Date Range: ${dateRange.start} to ${dateRange.end}\n`
    report += `Generated: ${new Date().toLocaleString()}\n\n`
  }

  report += 'SUMMARY STATISTICS\n'
  report += '-'.repeat(50) + '\n'
  report += `Total Capacity: ${summaryStats.totalCapacity.toFixed(2)} hours\n`
  report += `Total Allocated: ${summaryStats.totalAllocated.toFixed(2)} hours\n`
  report += `Total Available: ${summaryStats.totalAvailable.toFixed(2)} hours\n`
  report += `Overall Utilization: ${((summaryStats.totalAllocated / summaryStats.totalCapacity) * 100).toFixed(2)}%\n`
  report += `Over-Allocated Resources: ${summaryStats.overAllocatedCount}\n`
  report += `High Utilization Resources (≥80%): ${summaryStats.highUtilizationCount}\n\n`

  report += 'RESOURCE DETAILS\n'
  report += '-'.repeat(50) + '\n'

  capacityData.forEach((item, index) => {
    report += `\n${index + 1}. ${item.resource_name}${item.resource_code ? ` (${item.resource_code})` : ''}\n`
    report += `   Capacity: ${(item.total_capacity_hours || 0).toFixed(2)}h\n`
    report += `   Allocated: ${(item.allocated_hours || 0).toFixed(2)}h\n`
    report += `   Available: ${(item.available_hours || 0).toFixed(2)}h\n`
    report += `   Utilization: ${(item.utilization_percentage || 0).toFixed(2)}%\n`
    report += `   Status: ${item.is_over_allocated ? 'OVER-ALLOCATED' : (item.utilization_percentage || 0) >= 80 ? 'HIGH' : 'OK'}\n`
  })

  return report
}

/**
 * Export capacity data to JSON format
 * @param {Array} capacityData - Array of capacity data objects
 * @param {Object} summaryStats - Summary statistics
 * @param {Object} options - Export options
 * @returns {string} JSON string
 */
export function exportCapacityToJSON(capacityData, summaryStats, options = {}) {
  const {
    dateRange = null,
    includeSummary = true,
  } = options

  const exportData = {
    exportDate: new Date().toISOString(),
    dateRange: dateRange,
    summary: includeSummary ? summaryStats : undefined,
    resources: capacityData.map(item => ({
      resource_id: item.resource_id,
      resource_name: item.resource_name,
      resource_code: item.resource_code,
      total_capacity_hours: item.total_capacity_hours,
      allocated_hours: item.allocated_hours,
      available_hours: item.available_hours,
      utilization_percentage: item.utilization_percentage,
      is_over_allocated: item.is_over_allocated,
    })),
  }

  return JSON.stringify(exportData, null, 2)
}

/**
 * Download JSON file
 * @param {string} jsonContent - JSON content string
 * @param {string} filename - Filename for download
 */
export function downloadJSON(jsonContent, filename = 'capacity-report.json') {
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Download text report
 * @param {string} textContent - Text content string
 * @param {string} filename - Filename for download
 */
export function downloadTextReport(textContent, filename = 'capacity-report.txt') {
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

