/**
 * RFP Bulk Import Service Unit Tests
 * Tests CSV parsing, validation, and mapping (no DB mocks)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseRFPCSV,
  autoDetectColumnMapping,
  validateAllRows,
  mapRowToDBFormat,
  validateRFPLineItem,
  exportRFPLineItemsToCSV,
} from '../rfpBulkImportService'

describe('rfpBulkImportService', () => {
  describe('parseRFPCSV', () => {
    it('parses valid CSV with headers and rows', () => {
      const csv = 'S/No,Description,Vendor Response/Comments\n1,Test requirement,Response text'
      const result = parseRFPCSV(csv)
      expect(result.headers).toEqual(['S/No', 'Description', 'Vendor Response/Comments'])
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0]['S/No']).toBe('1')
      expect(result.rows[0]['Description']).toBe('Test requirement')
      expect(result.totalRows).toBe(1)
    })

    it('handles BOM in content', () => {
      const csv = '\uFEFFS/No,Description\n1,Test'
      const result = parseRFPCSV(csv)
      expect(result.headers[0]).toBe('S/No')
    })

    it('handles quoted fields with commas', () => {
      const csv = 'S/No,Description\n1,"Description, with comma"'
      const result = parseRFPCSV(csv)
      expect(result.rows[0]['Description']).toBe('Description, with comma')
    })

    it('throws for empty or header-only CSV', () => {
      expect(() => parseRFPCSV('')).toThrow()
      expect(() => parseRFPCSV('S/No,Description')).toThrow()
    })
  })

  describe('autoDetectColumnMapping', () => {
    it('maps known column aliases', () => {
      const headers = ['S/No', 'Delta ID / Reference No.', 'Description', 'Vendor Response/Comments']
      const { mapping } = autoDetectColumnMapping(headers)
      expect(mapping.item_number).toBe('S/No')
      expect(mapping.reference_number).toBeDefined()
      expect(mapping.description).toBe('Description')
      expect(mapping.vendor_response).toBeDefined()
    })

    it('handles case-insensitive matching', () => {
      const headers = ['s/no', 'description']
      const { mapping } = autoDetectColumnMapping(headers)
      expect(mapping.item_number).toBeDefined()
      expect(mapping.description).toBeDefined()
    })
  })

  describe('validateRFPLineItem', () => {
    it('validates correct row', () => {
      const row = { item_number: 1, description: 'Valid requirement text here' }
      const result = validateRFPLineItem(row, 2)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects missing item_number', () => {
      const row = { description: 'Some description here' }
      const result = validateRFPLineItem(row, 2)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('S/No'))).toBe(true)
    })

    it('rejects invalid item_number', () => {
      const row = { item_number: -1, description: 'Desc' }
      const result = validateRFPLineItem(row, 2)
      expect(result.valid).toBe(false)
    })

    it('rejects missing description', () => {
      const row = { item_number: 1, description: '' }
      const result = validateRFPLineItem(row, 2)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Description'))).toBe(true)
    })

    it('warns on short description', () => {
      const row = { item_number: 1, description: 'Short' }
      const result = validateRFPLineItem(row, 2)
      expect(result.valid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('validateAllRows', () => {
    it('splits valid and invalid rows', () => {
      const rows = [
        { item_number: 1, description: 'Valid requirement with enough text', _rowNumber: 2 },
        { item_number: 2, description: '', _rowNumber: 3 },
      ]
      const result = validateAllRows(rows)
      expect(result.validRows).toHaveLength(1)
      expect(result.invalidRows).toHaveLength(1)
      expect(result.summary.valid).toBe(1)
      expect(result.summary.invalid).toBe(1)
    })
  })

  describe('mapRowToDBFormat', () => {
    it('maps CSV row to DB format with column mapping', () => {
      const csvRow = { 'S/No': '1', 'Description': 'Test desc', 'Delta ID / Reference No.': 'REF-001' }
      const mapping = { item_number: 'S/No', reference_number: 'Delta ID / Reference No.', description: 'Description' }
      const result = mapRowToDBFormat(csvRow, mapping)
      expect(result.item_number).toBe(1)
      expect(result.description).toBe('Test desc')
      expect(result.reference_number).toBe('REF-001')
      expect(result.priority).toBe('must_have')
      expect(result.requirement_type).toBe('functional')
    })
  })

  describe('exportRFPLineItemsToCSV', () => {
    it('generates CSV with headers and rows', () => {
      const items = [
        { item_number: 1, reference_number: 'R1', description: 'D1', vendor_response: 'V1' },
      ]
      const csv = exportRFPLineItemsToCSV(items)
      expect(csv).toContain('S/No')
      expect(csv).toContain('Description')
      expect(csv).toContain('1')
      expect(csv).toContain('D1')
      expect(csv.charCodeAt(0)).toBe(0xfeff) // BOM
    })

    it('handles empty items', () => {
      const csv = exportRFPLineItemsToCSV([])
      expect(csv).toContain('S/No')
      expect(csv.split('\n').length).toBe(2) // header + empty
    })
  })
})
