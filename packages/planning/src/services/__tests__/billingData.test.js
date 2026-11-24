import { describe, it, expect } from 'vitest'
import { accountingRows, accountingCsv } from '../billingData.js'

describe('accounting export', () => {
  it('writes an internal client as a journal and keeps a legend in the CSV', () => {
    const rows = accountingRows({
      invoices: [{ client_id: 'c1', invoice_reference: 'INV-001', invoice_date: '2026-06-01', currency: 'USD', net_amount: 100, tax_amount: 20, gross_amount: 120, exchange_rate: 1, clients: { name: 'Example Shared Services' } }],
      clients: [{ id: 'c1', kind: 'internal' }],
      payments: [{ reference: 'PAY-1', paid_on: '2026-06-02', amount: 120, method: 'Bank transfer' }],
    })
    expect(rows[0].type).toBe('journal')
    expect(rows[0].tax).toBe(0)
    expect(rows[1].type).toBe('payment')
    const csv = accountingCsv(rows)
    expect(csv.startsWith('# DATA DICTIONARY')).toBe(true)
    expect(csv).toContain('journal')
  })
})
