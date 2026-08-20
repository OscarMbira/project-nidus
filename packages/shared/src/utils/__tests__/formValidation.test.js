import { describe, it, expect } from 'vitest'
import {
  validateRequiredSchemaFields,
  validateSchemaFieldLengths,
  validateSchemaFields,
} from '../formValidation.js'

describe('validateRequiredSchemaFields', () => {
  const schema = {
    sections: [
      {
        key: 'general',
        title: 'General',
        fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'notes', label: 'Notes', type: 'textarea', required: false },
          { key: 'tags', label: 'Tags', type: 'select', required: true },
        ],
      },
    ],
  }

  it('returns no errors when all required fields are filled', () => {
    const errors = validateRequiredSchemaFields(schema, { name: 'Acme', tags: ['a'] })
    expect(errors).toEqual({})
  })

  it('flags a required field that is undefined', () => {
    const errors = validateRequiredSchemaFields(schema, { tags: ['a'] })
    expect(errors).toEqual({ name: 'Name is required' })
  })

  it('flags a required field that is an empty/whitespace-only string', () => {
    const errors = validateRequiredSchemaFields(schema, { name: '   ', tags: ['a'] })
    expect(errors.name).toBe('Name is required')
  })

  it('flags a required field that is an empty array', () => {
    const errors = validateRequiredSchemaFields(schema, { name: 'Acme', tags: [] })
    expect(errors.tags).toBe('Tags is required')
  })

  it('never flags a non-required field', () => {
    const errors = validateRequiredSchemaFields(schema, { name: 'Acme', tags: ['a'], notes: '' })
    expect(errors).toEqual({})
  })

  it('handles a schema with no sections', () => {
    expect(validateRequiredSchemaFields({}, {})).toEqual({})
    expect(validateRequiredSchemaFields(null, {})).toEqual({})
  })
})

describe('validateSchemaFieldLengths (v847)', () => {
  const schema = {
    sections: [{
      key: 'general',
      fields: [
        { key: 'title', label: 'Title', type: 'text', minLength: 3, maxLength: 10 },
        { key: 'body', label: 'Body', type: 'textarea', maxLength: 20 },
        { key: 'when', label: 'When', type: 'date', maxLength: 2 },
      ],
    }],
  }

  it('returns no errors when lengths are within bounds', () => {
    expect(validateSchemaFieldLengths(schema, { title: 'Hello', body: 'short' })).toEqual({})
  })

  it('flags values shorter than minLength', () => {
    expect(validateSchemaFieldLengths(schema, { title: 'Hi' })).toEqual({
      title: 'Title must be at least 3 characters',
    })
  })

  it('flags values longer than maxLength', () => {
    expect(validateSchemaFieldLengths(schema, { title: 'Hello world' })).toEqual({
      title: 'Title must be at most 10 characters',
    })
  })

  it('ignores non-text field types', () => {
    expect(validateSchemaFieldLengths(schema, { when: '2026-01-01' })).toEqual({})
  })

  it('validateSchemaFields prefers required error over length when both apply', () => {
    const requiredSchema = {
      sections: [{
        key: 'general',
        fields: [{ key: 'title', label: 'Title', type: 'text', required: true, minLength: 3 }],
      }],
    }
    expect(validateSchemaFields(requiredSchema, { title: '' })).toEqual({
      title: 'Title is required',
    })
  })
})
