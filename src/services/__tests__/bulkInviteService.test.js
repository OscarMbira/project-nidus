import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateBulkInviteRows,
  generateCsvTemplate,
  formatErrorReportCsvContent,
} from '../bulkInviteService'

describe('bulkInviteService', () => {
  describe('generateCsvTemplate', () => {
    it('includes header and example rows', () => {
      const csv = generateCsvTemplate([
        { role_name: 'team_member', role_display_name: 'Team Member' },
      ])
      expect(csv).toContain('email,first_name,last_name,role')
      expect(csv).toContain('team_member')
    })
  })

  describe('validateBulkInviteRows', () => {
    const baseRow = {
      rowIndex: 0,
      email: 'a@example.com',
      role_id: 'role-1',
      selected: true,
      isNewRole: false,
    }

    it('flags invalid email as blocking error', () => {
      const res = validateBulkInviteRows(
        [{ ...baseRow, email: 'not-an-email', validEmail: false }],
        'proj-1',
        {},
      )
      expect(res.hasBlockingErrors).toBe(true)
      expect(res.errors.some((e) => e.error_type === 'invalid_email')).toBe(true)
    })

    it('flags duplicate emails in file', () => {
      const rows = [
        { ...baseRow, rowIndex: 0, email: 'dup@example.com' },
        { ...baseRow, rowIndex: 1, email: 'dup@example.com' },
      ]
      const res = validateBulkInviteRows(rows, 'proj-1', {})
      expect(res.errors.filter((e) => e.error_type === 'duplicate_email').length).toBeGreaterThan(0)
    })

    it('flags no_role when role missing', () => {
      const res = validateBulkInviteRows(
        [{ ...baseRow, role_id: null, isNewRole: false }],
        'proj-1',
        {},
      )
      expect(res.errors.some((e) => e.error_type === 'no_role')).toBe(true)
    })

    it('warns for existing members', () => {
      const res = validateBulkInviteRows([baseRow], 'proj-1', {
        existingMemberEmails: ['a@example.com'],
      })
      expect(res.errors.some((e) => e.error_type === 'already_member')).toBe(true)
      expect(res.warningCount).toBeGreaterThan(0)
    })

    it('counts valid rows', () => {
      const res = validateBulkInviteRows([baseRow], 'proj-1', {})
      expect(res.validCount).toBe(1)
      expect(res.hasBlockingErrors).toBe(false)
    })
  })

  describe('formatErrorReportCsvContent', () => {
    it('includes error and severity columns', () => {
      const rows = [
        {
          rowIndex: 0,
          email: 'bad',
          first_name: 'A',
          last_name: 'B',
          role_name: 'team_member',
        },
      ]
      const text = formatErrorReportCsvContent(rows, [
        {
          row_index: 0,
          message: 'Invalid email',
          severity: 'error',
        },
      ])
      expect(text).toContain('error,severity')
      expect(text).toContain('Invalid email')
    })
  })
})
