/**
 * Simulator RFP Bulk Import Service
 * Re-exports parsing/validation from rfpBulkImportService, uses simRfpService for DB writes.
 */

import { batchCreateLineItems, checkPMOAdminRole } from './simRfpService'
import {
  parseRFPCSV,
  parseRFPExcel,
  autoDetectColumnMapping,
  validateAllRows,
  mapRowToDBFormat,
  downloadRFPImportTemplate,
  downloadRFPSampleFile,
  downloadRFPLineItemsCSV,
  exportRFPLineItemsToCSV,
} from './rfpBulkImportService'

export {
  parseRFPCSV,
  parseRFPExcel,
  autoDetectColumnMapping,
  validateAllRows,
  mapRowToDBFormat,
  downloadRFPImportTemplate,
  downloadRFPSampleFile,
  downloadRFPLineItemsCSV,
  exportRFPLineItemsToCSV,
}

export async function bulkImportLineItems(rfpId, mappedRows, options = {}) {
  const isPMO = await checkPMOAdminRole()
  if (!isPMO) throw new Error('Access denied: Only PMO Administrators can import RFP line items.')
  const results = { total: mappedRows.length, successful: 0, failed: 0, errors: [], imported: [] }
  const BATCH_SIZE = 50
  for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
    const batch = mappedRows.slice(i, i + BATCH_SIZE)
    try {
      const imported = await batchCreateLineItems(rfpId, batch)
      results.successful += imported.length
      results.imported.push(...imported)
    } catch (error) {
      for (let j = 0; j < batch.length; j++) {
        try {
          const imported = await batchCreateLineItems(rfpId, [batch[j]])
          results.successful += imported.length
          results.imported.push(...imported)
        } catch (itemError) {
          results.failed++
          results.errors.push({ row: i + j + 1, item_number: batch[j].item_number, error: itemError.message })
        }
      }
    }
    if (options.onProgress) options.onProgress(Math.min(i + BATCH_SIZE, mappedRows.length), mappedRows.length)
  }
  return { success: results.failed === 0, results }
}
