/**
 * Form Field Translation Bulk Import Service Unit Tests
 * Tests sheet-row building, validation, and mapping (no XLSX/DB I/O)
 */

import { describe, it, expect } from 'vitest'
import {
  buildTranslationSheetRows,
  validateTranslationRows,
  buildTranslationPayloadRows,
} from '../formTranslationBulkImportService'

const SCHEMA = {
  sections: [
    {
      key: 'general',
      fields: [
        { key: 'activity_name', label: 'Activity Name', type: 'text' },
        {
          key: 'activity_type',
          label: 'Activity Type',
          type: 'select',
          options: [
            { value: 'task', label: 'Task' },
            { value: 'milestone', label: 'Milestone' },
          ],
        },
      ],
    },
  ],
}

describe('buildTranslationSheetRows', () => {
  it('emits a header row plus one field row and one row per option', () => {
    const rows = buildTranslationSheetRows(SCHEMA, [], 'fr-FR')
    expect(rows[0]).toEqual(['Section Key', 'Field Key', 'Row Type', 'Option Value', 'English Text', 'Translated Text'])
    // header + activity_name field + activity_type field + 2 option rows (task, milestone)
    expect(rows).toHaveLength(5)
  })

  it('pre-fills translated text from existing rows for the requested language only', () => {
    const existing = [
      {
        section_key: 'general',
        field_key: 'activity_name',
        language_code: 'fr-FR',
        label: "Nom de l'activité",
        option_labels: {},
      },
      {
        section_key: 'general',
        field_key: 'activity_name',
        language_code: 'es-ES',
        label: 'Nombre de la actividad',
        option_labels: {},
      },
    ]
    const rows = buildTranslationSheetRows(SCHEMA, existing, 'fr-FR')
    const fieldRow = rows.find((r) => r[1] === 'activity_name' && r[2] === 'field')
    expect(fieldRow[5]).toBe("Nom de l'activité")
  })

  it('leaves translated text blank when nothing exists for that language', () => {
    const rows = buildTranslationSheetRows(SCHEMA, [], 'fr-FR')
    const fieldRow = rows.find((r) => r[1] === 'activity_name' && r[2] === 'field')
    expect(fieldRow[5]).toBe('')
  })
})

describe('validateTranslationRows', () => {
  it('accepts well-formed field and option rows', () => {
    const rows = [
      { section_key: 'general', field_key: 'activity_name', row_type: 'field', option_value: '', translated_text: 'Nom', _rowNumber: 2 },
      { section_key: 'general', field_key: 'activity_type', row_type: 'option', option_value: 'task', translated_text: 'Tâche', _rowNumber: 3 },
    ]
    const result = validateTranslationRows(rows)
    expect(result.summary).toEqual({ total: 2, valid: 2, invalid: 0, warnings: 0 })
  })

  it('flags missing section/field key and bad row type', () => {
    const rows = [
      { section_key: '', field_key: 'x', row_type: 'field', option_value: '', translated_text: 'y', _rowNumber: 2 },
      { section_key: 'general', field_key: '', row_type: 'field', option_value: '', translated_text: 'y', _rowNumber: 3 },
      { section_key: 'general', field_key: 'x', row_type: 'bogus', option_value: '', translated_text: 'y', _rowNumber: 4 },
    ]
    const result = validateTranslationRows(rows)
    expect(result.summary.invalid).toBe(3)
  })

  it('requires option_value on option rows', () => {
    const rows = [
      { section_key: 'general', field_key: 'activity_type', row_type: 'option', option_value: '', translated_text: 'Tâche', _rowNumber: 2 },
    ]
    const result = validateTranslationRows(rows)
    expect(result.summary.invalid).toBe(1)
  })

  it('warns (does not error) on blank translated text', () => {
    const rows = [
      { section_key: 'general', field_key: 'activity_name', row_type: 'field', option_value: '', translated_text: '', _rowNumber: 2 },
    ]
    const result = validateTranslationRows(rows)
    expect(result.summary.valid).toBe(1)
    expect(result.summary.warnings).toBe(1)
  })
})

describe('buildTranslationPayloadRows', () => {
  it('collapses field + option rows into one payload entry per field', () => {
    const validRows = [
      { section_key: 'general', field_key: 'activity_type', row_type: 'field', option_value: '', translated_text: "Type d'activité" },
      { section_key: 'general', field_key: 'activity_type', row_type: 'option', option_value: 'task', translated_text: 'Tâche' },
      { section_key: 'general', field_key: 'activity_type', row_type: 'option', option_value: 'milestone', translated_text: 'Jalon' },
    ]
    const payload = buildTranslationPayloadRows(validRows)
    expect(payload).toHaveLength(1)
    expect(payload[0]).toEqual({
      section_key: 'general',
      field_key: 'activity_type',
      label: "Type d'activité",
      option_labels: { task: 'Tâche', milestone: 'Jalon' },
    })
  })

  it('drops rows with blank translated text', () => {
    const validRows = [
      { section_key: 'general', field_key: 'activity_name', row_type: 'field', option_value: '', translated_text: '' },
    ]
    expect(buildTranslationPayloadRows(validRows)).toHaveLength(0)
  })
})
