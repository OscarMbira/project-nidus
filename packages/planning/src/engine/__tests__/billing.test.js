import { describe, it, expect } from 'vitest'
import {
  resolveRate, billableDefault, withMarkup, taxForLine, scheduleLineDue, scheduleAmount,
  projectFigures, paymentStatus, roundMoney, exchangeRateFor, applyInvoiceFilters, buildInvoiceDocument, parseRateCardCsv,
  reminderStep, dueReminder,
} from '../billing.js'

const line = (extra) => ({ unit: 'hour', rate: 100, effectiveFrom: '2026-01-01', effectiveTo: null, ...extra })

describe('resolveRate', () => {
  const cards = [
    { scope: 'organisation', lines: [line({ role: 'Consultant', rate: 80 }), line({ personId: 'ada', rate: 90 })] },
    { scope: 'client', lines: [line({ role: 'Consultant', rate: 120 })] },
    { scope: 'project', lines: [line({ role: 'Consultant', workCategory: 'design', rate: 150 }), line({ personId: 'ada', rate: 200 })] },
  ]
  it('lets a person line on the project card win', () => {
    expect(resolveRate({ personId: 'ada', role: 'Consultant', workCategory: 'design', onDate: '2026-06-01', cards }).rate).toBe(200)
  })
  it('uses the project role and category before the client card', () => {
    const found = resolveRate({ personId: 'other', role: 'Consultant', workCategory: 'design', onDate: '2026-06-01', cards })
    expect(found).toMatchObject({ rate: 150, source: 'project' })
  })
  it('falls through to the client card, then the organisation card', () => {
    expect(resolveRate({ personId: 'other', role: 'Consultant', workCategory: 'support', onDate: '2026-06-01', cards }).rate).toBe(120)
    expect(resolveRate({
      personId: 'other', role: 'Analyst', workCategory: 'support', onDate: '2026-06-01',
      cards: [{ scope: 'organisation', lines: [line({ role: 'Analyst', rate: 70 })] }],
    }).source).toBe('organisation')
  })
  it('ignores a rate that is not effective yet', () => {
    expect(resolveRate({
      personId: 'ada', role: 'Consultant', onDate: '2025-12-01',
      cards: [{ scope: 'organisation', lines: [line({ personId: 'ada', rate: 200, effectiveFrom: '2026-01-01' })] }],
    })).toBeNull()
  })
})

describe('tax, mark-up and billable defaults', () => {
  it('rounds tax to cents and skips tax for an internal client', () => {
    expect(taxForLine(10.005, { kind: 'standard', ratePercent: 20 })).toMatchObject({ net: 10.01, tax: 2, gross: 12.01 })
    expect(taxForLine(100, { kind: 'standard', ratePercent: 20 }, { internal: true }).tax).toBe(0)
    expect(taxForLine(100, { kind: 'exempt', ratePercent: 20 }).tax).toBe(0)
    expect(taxForLine(100, { kind: 'reverse_charge', ratePercent: 20 }).tax).toBe(0)
  })
  it('applies a mark-up', () => {
    expect(withMarkup(80, 25)).toBe(100)
  })
  it('defaults time and materials to billable unless the category says otherwise', () => {
    expect(billableDefault({ billingType: 'time_and_material' })).toBe(true)
    expect(billableDefault({ billingType: 'fixed_price' })).toBe(false)
    expect(billableDefault({ billingType: 'time_and_material', categoryDefault: false })).toBe(false)
    expect(billableDefault({ billingType: 'fixed_price', projectDefault: true })).toBe(true)
  })
})

describe('schedule, revenue and payments', () => {
  it('knows when a schedule line is due and prices a percent of the contract', () => {
    expect(scheduleLineDue({ basis: 'milestone', milestoneComplete: true }, '2026-06-01')).toBe(true)
    expect(scheduleLineDue({ basis: 'date', dueDate: '2026-06-02' }, '2026-06-01')).toBe(false)
    expect(scheduleLineDue({ basis: 'recurring', nextDue: '2026-06-01', status: 'open' }, '2026-06-01')).toBe(true)
    expect(scheduleLineDue({ basis: 'date', dueDate: '2026-01-01', status: 'invoiced' }, '2026-06-01')).toBe(false)
    expect(scheduleAmount({ percent: 25 }, 1000)).toBe(250)
  })
  it('nets credit notes and keeps unbilled work out of revenue', () => {
    const figures = projectFigures({
      invoices: [{ status: 'issued', net: 100, exchangeRate: 2 }, { status: 'draft', net: 50, exchangeRate: 1 }],
      credits: [{ net: 10, exchangeRate: 2 }],
      wipAmounts: [40],
      cost: 50,
    })
    expect(figures).toMatchObject({ revenue: 180, wip: 40, cost: 50, margin: 130 })
  })
  it('shows overdue only when money is still owed after the due date', () => {
    expect(paymentStatus(100, 100, '2026-01-01', '2026-06-01')).toBe('paid')
    expect(paymentStatus(100, 40, '2026-01-01', '2026-06-01')).toBe('overdue')
    expect(paymentStatus(100, 40, '2026-12-01', '2026-06-01')).toBe('part_paid')
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
  })
  it('uses the exchange rate on or before the invoice date', () => {
    expect(exchangeRateFor({
      invoiceCurrency: 'GBP', orgCurrency: 'USD', onDate: '2026-06-01',
      rates: [
        { from: 'GBP', to: 'USD', effectiveDate: '2026-01-01', rate: 1.2 },
        { from: 'GBP', to: 'USD', effectiveDate: '2026-07-01', rate: 1.4 },
      ],
    })).toBe(1.2)
    expect(exchangeRateFor({ invoiceCurrency: 'USD', orgCurrency: 'USD', onDate: '2026-06-01', rates: [] })).toBe(1)
  })
  it('filters the invoice list by client and overdue', () => {
    const rows = [
      { client_id: 'a', shown: 'overdue', status: 'issued' },
      { client_id: 'b', shown: 'issued', status: 'issued' },
    ]
    expect(applyInvoiceFilters(rows, { status: 'overdue', clientId: 'a' })).toHaveLength(1)
    expect(applyInvoiceFilters(rows, { status: 'all', clientId: '' })).toHaveLength(2)
    // v1359 (B10): "billed" is what Billed revenue counts — issued, part paid and paid.
    const mixed = [{ status: 'draft' }, { status: 'issued' }, { status: 'part_paid' }, { status: 'paid' }, { status: 'cancelled' }]
    expect(applyInvoiceFilters(mixed, { status: 'billed' }).map((r) => r.status)).toEqual(['issued', 'part_paid', 'paid'])
  })
  it('prints payment text and invoice lines as a table', () => {
    const doc = buildInvoiceDocument({
      invoice: { invoice_reference: 'INV-1', clients: { name: 'Example Freight Ltd', payment_terms_days: 30 }, gross_amount: 24 },
      lines: [{ description: 'Time', quantity: 2, rate: 10, amount: 20, tax_amount: 4, tax_label: 'Standard' }],
      instructions: 'Pay to Example Bank',
      footer: 'Thank you',
    })
    expect(doc.record.instructions).toBe('Pay to Example Bank')
    expect(doc.record.terms).toBe('30 days')
    expect(doc.sections.find((s) => s.title === 'Lines').fields[0].table.rows[0][0]).toBe('Time')
  })
  it('picks one overdue reminder step and does not repeat it', () => {
    expect(reminderStep('2026-01-01', '2026-01-10')).toBe('7')
    expect(reminderStep('2026-01-01', '2026-01-20')).toBe('14')
    const invoice = { id: 'i1', status: 'issued', gross_amount: 100, amount_paid: 0, due_date: '2026-01-01', invoice_reference: 'INV-1' }
    expect(dueReminder(invoice, [], '2026-02-15').step).toBe('30')
    expect(dueReminder(invoice, [{ invoice_id: 'i1', step: '30' }], '2026-02-15')).toBeNull()
  })
  it('reads a rate-card template', () => {
    expect(parseRateCardCsv('# note\nrole_name,work_category,unit,rate\nConsultant,,hour,150')).toEqual([
      { role_name: 'Consultant', work_category: null, unit: 'hour', rate: 150 },
    ])
  })
})
