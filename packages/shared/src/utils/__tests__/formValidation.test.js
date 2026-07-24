import { describe, it, expect } from 'vitest'
import { validateRequiredSchemaFields } from '../formValidation.js'

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
