import { describe, it, expect } from 'vitest'
import {
  OPA_FIELD_REGISTRY,
  buildDefaultFieldConfigs,
  normalizeFieldConfigs,
} from '../projectOPATailoringService'

describe('projectOPATailoringService', () => {
  describe('OPA_FIELD_REGISTRY', () => {
    it('includes title as required', () => {
      const title = OPA_FIELD_REGISTRY.find((f) => f.key === 'title')
      expect(title).toBeTruthy()
      expect(title.required).toBe(true)
    })
  })

  describe('buildDefaultFieldConfigs', () => {
    it('defaults all fields to visible', () => {
      const rows = buildDefaultFieldConfigs()
      expect(rows).toHaveLength(OPA_FIELD_REGISTRY.length)
      expect(rows.every((r) => r.is_visible)).toBe(true)
    })

    it('applies overrides for non-title fields', () => {
      const rows = buildDefaultFieldConfigs([{ field_key: 'description', is_visible: false }])
      const desc = rows.find((r) => r.field_key === 'description')
      expect(desc.is_visible).toBe(false)
    })
  })

  describe('normalizeFieldConfigs', () => {
    it('forces title visible and required', () => {
      const rows = normalizeFieldConfigs([
        { field_key: 'title', is_visible: false, is_required: false },
        { field_key: 'description', is_visible: false },
      ])
      const title = rows.find((r) => r.field_key === 'title')
      expect(title.is_visible).toBe(true)
      expect(title.is_required).toBe(true)
      const desc = rows.find((r) => r.field_key === 'description')
      expect(desc.is_visible).toBe(false)
    })

    it('fills missing registry keys', () => {
      const rows = normalizeFieldConfigs([])
      expect(rows).toHaveLength(OPA_FIELD_REGISTRY.length)
    })

    it('preserves custom labels', () => {
      const rows = normalizeFieldConfigs([{ field_key: 'notes', custom_label: 'Project notes' }])
      const notes = rows.find((r) => r.field_key === 'notes')
      expect(notes.custom_label).toBe('Project notes')
    })
  })
})
